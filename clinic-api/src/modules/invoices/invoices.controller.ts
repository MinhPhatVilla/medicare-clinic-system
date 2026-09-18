/**
 * @file src/modules/invoices/invoices.controller.ts
 * @description Controller tiếp nhận HTTP requests cho module Viện phí & Hóa đơn (Invoices)
 */

import { Request, Response } from 'express';
import { InvoicesService } from './invoices.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { PrescriptionDispensingStatus } from '../../models/Prescription.entity';
import {
  GenerateInvoiceDto,
  InvoicePrintQueryDto,
  InvoiceQueryDto,
  PayInvoiceDto,
  PharmacyQueueQueryDto,
} from './invoices.dto';

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
    return ApiResponse.created(res, invoice, 'Tạo hóa đơn tổng hợp từ phiếu khám thành công');
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
    const detail = await this.invoicesService.getInvoiceDetail(id, req.user!);
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
    const result = await this.invoicesService.payInvoice(id, dto, cashierUserId);
    return ApiResponse.success(res, result, 'Xác nhận thanh toán viện phí thành công');
  };

  /**
   * GET /api/v1/invoices/pharmacy/queue
   * Màn hình Nhà thuốc lấy danh sách đơn thuốc đã thanh toán chờ chuẩn bị/phát thuốc
   */
  getPharmacyQueue = async (req: Request, res: Response) => {
    const query = req.query as unknown as PharmacyQueueQueryDto;
    const result = await this.invoicesService.getPharmacyQueue(query);
    return ApiResponse.success(res, result, 'Lấy hàng đợi Nhà thuốc thành công');
  };

  /**
   * GET /api/v1/invoices/:id/print?format=pdf|thermal
   * In/xuất phiếu hóa đơn điện tử
   */
  exportInvoice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = req.query as unknown as InvoicePrintQueryDto;
    const printable = await this.invoicesService.exportInvoice(id, query, req.user!);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', printable.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${printable.filename}"`);
    return res.send(printable.body);
  };

  updateDispensingStatus = async (req: Request, res: Response) => {
    const result = await this.invoicesService.updateDispensingStatus(
      req.params.id,
      req.body.status as PrescriptionDispensingStatus,
      req.user!.id,
    );
    return ApiResponse.success(res, result, 'Đã cập nhật trạng thái phát thuốc');
  };

  discharge = async (req: Request, res: Response) => {
    const result = await this.invoicesService.discharge(req.params.id, req.user!.id);
    return ApiResponse.success(res, result, 'Đã hoàn tất xuất viện');
  };

  pharmacyEvents = async (_req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    let closed = false;
    let revision = '';
    let timer: NodeJS.Timeout | undefined;
    const expires = setTimeout(() => res.end(), 60_000);
    res.on('close', () => {
      closed = true;
      if (timer) clearTimeout(timer);
      clearTimeout(expires);
    });
    // Read committed state so rollback and multi-process deployments cannot lose notifications.
    const tick = async (): Promise<void> => {
      try {
        const latest = await this.invoicesService.getPharmacyRevision();
        if (closed) return;
        if (latest !== revision) {
          revision = latest;
          res.write(`event: pharmacy.queue.changed\ndata: ${JSON.stringify({ revision })}\n\n`);
        } else {
          res.write(': heartbeat\n\n');
        }
        timer = setTimeout(() => {
          void tick();
        }, 2000);
      } catch {
        res.end();
      }
    };
    await tick();
  };
}
