/**
 * @file src/models/ServiceOrder.entity.ts
 * @description Entity ServiceOrder — Chỉ định Cận Lâm Sàng (CLS)
 *
 * Đây là bảng tách ra từ labTests JSON array trong Examination cũ.
 * Mỗi chỉ định là 1 row riêng, cho phép:
 * - Theo dõi trạng thái từng xét nghiệm độc lập
 * - Nhập kết quả từng mục riêng biệt
 * - Tính phí CLS chính xác từng dịch vụ
 *
 * Quan hệ:
 * - ServiceOrder (n) ←→ (1) Examination
 *
 * Index:
 * - idx_so_examination_id: FK lookup (lấy tất cả CLS của 1 phiếu khám)
 * - idx_so_status:         Lọc CLS chưa có kết quả
 * - idx_so_service_code:   Thống kê số lần dùng từng loại xét nghiệm
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Examination } from './Examination.entity';

export enum ServiceType {
  LAB_TEST = 'LAB_TEST', // Xét nghiệm máu, nước tiểu, v.v.
  IMAGING = 'IMAGING', // Siêu âm, X-quang, CT, MRI
  ECG = 'ECG', // Điện tâm đồ
  ENDOSCOPY = 'ENDOSCOPY', // Nội soi
  OTHER = 'OTHER', // Dịch vụ khác
}

export enum ServiceOrderStatus {
  ORDERED = 'ORDERED', // Đã chỉ định, chờ thu tiền / thực hiện
  PAID = 'PAID', // Đã thu tiền (theo yêu cầu)
  IN_PROGRESS = 'IN_PROGRESS', // Đang làm xét nghiệm
  COMPLETED = 'COMPLETED', // Có kết quả
  CANCELLED = 'CANCELLED', // Hủy chỉ định
}

@Entity('service_orders')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_so_order_number', { unique: true })
  @Column({ name: 'order_number', length: 40, nullable: true })
  orderNumber: string; // VD: "CLS-20260916-A1B2"

  // FK → examinations
  @ManyToOne(() => Examination, (exam) => exam.serviceOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examination_id' })
  examination: Examination;

  @Index('idx_so_examination_id')
  @Column({ name: 'examination_id' })
  examinationId: string;

  // FK → medical_services (Tùy chọn nếu chọn từ Service Catalog)
  @ManyToOne('MedicalService', 'orders', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'service_id' })
  service: any;

  @Index('idx_so_service_id')
  @Column({ name: 'service_id', nullable: true })
  serviceId: string;

  @Column({ name: 'service_name', length: 200 })
  serviceName: string; // VD: "Xét nghiệm máu tổng quát CBC"

  @Index('idx_so_service_code')
  @Column({ name: 'service_code', length: 30, nullable: true })
  serviceCode: string; // VD: "XN001", "SA001"

  @Column({ name: 'service_type', type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  /**
   * result: Kết quả xét nghiệm tổng quan (text mô tả hoặc tóm tắt)
   * VD: "Hồng cầu: 4.5 M/μL (BT: 4.2-5.4)\nBạch cầu: 7.2 K/μL (BT: 4.5-11.0)"
   */
  @Column({ type: 'text', nullable: true })
  result: string;

  /**
   * indicators: Giá trị chỉ số chi tiết kèm khoảng tham chiếu bình thường/bất thường
   * Mảng JSON: [{ name: string, value: string, unit?: string, normalRange?: string, isAbnormal: boolean }]
   */
  @Column({ type: 'jsonb', nullable: true })
  indicators: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal: boolean;
  }>;

  /**
   * conclusion: Mô tả chi tiết & kết luận của Kỹ thuật viên / Bác sĩ CĐHA
   */
  @Column({ type: 'text', nullable: true })
  conclusion: string;

  @Column({ name: 'result_file_url', type: 'text', nullable: true })
  resultFileUrl: string; // URL file kết quả chính (PDF, ảnh kết quả)

  /**
   * attachments: Danh sách các link file hình ảnh kết quả đính kèm (ảnh X-quang, ảnh siêu âm, ảnh nội soi)
   */
  @Column({ type: 'jsonb', nullable: true })
  attachments: string[];

  @Index('idx_so_status')
  @Column({ type: 'enum', enum: ServiceOrderStatus, default: ServiceOrderStatus.ORDERED })
  status: ServiceOrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number; // Phí dịch vụ (VND)

  @Column({ name: 'performed_at', type: 'timestamp', nullable: true })
  performedAt: Date; // Thời điểm thực hiện xét nghiệm

  @Column({ name: 'performed_by_user_id', nullable: true })
  performedByUserId: string; // ID Kỹ thuật viên xét nghiệm/chẩn đoán hình ảnh thực hiện

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú của bác sĩ (VD: "Nhịn ăn 8h trước khi lấy máu")

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
