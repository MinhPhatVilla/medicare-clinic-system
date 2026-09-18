/**
 * @file src/modules/service-orders/service-orders.service.ts
 * @description Service xử lý nghiệp vụ Chỉ định Cận Lâm Sàng, Hàng đợi Kỹ thuật viên & Đồng bộ Chi phí
 *
 * Tối ưu hóa hiệu năng:
 * - Sử dụng QueryBuilder với JOIN (leftJoinAndSelect) để giải quyết triệt để bài toán N+1 Query.
 * - Lọc và phân trang trực tiếp ở tầng Database thay vì in-memory.
 */

import { EntityManager, Repository, In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { ServiceOrder, ServiceOrderStatus } from '../../models/ServiceOrder.entity';
import { MedicalService } from '../../models/MedicalService.entity';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment } from '../../models/Appointment.entity';
import { Invoice, InvoiceStatus } from '../../models/Invoice.entity';
import { Doctor } from '../../models/Doctor.entity';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import { calculateInvoiceAmounts, lockBillingExamination } from '../invoices/invoice-integrity';
import {
  CreateServiceOrdersDto,
  UpdateServiceOrderStatusDto,
  PayServiceOrdersDto,
  ServiceCatalogQueryDto,
  CreateMedicalServiceDto,
  EnterServiceOrderResultDto,
  TechnicianQueueQueryDto,
} from './service-orders.dto';

export class ServiceOrdersService {
  private serviceOrderRepo: Repository<ServiceOrder>;
  private medicalServiceRepo: Repository<MedicalService>;
  private examRepo: Repository<Examination>;
  private appointmentRepo: Repository<Appointment>;
  private invoiceRepo: Repository<Invoice>;
  private doctorRepo: Repository<Doctor>;

  constructor(private manager: EntityManager = AppDataSource.manager) {
    this.serviceOrderRepo = manager.getRepository(ServiceOrder);
    this.medicalServiceRepo = manager.getRepository(MedicalService);
    this.examRepo = manager.getRepository(Examination);
    this.appointmentRepo = manager.getRepository(Appointment);
    this.invoiceRepo = manager.getRepository(Invoice);
    this.doctorRepo = manager.getRepository(Doctor);
  }

  private async withLockedOrder<T>(
    orderId: string,
    action: (service: ServiceOrdersService) => Promise<T>,
  ): Promise<T> {
    const order = await this.serviceOrderRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundError('Chỉ định cận lâm sàng');
    return this.manager.transaction(async (manager) => {
      await lockBillingExamination(manager, order.examinationId);
      return action(new ServiceOrdersService(manager));
    });
  }

  private async ensureInvoiceNotPaid(appointmentId: string | undefined, message: string) {
    if (!appointmentId) return;

    const paidInvoice = await this.invoiceRepo.findOne({
      where: { appointmentId },
    });

    if (paidInvoice && paidInvoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestError(message);
    }
  }

  // ============================================================
  // 1. SERVICE CATALOG (DANH MỤC DỊCH VỤ NIÊM YẾT)
  // ============================================================

