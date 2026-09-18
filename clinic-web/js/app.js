/* ============================================================
   CLINIC APPOINTMENT SYSTEM — Application Logic
   SPA Router, Views, Mock Data, Event Handlers
   ============================================================ */

// ─── Mock Data ───
const MOCK_DATA = {
  specialties: [
    { id: 1, name: 'Nội khoa', icon: '🫀', count: 5 },
    { id: 2, name: 'Nhi khoa', icon: '👶', count: 3 },
    { id: 3, name: 'Cơ xương khớp', icon: '🦴', count: 4 },
    { id: 4, name: 'Thần kinh', icon: '🧠', count: 2 },
    { id: 5, name: 'Mắt', icon: '👁️', count: 3 },
    { id: 6, name: 'Tai Mũi Họng', icon: '👂', count: 3 },
    { id: 7, name: 'Da liễu', icon: '🧴', count: 2 },
    { id: 8, name: 'Răng Hàm Mặt', icon: '🦷', count: 4 },
  ],
  doctors: [
    { id: 1, name: 'TS.BS Trần Thị Minh', specialty: 1, title: 'Trưởng khoa Nội', exp: 15, avatar: 'TM' },
    { id: 2, name: 'ThS.BS Nguyễn Văn Hùng', specialty: 1, title: 'Phó khoa Nội', exp: 10, avatar: 'VH' },
    { id: 3, name: 'PGS.TS Lê Hoàng Nam', specialty: 3, title: 'Chuyên gia Cơ xương khớp', exp: 20, avatar: 'HN' },
    { id: 4, name: 'BS.CKI Phạm Thu Hà', specialty: 2, title: 'Bác sĩ Nhi khoa', exp: 8, avatar: 'TH' },
    { id: 5, name: 'TS.BS Vũ Đức Anh', specialty: 4, title: 'Chuyên gia Thần kinh', exp: 12, avatar: 'DA' },
    { id: 6, name: 'BS.CKII Đỗ Minh Tuấn', specialty: 5, title: 'Bác sĩ Mắt', exp: 14, avatar: 'MT' },
  ],
  timeSlots: {
    morning: ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
    afternoon: ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
  },
  patients: [
    { id: 1, name: 'Nguyễn Văn An', dob: '1990-03-15', gender: 'Nam', phone: '0912345678', stt: 1, time: '08:00', reason: 'Đau bụng, ợ chua 3 ngày', status: 'waiting', allergy: 'Penicillin', history: 'Viêm dạ dày mãn' },
    { id: 2, name: 'Trần Thị Bích', dob: '1985-07-22', gender: 'Nữ', phone: '0987654321', stt: 2, time: '08:30', reason: 'Đau đầu, chóng mặt', status: 'waiting', allergy: 'Không', history: 'Cao huyết áp' },
    { id: 3, name: 'Lê Minh Cường', dob: '1978-11-05', gender: 'Nam', phone: '0909123456', stt: 3, time: '09:00', reason: 'Đau khớp gối 2 tuần', status: 'waiting', allergy: 'Aspirin', history: 'Thoái hóa khớp gối' },
    { id: 4, name: 'Phạm Hồng Diệu', dob: '1995-01-18', gender: 'Nữ', phone: '0933456789', stt: 4, time: '09:30', reason: 'Ho kéo dài, sốt nhẹ', status: 'waiting', allergy: 'Không', history: 'Không' },
    { id: 5, name: 'Hoàng Đức Phúc', dob: '2000-09-30', gender: 'Nam', phone: '0977888999', stt: 5, time: '10:00', reason: 'Kiểm tra sức khỏe tổng quát', status: 'waiting', allergy: 'Sulfa', history: 'Không' },
  ],
  services: [
    { id: 1, code: 'XN_CBC', name: 'Tổng phân tích tế bào máu ngoại vi (CBC)', price: 150000, type: 'Xét nghiệm', dept: 'P.103 Xét nghiệm' },
    { id: 2, code: 'XN_SHM', name: 'Sinh hóa máu cơ bản (Glucose, Men gan, Thận)', price: 220000, type: 'Xét nghiệm', dept: 'P.103 Xét nghiệm' },
    { id: 3, code: 'SA_OB', name: 'Siêu âm ổ bụng tổng quát màu', price: 250000, type: 'Siêu âm', dept: 'P.201 Siêu âm' },
    { id: 4, code: 'SA_TIM', name: 'Siêu âm tim Doppler màu thành ngực', price: 450000, type: 'Siêu âm', dept: 'P.202 Siêu âm Tim' },
    { id: 5, code: 'XQ_NGUC', name: 'Chụp X-quang ngực thẳng kỹ thuật số (DR)', price: 180000, type: 'X-Quang', dept: 'P.105 X-quang' },
    { id: 6, code: 'XQ_CS', name: 'Chụp X-quang cột sống thắt lưng thẳng/nghiêng', price: 240000, type: 'X-Quang', dept: 'P.105 X-quang' },
    { id: 7, code: 'ECG_12', name: 'Điện tim 12 chuyển đạo (ECG)', price: 120000, type: 'Điện tim', dept: 'P.104 Thăm dò chức năng' },
    { id: 8, code: 'NS_DD', name: 'Nội soi dạ dày - tá tràng gây mê', price: 1200000, type: 'Nội soi', dept: 'TT Nội soi tiêu hóa' },
    { id: 9, code: 'NS_DT', name: 'Nội soi đại trực tràng toàn bộ gây mê', price: 1800000, type: 'Nội soi', dept: 'TT Nội soi tiêu hóa' },
  ],
  medicines: [
    { id: 1, code: 'TH_OMEP_20', name: 'Omeprazol 20mg', active: 'Omeprazole', unit: 'Viên', price: 2500, group: 'Tiêu hóa', usage: 'Uống trước bữa ăn sáng 30 phút' },
    { id: 2, code: 'TH_DOMP_10', name: 'Domperidon 10mg', active: 'Domperidone', unit: 'Viên', price: 1500, group: 'Tiêu hóa', usage: 'Uống trước ăn 15 phút khi đầy bụng' },
    { id: 3, code: 'TH_PARA_500', name: 'Paracetamol 500mg', active: 'Paracetamol', unit: 'Viên', price: 1000, group: 'Giảm đau hạ sốt', usage: 'Uống sau ăn khi đau hoặc sốt > 38.5°C' },
    { id: 4, code: 'TH_AMOX_500', name: 'Amoxicillin 500mg', active: 'Amoxicillin', unit: 'Viên', price: 3000, group: 'Kháng sinh', usage: 'Uống sau ăn no, đủ liệu trình 7 ngày' },
    { id: 5, code: 'TH_LOSA_50', name: 'Losartan 50mg', active: 'Losartan potassium', unit: 'Viên', price: 4000, group: 'Tim mạch', usage: 'Uống 1 viên vào buổi sáng mỗi ngày' },
    { id: 6, code: 'TH_DICL_50', name: 'Diclofenac 50mg', active: 'Diclofenac sodium', unit: 'Viên', price: 2000, group: 'Kháng viêm', usage: 'Uống sau ăn no kèm nhiều nước' },
    { id: 7, code: 'TH_CETI_10', name: 'Cetirizin 10mg', active: 'Cetirizine HCl', unit: 'Viên', price: 1800, group: 'Dị ứng', usage: 'Uống 1 viên buổi tối trước khi đi ngủ' },
    { id: 8, code: 'TH_VITB_COMP', name: 'Vitamin B Complex', active: 'Vitamin B1, B6, B12', unit: 'Viên', price: 1200, group: 'Bổ thần kinh', usage: 'Uống sau bữa ăn sáng' },
  ],
  appointments: [
    { id: 1, patient: 'Nguyễn Văn An', doctor: 'TS.BS Trần Thị Minh', specialty: 'Nội khoa', date: '2026-09-13', time: '08:00', status: 'confirmed', code: 'LH-20260913-001' },
    { id: 2, patient: 'Trần Thị Bích', doctor: 'TS.BS Trần Thị Minh', specialty: 'Nội khoa', date: '2026-09-13', time: '08:30', status: 'confirmed', code: 'LH-20260913-002' },
    { id: 3, patient: 'Lê Minh Cường', doctor: 'PGS.TS Lê Hoàng Nam', specialty: 'Cơ xương khớp', date: '2026-09-13', time: '09:00', status: 'checked-in', code: 'LH-20260913-003' },
    { id: 4, patient: 'Phạm Hồng Diệu', doctor: 'TS.BS Trần Thị Minh', specialty: 'Nội khoa', date: '2026-09-14', time: '09:30', status: 'pending', code: 'LH-20260914-001' },
    { id: 5, patient: 'Hoàng Đức Phúc', doctor: 'BS.CKI Phạm Thu Hà', specialty: 'Nhi khoa', date: '2026-09-15', time: '10:00', status: 'pending', code: 'LH-20260915-001' },
  ]
};

