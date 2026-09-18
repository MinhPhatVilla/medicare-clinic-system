const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { startDatabase, db } = require('./helpers/postgres.cjs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../dist/models/User.entity');
const { Patient } = require('../dist/models/Patient.entity');
const { Doctor } = require('../dist/models/Doctor.entity');
const { Appointment } = require('../dist/models/Appointment.entity');
const { Examination } = require('../dist/models/Examination.entity');
const { Invoice } = require('../dist/models/Invoice.entity');
const { Prescription } = require('../dist/models/Prescription.entity');
const { PrescriptionDetail } = require('../dist/models/PrescriptionDetail.entity');
const { DashboardService } = require('../dist/modules/dashboard/dashboard.service');
const { dashboardQuerySchema } = require('../dist/modules/dashboard/dashboard.dto');
const { buildOpenApi, registeredOperations } = require('../dist/config/openapi');

let database, server, url, actors, doctor, patient, secondPatient, passwordHash;
const save = (entity, values) => db.getRepository(entity).save(db.getRepository(entity).create(values));
const code = prefix => `${prefix}-${randomUUID().slice(0, 16)}`;
const token = actor => jwt.sign({ sub: actor.id }, process.env.JWT_SECRET);
async function request(path, actor, method = 'GET', body) {
  const response = await fetch(`${url}/api/v1${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${typeof actor === 'string' ? actor : token(actor)}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { status: response.status, ...result };
}
async function ok(path, actor, method, body, status = 200) {
  const result = await request(path, actor, method, body);
  assert.equal(result.status, status, JSON.stringify(result));
  return result.data;
}

before(async () => {
  database = await startDatabase({ synchronize: false });
  await db.runMigrations({ transaction: 'each' });
  passwordHash = await bcrypt.hash('Patient@123', 10);
  actors = {};
  for (const role of ['ADMIN', 'MANAGER', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'TECHNICIAN', 'PHARMACIST', 'PATIENT']) {
    actors[role] = await save(User, { email: `${role.toLowerCase()}@test.invalid`, role, fullName: role, password: passwordHash });
  }
  doctor = await save(Doctor, { userId: actors.DOCTOR.id, specialty: 'Đa khoa', consultationFee: 200000, roomNumber: 'P101' });
  patient = await save(Patient, { userId: actors.PATIENT.id, patientCode: code('BN'), fullName: 'Test Patient', phone: '0901234567' });
  secondPatient = await save(Patient, { patientCode: code('BN'), fullName: 'Other Patient', phone: '0901234568' });
  const app = require('../dist/app').default;
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (database) await database.stop();
});

test('fresh database migrates all entities without synchronize and migration rerun is empty', async () => {
  assert.equal(db.entityMetadatas.length, 12);
  for (const entity of db.entityMetadatas) {
    const [{ found }] = await db.query('SELECT to_regclass($1)::text AS found', [entity.tableName]);
    assert.equal(found, entity.tableName);
  }
  assert.deepEqual(await db.runMigrations({ transaction: 'each' }), []);
});

test('OpenAPI covers every route, validation schema and request/response example', async () => {
  const spec = buildOpenApi();
  const operations = registeredOperations();
  assert.ok(operations.length >= 70);
  for (const route of operations) {
    const operation = spec.paths[`/api/v1${route.path}`][route.method];
    assert.ok(operation.summary);
    const response = operation.responses[200] || operation.responses[201];
    assert.ok(response && Object.keys(response.content).length);
    for (const handler of route.handlers) {
      if (handler.validation?.target === 'body') {
        const body = operation.requestBody.content['application/json'];
        assert.ok(body.schema);
        const result = handler.validation.schema.safeParse(body.example);
        assert.equal(result.success, true, `${route.path}: ${result.error?.message}`);
      }
    }
  }
  const response = await fetch(`${url}/api-docs.json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).openapi, '3.0.3');
  assert.equal((await fetch(`${url}/api-docs/`)).status, 200);
});

