/**
 * @file src/modules/patients/patients.service.ts
 * @description Business logic cho Patients module (Quản lý hồ sơ bệnh nhân)
 *
 * Tính năng chính:
 * - CRUD hồ sơ bệnh nhân
 * - Kiểm tra trùng lặp Số điện thoại và CCCD/CMND
 * - Chuẩn hóa số điện thoại di động Việt Nam
 * - Sinh mã định danh bệnh nhân tự động (BN-YYYYMM-XXXX)
 * - Tra cứu siêu tốc (Quick Lookup) theo SĐT, mã bệnh nhân, hoặc CCCD
 * - Tự động liên kết tài khoản Auth với hồ sơ Patient
 */

import { EntityManager } from 'typeorm';
import { randomBytes } from 'crypto';
import { AppDataSource } from '../../config/database';
import { Patient, Gender, BloodType } from '../../models/Patient.entity';
import { User, UserRole } from '../../models/User.entity';
import { ConflictError, ForbiddenError, NotFoundError } from '../../exceptions/AppError';
import { paginate } from '../../utils/pagination';
import { normalizePhoneNumber } from '../../utils/phone.util';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
  QuickLookupQueryDto,
} from './patients.dto';

export class PatientsService {
  constructor(private manager: EntityManager = AppDataSource.manager) {}
  private get patientRepo() { return this.manager.getRepository(Patient); }
  private get userRepo() { return this.manager.getRepository(User); }

  /**
   * Tạo hồ sơ bệnh nhân mới
   * - Chuẩn hóa số điện thoại
   * - Bắt lỗi trùng số điện thoại hoặc số CCCD/CMND
   * - Sinh mã định danh bệnh nhân duy nhất (BN-YYYYMM-XXXX)
   * - Tự động liên kết với tài khoản Auth nếu user đã tồn tại theo số điện thoại
   */
  async create(dto: CreatePatientDto, currentUser?: User): Promise<Patient> {
    return this.manager.transaction(manager => new PatientsService(manager).saveNewPatient(dto, currentUser));
  }
  private async saveNewPatient(dto: CreatePatientDto, currentUser?: User): Promise<Patient> {
    const phone = normalizePhoneNumber(dto.phone);

    // 1. Kiểm tra trùng số điện thoại trong bảng patients
    const existingPatientPhone = await this.patientRepo.findOne({
      where: { phone, isActive: true },
    });
    if (existingPatientPhone) {
      throw new ConflictError(
        `Số điện thoại "${phone}" đã được đăng ký cho bệnh nhân: ${existingPatientPhone.fullName} (Mã: ${existingPatientPhone.patientCode})`,
      );
    }

    // 2. Kiểm tra trùng CCCD/CMND
    if (dto.idCardNumber) {
      const existingIdCard = await this.patientRepo.findOne({
        where: { idCardNumber: dto.idCardNumber.trim(), isActive: true },
      });
      if (existingIdCard) {
        throw new ConflictError(
          `Số CCCD/CMND "${dto.idCardNumber}" đã tồn tại trong hệ thống (Bệnh nhân: ${existingIdCard.fullName} - Mã: ${existingIdCard.patientCode})`,
        );
      }
    }

    // 3. Tự động kiểm tra liên kết với User Auth nếu có
    const linkedUserId = currentUser?.role === UserRole.PATIENT ? currentUser.id : null;

    // 4. Sinh mã định danh bệnh nhân tự động (BN-YYYYMM-XXXX)
    const patientCode = await this.generateUniquePatientCode();

    // 5. Khởi tạo và lưu hồ sơ
    const patient = this.patientRepo.create({
      patientCode,
      userId: linkedUserId,
      fullName: dto.fullName.trim(),
      phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender as Gender | undefined,
      idCardNumber: dto.idCardNumber ? dto.idCardNumber.trim() : undefined,
      insuranceNumber: dto.insuranceNumber ? dto.insuranceNumber.trim() : undefined,
      address: dto.address ? dto.address.trim() : undefined,
      bloodType: dto.bloodType as BloodType | undefined,
      allergies: dto.allergies ? dto.allergies.trim() : undefined,
      chronicDiseases: dto.chronicDiseases ? dto.chronicDiseases.trim() : undefined,
      medicalHistory: dto.medicalHistory ? dto.medicalHistory.trim() : undefined,
      emergencyContactName: dto.emergencyContactName ? dto.emergencyContactName.trim() : undefined,
      emergencyContactPhone: dto.emergencyContactPhone || undefined,
      isActive: true,
    });

    const saved = await this.patientRepo.save(patient);

    // Cập nhật ngược lại số điện thoại cho User nếu vừa liên kết
    if (linkedUserId) {
      await this.userRepo.update(linkedUserId, { phone, fullName: dto.fullName.trim() });
    }

    return saved;
  }