  /**
   * Lấy danh mục dịch vụ kỹ thuật kèm giá niêm yết (tối ưu query trực tiếp trên DB)
   */
  async getCatalog(query: ServiceCatalogQueryDto) {
    const qb = this.medicalServiceRepo.createQueryBuilder('service');

    if (query.serviceType) {
      qb.andWhere('service.serviceType = :serviceType', { serviceType: query.serviceType });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('service.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      qb.andWhere(
        '(LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.department) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('service.serviceType', 'ASC').addOrderBy('service.code', 'ASC');

    const page = query.page || 1;
    const limit = query.limit || 50;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tạo mới dịch vụ vào danh mục (Admin)
   */
  async createCatalogService(dto: CreateMedicalServiceDto) {
    const existing = await this.medicalServiceRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestError(`Mã dịch vụ ${dto.code} đã tồn tại trong danh mục`);
    }

    const service = this.medicalServiceRepo.create(dto);
    return await this.medicalServiceRepo.save(service);
  }

  // ============================================================
  // 2. CHỈ ĐỊNH CẬN LÂM SÀNG (SERVICE ORDERS)
  // ============================================================

  /**
   * Bác sĩ tạo một hoặc nhiều chỉ định CLS thuộc phiếu khám (record_id / examinationId)
   */
  async createOrders(dto: CreateServiceOrdersDto, _doctorUserId?: string) {
    return this.manager.transaction(async (manager) => {
      await lockBillingExamination(manager, dto.examinationId);
      return new ServiceOrdersService(manager).saveOrders(dto);
    });
  }

  private async saveOrders(dto: CreateServiceOrdersDto) {
    const examination = await this.examRepo.findOne({
      where: { id: dto.examinationId },
      relations: ['appointment', 'doctor', 'doctor.user', 'patient'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }
    if (
      examination.isLocked ||
      examination.status === ExaminationStatus.COMPLETED ||
      examination.status === ExaminationStatus.CANCELLED
    ) {
      throw new BadRequestError('Phiếu khám đã khóa hoặc hủy. Không thể thêm chỉ định.');
    }

    await this.ensureInvoiceNotPaid(
      examination.appointmentId,
      'Hóa đơn đã thanh toán. Không thể tạo thêm chỉ định cận lâm sàng.',
    );

    // Sinh mã phiếu chỉ định
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const createdOrders: ServiceOrder[] = [];

    for (const item of dto.services) {
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `CLS-${dateStr}-${randomCode}`;

      const order = this.serviceOrderRepo.create({
        orderNumber,
        examinationId: examination.id,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        serviceCode: item.serviceCode,
        serviceType: item.serviceType,
        fee: item.fee,
        notes: item.notes,
        status: ServiceOrderStatus.ORDERED, // Trạng thái ban đầu: ORDERED (Đã chỉ định)
      });

      createdOrders.push(order);
    }

    const savedOrders = await this.serviceOrderRepo.save(createdOrders);

    // Tự động đồng bộ các dịch vụ này vào chi phí tạm tính của bệnh nhân
    const estimatedInvoice = await this.syncEstimatedInvoice(examination.id);

    return {
      orders: savedOrders,
      totalNewFee: savedOrders.reduce((sum, o) => sum + Number(o.fee), 0),
      estimatedInvoice,
    };
  }

  /**
   * Lấy danh sách chỉ định CLS thuộc phiếu khám (JOIN 1 query chống N+1)
   */
  async getOrdersByExamination(examinationId: string) {
    const examination = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'patient', 'doctor'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    // Single query JOIN service chống N+1
    const orders = await this.serviceOrderRepo.find({
      where: { examinationId },
      relations: ['service'],
      order: { createdAt: 'ASC' },
    });

    const activeOrders = orders.filter((o) => o.status !== ServiceOrderStatus.CANCELLED);
    const totalFee = activeOrders.reduce((sum, o) => sum + Number(o.fee), 0);
    const paidFee = orders
      .filter(
        (o) => o.status === ServiceOrderStatus.PAID || o.status === ServiceOrderStatus.COMPLETED,
      )
      .reduce((sum, o) => sum + Number(o.fee), 0);

    // Lấy hóa đơn tạm tính nếu có
    const invoice = await this.invoiceRepo.findOne({
      where: { appointmentId: examination.appointmentId },
    });

    return {
      examinationId,
      appointmentId: examination.appointmentId,
      patient: examination.patient,
      orders,
      stats: {
        totalOrders: orders.length,
        orderedCount: orders.filter((o) => o.status === ServiceOrderStatus.ORDERED).length,
        paidCount: orders.filter((o) => o.status === ServiceOrderStatus.PAID).length,
        completedCount: orders.filter((o) => o.status === ServiceOrderStatus.COMPLETED).length,
        cancelledCount: orders.filter((o) => o.status === ServiceOrderStatus.CANCELLED).length,
        totalFee,
        paidFee,
      },
      estimatedInvoice: invoice,
    };
  }

  /**
   * Cập nhật trạng thái chỉ định CLS (PAID, IN_PROGRESS, COMPLETED, CANCELLED)
   */
  async updateOrderStatus(orderId: string, dto: UpdateServiceOrderStatusDto) {
    return this.withLockedOrder(orderId, (service) => service.saveOrderStatus(orderId, dto));
  }

  private async saveOrderStatus(orderId: string, dto: UpdateServiceOrderStatusDto) {
    const order = await this.serviceOrderRepo.findOne({
      where: { id: orderId },
      relations: ['examination'],
    });

    if (!order) {
      throw new NotFoundError('Chỉ định cận lâm sàng');
    }
    if (order.status === ServiceOrderStatus.CANCELLED) {
      throw new BadRequestError('Không thể thay đổi chỉ định đã hủy.');
    }
    if (dto.status === ServiceOrderStatus.PAID || dto.status === ServiceOrderStatus.ORDERED) {
      throw new BadRequestError(
        'Dùng API thu tiền để xác nhận thanh toán; không được đặt lại chỉ định về ORDERED.',
      );
    }

    if (dto.status === ServiceOrderStatus.CANCELLED) {
      if (order.status !== ServiceOrderStatus.ORDERED) {
        throw new BadRequestError('Chỉ được hủy chỉ định chưa thu tiền và chưa thực hiện.');
      }
      await this.ensureInvoiceNotPaid(
        order.examination?.appointmentId,
        'Hóa đơn đã thanh toán. Không thể hủy chỉ định cận lâm sàng.',
      );
    }

    if (
      dto.status !== ServiceOrderStatus.CANCELLED &&
      ![ServiceOrderStatus.PAID, ServiceOrderStatus.IN_PROGRESS].includes(order.status)
    ) {
      throw new BadRequestError('Chi duoc thuc hien dich vu da thanh toan, chua hoan tat');
    }
    order.status = dto.status;
    if (dto.result !== undefined) order.result = dto.result;
    if (dto.resultFileUrl !== undefined) order.resultFileUrl = dto.resultFileUrl;
    if (dto.notes !== undefined) order.notes = dto.notes;

    if (dto.status === ServiceOrderStatus.COMPLETED) {
      order.performedAt = new Date();
    }

    const updated = await this.serviceOrderRepo.save(order);

    if (dto.status === ServiceOrderStatus.CANCELLED && order.examinationId) {
      await this.syncEstimatedInvoice(order.examinationId);
    }

    return updated;
  }

  /**
   * Thu tiền các chỉ định CLS (chuyển sang PAID)
   */
  async payOrders(dto: PayServiceOrdersDto, _cashierUserId?: string) {
    return this.manager.transaction(async (manager) => {
      await lockBillingExamination(manager, dto.examinationId);
      return new ServiceOrdersService(manager).collectOrders(dto);
    });
  }

  private async collectOrders(dto: PayServiceOrdersDto) {
    const examination = await this.examRepo.findOne({
      where: { id: dto.examinationId },
    });
    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    await this.ensureInvoiceNotPaid(
      examination.appointmentId,
      'Hóa đơn đã thanh toán. Không thể thu tiền riêng cho chỉ định cận lâm sàng.',
    );

    const queryWhere: any = {
      examinationId: dto.examinationId,
      status: ServiceOrderStatus.ORDERED,
    };
    if (dto.orderIds && dto.orderIds.length > 0) {
      queryWhere.id = In(dto.orderIds);
    }

    const ordersToPay = await this.serviceOrderRepo.find({ where: queryWhere });
    if (ordersToPay.length === 0) {
      throw new BadRequestError('Không có chỉ định CLS nào đang chờ thu tiền');
    }

    for (const order of ordersToPay) {
      order.status = ServiceOrderStatus.PAID;
    }

    const saved = await this.serviceOrderRepo.save(ordersToPay);

    // Đồng bộ chi phí
    const invoice = await this.syncEstimatedInvoice(dto.examinationId);
    if (!invoice) throw new BadRequestError('Không thể lập hóa đơn cho khoản thu CLS.');
    invoice.prepaidAmount =
      Number(invoice.prepaidAmount || 0) + saved.reduce((sum, order) => sum + Number(order.fee), 0);
    if (invoice.prepaidAmount > invoice.totalAmount) {
      throw new BadRequestError('Tiền thu trước vượt quá tổng hóa đơn sau giảm trừ.');
    }
    await this.invoiceRepo.save(invoice);

    return {
      paidOrders: saved,
      paidTotal: saved.reduce((sum, o) => sum + Number(o.fee), 0),
      invoice,
    };
  }

  /**
   * Hủy chỉ định CLS
   */
  async cancelOrder(orderId: string) {
    return this.withLockedOrder(orderId, (service) => service.cancelLockedOrder(orderId));
  }

  private async cancelLockedOrder(orderId: string) {
    const order = await this.serviceOrderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Chỉ định cận lâm sàng');
    }

    if (order.status !== ServiceOrderStatus.ORDERED) {
      throw new BadRequestError('Không thể hủy chỉ định đã thu tiền hoặc đã có kết quả xét nghiệm');
    }

    const examination = await this.examRepo.findOne({ where: { id: order.examinationId } });
    await this.ensureInvoiceNotPaid(
      examination?.appointmentId,
      'Hóa đơn đã thanh toán. Không thể hủy chỉ định cận lâm sàng.',
    );

    order.status = ServiceOrderStatus.CANCELLED;
    const saved = await this.serviceOrderRepo.save(order);

    // Đồng bộ lại hóa đơn tạm tính
    await this.syncEstimatedInvoice(order.examinationId);

    return saved;
  }

  // ============================================================
  // 3. TÍNH NĂNG DÀNH CHO KỸ THUẬT VIÊN XÉT NGHIỆM / CĐHA
  // ============================================================

  /**
   * Lấy danh sách các chỉ định CLS đang chờ thực hiện (Pending Queue)
   * Tối ưu hóa: Sử dụng JOIN 1 lần (leftJoinAndSelect) để loại bỏ hoàn toàn N+1 query.
   */
  async getTechnicianQueue(query: TechnicianQueueQueryDto) {
    const qb = this.serviceOrderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.service', 'service')
      .leftJoinAndSelect('order.examination', 'examination')
      .leftJoinAndSelect('examination.patient', 'patient')
      .leftJoinAndSelect('examination.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser');

    // Lọc theo trạng thái (mặc định lấy PAID và ORDERED đang chờ thực hiện)
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    } else {
      qb.andWhere('order.status IN (:...statuses)', {
        statuses: [ServiceOrderStatus.PAID, ServiceOrderStatus.ORDERED],
      });
    }

    // Lọc theo loại dịch vụ (Xét nghiệm máu, Siêu âm, X-quang, Nội soi, v.v.)
    if (query.serviceType) {
      qb.andWhere('order.serviceType = :serviceType', { serviceType: query.serviceType });
    }

    // Lọc theo ngày
    if (query.date) {
      qb.andWhere(
        "order.createdAt >= :date::date AND order.createdAt < :date::date + INTERVAL '1 day'",
        { date: query.date },
      );
    }

    // Tìm kiếm theo tên bệnh nhân, SĐT, mã bệnh nhân hoặc mã chỉ định
    if (query.search) {
      qb.andWhere(
        '(LOWER(patient.fullName) LIKE LOWER(:search) OR patient.phone LIKE :search OR LOWER(order.orderNumber) LIKE LOWER(:search) OR LOWER(order.serviceName) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    // Sắp xếp ưu tiên: PAID lên trước (đã thanh toán thu tiền), sau đó ORDERED, theo thời gian tạo
    qb.orderBy(
      `CASE WHEN order.status = '${ServiceOrderStatus.PAID}' THEN 1 WHEN order.status = '${ServiceOrderStatus.ORDERED}' THEN 2 ELSE 3 END`,
      'ASC',
    ).addOrderBy('order.createdAt', 'ASC');

    const page = query.page || 1;
    const limit = query.limit || 50;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const formattedQueue = items.map((order) => {
      const patient = order.examination?.patient;
      const doctor = order.examination?.doctor;

      // Tính tuổi bệnh nhân
      let age: number | undefined;
      if (patient?.dateOfBirth) {
        const birthYear = new Date(patient.dateOfBirth).getFullYear();
        age = new Date().getFullYear() - birthYear;
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        examinationId: order.examinationId,
        serviceCode: order.serviceCode || order.service?.code,
        serviceName: order.serviceName,
        serviceType: order.serviceType,
        department: order.service?.department || 'Phòng Cận lâm sàng',
        fee: Number(order.fee),
        status: order.status,
        doctorNotes: order.notes,
        createdAt: order.createdAt,
        patient: patient
          ? {
              id: patient.id,
              patientCode: patient.patientCode,
              fullName: patient.fullName,
              phone: patient.phone,
              gender: patient.gender,
              age,
            }
          : null,
        doctor: doctor
          ? {
              id: doctor.id,
              fullName: doctor.user?.fullName || 'Bác sĩ phụ trách',
              roomNumber: doctor.roomNumber,
            }
          : null,
      };
    });

    return {
      queue: formattedQueue,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Kỹ thuật viên nhập kết quả Cận lâm sàng chi tiết (Chỉ số, khoảng tham chiếu, ảnh đính kèm, kết luận)
   * và tự động cập nhật trạng thái sang COMPLETED.
   */
  async enterResult(orderId: string, dto: EnterServiceOrderResultDto, technicianUserId?: string) {
    return this.withLockedOrder(orderId, (service) =>
      service.saveResult(orderId, dto, technicianUserId),
    );
  }

  private async saveResult(
    orderId: string,
    dto: EnterServiceOrderResultDto,
    technicianUserId?: string,
  ) {
    const order = await this.serviceOrderRepo.findOne({
      where: { id: orderId },
      relations: ['examination'],
    });

    if (!order) {
      throw new NotFoundError('Chỉ định cận lâm sàng');
    }
    if (order.status === ServiceOrderStatus.CANCELLED) {
      throw new BadRequestError('Không thể nhập kết quả cho chỉ định đã hủy.');
    }

    // Cập nhật dữ liệu kết quả chi tiết
    order.indicators = dto.indicators || [];
    order.conclusion = dto.conclusion;
    order.attachments = dto.attachments || [];
    if (dto.resultFileUrl) {
      order.resultFileUrl = dto.resultFileUrl;
    }
    if (dto.notes) {
      order.notes = dto.notes;
    }

    // Tự động sinh tóm tắt vào `result` nếu chưa có
    if (dto.result) {
      order.result = dto.result;
    } else {
      const abnormalCount = order.indicators.filter((ind) => ind.isAbnormal).length;
      let summary = `Kết luận: ${dto.conclusion}`;
      if (order.indicators.length > 0) {
        summary += ` (${order.indicators.length} chỉ số đo lường, ${abnormalCount} chỉ số bất thường)`;
      }
      order.result = summary;
    }

    // Chuyển trạng thái sang COMPLETED
    order.status = ServiceOrderStatus.COMPLETED;
    order.performedAt = new Date();
    if (technicianUserId) {
      order.performedByUserId = technicianUserId;
    }

    const saved = await this.serviceOrderRepo.save(order);
    return saved;
  }

  // ============================================================
  // 4. DÀNH CHO BÁC SĨ: XEM TOÀN BỘ KẾT QUẢ CLS NGAY TRÊN MÀN HÌNH KHÁM
  // ============================================================

  /**
   * Bác sĩ điều trị xem lại toàn bộ kết quả CLS vừa cập nhật ngay trên màn hình khám bệnh
   * Hiển thị cảnh báo chỉ số bất thường, hình ảnh đính kèm, kết luận chi tiết.
   */
  async getDoctorExaminationResults(examinationId: string) {
    const examination = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'patient', 'doctor', 'doctor.user'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    // Query toàn bộ chỉ định CLS kèm Service trong 1 câu truy vấn chống N+1
    const orders = await this.serviceOrderRepo.find({
      where: { examinationId },
      relations: ['service'],
      order: { createdAt: 'ASC' },
    });

    // Thống kê tổng hợp
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === ServiceOrderStatus.COMPLETED);
    const completedCount = completedOrders.length;
    const isAllCompleted = totalOrders > 0 && completedCount === totalOrders;

    // Đếm tổng số chỉ số bất thường trên tất cả xét nghiệm
    let totalAbnormalIndicators = 0;

    const formattedOrders = orders.map((order) => {
      const indicators = order.indicators || [];
      const abnormalList = indicators.filter((ind) => ind.isAbnormal);
      totalAbnormalIndicators += abnormalList.length;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        serviceName: order.serviceName,
        serviceCode: order.serviceCode || order.service?.code,
        serviceType: order.serviceType,
        department: order.service?.department,
        fee: Number(order.fee),
        status: order.status,
        performedAt: order.performedAt,
        performedByUserId: order.performedByUserId,
        conclusion: order.conclusion || order.result,
        resultSummary: order.result,
        resultFileUrl: order.resultFileUrl,
        attachments: order.attachments || [],
        indicators: indicators.map((ind) => ({
          name: ind.name,
          value: ind.value,
          unit: ind.unit || '',
          normalRange: ind.normalRange || 'N/A',
          isAbnormal: ind.isAbnormal,
        })),
        hasAbnormal: abnormalList.length > 0,
        abnormalCount: abnormalList.length,
      };
    });

    return {
      examinationId: examination.id,
      patient: examination.patient,
      appointmentId: examination.appointmentId,
      summary: {
        totalOrders,
        completedCount,
        pendingCount: totalOrders - completedCount,
        isAllCompleted,
        totalAbnormalIndicators,
      },
      results: formattedOrders,
    };
  }

  // ============================================================
  // 5. TỰ ĐỘNG ĐỒNG BỘ CHI PHÍ TẠM TÍNH (ESTIMATED INVOICE)
  // ============================================================

  /**
   * Tự động tính toán và đồng bộ các dịch vụ CLS vào chi phí tạm tính của bệnh nhân
   */
  async syncEstimatedInvoice(examinationId: string): Promise<Invoice | null> {
    const examination = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'doctor'],
    });

    if (!examination || !examination.appointmentId) {
      return null;
    }

    const appointmentId = examination.appointmentId;

    // Tính tổng phí CLS hiện tại (chỉ lấy các chỉ định còn hiệu lực)
    const activeOrders = await this.serviceOrderRepo.find({
      where: { examinationId },
    });

    const totalServiceFee = activeOrders
      .filter((o) => o.status !== ServiceOrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.fee), 0);

    // Lấy phí khám cơ bản của Bác sĩ
    let consultationFee = 200000;
    if (examination.doctor?.consultationFee != null) {
      consultationFee = Number(examination.doctor.consultationFee);
    } else if (examination.doctorId) {
      const doctor = await this.doctorRepo.findOne({ where: { id: examination.doctorId } });
      if (doctor?.consultationFee != null) {
        consultationFee = Number(doctor.consultationFee);
      }
    }

    // Tìm hoặc khởi tạo bản ghi Invoice tạm tính
    let invoice = await this.invoiceRepo.findOne({
      where: { appointmentId },
    });

    if (!invoice) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `HD-${dateStr}-${random}`;

      invoice = this.invoiceRepo.create({
        invoiceNumber,
        appointmentId,
        examinationId: examination.id,
        patientId: examination.patientId || examination.appointment?.patientId,
        consultationFee,
        serviceFee: totalServiceFee,
        medicineFee: 0,
        insuranceCovered: 0,
        discountAmount: 0,
        totalAmount: consultationFee + totalServiceFee,
        status: InvoiceStatus.PENDING,
        notes: 'Hóa đơn tạm tính tự động đồng bộ từ phòng khám & chỉ định CLS',
      });
    } else {
      if (invoice.status !== InvoiceStatus.PENDING) {
        throw new BadRequestError(
          'Hóa đơn đã thanh toán. Không thể đồng bộ lại chi phí cận lâm sàng.',
        );
      }

      invoice.consultationFee = consultationFee;
      invoice.serviceFee = totalServiceFee;
      invoice.examinationId = examination.id;
      invoice.patientId = examination.patientId || examination.appointment?.patientId;

      invoice.totalAmount = calculateInvoiceAmounts(invoice).totalAmount;
    }

    return await this.invoiceRepo.save(invoice);
  }
}
