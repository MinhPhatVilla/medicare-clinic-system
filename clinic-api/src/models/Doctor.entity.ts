/**
 * @file src/models/Doctor.entity.ts
 * @description Entity Doctor — Thông tin bác sĩ
 *
 * Quan hệ:
 * - Doctor (1) ←→ (1) User
 * - Doctor (1) ←→ (n) DoctorSchedule  ← Lịch làm việc được quản lý qua bảng riêng
 * - Doctor (1) ←→ (n) Appointment
 *
 * Lưu ý kiến trúc:
 * - Lịch làm việc KHÔNG lưu dạng JSON array nữa.
 * - Bảng DoctorSchedule cho phép quản lý từng ngày cụ thể, số slot, nghỉ lễ, v.v.
 *
 * Index:
 * - idx_doctors_user_id:    FK lookup
 * - idx_doctors_specialty:  Tìm kiếm bác sĩ theo chuyên khoa
 * - idx_doctors_available:  Lọc bác sĩ đang hoạt động
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
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { Appointment } from './Appointment.entity';
import { DoctorSchedule } from './DoctorSchedule.entity';

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

  @Index('idx_doctors_user_id')
  @Column({ name: 'user_id' })
  userId: string;

  @Index('idx_doctors_specialty')
  @Column({ type: 'enum', enum: Specialty })
  specialty: Specialty;

  @Column({ length: 20, nullable: true })
  license: string; // Số giấy phép hành nghề

  @Column({ length: 50, nullable: true })
  qualification: string; // Học hàm/học vị (BS, ThS, TS, PGS, GS)

  @Column({ name: 'experience_years', nullable: true })
  experienceYears: number; // Số năm kinh nghiệm

  @Column({ type: 'text', nullable: true })
  bio: string; // Mô tả kinh nghiệm

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 200000,
  })
  consultationFee: number; // Phí khám cơ bản (VND)

  @Column({ name: 'room_number', length: 50, nullable: true })
  roomNumber: string; // Số phòng khám cố định (VD: "Phòng 102", "P.205")

  @Index('idx_doctors_available')
  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number; // Đánh giá 0.00 - 5.00

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number; // Tổng số lượt đánh giá

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  /**
   * Lịch làm việc theo từng ngày — thay thế cho workingDays JSON array cũ.
   * Cho phép quản lý chi tiết: số slot, giờ làm, nghỉ lễ, nghỉ đột xuất.
   */
  @OneToMany(() => DoctorSchedule, (schedule) => schedule.doctor, { cascade: true })
  schedules: DoctorSchedule[];
}
