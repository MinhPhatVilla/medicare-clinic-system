/**
 * @file src/modules/prescriptions/prescriptions.controller.ts
 * @description Controller tiếp nhận request cho Kê đơn thuốc, Danh mục thuốc, ICD-10 & Hoàn tất khám
 */

import { Request, Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class PrescriptionsController {
  private service: PrescriptionsService;

  constructor() {
    this.service = new PrescriptionsService();
  }

  /**
   * GET /api/v1/prescriptions/medicines - Tra cứu danh mục thuốc
   */
  getMedicines = async (req: Request, res: Response) => {
    const result = await this.service.getMedicines(req.query as any);
    ApiResponse.success(res, result, 'Lấy danh mục thuốc thành công');
  };

  /**
   * GET /api/v1/prescriptions/icd10 - Tra cứu danh mục mã bệnh ICD-10
   */
  getIcd10Catalog = async (req: Request, res: Response) => {
    const result = await this.service.getIcd10Catalog(req.query as any);
    ApiResponse.success(res, result, 'Tra cứu danh mục mã bệnh ICD-10 thành công');
  };

  /**
   * POST /api/v1/prescriptions - Bác sĩ kê đơn thuốc
   */
  createPrescription = async (req: Request, res: Response) => {
    const doctorUserId = req.user?.id;
    const result = await this.service.createPrescription(req.body, doctorUserId);
    ApiResponse.created(
      res,
      result,
      `Kê đơn thuốc thành công. Tổng tiền thuốc: ${result.totalMedicineFee.toLocaleString('vi-VN')} đ`,
    );
  };

  /**
   * GET /api/v1/prescriptions/examination/:examinationId - Lấy chi tiết đơn thuốc của phiếu khám
   */
  getPrescriptionByExamination = async (req: Request, res: Response) => {
    const { examinationId } = req.params;
    const result = await this.service.getPrescriptionByExamination(examinationId);
    ApiResponse.success(res, result, 'Lấy chi tiết đơn thuốc thành công');
  };

  /**
   * POST /api/v1/prescriptions/examination/:examinationId/complete-and-lock
   * Bác sĩ xác nhận Hoàn tất ca khám -> Cập nhật COMPLETED, khóa hồ sơ và chuyển dữ liệu sang quầy Thu ngân
   */
  completeAndLockExamination = async (req: Request, res: Response) => {
    const { examinationId } = req.params;
    const doctorUserId = req.user?.id;
    const result = await this.service.completeAndLockExamination(
      examinationId,
      req.body,
      doctorUserId,
    );
    ApiResponse.success(res, result, result.message);
  };
}