// ─── Application State ───
const AppState = {
  currentView: 'landing',
  currentRole: null,
  currentUser: null,
  booking: {
    step: 1,
    specialty: null,
    doctor: null,
    date: null,
    time: null,
    reason: ''
  },
  examination: {
    selectedPatient: null,
    prescriptions: [],
    clsOrders: []
  }
};

// ─── Router ───
function navigate(view, role = null) {
  if (role) AppState.currentRole = role;
  AppState.currentView = view;
  render();
  window.scrollTo(0, 0);
}

// ─── Main Render ───
function render() {
  capturePresentationState();
  const app = document.getElementById('app');
  let html = '';

  switch (AppState.currentView) {
    case 'landing':
      html = renderLanding();
      break;
    case 'login':
      html = renderLogin();
      break;
    case 'patient-dashboard':
      html = renderDashboardLayout('patient', renderPatientDashboard());
      break;
    case 'patient-booking':
      html = renderDashboardLayout('patient', renderPatientBooking());
      break;
    case 'patient-appointments':
      html = renderDashboardLayout('patient', renderPatientAppointments());
      break;
    case 'doctor-dashboard':
      html = renderDashboardLayout('doctor', renderDoctorDashboard());
      break;
    case 'doctor-examination':
      html = renderDashboardLayout('doctor', renderDoctorExamination());
      break;
    case 'receptionist-dashboard':
      html = renderDashboardLayout('receptionist', renderReceptionistDashboard());
      break;
    case 'receptionist-billing':
      html = renderDashboardLayout('receptionist', renderReceptionistBilling());
      break;
    case 'admin-dashboard':
      html = renderDashboardLayout('admin', renderAdminDashboard());
      break;
    default:
      html = renderLanding();
  }

  app.innerHTML = html;
  attachEventListeners();
}

