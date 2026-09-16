/**
 * @file src/modules/invoices/invoices.dto.ts
 * @description DTO & Validation Schemas cho Module Viện phí & Hóa đơn (Invoices)
 */

import { z } from 'zod';
import { InvoiceStatus, PaymentMethod } from '../../models/Invoice.entity';

/**
 * Schema tra cứu danh sách hóa đơn cho Quầy Thu ngân
 * Hỗ trợ lọc theo mã phiếu khám, mã bệnh nhân, SĐT, mã đặt lịch, số hóa đơn, trạng thái
 */
export const invoiceQuerySchema = z.object({
  examinationId: z.string().uuid('Mã phiếu khám không đúng định dạng UUID').optional(),
  patientId: z.string().uuid('Mã bệnh nhân không đúng định dạng UUID').optional(),
  patientCode: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(20).optional(),
  bookingCode: z.string().trim().max(50).optional(),
  invoiceNumber: z.string().trim().max(50).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  keyword: z.string().trim().max(100).optional(), // Tra cứu nhanh theo tên BN, SĐT hoặc mã
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type InvoiceQueryDto = z.infer<typeof invoiceQuerySchema>;

/**
 * Schema yêu cầu sinh hóa đơn tổng hợp từ Phiếu khám
 */
export const generateInvoiceSchema = z.object({
  insuranceCovered: z.number().min(0, 'Số tiền BHYT chi trả không được âm').default(0),
  discountAmount: z.number().min(0, 'Số tiền giảm giá không được âm').default(0),
  notes: z.string().trim().max(500).optional(),
});

export type GenerateInvoiceDto = z.infer<typeof generateInvoiceSchema>;

/**
 * Schema xác nhận thanh toán hóa đơn
 */
export const payInvoiceSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({
      message: 'Phương thức thanh toán phải là một trong các giá trị: CASH, BANK_TRANSFER, VIET_QR, MOMO, ZALOPAY, INSURANCE',
    }),
  }),
  notes: z.string().trim().max(500).optional(),
});

export type PayInvoiceDto = z.infer<typeof payInvoiceSchema>;
