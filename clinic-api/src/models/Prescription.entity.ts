/**
 * @file src/models/Prescription.entity.ts
 * @description Entity Prescription — Đơn thuốc
 *
 * Đây là bảng "đầu đơn thuốc" — thay thế cho prescription JSON array cũ.
 * Chi tiết từng loại thuốc được lưu trong bảng PrescriptionDetail.
 *
 * Quan hệ:
 * - Prescription (1) ←→ (1) Examination
 * - Prescription (1) ←→ (n) PrescriptionDetail
 *
 * Index:
 * - idx_rx_examination_id:   FK lookup 1:1
 * - idx_rx_code:             Tra cứu mã đơn thuốc (UNIQUE)
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
import { Examination } from './Examination.entity';
import { PrescriptionDetail } from './PrescriptionDetail.entity';
import { decimalTransformer } from '../utils/transformers';

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Mã đơn thuốc (tạo tự động, UNIQUE)
   * Format: "DT-YYYYMMDD-NNN", VD: "DT-20241201-001"
   */
  @Index('idx_rx_code', { unique: true })
  @Column({ name: 'prescription_code', unique: true, length: 30 })
  prescriptionCode: string;

  // FK → examinations (1:1)
  @OneToOne(() => Examination, (exam) => exam.prescription)
  @JoinColumn({ name: 'examination_id' })
  examination: Examination;

  @Index('idx_rx_examination_id', { unique: true })
  @Column({ name: 'examination_id' })
  examinationId: string;

  @Column({ name: 'diagnosis_summary', type: 'text', nullable: true })
  diagnosisSummary: string; // Tóm tắt chẩn đoán trên đơn thuốc

  @Column({ name: 'dispensing_notes', type: 'text', nullable: true })
  dispensingNotes: string; // Hướng dẫn chung (VD: "Uống nhiều nước", "Tránh ánh sáng")

  @Column({ name: 'issued_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date; // Thời điểm kê đơn

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date; // Đơn thuốc có hiệu lực đến ngày (thường 30 ngày)

  @Column({
    name: 'total_medicine_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalMedicineFee: number; // Tổng tiền thuốc (auto sum từ PrescriptionDetail)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => PrescriptionDetail, (detail) => detail.prescription, { cascade: true })
  details: PrescriptionDetail[];
}
