/**
 * @file src/modules/billing/billing.routes.ts
 * @description Router cho Billing module (Hóa đơn thanh toán)
 *
 * Quy trình:
 * 1. Khám hoàn thành → Tiếp tân tạo hóa đơn (POST /billing)
 * 2. Hệ thống tự tính phí từ kết quả khám (consultation + lab + medicine)
 * 3. Bệnh nhân thanh toán → Tiếp tân xác nhận (PATCH /billing/:id/pay)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../config/database';
import { Invoice, InvoiceStatus, PaymentMethod } from '../../models/Invoice.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { ApiResponse } from '../../utils/ApiResponse';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import { UserRole } from '../../models/User.entity';

const router = Router();
const invoiceRepo = AppDataSource.getRepository(Invoice);
const appointmentRepo = AppDataSource.getRepository(Appointment);

router.use(authMiddleware);

// Schema tạo hóa đơn
const createInvoiceSchema = z.object({
  appointmentId: z.string().uuid(),
  serviceFee: z.number().min(0).default(0),
  medicineFee: z.number().min(0).default(0),
  insuranceCovered: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// Schema xác nhận thanh toán
const paymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'VIET_QR', 'MOMO', 'ZALOPAY', 'INSURANCE']),
});

// POST /billing - Tạo hóa đơn (Receptionist, Cashier, Admin)
router.post(
  '/',
  roleGuard(UserRole.RECEPTIONIST, UserRole.CASHIER, UserRole.ADMIN),
  validate(createInvoiceSchema),
  async (req: Request, res: Response) => {
    const body = req.body;

    // Kiểm tra appointment đã hoàn thành chưa
    const appointment = await appointmentRepo.findOne({
      where: { id: body.appointmentId },
      relations: ['doctor'],
    });

    if (!appointment) throw new NotFoundError('Lịch hẹn');
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestError('Chỉ tạo hóa đơn cho lịch hẹn đã hoàn thành');
    }

    // Kiểm tra chưa có hóa đơn
    const existingInvoice = await invoiceRepo.findOne({
      where: { appointmentId: body.appointmentId },
    });
    if (existingInvoice) {
      throw new BadRequestError('Lịch hẹn này đã có hóa đơn');
    }

    // Lấy phí khám cơ bản từ Doctor
    const consultationFee = Number(appointment.doctor?.consultationFee ?? 200000);

    // Tạo invoice number: HD-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `HD-${dateStr}-${random}`;

    // Tính tổng tiền
    const subtotal = consultationFee + Number(body.serviceFee) + Number(body.medicineFee);
    const totalAmount = Math.max(
      0,
      subtotal - Number(body.insuranceCovered) - Number(body.discountAmount),
    );

    const invoice = invoiceRepo.create({
      invoiceNumber,
      appointmentId: body.appointmentId,
      consultationFee,
      serviceFee: body.serviceFee,
      medicineFee: body.medicineFee,
      insuranceCovered: body.insuranceCovered,
      discountAmount: body.discountAmount,
      totalAmount,
      notes: body.notes,
      status: InvoiceStatus.PENDING,
    });

    const saved = await invoiceRepo.save(invoice);
    ApiResponse.created(res, saved, 'Tạo hóa đơn thành công');
  },
);

// GET /billing/:id - Chi tiết hóa đơn
router.get('/:id', async (req: Request, res: Response) => {
  const invoice = await invoiceRepo.findOne({
    where: { id: req.params.id },
    relations: [
      'appointment',
      'appointment.patient',
      'appointment.patient.user',
      'appointment.doctor',
      'appointment.doctor.user',
    ],
  });

  if (!invoice) throw new NotFoundError('Hóa đơn');
  ApiResponse.success(res, invoice, 'Thành công');
});

// GET /billing/appointment/:appointmentId - Hóa đơn theo lịch hẹn
router.get('/appointment/:appointmentId', async (req: Request, res: Response) => {
  const invoice = await invoiceRepo.findOne({ where: { appointmentId: req.params.appointmentId } });
  if (!invoice) throw new NotFoundError('Hóa đơn');
  ApiResponse.success(res, invoice, 'Thành công');
});

// PATCH /billing/:id/pay - Xác nhận thanh toán (Receptionist, Cashier, Admin)
router.patch(
  '/:id/pay',
  roleGuard(UserRole.RECEPTIONIST, UserRole.CASHIER, UserRole.ADMIN),
  validate(paymentSchema),
  async (req: Request, res: Response) => {
    const invoice = await invoiceRepo.findOne({ where: { id: req.params.id } });
    if (!invoice) throw new NotFoundError('Hóa đơn');

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError('Hóa đơn đã được thanh toán');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = req.body.paymentMethod as PaymentMethod;
    invoice.paidAt = new Date();
    invoice.paidByUserId = req.user!.id;

    const updated = await invoiceRepo.save(invoice);
    ApiResponse.success(res, updated, 'Xác nhận thanh toán thành công');
  },
);

export default router;
