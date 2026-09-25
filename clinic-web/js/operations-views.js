/* Reception, billing and management presentation. */
function renderReceptionistDashboard() {
  const appointments = MOCK_DATA.appointments;
  const checkedIn = appointments.filter(a => a.status === 'checked-in').length;
  const pending = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length;
  return /* HTML */ `${pageHeader('QUẦY TIẾP NHẬN', 'Tiếp nhận bệnh nhân', 'Lịch hẹn, check-in và điều phối khám.', button('Tiếp nhận vãng lai', 'openWalkInModal()', 'user-round-plus'))}
    <div class="stats-grid">
      ${stat('Lịch hẹn', appointments.length, 'calendar-days')}${stat('Đã tiếp nhận', checkedIn, 'user-round-check', 'green')}${stat('Chờ tiếp nhận', pending, 'clock-3', 'amber')}${stat('Doanh thu hôm nay', '8,5 triệu', 'wallet', 'rose')}
    </div>
    <section class="surface check-in-section">
      <div>
        <h2>Check-in nhanh</h2>
        <p class="muted small">Mã lịch hẹn trên phiếu khám của bệnh nhân.</p>
      </div>
      <form class="check-in-form" onsubmit="event.preventDefault(); handleQuickCheckIn()">
        <label class="sr-only" for="quickCheckInInput">Mã lịch hẹn</label>
        <div class="input-icon">
          ${icon('qr-code')}<input
            id="quickCheckInInput"
            class="form-input"
            placeholder="Nhập mã lịch hẹn"
            autocomplete="off"
            required
          />
        </div>
        <button class="btn btn-primary" type="submit">${icon('check')} Check-in</button>
      </form>
    </section>
    <section class="surface">
      <div class="section-heading">
        <h2>Danh sách lịch hẹn</h2>
        <div class="input-icon search-field">
          ${icon('search')}<label class="sr-only" for="searchReceptionistApt"
            >Tìm bệnh nhân, mã lịch hẹn</label
          ><input
            id="searchReceptionistApt"
            class="form-input"
            placeholder="Tìm tên hoặc mã lịch hẹn"
            oninput="filterReceptionistApt(this.value)"
          />
        </div>
      </div>
      ${table(['Bệnh nhân / Mã lịch hẹn', 'Lịch khám', 'Bác sĩ / Chuyên khoa', 'Trạng thái', 'Thao tác'], appointments.map(a => `<tr><td><strong>${escapeHtml(a.patient)}</strong><small>${escapeHtml(a.code)}</small></td><td><strong>${escapeHtml(a.time)}</strong><small>${formatDate(a.date)}</small></td><td>${escapeHtml(a.doctor)}<small>${escapeHtml(a.specialty)}</small></td><td>${statusBadge(a.status)}</td><td><div class="actions">${['pending', 'confirmed'].includes(a.status) ? button('Tiếp nhận', `checkInAppointmentById(${a.id})`, 'check', 'secondary small') : a.status === 'completed' ? button('Thu ngân', `openAppointmentBill(${a.id})`, 'wallet', 'secondary small') : a.status === 'checked-in' ? badge('Chờ khám', 'info') : ''}</div></td></tr>`).join(''), 'receptionistAptTbody')}
    </section>`;
}