  /**
   * Tra cứu nhanh (Quick Lookup) theo Số điện thoại, Mã bệnh nhân hoặc CCCD
   */
  async quickLookup(query: QuickLookupQueryDto): Promise<Patient> {
    const qb = this.patientRepo
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.user', 'user')
      .where('patient.isActive = true');

    if (query.phone) {
      const normalizedPhone = normalizePhoneNumber(query.phone);
      qb.andWhere('(patient.phone = :phone OR user.phone = :phone)', {
        phone: normalizedPhone,
      });
    } else if (query.code) {
      qb.andWhere('patient.patientCode = :code', {
        code: query.code.trim().toUpperCase(),
      });
    } else if (query.idCard) {
      qb.andWhere('patient.idCardNumber = :idCard', {
        idCard: query.idCard.trim(),
      });
    }

    const patient = await qb.getOne();
    if (!patient) {
      throw new NotFoundError('Không tìm thấy bệnh nhân phù hợp với thông tin tra cứu');
    }

    return patient;
  }

  /**
   * Lấy danh sách bệnh nhân có phân trang và bộ lọc
   */
  async findAll(query: PatientQueryDto) {
    const qb = this.patientRepo
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.user', 'user')
      .where('patient.isActive = true')
      .orderBy('patient.createdAt', 'DESC');

    // Tìm kiếm tổng quát theo Tên, SĐT, Mã BN, CCCD, BHYT, Email
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(patient.fullName ILIKE :search OR patient.phone ILIKE :search OR patient.patientCode ILIKE :search OR patient.idCardNumber ILIKE :search OR patient.insuranceNumber ILIKE :search OR user.email ILIKE :search)',
        { search },
      );
    }

    if (query.gender) {
      qb.andWhere('patient.gender = :gender', { gender: query.gender });
    }

    if (query.bloodType) {
      qb.andWhere('patient.bloodType = :bloodType', { bloodType: query.bloodType });
    }

    return paginate(qb, { page: query.page, limit: query.limit });
  }

  /**
   * Lấy chi tiết hồ sơ bệnh nhân theo ID
   */
  async findById(id: string, currentUser?: User): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { id, isActive: true },
      relations: ['user', 'appointments'],
    });

    if (!patient) {
      throw new NotFoundError('Hồ sơ bệnh nhân không tồn tại');
    }

    // Bảo mật: Bệnh nhân chỉ được xem hồ sơ của chính họ
    if (currentUser && currentUser.role === UserRole.PATIENT && patient.userId !== currentUser.id) {
      throw new ForbiddenError('Bạn chỉ có quyền xem hồ sơ của chính mình');
    }

    return patient;
  }

  /**
   * Lấy hồ sơ của bệnh nhân hiện tại đang đăng nhập
   */
  async findMe(currentUser: User): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { userId: currentUser.id, isActive: true },
      relations: ['user', 'appointments'],
    });

    if (!patient) {
      throw new NotFoundError('Chưa tìm thấy hồ sơ bệnh nhân liên kết với tài khoản này');
    }

    return patient;
  }

  /**
   * Cập nhật hồ sơ bệnh nhân
   * - Bắt lỗi trùng số điện thoại hoặc CCCD nếu có sửa đổi
   */
  async update(id: string, dto: UpdatePatientDto, currentUser?: User): Promise<Patient> {
    return this.manager.transaction(async manager => {
      await manager.findOne(Patient, { where: { id }, lock: { mode: 'pessimistic_write' } });
      return new PatientsService(manager).savePatient(id, dto, currentUser);
    });
  }
  private async savePatient(id: string, dto: UpdatePatientDto, currentUser?: User): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { id, isActive: true } });
    if (!patient) {
      throw new NotFoundError('Hồ sơ bệnh nhân không tồn tại');
    }

    // Bệnh nhân chỉ được cập nhật hồ sơ của chính mình
    if (currentUser && currentUser.role === UserRole.PATIENT && patient.userId !== currentUser.id) {
      throw new ForbiddenError('Bạn chỉ có quyền cập nhật hồ sơ của chính mình');
    }

    // Kiểm tra trùng SĐT nếu có thay đổi
    if (dto.phone) {
      const normalizedPhone = normalizePhoneNumber(dto.phone);
      if (normalizedPhone !== patient.phone) {
        const existingPhone = await this.patientRepo.findOne({
          where: { phone: normalizedPhone, isActive: true },
        });
        if (existingPhone && existingPhone.id !== id) {
          throw new ConflictError(
            `Số điện thoại "${normalizedPhone}" đã được sử dụng bởi bệnh nhân khác`,
          );
        }
        patient.phone = normalizedPhone;

        // Đồng bộ SĐT qua bảng User nếu có liên kết
        if (patient.userId) {
          await this.userRepo.update(patient.userId, { phone: normalizedPhone });
        }
      }
    }

    // Kiểm tra trùng CCCD nếu có thay đổi
    if (dto.idCardNumber && dto.idCardNumber.trim() !== patient.idCardNumber) {
      const idCard = dto.idCardNumber.trim();
      const existingIdCard = await this.patientRepo.findOne({
        where: { idCardNumber: idCard, isActive: true },
      });
      if (existingIdCard && existingIdCard.id !== id) {
        throw new ConflictError(`Số CCCD/CMND "${idCard}" đã tồn tại trong hệ thống`);
      }
      patient.idCardNumber = idCard;
    }

    // Cập nhật các trường còn lại
    if (dto.fullName) {
      patient.fullName = dto.fullName.trim();
      if (patient.userId) {
        await this.userRepo.update(patient.userId, { fullName: patient.fullName });
      }
    }

    if (dto.dateOfBirth) patient.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.gender) patient.gender = dto.gender as Gender;
    if (dto.insuranceNumber !== undefined) patient.insuranceNumber = dto.insuranceNumber;
    if (dto.address !== undefined) patient.address = dto.address;
    if (dto.bloodType !== undefined) patient.bloodType = dto.bloodType as BloodType;
    if (dto.allergies !== undefined) patient.allergies = dto.allergies;
    if (dto.chronicDiseases !== undefined) patient.chronicDiseases = dto.chronicDiseases;
    if (dto.medicalHistory !== undefined) patient.medicalHistory = dto.medicalHistory;
    if (dto.emergencyContactName !== undefined) {
      patient.emergencyContactName = dto.emergencyContactName;
    }
    if (dto.emergencyContactPhone !== undefined) {
      patient.emergencyContactPhone = dto.emergencyContactPhone;
    }

    return this.patientRepo.save(patient);
  }

  /**
   * Xóa hồ sơ bệnh nhân (Soft Delete)
   */
  async delete(id: string): Promise<void> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundError('Hồ sơ bệnh nhân không tồn tại');
    }

    patient.isActive = false;
    await this.patientRepo.save(patient);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Sinh mã định danh bệnh nhân tự động dạng BN-YYYYMM-XXXX
   */
  private async generateUniquePatientCode(): Promise<string> {
    return `BN-${randomBytes(8).toString('hex').toUpperCase()}`;
  }
}
