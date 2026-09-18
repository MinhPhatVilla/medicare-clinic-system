import auth from './modules/auth/auth.routes';
import appointments from './modules/appointments/appointments.routes';
import doctors from './modules/doctors/doctors.routes';
import patients from './modules/patients/patients.routes';
import examinations from './modules/examinations/examinations.routes';
import invoices from './modules/invoices/invoices.routes';
import reception from './modules/reception/reception.routes';
import serviceOrders from './modules/service-orders/service-orders.routes';
import prescriptions from './modules/prescriptions/prescriptions.routes';
import dashboard from './modules/dashboard/dashboard.routes';

// Both Express and OpenAPI use this registry, including compatibility aliases.
export const apiRouters = {
  auth,
  appointments,
  doctors,
  patients,
  examinations,
  invoices,
  billing: invoices,
  reception,
  'service-orders': serviceOrders,
  prescriptions,
  dashboard,
};
