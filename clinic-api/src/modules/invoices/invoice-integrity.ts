import { EntityManager } from 'typeorm';
import { BadRequestError, NotFoundError } from '../../exceptions/AppError';
import { Examination } from '../../models/Examination.entity';
import { Invoice } from '../../models/Invoice.entity';

type Charges = Pick<
  Invoice,
  'consultationFee' | 'serviceFee' | 'medicineFee' | 'insuranceCovered' | 'discountAmount'
>;

export function moneyInCents(value: number | string): number {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    cents > 999999999999 ||
    Math.abs(amount * 100 - cents) > 0.0001
  ) {
    throw new BadRequestError(
      'Số tiền phải không âm, tối đa 2 chữ số thập phân và nằm trong giới hạn hóa đơn.',
    );
  }
  return cents;
}

export function calculateInvoiceAmounts(
  values: Charges & { prepaidAmount?: number },
): Charges & { subtotal: number; totalAmount: number } {
  const consultation = moneyInCents(values.consultationFee);
  const services = moneyInCents(values.serviceFee);
  const medicine = moneyInCents(values.medicineFee);
  const insurance = moneyInCents(values.insuranceCovered);
  const discount = moneyInCents(values.discountAmount);
  const total = consultation + services + medicine - insurance - discount;
  if (total < 0) {
    throw new BadRequestError('Tổng BHYT chi trả và giảm giá không được vượt quá tổng chi phí.');
  }
  moneyInCents(total / 100);
  if (moneyInCents(values.prepaidAmount ?? 0) > total) {
    throw new BadRequestError(
      'Tổng hóa đơn mới thấp hơn số tiền đã thu trước. Cần đối soát khoản thu.',
    );
  }
  return {
    consultationFee: consultation / 100,
    serviceFee: services / 100,
    medicineFee: medicine / 100,
    insuranceCovered: insurance / 100,
    discountAmount: discount / 100,
    subtotal: (consultation + services + medicine) / 100,
    totalAmount: total / 100,
  };
}

// All financial writers lock the examination before the invoice, including initial creation.
export async function lockBillingExamination(
  manager: EntityManager,
  id: string,
): Promise<Examination> {
  const examination = await manager.getRepository(Examination).findOne({
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!examination) throw new NotFoundError('Phiếu khám bệnh');
  return examination;
}
