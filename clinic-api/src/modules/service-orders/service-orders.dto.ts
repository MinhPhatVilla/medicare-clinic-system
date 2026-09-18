/**
 * @file src/modules/service-orders/service-orders.dto.ts
 * @description Data Transfer Objects (DTO) cho Quản lý Dịch vụ Kỹ thuật & Chỉ định Cận Lâm Sàng
 */

import { z } from 'zod';
import { dateOnly } from '../../utils/validation';
import { ServiceType, ServiceOrderStatus } from '../../models/ServiceOrder.entity';

/**
 * Schema từng dịch vụ được chỉ định trong batch
 */
export const serviceOrderItemSchema = z.object({
  serviceId: z.string().uuid('ID dịch vụ không hợp lệ').optional(),
  serviceCode: z.string().trim().max(30).optional(),
  serviceName: z
    .string({ required_error: 'Tên dịch vụ cận lâm sàng không được để trống' })
    .trim()
    .min(2, 'Tên dịch vụ phải có ít nhất 2 ký tự')
    .max(200, 'Tên dịch vụ tối đa 200 ký tự'),
  serviceType: z.nativeEnum(ServiceType, {
    errorMap: () => ({
      message:
        'Loại dịch vụ phải là một trong các giá trị: LAB_TEST, IMAGING, ECG, ENDOSCOPY, OTHER',
    }),
  }),
  fee: z.number().min(0, 'Phí dịch vụ không được âm'),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Schema Bác sĩ tạo một hoặc nhiều chỉ định CLS cho phiếu khám
 */
export const createServiceOrdersSchema = z.object({
  examinationId: z
    .string({ required_error: 'Mã phiếu khám (record_id / examinationId) là bắt buộc' })
    .uuid('Mã phiếu khám phải là UUID hợp lệ'),
  services: z
    .array(serviceOrderItemSchema, {
      required_error: 'Danh sách dịch vụ chỉ định là bắt buộc',
    })
    .min(1, 'Cần chỉ định ít nhất 1 dịch vụ cận lâm sàng'),
});

export type CreateServiceOrdersDto = z.infer<typeof createServiceOrdersSchema>;

/**
 * Schema cập nhật trạng thái chỉ định CLS (PAID, COMPLETED, CANCELLED)
 */
export const updateServiceOrderStatusSchema = z
  .object({
    status: z.nativeEnum(ServiceOrderStatus, {
      errorMap: () => ({
        message: 'Trạng thái chỉ định phải là ORDERED, PAID, IN_PROGRESS, COMPLETED hoặc CANCELLED',
      }),
    }),
    result: z.string().trim().optional(),
    resultFileUrl: z
      .string()
      .trim()
      .url('Đường dẫn file kết quả phải là URL hợp lệ')
      .optional()
      .or(z.literal('')),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      // Nếu đánh dấu COMPLETED thì phải có kết quả hoặc mô tả
      if (data.status === ServiceOrderStatus.COMPLETED && !data.result && !data.resultFileUrl) {
        return false;
      }
      return true;
    },
    {
      message: 'Khi hoàn thành chỉ định CLS, cần nhập kết quả hoặc tải lên file kết quả',
      path: ['result'],
    },
  );

export type UpdateServiceOrderStatusDto = z.infer<typeof updateServiceOrderStatusSchema>;

/**
 * Schema xác nhận thu tiền các chỉ định CLS (Chuyển sang PAID)
 */
export const payServiceOrdersSchema = z.object({
  examinationId: z.string().uuid('Mã phiếu khám không hợp lệ'),
  orderIds: z.array(z.string().uuid()).optional(), // Nếu không truyền thì thanh toán tất cả các chỉ định đang ORDERED
  paymentMethod: z
    .enum(['CASH', 'BANK_TRANSFER', 'VIET_QR', 'MOMO', 'ZALOPAY', 'INSURANCE'])
    .default('CASH'),
});

export type PayServiceOrdersDto = z.infer<typeof payServiceOrdersSchema>;

/**
 * Schema từng chỉ số xét nghiệm đo lường kèm khoảng tham chiếu
 */
export const indicatorItemSchema = z.object({
  name: z
    .string({ required_error: 'Tên chỉ số xét nghiệm là bắt buộc' })
    .trim()
    .min(1, 'Tên chỉ số không được để trống'),
  value: z.union([z.string(), z.number()], {
    required_error: 'Giá trị chỉ số là bắt buộc',
  }),
  unit: z.string().trim().optional(),
  normalRange: z.string().trim().optional(),
  isAbnormal: z.boolean().default(false),
});

export type IndicatorItemDto = z.infer<typeof indicatorItemSchema>;

/**
 * Schema Kỹ thuật viên nhập kết quả Cận lâm sàng chi tiết
 */
export const enterServiceOrderResultSchema = z.object({
  indicators: z.array(indicatorItemSchema).optional(),
  conclusion: z
    .string({ required_error: 'Mô tả chi tiết hoặc kết luận là bắt buộc' })
    .trim()
    .min(3, 'Kết luận/mô tả chi tiết phải có ít nhất 3 ký tự')
    .max(2000, 'Kết luận/mô tả tối đa 2000 ký tự'),
  result: z.string().trim().optional(),
  resultFileUrl: z
    .string()
    .trim()
    .url('Đường dẫn file kết quả chính phải là URL hợp lệ')
    .optional()
    .or(z.literal('')),
  attachments: z
    .array(z.string().trim().url('Đường dẫn ảnh đính kèm phải là URL hợp lệ'))
    .optional()
    .default([]),
  notes: z.string().trim().max(500).optional(),
});

export type EnterServiceOrderResultDto = z.infer<typeof enterServiceOrderResultSchema>;

/**
 * Schema tra cứu hàng đợi chỉ định CLS chờ thực hiện của Kỹ thuật viên
 */
export const technicianQueueQuerySchema = z.object({
  serviceType: z.nativeEnum(ServiceType).optional(),
  status: z.nativeEnum(ServiceOrderStatus).optional(),
  date: dateOnly.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TechnicianQueueQueryDto = z.infer<typeof technicianQueueQuerySchema>;

/**
 * Schema tra cứu danh mục dịch vụ kỹ thuật (Service Catalog)
 */
export const serviceCatalogQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ServiceCatalogQueryDto = z.infer<typeof serviceCatalogQuerySchema>;

/**
 * Schema tạo mới dịch vụ kỹ thuật vào danh mục (Admin)
 */
export const createMedicalServiceSchema = z.object({
  code: z
    .string({ required_error: 'Mã dịch vụ là bắt buộc' })
    .trim()
    .min(2, 'Mã dịch vụ tối thiểu 2 ký tự')
    .max(30, 'Mã dịch vụ tối đa 30 ký tự')
    .toUpperCase(),
  name: z
    .string({ required_error: 'Tên dịch vụ là bắt buộc' })
    .trim()
    .min(3, 'Tên dịch vụ tối thiểu 3 ký tự')
    .max(255),
  serviceType: z.nativeEnum(ServiceType),
  price: z.number().min(0, 'Giá niêm yết không được âm'),
  unit: z.string().trim().default('Lần'),
  department: z.string().trim().optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export type CreateMedicalServiceDto = z.infer<typeof createMedicalServiceSchema>;
