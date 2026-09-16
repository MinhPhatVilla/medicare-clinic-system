/**
 * @file src/models/Examination.entity.ts
 * @description Entity Examination — Kết quả khám bệnh (EMR - Electronic Medical Record)
 *
 * Lưu trữ đầy đủ thông tin khám bệnh của bác sĩ:
 * - Chỉ số sinh hiệu (vital signs)
 * - Chẩn đoán ICD-10
 * - Đơn thuốc (JSON array)
 * - Chỉ định xét nghiệm
 * - Ghi chú bác sĩ
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from './Appointment.entity';

// Interface cho 1 thuốc trong đơn
export interface PrescriptionItem {
  name: string; // Tên thuốc
  dosage: string; // Liều dùng (VD: "500mg")
  frequency: string; // Tần suất (VD: "3 lần/ngày")
  duration: string; // Thời gian (VD: "7 ngày")
  instruction: string; // Hướng dẫn (VD: "Uống sau ăn")
}

// Interface cho xét nghiệm chỉ định
export interface LabTest {
  testName: string; // Tên xét nghiệm
  testCode: string; // Mã xét nghiệm
  notes: string; // Ghi chú
}

@Entity('examinations')
export class Examination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → appointments (1:1)
  @OneToOne(() => Appointment, (appointment) => appointment.examination)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  // ---- Sinh hiệu (Vital Signs) ----
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number; // kg

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number; // cm

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bmi: number; // Tự tính từ weight/height

  @Column({ name: 'blood_pressure', length: 20, nullable: true })
  bloodPressure: string; // "120/80"

  @Column({ name: 'heart_rate', nullable: true })
  heartRate: number; // bpm

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number; // °C

  @Column({ name: 'spo2', nullable: true })
  spo2: number; // % SpO2

  // ---- Chẩn đoán ----
  @Column({ name: 'icd10_code', length: 20, nullable: true })
  icd10Code: string; // Mã ICD-10, VD: "J06.9"

  @Column({ name: 'diagnosis', type: 'text' })
  diagnosis: string; // Chẩn đoán (text mô tả)

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes: string; // Ghi chú lâm sàng

  // ---- Đơn thuốc ----
  /**
   * prescription: Lưu dưới dạng JSON array của PrescriptionItem
   * Không tạo bảng riêng để đơn giản hóa (phù hợp với quy mô phòng khám nhỏ)
   */
  @Column({ type: 'json', nullable: true })
  prescription: PrescriptionItem[];

  // ---- Xét nghiệm ----
  @Column({ name: 'lab_tests', type: 'json', nullable: true })
  labTests: LabTest[];

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate: Date; // Ngày tái khám

  @Column({ name: 'follow_up_notes', type: 'text', nullable: true })
  followUpNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
