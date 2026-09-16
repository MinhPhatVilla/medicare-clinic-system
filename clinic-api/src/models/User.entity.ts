/**
 * @file src/models/User.entity.ts
 * @description Entity User — Bảng tài khoản đăng nhập chung cho tất cả role
 *
 * Kiến trúc: Một bảng User duy nhất chứa thông tin xác thực.
 * Thông tin chi tiết (bệnh nhân, bác sĩ) được lưu ở bảng riêng liên kết qua FK.
 * Đây là pattern "Single Table Auth" — phổ biến và dễ quản lý phân quyền.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Patient } from './Patient.entity';
import { Doctor } from './Doctor.entity';

// Enum định nghĩa 4 vai trò trong hệ thống
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string; // Lưu bcrypt hash, KHÔNG lưu plain text

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

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
