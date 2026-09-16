/**
 * @file src/models/MedicalService.entity.ts
 * @description Entity MedicalService — Danh mục Dịch vụ Kỹ thuật & Bảng giá Niêm yết (Service Catalog)
 *
 * Lưu trữ danh mục các dịch vụ cận lâm sàng (Xét nghiệm, Siêu âm, X-Quang, Nội soi, Điện tim, v.v.)
 * phục vụ cho việc bác sĩ chỉ định và thu ngân/hệ thống tính viện phí.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ServiceType, ServiceOrder } from './ServiceOrder.entity';

@Entity('medical_services')
export class MedicalService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_service_code', { unique: true })
  @Column({ name: 'code', length: 30, unique: true })
  code: string; // VD: "XN_CBC", "SA_OB", "XQ_CHEST", "NS_DD"

  @Index('idx_service_name')
  @Column({ name: 'name', length: 255 })
  name: string; // VD: "Tổng phân tích tế bào máu ngoại vi bằng máy laser (CBC)"

  @Index('idx_service_type')
  @Column({
    name: 'service_type',
    type: 'enum',
    enum: ServiceType,
    default: ServiceType.LAB_TEST,
  })
  serviceType: ServiceType;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  price: number; // Giá niêm yết (VND)

  @Column({ name: 'unit', length: 50, default: 'Lần' })
  unit: string; // Đơn vị tính: "Lần", "Vị trí", "Tiêu bản"

  @Column({ name: 'department', length: 150, nullable: true })
  department: string; // Phòng/Khoa thực hiện (VD: "Phòng Xét nghiệm 103", "Khoa CĐHA")

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string; // Hướng dẫn thực hiện hoặc ghi chú chuẩn bị (VD: "Nhịn ăn 8h trước khi lấy máu")

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // Trạng thái hoạt động

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ServiceOrder, (order) => order.service)
  orders: ServiceOrder[];
}
