/**
 * @file src/modules/examinations/examinations.controller.ts
 * @description HTTP Controller cho module Bác sĩ khám bệnh & MedicalRecords
 */

import { Request, Response } from 'express';
import { ExaminationsService } from './examinations.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  SaveDraftExaminationDto,
  CompleteExaminationDto,
  WaitingQueueQueryDto,
} from './examinations.dto';

const examinationsService = new ExaminationsService();

export class ExaminationsController {
  /**
   * GET /examinations/queue - Lấy danh sách hàng đợi bệnh nhân đang chờ khám của bác sĩ
   */
  async getWaitingQueue(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as WaitingQueueQueryDto;
    const result = await examinationsService.getWaitingQueue(req.user!, query.date);
    ApiResponse.success(res, result, 'Lấy danh sách hàng đợi khám bệnh thành công');
  }

  /**
   * POST /examinations/:id/start - Bắt đầu khám (chuyển trạng thái sang IN_PROGRESS)
   */
  async startExamination(req: Request, res: Response): Promise<void> {
    const exam = await examinationsService.startExamination(req.params.id, req.user!);
    ApiResponse.success(res, exam, 'Bắt đầu khám thành công. Phiếu khám đang trong tiến trình');
  }

  /**
   * PATCH /examinations/:id/draft - Cơ chế Lưu nháp tức thời (Auto-save draft)
   */
  async saveDraft(req: Request, res: Response): Promise<void> {
    const exam = await examinationsService.saveDraft(
      req.params.id,
      req.body as SaveDraftExaminationDto,
      req.user!,
    );
    ApiResponse.success(res, exam, 'Đã tự động lưu nháp thành công');
  }

  /**
   * POST /examinations/:id/complete - Hoàn tất buổi khám bệnh
   */
  async completeExamination(req: Request, res: Response): Promise<void> {
    const exam = await examinationsService.completeExamination(
      req.params.id,
      req.body as CompleteExaminationDto,
      req.user!,
    );
    ApiResponse.success(res, exam, 'Hoàn tất kết quả khám bệnh thành công');
  }

  /**
   * GET /examinations/:id - Chi tiết kết quả khám
   */
  async findById(req: Request, res: Response): Promise<void> {
    const exam = await examinationsService.findById(req.params.id);
    ApiResponse.success(res, exam, 'Lấy chi tiết phiếu khám thành công');
  }

  /**
   * GET /examinations/appointment/:appointmentId - Chi tiết phiếu khám theo lịch hẹn
   */
  async findByAppointmentId(req: Request, res: Response): Promise<void> {
    const exam = await examinationsService.findByAppointmentId(req.params.appointmentId);
    ApiResponse.success(res, exam, 'Lấy phiếu khám theo lịch hẹn thành công');
  }
}