test('hidden credentials never leak through public doctor or patient relations', async () => {
  for (const [path, actor] of [['/doctors', null], [`/patients/${patient.id}`, actors.ADMIN]]) {
    const response = await request(path, actor);
    assert.equal(response.status, 200);
    assert.doesNotMatch(JSON.stringify(response), /"password"|"refreshToken"|\$2[aby]\$/);
  }
});

test('auth rotates full JWT once, serializes concurrent refresh, rejects malformed subject', async () => {
  const login = await ok('/auth/login', null, 'POST', { email: actors.PATIENT.email, password: 'Patient@123' });
  const previous = login.tokens.refreshToken;
  const refreshed = await ok('/auth/refresh', null, 'POST', { refreshToken: previous });
  assert.notEqual(previous, refreshed.refreshToken);
  assert.equal((await request('/auth/refresh', null, 'POST', { refreshToken: previous })).status, 401);
  const concurrent = await Promise.all([1, 2].map(() => request('/auth/refresh', null, 'POST', { refreshToken: refreshed.refreshToken })));
  assert.deepEqual(concurrent.map(item => item.status).sort(), [200, 401]);
  const badSubject = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET);
  assert.equal((await request('/auth/profile', badSubject)).status, 401);
  assert.equal((await request('/auth/login', null, 'POST', { email: actors.PATIENT.email, password: 'wrong' })).status, 401);
});

test('public registration cannot claim a medical record by phone and cannot assign a staff role', async () => {
  const dto = { email: 'new@test.invalid', password: 'Patient@123', fullName: 'New Patient', phone: secondPatient.phone };
  assert.equal((await request('/auth/register', null, 'POST', dto)).status, 409);
  assert.equal(await db.getRepository(User).countBy({ email: dto.email }), 0);
  const registered = await ok('/auth/register', null, 'POST', { ...dto, phone: '0909999999', role: 'ADMIN' }, 201);
  assert.equal(registered.user.role, 'PATIENT');
});

