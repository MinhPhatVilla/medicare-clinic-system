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
  JoinColumn,
  Index,
} from 'typeorm';
import { Appointment } from './Appointment.entity';

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

  // ---- Chi phí ----
  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  consultationFee: number; // Phí khám

  @Column({
    name: 'service_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  serviceFee: number; // Phí CLS (xét nghiệm, siêu âm, ...)

  @Column({
    name: 'medicine_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  medicineFee: number; // Phí thuốc

  @Column({
    name: 'insurance_covered',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  insuranceCovered: number; // BHYT chi trả

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number; // Giảm giá (nếu có)

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
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
  paidByUserId: string; // ID tiếp tân xác nhận thu tiền

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
