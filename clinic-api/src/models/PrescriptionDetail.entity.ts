/**
 * @file src/models/PrescriptionDetail.entity.ts
 * @description Entity PrescriptionDetail — Chi tiết từng loại thuốc trong đơn
 *
 * Quan hệ:
 * - PrescriptionDetail (n) ←→ (1) Prescription
 *
 * Index:
 * - idx_rxd_prescription_id: FK lookup (lấy tất cả thuốc trong 1 đơn)
 * - idx_rxd_medicine_code:   Thống kê thuốc được kê nhiều nhất
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Prescription } from './Prescription.entity';

export enum MedicineUnit {
  TABLET = 'viên', // Viên nén, viên nang
  CAPSULE = 'nang', // Viên nang mềm
  SACHET = 'gói', // Thuốc bột/cốm gói
  BOTTLE = 'chai', // Dung dịch uống
  TUBE = 'tuýp', // Kem bôi
  VIAL = 'lọ', // Lọ tiêm
  AMPOULE = 'ống', // Ống tiêm
  ML = 'ml', // Đơn vị thể tích
  MG = 'mg', // Đơn vị khối lượng
}

@Entity('prescription_details')
export class PrescriptionDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → prescriptions
  @ManyToOne(() => Prescription, (rx) => rx.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Index('idx_rxd_prescription_id')
  @Column({ name: 'prescription_id' })
  prescriptionId: string;

  @Index('idx_rxd_medicine_id')
  @Column({ name: 'medicine_id', nullable: true })
  medicineId: string; // FK liên kết tới danh mục thuốc (nếu có)

  @Column({ name: 'medicine_name', length: 200 })
  medicineName: string; // VD: "Omeprazol 20mg", "Paracetamol 500mg"

  @Index('idx_rxd_medicine_code')
  @Column({ name: 'medicine_code', length: 30, nullable: true })
  medicineCode: string; // Mã thuốc trong hệ thống

  @Column({ name: 'active_ingredient', length: 255, nullable: true })
  activeIngredient: string; // Hoạt chất chính (VD: "Omeprazole", "Paracetamol")

  @Column({ length: 50, nullable: true })
  dosage: string; // Hàm lượng (VD: "20mg", "500mg")

  @Column({ name: 'route_of_administration', length: 50, default: 'Uống' })
  routeOfAdministration: string; // Đường dùng: "Uống", "Bôi ngoài da", "Nhỏ mắt", "Tiêm"

  // Liều dùng chi tiết từng buổi trong ngày
  @Column({ name: 'morning_dose', type: 'decimal', precision: 5, scale: 2, default: 0 })
  morningDose: number; // Sáng

  @Column({ name: 'noon_dose', type: 'decimal', precision: 5, scale: 2, default: 0 })
  noonDose: number; // Trưa

  @Column({ name: 'afternoon_dose', type: 'decimal', precision: 5, scale: 2, default: 0 })
  afternoonDose: number; // Chiều

  @Column({ name: 'evening_dose', type: 'decimal', precision: 5, scale: 2, default: 0 })
  eveningDose: number; // Tối

  @Column({ length: 100, nullable: true })
  frequency: string; // Tần suất (VD: "Ngày 2 lần (Sáng 1 - Tối 1)")

  @Column({ length: 50, default: '7 ngày' })
  duration: string; // Thời gian dùng (VD: "7 ngày", "14 ngày")

  @Column({ type: 'int' })
  quantity: number; // Tổng số lượng cấp phát

  @Column({ type: 'enum', enum: MedicineUnit, default: MedicineUnit.TABLET })
  unit: MedicineUnit; // Đơn vị tính: viên, gói, chai...

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number; // Đơn giá (VND/đơn vị)

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number; // Thành tiền = quantity × unit_price

  @Column({ name: 'usage_instructions', type: 'text', nullable: true })
  usageInstructions: string; // Cách dùng (VD: "Uống trước ăn 30 phút", "Uống sau ăn no")

  @Column({ type: 'text', nullable: true })
  instruction: string; // Hướng dẫn cụ thể thêm

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú thêm của bác sĩ

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
