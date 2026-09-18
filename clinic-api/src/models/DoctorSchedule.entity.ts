/**
 * @file src/models/DoctorSchedule.entity.ts
 * @description Entity DoctorSchedule — Lịch làm việc và khung giờ (Slots) của bác sĩ
 *
 * Tính năng chính:
 * - Quản lý lịch làm việc theo ngày (work_date) và chia theo slot (VD: 08:00 - 08:30)
 * - Quản lý giới hạn bệnh nhân trên từng slot (mặc định tối đa 3 bệnh nhân/slot)
 * - Quản lý phòng khám (room_number)
 * - Tối ưu truy vấn kiểm tra trùng lịch Bác sĩ & trùng lịch Phòng khám
 *
 * Index:
 * - idx_schedule_doctor_date: Composite (doctor_id, work_date) — kiểm tra trùng lịch bác sĩ
 * - idx_schedule_room_date:   Composite (room_number, work_date) — kiểm tra trùng phòng khám
 * - idx_schedule_work_date:   Đơn — tra cứu lịch theo ngày/tuần
 * - idx_schedule_available:   Lọc các slot còn nhận bệnh nhân
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
@Index('idx_schedule_room_date', ['roomNumber', 'workDate'])
@Check('chk_schedule_patients', '"booked_patients" <= "max_patients"')
@Check(
  'chk_schedule_capacity',
  '"booked_patients" >= 0 AND "max_patients" > 0 AND "slot_duration_minutes" > 0',
)
@Check('chk_schedule_time', '"start_time" < "end_time"')
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
   * work_date: Ngày làm việc cụ thể (VD: 2026-09-20)
   */
  @Index('idx_schedule_work_date')
  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  @Column({ name: 'day_of_week', type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek; // Thứ trong tuần (tiện lọc lịch tuần)

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // "08:00"

  @Column({ name: 'end_time', type: 'time' })
  endTime: string; // "08:30"

  /**
   * room_number: Số phòng khám của slot này (VD: "Phòng 102", "P.205")
   * Dùng để kiểm tra trùng phòng khám giữa các bác sĩ
   */
  @Column({ name: 'room_number', length: 50, nullable: true })
  roomNumber: string;

  /**
   * slot_duration_minutes: Thời lượng slot khám (phút) - Mặc định 30 phút
   */
  @Column({ name: 'slot_duration_minutes', default: 30 })
  slotDurationMinutes: number;

  /**
   * max_patients: Số bệnh nhân tối đa trong slot này (Mặc định 3 bệnh nhân/slot)
   */
  @Column({ name: 'max_patients', default: 3 })
  maxPatients: number;

  /**
   * booked_patients: Số bệnh nhân đã đặt thành công slot này (current_booked)
   */
  @Column({ name: 'booked_patients', default: 0 })
  bookedPatients: number;

  get currentBooked(): number {
    return this.bookedPatients;
  }

  set currentBooked(val: number) {
    this.bookedPatients = val;
  }

  @Index('idx_schedule_available')
  @Column({ name: 'is_available', default: true })
  isAvailable: boolean; // false nếu bác sĩ nghỉ hoặc đã hết chỗ

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú (VD: "Khám chuyên sâu", "Khám ưu tiên")

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
