/**
 * @file src/modules/reception/reception.controller.ts
 * @description HTTP Controller cho module Lễ tân tiếp đón (Receptionist Intake)
 */

import { Request, Response } from 'express';
import { ReceptionService } from './reception.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  SearchTodayAppointmentsDto,
  CheckInDto,
  WalkInPatientDto,
  DoctorQueueQueryDto,
} from './reception.dto';

const receptionService = new ReceptionService();

export class ReceptionController {
  /**
   * GET /reception/appointments/today - Tìm kiếm lịch hẹn trong ngày bằng Mã đặt lịch / SĐT
   */
  async searchTodayAppointments(req: Request, res: Response): Promise<void> {
    const result = await receptionService.searchTodayAppointments(
      req.query as unknown as SearchTodayAppointmentsDto,
    );
    ApiResponse.success(
      res,
      result.data,
      'Tìm kiếm danh sách lịch hẹn trong ngày thành công',
      200,
      result.meta,
    );
  }

  /**
   * POST /reception/check-in - Check-in cho bệnh nhân có lịch hẹn trước, cấp STT, khởi tạo MedicalRecord
   */
  async checkIn(req: Request, res: Response): Promise<void> {
    const result = await receptionService.checkIn(req.body as CheckInDto, req.user!);
    ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /reception/walk-in - Tiếp nhận nhanh lượt khám vãng lai (Walk-in)
   */
  async createWalkIn(req: Request, res: Response): Promise<void> {
    const result = await receptionService.createWalkIn(req.body as WalkInPatientDto, req.user!);
    ApiResponse.created(res, result, result.message);
  }

  /**
   * GET /reception/queue/:doctorId - Lấy hàng đợi khám bệnh của Bác sĩ trong ngày
   */
  async getDoctorQueue(req: Request, res: Response): Promise<void> {
    const result = await receptionService.getDoctorQueue(
      req.params.doctorId,
      req.query as unknown as DoctorQueueQueryDto,
    );
    ApiResponse.success(res, result, 'Lấy danh sách hàng đợi khám bệnh thành công');
  }
}
