import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EntityManager } from 'typeorm';
import { z } from 'zod';
import { AppDataSource } from '../../config/database';
import { env } from '../../config/env';
import { User, UserRole } from '../../models/User.entity';
import { Patient, Gender, BloodType } from '../../models/Patient.entity';
import { Doctor, Specialty } from '../../models/Doctor.entity';
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
export type SanitizedUser = Omit<User, 'password' | 'refreshToken'>;
export interface AuthResponse {
  user: SanitizedUser;
  tokens: TokenPair;
}

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async registerPatient(dto: RegisterPatientDto): Promise<AuthResponse> {
    const phone = dto.phone ? normalizePhoneNumber(dto.phone) : undefined;
    const password = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);
    return AppDataSource.transaction(async (manager) => {
      // A phone/ID match is not proof of ownership of an existing medical record.
      const matches = [
        ...(phone ? [{ phone }] : []),
        ...(dto.idCardNumber ? [{ idCardNumber: dto.idCardNumber }] : []),
      ];
      if (matches.length && (await manager.exists(Patient, { where: matches }))) {
        throw new ConflictError('Ho so da ton tai. Vui long lien he le tan de xac minh danh tinh.');
      }
      if (phone && (await manager.exists(User, { where: { phone } }))) {
        throw new ConflictError('So dien thoai da duoc su dung');
      }
      const user = await manager.save(
        User,
        manager.create(User, {
          email: dto.email.toLowerCase().trim(),
          password,
          fullName: dto.fullName.trim(),
          phone,
          role: UserRole.PATIENT,
          isActive: true,
        }),
      );
      user.patient = await manager.save(
        Patient,
        manager.create(Patient, {
          ...dto,
          patientCode: `BN-${randomBytes(8).toString('hex').toUpperCase()}`,
          userId: user.id,
          fullName: user.fullName,
          phone,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender as Gender | undefined,
          bloodType: dto.bloodType as BloodType | undefined,
          isActive: true,
        }),
      );
      return this.issueSession(manager, user);
    });
  }

  /** Internal staff provisioning only; the public route always uses registerPatient. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (dto.role === UserRole.PATIENT) return this.registerPatient(dto);
    const password = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);
    return AppDataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          email: dto.email.toLowerCase().trim(),
          password,
          fullName: dto.fullName.trim(),
          phone: dto.phone ? normalizePhoneNumber(dto.phone) : undefined,
          role: dto.role as UserRole,
          isActive: true,
        }),
      );
      if (user.role === UserRole.DOCTOR) {
        user.doctor = await manager.save(
          Doctor,
          manager.create(Doctor, {
            userId: user.id,
            specialty: Specialty.GENERAL,
          }),
        );
      }
      return this.issueSession(manager, user);
    });
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return AppDataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: dto.email.toLowerCase().trim() })
        .setLock('pessimistic_write')
        .getOne();
      if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.password))) {
        throw new UnauthorizedError('Email hoac mat khau khong chinh xac');
      }
      const session = await this.issueSession(manager, user);
      const profile = await manager.findOneOrFail(User, {
        where: { id: user.id },
        relations: ['patient', 'doctor'],
      });
      return { ...session, user: this.sanitizeUser(profile) };
    });
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenPair> {
    let subject: string;
    try {
      const payload = jwt.verify(dto.refreshToken, env.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      });
      subject = z
        .string()
        .uuid()
        .parse(typeof payload === 'object' ? payload.sub : undefined);
    } catch {
      throw new UnauthorizedError('Refresh token khong hop le hoac da het han');
    }
    return AppDataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.refreshToken')
        .where('user.id = :subject', { subject })
        .setLock('pessimistic_write')
        .getOne();
      const digest = this.tokenDigest(dto.refreshToken);
      if (
        !user?.isActive ||
        !user.refreshToken ||
        user.refreshToken.length !== digest.length ||
        !timingSafeEqual(Buffer.from(user.refreshToken), Buffer.from(digest))
      ) {
        throw new UnauthorizedError('Phien dang nhap da het han. Vui long dang nhap lai.');
      }
      return (await this.issueSession(manager, user)).tokens;
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();
      if (!user) throw new NotFoundError('Tai khoan');
      if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
        throw new BadRequestError('Mat khau hien tai khong chinh xac');
      }
      await manager.update(User, userId, {
        password: await bcrypt.hash(dto.newPassword, env.BCRYPT_ROUNDS),
        refreshToken: null,
      });
    });
  }

  async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['patient', 'doctor'],
    });
    if (!user) throw new NotFoundError('Tai khoan');
    return this.sanitizeUser(user);
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null });
  }

  private async issueSession(manager: EntityManager, user: User): Promise<AuthResponse> {
    const tokens = {
      accessToken: jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      }),
      refreshToken: jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
        algorithm: 'HS256',
        jwtid: randomUUID(),
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      }),
    };
    // JWTs exceed bcrypt's 72-byte limit. Hash all bytes of the high-entropy token.
    await manager.update(User, user.id, { refreshToken: this.tokenDigest(tokens.refreshToken) });
    return { user: this.sanitizeUser(user), tokens };
  }

  private tokenDigest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User): SanitizedUser {
    const safe = { ...user } as Partial<User>;
    delete safe.password;
    delete safe.refreshToken;
    return safe as SanitizedUser;
  }
}
