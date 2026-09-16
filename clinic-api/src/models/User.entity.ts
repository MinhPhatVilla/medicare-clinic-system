/**
 * @file src/models/User.entity.ts
 * @description Entity User — Bảng tài khoản đăng nhập chung cho tất cả role
 *
 * Kiến trúc: Single Table Auth Pattern
 * - Một bảng User duy nhất chứa thông tin xác thực.
 * - Thông tin chi tiết (bệnh nhân, bác sĩ) được lưu ở bảng riêng liên kết qua FK.
 *
 * Index:
 * - idx_users_email: UNIQUE index (đã có qua @Column({ unique: true }))
 * - idx_users_phone: Query theo số điện thoại (tìm kiếm bệnh nhân)
 * - idx_users_role:  Lọc danh sách theo vai trò
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Patient } from './Patient.entity';
import { Doctor } from './Doctor.entity';

// Enum định nghĩa 5 vai trò trong hệ thống
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  CASHIER = 'CASHIER',
  ADMIN = 'ADMIN',
}

@Index('idx_users_role', ['role'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_users_email', { unique: true })
  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string; // Lưu bcrypt hash, KHÔNG lưu plain text

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Index('idx_users_phone')
  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null; // Lưu hash của refresh token

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Patient, (patient) => patient.user)
  patient: Patient;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor: Doctor;
}
