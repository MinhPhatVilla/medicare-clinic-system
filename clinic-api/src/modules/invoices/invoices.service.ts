/**
 * @file src/modules/invoices/invoices.service.ts
 * @description Service xử lý nghiệp vụ Viện phí, Lập hóa đơn & Thanh toán tại Quầy Thu ngân
 */

import { randomBytes } from 'crypto';
import { EntityManager, In, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { AppDataSource } from '../../config/database';
import { Invoice, InvoiceStatus } from '../../models/Invoice.entity';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { ServiceOrder, ServiceOrderStatus } from '../../models/ServiceOrder.entity';
import {
  Prescription,
  PrescriptionDispensingStatus,
  PrescriptionPaymentStatus,
} from '../../models/Prescription.entity';
import { Doctor } from '../../models/Doctor.entity';
import { User, UserRole } from '../../models/User.entity';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../exceptions/AppError';
import { calculateInvoiceAmounts, lockBillingExamination, moneyInCents } from './invoice-integrity';
import {
  InvoicePrintQueryDto,
  InvoiceQueryDto,
  GenerateInvoiceDto,
  PayInvoiceDto,
  PharmacyQueueQueryDto,
} from './invoices.dto';

export class InvoicesService {
  private invoiceRepo = AppDataSource.getRepository(Invoice);
  private serviceOrderRepo = AppDataSource.getRepository(ServiceOrder);
  private prescriptionRepo = AppDataSource.getRepository(Prescription);

  /**
   * Tạo số hóa đơn duy nhất dạng: HD-YYYYMMDD-XXXX
   */
  private generateInvoiceNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(3).toString('hex').toUpperCase();
    return `HD-${dateStr}-${random}`;
  }

  private generateTransactionCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(8).toString('hex').toUpperCase();
    return `TXN-${dateStr}-${random}`;
  }

  private async createUniqueInvoiceNumber(invoiceRepo: Repository<Invoice>): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const invoiceNumber = this.generateInvoiceNumber();
      const exists = await invoiceRepo.exist({ where: { invoiceNumber } });
      if (!exists) return invoiceNumber;
    }

    throw new BadRequestError('Không thể sinh số hóa đơn duy nhất. Vui lòng thử lại.');
  }

  private async createUniqueTransactionCode(invoiceRepo: Repository<Invoice>): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const transactionCode = this.generateTransactionCode();
      const exists = await invoiceRepo.exist({ where: { transactionCode } });
      if (!exists) return transactionCode;
    }

    throw new BadRequestError('Không thể sinh mã giao dịch duy nhất. Vui lòng thử lại.');
  }

  private assertInvoiceCanBePaid(invoice: Invoice): void {
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError('Hóa đơn này đã được xác nhận thanh toán trước đó.');
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestError(
        `Chỉ hóa đơn trạng thái PENDING mới được xác nhận thanh toán. Trạng thái hiện tại: ${invoice.status}.`,
      );
    }

    const calculated = calculateInvoiceAmounts(invoice);

    if (moneyInCents(calculated.totalAmount) !== moneyInCents(invoice.totalAmount)) {
      throw new BadRequestError(
        'Tổng tiền hóa đơn không khớp với các khoản phí thành phần. Vui lòng làm mới hóa đơn trước khi thanh toán.',
      );
    }
  }

  /**
   * Tự động sinh hoặc tính toán lại Hóa đơn tổng hợp từ Phiếu khám bệnh
   * Tổng hợp 4 khoản viện phí cốt lõi:
   * 1. Tiền khám bác sĩ (consultation_fee)
   * 2. Tổng tiền dịch vụ cận lâm sàng (service_fee)
   * 3. Tổng tiền đơn thuốc (medicine_fee)
   * 4. Tổng thanh toán (total_amount = consultation + service + medicine - insurance - discount)
   */
  async generateInvoiceFromExamination(
    examinationId: string,
    dto?: GenerateInvoiceDto,
  ): Promise<Invoice> {
    return await AppDataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Examination);
      const invoiceRepo = manager.getRepository(Invoice);
      const serviceOrderRepo = manager.getRepository(ServiceOrder);
      const prescriptionRepo = manager.getRepository(Prescription);
      const doctorRepo = manager.getRepository(Doctor);

      await lockBillingExamination(manager, examinationId);

      const exam = await examRepo.findOne({
        where: { id: examinationId },
        relations: ['appointment', 'doctor', 'patient'],
      });

      if (!exam) {
        throw new NotFoundError('Phiếu khám bệnh');
      }

      if (exam.status === ExaminationStatus.CANCELLED) {
        throw new BadRequestError('Không thể tạo hóa đơn cho phiếu khám đã hủy.');
      }

      if (!exam.appointmentId) {
        throw new BadRequestError('Phiếu khám chưa liên kết lịch hẹn nên không thể tạo hóa đơn.');
      }

      const patientId = exam.patientId || exam.appointment?.patientId;
      if (!patientId) {
        throw new BadRequestError('Phiếu khám chưa có thông tin bệnh nhân.');
      }

      // 1. Phí khám bác sĩ (consultation_fee)
      let consultationFee = 200000;
      if (exam.doctor?.consultationFee != null) {
        consultationFee = Number(exam.doctor.consultationFee);
      } else if (exam.doctorId) {
        const doc = await doctorRepo.findOne({ where: { id: exam.doctorId } });
        if (doc?.consultationFee != null) consultationFee = Number(doc.consultationFee);
      }

      // 2. Tổng tiền dịch vụ cận lâm sàng (service_fee)
      // Chỉ tính các chỉ định không bị hủy (status !== CANCELLED)
      const clsOrders = await serviceOrderRepo.find({
        where: { examinationId: exam.id },
      });
      const serviceFee = clsOrders
        .filter((order) => order.status !== ServiceOrderStatus.CANCELLED)
        .reduce((sum, order) => sum + Number(order.fee || 0), 0);

      // 3. Tổng tiền đơn thuốc (medicine_fee)
      const rx = await prescriptionRepo.findOne({
        where: { examinationId: exam.id },
        relations: ['details'],
      });

      let medicineFee = 0;
      if (rx) {
        if (rx.details && rx.details.length > 0) {
          medicineFee = rx.details.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        } else {
          medicineFee = Number(rx.totalMedicineFee || 0);
        }
      }

      const existingInvoice = await invoiceRepo.findOne({
        where: [{ examinationId: exam.id }, { appointmentId: exam.appointmentId }],
        lock: { mode: 'pessimistic_write' },
      });

      if (existingInvoice && existingInvoice.status !== InvoiceStatus.PENDING) {
        throw new BadRequestError(
          `Chỉ hóa đơn PENDING mới được tính lại chi phí. Trạng thái hiện tại: ${existingInvoice.status}.`,
        );
      }

      const insuranceCovered =
        dto?.insuranceCovered !== undefined
          ? Number(dto.insuranceCovered)
          : Number(existingInvoice?.insuranceCovered || 0);
      const discountAmount =
        dto?.discountAmount !== undefined
          ? Number(dto.discountAmount)
          : Number(existingInvoice?.discountAmount || 0);

      const amounts = calculateInvoiceAmounts({
        consultationFee,
        serviceFee,
        medicineFee,
        insuranceCovered,
        discountAmount,
        prepaidAmount: Number(existingInvoice?.prepaidAmount || 0),
      });

      let invoice = existingInvoice;

      if (!invoice) {
        invoice = invoiceRepo.create({
          invoiceNumber: await this.createUniqueInvoiceNumber(invoiceRepo),
          appointmentId: exam.appointmentId,
          examinationId: exam.id,
          patientId,
          consultationFee: amounts.consultationFee,
          serviceFee: amounts.serviceFee,
          medicineFee: amounts.medicineFee,
          insuranceCovered: amounts.insuranceCovered,
          discountAmount: amounts.discountAmount,
          totalAmount: amounts.totalAmount,
          status: InvoiceStatus.PENDING,
          notes: dto?.notes || 'Bảng kê viện phí tổng hợp tự động khi kết thúc ca khám',
        });
      } else {
        invoice.examinationId = exam.id;
        invoice.patientId = patientId;
        invoice.consultationFee = amounts.consultationFee;
        invoice.serviceFee = amounts.serviceFee;
        invoice.medicineFee = amounts.medicineFee;
        invoice.insuranceCovered = amounts.insuranceCovered;
        invoice.discountAmount = amounts.discountAmount;
        invoice.totalAmount = amounts.totalAmount;
        if (dto?.notes) invoice.notes = dto.notes;
      }

      return await invoiceRepo.save(invoice);
    });
  }

  /**
   * Tra cứu danh sách hóa đơn tại Quầy Thu ngân
   * Hỗ trợ tìm kiếm theo: mã phiếu khám, mã bệnh nhân, SĐT, mã đặt lịch, số hóa đơn, trạng thái
   */
  async getInvoices(query: InvoiceQueryDto) {
    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.patient', 'patient')
      .leftJoinAndSelect('invoice.examination', 'examination')
      .leftJoinAndSelect('examination.doctor', 'doctor')
      .leftJoinAndSelect('invoice.appointment', 'appointment');

    // Lọc theo mã phiếu khám (examinationId)
    if (query.examinationId) {
      qb.andWhere('invoice.examinationId = :examinationId', {
        examinationId: query.examinationId,
      });
    }

    // Lọc theo mã bệnh nhân (patientId)
    if (query.patientId) {
      qb.andWhere('(invoice.patientId = :patientId OR patient.id = :patientId)', {
        patientId: query.patientId,
      });
    }

    // Lọc theo mã hồ sơ bệnh nhân (patientCode)
    if (query.patientCode) {
      qb.andWhere('patient.patientCode = :patientCode', {
        patientCode: query.patientCode.trim(),
      });
    }

    // Lọc theo số điện thoại bệnh nhân
    if (query.phone) {
      qb.andWhere('patient.phone ILIKE :phone', {
        phone: `%${query.phone.trim()}%`,
      });
    }

    // Lọc theo mã lịch hẹn / phiếu khám hiển thị (bookingCode)
    if (query.bookingCode) {
      qb.andWhere('appointment.bookingCode = :bookingCode', {
        bookingCode: query.bookingCode.trim(),
      });
    }

    // Lọc theo số hóa đơn (invoiceNumber)
    if (query.invoiceNumber) {
      qb.andWhere('invoice.invoiceNumber ILIKE :invoiceNumber', {
        invoiceNumber: `%${query.invoiceNumber.trim()}%`,
      });
    }

    // Lọc theo trạng thái hóa đơn (PENDING, PAID, ...)
    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    // Tra cứu nhanh từ ô tìm kiếm (tên BN, SĐT, số hóa đơn, mã đặt lịch)
    if (query.keyword) {
      const kw = `%${query.keyword.trim()}%`;
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :kw OR patient.fullName ILIKE :kw OR patient.phone ILIKE :kw OR appointment.bookingCode ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('invoice.createdAt', 'DESC');

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy chi tiết toàn diện hóa đơn và bảng kê viện phí minh bạch
   * Gồm: Tiền khám + Chi tiết từng CLS + Chi tiết từng thuốc trong đơn
   */
  async getInvoiceDetail(invoiceId: string, actor?: User) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      select: { examination: { doctor: { user: { id: true, fullName: true } } } },
      relations: [
        'patient',
        'appointment',
        'appointment.patient',
        'examination',
        'examination.doctor',
        'examination.doctor.user',
      ],
    });

    if (!invoice) {
      throw new NotFoundError('Hóa đơn');
    }

    if (
      actor?.role === UserRole.PATIENT &&
      (invoice.patient || invoice.appointment?.patient)?.userId !== actor.id
    ) {
      throw new ForbiddenError('Bạn chỉ được xem hóa đơn của mình.');
    }
    if (actor?.role === UserRole.DOCTOR && invoice.examination?.doctor?.userId !== actor.id) {
      throw new ForbiddenError('Bạn chỉ được xem hóa đơn ca khám mình phụ trách.');
    }

    // Lấy chi tiết danh sách Cận lâm sàng đã chỉ định
    let serviceOrders: ServiceOrder[] = [];
    if (invoice.examinationId) {
      serviceOrders = await this.serviceOrderRepo.find({
        where: { examinationId: invoice.examinationId },
        order: { createdAt: 'ASC' },
      });
    }

    // Lấy chi tiết đơn thuốc đã kê
    let prescription: Prescription | null = null;
    if (invoice.examinationId) {
      prescription = await this.prescriptionRepo.findOne({
        where: { examinationId: invoice.examinationId },
        relations: ['details'],
      });
    }

    return {
      invoice,
      breakdown: {
        // Khoản 1: Khám bác sĩ
        consultation: {
          fee: Number(invoice.consultationFee),
          doctorName: invoice.examination?.doctor?.user?.fullName || 'Bác sĩ chuyên khoa',
          specialty: invoice.examination?.doctor?.specialty || 'Đa khoa',
          roomNumber: invoice.examination?.doctor?.roomNumber || 'Phòng khám',
        },
        // Khoản 2: Cận lâm sàng
        serviceOrders: serviceOrders.map((so) => ({
          id: so.id,
          serviceCode: so.serviceCode,
          serviceName: so.serviceName,
          serviceType: so.serviceType,
          fee: Number(so.fee),
          status: so.status,
          performedAt: so.performedAt,
        })),
        totalServiceFee: Number(invoice.serviceFee),
        // Khoản 3: Đơn thuốc
        prescription: prescription
          ? {
              id: prescription.id,
              prescriptionCode: prescription.prescriptionCode,
              dispensingNotes: prescription.dispensingNotes,
              paymentStatus: prescription.paymentStatus,
              dispensingStatus: prescription.dispensingStatus,
              totalMedicineFee: Number(invoice.medicineFee),
              items: (prescription.details || []).map((d) => ({
                id: d.id,
                medicineCode: d.medicineCode,
                medicineName: d.medicineName,
                activeIngredient: d.activeIngredient,
                dosage: d.dosage,
                unit: d.unit,
                quantity: d.quantity,
                unitPrice: Number(d.unitPrice),
                totalPrice: Number(d.totalPrice),
                morningDose: Number(d.morningDose),
                noonDose: Number(d.noonDose),
                afternoonDose: Number(d.afternoonDose),
                eveningDose: Number(d.eveningDose),
                usageInstructions: d.usageInstructions,
              })),
            }
          : null,
        // Khoản 4: Tổng hợp thanh toán
        summary: {
          consultationFee: Number(invoice.consultationFee),
          serviceFee: Number(invoice.serviceFee),
          medicineFee: Number(invoice.medicineFee),
          insuranceCovered: Number(invoice.insuranceCovered),
          discountAmount: Number(invoice.discountAmount),
          totalAmount: Number(invoice.totalAmount),
          prepaidAmount: Number(invoice.prepaidAmount || 0),
          collectedAmount:
            (moneyInCents(invoice.totalAmount) - moneyInCents(invoice.prepaidAmount || 0)) / 100,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          transactionCode: invoice.transactionCode,
          paidAt: invoice.paidAt,
        },
      },
    };
  }

  /**
   * Quầy Thu ngân xác nhận thu tiền / thanh toán hóa đơn
   */
  async payInvoice(invoiceId: string, dto: PayInvoiceDto, cashierUserId: string) {
    return await AppDataSource.transaction(async (manager) => {
      const invoiceRepo = manager.getRepository(Invoice);
      const serviceOrderRepo = manager.getRepository(ServiceOrder);

      const candidate = await invoiceRepo.findOneBy({ id: invoiceId });
      if (!candidate) throw new NotFoundError('Hóa đơn');
      if (!candidate.examinationId) {
        throw new BadRequestError('Hóa đơn chưa liên kết phiếu khám. Vui lòng lập lại hóa đơn.');
      }
      const exam = await lockBillingExamination(manager, candidate.examinationId);

      const invoice = await invoiceRepo.findOne({
        where: { id: invoiceId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!invoice) {
        throw new NotFoundError('Hóa đơn');
      }

      this.assertInvoiceCanBePaid(invoice);
      if (exam.status !== ExaminationStatus.COMPLETED || !exam.isLocked) {
        throw new BadRequestError(
          'Chỉ được quyết toán sau khi bác sĩ hoàn tất và khóa phiếu khám.',
        );
      }
      if (exam.appointmentId !== invoice.appointmentId || exam.patientId !== invoice.patientId) {
        throw new BadRequestError('Thông tin phiếu khám, bệnh nhân và hóa đơn không khớp.');
      }
      const orders = await serviceOrderRepo.findBy({ examinationId: exam.id });
      const rx = await manager.getRepository(Prescription).findOne({
        where: { examinationId: exam.id },
        relations: ['details'],
      });
      const serviceCents = orders
        .filter((order) => order.status !== ServiceOrderStatus.CANCELLED)
        .reduce((sum, order) => sum + moneyInCents(order.fee), 0);
      const medicineCents = (rx?.details || []).reduce(
        (sum, detail) => sum + moneyInCents(detail.totalPrice),
        0,
      );
      if (
        rx &&
        (medicineCents !== moneyInCents(rx.totalMedicineFee) ||
          rx.details.some(
            (detail) =>
              moneyInCents(detail.totalPrice) !== moneyInCents(detail.unitPrice) * detail.quantity,
          ))
      ) {
        throw new BadRequestError('Thành tiền đơn thuốc không khớp số lượng và đơn giá.');
      }
      if (
        serviceCents !== moneyInCents(invoice.serviceFee) ||
        medicineCents !== moneyInCents(invoice.medicineFee)
      ) {
        throw new BadRequestError(
          'Chi phí dịch vụ hoặc thuốc đã thay đổi. Vui lòng làm mới hóa đơn.',
        );
      }

      const paidAt = new Date();
      const transactionCode = await this.createUniqueTransactionCode(invoiceRepo);

      invoice.status = InvoiceStatus.PAID;
      invoice.paymentMethod = dto.paymentMethod;
      invoice.transactionCode = transactionCode;
      if (dto.paymentReference) {
        invoice.paymentReference = dto.paymentReference;
      }
      invoice.paidAt = paidAt;
      invoice.paidByUserId = cashierUserId;
      if (dto.notes) {
        invoice.notes = invoice.notes ? `${invoice.notes} | ${dto.notes}` : dto.notes;
      }

      const savedInvoice = await invoiceRepo.save(invoice);

      // Đồng bộ trạng thái các ServiceOrder sang PAID nếu đang ở ORDERED
      if (savedInvoice.examinationId) {
        await serviceOrderRepo
          .createQueryBuilder()
          .update(ServiceOrder)
          .set({ status: ServiceOrderStatus.PAID })
          .where('examination_id = :examinationId AND status = :orderedStatus', {
            examinationId: savedInvoice.examinationId,
            orderedStatus: ServiceOrderStatus.ORDERED,
          })
          .execute();
      }

      const pharmacySignal = await this.signalPharmacyForPaidPrescription(manager, savedInvoice);

      return {
        invoice: savedInvoice,
        transaction: {
          transactionCode,
          paymentMethod: savedInvoice.paymentMethod,
          paymentReference: savedInvoice.paymentReference || null,
          amount:
            (moneyInCents(savedInvoice.totalAmount) -
              moneyInCents(savedInvoice.prepaidAmount || 0)) /
            100,
          paidAt,
        },
        pharmacySignal,
        discharge: {
          status: orders.some(
            (order) =>
              ![ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED].includes(order.status),
          )
            ? 'WAITING_SERVICES'
            : pharmacySignal
              ? 'WAITING_MEDICINE'
              : 'READY',
          message: pharmacySignal
            ? 'Bệnh nhân đã thanh toán. Đơn thuốc đã chuyển sang Nhà thuốc để chuẩn bị phát thuốc.'
            : 'Bệnh nhân đã thanh toán. Kiểm tra các chỉ định trước khi xác nhận xuất viện.',
        },
      };
    });
  }

  private async signalPharmacyForPaidPrescription(manager: EntityManager, invoice: Invoice) {
    if (!invoice.examinationId) {
      return null;
    }

    const prescriptionRepo = manager.getRepository(Prescription);
    const prescription = await prescriptionRepo.findOne({
      where: { examinationId: invoice.examinationId },
      relations: ['details', 'examination', 'examination.patient', 'examination.appointment'],
    });

    if (!prescription || !prescription.details || prescription.details.length === 0) {
      return null;
    }
    if (
      prescription.paymentStatus !== PrescriptionPaymentStatus.PENDING_PAYMENT ||
      prescription.dispensingStatus !== PrescriptionDispensingStatus.WAITING_PAYMENT
    ) {
      throw new BadRequestError('Đơn thuốc không còn ở trạng thái chờ thanh toán.');
    }

    prescription.paymentStatus = PrescriptionPaymentStatus.PAID;
    prescription.dispensingStatus = PrescriptionDispensingStatus.READY_TO_PREPARE;
    prescription.paidInvoiceId = invoice.id;
    prescription.paymentConfirmedAt = invoice.paidAt;
    prescription.pharmacyNotifiedAt = new Date();

    const savedPrescription = await prescriptionRepo.save(prescription);

    return {
      prescriptionId: savedPrescription.id,
      prescriptionCode: savedPrescription.prescriptionCode,
      dispensingStatus: savedPrescription.dispensingStatus,
      pharmacyNotifiedAt: savedPrescription.pharmacyNotifiedAt,
      medicineItemCount: savedPrescription.details.length,
      patient: savedPrescription.examination?.patient
        ? {
            id: savedPrescription.examination.patient.id,
            patientCode: savedPrescription.examination.patient.patientCode,
            fullName: savedPrescription.examination.patient.fullName,
            phone: savedPrescription.examination.patient.phone,
          }
        : null,
    };
  }

  /**
   * Hàng đợi Nhà thuốc: các đơn thuốc đã thanh toán và cần chuẩn bị/cấp phát
   */
  async getPharmacyQueue(query: PharmacyQueueQueryDto) {
    const qb = this.prescriptionRepo
      .createQueryBuilder('prescription')
      .leftJoinAndSelect('prescription.details', 'details')
      .leftJoinAndSelect('prescription.examination', 'examination')
      .leftJoinAndSelect('examination.patient', 'patient')
      .leftJoinAndSelect('examination.appointment', 'appointment')
      .innerJoin('prescription.paidInvoice', 'paidInvoice', 'paidInvoice.status = :invoicePaid', {
        invoicePaid: InvoiceStatus.PAID,
      })
      .where('prescription.paymentStatus = :paidStatus', {
        paidStatus: PrescriptionPaymentStatus.PAID,
      });

    if (query.status) {
      qb.andWhere('prescription.dispensingStatus = :status', { status: query.status });
    } else {
      qb.andWhere('prescription.dispensingStatus IN (:...statuses)', {
        statuses: [
          PrescriptionDispensingStatus.READY_TO_PREPARE,
          PrescriptionDispensingStatus.PREPARING,
          PrescriptionDispensingStatus.READY_TO_DISPENSE,
        ],
      });
    }

    if (query.patientCode) {
      qb.andWhere('patient.patientCode = :patientCode', {
        patientCode: query.patientCode.trim(),
      });
    }

    if (query.phone) {
      qb.andWhere('patient.phone ILIKE :phone', {
        phone: `%${query.phone.trim()}%`,
      });
    }

    if (query.keyword) {
      const kw = `%${query.keyword.trim()}%`;
      qb.andWhere(
        '(prescription.prescriptionCode ILIKE :kw OR patient.fullName ILIKE :kw OR patient.phone ILIKE :kw OR appointment.bookingCode ILIKE :kw)',
        { kw },
      );
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    qb.orderBy('prescription.pharmacyNotifiedAt', 'ASC')
      .addOrderBy('prescription.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [prescriptions, total] = await qb.getManyAndCount();
    const invoiceIds = Array.from(
      new Set(prescriptions.map((p) => p.paidInvoiceId).filter((id): id is string => Boolean(id))),
    );
    const invoices = invoiceIds.length ? await this.invoiceRepo.findBy({ id: In(invoiceIds) }) : [];
    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    return {
      items: prescriptions.map((prescription) => {
        const invoice = prescription.paidInvoiceId
          ? invoiceById.get(prescription.paidInvoiceId)
          : undefined;

        return {
          prescriptionId: prescription.id,
          prescriptionCode: prescription.prescriptionCode,
          paymentStatus: prescription.paymentStatus,
          dispensingStatus: prescription.dispensingStatus,
          pharmacyNotifiedAt: prescription.pharmacyNotifiedAt,
          paymentConfirmedAt: prescription.paymentConfirmedAt,
          patient: prescription.examination?.patient
            ? {
                id: prescription.examination.patient.id,
                patientCode: prescription.examination.patient.patientCode,
                fullName: prescription.examination.patient.fullName,
                phone: prescription.examination.patient.phone,
              }
            : null,
          appointment: prescription.examination?.appointment
            ? {
                id: prescription.examination.appointment.id,
                bookingCode: prescription.examination.appointment.bookingCode,
              }
            : null,
          invoice: invoice
            ? {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                transactionCode: invoice.transactionCode,
                paidAt: invoice.paidAt,
                totalAmount: Number(invoice.totalAmount),
                prepaidAmount: Number(invoice.prepaidAmount || 0),
              }
            : null,
          medicines: (prescription.details || []).map((detail) => ({
            id: detail.id,
            medicineCode: detail.medicineCode,
            medicineName: detail.medicineName,
            dosage: detail.dosage,
            quantity: detail.quantity,
            unit: detail.unit,
            usageInstructions: detail.usageInstructions,
          })),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * In/xuất hóa đơn điện tử dạng PDF hoặc mẫu in nhiệt
   */
  async getPharmacyRevision(): Promise<string> {
    const result = await this.prescriptionRepo
      .createQueryBuilder('rx')
      .innerJoin('rx.paidInvoice', 'invoice', 'invoice.status = :status', {
        status: InvoiceStatus.PAID,
      })
      .where('rx.dispensingStatus IN (:...statuses)', {
        statuses: [
          PrescriptionDispensingStatus.READY_TO_PREPARE,
          PrescriptionDispensingStatus.PREPARING,
          PrescriptionDispensingStatus.READY_TO_DISPENSE,
        ],
      })
      .select(
        "md5(COALESCE(string_agg(rx.id::text || ':' || rx.dispensing_status::text || ':' || rx.updated_at::text, ',' ORDER BY rx.id), ''))",
        'revision',
      )
      .getRawOne<{ revision: string }>();
    return result?.revision || '';
  }

  async updateDispensingStatus(
    prescriptionId: string,
    status: PrescriptionDispensingStatus,
    pharmacistId: string,
  ) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Prescription);
      const candidate = await repo.findOneBy({ id: prescriptionId });
      if (!candidate) throw new NotFoundError('Đơn thuốc');
      await lockBillingExamination(manager, candidate.examinationId);
      const prescription = await repo.findOneByOrFail({ id: prescriptionId });
      const invoice = prescription.paidInvoiceId
        ? await manager.getRepository(Invoice).findOneBy({ id: prescription.paidInvoiceId })
        : null;
      if (
        !invoice ||
        invoice.status !== InvoiceStatus.PAID ||
        invoice.examinationId !== prescription.examinationId ||
        prescription.paymentStatus !== PrescriptionPaymentStatus.PAID
      ) {
        throw new BadRequestError('Chỉ được chuẩn bị và phát đơn thuốc đã thanh toán.');
      }
      if (prescription.dispensingStatus === status) return prescription;
      const next: Partial<Record<PrescriptionDispensingStatus, PrescriptionDispensingStatus>> = {
        [PrescriptionDispensingStatus.READY_TO_PREPARE]: PrescriptionDispensingStatus.PREPARING,
        [PrescriptionDispensingStatus.PREPARING]: PrescriptionDispensingStatus.READY_TO_DISPENSE,
        [PrescriptionDispensingStatus.READY_TO_DISPENSE]: PrescriptionDispensingStatus.DISPENSED,
      };
      if (next[prescription.dispensingStatus] !== status) {
        throw new BadRequestError('Trạng thái phát thuốc không đúng trình tự.');
      }
      prescription.dispensingStatus = status;
      if (status === PrescriptionDispensingStatus.DISPENSED) {
        prescription.dispensedAt = new Date();
        prescription.dispensedByUserId = pharmacistId;
      }
      return repo.save(prescription);
    });
  }

  async discharge(invoiceId: string, actorId: string) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Invoice);
      const candidate = await repo.findOneBy({ id: invoiceId });
      if (!candidate) throw new NotFoundError('Hóa đơn');
      if (!candidate.examinationId) throw new BadRequestError('Hóa đơn chưa liên kết phiếu khám.');
      const exam = await lockBillingExamination(manager, candidate.examinationId);
      const invoice = await repo.findOneOrFail({
        where: { id: invoiceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        invoice.status !== InvoiceStatus.PAID ||
        exam.status !== ExaminationStatus.COMPLETED ||
        !exam.isLocked
      ) {
        throw new BadRequestError('Chưa hoàn tất khám hoặc chưa thanh toán.');
      }
      if (invoice.dischargedAt) return invoice;
      const rx = await manager
        .getRepository(Prescription)
        .findOne({ where: { examinationId: exam.id }, relations: ['details'] });
      if (
        rx?.details.length &&
        (rx.dispensingStatus !== PrescriptionDispensingStatus.DISPENSED ||
          rx.paidInvoiceId !== invoice.id)
      ) {
        throw new BadRequestError('Bệnh nhân chưa nhận đủ thuốc đã thanh toán.');
      }
      const orders = await manager.getRepository(ServiceOrder).findBy({ examinationId: exam.id });
      if (
        orders.some(
          (order) =>
            ![ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED].includes(order.status),
        )
      ) {
        throw new BadRequestError('Còn chỉ định cận lâm sàng chưa hoàn tất.');
      }
      invoice.dischargedAt = new Date();
      invoice.dischargedByUserId = actorId;
      return repo.save(invoice);
    });
  }

  async exportInvoice(invoiceId: string, query: InvoicePrintQueryDto, actor?: User) {
    const detail = await this.getInvoiceDetail(invoiceId, actor);
    const invoice = detail.invoice;

    if (invoice.status !== InvoiceStatus.PAID) {
      throw new BadRequestError('Chỉ được in/xuất hóa đơn điện tử sau khi hóa đơn đã thanh toán.');
    }

    const extension = query.format === 'thermal' ? 'txt' : 'pdf';
    const filename = `${invoice.invoiceNumber}.${extension}`;

    if (query.format === 'thermal') {
      return {
        contentType: 'text/plain; charset=utf-8',
        filename,
        body: this.buildThermalReceipt(detail),
      };
    }

    return {
      contentType: 'application/pdf',
      filename,
      body: await this.buildInvoicePdf(detail),
    };
  }

  private buildThermalReceipt(
    detail: Awaited<ReturnType<InvoicesService['getInvoiceDetail']>>,
  ): string {
    return this.buildInvoiceTextLines(detail)
      .flatMap((line) => this.wrapReceiptLine(line, 42))
      .join('\n');
  }

  private buildInvoicePdf(
    detail: Awaited<ReturnType<InvoicesService['getInvoiceDetail']>>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: { Title: detail.invoice.invoiceNumber },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.font(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
      this.buildInvoiceTextLines(detail).forEach((line, index) => {
        doc.fontSize(index < 2 ? 15 : 10).text(line, { lineGap: 4 });
      });
      doc.end();
    });
  }

  private buildInvoiceTextLines(
    detail: Awaited<ReturnType<InvoicesService['getInvoiceDetail']>>,
  ): string[] {
    const invoice = detail.invoice as Invoice;
    const breakdown = detail.breakdown;
    const patient = invoice.patient || invoice.appointment?.patient;
    const summary = breakdown.summary;
    const lines: string[] = [
      'MEDICARE CLINIC',
      'HÓA ĐƠN THANH TOÁN',
      '------------------------------------------',
      `Số hóa đơn: ${invoice.invoiceNumber}`,
      `Mã giao dịch: ${invoice.transactionCode || 'N/A'}`,
      `Thanh toán lúc: ${this.formatDateTime(invoice.paidAt)}`,
      `Phương thức: ${invoice.paymentMethod || 'N/A'}`,
      `Bệnh nhân: ${patient?.fullName || 'N/A'}`,
      `Mã BN: ${patient?.patientCode || 'N/A'}`,
      `SĐT: ${patient?.phone || 'N/A'}`,
      '------------------------------------------',
      `Phí khám: ${this.formatCurrency(summary.consultationFee)}`,
      `Dịch vụ CLS: ${this.formatCurrency(summary.serviceFee)}`,
      `Tiền thuốc: ${this.formatCurrency(summary.medicineFee)}`,
      `BHYT chi trả: ${this.formatCurrency(summary.insuranceCovered)}`,
      `Giảm giá: ${this.formatCurrency(summary.discountAmount)}`,
      `Tổng thanh toán: ${this.formatCurrency(summary.totalAmount)}`,
      `Đã thu trước: ${this.formatCurrency(summary.prepaidAmount)}`,
      `Thu lần này: ${this.formatCurrency(summary.collectedAmount)}`,
      '------------------------------------------',
    ];

    if (breakdown.serviceOrders.length > 0) {
      lines.push('Dịch vụ cận lâm sàng:');
      for (const service of breakdown.serviceOrders.filter(
        (item) => item.status !== ServiceOrderStatus.CANCELLED,
      )) {
        lines.push(`- ${service.serviceName}: ${this.formatCurrency(service.fee)}`);
      }
      lines.push('------------------------------------------');
    }

    if (breakdown.prescription && breakdown.prescription.items.length > 0) {
      lines.push('Đơn thuốc đã thanh toán:');
      for (const item of breakdown.prescription.items) {
        lines.push(
          `- ${item.medicineName} x ${item.quantity} ${item.unit}: ${this.formatCurrency(
            item.totalPrice,
          )}`,
        );
      }
      lines.push('------------------------------------------');
    }

    lines.push('Cảm ơn Quý khách.');

    return lines;
  }

  private formatCurrency(value: number | string | null | undefined): string {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return 'N/A';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });
  }

  private wrapReceiptLine(line: string, maxLength: number): string[] {
    if (line.length <= maxLength) return [line];

    const chunks: string[] = [];
    let remaining = line;
    while (remaining.length > maxLength) {
      chunks.push(remaining.slice(0, maxLength));
      remaining = `  ${remaining.slice(maxLength)}`;
    }
    chunks.push(remaining);
    return chunks;
  }
}
