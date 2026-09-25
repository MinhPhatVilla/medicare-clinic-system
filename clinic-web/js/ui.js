/* Shared presentation components. Business actions remain in app.js. */
const UIState = { fields: {}, slots: {}, view: null, step: null, focus: null };
const specialtyIcons = ['heart-pulse', 'baby', 'bone', 'brain', 'eye', 'ear', 'hand', 'smile'];

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}
function safeHref(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? escapeHtml(url.href) : '#';
  } catch {
    return '#';
  }
}
function icon(name) {
  return /* HTML */ `<i data-lucide="${escapeHtml(name)}" aria-hidden="true"></i>`;
}
function button(label, handler, iconName = 'arrow-right', variant = 'primary', extra = '') {
  return /* HTML */ `<button
    type="button"
    class="btn btn-${variant}"
    data-focus-key="${escapeHtml(handler)}"
    onclick="${escapeHtml(handler)}"
    ${extra}
  >
    ${iconName ? icon(iconName) : ''}<span>${escapeHtml(label)}</span>
  </button>`;
}
function iconButton(label, handler, iconName) {
  return /* HTML */ `<button
    type="button"
    class="icon-btn"
    data-focus-key="${escapeHtml(handler)}"
    title="${escapeHtml(label)}"
    aria-label="${escapeHtml(label)}"
    onclick="${escapeHtml(handler)}"
  >
    ${icon(iconName)}
  </button>`;
}
function brand() {
  return /* HTML */ `<button
    class="brand"
    onclick="navigate('landing')"
    aria-label="MediCare, trang chủ"
  >
    <span class="brand-mark">${icon('cross')}</span
    ><span>Medi<span class="brand-accent">Care</span></span>
  </button>`;
}
function badge(label, tone = 'info') {
  return /* HTML */ `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}
function statusBadge(status) {
  const statuses = {
    pending: ['Chờ xác nhận', 'warning'],
    confirmed: ['Đã xác nhận', 'success'],
    'checked-in': ['Đã tiếp nhận', 'info'],
    completed: ['Đã hoàn tất', 'success'],
    cancelled: ['Đã hủy', 'neutral'],
    waiting: ['Đang chờ', 'warning'],
    in_progress: ['Đang khám', 'info'],
    examined: ['Đã khám', 'success'],
  };
  return badge(...(statuses[status] || [status, 'neutral']));
}
function money(value) {
  return /* HTML */ `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}
function pageHeader(eyebrow, title, subtitle, actions = '') {
  return /* HTML */ `<header class="page-heading">
    <div>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1 tabindex="-1">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="muted">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div class="actions">${actions}</div>
  </header>`;
}
function stat(label, value, iconName, tone = 'blue') {
  return /* HTML */ `<div class="stat">
    <span class="stat-icon tone-${tone}">${icon(iconName)}</span>
    <div>
      <span class="muted small">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>
    </div>
  </div>`;
}
function emptyState(iconName, title, text) {
  return /* HTML */ `<div class="empty-state">
    ${icon(iconName)}
    <h3>${escapeHtml(title)}</h3>
    <p class="muted">${escapeHtml(text)}</p>
  </div>`;
}
function summaryLine(label, value) {
  return /* HTML */ `<div class="summary-line">
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(value)}</dd>
  </div>`;
}
function doctorAvatar(doctor) {
  return /* HTML */ `<span class="avatar doctor-avatar" aria-hidden="true"
    >${escapeHtml(doctor.avatar)}</span
  >`;
}
function appointmentActions(apt) {
  if (['pending', 'confirmed'].includes(apt.status))
    return /* HTML */ `${button('Phiếu khám', `openAppointmentSlip(${apt.id})`, 'qr-code', 'secondary small')}${iconButton('Hủy lịch hẹn', `cancelPatientAppointment(${apt.id})`, 'calendar-x')}`;
  if (apt.status === 'checked-in') return badge('Chờ đến lượt khám', 'info');
  return '';
}
function openAppointmentSlip(id) {
  const apt = MOCK_DATA.appointments.find(item => item.id === id);
  if (apt) viewQrSlip(apt.code);
}
function openAppointmentBill(id) {
  const apt = MOCK_DATA.appointments.find(item => item.id === id);
  if (apt) openBillingForPatient(apt.patient, apt.doctor, apt.code);
}
function table(headers, rows, bodyId = '') {
  return /* HTML */ `<div
    class="table-wrap"
    tabindex="0"
    role="region"
    aria-label="Bảng ${escapeHtml(headers[0])}"
  >
    <table class="data-table">
      <thead>
        <tr>
          ${headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody ${bodyId ? `id="${bodyId}"` : ''}>
        ${rows}
      </tbody>
    </table>
  </div>`;
}
function togglePublicMenu() {
  const nav = document.getElementById('publicNav');
  const open = nav.classList.toggle('open');
  document.getElementById('publicMenuButton').setAttribute('aria-expanded', String(open));
}
function closeNavigation() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('publicNav')?.classList.remove('open');
  document
    .querySelectorAll('[aria-controls="sidebar"], [aria-controls="publicNav"]')
    .forEach(el => el.setAttribute('aria-expanded', 'false'));
  document.body.classList.remove('nav-open');
  syncNavigationVisibility();
}
function toggleWorkspaceNavigation() {
  toggleSidebar();
  const open = document.getElementById('sidebar').classList.contains('open');
  document.body.classList.toggle('nav-open', open);
  syncNavigationVisibility();
  document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', String(open));
  if (open) document.querySelector('#sidebar button')?.focus();
}

