export const exampleId = '11111111-1111-4111-8111-111111111111';
const id = exampleId;
const date = '2026-09-17';
const timestamp = `${date}T02:00:00.000Z`;
const page = { page: 1, limit: 10, total: 1, totalPages: 1 };
const user = {
  id,
  email: 'patient@medicare.vn',
  fullName: 'Nguyen Van An',
  role: 'PATIENT',
  phone: '0912345678',
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const patient = {
  id,
  userId: id,
  patientCode: 'BN-DEMO',
  fullName: 'Nguyen Van An',
  phone: '0912345678',
  dateOfBirth: '1990-05-15',
  gender: 'MALE',
  isActive: true,
};
const doctor = {
  id,
  userId: id,
  specialty: 'Da khoa',
  consultationFee: 200000,
  roomNumber: 'P101',
  isAvailable: true,
  user: { id, fullName: 'Bac si Nguyen' },
};
const slot = {
  id,
  doctorId: id,
  workDate: date,
  startTime: '08:00:00',
  endTime: '08:30:00',
  maxPatients: 3,
  bookedPatients: 1,
  isAvailable: true,
};
const appointment = {
  id,
  patientId: id,
  doctorId: id,
  scheduleId: id,
  bookingCode: 'PKB-DEMO',
  appointmentDate: date,
  appointmentTime: '08:00:00',
  status: 'CONFIRMED',
  patient,
  doctor,
};
const examination = {
  id,
  appointmentId: id,
  patientId: id,
  doctorId: id,
  status: 'IN_PROGRESS',
  isLocked: false,
  isDraft: true,
  diagnosis: 'Chan doan mau',
  weight: '60.00',
  height: '165.00',
  appointment,
};
const invoice = {
  id,
  invoiceNumber: 'HD-DEMO',
  appointmentId: id,
  examinationId: id,
  patientId: id,
  consultationFee: 200000,
  serviceFee: 150000,
  medicineFee: 10000,
  insuranceCovered: 0,
  discountAmount: 0,
  prepaidAmount: 0,
  totalAmount: 360000,
  status: 'PENDING',
  paidAt: null,
  transactionCode: null,
};
const paidInvoice = {
  ...invoice,
  status: 'PAID',
  paidAt: timestamp,
  paymentMethod: 'CASH',
  paidBy: id,
  transactionCode: 'TXN-DEMO',
};
const medicine = {
  id,
  code: 'TH_DEMO',
  name: 'Thuoc mau',
  activeIngredient: 'Hoat chat mau',
  unit: 'vien',
  unitPrice: 1000,
  isActive: true,
};
const detail = {
  id,
  prescriptionId: id,
  medicineId: id,
  medicineName: 'Thuoc mau',
  quantity: 10,
  unitPrice: 1000,
  totalPrice: 10000,
  unit: 'vien',
  usageInstructions: 'Theo chi dinh bac si',
};
const prescription = {
  id,
  examinationId: id,
  prescriptionCode: 'DT-DEMO',
  totalMedicineFee: 10000,
  paymentStatus: 'PENDING_PAYMENT',
  dispensingStatus: 'WAITING_PAYMENT',
  details: [detail],
};
const service = {
  id,
  code: 'XN_CBC',
  name: 'Xet nghiem mau',
  serviceType: 'LAB_TEST',
  price: 150000,
  unit: 'Lan',
  isActive: true,
};
const order = {
  id,
  examinationId: id,
  serviceId: id,
  serviceName: service.name,
  serviceType: 'LAB_TEST',
  fee: 150000,
  status: 'ORDERED',
  performedAt: null,
};
const tokens = { accessToken: 'eyJ...access.signature', refreshToken: 'eyJ...refresh.signature' };
const reportMeta = {
  from: date,
  to: date,
  period: 'day',
  doctorId: null,
  currency: 'VND',
  timeZone: 'Asia/Ho_Chi_Minh',
  revenueBasis: 'PAID_AT',
  visitsBasis: 'APPOINTMENT_DATE',
  clinicalBasis: 'COMPLETED_AT',
  medicinesBasis: 'DISPENSED_AT',
};
const revenue = {
  meta: reportMeta,
  labels: [date],
  series: [
    { key: 'consultation', label: 'Tien kham', data: [200000] },
    { key: 'services', label: 'Tien CLS', data: [150000] },
    { key: 'medicine', label: 'Tien thuoc', data: [10000] },
    { key: 'net', label: 'Doanh thu', data: [360000] },
  ],
  totals: {
    consultation: 200000,
    services: 150000,
    medicine: 10000,
    net: 360000,
    gross: 360000,
    invoices: 1,
    prepaid: 0,
    settlementCash: 360000,
    insurance: 0,
    discount: 0,
  },
};
const visits = {
  meta: reportMeta,
  labels: [date],
  series: [{ key: 'completed', label: 'Da kham', data: [1] }],
  totals: { completed: 1, cancelled: 0, waiting: 0, inProgress: 0, noShow: 0, total: 1 },
};
const doctors = {
  meta: reportMeta,
  items: [
    {
      id,
      fullName: 'Bac si Nguyen',
      specialty: 'Da khoa',
      completedVisits: 1,
      uniquePatients: 1,
      paidInvoices: 1,
      netRevenue: 360000,
      consultation: 200000,
      services: 150000,
      medicine: 10000,
    },
  ],
  pagination: page,
};
const diagnoses = {
  meta: reportMeta,
  items: [
    {
      key: 'ICD10:J06.9',
      code: 'J06.9',
      label: 'Chan doan mau',
      count: 1,
      totalDiagnosed: 1,
      period: 'day',
    },
  ],
  totalDiagnosed: 1,
};
const medicines = {
  meta: reportMeta,
  items: [
    {
      key: `ID:${id}`,
      medicineId: id,
      code: 'TH_DEMO',
      label: 'Thuoc mau',
      unit: 'vien',
      quantity: 10,
      prescriptions: 1,
      grossAmount: 10000,
      period: 'day',
    },
  ],
};

type EndpointDoc = {
  summary: string;
  data: unknown;
  status?: number;
  paginated?: boolean;
  description?: string;
};
const doc = (summary: string, data: unknown, status = 200, paginated = false): EndpointDoc => ({
  summary,
  data,
  status,
  paginated,
});
const list = (item: unknown) => ({ items: [item], pagination: page });

/** Explicit response examples: adding an endpoint without a contract fails the coverage test. */
export const endpointDocs: Record<string, EndpointDoc> = {
  'POST /auth/register': doc(
    'Dang ky benh nhan moi; khong tu lien ket ho so cu',
    { user: { ...user, patient }, tokens },
    201,
  ),
  'POST /auth/login': doc('Dang nhap va cap cap JWT', { user, tokens }),
  'POST /auth/refresh': doc('Xoay vong refresh token; token cu chi dung mot lan', tokens),
  'POST /auth/logout': doc('Thu hoi refresh token', null),
  'POST /auth/change-password': doc('Doi mat khau va thu hoi refresh token', null),
  'GET /auth/profile': doc('Ho so tai khoan dang dang nhap', { ...user, patient, doctor: null }),
  'GET /appointments': doc('Danh sach lich hen theo pham vi tai khoan', [appointment], 200, true),
  'GET /appointments/my': doc('Lich hen cua benh nhan / bac si hien tai', [appointment], 200, true),
  'POST /appointments': doc('Dat lich; nhan vien phai truyen patientId', appointment, 201),
  'GET /appointments/{id}': doc('Chi tiet lich hen duoc phep truy cap', appointment),
  'PATCH /appointments/{id}/cancel': doc('Huy lich chua tiep nhan va hoan slot', {
    ...appointment,
    status: 'CANCELLED',
  }),
  'PATCH /appointments/{id}/reschedule': doc('Doi slot trong mot giao dich', appointment),
  'PATCH /appointments/{id}/status': doc(
    'Xac nhan, huy, hoac danh dau khong den; khong bo qua luong kham',
    appointment,
  ),
  'POST /appointments/checkin/{bookingCode}': doc('Check-in bang ma dat lich', {
    ...appointment,
    status: 'CHECKED_IN',
    priorityNumber: 1,
  }),
  'GET /patients': doc('Tim ho so benh nhan co phan trang', [patient], 200, true),
  'GET /patients/lookup': doc('Tra cuu bang SDT, ma benh nhan hoac CCCD', patient),
  'GET /patients/me': doc('Ho so benh nhan cua toi', patient),
  'GET /patients/{id}': doc('Chi tiet ho so benh nhan', patient),
  'POST /patients': doc('Le tan tao ho so tai quay', patient, 201),
  'PATCH /patients/{id}': doc('Cap nhat ho so trong pham vi cho phep', patient),
  'DELETE /patients/{id}': doc('Vo hieu hoa, khong xoa lich su', null),
  'GET /doctors': doc('Danh sach bac si dang hoat dong', [doctor], 200, true),
  'GET /doctors/{id}': doc('Chi tiet bac si va lich lam viec', { ...doctor, schedules: [slot] }),
  'PATCH /doctors/{id}': doc('Cap nhat ho so bac si', doctor),
  'GET /doctors/{id}/available-slots': doc('Slot con cho theo ngay / khoang ngay', [
    { ...slot, remainingSlots: 2, doctor },
  ]),
  'GET /doctors/{id}/schedule': doc('Lich lam viec; alias cua schedules', [slot]),
  'GET /doctors/{id}/schedules': doc('Lich lam viec cua bac si', [slot]),
  'POST /doctors/schedules': doc('Tao slot khong trung bac si hoac phong', slot, 201),
  'POST /doctors/schedules/bulk': doc('Chia ca thanh nhieu slot', [slot], 201),
  'DELETE /doctors/schedules/{scheduleId}': doc('Xoa slot chua co benh nhan', null),
  'GET /reception/appointments/today': doc('Tra cuu lich hen trong ngay', [appointment], 200, true),
  'POST /reception/check-in': doc('Cap so thu tu va tao phieu kham WAITING', {
    message: 'Check-in thanh cong',
    appointment: { ...appointment, status: 'CHECKED_IN' },
    medicalRecord: { ...examination, status: 'WAITING' },
    priorityNumber: 1,
    alreadyCheckedIn: false,
  }),
  'POST /reception/walk-in': doc(
    'Tiep nhan benh nhan vang lai',
    {
      patient,
      doctor,
      appointment,
      medicalRecord: examination,
      priorityNumber: 1,
      message: 'Tiep nhan thanh cong',
    },
    201,
  ),
  'GET /reception/queue/{doctorId}': doc('Hang doi theo bac si', {
    date,
    doctor,
    totalWaiting: 1,
    currentInProgress: null,
    queue: [appointment],
  }),
  'GET /examinations/queue': doc('Hang doi bac si hien tai; admin xem tat ca', {
    date,
    doctor,
    total: 1,
    currentInProgress: null,
    queue: [
      { appointmentId: id, examinationId: id, patient, status: 'CHECKED_IN', priorityNumber: 1 },
    ],
  }),
  'GET /examinations/appointment/{appointmentId}': doc('Phieu kham theo lich hen', examination),
  'GET /examinations/{id}': doc('Phieu kham duoc phep truy cap', examination),
  'POST /examinations/{id}/start': doc(
    'Bat dau ca da check-in; khong mo lai ca da khoa',
    examination,
  ),
  'PATCH /examinations/{id}/draft': doc('Luu nhap sinh hieu va lam sang', examination),
  'POST /examinations/{id}/complete': doc('Hoan tat, khoa ho so va tong hop hoa don', {
    ...examination,
    status: 'COMPLETED',
    isLocked: true,
    isDraft: false,
    completedAt: timestamp,
  }),
  'GET /service-orders/catalog': doc('Danh muc va bang gia dich vu', list(service)),
  'POST /service-orders/catalog': doc('Them dich vu niem yet', service, 201),
  'GET /service-orders/technician/queue': doc(
    'Hang doi ky thuat vien',
    list({ ...order, patient, examinationId: id }),
  ),
  'POST /service-orders': doc(
    'Tao chi dinh va dong bo hoa don tam tinh',
    { orders: [order], totalNewFee: 150000, estimatedInvoice: invoice },
    201,
  ),
  'GET /service-orders/examination/{examinationId}': doc('Chi dinh va tong hop chi phi ca kham', {
    examinationId: id,
    appointmentId: id,
    patient,
    orders: [order],
    stats: {
      totalOrders: 1,
      orderedCount: 1,
      paidCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalFee: 150000,
      paidFee: 0,
    },
    estimatedInvoice: invoice,
  }),
  'GET /service-orders/examination/{examinationId}/results': doc('Ket qua CLS cua phieu kham', {
    examinationId: id,
    results: [order],
  }),
  'POST /service-orders/examination/{examinationId}/pay': doc(
    'Thu truoc CLS, tru vao so tien thu cuoi cung',
    {
      paidOrders: [{ ...order, status: 'PAID' }],
      paidTotal: 150000,
      invoice: { ...invoice, prepaidAmount: 150000 },
    },
  ),
  'PATCH /service-orders/{id}/status': doc(
    'Thuc hien chi dinh da thu tien hoac huy chi dinh chua thu',
    { ...order, status: 'IN_PROGRESS' },
  ),
  'POST /service-orders/{id}/result': doc('Nhap ket qua CLS da thu tien', {
    ...order,
    status: 'COMPLETED',
    conclusion: 'Ket qua mau',
    indicators: [],
    attachments: [],
    performedAt: timestamp,
    performedByUserId: id,
  }),
  'DELETE /service-orders/{id}': doc('Huy chi dinh chua thu tien', {
    ...order,
    status: 'CANCELLED',
  }),
  'GET /prescriptions/medicines': doc('Danh muc thuoc', list(medicine)),
  'GET /prescriptions/icd10': doc('Danh muc ICD-10 mau; khong phai toan bo ICD-10', {
    items: [{ code: 'J06.9', name: 'Chan doan mau', group: 'Ho hap' }],
    total: 1,
    note: 'Danh muc mau',
  }),
  'POST /prescriptions': doc(
    'Ke don / thay the don chua khoa',
    { prescription, totalMedicineFee: 10000 },
    201,
  ),
  'GET /prescriptions/examination/{examinationId}': doc('Don thuoc cua ca kham', prescription),
  'POST /prescriptions/examination/{examinationId}/complete-and-lock': doc(
    'Chot chan doan, don thuoc, khoa ho so va tao hoa don',
    {
      examination: { ...examination, status: 'COMPLETED', isLocked: true },
      prescription,
      invoice,
      message: 'Hoan tat kham',
    },
  ),
  'GET /invoices': doc('Danh sach hoa don cho thu ngan', list(invoice)),
  'POST /invoices/generate-from-examination/{examinationId}': doc(
    'Tong hop hoa don va ap dung giam tru',
    invoice,
    201,
  ),
  'GET /invoices/{id}': doc('Hoa don va bang ke chi tiet', {
    invoice,
    breakdown: {
      consultation: {
        fee: 200000,
        doctorName: 'Bac si Nguyen',
        specialty: 'Da khoa',
        roomNumber: 'P101',
      },
      serviceOrders: [order],
      totalServiceFee: 150000,
      prescription: { ...prescription, items: [detail] },
      summary: { ...invoice, collectedAmount: 360000 },
    },
  }),
  'PATCH /invoices/{id}/pay': doc(
    'Xac nhan thu tien mat, QR hoac POS; khong tu goi cong thanh toan',
    {
      invoice: paidInvoice,
      transaction: { code: 'TXN-DEMO', amount: 360000, paymentMethod: 'CASH', paidAt: timestamp },
      pharmacySignal: { prescriptionId: id, dispensingStatus: 'READY_TO_PREPARE' },
      discharge: { ready: false },
    },
  ),
  'PATCH /invoices/{id}/discharge': doc('Xuat vien sau PAID, hoan tat CLS va phat thuoc', {
    ...paidInvoice,
    dischargedAt: timestamp,
    dischargedBy: id,
  }),
  'GET /invoices/{id}/print': doc('Xuat PDF Unicode hoac phieu in nhiet 42 cot', null),
  'GET /invoices/pharmacy/queue': doc(
    'Don thuoc da tra tien dang cho nha thuoc',
    list({
      prescriptionId: id,
      prescriptionCode: 'DT-DEMO',
      patient,
      dispensingStatus: 'READY_TO_PREPARE',
      medicines: [detail],
    }),
  ),
  'GET /invoices/pharmacy/events': doc(
    'SSE pharmacy.queue.changed; ket noi lai sau 60 giay; Bearer header',
    null,
  ),
  'PATCH /invoices/pharmacy/prescriptions/{id}/status': doc(
    'Chuyen tu chuan bi den san sang va da phat thuoc',
    { ...prescription, paymentStatus: 'PAID', dispensingStatus: 'PREPARING' },
  ),
  'GET /dashboard/overview': doc('Toan bo bao cao tren cung snapshot nhat quan', {
    meta: reportMeta,
    revenue,
    visits,
    doctors,
    diagnoses,
    medicines,
  }),
  'GET /dashboard/revenue': doc(
    'Doanh thu PAID theo ngay / tuan ISO / thang; CLS bao gom xet nghiem va dich vu khac',
    revenue,
  ),
  'GET /dashboard/visits': doc('Luot kham theo ngay hen va trang thai hien tai', visits),
  'GET /dashboard/doctors': doc(
    'Hieu suat bac si; doanh thu theo ngay PAID, so ca theo ngay hoan tat',
    doctors,
  ),
  'GET /dashboard/diagnoses': doc(
    'Top 5 chan doan; uu tien ma ICD, con lai chuan hoa van ban',
    diagnoses,
  ),
  'GET /dashboard/medicines': doc('Top thuoc da DISPENSED; khong phai so ton kho', medicines),
};

export function responseExample(entry: EndpointDoc): Record<string, unknown> {
  return {
    success: true,
    message: entry.summary,
    data: entry.data,
    ...(entry.paginated ? { meta: page } : {}),
  };
}
