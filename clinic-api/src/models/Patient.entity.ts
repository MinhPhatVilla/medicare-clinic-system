/**
 * @file src/models/Patient.entity.ts
 * @description Entity Patient — Hồ sơ bệnh nhân
 *
 * Quan hệ:
 * - Patient (1) ←→ (1) User
 * - Patient (1) ←→ (n) Appointment
 *
 * Index:
 * - idx_patients_user_id:         FK lookup
 * - idx_patients_insurance_number: Tìm kiếm theo số BHYT
 * - idx_patients_id_card:          Tìm kiếm theo CCCD/CMND
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

export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → bảng users
  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_patients_user_id')
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'blood_type', type: 'enum', enum: BloodType, nullable: true })
  bloodType: BloodType;

  @Column({ type: 'text', nullable: true })
  allergies: string; // Dị ứng thuốc, thực phẩm

  @Column({ name: 'chronic_diseases', type: 'text', nullable: true })
  chronicDiseases: string; // Bệnh mãn tính

  @Index('idx_patients_insurance_number')
  @Column({ name: 'insurance_number', length: 50, nullable: true })
  insuranceNumber: string; // Số BHYT

  @Index('idx_patients_id_card')
  @Column({ name: 'id_card_number', length: 20, nullable: true })
  idCardNumber: string; // CCCD/CMND

  @Column({ name: 'emergency_contact_name', length: 100, nullable: true })
  emergencyContactName: string; // Tên người liên hệ khẩn cấp

  @Column({ name: 'emergency_contact_phone', length: 20, nullable: true })
  emergencyContactPhone: string; // SĐT người liên hệ khẩn cấp

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];
}
