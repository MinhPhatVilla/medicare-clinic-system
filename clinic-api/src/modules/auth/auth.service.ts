/**
 * @file src/modules/auth/auth.service.ts
 * @description Business logic cho Authentication
 *
 * Kiến trúc: Service layer chứa toàn bộ business logic.
 * Controller chỉ gọi service và trả response — không có logic trong controller.
 * Điều này giúp:
 * - Dễ test (chỉ cần test service, không phụ thuộc HTTP)
 * - Tái sử dụng logic (nhiều controller có thể dùng cùng service)
 * - Tách biệt trách nhiệm rõ ràng (SRP - Single Responsibility Principle)
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../models/User.entity';
import { Patient } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../exceptions/AppError';
import type { LoginDto, RegisterDto } from './auth.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: Omit<User, 'password' | 'refreshToken'>; // Không trả password ra client
  tokens: TokenPair;
}

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);

  /**
   * Đăng ký tài khoản mới
   * - Kiểm tra email trùng lặp
   * - Hash password với bcrypt
   * - Tạo profile liên kết (Patient hoặc Doctor)
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictError('Email đã được sử dụng');
    }

    // Hash password — KHÔNG lưu plain text
    const hashedPassword = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    // Tạo user trong transaction để rollback nếu tạo profile thất bại
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Tạo User
      const user = this.userRepo.create({
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role as UserRole,
      });
      await queryRunner.manager.save(user);

      // Tạo profile tương ứng với role
      if (dto.role === 'PATIENT') {
        const patient = this.patientRepo.create({ userId: user.id });
        await queryRunner.manager.save(patient);
      } else if (dto.role === 'DOCTOR') {
        const doctor = this.doctorRepo.create({
          userId: user.id,
          specialty: 'Đa khoa' as never,
        });
        await queryRunner.manager.save(doctor);
      }

      await queryRunner.commitTransaction();

      // Tạo tokens và trả về
      const tokens = this.generateTokens(user);
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return { user: this.sanitizeUser(user), tokens };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Đăng nhập
   * - Tìm user theo email
   * - So sánh password với hash
   * - Tạo và trả JWT tokens
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user || !user.isActive) {
      // Dùng cùng message để tránh email enumeration attack
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
    }

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  /**
   * Làm mới Access Token bằng Refresh Token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedError('Refresh token đã bị thu hồi');
    }

    // Kiểm tra refresh token có khớp không
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token không hợp lệ');
    }

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Đăng xuất — xóa refresh token trong DB
   */
  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null });
  }

  /**
   * Lấy thông tin user hiện tại
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['patient', 'doctor'],
    });

    if (!user) {
      throw new NotFoundError('Người dùng');
    }

    return user;
  }

  // ---- Private helpers ----

  private generateTokens(user: User): TokenPair {
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    // Hash refresh token trước khi lưu (bảo mật thêm lớp)
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepo.update(userId, { refreshToken: hashedToken });
  }

  private sanitizeUser(user: User): Omit<User, 'password' | 'refreshToken'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, refreshToken: _rt, ...safeUser } = user;
    return safeUser as Omit<User, 'password' | 'refreshToken'>;
  }
}
