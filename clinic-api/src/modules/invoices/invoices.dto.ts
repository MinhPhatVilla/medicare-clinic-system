/**
 * @file src/modules/invoices/invoices.dto.ts
 * @description DTO & Validation Schemas cho Module Viện phí & Hóa đơn (Invoices)
 */

import { z } from 'zod';
import { InvoiceStatus, PaymentMethod } from '../../models/Invoice.entity';
import { PrescriptionDispensingStatus } from '../../models/Prescription.entity';

const cashierPaymentMethods = [
  PaymentMethod.CASH,
  PaymentMethod.VIET_QR,
  PaymentMethod.POS_CARD,
] as const;

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
  insuranceCovered: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01).optional(),
  discountAmount: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type GenerateInvoiceDto = z.infer<typeof generateInvoiceSchema>;

/**
 * Schema xác nhận thanh toán hóa đơn
 */
export const payInvoiceSchema = z.object({
  paymentMethod: z.enum(cashierPaymentMethods, {
    errorMap: () => ({
      message: 'Phương thức thanh toán phải là một trong các giá trị: CASH, VIET_QR, POS_CARD',
    }),
  }),
  paymentReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type PayInvoiceDto = z.infer<typeof payInvoiceSchema>;

/**
 * Schema lấy hàng đợi Nhà thuốc sau khi bệnh nhân đã thanh toán đơn thuốc
 */
export const pharmacyQueueQuerySchema = z.object({
  status: z.nativeEnum(PrescriptionDispensingStatus).optional(),
  patientCode: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(20).optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PharmacyQueueQueryDto = z.infer<typeof pharmacyQueueQuerySchema>;

/**
 * Schema in/xuất hóa đơn
 */
export const invoicePrintQuerySchema = z.object({
  format: z.enum(['pdf', 'thermal']).default('pdf'),
});

export type InvoicePrintQueryDto = z.infer<typeof invoicePrintQuerySchema>;

export const invoiceIdSchema = z.object({ id: z.string().uuid() });
export const examinationIdSchema = z.object({ examinationId: z.string().uuid() });
export const dispensingStatusSchema = z.object({
  status: z.enum([
    PrescriptionDispensingStatus.PREPARING,
    PrescriptionDispensingStatus.READY_TO_DISPENSE,
    PrescriptionDispensingStatus.DISPENSED,
  ]),
});
