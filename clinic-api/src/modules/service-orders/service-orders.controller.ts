/**
 * @file src/modules/service-orders/service-orders.controller.ts
 * @description Controller tiếp nhận request và phản hồi cho Quản lý Dịch vụ Kỹ thuật & Chỉ định CLS
 */

import { Request, Response } from 'express';
import { ServiceOrdersService } from './service-orders.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class ServiceOrdersController {
  private serviceOrdersService: ServiceOrdersService;

  constructor() {
    this.serviceOrdersService = new ServiceOrdersService();
  }

  // ============================================================
  // SERVICE CATALOG
  // ============================================================

  /**
   * GET /api/v1/service-orders/catalog - Lấy danh mục dịch vụ niêm yết
   */
  getCatalog = async (req: Request, res: Response) => {
    const result = await this.serviceOrdersService.getCatalog(req.query as any);
    ApiResponse.success(res, result, 'Lấy danh mục dịch vụ kỹ thuật thành công');
  };

  /**
   * POST /api/v1/service-orders/catalog - Tạo mới dịch vụ vào danh mục (Admin)
   */
  createCatalogService = async (req: Request, res: Response) => {
    const service = await this.serviceOrdersService.createCatalogService(req.body);
    ApiResponse.created(res, service, 'Thêm dịch vụ vào danh mục thành công');
  };

  // ============================================================
  // SERVICE ORDERS
  // ============================================================

  /**
   * POST /api/v1/service-orders - Bác sĩ tạo một hoặc nhiều chỉ định CLS cho phiếu khám
   */
  createOrders = async (req: Request, res: Response) => {
    const doctorUserId = req.user?.id;
    const result = await this.serviceOrdersService.createOrders(req.body, doctorUserId);
    ApiResponse.created(
      res,
      result,
      `Đã tạo thành công ${result.orders.length} chỉ định cận lâm sàng và đồng bộ vào viện phí tạm tính`,
    );
  };

  /**
   * GET /api/v1/service-orders/examination/:examinationId - Lấy danh sách chỉ định CLS của phiếu khám
   */
  getOrdersByExamination = async (req: Request, res: Response) => {
    const { examinationId } = req.params;
    const result = await this.serviceOrdersService.getOrdersByExamination(examinationId);
    ApiResponse.success(res, result, 'Lấy danh sách chỉ định cận lâm sàng thành công');
  };

  /**
   * PATCH /api/v1/service-orders/:id/status - Cập nhật trạng thái chỉ định CLS (PAID, COMPLETED, CANCELLED)
   */
  updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await this.serviceOrdersService.updateOrderStatus(id, req.body);
    ApiResponse.success(res, updated, 'Cập nhật trạng thái chỉ định cận lâm sàng thành công');
  };

  /**
   * POST /api/v1/service-orders/examination/:examinationId/pay - Thu ngân/tiếp tân thu tiền các chỉ định CLS
   */
  payOrders = async (req: Request, res: Response) => {
    const { examinationId } = req.params;
    const cashierUserId = req.user?.id;
    const result = await this.serviceOrdersService.payOrders(
      { ...req.body, examinationId },
      cashierUserId,
    );
    ApiResponse.success(
      res,
      result,
      `Đã xác nhận thu tiền thành công cho ${result.paidOrders.length} chỉ định CLS`,
    );
  };

  /**
   * DELETE /api/v1/service-orders/:id - Hủy chỉ định CLS
   */
  cancelOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.serviceOrdersService.cancelOrder(id);
    ApiResponse.success(res, result, 'Đã hủy chỉ định cận lâm sàng thành công');
  };
}
