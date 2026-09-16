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
} from 'typeorm';
import { Appointment } from './Appointment.entity';
import { Examination } from './Examination.entity';
import { Patient } from './Patient.entity';
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
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  INSURANCE = 'INSURANCE',
}

@Entity('invoices')
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

  @Index('idx_invoice_examination_id')
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

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_by_user_id', nullable: true })
  paidByUserId: string; // ID nhân viên thu ngân/tiếp tân xác nhận thu tiền

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