function syncNavigationVisibility() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar)
    sidebar.inert =
      window.matchMedia('(max-width: 767px)').matches && !sidebar.classList.contains('open');
}

function advanceBooking() {
  const date = document.getElementById('bookingDate');
  if (date && !date.reportValidity()) return;
  bookingNext();
}

function fitTextarea(element) {
  element.style.height = 'auto';
  element.style.height = `${Math.max(100, Math.min(360, element.scrollHeight + 2))}px`;
}

// Preserve form edits and keyboard focus across the existing full-root render.
function capturePresentationState() {
  const clinical = document.querySelector('[data-exam-patient]');
  if (clinical) {
    const values = {};
    clinical.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
      values[el.id] = el.value;
    });
    UIState.fields[clinical.dataset.examPatient] = values;
  }
  const active = document.activeElement;
  UIState.focus = active?.dataset.focusKey || active?.id || null;
}
function enhancePresentation() {
  lucide.createIcons({ attrs: { 'stroke-width': 1.7 } });
  const clinical = document.querySelector('[data-exam-patient]');
  if (clinical) {
    const values = UIState.fields[clinical.dataset.examPatient] || {};
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
    calculateBMI();
  }
  const code = document.querySelector('[data-qr-code]');
  if (code && typeof qrcode === 'function') {
    const qr = qrcode(0, 'M');
    qr.addData(code.dataset.qrCode);
    qr.make();
    code.innerHTML = qr.createSvgTag({
      cellSize: 4,
      margin: 8,
      scalable: true,
      alt: 'Mã QR lịch hẹn',
    });
  }
  const changed =
    UIState.view !== AppState.currentView ||
    (AppState.currentView === 'patient-booking' && UIState.step !== AppState.booking.step);
  if (changed && UIState.view !== null) {
    const heading = document.querySelector('main h1, .booking-content h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (UIState.focus)
    (
      document.getElementById(UIState.focus) ||
      Array.from(document.querySelectorAll('[data-focus-key]')).find(
        el => el.dataset.focusKey === UIState.focus,
      )
    )?.focus({ preventScroll: true });
  UIState.view = AppState.currentView;
  UIState.step = AppState.booking.step;
  document.body.classList.remove('nav-open');
  syncNavigationVisibility();
  document.querySelectorAll('textarea.form-input').forEach(fitTextarea);
  document.title = `${document.querySelector('h1')?.textContent || 'Đặt lịch khám'} | MediCare`;
}
window.addEventListener('resize', syncNavigationVisibility);
document.addEventListener('input', event => {
  if (event.target.matches('textarea.form-input')) fitTextarea(event.target);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const wasOpen = document.body.classList.contains('nav-open');
    closeNavigation();
    if (wasOpen) document.getElementById('sidebarToggle')?.focus();
  }
  if (event.key === 'Tab' && document.body.classList.contains('nav-open')) {
    const controls = Array.from(document.querySelectorAll('#sidebar button, #sidebar a')).filter(
      el => el.offsetParent !== null,
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});
