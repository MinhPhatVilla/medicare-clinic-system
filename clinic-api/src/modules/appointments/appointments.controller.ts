/**
 * @file src/modules/appointments/appointments.controller.ts
 * @description HTTP Controller cho Appointment module
 */

import { Request, Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  CreateAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
  MyAppointmentsQueryDto,
} from './appointments.dto';

const appointmentsService = new AppointmentsService();

export class AppointmentsController {
  /**
   * POST /appointments - Đặt lịch khám mới
   */
  async create(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.create(
      req.body as CreateAppointmentDto,
      req.user!,
    );
    ApiResponse.created(res, appointment, 'Đặt lịch khám thành công');
  }

  /**
   * GET /appointments/my - Xem danh sách lịch hẹn của tôi
   */
  async getMyAppointments(req: Request, res: Response): Promise<void> {
    const result = await appointmentsService.getMyAppointments(
      req.query as unknown as MyAppointmentsQueryDto,
      req.user!,
    );
    ApiResponse.success(
      res,
      result.data,
      'Lấy danh sách lịch hẹn của tôi thành công',
      200,
      result.meta,
    );
  }

  /**
   * PATCH /appointments/:id/cancel - Hủy lịch hẹn
   */
  async cancel(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.cancel(
      req.params.id,
      req.body as CancelAppointmentDto,
      req.user!,
    );
    ApiResponse.success(res, appointment, 'Hủy lịch hẹn thành công');
  }

  /**
   * PATCH /appointments/:id/reschedule - Dời lịch hẹn sang khung giờ mới
   */
  async reschedule(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.reschedule(
      req.params.id,
      req.body as RescheduleAppointmentDto,
      req.user!,
    );
    ApiResponse.success(res, appointment, 'Dời lịch khám thành công');
  }

  /**
   * GET /appointments - Lấy danh sách lịch hẹn (Tiếp tân/Bác sĩ/Admin)
   */
  async findAll(req: Request, res: Response): Promise<void> {
    const result = await appointmentsService.findAll(
      req.query as unknown as AppointmentQueryDto,
      req.user!,
    );
    ApiResponse.success(res, result.data, 'Lấy danh sách lịch hẹn thành công', 200, result.meta);
  }

  /**
   * GET /appointments/:id - Chi tiết 1 lịch hẹn
   */
  async findOne(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.findOne(req.params.id, req.user!);
    ApiResponse.success(res, appointment, 'Lấy thông tin lịch hẹn thành công');
  }

  /**
   * PATCH /appointments/:id/status - Cập nhật trạng thái lịch hẹn
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.updateStatus(
      req.params.id,
      req.body as UpdateStatusDto,
    );
    ApiResponse.success(res, appointment, 'Cập nhật trạng thái thành công');
  }

  /**
   * POST /appointments/checkin/:bookingCode - Check-in qua QR code
   */
  async checkInByQR(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.checkInByQR(req.params.bookingCode);
    ApiResponse.success(res, appointment, 'Check-in thành công');
  }
}
