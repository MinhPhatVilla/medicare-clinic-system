const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { startDatabase, db } = require('./helpers/postgres.cjs');

require('reflect-metadata');
require('express-async-errors');
const { Invoice } = require('../dist/models/Invoice.entity');
const { User } = require('../dist/models/User.entity');
const { Patient } = require('../dist/models/Patient.entity');
const { Doctor } = require('../dist/models/Doctor.entity');
const { Appointment } = require('../dist/models/Appointment.entity');
const { Examination } = require('../dist/models/Examination.entity');
const { Prescription } = require('../dist/models/Prescription.entity');
const { PrescriptionDetail } = require('../dist/models/PrescriptionDetail.entity');
const { ServiceOrder } = require('../dist/models/ServiceOrder.entity');
const { InvoicesService } = require('../dist/modules/invoices/invoices.service');
const { PrescriptionsService } = require('../dist/modules/prescriptions/prescriptions.service');
const { ServiceOrdersService } = require('../dist/modules/service-orders/service-orders.service');
const {
  payInvoiceSchema,
  generateInvoiceSchema,
} = require('../dist/modules/invoices/invoices.dto');
const { calculateInvoiceAmounts } = require('../dist/modules/invoices/invoice-integrity');

let database,
  server,
  baseUrl,
  cashier,
  pharmacist,
  patientUser,
  otherPatient,
  doctor,
  patient;
let invoices, prescriptions, services;
const code = (prefix) => `${prefix}-${randomUUID().slice(0, 16)}`;
const save = (entity, values) =>
  db.getRepository(entity).save(db.getRepository(entity).create(values));