function switchAdminTab(tab) {
  AppState.adminTab = tab;
  render();
}

function selectSpecialty(id) {
  AppState.booking.specialty = id;
  render();
}

function selectDoctor(id) {
  AppState.booking.doctor = id;
  render();
}

function selectDate(date) {
  AppState.booking.date = date;
}

function selectTime(time) {
  AppState.booking.time = time;
  render();
}

function bookingNext() {
  if (AppState.booking.step === 1 && !AppState.booking.specialty) {
    showToast('Vui lòng chọn chuyên khoa!', 'warning');
    return;
  }
  if (AppState.booking.step === 2 && !AppState.booking.doctor) {
    showToast('Vui lòng chọn bác sĩ!', 'warning');
    return;
  }
  if (AppState.booking.step === 3) {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) AppState.booking.date = dateInput.value;
    const reasonInput = document.getElementById('bookingReason');
    if (reasonInput) AppState.booking.reason = reasonInput.value;
    if (!AppState.booking.time) {
      showToast('Vui lòng chọn khung giờ khám!', 'warning');
      return;
    }
  }
  AppState.booking.step++;
  render();
}

function bookingPrev() {
  if (AppState.booking.step > 1) {
    AppState.booking.step--;
    render();
  }
}

function confirmBooking() {
  const spec = MOCK_DATA.specialties.find(s => s.id === AppState.booking.specialty);
  const doc = MOCK_DATA.doctors.find(d => d.id === AppState.booking.doctor);
  const nextId = MOCK_DATA.appointments.length + 1;
  const newCode = `LH-20260914-${String(nextId).padStart(3, '0')}`;
  const newSTT = nextId;

  const newApt = {
    id: nextId,
    patient: 'Nguyễn Văn An',
    doctor: doc ? doc.name : 'TS.BS Trần Thị Minh',
    specialty: spec ? spec.name : 'Nội khoa',
    date: AppState.booking.date || new Date().toISOString().split('T')[0],
    time: AppState.booking.time || '08:30',
    status: 'confirmed',
    code: newCode,
    stt: newSTT,
    room: doc?.id === 3 ? 'Phòng 305' : 'Phòng 201',
    reason: AppState.booking.reason || 'Khám tổng quát'
  };

  // Thêm vào danh sách lịch hẹn thực tế của hệ thống
  MOCK_DATA.appointments.unshift(newApt);
  AppState.lastCreatedAppointment = newApt;

  // Chuyển sang bước 5 hiển thị phiếu khám
  AppState.booking.step = 5;
  render();
  showToast(`🎉 Đặt lịch thành công! Số thứ tự của bạn là #${String(newSTT).padStart(2, '0')}`, 'success');
}

function cancelPatientAppointment(id) {
  const apt = MOCK_DATA.appointments.find(a => a.id === id);
  if (apt) {
    if (confirm(`Bạn có chắc chắn muốn hủy lịch hẹn [${apt.code}] khám với ${apt.doctor} không?`)) {
      apt.status = 'cancelled';
      render();
      showToast(`Đã hủy lịch hẹn ${apt.code}. Đã giải phóng slot khám.`, 'warning');
    }
  }
}

