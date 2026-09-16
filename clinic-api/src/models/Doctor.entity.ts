/**
 * @file src/models/Doctor.entity.ts
 * @description Entity Doctor — Thông tin bác sĩ và lịch làm việc
 *
 * Quan hệ: Doctor (1) ←→ (1) User | Doctor (1) ←→ (n) Appointment
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User.entity';
import { Appointment } from './Appointment.entity';

export enum Specialty {
  GENERAL = 'Đa khoa',
  PEDIATRICS = 'Nhi khoa',
  CARDIOLOGY = 'Tim mạch',
  DERMATOLOGY = 'Da liễu',
  ORTHOPEDICS = 'Xương khớp',
  ENT = 'Tai mũi họng',
  OPHTHALMOLOGY = 'Mắt',
  NEUROLOGY = 'Thần kinh',
  OBSTETRICS = 'Sản phụ khoa',
  DENTISTRY = 'Nha khoa',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → bảng users
  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: Specialty })
  specialty: Specialty;

  @Column({ length: 20, nullable: true })
  license: string; // Số giấy phép hành nghề

  @Column({ length: 50, nullable: true })
  qualification: string; // Học hàm/học vị (BS, ThS, TS, PGS, GS)

  @Column({ type: 'text', nullable: true })
  bio: string; // Mô tả kinh nghiệm

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ name: 'consultation_fee', type: 'decimal', precision: 10, scale: 2, default: 200000 })
  consultationFee: number; // Phí khám cơ bản (VND)

  /**
   * workingDays: Lưu dưới dạng JSON array
   * Ví dụ: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
   */
  @Column({ name: 'working_days', type: 'json', nullable: true })
  workingDays: string[];

  @Column({ name: 'working_hours_start', type: 'time', nullable: true })
  workingHoursStart: string; // "08:00"

  @Column({ name: 'working_hours_end', type: 'time', nullable: true })
  workingHoursEnd: string; // "17:00"

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number; // Đánh giá 0.00 - 5.00

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];
}
