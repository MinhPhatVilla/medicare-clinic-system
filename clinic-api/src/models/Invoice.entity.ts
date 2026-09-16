/**
 * @file src/models/Invoice.entity.ts
 * @description Entity Invoice — Hóa đơn thanh toán
 *
 * Quan hệ: Invoice (1) ←→ (1) Appointment
 * Bao gồm phí khám cơ bản + phí xét nghiệm + phí thuốc
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

export enum InvoiceStatus {
  PENDING = 'PENDING', // Chờ thanh toán
  PAID = 'PAID', // Đã thanh toán
  CANCELLED = 'CANCELLED', // Hủy hóa đơn
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VIET_QR = 'VIET_QR',
  INSURANCE = 'INSURANCE',
}

// Interface cho từng dòng trong hóa đơn
export interface InvoiceLineItem {
  description: string; // Mô tả dịch vụ
  quantity: number;
  unitPrice: number; // VND
  total: number; // VND
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', unique: true, length: 30 })
  invoiceNumber: string; // "HD-20241201-001"

  // FK → appointments (1:1)
  @OneToOne(() => Appointment, (appointment) => appointment.invoice)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  // ---- Chi phí ----
  @Column({ name: 'consultation_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  consultationFee: number; // Phí khám

  @Column({ name: 'lab_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  labFee: number; // Phí xét nghiệm

  @Column({ name: 'medicine_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  medicineFee: number; // Phí thuốc

  @Column({ name: 'insurance_covered', type: 'decimal', precision: 10, scale: 2, default: 0 })
  insuranceCovered: number; // BHYT chi trả

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number; // Tổng tiền bệnh nhân phải trả

  @Column({ type: 'json', nullable: true })
  lineItems: InvoiceLineItem[]; // Chi tiết từng khoản

  // ---- Thanh toán ----
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
