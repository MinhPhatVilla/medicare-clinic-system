/**
 * @file src/modules/prescriptions/prescriptions.service.ts
 * @description Service xử lý Kê đơn thuốc, Danh mục thuốc, Tra cứu ICD-10 & Hoàn tất khóa bệnh án
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Prescription } from '../../models/Prescription.entity';
import { PrescriptionDetail } from '../../models/PrescriptionDetail.entity';
import { Medicine } from '../../models/Medicine.entity';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { Invoice, InvoiceStatus } from '../../models/Invoice.entity';
import { ServiceOrder, ServiceOrderStatus } from '../../models/ServiceOrder.entity';
import { Doctor } from '../../models/Doctor.entity';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import {
  CreatePrescriptionDto,
  CompleteAndLockDto,
  MedicineCatalogQueryDto,
  Icd10QueryDto,
} from './prescriptions.dto';

// Danh mục mã bệnh ICD-10 phổ biến thường gặp tại phòng khám đa khoa
const DEFAULT_ICD10_CATALOG = [
  { code: 'K29.7', name: 'Viêm dạ dày, không đặc hiệu (Gastritis, unspecified)', group: 'Tiêu hóa' },
  { code: 'K21.9', name: 'Bệnh trào ngược dạ dày - thực quản (GERD)', group: 'Tiêu hóa' },
  { code: 'K25.9', name: 'Loét dạ dày không đặc hiệu', group: 'Tiêu hóa' },
  { code: 'K30', name: 'Chứng khó tiêu chức năng (Dyspepsia)', group: 'Tiêu hóa' },
  { code: 'K58.9', name: 'Hội chứng ruột kích thích (IBS)', group: 'Tiêu hóa' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)', group: 'Tim mạch' },
  { code: 'I20.9', name: 'Cơn đau thắt ngực, không đặc hiệu', group: 'Tim mạch' },
  { code: 'E11.9', name: 'Đái tháo đường type 2 không có biến chứng', group: 'Nội tiết' },
  { code: 'E78.5', name: 'Tăng lipid máu, không đặc hiệu (Rối loạn mỡ máu)', group: 'Nội tiết' },
  { code: 'E04.9', name: 'Bướu giáp nhân không độc', group: 'Nội tiết' },
  { code: 'J00', name: 'Viêm mũi họng cấp tính (Cảm lạnh thông thường)', group: 'Hô hấp' },
  { code: 'J02.9', name: 'Viêm họng cấp, không đặc hiệu', group: 'Hô hấp' },
  { code: 'J06.9', name: 'Nhiễm trùng đường hô hấp trên cấp tính', group: 'Hô hấp' },
  { code: 'J20.9', name: 'Viêm phế quản cấp, không đặc hiệu', group: 'Hô hấp' },
  { code: 'J45.9', name: 'Hen phế quản (Suyễn)', group: 'Hô hấp' },
  { code: 'M17.9', name: 'Thoái hóa khớp gối, không đặc hiệu', group: 'Cơ xương khớp' },
  { code: 'M54.5', name: 'Đau thắt lưng (Lumbago / Low back pain)', group: 'Cơ xương khớp' },
  { code: 'M50.9', name: 'Bệnh đĩa đệm cột sống cổ, không đặc hiệu', group: 'Cơ xương khớp' },
  { code: 'M10.9', name: 'Bệnh Gout, không đặc hiệu', group: 'Cơ xương khớp' },
  { code: 'G43.9', name: 'Đau nửa đầu (Migraine), không đặc hiệu', group: 'Thần kinh' },
  { code: 'G44.2', name: 'Đau đầu căng thẳng (Tension headache)', group: 'Thần kinh' },
  { code: 'N39.0', name: 'Nhiễm trùng đường tiết niệu (UTI)', group: 'Tiết niệu' },
  { code: 'L20.9', name: 'Viêm da cơ địa (Atopic dermatitis)', group: 'Da liễu' },
  { code: 'L50.9', name: 'Mày đay, không đặc hiệu', group: 'Da liễu' },
  { code: 'H10.9', name: 'Viêm kết mạc (Đau mắt đỏ)', group: 'Mắt' },
];

export class PrescriptionsService {
  private prescriptionRepo: Repository<Prescription>;
  private detailRepo: Repository<PrescriptionDetail>;
  private medicineRepo: Repository<Medicine>;
  private examRepo: Repository<Examination>;
  private appointmentRepo: Repository<Appointment>;
  private invoiceRepo: Repository<Invoice>;
  private serviceOrderRepo: Repository<ServiceOrder>;
  private doctorRepo: Repository<Doctor>;

  constructor() {
    this.prescriptionRepo = AppDataSource.getRepository(Prescription);
    this.detailRepo = AppDataSource.getRepository(PrescriptionDetail);
    this.medicineRepo = AppDataSource.getRepository(Medicine);
    this.examRepo = AppDataSource.getRepository(Examination);
    this.appointmentRepo = AppDataSource.getRepository(Appointment);
    this.invoiceRepo = AppDataSource.getRepository(Invoice);
    this.serviceOrderRepo = AppDataSource.getRepository(ServiceOrder);
    this.doctorRepo = AppDataSource.getRepository(Doctor);
  }

  // ============================================================
  // 1. DANH MỤC THUỐC & TRA CỨU ICD-10
  // ============================================================

  /**
   * Tra cứu danh mục thuốc
   */
  async getMedicines(query: MedicineCatalogQueryDto) {
    const qb = this.medicineRepo.createQueryBuilder('med');

    if (query.isActive !== undefined) {
      qb.andWhere('med.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(med.name) LIKE LOWER(:search) OR LOWER(med.code) LIKE LOWER(:search) OR LOWER(med.activeIngredient) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('med.name', 'ASC');

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
   * Tra cứu danh mục mã bệnh ICD-10 (hỗ trợ tìm kiếm theo mã, tên bệnh hoặc gõ tự do)
   */
  async getIcd10Catalog(query: Icd10QueryDto) {
    let list = DEFAULT_ICD10_CATALOG;

    if (query.search) {
      const q = query.search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q),
      );
    }

    const limit = query.limit || 20;
    return {
      items: list.slice(0, limit),
      total: list.length,
      note: 'Hỗ trợ chọn mã ICD-10 chuẩn hoặc bác sĩ có thể nhập văn bản chẩn đoán tự do',
    };
  }

  // ============================================================
  // 2. KÊ ĐƠN THUỐC (PRESCRIPTION)
  // ============================================================

  /**
   * Bác sĩ kê đơn thuốc cho ca khám
   */
  async createPrescription(dto: CreatePrescriptionDto, _doctorUserId?: string) {
    const examination = await this.examRepo.findOne({
      where: { id: dto.examinationId },
      relations: ['appointment', 'doctor', 'patient'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    // Kiểm tra khóa: Không cho sửa đổi tùy tiện nếu ca khám đã hoàn tất và bị khóa
    if (examination.isLocked || examination.status === ExaminationStatus.COMPLETED) {
      throw new BadRequestError(
        'Hồ sơ khám bệnh này đã hoàn tất và bị khóa. Không thể sửa đổi hoặc kê đơn thêm.',
      );
    }

    // Kiểm tra đã có đơn thuốc trước đó chưa, nếu có thì cập nhật đơn thuốc cũ
    let prescription = await this.prescriptionRepo.findOne({
      where: { examinationId: dto.examinationId },
      relations: ['details'],
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    if (!prescription) {
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      prescription = this.prescriptionRepo.create({
        prescriptionCode: `DT-${dateStr}-${random}`,
        examinationId: examination.id,
        diagnosisSummary: dto.diagnosisSummary || examination.diagnosis || 'Theo chẩn đoán bác sĩ',
        dispensingNotes: dto.dispensingNotes,
        issuedAt: new Date(),
        totalMedicineFee: 0,
      });
      prescription = await this.prescriptionRepo.save(prescription);
    } else {
      // Xóa các chi tiết thuốc cũ để tạo lại
      if (prescription.details && prescription.details.length > 0) {
        await this.detailRepo.remove(prescription.details);
      }
      prescription.dispensingNotes = dto.dispensingNotes || '';
      prescription.diagnosisSummary =
        dto.diagnosisSummary || examination.diagnosis || '';
    }

    // Tạo các dòng thuốc chi tiết kèm liều dùng sáng - trưa - chiều - tối
    let totalMedicineFee = 0;
    const detailEntities: PrescriptionDetail[] = [];

    for (const med of dto.medicines) {
      const unitPrice = Number(med.unitPrice || 0);
      const quantity = Number(med.quantity || 1);
      const totalPrice = unitPrice * quantity;
      totalMedicineFee += totalPrice;

      // Xây dựng chuỗi tần suất nếu chưa có
      const frequencyStr =
        med.morningDose || med.noonDose || med.afternoonDose || med.eveningDose
          ? `Sáng ${med.morningDose} - Trưa ${med.noonDose} - Chiều ${med.afternoonDose} - Tối ${med.eveningDose} (${med.unit})`
          : 'Theo hướng dẫn chi tiết';

      const detail = this.detailRepo.create({
        prescriptionId: prescription.id,
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        medicineCode: med.medicineCode,
        activeIngredient: med.activeIngredient,
        dosage: med.dosage,
        routeOfAdministration: med.routeOfAdministration || 'Uống',
        morningDose: med.morningDose,
        noonDose: med.noonDose,
        afternoonDose: med.afternoonDose,
        eveningDose: med.eveningDose,
        frequency: frequencyStr,
        duration: '7 ngày',
        quantity,
        unit: med.unit,
        unitPrice,
        totalPrice,
        usageInstructions: med.usageInstructions,
        notes: med.notes,
      });

      detailEntities.push(detail);
    }

    const savedDetails = await this.detailRepo.save(detailEntities);
    prescription.totalMedicineFee = totalMedicineFee;
    await this.prescriptionRepo.save(prescription);

    // Tự động đồng bộ tiền thuốc vào hóa đơn tạm tính của bệnh nhân
    await this.syncInvoiceWithPrescription(examination.appointmentId, totalMedicineFee);

    return {
      prescription: {
        ...prescription,
        details: savedDetails,
      },
      totalMedicineFee,
    };
  }

  /**
   * Lấy đơn thuốc theo mã phiếu khám
   */
  async getPrescriptionByExamination(examinationId: string) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { examinationId },
      relations: ['details', 'examination', 'examination.patient', 'examination.doctor'],
    });

    if (!prescription) {
      throw new NotFoundError('Đơn thuốc');
    }

    return prescription;
  }

  // ============================================================
  // 3. QUY TRÌNH KẾT THÚC KHÁM & KHÓA HỒ SƠ (COMPLETE AND LOCK)
  // ============================================================

  /**
   * Bác sĩ xác nhận "Hoàn tất khám"
   * - Cập nhật Chẩn đoán xác định (ICD-10 hoặc gõ tự do), lời dặn, ngày tái khám
   * - Kê đơn thuốc (nếu có)
   * - Cập nhật Examination sang COMPLETED, khóa không cho sửa đổi tùy tiện (isLocked = true)
   * - Cập nhật Appointment sang COMPLETED
   * - Tự động chuyển dữ liệu và đồng bộ chi phí đầy đủ sang quầy Thu ngân
   */
  async completeAndLockExamination(
    examinationId: string,
    dto: CompleteAndLockDto,
    doctorUserId?: string,
  ) {
    const examination = await this.examRepo.findOne({
      where: { id: examinationId },
      relations: ['appointment', 'doctor'],
    });

    if (!examination) {
      throw new NotFoundError('Phiếu khám bệnh');
    }

    // Kiểm tra tính toàn vẹn: Chặn sửa đổi nếu hồ sơ đã bị khóa trước đó
    if (examination.isLocked || examination.status === ExaminationStatus.COMPLETED) {
      throw new BadRequestError(
        'Hồ sơ khám bệnh này đã hoàn tất và bị khóa chính thức. Không thể sửa đổi tùy tiện.',
      );
    }

    // 1. Cập nhật thông tin chẩn đoán và điều trị
    examination.diagnosis = dto.diagnosis;
    if (dto.icd10Code) examination.icd10Code = dto.icd10Code;
    if (dto.icd10Description) examination.icd10Description = dto.icd10Description;
    if (dto.clinicalNotes) examination.clinicalNotes = dto.clinicalNotes;
    if (dto.treatmentPlan) examination.treatmentPlan = dto.treatmentPlan;
    if (dto.followUpDate) examination.followUpDate = new Date(dto.followUpDate);
    if (dto.followUpNotes) examination.followUpNotes = dto.followUpNotes;

    // 2. Kê đơn thuốc nếu có kèm trong request
    let prescriptionResult = null;
    if (dto.prescription && dto.prescription.medicines.length > 0) {
      prescriptionResult = await this.createPrescription(
        {
          examinationId: examination.id,
          diagnosisSummary: dto.diagnosis,
          dispensingNotes: dto.prescription.dispensingNotes,
          medicines: dto.prescription.medicines,
        },
        doctorUserId,
      );
    }

    // 3. Khóa hồ sơ bệnh án chính thức
    examination.status = ExaminationStatus.COMPLETED;
    examination.isDraft = false;
    examination.isLocked = true;
    examination.completedAt = new Date();

    const savedExam = await this.examRepo.save(examination);

    // 4. Cập nhật lịch hẹn tương ứng sang COMPLETED
    if (examination.appointmentId) {
      await this.appointmentRepo.update(
        { id: examination.appointmentId },
        { status: AppointmentStatus.COMPLETED },
      );
    }

    // 5. Chuyển dữ liệu và tổng chi phí sang quầy Thu ngân (Billing)
    const finalizedInvoice = await this.finalizeInvoiceForCashier(examination);

    return {
      examination: savedExam,
      prescription: prescriptionResult?.prescription || null,
      invoice: finalizedInvoice,
      message:
        'Đã hoàn tất ca khám, khóa hồ sơ bệnh án thành công và chuyển toàn bộ dữ liệu chi phí sang quầy Thu ngân.',
    };
  }

  // ============================================================
  // 4. ĐỒNG BỘ CHI PHÍ SANG QUẦY THU NGÂN
  // ============================================================

  /**
   * Đồng bộ tiền thuốc vào hóa đơn tạm tính
   */
  private async syncInvoiceWithPrescription(appointmentId: string, medicineFee: number) {
    let invoice = await this.invoiceRepo.findOne({ where: { appointmentId } });
    if (invoice) {
      invoice.medicineFee = medicineFee;
      const subtotal =
        Number(invoice.consultationFee || 0) +
        Number(invoice.serviceFee || 0) +
        medicineFee;
      invoice.totalAmount = Math.max(
        0,
        subtotal -
          Number(invoice.insuranceCovered || 0) -
          Number(invoice.discountAmount || 0),
      );
      await this.invoiceRepo.save(invoice);
    }
  }

  /**
   * Hoàn tất và chốt hóa đơn chuyển sang Thu ngân (Status: PENDING)
   */
  private async finalizeInvoiceForCashier(examination: Examination) {
    if (!examination.appointmentId) return null;

    const appointmentId = examination.appointmentId;

    // 1. Phí khám từ Doctor
    let consultationFee = 200000;
    if (examination.doctor?.consultationFee) {
      consultationFee = Number(examination.doctor.consultationFee);
    } else if (examination.doctorId) {
      const doc = await this.doctorRepo.findOne({ where: { id: examination.doctorId } });
      if (doc?.consultationFee) consultationFee = Number(doc.consultationFee);
    }

    // 2. Tổng phí CLS (chỉ tính các chỉ định không bị hủy)
    const activeCls = await this.serviceOrderRepo.find({
      where: { examinationId: examination.id },
    });
    const serviceFee = activeCls
      .filter((o) => o.status !== ServiceOrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.fee), 0);

    // 3. Tổng tiền thuốc từ Prescription
    const rx = await this.prescriptionRepo.findOne({
      where: { examinationId: examination.id },
    });
    const medicineFee = Number(rx?.totalMedicineFee || 0);

    // 4. Tìm hoặc tạo hóa đơn thu ngân
    let invoice = await this.invoiceRepo.findOne({ where: { appointmentId } });

    const totalSubtotal = consultationFee + serviceFee + medicineFee;

    if (!invoice) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `HD-${dateStr}-${random}`;

      invoice = this.invoiceRepo.create({
        invoiceNumber,
        appointmentId,
        consultationFee,
        serviceFee,
        medicineFee,
        insuranceCovered: 0,
        discountAmount: 0,
        totalAmount: totalSubtotal,
        status: InvoiceStatus.PENDING,
        notes: 'Bảng kê viện phí chuyển từ Bác sĩ sau khi hoàn tất khám',
      });
    } else {
      invoice.consultationFee = consultationFee;
      invoice.serviceFee = serviceFee;
      invoice.medicineFee = medicineFee;
      invoice.totalAmount = Math.max(
        0,
        totalSubtotal -
          Number(invoice.insuranceCovered || 0) -
          Number(invoice.discountAmount || 0),
      );
      invoice.status = InvoiceStatus.PENDING;
    }

    return await this.invoiceRepo.save(invoice);
  }
}
