/**
 * @file src/modules/auth/auth.service.ts
 * @description Business logic cho Authentication và Phân quyền (RBAC)
 *
 * Kiến trúc: Service layer chứa toàn bộ business logic.
 * Controller chỉ gọi service và trả response — không có logic trong controller.
 * - Mã hóa mật khẩu với bcrypt
 * - Cấp phát và xác thực JWT token (Access Token & Refresh Token)
 * - Triển khai cơ chế xoay vòng Refresh Token (Token Rotation)
 * - Tự động tạo hồ sơ bệnh nhân trong database transaction
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../models/User.entity';
import { Patient, Gender, BloodType } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { env } from '../../config/env';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../exceptions/AppError';
import { normalizePhoneNumber } from '../../utils/phone.util';
import type {
  LoginDto,
  RegisterDto,
  RegisterPatientDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient | null;
  doctor?: Doctor | null;
}

export interface AuthResponse {
  user: SanitizedUser;
  tokens: TokenPair;
}

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);

  /**
   * Đăng ký tài khoản cho bệnh nhân (PATIENT)
   * - Kiểm tra tính duy nhất của email
   * - Mã hóa mật khẩu với bcrypt
   * - Tạo tài khoản User và hồ sơ Patient tương ứng trong 1 Transaction an toàn
   * - Cấp phát bộ JWT token
   */
  async registerPatient(dto: RegisterPatientDto): Promise<AuthResponse> {
    const normalizedPhone = dto.phone ? normalizePhoneNumber(dto.phone) : undefined;

    // Kiểm tra tính duy nhất của email và số điện thoại
    const existingUserByEmail = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUserByEmail) {
      throw new ConflictError('Email này đã được đăng ký trong hệ thống');
    }

    if (normalizedPhone) {
      const existingUserByPhone = await this.userRepo.findOne({
        where: { phone: normalizedPhone },
      });
      if (existingUserByPhone) {
        throw new ConflictError('Số điện thoại này đã được sử dụng cho một tài khoản khác');
      }
    }

    // Mã hóa mật khẩu với bcrypt
    const hashedPassword = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    // Mở transaction đảm bảo tính toàn vẹn (tạo User + tạo/liên kết Patient)
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Tạo User tài khoản bệnh nhân
      const user = queryRunner.manager.create(User, {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: dto.fullName.trim(),
        phone: normalizedPhone,
        role: UserRole.PATIENT,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);

      // 2. Kiểm tra xem đã có hồ sơ Patient tạo trước tại quầy (trùng SĐT hoặc CCCD) chưa
      let patient: Patient | null = null;
      if (normalizedPhone) {
        patient = await queryRunner.manager.findOne(Patient, {
          where: { phone: normalizedPhone, isActive: true },
        });
      }
      if (!patient && dto.idCardNumber) {
        patient = await queryRunner.manager.findOne(Patient, {
          where: { idCardNumber: dto.idCardNumber.trim(), isActive: true },
        });
      }

      if (patient) {
        // Nếu hồ sơ đã liên kết với tài khoản khác -> báo lỗi
        if (patient.userId) {
          throw new ConflictError('Hồ sơ bệnh nhân này đã được liên kết với một tài khoản khác');
        }
        // Tự động liên kết tài khoản Auth mới với hồ sơ Patient đã có sẵn
        patient.userId = savedUser.id;
        if (!patient.fullName) patient.fullName = savedUser.fullName;
        if (!patient.phone && normalizedPhone) patient.phone = normalizedPhone;
        if (dto.dateOfBirth && !patient.dateOfBirth)
          patient.dateOfBirth = new Date(dto.dateOfBirth);
        if (dto.gender && !patient.gender) patient.gender = dto.gender as Gender;
        if (dto.address && !patient.address) patient.address = dto.address;
        if (dto.bloodType && !patient.bloodType) patient.bloodType = dto.bloodType as BloodType;
        if (dto.allergies && !patient.allergies) patient.allergies = dto.allergies;
        if (dto.chronicDiseases && !patient.chronicDiseases)
          patient.chronicDiseases = dto.chronicDiseases;
        if (dto.insuranceNumber && !patient.insuranceNumber)
          patient.insuranceNumber = dto.insuranceNumber;
        if (dto.idCardNumber && !patient.idCardNumber) patient.idCardNumber = dto.idCardNumber;

        await queryRunner.manager.save(patient);
      } else {
        // Chưa có hồ sơ -> Tạo hồ sơ Patient mới
        const patientCode = await this.generateUniquePatientCode();
        const newPatient = queryRunner.manager.create(Patient, {
          patientCode,
          userId: savedUser.id,
          fullName: savedUser.fullName,
          phone: normalizedPhone,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender as Gender | undefined,
          address: dto.address,
          bloodType: dto.bloodType as BloodType | undefined,
          allergies: dto.allergies,
          chronicDiseases: dto.chronicDiseases,
          insuranceNumber: dto.insuranceNumber,
          idCardNumber: dto.idCardNumber,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          isActive: true,
        });
        patient = await queryRunner.manager.save(newPatient);
      }

      await queryRunner.commitTransaction();

      // Tạo cặp token JWT
      const tokens = this.generateTokens(savedUser);
      await this.saveRefreshToken(savedUser.id, tokens.refreshToken);

      savedUser.patient = patient;
      return {
        user: this.sanitizeUser(savedUser),
        tokens,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Đăng ký tài khoản (tổng quát, hỗ trợ đăng ký theo vai trò)
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const role = (dto.role || UserRole.PATIENT) as UserRole;
    if (role === UserRole.PATIENT) {
      return this.registerPatient(dto);
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictError('Email này đã được đăng ký trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: dto.fullName.trim(),
        phone: dto.phone,
        role: role as UserRole,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);

      if (role === UserRole.DOCTOR) {
        const doctor = queryRunner.manager.create(Doctor, {
          userId: savedUser.id,
          specialty: 'Đa khoa' as never,
        });
        await queryRunner.manager.save(doctor);
      }

      await queryRunner.commitTransaction();

      const tokens = this.generateTokens(savedUser);
      await this.saveRefreshToken(savedUser.id, tokens.refreshToken);

      return {
        user: this.sanitizeUser(savedUser),
        tokens,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Đăng nhập
   * - Tìm kiếm tài khoản theo email
   * - Kiểm tra trạng thái hoạt động (isActive)
   * - Xác thực mật khẩu với bcrypt.compare
   * - Cấp phát bộ token và lưu hashed refresh token vào DB
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['patient', 'doctor'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Làm mới Access Token (Token Rotation)
   * - Giải mã và kiểm tra chữ ký Refresh Token
   * - So khớp bản băm trong cơ sở dữ liệu
   * - Cấp mới cả Access Token và Refresh Token để tăng cường bảo mật
   */
  async refreshToken(dto: RefreshTokenDto): Promise<TokenPair> {
    const { refreshToken } = dto;
    let payload: { sub: string };

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.refreshToken) {
      throw new UnauthorizedError('Phiên đăng nhập đã hết hạn hoặc bị thu hồi');
    }

    // Kiểm tra tính hợp lệ của Refresh Token với bản băm lưu trong DB
    const isTokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenMatch) {
      // Phát hiện token không khớp (có thể đã bị can thiệp) -> thu hồi ngay
      await this.userRepo.update(user.id, { refreshToken: null });
      throw new UnauthorizedError('Refresh token không hợp lệ');
    }

    // Cấp phát cặp token mới (Token Rotation)
    const newTokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  /**
   * Đổi mật khẩu
   * - Xác thực mật khẩu hiện tại
   * - Mã hóa mật khẩu mới với bcrypt
   * - Thu hồi refresh token hiện tại để người dùng đăng nhập lại an toàn
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Tài khoản người dùng');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestError('Mật khẩu hiện tại không chính xác');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, env.BCRYPT_ROUNDS);

    // Cập nhật mật khẩu mới và vô hiệu hóa refresh token cũ
    await this.userRepo.update(userId, {
      password: newHashedPassword,
      refreshToken: null,
    });
  }

  /**
   * Lấy thông tin cá nhân (Profile) của người dùng hiện tại
   */
  async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['patient', 'doctor'],
    });

    if (!user) {
      throw new NotFoundError('Người dùng không tồn tại');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Đăng xuất — Xóa refresh token trong cơ sở dữ liệu
   */
  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null });
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Sinh bộ JWT Tokens (Access Token & Refresh Token)
   */
  private generateTokens(user: User): TokenPair {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  /**
   * Lưu hash của Refresh Token vào Database để bảo mật
   */
  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepo.update(userId, { refreshToken: hashedToken });
  }

  /**
   * Sinh mã định danh bệnh nhân tự động dạng BN-YYYYMM-XXXX
   */
  private async generateUniquePatientCode(): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    for (let attempts = 0; attempts < 10; attempts++) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `BN-${yearMonth}-${randomNum}`;
      const existing = await this.patientRepo.findOne({ where: { patientCode: code } });
      if (!existing) {
        return code;
      }
    }

    return `BN-${yearMonth}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Loại bỏ các trường nhạy cảm trước khi trả về client
   */
  private sanitizeUser(user: User): SanitizedUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;
    return safeUser as SanitizedUser;
  }
}
