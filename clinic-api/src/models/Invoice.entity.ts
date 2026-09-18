/**
 * @file src/models/Invoice.entity.ts
 * @description Entity Invoice — Hóa đơn thanh toán
 *
 * Quan hệ: Invoice (1) ←→ (1) Appointment
 *
 * Tính toán chi phí:
 * - consultation_fee: Phí khám cơ bản từ Doctor.consultationFee
 * - service_fee: Tổng phí CLS từ ServiceOrder.fee
 * - medicine_fee: Tổng phí thuốc từ PrescriptionDetail.total_price
 * - insurance_covered: BHYT chi trả
 * - total_amount = consultation + service + medicine - insurance
 *
 * Index:
 * - idx_invoice_appointment_id: FK lookup 1:1
 * - idx_invoice_number:          Tra cứu số hóa đơn (UNIQUE)
 * - idx_invoice_status:          Lọc hóa đơn chờ thanh toán
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Appointment } from './Appointment.entity';
import { Examination } from './Examination.entity';
import { Patient } from './Patient.entity';
import { User } from './User.entity';
import { decimalTransformer } from '../utils/transformers';

export enum InvoiceStatus {
  PENDING = 'PENDING', // Chờ thanh toán
  PAID = 'PAID', // Đã thanh toán
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Thanh toán một phần
  CANCELLED = 'CANCELLED', // Hủy hóa đơn
  REFUNDED = 'REFUNDED', // Đã hoàn tiền
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VIET_QR = 'VIET_QR',
  POS_CARD = 'POS_CARD',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  INSURANCE = 'INSURANCE',
}

@Check(
  'chk_invoice_amounts_non_negative',
  '"consultation_fee" >= 0 AND "service_fee" >= 0 AND "medicine_fee" >= 0 AND "insurance_covered" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0',
)
@Check(
  'chk_invoice_deductions_not_exceed_subtotal',
  '"insurance_covered" + "discount_amount" <= "consultation_fee" + "service_fee" + "medicine_fee"',
)
@Check('chk_invoice_prepaid_amount', '"prepaid_amount" >= 0 AND "prepaid_amount" <= "total_amount"')
@Check(
  'chk_invoice_discharge_requires_payment',
  '"discharged_at" IS NULL OR ("status" = \'PAID\' AND "discharged_by_user_id" IS NOT NULL)',
)
@Check(
  'chk_invoice_total_matches_components',
  '"total_amount" = "consultation_fee" + "service_fee" + "medicine_fee" - "insurance_covered" - "discount_amount"',
)
@Check(
  'chk_invoice_paid_requires_payment_metadata',
  '"status" <> \'PAID\' OR ("payment_method" IS NOT NULL AND "paid_at" IS NOT NULL AND "paid_by_user_id" IS NOT NULL AND "transaction_code" IS NOT NULL)',
)
@Entity('invoices')
@Index('idx_invoices_paid_at', ['paidAt'], { where: "status = 'PAID'" })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_invoice_number', { unique: true })
  @Column({ name: 'invoice_number', unique: true, length: 30 })
  invoiceNumber: string; // "HD-20241201-001"

  // FK → appointments (1:1)
  @OneToOne(() => Appointment, (appointment) => appointment.invoice)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Index('idx_invoice_appointment_id', { unique: true })
  @Column({ name: 'appointment_id' })
  appointmentId: string;

  // FK → examinations (Phiếu khám / Hồ sơ bệnh án)
  @ManyToOne(() => Examination, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'examination_id' })
  examination: Examination;

  @Index('idx_invoice_examination_id', { unique: true })
  @Column({ name: 'examination_id', nullable: true })
  examinationId: string;

  // FK → patients (Bệnh nhân)
  @ManyToOne(() => Patient, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Index('idx_invoice_patient_id')
  @Column({ name: 'patient_id', nullable: true })
  patientId: string;

  // ---- Chi phí (Đồng nhất kiểu decimal(12, 2) với transformer số) ----
  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  consultationFee: number; // Phí khám

  @Column({
    name: 'service_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  serviceFee: number; // Phí CLS (xét nghiệm, siêu âm, ...)

  @Column({
    name: 'medicine_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  medicineFee: number; // Phí thuốc

  @Column({
    name: 'insurance_covered',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  insuranceCovered: number; // BHYT chi trả

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discountAmount: number; // Giảm giá (nếu có)

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalAmount: number; // Tổng tiền bệnh nhân phải trả

  @Column({
    name: 'prepaid_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  prepaidAmount: number; // Tiền CLS đã thu trước, trừ khi quyết toán cuối ca khám

  // ---- Thanh toán ----
  @Index('idx_invoice_status')
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Index('idx_invoice_transaction_code', { unique: true })
  @Column({ name: 'transaction_code', unique: true, length: 40, nullable: true })
  transactionCode: string;

  @Column({ name: 'payment_reference', length: 100, nullable: true })
  paymentReference: string; // Mã tham chiếu từ QR/POS/ngân hàng nếu có

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_by_user_id', nullable: true })
  paidByUserId: string; // ID nhân viên thu ngân/tiếp tân xác nhận thu tiền

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paid_by_user_id' })
  paidBy: User;

  @Column({ name: 'discharged_at', type: 'timestamp', nullable: true })
  dischargedAt: Date;

  @Column({ name: 'discharged_by_user_id', type: 'uuid', nullable: true })
  dischargedByUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'discharged_by_user_id' })
  dischargedBy: User;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