function renderReceptionistBilling() {
  const patient = AppState.activeBillingPatient || {
    name: 'Nguyễn Văn An',
    doctor: 'TS.BS Trần Thị Minh',
    code: 'LH-20260913-001',
  };
  const method = AppState.billingPaymentMethod || 'cash';
  const orders = AppState.examination.clsOrders || [];
  const medicines = AppState.examination.prescriptions || [];
  const clsTotal = orders.reduce((sum, item) => sum + item.price, 0);
  const medTotal = medicines.reduce((sum, item) => sum + item.price, 0);
  const rows = [
    {
      name: 'Công khám chuyên khoa',
      detail: 'Phí khám bác sĩ',
      qty: 1,
      unitPrice: 200000,
      price: 200000,
    },
    ...orders.map(o => ({ ...o, detail: `${o.type} · ${o.status}`, qty: 1, unitPrice: o.price })),
    ...medicines.map(m => ({
      ...m,
      detail: m.doseDetail || m.dose || 'Theo hướng dẫn',
      unitPrice: m.unitPrice || m.price / m.qty,
    })),
  ];
  return /* HTML */ `${pageHeader('THANH TOÁN', 'Quầy thu ngân', `Bảng kê ca khám ${patient.code}`, button('Danh sách bệnh nhân', "navigate('receptionist-dashboard', 'receptionist')", 'arrow-left', 'secondary'))}
    <div class="alert alert-warning no-print">
      ${icon('info')}<span>Thanh toán mô phỏng. Không chuyển tiền thật.</span>
    </div>
    <div class="billing-layout">
      <div>
        <section class="surface">
          <div class="section-heading">
            <h2>Thông tin bệnh nhân</h2>
            ${badge('Chờ thanh toán', 'warning')}
          </div>
          <dl class="summary-list">
            ${summaryLine('Bệnh nhân', patient.name)}${summaryLine('Bác sĩ khám', patient.doctor)}${summaryLine('Mã phiếu khám', `PK-${patient.code.replace('LH-', '')}`)}
          </dl>
        </section>
        <section class="surface">
          <div class="section-heading">
            <h2>Bảng kê chi phí</h2>
            ${iconButton('In bảng kê chi phí', 'window.print()', 'printer')}
          </div>
          ${table(['Khoản mục', 'Số lượng', 'Đơn giá', 'Thành tiền'], rows.map(row => `<tr><td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.detail)}</small></td><td>${row.qty}</td><td class="numeric">${money(row.unitPrice)}</td><td class="numeric"><strong>${money(row.price)}</strong></td></tr>`).join(''))}
          <dl class="summary-list billing-totals">
            ${summaryLine('Tiền khám', money(200000))}${summaryLine('Cận lâm sàng', money(clsTotal))}${summaryLine('Thuốc theo đơn', money(medTotal))}${summaryLine('BHYT / Giảm trừ', money(0))}
            <div class="summary-line total">
              <dt>Tổng thanh toán</dt>
              <dd>${money(200000 + clsTotal + medTotal)}</dd>
            </div>
          </dl>
        </section>
      </div>
      <aside class="payment-panel no-print">
        <h2>Phương thức thanh toán</h2>
        <div class="payment-methods" role="group" aria-label="Phương thức thanh toán">
          ${[
            ['cash', 'Tiền mặt', 'banknote'],
            ['vietqr', 'Chuyển khoản', 'qr-code'],
            ['card', 'Thẻ POS', 'credit-card'],
          ]
            .map(
              ([key, label, i]) =>
                `<button class="payment-method ${method === key ? 'selected' : ''}" aria-pressed="${method === key}" data-focus-key="payment-${key}" onclick="selectBillingMethod('${key}')">${icon(i)}<span>${label}</span></button>`,
            )
            .join('')}
        </div>
        ${renderPaymentDetails(method, patient.code)}${button('Xác nhận thu tiền', 'confirmBillingPayment()', 'check', 'primary full-width large')}
      </aside>
    </div>`;
}
function renderPaymentDetails(method, code) {
  if (method === 'cash')
    return /* HTML */ `<div class="payment-details">
      <div class="field">
        <label for="cashReceived">Tiền khách đưa (VNĐ)</label
        ><input
          id="cashReceived"
          class="form-input"
          inputmode="numeric"
          value="800,000"
          oninput="calcChange()"
        />
      </div>
      <p class="muted small">Tiền trả lại</p>
      <strong class="change-amount" id="changeAmount">81,700 VNĐ</strong>
    </div>`;
  if (method === 'vietqr')
    return /* HTML */ `<div class="payment-details qr-payment">
      <img
        src="https://api.vietqr.io/image/970422-0912345678-compact2.jpg?amount=718300&amp;addInfo=${encodeURIComponent(`TT VIEN PHI ${code}`)}&amp;accountName=PHONG%20KHAM%20MEDICARE"
        alt="Mã chuyển khoản VietQR mẫu"
        width="220"
        height="260"
        onerror="this.hidden=true; this.nextElementSibling.hidden=false"
      />
      <p class="alert alert-warning" hidden>
        Không tải được mã QR. Vui lòng kiểm tra kết nối mạng.
      </p>
      <strong>718.300 đ</strong>
      <p class="small muted">TT VIEN PHI ${escapeHtml(code)}</p>
    </div>`;
  return /* HTML */ `<div class="payment-details pos-payment">
    ${icon('credit-card')}
    <h3>Thanh toán qua máy POS</h3>
    <p class="muted small">Visa, Mastercard, JCB, Napas</p>
  </div>`;
}