before(async () => {
  database = await startDatabase();
  invoices = new InvoicesService();
  prescriptions = new PrescriptionsService();
  services = new ServiceOrdersService();
  const user = (role) =>
    save(User, {
      email: `${code(role)}@example.test`,
      password: 'unused-test-hash',
      role,
      fullName: role,
    });
  cashier = await user('CASHIER');
  pharmacist = await user('PHARMACIST');
  patientUser = await user('PATIENT');
  otherPatient = await user('PATIENT');
  const doctorUser = await user('DOCTOR');
  doctor = await save(Doctor, {
    userId: doctorUser.id,
    specialty: 'Đa khoa',
    consultationFee: 200000,
  });
  patient = await save(Patient, {
    userId: patientUser.id,
    patientCode: code('BN'),
    fullName: 'Nguyễn Thị Hồng',
    phone: '0901234567',
  });

  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/invoices', require('../dist/modules/invoices/invoices.routes').default);
  app.use((err, req, res, next) =>
    res
      .status(err.statusCode || (err.name === 'ZodError' ? 422 : 500))
      .json({ message: err.message }),
  );
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/invoices`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (database) await database.stop();
});

async function fixture({
  medicine = true,
  medicineFee = 12000,
  locked = true,
  orderFee = 0,
  count = 1,
} = {}) {
  const appointment = await save(Appointment, {
    bookingCode: code('PK'),
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: '2026-09-17',
    appointmentTime: '09:00',
    status: locked ? 'COMPLETED' : 'IN_PROGRESS',
  });
  const exam = await save(Examination, {
    appointmentId: appointment.id,
    patientId: patient.id,
    doctorId: doctor.id,
    status: locked ? 'COMPLETED' : 'IN_PROGRESS',
    isLocked: locked,
  });
  let rx;
  if (medicine) {
    rx = await save(Prescription, {
      examinationId: exam.id,
      prescriptionCode: code('DT'),
      totalMedicineFee: medicineFee * count,
    });
    for (let index = 0; index < count; index++) {
      await save(PrescriptionDetail, {
        prescriptionId: rx.id,
        medicineName: `Thuốc điều trị ${index + 1}`,
        quantity: 1,
        unitPrice: medicineFee,
        totalPrice: medicineFee,
        unit: 'viên',
      });
    }
  }
  let order;
  if (orderFee)
    order = await save(ServiceOrder, {
      examinationId: exam.id,
      orderNumber: code('CLS'),
      serviceName: 'Xét nghiệm',
      serviceType: 'LAB_TEST',
      fee: orderFee,
    });
  const invoice = await invoices.generateInvoiceFromExamination(exam.id);
  return { appointment, exam, rx, order, invoice };
}

function request(path, actor, options = {}) {
  const jwt = require('jsonwebtoken');
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(actor
        ? { Authorization: `Bearer ${jwt.sign({ sub: actor.id }, process.env.JWT_SECRET)}` }
        : {}),
      ...options.headers,
    },
  });
}

test('validates payment methods and exact decimal money', () => {
  const { decimalTransformer } = require('../dist/utils/transformers');
  assert.equal(decimalTransformer.to(undefined), undefined);
  assert.equal(decimalTransformer.to(null), null);
  assert.equal(require('../dist/config/env').env.DB_SYNCHRONIZE, false);
  for (const method of ['CASH', 'VIET_QR', 'POS_CARD'])
    assert.equal(payInvoiceSchema.parse({ paymentMethod: method }).paymentMethod, method);
  assert.equal(payInvoiceSchema.safeParse({ paymentMethod: 'BITCOIN' }).success, false);
  assert.deepEqual(generateInvoiceSchema.parse({}), {});
  assert.equal(generateInvoiceSchema.safeParse({ discountAmount: 0.001 }).success, false);
  assert.throws(() =>
    calculateInvoiceAmounts({
      consultationFee: 10,
      serviceFee: 0,
      medicineFee: 0,
      discountAmount: 11,
      insuranceCovered: 0,
    }),
  );
});

test('all three payment methods commit metadata and enqueue paid prescriptions', async () => {
  for (const method of ['CASH', 'VIET_QR', 'POS_CARD']) {
    const { invoice, rx } = await fixture();
    const result = await invoices.payInvoice(
      invoice.id,
      { paymentMethod: method, paymentReference: 'REF-01' },
      cashier.id,
    );
    assert.equal(result.invoice.status, 'PAID');
    assert.match(result.transaction.transactionCode, /^TXN-/);
    assert.equal(result.transaction.amount, 212000);
    assert.equal(result.invoice.paidByUserId, cashier.id);
    const savedRx = await db.getRepository(Prescription).findOneByOrFail({ id: rx.id });
    assert.equal(savedRx.paidInvoiceId, invoice.id);
    assert.equal(savedRx.dispensingStatus, 'READY_TO_PREPARE');
    assert.equal(savedRx.paymentConfirmedAt.getTime(), result.invoice.paidAt.getTime());
  }
});

test('simultaneous confirmations collect once and never overwrite transaction metadata', async () => {
  const { invoice } = await fixture();
  const results = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id),
    ),
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const paid = results.find((result) => result.status === 'fulfilled').value.invoice;
  assert.equal(
    (await db.getRepository(Invoice).findOneByOrFail({ id: invoice.id })).transactionCode,
    paid.transactionCode,
  );
});

test('simultaneous invoice generation creates one invoice', async () => {
  const { invoice, exam } = await fixture();
  await db.getRepository(Invoice).delete(invoice.id);
  const generated = await Promise.all(
    Array.from({ length: 3 }, () => invoices.generateInvoiceFromExamination(exam.id)),
  );
  assert.equal(new Set(generated.map((item) => item.id)).size, 1);
});

test('pharmacy failure rolls back payment and service-order status', async () => {
  const { invoice, rx, order } = await fixture({ orderFee: 1000 });
  await db.getRepository(Prescription).update(rx.id, { dispensingStatus: 'CANCELLED' });
  await assert.rejects(invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id));
  const unchanged = await db.getRepository(Invoice).findOneByOrFail({ id: invoice.id });
  assert.equal(unchanged.status, 'PENDING');
  assert.equal(unchanged.transactionCode, null);
  assert.equal(
    (await db.getRepository(ServiceOrder).findOneByOrFail({ id: order.id })).status,
    'ORDERED',
  );
});

test('free prescriptions still reach pharmacy and unpaid prescriptions do not', async () => {
  const { invoice, rx } = await fixture({ medicineFee: 0 });
  const unpaid = await fixture();
  await invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id);
  const queue = await invoices.getPharmacyQueue({ page: 1, limit: 100 });
  assert.ok(queue.items.some((item) => item.prescriptionId === rx.id));
  assert.ok(!queue.items.some((item) => item.prescriptionId === unpaid.rx.id));
});

test('rejects stale fees, unfinished visits and terminal invoices', async () => {
  const { invoice, rx } = await fixture();
  await db
    .getRepository(PrescriptionDetail)
    .update({ prescriptionId: rx.id }, { unitPrice: 13000, totalPrice: 13000 });
  await assert.rejects(invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id));
  const unfinished = await fixture({ locked: false });
  await assert.rejects(
    invoices.payInvoice(unfinished.invoice.id, { paymentMethod: 'CASH' }, cashier.id),
  );
  for (const status of ['CANCELLED', 'REFUNDED', 'PARTIALLY_PAID']) {
    await db.getRepository(Invoice).update(invoice.id, { status });
    await assert.rejects(invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id));
    await assert.rejects(
      invoices.generateInvoiceFromExamination(
        (await db.getRepository(Invoice).findOneByOrFail({ id: invoice.id })).examinationId,
      ),
    );
  }
});

test('database rejects inconsistent totals, missing metadata, negative fees and orphan references', async () => {
  const { invoice, rx } = await fixture();
  for (const changes of [
    { totalAmount: 1 },
    { consultationFee: -1 },
    { discountAmount: 999999 },
    { status: 'PAID' },
    { paidByUserId: randomUUID() },
    { prepaidAmount: 999999 },
    { dischargedAt: new Date() },
  ]) {
    await assert.rejects(db.getRepository(Invoice).update(invoice.id, changes));
  }
  await assert.rejects(
    db.getRepository(Prescription).update(rx.id, { dispensingStatus: 'PREPARING' }),
  );
  await assert.rejects(
    db.getRepository(Prescription).update(rx.id, { paidInvoiceId: randomUUID() }),
  );
});

test('paid charges cannot be regenerated, cancelled or replaced', async () => {
  const { invoice, exam, order } = await fixture({ orderFee: 1000 });
  await invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id);
  await assert.rejects(invoices.generateInvoiceFromExamination(exam.id));
  await assert.rejects(services.cancelOrder(order.id));
  await assert.rejects(services.updateOrderStatus(order.id, { status: 'CANCELLED' }));
  await assert.rejects(prescriptions.createPrescription({ examinationId: exam.id, medicines: [] }));
});

test('CLS prepayment is deducted once at final settlement', async () => {
  const { invoice, exam } = await fixture({ orderFee: 50000, locked: false });
  const collected = await services.payOrders(
    { examinationId: exam.id, paymentMethod: 'CASH' },
    cashier.id,
  );
  assert.equal(collected.invoice.prepaidAmount, 50000);
  await assert.rejects(
    services.payOrders({ examinationId: exam.id, paymentMethod: 'CASH' }, cashier.id),
  );
  await db.getRepository(Examination).update(exam.id, { isLocked: true, status: 'COMPLETED' });
  const result = await invoices.payInvoice(invoice.id, { paymentMethod: 'POS_CARD' }, cashier.id);
  assert.equal(result.transaction.amount, 212000);
});

test('prescription edits roll back when deductions exceed the new total', async () => {
  const { invoice, exam, rx } = await fixture({ locked: false });
  await invoices.generateInvoiceFromExamination(exam.id, { discountAmount: 210000 });
  await assert.rejects(
    prescriptions.createPrescription({
      examinationId: exam.id,
      medicines: [{ medicineName: 'Replacement', quantity: 1, unitPrice: 0, unit: 'viên' }],
    }),
  );
  const details = await db.getRepository(PrescriptionDetail).findBy({ prescriptionId: rx.id });
  assert.equal(details.length, 1);
  assert.equal(details[0].totalPrice, 12000);
  assert.equal(
    (await db.getRepository(Invoice).findOneByOrFail({ id: invoice.id })).totalAmount,
    2000,
  );
});

test('dispensing follows the paid workflow and discharge requires receipt of medicine', async () => {
  const { invoice, rx } = await fixture();
  await assert.rejects(invoices.updateDispensingStatus(rx.id, 'PREPARING', pharmacist.id));
  await invoices.payInvoice(invoice.id, { paymentMethod: 'CASH' }, cashier.id);
  await assert.rejects(invoices.discharge(invoice.id, cashier.id));
  await assert.rejects(invoices.updateDispensingStatus(rx.id, 'DISPENSED', pharmacist.id));
  for (const status of ['PREPARING', 'READY_TO_DISPENSE', 'DISPENSED']) {
    await invoices.updateDispensingStatus(rx.id, status, pharmacist.id);
  }
  const discharged = await invoices.discharge(invoice.id, cashier.id);
  assert.ok(discharged.dischargedAt);
  assert.equal(discharged.dischargedByUserId, cashier.id);
  assert.equal(
    (await invoices.discharge(invoice.id, pharmacist.id)).dischargedByUserId,
    cashier.id,
  );
});

test('PDF preserves Vietnamese and every line across pages; thermal lines fit 42 columns', async () => {
  const { invoice } = await fixture({ count: 100 });
  await invoices.payInvoice(invoice.id, { paymentMethod: 'VIET_QR' }, cashier.id);
  const pdf = await invoices.exportInvoice(invoice.id, { format: 'pdf' }, patientUser);
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf.body), useSystemFonts: false });
  const document = await loading.promise;
  assert.ok(document.numPages > 1);
  let text = '';
  for (let page = 1; page <= document.numPages; page++) {
    text += (await (await document.getPage(page)).getTextContent()).items
      .map((item) => item.str)
      .join(' ');
  }
  assert.ok(text.includes('Nguyễn Thị Hồng'));
  assert.ok(text.includes('Thuốc điều trị 100'));
  if (process.env.INVOICE_TEST_ARTIFACT_DIR) {
    const directory = process.env.INVOICE_TEST_ARTIFACT_DIR;
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'invoice.pdf'), pdf.body);
    const { createCanvas } = require('@napi-rs/canvas');
    for (const pageNumber of [1, document.numPages]) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      writeFileSync(
        join(directory, `invoice-page-${pageNumber}.png`),
        canvas.toBuffer('image/png'),
      );
    }
  }
  await loading.destroy();
  const thermal = await invoices.exportInvoice(invoice.id, { format: 'thermal' }, patientUser);
  assert.ok(thermal.body.split('\n').every((line) => line.length <= 42));
});

test('HTTP enforces authentication, cashier/pharmacist roles, ownership and UUID validation', async () => {
  const { invoice } = await fixture();
  assert.equal((await request(`/${invoice.id}`, null)).status, 401);
  assert.equal((await request(`/${invoice.id}`, otherPatient)).status, 403);
  const detail = await request(`/${invoice.id}`, patientUser);
  assert.ok(!(await detail.text()).includes('unused-test-hash'));
  assert.equal((await request('/not-a-uuid', cashier)).status, 422);
  assert.equal((await request('/pharmacy/queue', cashier)).status, 403);
  assert.equal(
    (
      await request(`/${invoice.id}/pay`, pharmacist, {
        method: 'PATCH',
        body: JSON.stringify({ paymentMethod: 'CASH' }),
      })
    ).status,
    403,
  );
  assert.equal((await request(`/${invoice.id}/print`, patientUser)).status, 400);
  assert.equal(
    (
      await request(`/${invoice.id}/pay`, cashier, {
        method: 'PATCH',
        body: JSON.stringify({ paymentMethod: 'POS_CARD' }),
      })
    ).status,
    200,
  );
  assert.equal((await request(`/${invoice.id}/print`, otherPatient)).status, 403);
  const printed = await request(`/${invoice.id}/print`, patientUser);
  assert.equal(printed.headers.get('content-type'), 'application/pdf');
  assert.equal(printed.headers.get('cache-control'), 'no-store');
});

test('pharmacy SSE emits a committed queue revision', async () => {
  const abort = new AbortController();
  const response = await request('/pharmacy/events', pharmacist, { signal: abort.signal });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  const { value } = await reader.read();
  assert.match(new TextDecoder().decode(value), /event: pharmacy.queue.changed/);
  abort.abort();
});

test('production migration is compatible with the synchronized schema', async () => {
  db.setOptions({ synchronize: false });
  await db.runMigrations();
  assert.equal(await db.showMigrations(), false);
});

test('legacy migration rolls back invalid data and preserves audited historical payments', async () => {
  const { DataSource } = require('typeorm');
  const {
    InvoicePaymentWorkflow1789600000000,
  } = require('../dist/migrations/1789600000000-InvoicePaymentWorkflow');
  await db.query('CREATE DATABASE invoice_legacy_test');
  const legacy = new DataSource({
    ...db.options,
    database: 'invoice_legacy_test',
    synchronize: false,
    entities: [],
    migrations: [InvoicePaymentWorkflow1789600000000],
  });
  await legacy.initialize();
  try {
    await legacy.query(`
      CREATE TYPE invoices_payment_method_enum AS ENUM ('CASH', 'VIET_QR');
      CREATE TYPE users_role_enum AS ENUM ('CASHIER');
      CREATE TABLE users (id uuid PRIMARY KEY, role users_role_enum);
      CREATE TABLE invoices (
        id uuid PRIMARY KEY, examination_id uuid, status varchar(30),
        consultation_fee numeric(12,2) NOT NULL, service_fee numeric(12,2) NOT NULL,
        medicine_fee numeric(12,2) NOT NULL, insurance_covered numeric(12,2) NOT NULL,
        discount_amount numeric(12,2) NOT NULL, total_amount numeric(12,2) NOT NULL,
        payment_method invoices_payment_method_enum, paid_at timestamp, paid_by_user_id varchar
      );
      CREATE TABLE prescriptions (id uuid PRIMARY KEY);
    `);
    const historicalId = randomUUID();
    await legacy.query('INSERT INTO users VALUES ($1, $2)', [cashier.id, 'CASHIER']);
    await legacy.query(
      `INSERT INTO invoices VALUES ($1, $2, 'PAID', 200000, 0, 0, 0, 0, 1, 'CASH', '2025-01-01 09:00:00', $3)`,
      [historicalId, randomUUID(), cashier.id],
    );
    await assert.rejects(legacy.runMigrations());
    const columns = await legacy.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'transaction_code'",
    );
    assert.equal(columns.length, 0);
    await legacy.query('UPDATE invoices SET total_amount = 200000');
    await legacy.runMigrations();
    const [paid] = await legacy.query('SELECT * FROM invoices');
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.transaction_code, `OLD-${historicalId.replaceAll('-', '')}`);
    assert.equal(paid.paid_by_user_id, cashier.id);
    assert.equal(Number(paid.total_amount), 200000);
    assert.equal(Number(paid.prepaid_amount), 0);
  } finally {
    await legacy.destroy();
  }
});
