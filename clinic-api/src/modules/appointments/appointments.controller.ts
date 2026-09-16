/**
 * @file src/modules/appointments/appointments.controller.ts
 * @description HTTP Controller cho Appointment module
 */

import { Request, Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  CreateAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
} from './appointments.dto';

const appointmentsService = new AppointmentsService();

export class AppointmentsController {
  async create(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.create(
      req.body as CreateAppointmentDto,
      req.user!,
    );
    ApiResponse.created(res, appointment, 'Đặt lịch khám thành công');
  }

  async findAll(req: Request, res: Response): Promise<void> {
    const result = await appointmentsService.findAll(
      req.query as unknown as AppointmentQueryDto,
      req.user!,
    );
    ApiResponse.success(res, result.data, 'Lấy danh sách lịch hẹn thành công', 200, result.meta);
  }

  async findOne(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.findOne(req.params.id, req.user!);
    ApiResponse.success(res, appointment, 'Lấy thông tin lịch hẹn thành công');
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.updateStatus(
      req.params.id,
      req.body as UpdateStatusDto,
    );
    ApiResponse.success(res, appointment, 'Cập nhật trạng thái thành công');
  }

  async checkInByQR(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentsService.checkInByQR(req.params.bookingCode);
    ApiResponse.success(res, appointment, 'Check-in thành công');
  }
}
