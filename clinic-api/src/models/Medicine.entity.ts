/**
 * @file src/models/Medicine.entity.ts
 * @description Entity Medicine — Danh mục Thuốc (Drug Catalog)
 *
 * Quản lý danh mục thuốc của phòng khám: tên thuốc, hoạt chất, đơn vị tính, giá bán niêm yết,
 * dạng bào chế, đường dùng và hướng dẫn sử dụng.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_medicine_code', { unique: true })
  @Column({ name: 'code', length: 30, unique: true })
  code: string; // Mã thuốc, VD: "TH_OMEP_20", "TH_PARA_500"

  @Index('idx_medicine_name')
  @Column({ name: 'name', length: 255 })
  name: string; // Tên biệt dược, VD: "Omeprazol 20mg", "Hapacol 650"

  @Index('idx_active_ingredient')
  @Column({ name: 'active_ingredient', length: 255 })
  activeIngredient: string; // Tên hoạt chất, VD: "Omeprazole", "Paracetamol"

  @Column({ length: 50, default: 'Viên' })
  unit: string; // Đơn vị tính: "Viên", "Gói", "Chai", "Tuýp", "Lọ", "Ống"

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  unitPrice: number; // Giá bán niêm yết (VND/đơn vị)

  @Column({ name: 'dosage_form', length: 100, nullable: true })
  dosageForm: string; // Dạng bào chế: "Viên nang kháng acid", "Viên nén sủi bọt", "Hỗn dịch uống"

  @Column({ name: 'packaging', length: 100, nullable: true })
  packaging: string; // Quy cách đóng gói: "Hộp 3 vỉ x 10 viên"

  @Column({ name: 'usage_instructions', type: 'text', nullable: true })
  usageInstructions: string; // Hướng dẫn sử dụng mặc định (VD: "Uống trước ăn 30 phút")

  @Column({ name: 'manufacturer', length: 200, nullable: true })
  manufacturer: string; // Nhà sản xuất (VD: "Dược Hậu Giang", "Sanofi Aventis")

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // Trạng thái sử dụng

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
