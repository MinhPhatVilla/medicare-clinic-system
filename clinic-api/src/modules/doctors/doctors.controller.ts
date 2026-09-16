/**
 * @file src/modules/doctors/doctors.controller.ts
 * @description HTTP Controller cho Doctors và Doctor Schedules module
 */

import { Request, Response } from 'express';
import { DoctorsService } from './doctors.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  UpdateDoctorProfileDto,
  CreateDoctorScheduleDto,
  BulkCreateDoctorScheduleDto,
  AvailableSlotsQueryDto,
} from './doctors.dto';

const doctorsService = new DoctorsService();

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Quản lý bác sĩ và khung giờ làm việc (Doctor Schedules)
 */
export class DoctorsController {
  /**
   * @swagger
   * /doctors:
   *   get:
   *     summary: Lấy danh sách bác sĩ (Public)
   *     tags: [Doctors]
   *     parameters:
   *       - in: query
   *         name: specialty
   *         schema:
   *           type: string
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Danh sách bác sĩ
   */
  async findAll(req: Request, res: Response): Promise<void> {
    const result = await doctorsService.findAll(req.query as any);
    ApiResponse.success(res, result.data, 'Lấy danh sách bác sĩ thành công', 200, result.meta);
  }

  /**
   * @swagger
   * /doctors/{id}:
   *   get:
   *     summary: Lấy chi tiết thông tin bác sĩ (Public)
   *     tags: [Doctors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Thành công
   */
  async findById(req: Request, res: Response): Promise<void> {
    const doctor = await doctorsService.findById(req.params.id);
    ApiResponse.success(res, doctor, 'Lấy thông tin bác sĩ thành công');
  }

  /**
   * @swagger
   * /doctors/{id}:
   *   patch:
   *     summary: Cập nhật thông tin bác sĩ (Chuyên khoa, số phòng, giá khám)
   *     tags: [Doctors]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateDoctorProfileDto'
   *     responses:
   *       200:
   *         description: Cập nhật thành công
   */
  async update(req: Request, res: Response): Promise<void> {
    const updated = await doctorsService.update(
      req.params.id,
      req.body as UpdateDoctorProfileDto,
      req.user,
    );
    ApiResponse.success(res, updated, 'Cập nhật thông tin bác sĩ thành công');
  }

  /**
   * @swagger
   * /doctors/schedules:
   *   post:
   *     summary: Đăng ký một khung giờ (Slot) làm việc cho bác sĩ
   *     tags: [Doctors]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDoctorScheduleDto'
   *     responses:
   *       201:
   *         description: Đăng ký slot thành công
   *       409:
   *         description: Trùng khung giờ của bác sĩ hoặc trùng phòng khám
   */
  async createSchedule(req: Request, res: Response): Promise<void> {
    const schedule = await doctorsService.createSchedule(
      req.body as CreateDoctorScheduleDto,
      req.user,
    );
    ApiResponse.created(res, schedule, 'Đăng ký khung giờ làm việc thành công');
  }

  /**
   * @swagger
   * /doctors/schedules/bulk:
   *   post:
   *     summary: Đăng ký ca làm việc và tự động chia thành các slot 30 phút
   *     tags: [Doctors]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BulkCreateDoctorScheduleDto'
   *     responses:
   *       201:
   *         description: Tạo các slot ca làm việc thành công
   *       409:
   *         description: Trùng khung giờ của bác sĩ hoặc trùng phòng khám
   */
  async bulkCreateSchedule(req: Request, res: Response): Promise<void> {
    const schedules = await doctorsService.bulkCreateSchedule(
      req.body as BulkCreateDoctorScheduleDto,
      req.user,
    );
    ApiResponse.created(
      res,
      schedules,
      `Đăng ký ca làm việc thành công (${schedules.length} slot đã được tạo)`,
    );
  }

  /**
   * @swagger
   * /doctors/{id}/available-slots:
   *   get:
   *     summary: Tra cứu các slot còn trống của bác sĩ theo ngày hoặc theo tuần
   *     tags: [Doctors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: date
   *         schema:
   *           type: string
   *         description: Ngày cụ thể (YYYY-MM-DD)
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *         description: Từ ngày (YYYY-MM-DD)
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *         description: Đến ngày (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Danh sách slot còn trống
   */
  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    const slots = await doctorsService.getAvailableSlots(
      req.params.id,
      req.query as AvailableSlotsQueryDto,
    );
    ApiResponse.success(res, slots, 'Lấy danh sách slot còn trống thành công');
  }

  /**
   * @swagger
   * /doctors/{id}/schedules:
   *   get:
   *     summary: Lấy toàn bộ lịch làm việc của bác sĩ
   *     tags: [Doctors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Toàn bộ lịch làm việc
   */
  async getDoctorSchedules(req: Request, res: Response): Promise<void> {
    const schedules = await doctorsService.getDoctorSchedules(req.params.id, req.query as any);
    ApiResponse.success(res, schedules, 'Lấy lịch làm việc của bác sĩ thành công');
  }

  /**
   * @swagger
   * /doctors/schedules/{scheduleId}:
   *   delete:
   *     summary: Hủy / Xóa slot làm việc
   *     tags: [Doctors]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: scheduleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Hủy thành công
   */
  async deleteSchedule(req: Request, res: Response): Promise<void> {
    await doctorsService.deleteSchedule(req.params.scheduleId, req.user);
    ApiResponse.success(res, null, 'Hủy khung giờ làm việc thành công');
  }
}
