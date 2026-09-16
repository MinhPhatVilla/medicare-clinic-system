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
    { id: 1, name: 'Omeprazol 20mg', unit: 'Viên', price: 2500, group: 'Tiêu hóa' },
    { id: 2, name: 'Domperidon 10mg', unit: 'Viên', price: 1500, group: 'Tiêu hóa' },
    { id: 3, name: 'Paracetamol 500mg', unit: 'Viên', price: 1000, group: 'Giảm đau' },
    { id: 4, name: 'Amoxicillin 500mg', unit: 'Viên', price: 3000, group: 'Kháng sinh' },
    { id: 5, name: 'Losartan 50mg', unit: 'Viên', price: 4000, group: 'Tim mạch' },
    { id: 6, name: 'Diclofenac 50mg', unit: 'Viên', price: 2000, group: 'Kháng viêm' },
    { id: 7, name: 'Cetirizin 10mg', unit: 'Viên', price: 1800, group: 'Dị ứng' },
    { id: 8, name: 'Vitamin B Complex', unit: 'Viên', price: 1200, group: 'Vitamin' },
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

// ─── View: Landing Page ───
function renderLanding() {
  return `
    <div class="bg-grid"></div>
    <div class="bg-gradient-orbs"></div>
    <div class="page-landing">
      <!-- Top Emergency & Info Banner -->
      <div class="top-info-banner">
        <div class="container-banner">
          <span>🚨 <strong>Cấp cứu / Hotline 24/7:</strong> <a href="tel:19006868" style="color: #38bdf8; text-decoration: underline;">1900 6868</a></span>
          <span>📍 <strong>Địa chỉ:</strong> Km10 Đường Nguyễn Trãi, Hà Đông, Hà Nội</span>
          <span>⏰ <strong>Giờ làm việc:</strong> Thứ 2 - Chủ Nhật: 07:30 - 20:00</span>
        </div>
      </div>

      <!-- Navbar -->
      <nav class="navbar" id="navbar">
        <div class="navbar-brand" onclick="navigate('landing')" style="cursor: pointer;">
          <div class="logo-icon">🏥</div>
          <span>Medi<span class="text-gradient">Care</span></span>
        </div>
        <div class="navbar-links">
          <a href="#specialties">Chuyên khoa</a>
          <a href="#doctors">Bác sĩ</a>
          <a href="#workflow">Quy trình khám</a>
          <a href="#features">Tính năng</a>
        </div>
        <div class="navbar-actions">
          <button class="btn btn-secondary" onclick="navigate('login')">🔑 Chọn vai trò Demo</button>
          <button class="btn btn-primary" onclick="quickStartBooking()">🗓️ Đặt lịch khám ngay</button>
        </div>
      </nav>

      <!-- Hero -->
      <section class="hero">
        <div class="hero-content">
          <div class="hero-badge">
            ✨ Nền tảng Đặt khám & Bệnh án điện tử chuẩn Bộ Y Tế
          </div>
          <h1>Đặt Lịch Khám Bệnh<br><span class="text-gradient">Không Cần Chờ Đợi</span></h1>
          <p>Hệ thống kết nối trực tiếp bệnh nhân với các bác sĩ chuyên khoa đầu ngành. Đặt lịch theo khung giờ mong muốn, nhận số thứ tự và phiếu khám điện tử có mã QR ngay tức thì.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" onclick="quickStartBooking()">
              🗓️ Đặt lịch khám ngay
            </button>
            <button class="btn btn-secondary btn-lg" onclick="navigate('login')">
              ⚡ Xem Demo 4 Vai trò →
            </button>
          </div>

          <div class="hero-visual">
            <div class="mockup-window">
              <div class="mockup-header">
                <span class="mockup-dot red"></span>
                <span class="mockup-dot yellow"></span>
                <span class="mockup-dot green"></span>
                <span style="flex:1; text-align:center; font-size: 0.75rem; color: var(--text-muted);">MediCare Real-time Clinic Status</span>
              </div>
              <div class="mockup-body">
                <div class="mockup-card">
                  <div style="font-size:2rem; margin-bottom: 0.5rem;">📊</div>
                  <div style="font-weight:600; margin-bottom:0.25rem;">128 BN</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Đã tiếp nhận hôm nay</div>
                </div>
                <div class="mockup-card">
                  <div style="font-size:2rem; margin-bottom: 0.5rem;">👨‍⚕️</div>
                  <div style="font-weight:600; margin-bottom:0.25rem;">24 Bác sĩ</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Đang trực tại các phòng</div>
                </div>
                <div class="mockup-card">
                  <div style="font-size:2rem; margin-bottom: 0.5rem;">⏱️</div>
                  <div style="font-weight:600; margin-bottom:0.25rem;">~ 15 phút</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Thời gian chờ trung bình</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Specialties Section (Showcase Chuyên khoa thực tế) -->
      <section class="section" id="specialties">
        <div class="section-header">
          <div class="overline">Chuyên khoa khám bệnh</div>
          <h2>Đa dạng các <span class="text-gradient">Chuyên khoa mũi nhọn</span></h2>
          <p>Lựa chọn chuyên khoa phù hợp với tình trạng sức khỏe của bạn để được bác sĩ khám chuyên sâu</p>
        </div>
        <div class="specialties-grid">
          ${MOCK_DATA.specialties.map(s => `
            <div class="specialty-card card-hover" onclick="quickBookSpecialty(${s.id})">
              <div class="specialty-icon">${s.icon}</div>
              <h4>${s.name}</h4>
              <p class="specialty-meta">${s.count} Bác sĩ đang tiếp nhận</p>
              <button class="btn btn-sm btn-outline" style="margin-top: 0.75rem; width: 100%;">Đặt lịch khoa này →</button>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Doctors Showcase Section (Đội ngũ bác sĩ thực tế) -->
      <section class="section" id="doctors">
        <div class="section-header">
          <div class="overline">Đội ngũ chuyên gia</div>
          <h2>Bác sĩ <span class="text-gradient">Giàu kinh nghiệm & Tận tâm</span></h2>
          <p>Các Giáo sư, Tiến sĩ, Bác sĩ Chuyên khoa II từ các bệnh viện tuyến đầu trực tiếp thăm khám</p>
        </div>
        <div class="doctors-grid">
          ${MOCK_DATA.doctors.map(d => {
            const spec = MOCK_DATA.specialties.find(s => s.id === d.specialty)?.name || 'Chuyên khoa';
            return `
              <div class="doctor-card card-hover">
                <div class="doctor-header">
                  <div class="doctor-avatar-lg">${d.avatar}</div>
                  <div class="doctor-info">
                    <h4>${d.name}</h4>
                    <div class="doctor-title-badge">${d.title}</div>
                    <div class="doctor-meta">🏥 ${spec} • ⭐ ${d.exp} năm kinh nghiệm</div>
                  </div>
                </div>
                <div class="doctor-footer">
                  <div class="fee-label">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Giá khám ban đầu</span>
                    <strong style="color:var(--primary-400); font-size:1.05rem;">250.000 đ</strong>
                  </div>
                  <button class="btn btn-primary btn-sm" onclick="quickBookDoctor(${d.id})">Đặt khám bác sĩ</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Workflow Section -->
      <section class="section" id="workflow">
        <div class="section-header">
          <div class="overline">Quy trình khám bệnh</div>
          <h2>Khám chữa bệnh chuẩn y khoa với <span class="text-gradient">4 bước tinh gọn</span></h2>
          <p>Rút ngắn 80% thời gian chờ đợi tại quầy làm thủ tục so với quy trình truyền thống</p>
        </div>
        <div class="workflow-steps-grid">
          <div class="step-card card-hover">
            <div class="step-badge">Bước 1</div>
            <div class="step-icon">📱</div>
            <h4>Đặt lịch trực tuyến</h4>
            <p>Chọn chuyên khoa, bác sĩ và khung giờ 30 phút theo lịch rảnh của bạn.</p>
          </div>
          <div class="step-card card-hover">
            <div class="step-badge">Bước 2</div>
            <div class="step-icon">🎫</div>
            <h4>Nhận QR & Check-in</h4>
            <p>Nhận phiếu khám điện tử có mã QR và số thứ tự. Quét mã tại quầy tiếp tân trong 10 giây.</p>
          </div>
          <div class="step-card card-hover">
            <div class="step-badge">Bước 3</div>
            <div class="step-icon">🩺</div>
            <h4>Khám & Chẩn đoán</h4>
            <p>Bác sĩ thăm khám theo số thứ tự, chỉ định xét nghiệm nếu cần và kê đơn thuốc điện tử.</p>
          </div>
          <div class="step-card card-hover">
            <div class="step-badge">Bước 4</div>
            <div class="step-icon">💳</div>
            <h4>Thanh toán & Lấy thuốc</h4>
            <p>Tổng hợp chi phí minh bạch, quét mã VietQR hoặc thanh toán tiền mặt và nhận thuốc ra về.</p>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="section" id="features">
        <div class="section-header">
          <div class="overline">Tính năng hệ thống</div>
          <h2>Hệ sinh thái <span class="text-gradient">Y tế số liên thông</span></h2>
          <p>Dữ liệu kết nối liền mạch từ Bệnh nhân - Tiếp tân - Bác sĩ - Kế toán</p>
        </div>
        <div class="features-grid">
          <div class="feature-card card-hover">
            <div class="feature-icon" style="background: rgba(13, 148, 136, 0.15); color: var(--primary-400);">🗓️</div>
            <h4>Quản lý Slot thông minh</h4>
            <p>Hệ thống tự động phân bổ khung giờ, chống trùng lịch khám của cùng một bác sĩ.</p>
          </div>
          <div class="feature-card card-hover">
            <div class="feature-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-400);">📂</div>
            <h4>Bệnh án điện tử (EMR)</h4>
            <p>Lưu trữ lịch sử khám, các chỉ số huyết áp, mạch, dị ứng thuốc và đơn thuốc trọn đời.</p>
          </div>
          <div class="feature-card card-hover">
            <div class="feature-icon" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🧪</div>
            <h4>Chỉ định Cận lâm sàng</h4>
            <p>Bác sĩ gửi yêu cầu xét nghiệm máu, chụp X-quang trực tiếp sang phòng kỹ thuật viên.</p>
          </div>
          <div class="feature-card card-hover">
            <div class="feature-icon" style="background: rgba(34, 197, 94, 0.15); color: #4ade80;">🧾</div>
            <h4>Hóa đơn tự động & VietQR</h4>
            <p>Tự động tổng hợp: Tiền khám + Xét nghiệm + Đơn thuốc. Sinh mã QR thanh toán chuẩn NAPAS 247.</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-content">
          <div class="footer-col">
            <div class="navbar-brand">
              <div class="logo-icon">🏥</div>
              <span>Medi<span class="text-gradient">Care</span></span>
            </div>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.75rem; line-height:1.6;">
              Hệ thống quản lý đặt lịch khám & phòng khám thông minh.<br>
              Đồ án môn học: <strong>Phân tích và Thiết kế Hệ thống Thông tin</strong> (Đề tài 41 - PTIT).
            </p>
          </div>
          <div class="footer-col">
            <h5>Liên kết nhanh</h5>
            <ul class="footer-links">
              <li><a href="#specialties">Danh mục Chuyên khoa</a></li>
              <li><a href="#doctors">Đội ngũ Bác sĩ</a></li>
              <li><a href="#workflow">Quy trình khám bệnh</a></li>
              <li><a href="#" onclick="navigate('login')">Đăng nhập Demo vai trò</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h5>Thông tin liên hệ</h5>
            <p class="text-muted text-sm">📍 Học viện Công nghệ Bưu chính Viễn thông (PTIT)</p>
            <p class="text-muted text-sm">📞 Hotline hỗ trợ: 1900 6868</p>
            <p class="text-muted text-sm">✉️ Email: support@medicare-ptit.vn</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 MediCare System. Thiết kế mô hình hóa trên Visual Paradigm theo tiêu chuẩn UML 2.x.</p>
        </div>
      </footer>
    </div>
  `;
}

// ─── View: Login Page ───
function renderLogin() {
  const currentRole = AppState.loginRole || 'patient';
  const roleAccounts = {
    patient: { email: 'benhnhan@medicare.vn', pass: 'demo1234', title: 'Bệnh nhân (Nguyễn Văn An)', desc: 'Đặt lịch khám, xem phiếu hẹn QR, theo dõi đơn thuốc' },
    doctor: { email: 'bacsi.minh@medicare.vn', pass: 'demo1234', title: 'Bác sĩ (TS.BS Trần Thị Minh)', desc: 'Khám bệnh, chỉ định xét nghiệm, chẩn đoán ICD-10, kê đơn thuốc' },
    receptionist: { email: 'tieptan@medicare.vn', pass: 'demo1234', title: 'Tiếp tân / Thu ngân', desc: 'Tiếp đón check-in mã QR, cấp số thứ tự, thu viện phí & xuất hóa đơn' },
    admin: { email: 'admin@medicare.vn', pass: 'demo1234', title: 'Quản trị viên (Admin)', desc: 'Xem báo cáo doanh thu, phân ca bác sĩ, quản lý danh mục viện phí' }
  };
  const activeAcc = roleAccounts[currentRole];

  return `
    <div class="bg-grid"></div>
    <div class="bg-gradient-orbs"></div>
    <div class="page-login">
      <div class="login-container animate-in">
        <div class="login-card">
          <div class="login-header">
            <div class="logo-icon">🏥</div>
            <h3>Hệ Thống Quản Lý Phòng Khám</h3>
            <p class="text-muted text-sm" style="margin-top: 0.5rem;">Bấm chọn một vai trò bên dưới để trải nghiệm ngay không cần gõ mật khẩu</p>
          </div>
          
          <div class="login-form">
            <div class="form-group">
              <label class="form-label" style="font-weight: 600;">1. Chọn vai trò cần kiểm tra</label>
              <div class="role-selector" id="roleSelector">
                <div class="role-option ${currentRole === 'patient' ? 'active' : ''}" onclick="selectRole('patient')">
                  <span class="role-icon">🧑</span>
                  <div>Bệnh nhân</div>
                </div>
                <div class="role-option ${currentRole === 'doctor' ? 'active' : ''}" onclick="selectRole('doctor')">
                  <span class="role-icon">👨‍⚕️</span>
                  <div>Bác sĩ</div>
                </div>
                <div class="role-option ${currentRole === 'receptionist' ? 'active' : ''}" onclick="selectRole('receptionist')">
                  <span class="role-icon">👩‍💼</span>
                  <div>Tiếp tân</div>
                </div>
                <div class="role-option ${currentRole === 'admin' ? 'active' : ''}" onclick="selectRole('admin')">
                  <span class="role-icon">🔧</span>
                  <div>Quản trị</div>
                </div>
              </div>
            </div>

            <!-- Ghi chú vai trò -->
            <div class="role-info-box" style="background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem;">
              <div style="font-weight: 600; color: var(--primary-400); font-size: 0.9rem;">👉 ${activeAcc.title}</div>
              <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.25rem;">${activeAcc.desc}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Tài khoản demo</label>
              <input type="text" id="loginEmail" class="form-input" value="${activeAcc.email}" readonly style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">
            </div>

            <div class="form-group">
              <label class="form-label">Mật khẩu</label>
              <input type="password" id="loginPass" class="form-input" value="${activeAcc.pass}" readonly style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">
            </div>

            <button class="btn btn-primary btn-lg w-full" onclick="handleLogin()" style="margin-top: 0.5rem; font-size: 1rem;">
              🚀 Đăng nhập với vai trò ${activeAcc.title.split(' ')[0]}
            </button>

            <div class="text-center" style="margin-top: 1.25rem;">
              <a href="#" onclick="navigate('landing')" style="color: var(--text-muted); font-size: 0.85rem; text-decoration: none;">← Quay lại trang chủ MediCare</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Sidebar Component ───
function renderSidebar(role) {
  const menus = {
    patient: {
      label: 'Bệnh nhân',
      user: { name: 'Nguyễn Văn An', role: 'Bệnh nhân', avatar: 'VA' },
      items: [
        { icon: '📊', label: 'Tổng quan', view: 'patient-dashboard', badge: null },
        { icon: '🗓️', label: 'Đặt lịch khám', view: 'patient-booking', badge: null },
        { icon: '📋', label: 'Lịch hẹn của tôi', view: 'patient-appointments', badge: '3' },
        { icon: '📜', label: 'Lịch sử khám', view: 'patient-dashboard', badge: null },
        { icon: '👤', label: 'Hồ sơ cá nhân', view: 'patient-dashboard', badge: null },
      ]
    },
    doctor: {
      label: 'Bác sĩ',
      user: { name: 'TS.BS Trần Thị Minh', role: 'Bác sĩ Nội khoa', avatar: 'TM' },
      items: [
        { icon: '📊', label: 'Tổng quan', view: 'doctor-dashboard', badge: null },
        { icon: '👥', label: 'Hàng đợi', view: 'doctor-dashboard', badge: '5' },
        { icon: '📋', label: 'Phiếu khám', view: 'doctor-examination', badge: null },
        { icon: '📅', label: 'Lịch làm việc', view: 'doctor-dashboard', badge: null },
        { icon: '📜', label: 'Lịch sử khám', view: 'doctor-dashboard', badge: null },
      ]
    },
    receptionist: {
      label: 'Tiếp nhận',
      user: { name: 'Lê Thu Hương', role: 'Nhân viên tiếp nhận', avatar: 'TH' },
      items: [
        { icon: '📊', label: 'Tổng quan', view: 'receptionist-dashboard', badge: null },
        { icon: '📋', label: 'Lịch hẹn hôm nay', view: 'receptionist-dashboard', badge: '12' },
        { icon: '✅', label: 'Tiếp nhận BN', view: 'receptionist-dashboard', badge: null },
        { icon: '💰', label: 'Thanh toán', view: 'receptionist-billing', badge: '3' },
        { icon: '👤', label: 'Quản lý hồ sơ', view: 'receptionist-dashboard', badge: null },
      ]
    },
    admin: {
      label: 'Quản trị viên',
      user: { name: 'Admin System', role: 'Quản trị viên', avatar: 'AD' },
      items: [
        { icon: '📊', label: 'Dashboard', view: 'admin-dashboard', badge: null },
        { icon: '👥', label: 'Người dùng', view: 'admin-dashboard', badge: null },
        { icon: '🏥', label: 'Chuyên khoa', view: 'admin-dashboard', badge: null },
        { icon: '🔬', label: 'Dịch vụ CLS', view: 'admin-dashboard', badge: null },
        { icon: '💊', label: 'Danh mục thuốc', view: 'admin-dashboard', badge: null },
        { icon: '📈', label: 'Báo cáo', view: 'admin-dashboard', badge: null },
      ]
    }
  };

  const menu = menus[role];
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo-icon">🏥</div>
        <div>
          <div class="brand-text">MediCare</div>
          <div class="brand-role">${menu.label}</div>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <div class="sidebar-nav-label">Menu chính</div>
        ${menu.items.map(item => `
          <div class="sidebar-nav-item ${AppState.currentView === item.view ? 'active' : ''}" onclick="navigate('${item.view}', '${role}')">
            <span>${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          </div>
        `).join('')}
        
        <div class="sidebar-nav-label" style="margin-top: 1rem;">Hệ thống</div>
        <div class="sidebar-nav-item" onclick="navigate('landing')">
          <span>🚪</span>
          <span>Đăng xuất</span>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${menu.user.avatar}</div>
          <div class="user-info">
            <div class="name">${menu.user.name}</div>
            <div class="role">${menu.user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

// ─── Dashboard Layout ───
function renderDashboardLayout(role, content) {
  return `
    <div class="bg-grid"></div>
    <div class="page-dashboard">
      ${renderSidebar(role)}
      <main class="main-content view-enter">
        ${content}
      </main>
    </div>
    <div class="toast-container" id="toastContainer"></div>
  `;
}

// ─── Patient Dashboard ───
function renderPatientDashboard() {
  return `
    <div class="main-header">
      <div>
        <h2>Xin chào, <span class="text-gradient">Nguyễn Văn An</span> 👋</h2>
        <div class="subtitle">Chào mừng bạn quay lại MediCare</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('patient-booking', 'patient')">
        🗓️ Đặt lịch khám
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card animate-in">
        <div class="stat-icon" style="background: rgba(13, 148, 136, 0.1); color: var(--primary-400);">📅</div>
        <div class="stat-value">2</div>
        <div class="stat-label">Lịch hẹn sắp tới</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-1">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--accent-400);">📋</div>
        <div class="stat-value">8</div>
        <div class="stat-label">Lần khám trước đó</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-2">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;">💊</div>
        <div class="stat-value">3</div>
        <div class="stat-label">Đơn thuốc đang dùng</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-3">
        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #4ade80;">✅</div>
        <div class="stat-value">Tốt</div>
        <div class="stat-label">Tình trạng sức khỏe</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card animate-in">
        <h4 style="margin-bottom: 1rem;">📅 Lịch hẹn sắp tới</h4>
        <div class="appointment-list">
          <div class="appointment-card">
            <div class="appointment-date">
              <div class="day">13</div>
              <div class="month">Th09</div>
            </div>
            <div class="appointment-details">
              <div class="appointment-info">
                <h4>TS.BS Trần Thị Minh</h4>
                <p>Nội khoa • 08:00 - Phòng 201</p>
              </div>
              <span class="badge badge-success">Đã xác nhận</span>
            </div>
          </div>
          <div class="appointment-card">
            <div class="appointment-date">
              <div class="day">20</div>
              <div class="month">Th09</div>
            </div>
            <div class="appointment-details">
              <div class="appointment-info">
                <h4>PGS.TS Lê Hoàng Nam</h4>
                <p>Cơ xương khớp • 14:00 - Phòng 305</p>
              </div>
              <span class="badge badge-warning">Chờ xác nhận</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card animate-in animate-in-delay-1">
        <h4 style="margin-bottom: 1rem;">📜 Khám gần đây</h4>
        <div class="appointment-list">
          <div class="appointment-card">
            <div class="appointment-date">
              <div class="day">05</div>
              <div class="month">Th09</div>
            </div>
            <div class="appointment-details">
              <div class="appointment-info">
                <h4>Viêm dạ dày (K29)</h4>
                <p>BS Trần Thị Minh • Nội khoa</p>
              </div>
              <span class="badge badge-info">Hoàn tất</span>
            </div>
          </div>
          <div class="appointment-card">
            <div class="appointment-date">
              <div class="day">20</div>
              <div class="month">Th08</div>
            </div>
            <div class="appointment-details">
              <div class="appointment-info">
                <h4>Kiểm tra tổng quát</h4>
                <p>BS Phạm Thu Hà • Nhi khoa</p>
              </div>
              <span class="badge badge-info">Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Patient: Booking Wizard ───
function renderPatientBooking() {
  const step = AppState.booking.step;
  return `
    <div class="main-header">
      <div>
        <h2>🗓️ Đặt Lịch Khám</h2>
        <div class="subtitle">Chọn chuyên khoa, bác sĩ và thời gian phù hợp</div>
      </div>
      <button class="btn btn-secondary" onclick="navigate('patient-dashboard', 'patient')">
        ← Quay lại
      </button>
    </div>

    <div class="booking-wizard animate-in">
      <div class="wizard-steps">
        ${['Chuyên khoa', 'Bác sĩ', 'Ngày & giờ', 'Xác nhận'].map((label, i) => `
          <div class="wizard-step ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}">
            <div class="step-number">${i + 1 < step ? '✓' : i + 1}</div>
            <div class="step-label">${label}</div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <div class="wizard-content">
          ${step === 1 ? renderBookingStep1() : ''}
          ${step === 2 ? renderBookingStep2() : ''}
          ${step === 3 ? renderBookingStep3() : ''}
          ${step === 4 ? renderBookingStep4() : ''}
          ${step === 5 ? renderBookingSuccess() : ''}
        </div>

        ${step < 5 ? `
        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="bookingPrev()" ${step === 1 ? 'disabled style="opacity:0.3"' : ''}>
            ← Quay lại
          </button>
          ${step < 4 ? `
            <button class="btn btn-primary" onclick="bookingNext()">
              Tiếp theo →
            </button>
          ` : `
            <button class="btn btn-primary btn-lg" onclick="confirmBooking()">
              ✅ Xác nhận đặt lịch
            </button>
          `}
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderBookingStep1() {
  return `
    <h4 style="margin-bottom: 1.5rem;">Chọn chuyên khoa khám</h4>
    <div class="specialty-grid">
      ${MOCK_DATA.specialties.map(s => `
        <div class="specialty-card ${AppState.booking.specialty === s.id ? 'selected' : ''}" 
             onclick="selectSpecialty(${s.id})">
          <span class="spec-icon">${s.icon}</span>
          <div class="spec-name">${s.name}</div>
          <div class="spec-count">${s.count} bác sĩ</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderBookingStep2() {
  const doctors = MOCK_DATA.doctors.filter(d => d.specialty === AppState.booking.specialty);
  const specName = MOCK_DATA.specialties.find(s => s.id === AppState.booking.specialty)?.name || '';
  return `
    <h4 style="margin-bottom: 0.5rem;">Chọn bác sĩ — ${specName}</h4>
    <p class="text-muted text-sm" style="margin-bottom: 1.5rem;">Chọn bác sĩ bạn muốn khám</p>
    <div class="doctor-list">
      ${doctors.map(d => `
        <div class="doctor-card ${AppState.booking.doctor === d.id ? 'selected' : ''}"
             onclick="selectDoctor(${d.id})">
          <div class="doctor-avatar">${d.avatar}</div>
          <div class="doctor-info">
            <h4>${d.name}</h4>
            <div class="doctor-title">${d.title}</div>
            <div class="doctor-exp">⭐ ${d.exp} năm kinh nghiệm</div>
          </div>
          ${AppState.booking.doctor === d.id ? '<span class="badge badge-primary">Đã chọn</span>' : ''}
        </div>
      `).join('')}
      ${doctors.length === 0 ? '<p class="text-muted text-center" style="padding: 2rem;">Không có bác sĩ nào cho chuyên khoa này</p>' : ''}
    </div>
  `;
}

function renderBookingStep3() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <h4 style="margin-bottom: 1.5rem;">Chọn ngày và khung giờ khám</h4>
    
    <div class="form-group" style="margin-bottom: 1.5rem;">
      <label class="form-label">📅 Chọn ngày khám</label>
      <input type="date" class="form-input" id="bookingDate" min="${today}" 
             value="${AppState.booking.date || today}" onchange="selectDate(this.value)" 
             style="max-width: 300px;">
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label class="form-label" style="margin-bottom: 0.75rem; display:block;">🌅 Buổi sáng</label>
      <div class="time-slots-grid">
        ${MOCK_DATA.timeSlots.morning.map(t => {
          const disabled = Math.random() > 0.7;
          return `
            <div class="time-slot ${AppState.booking.time === t ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
                 onclick="${disabled ? '' : `selectTime('${t}')`}">
              ${t}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div>
      <label class="form-label" style="margin-bottom: 0.75rem; display:block;">🌇 Buổi chiều</label>
      <div class="time-slots-grid">
        ${MOCK_DATA.timeSlots.afternoon.map(t => {
          const disabled = Math.random() > 0.7;
          return `
            <div class="time-slot ${AppState.booking.time === t ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
                 onclick="${disabled ? '' : `selectTime('${t}')`}">
              ${t}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="form-group" style="margin-top: 1.5rem;">
      <label class="form-label">📝 Lý do khám / Triệu chứng</label>
      <textarea class="form-input" placeholder="Mô tả triệu chứng hoặc lý do khám..." 
                id="bookingReason" onchange="AppState.booking.reason = this.value">${AppState.booking.reason}</textarea>
    </div>
  `;
}

function renderBookingStep4() {
  const spec = MOCK_DATA.specialties.find(s => s.id === AppState.booking.specialty);
  const doc = MOCK_DATA.doctors.find(d => d.id === AppState.booking.doctor);
  return `
    <h4 style="margin-bottom: 1.5rem;">📋 Xác nhận thông tin đặt lịch</h4>
    <div class="booking-summary">
      <div class="summary-row">
        <span class="summary-label">Chuyên khoa</span>
        <span class="summary-value">${spec?.icon} ${spec?.name || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Bác sĩ</span>
        <span class="summary-value">${doc?.name || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Chức danh</span>
        <span class="summary-value">${doc?.title || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Ngày khám</span>
        <span class="summary-value">📅 ${formatDate(AppState.booking.date)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Giờ khám</span>
        <span class="summary-value">🕐 ${AppState.booking.time || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Lý do khám</span>
        <span class="summary-value" style="max-width: 300px; text-align:right;">${AppState.booking.reason || 'Không ghi'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Phí khám</span>
        <span class="summary-value" style="color: var(--primary-300); font-size: 1.1rem;">200,000 VNĐ</span>
      </div>
    </div>
    <p class="text-muted text-sm" style="margin-top: 1rem; text-align: center;">
      ⚠️ Vui lòng kiểm tra kỹ thông tin trước khi xác nhận đặt lịch
    </p>
  `;
}

function renderBookingSuccess() {
  const apt = AppState.lastCreatedAppointment || {
    code: 'LH-20260914-006',
    doctor: 'TS.BS Trần Thị Minh',
    specialty: 'Nội khoa',
    date: new Date().toISOString().split('T')[0],
    time: '08:30',
    patient: 'Nguyễn Văn An',
    stt: 6,
    room: 'Phòng 201'
  };

  return `
    <div class="appointment-slip-container animate-in">
      <div class="slip-header-badge">
        <span class="slip-icon">🎉</span>
        <h3>Đặt Lịch Khám Thành Công!</h3>
        <p class="text-muted text-sm">Phiếu hẹn khám điện tử đã được kích hoạt trên hệ thống phòng khám</p>
      </div>

      <!-- Phiếu hẹn khám điện tử chuẩn thực tế (Medical Appointment Slip) -->
      <div class="digital-slip-card">
        <div class="slip-top-banner">
          <div class="slip-brand">
            <div class="logo-icon">🏥</div>
            <div>
              <div style="font-weight:700; color:white; font-size:1rem;">PHÒNG KHÁM ĐA KHOA MEDICARE</div>
              <div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">Km10 Nguyễn Trãi, Hà Đông, Hà Nội • Hotline: 1900 6868</div>
            </div>
          </div>
          <div class="slip-stt-box">
            <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Số thứ tự (STT)</div>
            <div class="slip-stt-num">#${String(apt.stt).padStart(2, '0')}</div>
          </div>
        </div>

        <div class="slip-body">
          <div class="slip-info-grid">
            <div class="slip-info-item">
              <span class="label">Mã phiếu hẹn:</span>
              <strong class="value text-gradient" style="font-size:1.05rem;">${apt.code}</strong>
            </div>
            <div class="slip-info-item">
              <span class="label">Bệnh nhân:</span>
              <span class="value">${apt.patient}</span>
            </div>
            <div class="slip-info-item">
              <span class="label">Bác sĩ khám:</span>
              <span class="value" style="color:var(--primary-300); font-weight:600;">${apt.doctor}</span>
            </div>
            <div class="slip-info-item">
              <span class="label">Chuyên khoa:</span>
              <span class="value">${apt.specialty}</span>
            </div>
            <div class="slip-info-item">
              <span class="label">Thời gian hẹn:</span>
              <span class="value">🕐 <strong>${apt.time}</strong> — 📅 ${formatDate(apt.date)}</span>
            </div>
            <div class="slip-info-item">
              <span class="label">Phòng khám dự kiến:</span>
              <span class="value badge badge-primary">${apt.room || 'Phòng 201'}</span>
            </div>
          </div>

          <!-- QR Code khu vực tiếp tân quét -->
          <div class="slip-qr-box">
            <div class="qr-code-wrapper">
              <!-- SVG QR Code chuẩn hóa mô phỏng -->
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="background:white; padding:8px; border-radius:8px;">
                <rect width="130" height="130" fill="white"/>
                <!-- Outer corners -->
                <rect x="10" y="10" width="35" height="35" fill="#0f172a" rx="4"/>
                <rect x="15" y="15" width="25" height="25" fill="white" rx="2"/>
                <rect x="20" y="20" width="15" height="15" fill="#0d9488"/>

                <rect x="85" y="10" width="35" height="35" fill="#0f172a" rx="4"/>
                <rect x="90" y="15" width="25" height="25" fill="white" rx="2"/>
                <rect x="95" y="20" width="15" height="15" fill="#0d9488"/>

                <rect x="10" y="85" width="35" height="35" fill="#0f172a" rx="4"/>
                <rect x="15" y="90" width="25" height="25" fill="white" rx="2"/>
                <rect x="20" y="95" width="15" height="15" fill="#0d9488"/>

                <!-- QR Data Matrix Pattern -->
                <rect x="52" y="14" width="8" height="8" fill="#0f172a"/>
                <rect x="68" y="14" width="8" height="8" fill="#0f172a"/>
                <rect x="52" y="28" width="8" height="8" fill="#0d9488"/>
                <rect x="68" y="28" width="8" height="8" fill="#0f172a"/>
                
                <rect x="14" y="52" width="8" height="8" fill="#0f172a"/>
                <rect x="28" y="52" width="8" height="8" fill="#0d9488"/>
                <rect x="44" y="44" width="10" height="10" fill="#0f172a"/>
                <rect x="60" y="44" width="10" height="10" fill="#0d9488"/>
                <rect x="76" y="44" width="10" height="10" fill="#0f172a"/>
                <rect x="92" y="52" width="8" height="8" fill="#0d9488"/>
                <rect x="108" y="52" width="8" height="8" fill="#0f172a"/>

                <rect x="52" y="60" width="10" height="10" fill="#0f172a"/>
                <rect x="68" y="60" width="10" height="10" fill="#0f172a"/>
                <rect x="84" y="68" width="8" height="8" fill="#0d9488"/>

                <rect x="52" y="88" width="8" height="8" fill="#0d9488"/>
                <rect x="68" y="88" width="8" height="8" fill="#0f172a"/>
                <rect x="52" y="104" width="8" height="8" fill="#0f172a"/>
                <rect x="68" y="104" width="8" height="8" fill="#0d9488"/>
                <rect x="88" y="92" width="12" height="12" fill="#0f172a"/>
                <rect x="104" y="92" width="12" height="12" fill="#0d9488"/>
                <rect x="92" y="108" width="24" height="8" fill="#0f172a"/>
              </svg>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem; text-align:center;">
              Mã QR Check-in Quầy Tiếp Đón
            </div>
          </div>
        </div>

        <div class="slip-notes">
          📌 <strong>Lưu ý:</strong> Vui lòng có mặt trước giờ hẹn 10 phút và xuất trình mã QR này hoặc mã hẹn <strong>${apt.code}</strong> tại quầy tiếp đón để được cấp số thứ tự vào phòng khám.
        </div>
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="navigate('patient-appointments', 'patient')">
          📋 Quản lý Lịch hẹn của tôi
        </button>
        <button class="btn btn-secondary" onclick="window.print()">
          🖨️ In / Lưu Phiếu hẹn
        </button>
        <button class="btn btn-outline" onclick="quickStartBooking()">
          🗓️ Đặt thêm lịch khám khác
        </button>
      </div>
    </div>
  `;
}

// ─── Patient: Appointments ───
function renderPatientAppointments() {
  return `
    <div class="main-header">
      <div>
        <h2>📋 Lịch Hẹn Của Tôi</h2>
        <div class="subtitle">Theo dõi trạng thái, xem mã QR check-in hoặc hủy lịch hẹn</div>
      </div>
      <button class="btn btn-primary" onclick="quickStartBooking()">
        🗓️ Đặt lịch mới
      </button>
    </div>

    <div class="card animate-in" style="margin-bottom: 1.5rem;">
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Mã lịch hẹn</th>
              <th>Bác sĩ</th>
              <th>Chuyên khoa</th>
              <th>Ngày khám</th>
              <th>Khung giờ</th>
              <th>Trạng thái</th>
              <th style="text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_DATA.appointments.map(a => {
              const statusBadges = {
                'pending': '<span class="badge badge-warning">Chờ tiếp nhận</span>',
                'confirmed': '<span class="badge badge-success">Đã xác nhận</span>',
                'checked-in': '<span class="badge badge-info">Đã Check-in</span>',
                'completed': '<span class="badge badge-primary">Đã khám xong</span>',
                'cancelled': '<span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">Đã hủy</span>'
              };
              const badge = statusBadges[a.status] || `<span class="badge">${a.status}</span>`;

              return `
                <tr>
                  <td><strong style="color: var(--primary-300);">${a.code}</strong></td>
                  <td><strong>${a.doctor}</strong></td>
                  <td>${a.specialty}</td>
                  <td>${formatDate(a.date)}</td>
                  <td><span class="badge badge-secondary" style="font-size:0.8rem;">🕐 ${a.time}</span></td>
                  <td>${badge}</td>
                  <td style="text-align: right;">
                    ${(a.status === 'pending' || a.status === 'confirmed') ? `
                      <button class="btn btn-sm btn-secondary" onclick="viewQrSlip('${a.code}')" style="margin-right:0.4rem;">
                        📱 QR
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="cancelPatientAppointment(${a.id})">
                        Hủy hẹn
                      </button>
                    ` : a.status === 'checked-in' ? `
                      <span class="text-sm" style="color:var(--accent-400);">Đang xếp hàng...</span>
                    ` : a.status === 'completed' ? `
                      <span class="text-sm" style="color:var(--success);">✅ Đã xong</span>
                    ` : `
                      <span class="text-muted text-sm">—</span>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Doctor Dashboard ───
function renderDoctorDashboard() {
  const waitingPatients = MOCK_DATA.patients.filter(p => p.status === 'waiting');
  const completedCount = 12;

  return `
    <div class="main-header">
      <div>
        <h2>Xin chào, <span class="text-gradient">TS.BS Trần Thị Minh</span> 👨‍⚕️</h2>
        <div class="subtitle">Phòng khám 201 • ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div class="flex gap-sm">
        <button class="btn btn-primary" onclick="callNextPatient()">
          📢 Gọi bệnh nhân tiếp theo
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card animate-in">
        <div class="stat-icon" style="background: rgba(13, 148, 136, 0.1); color: var(--primary-400);">👥</div>
        <div class="stat-value">${waitingPatients.length}</div>
        <div class="stat-label">Bệnh nhân đang chờ khám</div>
        <div class="stat-change up">Đã check-in tại quầy</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-1">
        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #4ade80;">✅</div>
        <div class="stat-value">${completedCount}</div>
        <div class="stat-label">Đã khám xong hôm nay</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-2">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--accent-400);">📋</div>
        <div class="stat-value">${waitingPatients.length + completedCount}</div>
        <div class="stat-label">Tổng ca tiếp nhận</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-3">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;">⏱️</div>
        <div class="stat-value">~15'</div>
        <div class="stat-label">Thời gian khám TB / BN</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card animate-in">
        <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
          <h4>👥 Hàng đợi bệnh nhân tại phòng khám</h4>
          <span class="badge badge-primary">${waitingPatients.length} người chờ</span>
        </div>
        <div class="queue-list">
          ${waitingPatients.map((p, i) => `
            <div class="queue-item ${i === 0 ? 'active' : ''}" onclick="selectPatientForExam(${p.id})">
              <div class="queue-number">#${String(p.stt || i + 1).padStart(2, '0')}</div>
              <div class="queue-info">
                <div class="name">${p.name}</div>
                <div class="detail">🕐 ${p.time} • Lý do: ${p.reason.substring(0, 35)}...</div>
              </div>
              <span class="badge ${i === 0 ? 'badge-primary' : 'badge-warning'}">${i === 0 ? '▶ Gọi khám' : 'Đang chờ'}</span>
            </div>
          `).join('')}
          ${waitingPatients.length === 0 ? '<p class="text-muted text-center" style="padding: 2rem;">Hiện tại không có bệnh nhân nào trong hàng đợi</p>' : ''}
        </div>
      </div>

      <div class="card animate-in animate-in-delay-1">
        <h4 style="margin-bottom: 1rem;">📊 Hiệu suất khám bệnh trong ngày</h4>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-glass); border-radius: var(--radius-md);">
            <span class="text-sm">Tiến độ khám</span>
            <div style="flex: 1; margin: 0 1rem; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
              <div style="width: 72%; height: 100%; background: var(--gradient-primary); border-radius: 3px;"></div>
            </div>
            <span class="text-sm" style="font-weight: 600;">12/17 BN</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-glass); border-radius: var(--radius-md);">
            <span class="text-sm">Chỉ định Cận lâm sàng</span>
            <div style="flex: 1; margin: 0 1rem; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
              <div style="width: 45%; height: 100%; background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 3px;"></div>
            </div>
            <span class="text-sm" style="font-weight: 600;">6 ca</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-glass); border-radius: var(--radius-md);">
            <span class="text-sm">Đơn thuốc đã cấp</span>
            <div style="flex: 1; margin: 0 1rem; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
              <div style="width: 85%; height: 100%; background: linear-gradient(135deg, #22c55e, #4ade80); border-radius: 3px;"></div>
            </div>
            <span class="text-sm" style="font-weight: 600;">11 đơn</span>
          </div>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
          <button class="btn btn-primary w-full" onclick="callNextPatient()">
            🩺 Mở Phiếu khám bệnh nhân đang gọi
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Doctor: Examination Form ───
function renderDoctorExamination() {
  const patientId = AppState.examination.selectedPatient || MOCK_DATA.patients[0]?.id;
  const patient = MOCK_DATA.patients.find(p => p.id === patientId) || MOCK_DATA.patients[0];
  
  if (!AppState.examination.clsOrders || AppState.examination.clsOrders.length === 0) {
    AppState.examination.clsOrders = [
      {
        id: 1,
        code: 'XN_CBC',
        name: 'Tổng phân tích tế bào máu ngoại vi (CBC)',
        price: 150000,
        type: 'Xét nghiệm',
        status: 'COMPLETED',
        conclusion: 'Tăng nhẹ bạch cầu đa nhân trung tính. Không thấy thiếu máu.',
        result: 'Bạch cầu tăng nhẹ (12.5 G/L), hồng cầu và tiểu cầu trong giới hạn bình thường.',
        resultFileUrl: 'https://medicare.vn/results/CBC-20260914.pdf',
        attachments: [],
        indicators: [
          { name: 'Số lượng Hồng cầu (RBC)', value: '4.85', unit: 'T/L', normalRange: '4.0 - 5.5', isAbnormal: false },
          { name: 'Số lượng Bạch cầu (WBC)', value: '12.4', unit: 'G/L', normalRange: '4.0 - 10.0', isAbnormal: true },
          { name: 'Huyết sắc tố (Hb)', value: '142', unit: 'g/L', normalRange: '120 - 165', isAbnormal: false },
          { name: 'Số lượng Tiểu cầu (PLT)', value: '235', unit: 'G/L', normalRange: '150 - 450', isAbnormal: false }
        ]
      },
      {
        id: 3,
        code: 'SA_OB',
        name: 'Siêu âm ổ bụng tổng quát màu',
        price: 250000,
        type: 'Siêu âm',
        status: 'COMPLETED',
        conclusion: 'Gan, mật, tụy, lách, 2 thận hình thái bình thường. Không thấy sỏi hoặc khối u khu trú. Không có dịch tự do ổ bụng.',
        result: 'Các tạng trong ổ bụng trong giới hạn bình thường.',
        resultFileUrl: 'https://medicare.vn/results/SA-20260914.pdf',
        attachments: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=60'],
        indicators: [
          { name: 'Nhu mô gan', value: 'Đồng nhất', unit: '', normalRange: 'Đồng nhất, bờ đều', isAbnormal: false },
          { name: 'Túi mật', value: 'Thành mỏng, không sỏi', unit: '', normalRange: 'Thành mỏng < 3mm', isAbnormal: false },
          { name: 'Dịch tự do ổ bụng', value: 'Âm tính', unit: '', normalRange: 'Không có', isAbnormal: false }
        ]
      }
    ];
  }
  if (!AppState.examination.prescriptions) {
    AppState.examination.prescriptions = [
      { id: 1, name: 'Omeprazol 20mg', dose: '2 viên/ngày × 14 ngày • Uống trước ăn 30p', qty: 28, price: 70000 },
      { id: 2, name: 'Domperidon 10mg', dose: '3 viên/ngày × 7 ngày • Uống trước ăn 15p', qty: 21, price: 31500 },
      { id: 8, name: 'Vitamin B Complex', dose: '1 viên/ngày × 14 ngày • Uống sau ăn', qty: 14, price: 16800 }
    ];
  }

  const totalCls = AppState.examination.clsOrders.reduce((sum, item) => sum + item.price, 0);
  const totalMeds = AppState.examination.prescriptions.reduce((sum, item) => sum + item.price, 0);

  return `
    <div class="main-header">
      <div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <h2>📋 Phiếu Khám Bệnh Điện Tử — <span class="text-gradient">PK-20260914-${String(patient.id).padStart(3, '0')}</span></h2>
          <span id="examStatusBadge" class="badge ${patient.status === 'in_progress' ? 'badge-primary' : 'badge-warning'}">
            ${patient.status === 'in_progress' ? '🩺 Đang khám' : '⏳ Chờ khám'}
          </span>
        </div>
        <div class="subtitle" style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap; margin-top:0.25rem;">
          <span>Bác sĩ phụ trách: <strong>TS.BS Trần Thị Minh</strong> (Nội khoa • Phòng 201)</span>
          <span id="autoSaveIndicator" style="font-size: 0.8rem; color: #4ade80; display: inline-flex; align-items: center; gap: 0.35rem;">
            💾 <span id="autoSaveText">Tự động lưu nháp: Đã sẵn sàng</span>
          </span>
        </div>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="navigate('doctor-dashboard', 'doctor')">← Hàng đợi</button>
        ${patient.status !== 'in_progress' ? `
          <button class="btn btn-primary" id="btnStartExam" onclick="startPatientExamination(${patient.id})">
            ▶ Bắt đầu khám
          </button>
        ` : `
          <button class="btn btn-outline" onclick="triggerManualSaveDraft(${patient.id})">
            💾 Lưu nháp
          </button>
        `}
        <button class="btn btn-success" onclick="completeExamination(${patient.id})">✅ Hoàn tất khám & Chuyển Thu ngân</button>
      </div>
    </div>

    <!-- Patient Info Banner -->
    <div class="card animate-in" style="margin-bottom: 1.5rem; background: var(--gradient-card);">
      <div class="flex items-center gap-lg" style="flex-wrap: wrap;">
        <div class="user-avatar" style="width: 50px; height: 50px; font-size: 1.1rem; background: linear-gradient(135deg, var(--primary-500), var(--accent-500));">
          ${patient.name.split(' ').pop().charAt(0)}${patient.name.split(' ')[0].charAt(0)}
        </div>
        <div style="flex: 1; min-width: 200px;">
          <h4>${patient.name} <span class="badge badge-primary">STT #${String(patient.stt || 1).padStart(2, '0')}</span></h4>
          <div class="text-sm text-muted">Ngày sinh: ${formatDate(patient.dob)} • Giới tính: ${patient.gender} • SĐT: ${patient.phone}</div>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <span class="badge ${patient.allergy !== 'Không' ? 'badge-danger' : 'badge-success'}">
            ⚠️ Dị ứng: ${patient.allergy}
          </span>
          <span class="badge badge-info">📜 Tiền sử: ${patient.history}</span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- Left Column: Clinical Examination -->
      <div>
        <!-- Vitals Card with Auto-BMI -->
        <div class="card animate-in" style="margin-bottom: 1.5rem;">
          <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
            <h4>🫀 Chỉ số sinh hiệu & Thể trạng</h4>
            <span class="badge badge-success" id="bmiBadge">BMI: 22.5 (Bình thường)</span>
          </div>
          <div class="vitals-grid">
            <div class="vital-input">
              <label>Mạch</label>
              <input type="text" id="vitalPulse" value="80" oninput="handleAutoSaveDraft(${patient.id})" placeholder="80">
              <div class="unit">lần/phút</div>
            </div>
            <div class="vital-input">
              <label>Huyết áp</label>
              <input type="text" id="vitalBP" value="120/80" oninput="handleAutoSaveDraft(${patient.id})" placeholder="120/80">
              <div class="unit">mmHg</div>
            </div>
            <div class="vital-input">
              <label>Thân nhiệt</label>
              <input type="text" id="vitalTemp" value="36.8" oninput="handleAutoSaveDraft(${patient.id})" placeholder="36.5">
              <div class="unit">°C</div>
            </div>
            <div class="vital-input">
              <label>Chiều cao</label>
              <input type="number" id="vitalHeight" value="170" oninput="calculateBMI(); handleAutoSaveDraft(${patient.id});" placeholder="170">
              <div class="unit">cm</div>
            </div>
            <div class="vital-input">
              <label>Cân nặng</label>
              <input type="number" id="vitalWeight" value="65" oninput="calculateBMI(); handleAutoSaveDraft(${patient.id});" placeholder="65">
              <div class="unit">kg</div>
            </div>
            <div class="vital-input">
              <label>SpO2</label>
              <input type="number" id="vitalSpo2" value="98" oninput="handleAutoSaveDraft(${patient.id})" placeholder="98">
              <div class="unit">%</div>
            </div>
          </div>
        </div>

        <!-- Clinical Exam Card -->
        <div class="card animate-in animate-in-delay-1" style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 1rem;">🔍 Khám lâm sàng & Bệnh sử</h4>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Lý do đến khám ban đầu</label>
            <input type="text" class="form-input" id="examReason" value="${patient.reason}" oninput="handleAutoSaveDraft(${patient.id})">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Bệnh sử hiện tại & Diễn tiến</label>
            <textarea class="form-input" id="examHistory" rows="2" placeholder="Nhập bệnh sử hiện tại..." oninput="handleAutoSaveDraft(${patient.id})">Khởi phát cách đây 3 ngày với cảm giác ợ chua, cồn cào vùng thượng vị sau ăn. Đã tự dùng thuốc dạ dày không đỡ.</textarea>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Ghi nhận triệu chứng lâm sàng</label>
            <textarea class="form-input" id="examSymptoms" rows="2" oninput="handleAutoSaveDraft(${patient.id})">Bụng mềm, ấn đau tức nhẹ thượng vị, không đề kháng. Tim đều, phổi trong, không ran.</textarea>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Chẩn đoán sơ bộ ban đầu</label>
            <input type="text" class="form-input" id="examPrelimDiagnosis" value="Theo dõi Viêm loét dạ dày tá tràng cấp" oninput="handleAutoSaveDraft(${patient.id})">
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Chẩn đoán xác định</label>
              <input type="text" class="form-input" id="examDiagnosis" value="Viêm dạ dày tá tràng / Theo dõi trào ngược dạ dày thực quản" oninput="handleAutoSaveDraft(${patient.id})">
            </div>
            <div class="form-group">
              <label class="form-label">Mã ICD-10</label>
              <select class="form-input" id="examIcd10" onchange="handleAutoSaveDraft(${patient.id})">
                <option value="K29" selected>K29 - Viêm dạ dày</option>
                <option value="K21">K21 - Trào ngược dạ dày (GERD)</option>
                <option value="I10">I10 - Tăng huyết áp vô căn</option>
                <option value="J00">J00 - Viêm mũi họng cấp</option>
                <option value="M17">M17 - Thoái hóa khớp gối</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Follow-up Card -->
        <div class="card animate-in animate-in-delay-2">
          <h4 style="margin-bottom: 1rem;">📝 Lời dặn & Hẹn tái khám</h4>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Chế độ dinh dưỡng & sinh hoạt</label>
            <textarea class="form-input" id="examNotes" rows="2">Ăn uống điều độ, tránh thức ăn cay nóng, kiêng rượu bia và cà phê. Nghỉ ngơi hợp lý.</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Hẹn ngày tái khám</label>
            <input type="date" class="form-input" id="examFollowUp" value="2026-09-28" style="max-width: 250px;">
          </div>
        </div>
      </div>

      <!-- Right Column: Lab Orders & Prescriptions -->
      <div>
        <!-- CLS Orders -->
        <div class="card animate-in animate-in-delay-1" style="margin-bottom: 1.5rem;">
          <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
            <div>
              <h4 style="margin: 0;">🔬 Chỉ định Cận lâm sàng & Kết quả CLS</h4>
              <div class="text-xs text-muted" style="margin-top: 0.2rem;">Kỹ thuật viên trả kết quả trực tiếp về màn hình bác sĩ khám</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="openAddClsModal()">+ Thêm chỉ định CLS</button>
          </div>
          <div class="prescription-list">
            ${AppState.examination.clsOrders.map((cls, index) => {
              const statusBadge = cls.status === 'COMPLETED' 
                ? '<span class="badge badge-success" style="font-size:0.75rem;">✅ COMPLETED (Đã có kết quả)</span>'
                : cls.status === 'PAID'
                ? '<span class="badge badge-info" style="font-size:0.75rem;">💳 PAID (Đã thu tiền)</span>'
                : '<span class="badge badge-warning" style="font-size:0.75rem;">⏳ ORDERED (Chờ thu tiền)</span>';

              const hasAbnormal = cls.indicators && cls.indicators.some(i => i.isAbnormal);

              return `
              <div class="prescription-item" style="flex-direction: column; align-items: stretch; gap: 0.6rem; border-left: 4px solid ${cls.status === 'COMPLETED' ? (hasAbnormal ? '#ef4444' : '#22c55e') : cls.status === 'PAID' ? '#0284c7' : '#f59e0b'};">
                <div class="flex justify-between items-center">
                  <div>
                    <strong style="color: var(--text-primary); font-size: 0.95rem;">${cls.name}</strong>
                    <div class="text-xs text-muted">${cls.type} • Mã: ${cls.code || 'CLS'} • <strong>${cls.price.toLocaleString()} VNĐ</strong></div>
                  </div>
                  <div class="flex items-center gap-sm">
                    ${statusBadge}
                    <span class="med-remove" title="Hủy chỉ định" onclick="removeClsOrder(${index})">✕</span>
                  </div>
                </div>

                ${cls.status === 'COMPLETED' ? `
                  <!-- Kết quả chi tiết dành cho bác sĩ -->
                  <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem;">
                    ${cls.conclusion ? `
                      <div style="margin-bottom: 0.5rem; font-size: 0.88rem;">
                        <strong style="color: var(--primary-300);">📋 Kết luận:</strong> ${cls.conclusion}
                        ${hasAbnormal ? '<span class="badge badge-danger" style="margin-left: 0.5rem; font-size: 0.7rem;">⚠️ Có chỉ số bất thường</span>' : ''}
                      </div>
                    ` : ''}

                    ${cls.indicators && cls.indicators.length > 0 ? `
                      <div style="overflow-x: auto; margin-top: 0.4rem;">
                        <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                          <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); text-align: left;">
                              <th style="padding: 0.25rem 0.5rem;">Chỉ số đo lường</th>
                              <th style="padding: 0.25rem 0.5rem;">Kết quả</th>
                              <th style="padding: 0.25rem 0.5rem;">Đơn vị</th>
                              <th style="padding: 0.25rem 0.5rem;">Khoảng tham chiếu</th>
                              <th style="padding: 0.25rem 0.5rem;">Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${cls.indicators.map(ind => `
                              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${ind.isAbnormal ? 'background: rgba(239, 68, 68, 0.1);' : ''}">
                                <td style="padding: 0.35rem 0.5rem; font-weight: ${ind.isAbnormal ? '700' : '500'};">${ind.name}</td>
                                <td style="padding: 0.35rem 0.5rem; font-weight: 700; color: ${ind.isAbnormal ? '#ef4444' : 'inherit'};">${ind.value}</td>
                                <td style="padding: 0.35rem 0.5rem; color: var(--text-muted);">${ind.unit || '-'}</td>
                                <td style="padding: 0.35rem 0.5rem; color: var(--text-muted);">${ind.normalRange || '-'}</td>
                                <td style="padding: 0.35rem 0.5rem;">
                                  ${ind.isAbnormal ? '<span class="badge badge-danger" style="font-size:0.65rem;">Cao/Bất thường</span>' : '<span class="badge badge-success" style="font-size:0.65rem;">Bình thường</span>'}
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    ` : ''}

                    ${cls.attachments && cls.attachments.length > 0 ? `
                      <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="text-xs text-muted">📸 Hình ảnh cận lâm sàng đính kèm:</span>
                        ${cls.attachments.map((imgUrl, i) => `
                          <a href="${imgUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--primary-300); text-decoration: underline; background: rgba(13,148,136,0.1); padding: 0.2rem 0.5rem; border-radius: 4px;">
                            🖼️ Xem ảnh ${i + 1}
                          </a>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <div class="flex justify-end gap-sm" style="margin-top: 0.2rem;">
                  ${cls.status === 'ORDERED' ? `
                    <button class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding: 0.2rem 0.5rem;" onclick="payClsOrder(${index})">
                      💳 Thu tiền tại quầy (PAID)
                    </button>
                  ` : cls.status === 'PAID' ? `
                    <button class="btn btn-primary btn-sm" style="font-size:0.75rem; padding: 0.2rem 0.5rem;" onclick="enterClsResult(${index})">
                      📝 KTV Nhập kết quả (COMPLETED)
                    </button>
                  ` : `
                    <button class="btn btn-outline btn-sm" style="font-size:0.75rem; padding: 0.2rem 0.5rem;" onclick="enterClsResult(${index})">
                      ✏️ Cập nhật kết quả KTV
                    </button>
                  `}
                </div>
              </div>
            `;
            }).join('')}
          </div>
          <div class="flex justify-between mt-md" style="padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
            <span class="text-sm text-muted">Tổng chi phí CLS (Tự động đồng bộ viện phí):</span>
            <span class="text-sm" style="font-weight: 700; color: var(--primary-300);">${totalCls.toLocaleString()} VNĐ</span>
          </div>
        </div>

        <!-- Prescriptions -->
        <div class="card animate-in animate-in-delay-2">
          <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
            <h4>💊 Đơn thuốc điện tử</h4>
            <button class="btn btn-outline btn-sm" onclick="openAddMedicineModal()">+ Thêm thuốc</button>
          </div>
          <div class="prescription-list">
            ${AppState.examination.prescriptions.map((med, index) => `
              <div class="prescription-item">
                <div>
                  <div class="med-name">${med.name}</div>
                  <div class="med-detail">${med.dose} • <strong>${med.price.toLocaleString()} VNĐ</strong></div>
                </div>
                <span class="med-remove" onclick="removeMedicine(${index})">✕</span>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between mt-md" style="padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
            <span class="text-sm text-muted">Tổng tiền thuốc:</span>
            <span class="text-sm" style="font-weight: 700; color: var(--primary-300);">${totalMeds.toLocaleString()} VNĐ</span>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; font-size:0.95rem;">
              <span>Tổng viện phí dự kiến:</span>
              <strong style="color:var(--primary-300); font-size:1.15rem;">${(200000 + totalCls + totalMeds).toLocaleString()} VNĐ</strong>
            </div>
            <button class="btn btn-primary btn-lg w-full" onclick="completeExamination(${patient.id})">
              🚀 Hoàn tất ca khám & Chuyển Thu ngân
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Receptionist Dashboard ───
function renderReceptionistDashboard() {
  const todayApts = MOCK_DATA.appointments;
  const checkedInCount = todayApts.filter(a => a.status === 'checked-in').length;
  const pendingCount = todayApts.filter(a => a.status === 'pending' || a.status === 'confirmed').length;

  return `
    <div class="main-header">
      <div>
        <h2>📊 Quầy Tiếp Đón & Check-in Khám Bệnh</h2>
        <div class="subtitle">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Quầy tiếp tân số 1</div>
      </div>
      <div class="flex gap-sm">
        <button class="btn btn-primary" onclick="openWalkInModal()">+ Tiếp nhận BN vãng lai</button>
        <button class="btn btn-secondary" onclick="navigate('receptionist-billing', 'receptionist')">💰 Quầy Thu viện phí</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card animate-in">
        <div class="stat-icon" style="background: rgba(13, 148, 136, 0.1); color: var(--primary-400);">📋</div>
        <div class="stat-value">${todayApts.length}</div>
        <div class="stat-label">Tổng lịch hẹn hôm nay</div>
        <div class="stat-change up">↑ Liên thông từ Web đặt lịch</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-1">
        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #4ade80;">✅</div>
        <div class="stat-value">${checkedInCount}</div>
        <div class="stat-label">Đã Check-in vào phòng khám</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-2">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;">⏳</div>
        <div class="stat-value">${pendingCount}</div>
        <div class="stat-label">Chờ tiếp nhận tại quầy</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-3">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--accent-400);">💰</div>
        <div class="stat-value">12.8M</div>
        <div class="stat-label">Doanh thu tạm thu</div>
      </div>
    </div>

    <!-- Quick QR Check-in Box -->
    <div class="card animate-in" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(99, 102, 241, 0.08)); border-color: rgba(45, 212, 191, 0.3);">
      <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
        <div>
          <h4 style="color: var(--primary-300); margin-bottom: 0.25rem;">⚡ Quét Mã QR hoặc Nhập Mã Hẹn Khám</h4>
          <p class="text-muted text-sm">Quét mã QR trên phiếu khám điện tử của bệnh nhân để tự động cấp số thứ tự vào phòng bác sĩ</p>
        </div>
        <div class="flex gap-sm" style="flex: 1; max-width: 480px;">
          <input type="text" id="quickCheckInInput" class="form-input" placeholder="Nhập mã lịch hẹn (VD: LH-20260914-006)..." style="font-weight: 600;">
          <button class="btn btn-primary" onclick="handleQuickCheckIn()" style="white-space: nowrap;">
            🎯 Check-in ngay
          </button>
        </div>
      </div>
    </div>

    <div class="card animate-in">
      <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
        <h4>📋 Danh sách bệnh nhân tiếp nhận hôm nay</h4>
        <div class="flex gap-sm">
          <input type="text" class="form-input" placeholder="🔍 Lọc tên, SĐT, mã hẹn..." id="searchReceptionistApt" oninput="filterReceptionistApt(this.value)" style="width: 250px;">
        </div>
      </div>
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã lịch hẹn</th>
              <th>Bệnh nhân</th>
              <th>Bác sĩ chỉ định</th>
              <th>Chuyên khoa</th>
              <th>Giờ hẹn</th>
              <th>Trạng thái</th>
              <th style="text-align: right;">Thao tác quầy</th>
            </tr>
          </thead>
          <tbody id="receptionistAptTbody">
            ${todayApts.map((a, i) => {
              const statusBadges = {
                'pending': '<span class="badge badge-warning">Chờ đến quầy</span>',
                'confirmed': '<span class="badge badge-warning">Chờ Check-in</span>',
                'checked-in': '<span class="badge badge-info">Đang chờ khám</span>',
                'completed': '<span class="badge badge-success">Khám xong (Chờ TT)</span>',
                'cancelled': '<span class="badge badge-danger">Đã hủy</span>'
              };
              const badge = statusBadges[a.status] || `<span class="badge">${a.status}</span>`;

              return `
                <tr>
                  <td><strong style="color:var(--primary-300);">#${String(a.stt || i + 1).padStart(2, '0')}</strong></td>
                  <td><strong>${a.code}</strong></td>
                  <td>
                    <div style="font-weight: 600;">${a.patient}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">BN-${String(a.id).padStart(3, '0')} • 0912345678</div>
                  </td>
                  <td class="text-sm font-medium">${a.doctor}</td>
                  <td><span class="badge badge-secondary" style="font-size:0.75rem;">${a.specialty}</span></td>
                  <td><strong>${a.time}</strong></td>
                  <td>${badge}</td>
                  <td style="text-align: right;">
                    ${(a.status === 'pending' || a.status === 'confirmed') ? `
                      <button class="btn btn-success btn-sm" onclick="checkInAppointmentById(${a.id})">
                        🎫 Check-in & Cấp số
                      </button>
                    ` : a.status === 'checked-in' ? `
                      <span class="text-sm" style="color:var(--accent-400); font-weight:500;">Đã vào hàng đợi 👨‍⚕️</span>
                    ` : a.status === 'completed' ? `
                      <button class="btn btn-primary btn-sm" onclick="openBillingForPatient('${a.patient}', '${a.doctor}', '${a.code}')">
                        💰 Thu viện phí
                      </button>
                    ` : `
                      <span class="text-muted text-sm">—</span>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Receptionist: Billing ───
function renderReceptionistBilling() {
  const patientName = AppState.activeBillingPatient?.name || 'Nguyễn Văn An';
  const doctorName = AppState.activeBillingPatient?.doctor || 'TS.BS Trần Thị Minh';
  const aptCode = AppState.activeBillingPatient?.code || 'LH-20260913-001';
  const currentMethod = AppState.billingPaymentMethod || 'cash';

  return `
    <div class="main-header">
      <div>
        <h2>💰 Quầy Thu Ngân & Viện Phí</h2>
        <div class="subtitle">Bảng kê chi phí thanh toán cho ca khám: <strong style="color:var(--primary-300);">${aptCode}</strong></div>
      </div>
      <button class="btn btn-secondary" onclick="navigate('receptionist-dashboard', 'receptionist')">← Quay lại danh sách</button>
    </div>

    <div class="content-grid">
      <div>
        <!-- Patient Info -->
        <div class="card animate-in" style="margin-bottom: 1.5rem; background: var(--gradient-card);">
          <h4 style="margin-bottom: 1rem;">👤 Thông tin đối chiếu thanh toán</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="text-sm"><span class="text-muted">Bệnh nhân:</span> <strong>${patientName}</strong></div>
            <div class="text-sm"><span class="text-muted">Mã hồ sơ:</span> <strong>BN-001</strong></div>
            <div class="text-sm"><span class="text-muted">Bác sĩ khám:</span> <strong>${doctorName}</strong></div>
            <div class="text-sm"><span class="text-muted">Mã phiếu khám:</span> <strong style="color: var(--primary-300);">PK-${aptCode.replace('LH-', '')}</strong></div>
          </div>
        </div>

        <!-- Bill Details -->
        <div class="card animate-in animate-in-delay-1">
          <h4 style="margin-bottom: 1rem;">📋 Bảng kê chi phí khám, xét nghiệm và thuốc</h4>
          <div class="table-wrapper" style="border: none;">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Khoản mục chi phí</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><strong>Công khám chuyên khoa</strong><br><span class="text-xs text-muted">Bác sĩ chuyên khoa II</span></td>
                  <td>1</td>
                  <td>200,000</td>
                  <td><strong>200,000 đ</strong></td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><strong>Xét nghiệm máu tổng quát (CBC)</strong><br><span class="text-xs text-muted">Chỉ định Cận lâm sàng</span></td>
                  <td>1</td>
                  <td>150,000</td>
                  <td><strong>150,000 đ</strong></td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><strong>Siêu âm bụng tổng quát</strong><br><span class="text-xs text-muted">Chẩn đoán hình ảnh</span></td>
                  <td>1</td>
                  <td>250,000</td>
                  <td><strong>250,000 đ</strong></td>
                </tr>
                <tr>
                  <td>4</td>
                  <td><strong>Omeprazol 20mg</strong><br><span class="text-xs text-muted">28 viên × 14 ngày (Uống trước ăn)</span></td>
                  <td>28</td>
                  <td>2,500</td>
                  <td><strong>70,000 đ</strong></td>
                </tr>
                <tr>
                  <td>5</td>
                  <td><strong>Domperidon 10mg</strong><br><span class="text-xs text-muted">21 viên × 7 ngày</span></td>
                  <td>21</td>
                  <td>1,500</td>
                  <td><strong>31,500 đ</strong></td>
                </tr>
                <tr>
                  <td>6</td>
                  <td><strong>Vitamin B Complex</strong><br><span class="text-xs text-muted">14 viên × 14 ngày</span></td>
                  <td>14</td>
                  <td>1,200</td>
                  <td><strong>16,800 đ</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="billing-total" style="background: rgba(15, 23, 42, 0.6); padding: 1.25rem; border-radius: 8px; margin-top: 1.5rem;">
            <div class="billing-row">
              <span>Phí khám bệnh:</span>
              <span>200,000 VNĐ</span>
            </div>
            <div class="billing-row">
              <span>Phí cận lâm sàng (CLS):</span>
              <span>400,000 VNĐ</span>
            </div>
            <div class="billing-row">
              <span>Phí thuốc theo đơn:</span>
              <span>118,300 VNĐ</span>
            </div>
            <div class="billing-row">
              <span>Bảo hiểm y tế / Giảm trừ:</span>
              <span style="color: var(--success);">- 0 VNĐ</span>
            </div>
            <div class="billing-row total" style="border-top: 2px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
              <span style="font-size: 1.1rem; font-weight: 700;">TỔNG THỰC THU:</span>
              <span style="font-size: 1.35rem; font-weight: 800; color: var(--primary-300);">718,300 VNĐ</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <!-- Payment Method -->
        <div class="card animate-in animate-in-delay-2" style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 1rem;">💳 Phương thức thanh toán</h4>
          <div class="payment-methods">
            <div class="payment-method ${currentMethod === 'cash' ? 'selected' : ''}" onclick="selectBillingMethod('cash')">
              <span class="pay-icon">💵</span>
              <div class="pay-label">Tiền mặt</div>
            </div>
            <div class="payment-method ${currentMethod === 'vietqr' ? 'selected' : ''}" onclick="selectBillingMethod('vietqr')">
              <span class="pay-icon">📱</span>
              <div class="pay-label">VietQR Pro</div>
            </div>
            <div class="payment-method ${currentMethod === 'card' ? 'selected' : ''}" onclick="selectBillingMethod('card')">
              <span class="pay-icon">💳</span>
              <div class="pay-label">Thẻ POS</div>
            </div>
          </div>

          ${currentMethod === 'cash' ? `
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Tiền khách đưa (VNĐ)</label>
              <input type="text" class="form-input" value="800,000" id="cashReceived" oninput="calcChange()" style="font-size: 1.1rem; font-weight: 600;">
            </div>
            <div class="form-group">
              <label class="form-label">Tiền thừa thối lại cho khách</label>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);" id="changeAmount">81,700 VNĐ</div>
            </div>
          ` : currentMethod === 'vietqr' ? `
            <div style="text-align: center; padding: 1rem; background: white; border-radius: 12px; margin-bottom: 1rem;">
              <div style="color: #0f172a; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem;">MÃ VIETQR CHUYỂN KHOẢN TỰ ĐỘNG</div>
              <img src="https://api.vietqr.io/image/970422-0912345678-compact2.jpg?amount=718300&addInfo=TT%20VIEN%20PHI%20${aptCode}&accountName=PHONG%20KHAM%20MEDICARE" 
                   alt="VietQR" style="max-width: 220px; width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="color: #475569; font-size: 0.8rem; margin-top: 0.5rem;">
                Số tiền: <strong>718,300 đ</strong> • Nội dung: <strong>TT VIEN PHI ${aptCode}</strong>
              </div>
            </div>
          ` : `
            <div style="padding: 1.5rem; text-align: center; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 1rem;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💳</div>
              <div style="font-weight: 600;">Quẹt thẻ qua máy POS</div>
              <p class="text-muted text-xs" style="margin-top: 0.25rem;">Hỗ trợ thẻ Visa, Master, JCB, Napas nội địa</p>
            </div>
          `}

          <button class="btn btn-primary btn-lg w-full" onclick="confirmBillingPayment()" style="margin-top: 0.5rem; font-size: 1.05rem;">
            ✅ Xác nhận Thu tiền & In Hóa đơn
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Admin Dashboard ───
function renderAdminDashboard() {
  const currentTab = AppState.adminTab || 'overview';

  return `
    <div class="main-header">
      <div>
        <h2>📊 Hệ Thống Quản Trị Trung Tâm <span class="text-gradient">(Admin Portal)</span></h2>
        <div class="subtitle">Giám sát hoạt động, phân ca bác sĩ, quản lý bảng giá và danh mục phòng khám</div>
      </div>
      <div class="flex gap-sm">
        <button class="btn ${currentTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('overview')">📈 Báo cáo Doanh thu</button>
        <button class="btn ${currentTab === 'doctors' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('doctors')">👨‍⚕️ Bác sĩ & Ca trực</button>
        <button class="btn ${currentTab === 'services' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('services')">🔬 Bảng giá Dịch vụ</button>
        <button class="btn ${currentTab === 'pharmacy' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('pharmacy')">💊 Kho Dược</button>
      </div>
    </div>

    ${currentTab === 'overview' ? renderAdminOverviewTab() :
      currentTab === 'doctors' ? renderAdminDoctorsTab() :
      currentTab === 'services' ? renderAdminServicesTab() :
      renderAdminPharmacyTab()}
  `;
}

function switchAdminTab(tab) {
  AppState.adminTab = tab;
  render();
}

function renderAdminOverviewTab() {
  const totalApts = MOCK_DATA.appointments.length;
  const completedApts = MOCK_DATA.appointments.filter(a => a.status === 'completed').length;

  return `
    <div class="stats-grid">
      <div class="stat-card animate-in">
        <div class="stat-icon" style="background: rgba(13, 148, 136, 0.1); color: var(--primary-400);">👥</div>
        <div class="stat-value">${totalApts * 18}</div>
        <div class="stat-label">Tổng lượt khám tháng này</div>
        <div class="stat-change up">↑ 14.5% so với tháng trước</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-1">
        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #4ade80;">💰</div>
        <div class="stat-value">254.8M</div>
        <div class="stat-label">Doanh thu tháng (VNĐ)</div>
        <div class="stat-change up">↑ 9.2% đạt chỉ tiêu tháng</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-2">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--accent-400);">👨‍⚕️</div>
        <div class="stat-value">${MOCK_DATA.doctors.length}</div>
        <div class="stat-label">Bác sĩ đang hoạt động</div>
        <div class="stat-change up">8 Chuyên khoa mũi nhọn</div>
      </div>
      <div class="stat-card animate-in animate-in-delay-3">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;">📊</div>
        <div class="stat-value">91.5%</div>
        <div class="stat-label">Tỷ lệ đặt lịch Online</div>
        <div class="stat-change up">↑ 6% so với quý trước</div>
      </div>
    </div>

    <div class="content-grid">
      <!-- Revenue Chart -->
      <div class="card animate-in">
        <h4 style="margin-bottom: 1.5rem;">📈 Biểu đồ Doanh thu theo ngày (Tháng 9/2026)</h4>
        <div id="revenueChart" style="height: 280px; display: flex; align-items: flex-end; gap: 0.5rem; padding: 1rem 0;">
          ${[65, 80, 55, 90, 72, 85, 95, 60, 78, 88, 70, 92].map((val, i) => `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <div class="text-xs text-muted">${Math.round(val * 2.5)}M</div>
              <div style="width: 100%; height: ${val * 2.5}px; background: var(--gradient-primary); border-radius: 4px 4px 0 0; opacity: ${0.5 + val/200}; transition: all 0.3s; cursor: pointer;" 
                   onmouseover="this.style.opacity='1'; this.style.boxShadow='0 0 15px rgba(13,148,136,0.3)'"
                   onmouseout="this.style.opacity='${0.5 + val/200}'; this.style.boxShadow='none'"></div>
              <div class="text-xs text-muted">${i + 1}/9</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Top Specialties -->
      <div class="card animate-in animate-in-delay-1">
        <h4 style="margin-bottom: 1.5rem;">🏥 Tỷ trọng lượt khám theo Chuyên khoa</h4>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${[
            { name: 'Nội khoa', count: 380, color: 'var(--primary-500)', pct: 100 },
            { name: 'Nhi khoa', count: 245, color: 'var(--accent-500)', pct: 64 },
            { name: 'Cơ xương khớp', count: 198, color: '#f59e0b', pct: 52 },
            { name: 'Tai Mũi Họng', count: 165, color: '#22c55e', pct: 43 },
            { name: 'Thần kinh', count: 132, color: '#ef4444', pct: 35 },
            { name: 'Da liễu', count: 125, color: '#f472b6', pct: 33 },
          ].map(s => `
            <div>
              <div class="flex justify-between" style="margin-bottom: 0.25rem;">
                <span class="text-sm">${s.name}</span>
                <span class="text-sm" style="font-weight: 600;">${s.count} lượt</span>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                <div style="width: ${s.pct}%; height: 100%; background: ${s.color}; border-radius: 4px; transition: width 1s ease;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Recent Appointments Monitoring -->
    <div class="card animate-in animate-in-delay-2" style="margin-top: 1.5rem;">
      <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
        <h4>📋 Giám sát các lượt khám thời gian thực</h4>
        <span class="badge badge-primary">Tổng: ${totalApts} ca</span>
      </div>
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Mã lịch hẹn</th>
              <th>Bệnh nhân</th>
              <th>Bác sĩ khám</th>
              <th>Chuyên khoa</th>
              <th>Ngày & Giờ</th>
              <th>Trạng thái vận hành</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_DATA.appointments.map(a => `
              <tr>
                <td><strong style="color: var(--primary-300);">${a.code}</strong></td>
                <td><strong>${a.patient}</strong></td>
                <td>${a.doctor}</td>
                <td><span class="badge badge-secondary" style="font-size:0.75rem;">${a.specialty}</span></td>
                <td>📅 ${formatDate(a.date)} <strong>${a.time}</strong></td>
                <td>
                  <span class="badge ${a.status === 'completed' ? 'badge-primary' : a.status === 'checked-in' ? 'badge-info' : a.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">
                    ${a.status === 'completed' ? 'Đã hoàn tất ca' : a.status === 'checked-in' ? 'Đang tại phòng khám' : a.status === 'confirmed' ? 'Đã xác nhận hẹn' : 'Chờ tiếp nhận'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminDoctorsTab() {
  return `
    <div class="card animate-in">
      <div class="flex items-center justify-between" style="margin-bottom: 1.25rem;">
        <h4>👨‍⚕️ Danh mục Bác sĩ & Phân bổ Ca trực</h4>
        <button class="btn btn-primary btn-sm" onclick="showToast('Thêm bác sĩ mới vào danh mục', 'info')">+ Thêm Bác sĩ</button>
      </div>
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Bác sĩ</th>
              <th>Chức danh / Học vị</th>
              <th>Chuyên khoa</th>
              <th>Kinh nghiệm</th>
              <th>Phòng khám</th>
              <th>Ca trực hôm nay</th>
              <th>Giá khám niêm yết</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_DATA.doctors.map(d => {
              const spec = MOCK_DATA.specialties.find(s => s.id === d.specialty)?.name;
              return `
                <tr>
                  <td>
                    <div class="flex items-center gap-sm">
                      <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${d.avatar}</div>
                      <strong>${d.name}</strong>
                    </div>
                  </td>
                  <td>${d.title}</td>
                  <td><span class="badge badge-primary">${spec}</span></td>
                  <td>${d.exp} năm</td>
                  <td>Phòng ${200 + d.id}</td>
                  <td><span class="badge badge-success">Sáng (07:30 - 11:30) • Chiều (13:30 - 17:00)</span></td>
                  <td style="color: var(--primary-300); font-weight: 600;">250,000 đ</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminServicesTab() {
  return `
    <div class="card animate-in">
      <div class="flex items-center justify-between" style="margin-bottom: 1.25rem;">
        <h4>🔬 Bảng giá Dịch vụ Cận lâm sàng & Kỹ thuật</h4>
        <button class="btn btn-primary btn-sm" onclick="showToast('Thêm dịch vụ CLS mới', 'info')">+ Thêm Dịch vụ</button>
      </div>
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Mã DV</th>
              <th>Tên dịch vụ kỹ thuật</th>
              <th>Nhóm loại hình</th>
              <th>Đơn giá niêm yết</th>
              <th>Thời gian trả kết quả</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_DATA.services.map(s => `
              <tr>
                <td><strong>CLS-00${s.id}</strong></td>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-secondary">${s.type}</span></td>
                <td><strong style="color: var(--primary-300);">${s.price.toLocaleString()} VNĐ</strong></td>
                <td>~ 30 - 60 phút</td>
                <td><span class="badge badge-success">Đang phục vụ</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminPharmacyTab() {
  return `
    <div class="card animate-in">
      <div class="flex items-center justify-between" style="margin-bottom: 1.25rem;">
        <h4>💊 Quản lý Danh mục Thuốc & Kho Dược</h4>
        <button class="btn btn-primary btn-sm" onclick="showToast('Nhập thêm lô thuốc mới', 'info')">+ Nhập thuốc mới</button>
      </div>
      <div class="table-wrapper" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Mã thuốc</th>
              <th>Tên biệt dược / Quy cách</th>
              <th>Phân nhóm</th>
              <th>Đơn vị tính</th>
              <th>Giá bán lẻ</th>
              <th>Tồn kho</th>
              <th>Cảnh báo tồn</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_DATA.medicines.map(m => `
              <tr>
                <td><strong>MED-${String(m.id).padStart(3, '0')}</strong></td>
                <td><strong>${m.name}</strong></td>
                <td><span class="badge badge-secondary">${m.group}</span></td>
                <td>${m.unit}</td>
                <td><strong style="color: var(--primary-300);">${m.price.toLocaleString()} VNĐ</strong></td>
                <td><strong style="color: var(--success);">${150 + m.id * 80} ${m.unit}</strong></td>
                <td><span class="badge badge-success">Đủ cơ số</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Event Handlers ───
function selectRole(role) {
  document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-role="${role}"]`).classList.add('active');
  AppState.currentRole = role;
}

function handleLogin() {
  const role = AppState.currentRole || 'patient';
  navigate(`${role}-dashboard`, role);
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
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
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
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }
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
  showToast(`🎉 Thanh toán thành công 718,300 VNĐ cho ${patient}! Đang in biên lai...`, 'success');
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
  const meds = MOCK_DATA.medicines;
  const medList = meds.map((m, i) => `${i + 1}: ${m.name} (${m.price.toLocaleString()} đ/${m.unit})`).join('\n');
  const choice = prompt(`Chọn thuốc cần kê:\n${medList}\n(Nhập số 1-${meds.length}):`, '3');
  const index = parseInt(choice) - 1;
  if (index >= 0 && index < meds.length) {
    const med = meds[index];
    const qty = parseInt(prompt(`Nhập số lượng ${med.unit} cho ${med.name}:`, '20') || '20');
    const dose = prompt(`Nhập hướng dẫn liều dùng:`, 'Uống 1 viên sau ăn, ngày 2 lần');
    AppState.examination.prescriptions.push({
      id: med.id,
      name: med.name,
      dose: `${dose} (SL: ${qty} ${med.unit})`,
      qty: qty,
      price: med.price * qty
    });
    render();
    showToast(`Đã kê thêm thuốc: ${med.name} (x${qty})`, 'success');
  }
}

function removeMedicine(index) {
  const removed = AppState.examination.prescriptions.splice(index, 1);
  render();
  showToast(`Đã xóa thuốc: ${removed[0]?.name}`, 'warning');
}

function completeExamination(patientId) {
  const p = MOCK_DATA.patients.find(pt => pt.id === patientId) || MOCK_DATA.patients[0];
  p.status = 'examined';

  // Cập nhật trạng thái lịch hẹn tương ứng thành completed (chờ thanh toán)
  const apt = MOCK_DATA.appointments.find(a => a.patient === p.name);
  if (apt) {
    apt.status = 'completed';
  }

  showToast(`🎉 Đã hoàn tất ca khám cho ${p.name}! Bảng kê chi phí đã được chuyển sang Quầy Thu ngân.`, 'success');
  
  // Tự động điều hướng sang quầy thu ngân để thanh toán ngay
  setTimeout(() => {
    openBillingForPatient(p.name, 'TS.BS Trần Thị Minh', apt?.code || `LH-20260914-${String(p.id).padStart(3, '0')}`);
  }, 1200);
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


