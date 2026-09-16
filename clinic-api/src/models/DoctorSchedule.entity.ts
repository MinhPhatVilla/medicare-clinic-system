/**
 * @file src/models/DoctorSchedule.entity.ts
 * @description Entity DoctorSchedule — Lịch làm việc của bác sĩ theo ngày cụ thể
 *
 * Tại sao cần bảng riêng thay vì JSON trong Doctor?
 * - Quản lý linh hoạt từng ngày (nghỉ lễ, nghỉ đột xuất, thêm giờ)
 * - Theo dõi số slot đã đặt / còn trống theo thời gian thực
 * - Hỗ trợ query: "Bác sĩ X còn trống ngày Y không?"
 * - Dễ dàng sinh lịch tuần/tháng tự động
 *
 * Quan hệ:
 * - DoctorSchedule (n) ←→ (1) Doctor
 *
 * Index:
 * - idx_schedule_doctor_date: Composite (doctor_id, work_date) — query chính
 * - idx_schedule_work_date:   Đơn — xem toàn bộ lịch ngày hôm nay
 * - idx_schedule_available:   Lọc lịch còn nhận bệnh nhân
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
  Check,
} from 'typeorm';
import { Doctor } from './Doctor.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Index('idx_schedule_doctor_date', ['doctorId', 'workDate'])
@Check('chk_schedule_slots', '"booked_slots" <= "max_slots"')
@Entity('doctor_schedules')
export class DoctorSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → doctors
  @ManyToOne(() => Doctor, (doctor) => doctor.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  /**
   * work_date: Ngày làm việc cụ thể (VD: 2024-12-01)
   * Index riêng để query theo ngày (tiếp tân xem lịch hôm nay)
   */
  @Index('idx_schedule_work_date')
  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  @Column({ name: 'day_of_week', type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek; // Thứ trong tuần (tiện lọc)

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // "08:00"

  @Column({ name: 'end_time', type: 'time' })
  endTime: string; // "12:00"

  /**
   * slot_duration_minutes: Thời lượng mỗi ca khám (phút)
   * VD: 30 phút → từ 08:00-12:00 có tối đa 8 slot
   */
  @Column({ name: 'slot_duration_minutes', default: 30 })
  slotDurationMinutes: number;

  @Column({ name: 'max_slots' })
  maxSlots: number; // Số bệnh nhân tối đa trong buổi này

  @Column({ name: 'booked_slots', default: 0 })
  bookedSlots: number; // Số slot đã đặt (tăng khi có Appointment CONFIRMED)

  @Index('idx_schedule_available')
  @Column({ name: 'is_available', default: true })
  isAvailable: boolean; // false nếu bác sĩ nghỉ hoặc đã đầy

  @Column({ name: 'location', length: 100, nullable: true })
  location: string; // Phòng khám / Phòng số mấy

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú (VD: "Nghỉ do bận họp", "Buổi sáng chỉ nhận 5 bệnh nhân")

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