test('invalid UUID, impossible dates, malformed numbers/JSON and injection payloads fail safely', async () => {
  for (const path of ['/doctors/not-uuid', '/doctors?page=oops', '/doctors?limit=-1', '/doctors?specialty=invalid', '/prescriptions/medicines?page=1abc', '/prescriptions/medicines?isActive=maybe', '/appointments?date=2026-02-30', '/dashboard/revenue?from=2026-09-18&to=2026-09-17', '/dashboard/revenue?from=2026-01-01', '/dashboard/revenue?from=2020-01-01&to=2026-01-01', '/dashboard/revenue?period=day%27%3BDROP%20TABLE%20users--']) {
    assert.equal((await request(path, actors.ADMIN)).status, 422, path);
  }
  const injection = await ok(`/doctors?search=${encodeURIComponent("' OR 1=1; DROP TABLE users; --")}`);
  assert.deepEqual(injection, []);
  const malformed = await fetch(`${url}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(malformed.status, 400);
  assert.equal(await db.getRepository(User).countBy({ role: 'ADMIN' }), 1);
});

test('booking -> check-in -> examination -> CLS -> prescription -> paid -> pharmacy -> discharge', async () => {
  const slot = await ok('/doctors/schedules', actors.DOCTOR, 'POST', { doctorId: doctor.id, workDate: '2026-09-17', startTime: '08:00', endTime: '08:30', maxPatients: 3 }, 201);
  const appointment = await ok('/appointments', actors.PATIENT, 'POST', { doctorId: doctor.id, scheduleId: slot.id, appointmentDate: '2026-09-17', appointmentTime: '08:00', chiefComplaint: 'Test complaint' }, 201);
  assert.equal((await request('/appointments', actors.RECEPTIONIST, 'POST', { doctorId: doctor.id, scheduleId: slot.id, appointmentDate: '2026-09-17', appointmentTime: '08:00', chiefComplaint: 'Test complaint' })).status, 400);
  const received = await ok('/reception/check-in', actors.RECEPTIONIST, 'POST', { appointmentId: appointment.id });
  const examId = received.medicalRecord.id;
  await ok(`/examinations/${examId}/start`, actors.DOCTOR, 'POST');
  await ok(`/examinations/${examId}/draft`, actors.DOCTOR, 'PATCH', { weight: 60, height: 165, diagnosis: 'Test diagnosis' });
  const orders = await ok('/service-orders', actors.DOCTOR, 'POST', { examinationId: examId, services: [{ serviceName: 'Test laboratory', serviceType: 'LAB_TEST', fee: 150000 }] }, 201);
  const orderId = orders.orders[0].id;
  assert.equal((await request(`/service-orders/${orderId}/result`, actors.TECHNICIAN, 'POST', { conclusion: 'Test result' })).status, 400);
  await ok(`/service-orders/examination/${examId}/pay`, actors.CASHIER, 'POST', { examinationId: examId, orderIds: [orderId], paymentMethod: 'CASH' });
  await ok(`/service-orders/${orderId}/result`, actors.TECHNICIAN, 'POST', { conclusion: 'Test result', indicators: [] });
  const completed = await ok(`/prescriptions/examination/${examId}/complete-and-lock`, actors.DOCTOR, 'POST', {
    diagnosis: 'Test diagnosis', icd10Code: 'J06.9', prescription: { medicines: [{ medicineName: 'Test medicine', quantity: 10, unitPrice: 1000, usageInstructions: 'Test instruction' }] },
  });
  assert.equal(completed.examination.isLocked, true);
  assert.equal((await request(`/examinations/${examId}/start`, actors.DOCTOR, 'POST')).status, 400);
  assert.equal((await request(`/examinations/${examId}/draft`, actors.DOCTOR, 'PATCH', { diagnosis: 'Overwrite' })).status, 400);
  assert.equal((await request(`/invoices/${completed.invoice.id}/pay`, actors.PATIENT, 'PATCH', { paymentMethod: 'CASH' })).status, 403);
  const paid = await ok(`/invoices/${completed.invoice.id}/pay`, actors.CASHIER, 'PATCH', { paymentMethod: 'VIET_QR', paymentReference: 'TEST-QR-001' });
  assert.equal(paid.invoice.status, 'PAID');
  assert.equal(paid.invoice.totalAmount, 360000);
  assert.equal(paid.invoice.prepaidAmount, 150000);
  const queue = await ok('/invoices/pharmacy/queue', actors.PHARMACIST);
  assert.ok(queue.items.length > 0);
  for (const status of ['PREPARING', 'READY_TO_DISPENSE', 'DISPENSED']) {
    await ok(`/invoices/pharmacy/prescriptions/${completed.prescription.id}/status`, actors.PHARMACIST, 'PATCH', { status });
  }
  const discharged = await ok(`/invoices/${completed.invoice.id}/discharge`, actors.RECEPTIONIST, 'PATCH');
  assert.ok(discharged.dischargedAt);
  for (const format of ['pdf', 'thermal']) {
    const response = await fetch(`${url}/api/v1/invoices/${completed.invoice.id}/print?format=${format}`, { headers: { Authorization: `Bearer ${token(actors.CASHIER)}` } });
    assert.equal(response.status, 200);
    assert.ok((await response.arrayBuffer()).byteLength > 100);
  }
});

test('ownership filters cannot be overwritten; clinical data and writes are role-scoped', async () => {
  const otherAppointment = await save(Appointment, { patientId: secondPatient.id, doctorId: doctor.id, bookingCode: code('AP'), appointmentDate: '2026-09-17', appointmentTime: '09:00' });
  const otherExam = await save(Examination, { appointmentId: otherAppointment.id, patientId: secondPatient.id, doctorId: doctor.id });
  const filtered = await ok(`/appointments?patientId=${secondPatient.id}`, actors.PATIENT);
  assert.deepEqual(filtered, []);
  for (const path of [`/examinations/${otherExam.id}`, `/examinations/appointment/${otherAppointment.id}`, `/prescriptions/examination/${otherExam.id}`, `/service-orders/examination/${otherExam.id}`, `/service-orders/examination/${otherExam.id}/results`]) {
    assert.equal((await request(path, actors.PATIENT)).status, 403, path);
  }
  assert.equal((await request(`/patients/${patient.id}`, actors.CASHIER, 'PATCH', { fullName: 'Changed' })).status, 403);
  const noProfile = await save(User, { email: 'no-profile@test.invalid', password: passwordHash, fullName: 'No profile', role: 'PATIENT' });
  assert.equal((await request('/appointments', noProfile)).status, 404);
  assert.equal((await request('/dashboard/overview', actors.DOCTOR)).status, 403);
  assert.equal((await request('/dashboard/overview', actors.MANAGER)).status, 200);
});

async function reportFixture(index) {
  const appt = await save(Appointment, { patientId: patient.id, doctorId: doctor.id, bookingCode: code('RP'), appointmentDate: '2025-02-01', appointmentTime: '09:00', status: 'COMPLETED' });
  const exam = await save(Examination, { appointmentId: appt.id, patientId: patient.id, doctorId: doctor.id, status: 'COMPLETED', completedAt: new Date('2025-02-01T09:00:00+07:00'), isLocked: true, diagnosis: `Diagnosis ${index}`, icd10Code: `Z${index}` });
  const invoice = await save(Invoice, { invoiceNumber: code('RHD'), appointmentId: appt.id, examinationId: exam.id, patientId: patient.id, consultationFee: 100, serviceFee: 200, medicineFee: 300, insuranceCovered: 50, discountAmount: 50, totalAmount: 500, status: 'PAID', paymentMethod: 'CASH', paidBy: actors.CASHIER.id, transactionCode: code('RTX'), paidAt: new Date('2025-02-02T09:00:00+07:00') });
  const rx = await save(Prescription, { examinationId: exam.id, prescriptionCode: code('RDT'), totalMedicineFee: 300, paymentStatus: 'PAID', dispensingStatus: 'DISPENSED', paidInvoiceId: invoice.id, paymentConfirmedAt: new Date(), pharmacyNotifiedAt: new Date(), dispensedAt: new Date('2025-02-03T09:00:00+07:00'), dispensedBy: actors.PHARMACIST.id });
  await save(PrescriptionDetail, { prescriptionId: rx.id, medicineName: 'Same Drug', medicineCode: 'SAME', quantity: 2, unit: 'viên', unitPrice: 100, totalPrice: 200 });
  await save(PrescriptionDetail, { prescriptionId: rx.id, medicineName: 'Other Drug', medicineCode: 'OTHER', quantity: 1, unit: 'viên', unitPrice: 100, totalPrice: 100 });
}

test('aggregate reports avoid join fan-out, honor event dates, zero-fill and retain top-5 denominator', async () => {
  for (let index = 0; index < 6; index++) await reportFixture(index);
  await save(Appointment, { patientId: patient.id, doctorId: doctor.id, bookingCode: code('RC'), appointmentDate: '2025-02-01', appointmentTime: '09:00', status: 'CANCELLED' });
  const service = new DashboardService();
  const query = dashboardQuerySchema.parse({ from: '2025-02-01', to: '2025-02-04' });
  const result = await service.overview(query);
  assert.deepEqual(result.revenue.labels, ['2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04']);
  assert.deepEqual(result.revenue.series.find(item => item.key === 'net').data, [0, 3000, 0, 0]);
  assert.equal(result.revenue.totals.consultation, 600);
  assert.equal(result.revenue.totals.services, 1200);
  assert.equal(result.revenue.totals.medicine, 1800);
  assert.equal(result.visits.totals.completed, 6);
  assert.equal(result.visits.totals.cancelled, 1);
  assert.equal(result.doctors.items[0].completedVisits, 6);
  assert.equal(result.doctors.items[0].uniquePatients, 1);
  assert.equal(result.doctors.items[0].netRevenue, 3000);
  assert.equal(result.diagnoses.items.length, 5);
  assert.equal(result.diagnoses.totalDiagnosed, 6);
  assert.equal(result.medicines.items[0].quantity, 12);
  assert.equal(result.medicines.items[0].prescriptions, 6);
  for (const period of ['week', 'month']) assert.equal((await service.revenue({ ...query, period })).totals.net, 3000);
  assert.equal((await service.revenue({ ...query, doctorId: randomUUID() })).totals.net, 0);
  assert.equal((await service.doctors({ ...query, page: 999 })).items.length, 0);
});
