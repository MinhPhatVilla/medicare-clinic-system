/**
 * @file src/modules/invoices/invoices.controller.ts
 * @description Controller tiếp nhận HTTP requests cho module Viện phí & Hóa đơn (Invoices)
 */

import { Request, Response } from 'express';
import { InvoicesService } from './invoices.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { InvoiceQueryDto, GenerateInvoiceDto, PayInvoiceDto } from './invoices.dto';

export class InvoicesController {
  private invoicesService = new InvoicesService();

  /**
   * POST /api/v1/invoices/generate-from-examination/:examinationId
   * Sinh hoặc làm mới Hóa đơn tổng hợp từ Phiếu khám bệnh
   */
  generateFromExamination = async (req: Request, res: Response) => {
    const { examinationId } = req.params;
    const dto: GenerateInvoiceDto = req.body;
    const invoice = await this.invoicesService.generateInvoiceFromExamination(examinationId, dto);
    return ApiResponse.created(
      res,
      invoice,
      'Tạo hóa đơn tổng hợp từ phiếu khám thành công',
    );
  };

  /**
   * GET /api/v1/invoices
   * Tra cứu danh sách hóa đơn theo mã phiếu khám, mã bệnh nhân, SĐT, số hóa đơn, trạng thái
   */
  getInvoices = async (req: Request, res: Response) => {
    const query = req.query as unknown as InvoiceQueryDto;
    const result = await this.invoicesService.getInvoices(query);
    return ApiResponse.success(res, result, 'Lấy danh sách hóa đơn thành công');
  };

  /**
   * GET /api/v1/invoices/:id
   * Xem chi tiết hóa đơn kèm bảng kê chi tiết viện phí (Khám + CLS + Thuốc)
   */
  getInvoiceDetail = async (req: Request, res: Response) => {
    const { id } = req.params;
    const detail = await this.invoicesService.getInvoiceDetail(id);
    return ApiResponse.success(res, detail, 'Lấy chi tiết hóa đơn thành công');
  };

  /**
   * PATCH /api/v1/invoices/:id/pay
   * Quầy Thu ngân xác nhận thu tiền và cập nhật trạng thái hóa đơn sang PAID
   */
  payInvoice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto: PayInvoiceDto = req.body;
    const cashierUserId = req.user!.id;
    const updatedInvoice = await this.invoicesService.payInvoice(id, dto, cashierUserId);
    return ApiResponse.success(
      res,
      updatedInvoice,
      'Xác nhận thanh toán viện phí thành công',
    );
  };
}
