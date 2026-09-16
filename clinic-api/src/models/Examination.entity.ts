/**
 * @file src/models/Examination.entity.ts
 * @description Entity Examination — Phiếu khám bệnh / Hồ sơ bệnh án (Medical Record)
 *
 * Quan hệ:
 * - Examination (1) ←→ (1) Appointment
 * - Examination (1) ←→ (n) ServiceOrder  ← Chỉ định CLS (xét nghiệm, siêu âm, X-quang)
 * - Examination (1) ←→ (1) Prescription  ← Đơn thuốc (tách bảng riêng)
 *
 * Thay đổi so với phiên bản cũ:
 * - Xóa: prescription JSON array → thay bằng bảng Prescription + PrescriptionDetail
 * - Xóa: labTests JSON array     → thay bằng bảng ServiceOrder
 * - Thêm: các thông tin lâm sàng chi tiết hơn
 *
 * Index:
 * - idx_exam_appointment_id: FK lookup 1:1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Appointment } from './Appointment.entity';
import { ServiceOrder } from './ServiceOrder.entity';
import { Prescription } from './Prescription.entity';

@Entity('examinations')
export class Examination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → appointments (1:1)
  @OneToOne(() => Appointment, (appointment) => appointment.examination)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Index('idx_exam_appointment_id', { unique: true })
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
  bloodPressure: string; // "120/80 mmHg"

  @Column({ name: 'heart_rate', nullable: true })
  heartRate: number; // bpm

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number; // °C

  @Column({ name: 'spo2', nullable: true })
  spo2: number; // % SpO2

  @Column({ name: 'respiratory_rate', nullable: true })
  respiratoryRate: number; // nhịp thở/phút

  // ---- Triệu chứng & Tiền sử ----
  @Column({ name: 'chief_complaint_detail', type: 'text', nullable: true })
  chiefComplaintDetail: string; // Triệu chứng chi tiết (ghi nhận tại buổi khám)

  @Column({ name: 'medical_history', type: 'text', nullable: true })
  medicalHistory: string; // Tiền sử bệnh tật liên quan

  // ---- Chẩn đoán ----
  @Column({ name: 'icd10_code', length: 20, nullable: true })
  icd10Code: string; // Mã ICD-10, VD: "J06.9"

  @Column({ name: 'icd10_description', type: 'text', nullable: true })
  icd10Description: string; // Mô tả ICD-10 bằng tiếng Việt

  @Column({ name: 'diagnosis', type: 'text' })
  diagnosis: string; // Chẩn đoán (text mô tả)

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes: string; // Ghi chú lâm sàng

  @Column({ name: 'treatment_plan', type: 'text', nullable: true })
  treatmentPlan: string; // Phác đồ điều trị

  // ---- Tái khám ----
  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate: Date; // Ngày tái khám

  @Column({ name: 'follow_up_notes', type: 'text', nullable: true })
  followUpNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  /**
   * Các chỉ định cận lâm sàng (xét nghiệm, siêu âm, X-quang)
   * Thay thế cho labTests JSON array cũ.
   */
  @OneToMany(() => ServiceOrder, (so) => so.examination, { cascade: true })
  serviceOrders: ServiceOrder[];

  /**
   * Đơn thuốc duy nhất của phiếu khám này.
   * Thay thế cho prescription JSON array cũ.
   */
  @OneToOne(() => Prescription, (p) => p.examination, { cascade: true })
  prescription: Prescription;
}