function viewQrSlip(code) {
  const apt = MOCK_DATA.appointments.find(a => a.code === code);
  if (apt) {
    AppState.lastCreatedAppointment = apt;
    AppState.booking.step = 5;
    navigate('patient-booking', 'patient');
  }
}

function selectPatient(id) {
  AppState.examination.selectedPatient = id;
  navigate('doctor-examination', 'doctor');
}

function selectPayment(el) {
  document.querySelectorAll('.payment-method').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function calcChange() {
  const received = parseInt(document.getElementById('cashReceived')?.value.replace(/,/g, '') || 0);
  const total = 718300;
  const change = received - total;
  const el = document.getElementById('changeAmount');
  if (el) {
    el.textContent = change >= 0 ? `${change.toLocaleString()} VNĐ` : `Còn thiếu: ${Math.abs(change).toLocaleString()} VNĐ`;
    el.style.color = change >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

// ─── Toast Notification ───
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const symbol = document.createElement('span');
  symbol.innerHTML = icon(type === 'success' ? 'circle-check' : type === 'error' ? 'circle-x' : type === 'warning' ? 'triangle-alert' : 'info');
  const text = document.createElement('span');
  text.textContent = message.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
  toast.append(symbol, text);
  container.appendChild(toast);
  lucide.createIcons({ root: toast });
  setTimeout(() => toast.remove(), 3500);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ─── Utilities ───
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(amount) {
  return amount.toLocaleString('vi-VN') + ' VNĐ';
}

// ─── Event Listeners ───
function attachEventListeners() {
  enhancePresentation();
}

// ─── Login & Role Switching Logic ───
function selectRole(role) {
  AppState.loginRole = role;
  render();
}

function handleLogin() {
  const role = AppState.loginRole || 'patient';
  const roleViews = {
    patient: { view: 'patient-dashboard', name: 'Nguyễn Văn An' },
    doctor: { view: 'doctor-dashboard', name: 'TS.BS Trần Thị Minh' },
    receptionist: { view: 'receptionist-dashboard', name: 'Lễ Tân - Quầy 1' },
    admin: { view: 'admin-dashboard', name: 'Quản trị viên' }
  };
  const target = roleViews[role];
  AppState.currentRole = role;
  navigate(target.view, role);
  showToast(`Xin chào ${target.name}! Đăng nhập thành công.`, 'success');
}

// ─── Quick Booking Shortcuts ───
function quickStartBooking() {
  AppState.booking = {
    step: 1,
    specialty: null,
    doctor: null,
    date: null,
    time: null,
    reason: ''
  };
  navigate('patient-booking', 'patient');
}

function quickBookSpecialty(specialtyId) {
  AppState.booking = {
    step: 2,
    specialty: specialtyId,
    doctor: null,
    date: null,
    time: null,
    reason: ''
  };
  navigate('patient-booking', 'patient');
  const specName = MOCK_DATA.specialties.find(s => s.id === specialtyId)?.name;
  showToast(`Đã chọn chuyên khoa: ${specName}. Mời chọn Bác sĩ.`, 'info');
}

function quickBookDoctor(doctorId) {
  const doc = MOCK_DATA.doctors.find(d => d.id === doctorId);
  AppState.booking = {
    step: 3,
    specialty: doc ? doc.specialty : 1,
    doctor: doctorId,
    date: new Date().toISOString().split('T')[0],
    time: null,
    reason: ''
  };
  navigate('patient-booking', 'patient');
  showToast(`Đã chọn ${doc?.name}. Mời chọn ngày & khung giờ.`, 'info');
}

// ─── Receptionist & Billing Logic ───
function handleQuickCheckIn() {
  const input = document.getElementById('quickCheckInInput');
  const query = input?.value.trim().toUpperCase();
  if (!query) {
    showToast('Vui lòng nhập mã lịch hẹn hoặc số điện thoại!', 'warning');
    return;
  }

  const apt = MOCK_DATA.appointments.find(a => a.code === query || a.code.includes(query));
  if (apt) {
    if (apt.status === 'checked-in') {
      showToast(`Bệnh nhân ${apt.patient} (${apt.code}) đã check-in trước đó rồi!`, 'info');
      return;
    }
    apt.status = 'checked-in';
    
    // Thêm vào hàng đợi khám của Bác sĩ nếu chưa có
    if (!MOCK_DATA.patients.find(p => p.name === apt.patient)) {
      MOCK_DATA.patients.push({
        id: MOCK_DATA.patients.length + 1,
        name: apt.patient,
        dob: '1992-05-10',
        gender: 'Nam',
        phone: '0912345678',
        stt: apt.stt || MOCK_DATA.patients.length + 1,
        time: apt.time,
        reason: apt.reason || 'Khám tổng quát',
        status: 'waiting',
        allergy: 'Không',
        history: 'Bình thường'
      });
    }

    render();
    showToast(`🎯 Check-in thành công cho ${apt.patient} (${apt.code})! Đã chuyển vào hàng đợi phòng khám.`, 'success');
  } else {
    showToast(`Không tìm thấy mã lịch hẹn [${query}]. Vui lòng kiểm tra lại!`, 'error');
  }
}

function checkInAppointmentById(id) {
  const apt = MOCK_DATA.appointments.find(a => a.id === id);
  if (apt) {
    apt.status = 'checked-in';
    // Đẩy vào danh sách chờ khám của Bác sĩ
    if (!MOCK_DATA.patients.find(p => p.name === apt.patient)) {
      MOCK_DATA.patients.push({
        id: MOCK_DATA.patients.length + 1,
        name: apt.patient,
        dob: '1992-05-10',
        gender: 'Nam',
        phone: '0912345678',
        stt: apt.stt || MOCK_DATA.patients.length + 1,
        time: apt.time,
        reason: apt.reason || 'Khám theo lịch hẹn',
        status: 'waiting',
        allergy: 'Không',
        history: 'Bình thường'
      });
    }
    render();
    showToast(`Đã Check-in thành công cho ${apt.patient}! Số thứ tự #${String(apt.stt || id).padStart(2, '0')}`, 'success');
  }
}

function openBillingForPatient(name, doctor, code) {
  AppState.activeBillingPatient = { name, doctor, code };
  AppState.billingPaymentMethod = 'cash';
  navigate('receptionist-billing', 'receptionist');
}

function selectBillingMethod(method) {
  AppState.billingPaymentMethod = method;
  render();
}

function confirmBillingPayment() {
  const patient = AppState.activeBillingPatient?.name || 'Bệnh nhân';
  const aptCode = AppState.activeBillingPatient?.code;
  if (aptCode) {
    const apt = MOCK_DATA.appointments.find(a => a.code === aptCode);
    if (apt) apt.status = 'completed';
  }
  const clsTotal = (AppState.examination.clsOrders || []).reduce((sum, item) => sum + item.price, 0);
  const medTotal = (AppState.examination.prescriptions || []).reduce((sum, item) => sum + item.price, 0);
  const grandTotal = 200000 + clsTotal + medTotal;
  showToast(`🎉 Thu ngân đã xác nhận thanh toán thành công ${grandTotal.toLocaleString()} VNĐ cho ${patient}! Trạng thái hóa đơn: PAID. Đang in biên lai...`, 'success');
  setTimeout(() => {
    navigate('receptionist-dashboard', 'receptionist');
  }, 1200);
}

function openWalkInModal() {
  const name = prompt('Nhập họ tên bệnh nhân vãng lai:', 'Vũ Quốc Toàn');
  if (!name) return;
  const phone = prompt('Nhập số điện thoại:', '0988112233');
  const spec = prompt('Nhập chuyên khoa (1: Nội khoa, 2: Nhi, 3: Cơ xương khớp):', '1');

  const nextId = MOCK_DATA.appointments.length + 1;
  const newApt = {
    id: nextId,
    patient: name,
    doctor: 'TS.BS Trần Thị Minh',
    specialty: spec === '2' ? 'Nhi khoa' : spec === '3' ? 'Cơ xương khớp' : 'Nội khoa',
    date: new Date().toISOString().split('T')[0],
    time: 'Hiện tại',
    status: 'checked-in',
    code: `VL-${Date.now().toString().slice(-4)}`,
    stt: nextId,
    room: 'Phòng 201',
    reason: 'Khám vãng lai không đặt trước'
  };

  MOCK_DATA.appointments.unshift(newApt);
  MOCK_DATA.patients.push({
    id: MOCK_DATA.patients.length + 1,
    name: name,
    dob: '1995-08-20',
    gender: 'Nam',
    phone: phone || '0988112233',
    stt: nextId,
    time: 'Hiện tại',
    reason: 'Khám vãng lai',
    status: 'waiting',
    allergy: 'Không',
    history: 'Không'
  });

  render();
  showToast(`Đã tiếp nhận bệnh nhân vãng lai: ${name} (STT #${String(nextId).padStart(2, '0')})`, 'success');
}

function filterReceptionistApt(query) {
  const q = query.toLowerCase();
  const rows = document.querySelectorAll('#receptionistAptTbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}

// ─── Doctor Examination Logic ───
function callNextPatient() {
  const waiting = MOCK_DATA.patients.filter(p => p.status === 'waiting');
  if (waiting.length > 0) {
    const nextPatient = waiting[0];
    AppState.examination.selectedPatient = nextPatient.id;
    navigate('doctor-examination', 'doctor');
    showToast(`📢 Đang gọi bệnh nhân: ${nextPatient.name} (STT #${String(nextPatient.stt || 1).padStart(2, '0')}) vào phòng 201`, 'info');
  } else {
    showToast('Hiện tại không còn bệnh nhân nào đang chờ trong hàng đợi!', 'info');
  }
}

function selectPatientForExam(id) {
  AppState.examination.selectedPatient = id;
  const p = MOCK_DATA.patients.find(pt => pt.id === id);
  navigate('doctor-examination', 'doctor');
  showToast(`Đã mở hồ sơ khám cho bệnh nhân ${p?.name}`, 'info');
}

// ─── Bắt đầu khám bệnh (chuyển sang IN_PROGRESS) ───
function startPatientExamination(patientId) {
  const p = MOCK_DATA.patients.find(pt => pt.id === patientId) || MOCK_DATA.patients[0];
  p.status = 'in_progress';

  // Đồng bộ appointment
  const apt = MOCK_DATA.appointments.find(a => a.patient === p.name);
  if (apt) apt.status = 'in_progress';

  showToast(`🩺 Đã bắt đầu khám cho bệnh nhân ${p.name}!`, 'success');
  render();
}

// ─── Cơ chế Auto-save Draft (Lưu nháp tự động sau 1.2s người dùng ngừng gõ) ───
let autoSaveTimeout = null;

function handleAutoSaveDraft(patientId) {
  const statusEl = document.getElementById('autoSaveText');
  const indicatorEl = document.getElementById('autoSaveIndicator');
  if (statusEl) {
    statusEl.textContent = 'Đang lưu nháp...';
    if (indicatorEl) indicatorEl.style.color = '#f59e0b';
  }

  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const draftData = {
      patientId,
      pulse: document.getElementById('vitalPulse')?.value,
      bp: document.getElementById('vitalBP')?.value,
      temp: document.getElementById('vitalTemp')?.value,
      height: document.getElementById('vitalHeight')?.value,
      weight: document.getElementById('vitalWeight')?.value,
      spo2: document.getElementById('vitalSpo2')?.value,
      reason: document.getElementById('examReason')?.value,
      history: document.getElementById('examHistory')?.value,
      symptoms: document.getElementById('examSymptoms')?.value,
      prelimDiagnosis: document.getElementById('examPrelimDiagnosis')?.value,
      diagnosis: document.getElementById('examDiagnosis')?.value,
      icd10: document.getElementById('examIcd10')?.value,
      notes: document.getElementById('examNotes')?.value,
      followUp: document.getElementById('examFollowUp')?.value,
      savedAt: new Date().toLocaleTimeString('vi-VN')
    };

    try {
      localStorage.setItem(`medicare_draft_exam_${patientId}`, JSON.stringify(draftData));
    } catch (e) {
      console.warn('Không thể lưu nháp vào localStorage:', e);
    }

    if (statusEl) {
      statusEl.textContent = `Đã tự động lưu nháp lúc ${draftData.savedAt}`;
      if (indicatorEl) indicatorEl.style.color = '#4ade80';
    }
  }, 1200);
}

function triggerManualSaveDraft(patientId) {
  handleAutoSaveDraft(patientId);
  showToast('💾 Đã lưu nháp hồ sơ khám bệnh thành công!', 'info');
}

function calculateBMI() {
  const heightCm = parseFloat(document.getElementById('vitalHeight')?.value || 0);
  const weightKg = parseFloat(document.getElementById('vitalWeight')?.value || 0);
  const badge = document.getElementById('bmiBadge');
  if (heightCm > 0 && weightKg > 0 && badge) {
    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);
    let category = 'Bình thường';
    let colorClass = 'badge-success';
    if (bmi < 18.5) {
      category = 'Nhẹ cân';
      colorClass = 'badge-warning';
    } else if (bmi >= 25) {
      category = 'Thừa cân / Tiền béo phì';
      colorClass = 'badge-danger';
    }
    badge.className = `badge ${colorClass}`;
    badge.textContent = `BMI: ${bmi} (${category})`;
  }
}

function openAddClsModal() {
  const availableServices = MOCK_DATA.services;
  const serviceListText = availableServices
    .map((s, i) => `${i + 1}. [${s.code}] ${s.name} (${s.type}) - ${s.price.toLocaleString()} VNĐ [${s.dept}]`)
    .join('\n');

  const choice = prompt(
    `DANH MỤC DỊCH VỤ KỸ THUẬT & BẢNG GIÁ NIÊM YẾT:\n\n${serviceListText}\n\nNhập số thứ tự dịch vụ muốn chỉ định (1-${availableServices.length}):`,
    '1'
  );

  const index = parseInt(choice) - 1;
  if (index >= 0 && index < availableServices.length) {
    const selectedSvc = availableServices[index];
    AppState.examination.clsOrders.push({
      id: selectedSvc.id,
      code: selectedSvc.code,
      name: selectedSvc.name,
      price: selectedSvc.price,
      type: selectedSvc.type,
      status: 'ORDERED', // Mặc định là ORDERED (Đã chỉ định)
      result: null
    });
    render();
    showToast(`Đã chỉ định: ${selectedSvc.name} (150,000 đ) • Đã đồng bộ vào viện phí tạm tính!`, 'success');
  }
}

function payClsOrder(index) {
  const cls = AppState.examination.clsOrders[index];
  if (cls) {
    cls.status = 'PAID';
    render();
    showToast(`💳 Đã xác nhận thu tiền cho dịch vụ: ${cls.name}! Trạng thái chuyển sang PAID.`, 'success');
  }
}

function enterClsResult(index) {
  const cls = AppState.examination.clsOrders[index];
  if (cls) {
    const defaultConclusion = cls.type === 'Xét nghiệm'
      ? 'Tăng nhẹ bạch cầu đa nhân trung tính nghi ngờ nhiễm trùng cấp'
      : cls.type === 'Siêu âm'
      ? 'Hình thái gan mật tụy lách 2 thận bình thường, không có dịch tự do'
      : 'Hình ảnh tim phổi trong giới hạn bình thường';

    const conclusion = prompt(`[KỸ THUẬT VIÊN] Nhập mô tả chi tiết & kết luận cho [${cls.name}]:`, cls.conclusion || defaultConclusion);
    if (conclusion !== null) {
      cls.conclusion = conclusion;
      cls.status = 'COMPLETED';

      // Tạo mẫu chỉ số kèm khoảng tham chiếu
      if (!cls.indicators || cls.indicators.length === 0) {
        if (cls.type === 'Xét nghiệm') {
          cls.indicators = [
            { name: 'Số lượng Hồng cầu (RBC)', value: '4.8', unit: 'T/L', normalRange: '4.0 - 5.5', isAbnormal: false },
            { name: 'Số lượng Bạch cầu (WBC)', value: '11.8', unit: 'G/L', normalRange: '4.0 - 10.0', isAbnormal: true },
            { name: 'Huyết sắc tố (Hb)', value: '140', unit: 'g/L', normalRange: '120 - 165', isAbnormal: false }
          ];
        } else {
          cls.indicators = [
            { name: 'Cấu trúc hình thái giải phẫu', value: 'Bình thường', unit: '', normalRange: 'Bình thường', isAbnormal: false },
            { name: 'Tổn thương khu trú / Dịch', value: 'Không phát hiện', unit: '', normalRange: 'Âm tính', isAbnormal: false }
          ];
        }
      }

      if (!cls.attachments || cls.attachments.length === 0) {
        cls.attachments = ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=60'];
      }

      render();
      showToast(`✅ Kỹ thuật viên đã cập nhật kết quả CLS thành công! Bác sĩ có thể xem ngay trên màn hình.`, 'success');
    }
  }
}

function removeClsOrder(index) {
  const cls = AppState.examination.clsOrders[index];
  if (cls && cls.status === 'PAID') {
    if (!confirm('Dịch vụ này đã thu tiền. Bạn có chắc chắn muốn hủy và hoàn tiền tạm tính?')) {
      return;
    }
  }
  const removed = AppState.examination.clsOrders.splice(index, 1);
  render();
  showToast(`Đã xóa chỉ định: ${removed[0]?.name}. Đã cập nhật lại viện phí tạm tính.`, 'warning');
}

function openAddMedicineModal() {
  const patient = MOCK_DATA.patients.find(p => p.id === (AppState.examination.selectedPatient || 1));
  if (patient && patient.isLocked) {
    showToast('Hồ sơ bệnh án đã hoàn tất và bị khóa. Không thể thêm thuốc!', 'error');
    return;
  }

  const meds = MOCK_DATA.medicines;
  const medList = meds
    .map((m, i) => `${i + 1}. [${m.code}] ${m.name} (HC: ${m.active}) - ${m.price.toLocaleString()} đ/${m.unit} [${m.usage}]`)
    .join('\n');

  const choice = prompt(
    `DANH MỤC THUỐC PHÒNG KHÁM:\n\n${medList}\n\nNhập số thứ tự thuốc cần kê (1-${meds.length}):`,
    '1'
  );

  const index = parseInt(choice) - 1;
  if (index >= 0 && index < meds.length) {
    const med = meds[index];
    const qtyStr = prompt(`Nhập tổng số lượng ${med.unit} cho [${med.name}]:`, '14');
    const qty = parseInt(qtyStr) || 14;

    const morning = prompt(`Nhập liều buổi SÁNG (số viên):`, '1') || '1';
    const noon = prompt(`Nhập liều buổi TRƯA (số viên, 0 nếu không uống):`, '0') || '0';
    const afternoon = prompt(`Nhập liều buổi CHIỀU (số viên, 0 nếu không uống):`, '0') || '0';
    const evening = prompt(`Nhập liều buổi TỐI (số viên):`, '1') || '1';

    const usage = prompt(`Nhập cách dùng thuốc:`, med.usage || 'Uống sau bữa ăn no với nhiều nước');

    const doseDetail = `Sáng: ${morning} • Trưa: ${noon} • Chiều: ${afternoon} • Tối: ${evening} (${med.unit})`;

    AppState.examination.prescriptions.push({
      id: med.id,
      code: med.code,
      name: med.name,
      active: med.active,
      unit: med.unit,
      qty: qty,
      unitPrice: med.price,
      price: med.price * qty,
      morning: parseFloat(morning) || 0,
      noon: parseFloat(noon) || 0,
      afternoon: parseFloat(afternoon) || 0,
      evening: parseFloat(evening) || 0,
      doseDetail: doseDetail,
      dose: doseDetail,
      usage: usage
    });

    render();
    showToast(`Đã kê thêm: ${med.name} (SL: ${qty} ${med.unit}) • Liều: ${doseDetail}`, 'success');
  }
}

function removeMedicine(index) {
  const patient = MOCK_DATA.patients.find(p => p.id === (AppState.examination.selectedPatient || 1));
  if (patient && patient.isLocked) {
    showToast('Hồ sơ bệnh án đã bị khóa. Không thể xóa thuốc!', 'error');
    return;
  }
  const removed = AppState.examination.prescriptions.splice(index, 1);
  render();
  showToast(`Đã xóa thuốc: ${removed[0]?.name}`, 'warning');
}

function completeExamination(patientId) {
  const p = MOCK_DATA.patients.find(pt => pt.id === patientId) || MOCK_DATA.patients[0];
  
  if (p.isLocked) {
    showToast('Hồ sơ bệnh án này đã được hoàn tất và khóa trước đó!', 'info');
    return;
  }

  const diagnosisInput = document.getElementById('examDiagnosis')?.value || '';
  if (!diagnosisInput || diagnosisInput.trim().length < 3) {
    showToast('Vui lòng nhập Chẩn đoán xác định trước khi hoàn tất ca khám!', 'error');
    return;
  }

  // 1. Khóa hồ sơ bệnh án
  p.status = 'examined';
  p.isLocked = true;
  p.completedAt = new Date().toLocaleTimeString('vi-VN');

  // 2. Cập nhật trạng thái lịch hẹn
  const apt = MOCK_DATA.appointments.find(a => a.patient === p.name);
  if (apt) {
    apt.status = 'completed';
  }

  // 3. Tính toán tổng viện phí toàn diện (Khám 200k + CLS + Thuốc)
  const totalCls = AppState.examination.clsOrders.reduce((sum, item) => sum + item.price, 0);
  const totalMeds = AppState.examination.prescriptions.reduce((sum, item) => sum + item.price, 0);
  const grandTotal = 200000 + totalCls + totalMeds;

  render();
  showToast(
    `🎉 Bác sĩ đã hoàn tất ca khám và KHÓA HỒ SƠ cho ${p.name}! Tổng viện phí ${grandTotal.toLocaleString()} đ đã được chuyển sang Quầy Thu ngân.`,
    'success'
  );
  
  // Tự động điều hướng sang quầy thu ngân sau 1.5s
  setTimeout(() => {
    openBillingForPatient(p.name, 'TS.BS Trần Thị Minh', apt?.code || `LH-20260914-${String(p.id).padStart(3, '0')}`);
  }, 1500);
}

// ─── Mobile sidebar toggle ───
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ─── Initialize App ───
document.addEventListener('DOMContentLoaded', () => {
  render();
});

