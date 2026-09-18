import { RequestHandler } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { Appointment } from '../models/Appointment.entity';
import { Examination } from '../models/Examination.entity';
import { Doctor } from '../models/Doctor.entity';
import { ServiceOrder } from '../models/ServiceOrder.entity';
import { UserRole } from '../models/User.entity';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../exceptions/AppError';

export function recordAccess(
  kind: 'examination' | 'appointment' | 'order' | 'doctor',
  key: string,
  source: 'params' | 'body' = 'params',
): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    const id = z.string().uuid().parse(req[source][key]);
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }
    if (kind === 'doctor') {
      const doctor = await AppDataSource.getRepository(Doctor).findOneBy({ id });
      if (!doctor) throw new NotFoundError('Bac si');
      if (req.user.role === UserRole.DOCTOR && doctor.userId !== req.user.id)
        throw new ForbiddenError();
      next();
      return;
    }
    let appointmentId = id;
    if (kind !== 'appointment') {
      const examId =
        kind === 'order'
          ? (await AppDataSource.getRepository(ServiceOrder).findOneBy({ id }))?.examinationId
          : id;
      if (!examId) throw new NotFoundError('Chi dinh');
      const exam = await AppDataSource.getRepository(Examination).findOne({
        where: [{ id: examId }, { appointmentId: examId }],
      });
      if (!exam) throw new NotFoundError('Phieu kham');
      appointmentId = exam.appointmentId;
    }
    const appointment = await AppDataSource.getRepository(Appointment).findOne({
      where: { id: appointmentId },
      relations: ['patient', 'doctor'],
    });
    if (!appointment) throw new NotFoundError('Lich hen');
    if (req.user.role === UserRole.PATIENT && appointment.patient.userId !== req.user.id)
      throw new ForbiddenError();
    if (req.user.role === UserRole.DOCTOR && appointment.doctor.userId !== req.user.id)
      throw new ForbiddenError();
    if (req.user.role === UserRole.MANAGER)
      throw new ForbiddenError('Quan ly chi xem bao cao tong hop');
    next();
  };
}
