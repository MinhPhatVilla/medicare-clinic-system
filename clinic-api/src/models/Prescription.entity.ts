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
  ManyToOne,
  Check,
} from 'typeorm';
import { Invoice } from './Invoice.entity';
import { User } from './User.entity';
import { Examination } from './Examination.entity';
import { PrescriptionDetail } from './PrescriptionDetail.entity';
import { decimalTransformer } from '../utils/transformers';

export enum PrescriptionPaymentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PrescriptionDispensingStatus {
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  READY_TO_PREPARE = 'READY_TO_PREPARE',
  PREPARING = 'PREPARING',
  READY_TO_DISPENSE = 'READY_TO_DISPENSE',
  DISPENSED = 'DISPENSED',
  CANCELLED = 'CANCELLED',
}

@Check(
  'chk_rx_paid_metadata',
  '"payment_status" <> \'PAID\' OR ("paid_invoice_id" IS NOT NULL AND "payment_confirmed_at" IS NOT NULL AND "pharmacy_notified_at" IS NOT NULL)',
)
@Check(
  'chk_rx_dispensing_requires_payment',
  "\"dispensing_status\" IN ('WAITING_PAYMENT', 'CANCELLED') OR \"payment_status\" = 'PAID'",
)
@Check(
  'chk_rx_dispensed_metadata',
  '"dispensing_status" <> \'DISPENSED\' OR ("dispensed_at" IS NOT NULL AND "dispensed_by_user_id" IS NOT NULL)',
)
@Entity('prescriptions')
@Index('idx_prescriptions_dispensed_at', ['dispensedAt'], {
  where: "dispensing_status = 'DISPENSED' AND payment_status = 'PAID'",
})
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

  @Index('idx_rx_payment_status')
  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PrescriptionPaymentStatus,
    default: PrescriptionPaymentStatus.PENDING_PAYMENT,
  })
  paymentStatus: PrescriptionPaymentStatus;

  @Index('idx_rx_dispensing_status')
  @Column({
    name: 'dispensing_status',
    type: 'enum',
    enum: PrescriptionDispensingStatus,
    default: PrescriptionDispensingStatus.WAITING_PAYMENT,
  })
  dispensingStatus: PrescriptionDispensingStatus;

  @Index('idx_rx_paid_invoice_id')
  @Column({ name: 'paid_invoice_id', type: 'uuid', nullable: true })
  paidInvoiceId: string;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paid_invoice_id' })
  paidInvoice: Invoice;

  @Column({ name: 'payment_confirmed_at', type: 'timestamp', nullable: true })
  paymentConfirmedAt: Date;

  @Column({ name: 'pharmacy_notified_at', type: 'timestamp', nullable: true })
  pharmacyNotifiedAt: Date;

  @Column({ name: 'dispensed_at', type: 'timestamp', nullable: true })
  dispensedAt: Date;

  @Column({ name: 'dispensed_by_user_id', type: 'uuid', nullable: true })
  dispensedByUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dispensed_by_user_id' })
  dispensedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => PrescriptionDetail, (detail) => detail.prescription, { cascade: true })
  details: PrescriptionDetail[];
}
