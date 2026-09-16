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

  @Column({ name: 'medicine_name', length: 200 })
  medicineName: string; // VD: "Paracetamol 500mg"

  @Index('idx_rxd_medicine_code')
  @Column({ name: 'medicine_code', length: 30, nullable: true })
  medicineCode: string; // Mã thuốc trong hệ thống (nếu có kho thuốc)

  @Column({ length: 50, nullable: true })
  dosage: string; // Hàm lượng (VD: "500mg", "250mg/5ml")

  @Column({ name: 'route_of_administration', length: 50, nullable: true })
  routeOfAdministration: string; // Đường dùng (VD: "Uống", "Tiêm bắp", "Bôi ngoài da")

  @Column({ length: 100 })
  frequency: string; // Tần suất (VD: "3 lần/ngày", "Sáng 1 viên - Trưa 1 viên - Tối 1 viên")

  @Column({ length: 50 })
  duration: string; // Thời gian dùng (VD: "7 ngày", "2 tuần")

  @Column({ type: 'int' })
  quantity: number; // Số lượng cấp phát

  @Column({ type: 'enum', enum: MedicineUnit, default: MedicineUnit.TABLET })
  unit: MedicineUnit; // Đơn vị tính

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number; // Đơn giá (VND/đơn vị)

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number; // Thành tiền = quantity × unit_price

  @Column({ type: 'text', nullable: true })
  instruction: string; // Hướng dẫn cụ thể (VD: "Uống sau ăn 30 phút", "Không dùng khi lái xe")

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú thêm của bác sĩ

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
