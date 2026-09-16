/**
 * @file src/modules/service-orders/service-orders.service.ts
 * @description Service xử lý nghiệp vụ Chỉ định Cận Lâm Sàng & Tự động đồng bộ Chi phí tạm tính
 */

import { Repository, Like, In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { ServiceOrder, ServiceOrderStatus } from '../../models/ServiceOrder.entity';
import { MedicalService } from '../../models/MedicalService.entity';
import { Examination } from '../../models/Examination.entity';
import { Appointment } from '../../models/Appointment.entity';
import { Invoice, InvoiceStatus, PaymentMethod } from '../../models/Invoice.entity';
import { Doctor } from '../../models/Doctor.entity';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import {
  CreateServiceOrdersDto,
  UpdateServiceOrderStatusDto,
  PayServiceOrdersDto,
  ServiceCatalogQueryDto,
  CreateMedicalServiceDto,
} from './service-orders.dto';

export class ServiceOrdersService {
  private serviceOrderRepo: Repository<ServiceOrder>;
  private medicalServiceRepo: Repository<MedicalService>;
  private examRepo: Repository<Examination>;
  private appointmentRepo: Repository<Appointment>;
  private invoiceRepo: Repository<Invoice>;
  private doctorRepo: Repository<Doctor>;

  constructor() {
    this.serviceOrderRepo = AppDataSource.getRepository(ServiceOrder);
    this.medicalServiceRepo = AppDataSource.getRepository(MedicalService);
    this.examRepo = AppDataSource.getRepository(Examination);
    this.appointmentRepo = AppDataSource.getRepository(Appointment);
    this.invoiceRepo = AppDataSource.getRepository(Invoice);
    this.doctorRepo = AppDataSource.getRepository(Doctor);
  }

  // ============================================================
  // 1. SERVICE CATALOG (DANH MỤC DỊCH VỤ NIÊM YẾT)
  // ============================================================

  /**
   * Lấy danh mục dịch vụ kỹ thuật kèm giá niêm yết
   */
  async getCatalog(query: ServiceCatalogQueryDto) {
    const where: any = {};
    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    let items = await this.medicalServiceRepo.find({
      where,
      order: { serviceType: 'ASC', code: 'ASC' },
    });

    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q)),
      );
    }

    const total = items.length;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
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
  async createOrders(dto: CreateServiceOrdersDto, doctorUserId?: string) {
    const examination = await this.examRepo.findOne({
      where: { id: dto.examinationId },
      relations: ['appointment', 'doctor', 'doctor.user', 'patient'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

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
   * Lấy danh sách chỉ định CLS thuộc phiếu khám
   */
  async getOrdersByExamination(examinationId: string) {
    const examination = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'patient', 'doctor'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    const orders = await this.serviceOrderRepo.find({
      where: { examinationId },
      order: { createdAt: 'ASC' },
    });

    const activeOrders = orders.filter((o) => o.status !== ServiceOrderStatus.CANCELLED);
    const totalFee = activeOrders.reduce((sum, o) => sum + Number(o.fee), 0);
    const paidFee = orders
      .filter(
        (o) =>
          o.status === ServiceOrderStatus.PAID || o.status === ServiceOrderStatus.COMPLETED,
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
    const order = await this.serviceOrderRepo.findOne({
      where: { id: orderId },
      relations: ['examination'],
    });

    if (!order) {
      throw new NotFoundError('Chỉ định cận lâm sàng');
    }

    // Cập nhật các trường
    order.status = dto.status;
    if (dto.result !== undefined) order.result = dto.result;
    if (dto.resultFileUrl !== undefined) order.resultFileUrl = dto.resultFileUrl;
    if (dto.notes !== undefined) order.notes = dto.notes;

    if (dto.status === ServiceOrderStatus.COMPLETED) {
      order.performedAt = new Date();
    }

    const updated = await this.serviceOrderRepo.save(order);

    // Nếu trạng thái đổi sang CANCELLED, đồng bộ lại hóa đơn tạm tính
    if (dto.status === ServiceOrderStatus.CANCELLED && order.examinationId) {
      await this.syncEstimatedInvoice(order.examinationId);
    }

    return updated;
  }

  /**
   * Thu tiền các chỉ định CLS (chuyển sang PAID)
   */
  async payOrders(dto: PayServiceOrdersDto, cashierUserId?: string) {
    const examination = await this.examRepo.findOne({
      where: { id: dto.examinationId },
    });
    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

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
    const order = await this.serviceOrderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Chỉ định cận lâm sàng');
    }

    if (
      order.status === ServiceOrderStatus.PAID ||
      order.status === ServiceOrderStatus.COMPLETED
    ) {
      throw new BadRequestError(
        'Không thể hủy chỉ định đã thu tiền hoặc đã có kết quả xét nghiệm',
      );
    }

    order.status = ServiceOrderStatus.CANCELLED;
    const saved = await this.serviceOrderRepo.save(order);

    // Đồng bộ lại hóa đơn tạm tính
    await this.syncEstimatedInvoice(order.examinationId);

    return saved;
  }

  // ============================================================
  // 3. TỰ ĐỘNG ĐỒNG BỘ CHI PHÍ TẠM TÍNH (ESTIMATED INVOICE)
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

    // 1. Tính tổng phí CLS hiện tại (chỉ lấy các chỉ định còn hiệu lực: ORDERED, PAID, IN_PROGRESS, COMPLETED)
    const activeOrders = await this.serviceOrderRepo.find({
      where: { examinationId },
    });

    const totalServiceFee = activeOrders
      .filter((o) => o.status !== ServiceOrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.fee), 0);

    // 2. Lấy phí khám cơ bản của Bác sĩ
    let consultationFee = 200000;
    if (examination.doctor?.consultationFee) {
      consultationFee = Number(examination.doctor.consultationFee);
    } else if (examination.doctorId) {
      const doctor = await this.doctorRepo.findOne({ where: { id: examination.doctorId } });
      if (doctor?.consultationFee) {
        consultationFee = Number(doctor.consultationFee);
      }
    }

    // 3. Tìm hoặc khởi tạo bản ghi Invoice tạm tính
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
      // Đã có hóa đơn: Cập nhật phí CLS và tính lại tổng tiền
      invoice.consultationFee = consultationFee;
      invoice.serviceFee = totalServiceFee;

      const subtotal =
        consultationFee + totalServiceFee + Number(invoice.medicineFee || 0);
      invoice.totalAmount = Math.max(
        0,
        subtotal -
          Number(invoice.insuranceCovered || 0) -
          Number(invoice.discountAmount || 0),
      );
    }

    return await this.invoiceRepo.save(invoice);
  }
}
