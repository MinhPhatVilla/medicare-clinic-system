/**
 * @file src/modules/invoices/invoices.service.ts
 * @description Service xử lý nghiệp vụ Viện phí, Lập hóa đơn & Thanh toán tại Quầy Thu ngân
 */

import { AppDataSource } from '../../config/database';
import { Invoice, InvoiceStatus, PaymentMethod } from '../../models/Invoice.entity';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { ServiceOrder, ServiceOrderStatus } from '../../models/ServiceOrder.entity';
import { Prescription } from '../../models/Prescription.entity';
import { Patient } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import { InvoiceQueryDto, GenerateInvoiceDto, PayInvoiceDto } from './invoices.dto';

export class InvoicesService {
  private invoiceRepo = AppDataSource.getRepository(Invoice);
  private examRepo = AppDataSource.getRepository(Examination);
  private appointmentRepo = AppDataSource.getRepository(Appointment);
  private serviceOrderRepo = AppDataSource.getRepository(ServiceOrder);
  private prescriptionRepo = AppDataSource.getRepository(Prescription);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);

  /**
   * Tạo số hóa đơn duy nhất dạng: HD-YYYYMMDD-XXXX
   */
  private generateInvoiceNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HD-${dateStr}-${random}`;
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
    const exam = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'doctor', 'patient'],
    });

    if (!exam) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    // 1. Phí khám bác sĩ (consultation_fee)
    let consultationFee = 200000;
    if (exam.doctor?.consultationFee) {
      consultationFee = Number(exam.doctor.consultationFee);
    } else if (exam.doctorId) {
      const doc = await this.doctorRepo.findOne({ where: { id: exam.doctorId } });
      if (doc?.consultationFee) consultationFee = Number(doc.consultationFee);
    }

    // 2. Tổng tiền dịch vụ cận lâm sàng (service_fee)
    // Chỉ tính các chỉ định không bị hủy (status !== CANCELLED)
    const clsOrders = await this.serviceOrderRepo.find({
      where: { examinationId: exam.id },
    });
    const serviceFee = clsOrders
      .filter((order) => order.status !== ServiceOrderStatus.CANCELLED)
      .reduce((sum, order) => sum + Number(order.fee || 0), 0);

    // 3. Tổng tiền đơn thuốc (medicine_fee)
    const rx = await this.prescriptionRepo.findOne({
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

    // 4. Giảm giá và BHYT
    const insuranceCovered = dto?.insuranceCovered !== undefined ? Number(dto.insuranceCovered) : 0;
    const discountAmount = dto?.discountAmount !== undefined ? Number(dto.discountAmount) : 0;

    // 5. Tổng thanh toán thực tế (total_amount)
    const subtotal = consultationFee + serviceFee + medicineFee;
    const totalAmount = Math.max(0, subtotal - insuranceCovered - discountAmount);

    // 6. Tìm hoặc khởi tạo bản ghi Invoice
    let invoice = await this.invoiceRepo.findOne({
      where: [
        { examinationId: exam.id },
        ...(exam.appointmentId ? [{ appointmentId: exam.appointmentId }] : []),
      ],
    });

    if (!invoice) {
      invoice = this.invoiceRepo.create({
        invoiceNumber: this.generateInvoiceNumber(),
        appointmentId: exam.appointmentId,
        examinationId: exam.id,
        patientId: exam.patientId || exam.appointment?.patientId,
        consultationFee,
        serviceFee,
        medicineFee,
        insuranceCovered,
        discountAmount,
        totalAmount,
        status: InvoiceStatus.PENDING,
        notes: dto?.notes || 'Bảng kê viện phí tổng hợp tự động khi kết thúc ca khám',
      });
    } else {
      invoice.examinationId = exam.id;
      if (exam.patientId) invoice.patientId = exam.patientId;
      invoice.consultationFee = consultationFee;
      invoice.serviceFee = serviceFee;
      invoice.medicineFee = medicineFee;
      if (dto?.insuranceCovered !== undefined) invoice.insuranceCovered = insuranceCovered;
      if (dto?.discountAmount !== undefined) invoice.discountAmount = discountAmount;
      invoice.totalAmount = totalAmount;
      if (dto?.notes) invoice.notes = dto.notes;
    }

    return await this.invoiceRepo.save(invoice);
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
  async getInvoiceDetail(invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: [
        'patient',
        'appointment',
        'examination',
        'examination.doctor',
        'examination.doctor.user',
      ],
    });

    if (!invoice) {
      throw new NotFoundError('Hóa đơn');
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
          status: invoice.status,
        },
      },
    };
  }

  /**
   * Quầy Thu ngân xác nhận thu tiền / thanh toán hóa đơn
   */
  async payInvoice(invoiceId: string, dto: PayInvoiceDto, cashierUserId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['appointment', 'patient'],
    });

    if (!invoice) {
      throw new NotFoundError('Hóa đơn');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError('Hóa đơn này đã được xác nhận thanh toán trước đó.');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = dto.paymentMethod;
    invoice.paidAt = new Date();
    invoice.paidByUserId = cashierUserId;
    if (dto.notes) {
      invoice.notes = invoice.notes ? `${invoice.notes} | ${dto.notes}` : dto.notes;
    }

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Đồng bộ trạng thái các ServiceOrder sang PAID nếu đang ở ORDERED
    if (invoice.examinationId) {
      await this.serviceOrderRepo
        .createQueryBuilder()
        .update(ServiceOrder)
        .set({ status: ServiceOrderStatus.PAID })
        .where('examinationId = :examinationId AND status = :orderedStatus', {
          examinationId: invoice.examinationId,
          orderedStatus: ServiceOrderStatus.ORDERED,
        })
        .execute();
    }

    return savedInvoice;
  }
}