function renderAdminDashboard() {
  const tab = AppState.adminTab || 'overview';
  const tabs = [
    ['overview', 'Tổng quan', 'chart-no-axes-combined'],
    ['doctors', 'Bác sĩ', 'stethoscope'],
    ['services', 'Dịch vụ', 'microscope'],
    ['pharmacy', 'Kho thuốc', 'pill'],
  ];
  return /* HTML */ `${pageHeader('QUẢN LÝ PHÒNG KHÁM', 'Tổng quan vận hành', 'Tháng 09 / 2026')}
    <nav class="admin-tabs" aria-label="Danh mục quản trị">
      ${tabs.map(([key, label, i]) => `<button class="${tab === key ? 'active' : ''}" ${tab === key ? 'aria-current="page"' : ''} data-focus-key="admin-${key}" onclick="switchAdminTab('${key}')">${icon(i)}${label}</button>`).join('')}
    </nav>
    ${{ overview: renderAdminOverviewTab, doctors: renderAdminDoctorsTab, services: renderAdminServicesTab, pharmacy: renderAdminPharmacyTab }[tab]()}`;
}
function renderAdminOverviewTab() {
  const specialties = [
    ['Nội khoa', 380, 100],
    ['Nhi khoa', 245, 64],
    ['Cơ xương khớp', 198, 52],
    ['Tai Mũi Họng', 165, 43],
    ['Thần kinh', 132, 35],
    ['Da liễu', 125, 33],
  ];
  return /* HTML */ `<div class="stats-grid">
      ${stat('Lượt khám tháng này', MOCK_DATA.appointments.length * 18, 'users-round')}${stat('Doanh thu tháng', '254,8 triệu', 'wallet', 'green')}${stat('Bác sĩ hoạt động', MOCK_DATA.doctors.length, 'stethoscope', 'rose')}${stat('Đặt lịch trực tuyến', '91,5%', 'calendar-check', 'amber')}
    </div>
    <div class="report-grid">
      <section class="surface">
        <div class="section-heading">
          <h2>Doanh thu theo ngày</h2>
          <span class="small muted">Triệu VNĐ · 09/2026</span>
        </div>
        <div class="chart-scroll">
          <div
            class="revenue-chart"
            id="revenueChart"
            role="img"
            aria-label="Doanh thu từ ngày 1 đến ngày 12 tháng 9, đơn vị triệu đồng"
          >
            ${[65, 80, 55, 90, 72, 85, 95, 60, 78, 88, 70, 92].map((value, index) => `<div class="chart-column"><span class="chart-value">${Math.round(value * 2.5)}</span><div class="chart-track"><div class="chart-bar" style="height:${value}%" title="${index + 1}/9: ${Math.round(value * 2.5)} triệu đồng"></div></div><span class="chart-label">${index + 1}/9</span></div>`).join('')}
          </div>
        </div>
      </section>
      <section class="surface">
        <div class="section-heading"><h2>Lượt khám theo chuyên khoa</h2></div>
        <div class="specialty-breakdown">
          ${specialties.map(([name, count, percent], index) => `<div><div class="summary-line"><span>${name}</span><strong>${count} lượt</strong></div><div class="progress-track"><div class="progress-fill tone-${index % 2 ? 'green' : 'blue'}" style="width:${percent}%"></div></div></div>`).join('')}
        </div>
      </section>
    </div>
    <section class="surface">
      <div class="section-heading">
        <h2>Các lượt khám gần đây</h2>
        ${badge(`${MOCK_DATA.appointments.length} ca`, 'neutral')}
      </div>
      ${table(['Mã lịch hẹn', 'Bệnh nhân', 'Bác sĩ / Chuyên khoa', 'Ngày & giờ', 'Trạng thái'], MOCK_DATA.appointments.map(a => `<tr><td>${escapeHtml(a.code)}</td><td><strong>${escapeHtml(a.patient)}</strong></td><td>${escapeHtml(a.doctor)}<small>${escapeHtml(a.specialty)}</small></td><td>${formatDate(a.date)}<small>${escapeHtml(a.time)}</small></td><td>${statusBadge(a.status)}</td></tr>`).join(''))}
    </section>`;
}
function renderAdminDoctorsTab() {
  return /* HTML */ `<section class="surface">
    <div class="section-heading">
      <h2>Bác sĩ & ca trực</h2>
      ${button('Thêm bác sĩ', "showToast('Thêm bác sĩ mới vào danh mục', 'info')", 'plus')}
    </div>
    ${table(['Bác sĩ', 'Chuyên khoa', 'Kinh nghiệm', 'Phòng khám', 'Ca trực', 'Giá khám'], MOCK_DATA.doctors.map(d => `<tr><td><div class="row">${doctorAvatar(d)}<div><strong>${escapeHtml(d.name)}</strong><small>${escapeHtml(d.title)}</small></div></div></td><td>${escapeHtml(MOCK_DATA.specialties.find(s => s.id === d.specialty)?.name)}</td><td>${d.exp} năm</td><td>Phòng ${200 + d.id}</td><td>07:30 - 11:30<small>13:30 - 17:00</small></td><td class="numeric">${money(250000)}</td></tr>`).join(''))}
  </section>`;
}
function renderAdminServicesTab() {
  return /* HTML */ `<section class="surface">
    <div class="section-heading">
      <h2>Dịch vụ & bảng giá</h2>
      ${button('Thêm dịch vụ', "showToast('Thêm dịch vụ CLS mới', 'info')", 'plus')}
    </div>
    ${table(['Mã dịch vụ', 'Tên dịch vụ', 'Nhóm', 'Đơn giá', 'Trả kết quả', 'Trạng thái'], MOCK_DATA.services.map(s => `<tr><td>CLS-00${s.id}</td><td><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.dept)}</small></td><td>${escapeHtml(s.type)}</td><td class="numeric">${money(s.price)}</td><td>30 - 60 phút</td><td>${badge('Đang phục vụ', 'success')}</td></tr>`).join(''))}
  </section>`;
}
function renderAdminPharmacyTab() {
  return /* HTML */ `<section class="surface">
    <div class="section-heading">
      <h2>Danh mục thuốc & tồn kho</h2>
      ${button('Nhập thuốc mới', "showToast('Nhập thêm lô thuốc mới', 'info')", 'package-plus')}
    </div>
    ${table(['Mã thuốc', 'Tên thuốc', 'Phân nhóm', 'Đơn vị', 'Giá bán lẻ', 'Tồn kho', 'Cảnh báo'], MOCK_DATA.medicines.map(m => `<tr><td>MED-${String(m.id).padStart(3, '0')}</td><td><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.active)}</small></td><td>${escapeHtml(m.group)}</td><td>${escapeHtml(m.unit)}</td><td class="numeric">${money(m.price)}</td><td>${150 + m.id * 80} ${escapeHtml(m.unit)}</td><td>${badge('Đủ cơ số', 'success')}</td></tr>`).join(''))}
  </section>`;
}
