/**
 * @file src/models/Appointment.entity.ts
 * @description Entity Appointment — Lịch hẹn khám bệnh
 *
 * Quan hệ:
 * - Patient (1) ←→ (n) Appointment (n) ←→ (1) Doctor
 * - Appointment (1) ←→ (1) Examination (MedicalRecord)
 * - Appointment (1) ←→ (1) Invoice
 *
 * Index:
 * - idx_appt_doctor_date: Composite — query "bác sĩ X ngày Y có bao nhiêu lịch?"
 * - idx_appt_patient_status: Composite — query "bệnh nhân X có lịch PENDING nào không?"
 * - idx_appt_date: Đơn — query lịch theo ngày (cho tiếp tân)
 * - idx_appt_booking_code: UNIQUE — tra cứu mã phiếu khám
 * - idx_appt_status: Lọc theo trạng thái (dashboard)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Patient } from './Patient.entity';
import { Doctor } from './Doctor.entity';
import { Examination } from './Examination.entity';
import { Invoice } from './Invoice.entity';

export enum AppointmentStatus {
  PENDING = 'PENDING', // Chờ xác nhận
  CONFIRMED = 'CONFIRMED', // Đã xác nhận
  CHECKED_IN = 'CHECKED_IN', // Đã check-in tại phòng khám
  IN_PROGRESS = 'IN_PROGRESS', // Đang khám
  COMPLETED = 'COMPLETED', // Hoàn thành
  CANCELLED = 'CANCELLED', // Đã hủy
  NO_SHOW = 'NO_SHOW', // Không đến
}

export enum AppointmentType {
  ONLINE = 'ONLINE', // Đặt qua website
  WALK_IN = 'WALK_IN', // Đến trực tiếp
  PHONE = 'PHONE', // Đặt qua điện thoại
}

@Index('idx_appt_doctor_date', ['doctorId', 'appointmentDate'])
@Index('idx_appt_patient_status', ['patientId', 'status'])
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mã số phiếu khám (hiển thị với người dùng), ví dụ: "PKB-20241201-001"
  @Index('idx_appt_booking_code', { unique: true })
  @Column({ name: 'booking_code', unique: true, length: 30 })
  bookingCode: string;

  // FK → patients
  @ManyToOne(() => Patient, (patient) => patient.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'patient_id' })
  patientId: string;

  // FK → doctors
  @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Index('idx_appt_date')
  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: Date;

  @Column({ name: 'appointment_time', type: 'time' })
  appointmentTime: string; // "09:00", "10:30", v.v.

  @Index('idx_appt_status')
  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'enum', enum: AppointmentType, default: AppointmentType.ONLINE })
  type: AppointmentType;

  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint: string; // Lý do khám

  @Column({ name: 'priority_number', nullable: true })
  priorityNumber: number; // Số thứ tự tại phòng khám

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string; // QR code data cho check-in

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Examination, (exam) => exam.appointment)
  examination: Examination;

  @OneToOne(() => Invoice, (invoice) => invoice.appointment)
  invoice: Invoice;
}
