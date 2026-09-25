/* Clinical presentation; state transitions remain in app.js. */

function renderDoctorDashboard() {
  const waitingPatients = MOCK_DATA.patients.filter(p => p.status === 'waiting');
  const completedCount = 12;
  const date = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return /* HTML */ `
    ${pageHeader(
      'Phòng 201 / Nội khoa',
      'TS.BS Trần Thị Minh',
      date,
      button('Gọi bệnh nhân tiếp theo', 'callNextPatient()', 'megaphone'),
    )}
    <div class="stats-grid">
      ${stat('Bệnh nhân đang chờ', waitingPatients.length, 'users', 'blue')}
      ${stat('Đã khám hôm nay', completedCount, 'clipboard-check', 'green')}
      ${stat('Tổng ca tiếp nhận', waitingPatients.length + completedCount, 'calendar-days', 'blue')}
      ${stat('Thời gian khám trung bình', '~15 phút', 'clock', 'amber')}
    </div>
    <div class="content-grid">
      <section class="surface" aria-labelledby="clinicalQueueHeading">
        <div class="section-heading">
          <div>
            <h2 id="clinicalQueueHeading">Hàng đợi khám bệnh</h2>
            <p class="muted small">Bệnh nhân chờ tại phòng khám</p>
          </div>
          ${badge(`${waitingPatients.length} người chờ`, 'info')}
        </div>
        ${
          waitingPatients.length
            ? `
          <div class="table-wrap" role="region" aria-label="Hàng đợi khám bệnh" tabindex="0">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">STT</th>
                  <th scope="col">Bệnh nhân</th>
                  <th scope="col">Giờ hẹn</th>
                  <th scope="col">Lý do khám</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${waitingPatients
                  .map(
                    (patient, index) => `
                  <tr>
                    <td><strong>${escapeHtml(String(patient.stt || index + 1).padStart(2, '0'))}</strong></td>
                    <th scope="row">${escapeHtml(patient.name)}</th>
                    <td>${escapeHtml(patient.time)}</td>
                    <td>${escapeHtml(patient.reason)}</td>
                    <td>${badge(index === 0 ? 'Gọi khám' : 'Đang chờ', index === 0 ? 'info' : 'warning')}</td>
                    <td>${button('Mở phiếu khám', `selectPatientForExam(${Number(patient.id)})`, 'clipboard-list', 'ghost')}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : emptyState('users', 'Không có bệnh nhân chờ', 'Hàng đợi khám bệnh hiện đang trống.')
        }
      </section>
      <section class="surface" aria-labelledby="clinicalActivityHeading">
        <div class="section-heading">
          <h2 id="clinicalActivityHeading">Hoạt động trong ngày</h2>
        </div>
        <div class="stack">
          ${renderClinicalProgress('Tiến độ khám', '12/17 bệnh nhân', 72)}
          ${renderClinicalProgress('Chỉ định cận lâm sàng', '6 ca', 45)}
          ${renderClinicalProgress('Đơn thuốc đã cấp', '11 đơn', 85)}
        </div>
      </section>
    </div>
  `;
}

function renderClinicalProgress(label, value, percent) {
  return /* HTML */ `
    <div class="stack">
      <div class="summary-line">
        <span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>
      </div>
      <progress
        class="clinical-progress"
        max="100"
        value="${Number(percent)}"
        aria-label="${escapeHtml(label)}"
        aria-valuetext="${escapeHtml(value)}"
      >
        ${Number(percent)}%
      </progress>
    </div>
  `;
}

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
          {
            name: 'Số lượng Hồng cầu (RBC)',
            value: '4.85',
            unit: 'T/L',
            normalRange: '4.0 - 5.5',
            isAbnormal: false,
          },
          {
            name: 'Số lượng Bạch cầu (WBC)',
            value: '12.4',
            unit: 'G/L',
            normalRange: '4.0 - 10.0',
            isAbnormal: true,
          },
          {
            name: 'Huyết sắc tố (Hb)',
            value: '142',
            unit: 'g/L',
            normalRange: '120 - 165',
            isAbnormal: false,
          },
          {
            name: 'Số lượng Tiểu cầu (PLT)',
            value: '235',
            unit: 'G/L',
            normalRange: '150 - 450',
            isAbnormal: false,
          },
        ],
      },
      {
        id: 3,
        code: 'SA_OB',
        name: 'Siêu âm ổ bụng tổng quát màu',
        price: 250000,
        type: 'Siêu âm',
        status: 'COMPLETED',
        conclusion:
          'Gan, mật, tụy, lách, 2 thận hình thái bình thường. Không thấy sỏi hoặc khối u khu trú. Không có dịch tự do ổ bụng.',
        result: 'Các tạng trong ổ bụng trong giới hạn bình thường.',
        resultFileUrl: 'https://medicare.vn/results/SA-20260914.pdf',
        attachments: [
          'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=60',
        ],
        indicators: [
          {
            name: 'Nhu mô gan',
            value: 'Đồng nhất',
            unit: '',
            normalRange: 'Đồng nhất, bờ đều',
            isAbnormal: false,
          },
          {
            name: 'Túi mật',
            value: 'Thành mỏng, không sỏi',
            unit: '',
            normalRange: 'Thành mỏng < 3mm',
            isAbnormal: false,
          },
          {
            name: 'Dịch tự do ổ bụng',
            value: 'Âm tính',
            unit: '',
            normalRange: 'Không có',
            isAbnormal: false,
          },
        ],
      },
    ];
  }
  if (!AppState.examination.prescriptions) {
    AppState.examination.prescriptions = [
      {
        id: 1,
        name: 'Omeprazol 20mg',
        dose: '2 viên/ngày × 14 ngày • Uống trước ăn 30p',
        qty: 28,
        price: 70000,
      },
      {
        id: 2,
        name: 'Domperidon 10mg',
        dose: '3 viên/ngày × 7 ngày • Uống trước ăn 15p',
        qty: 21,
        price: 31500,
      },
      {
        id: 8,
        name: 'Vitamin B Complex',
        dose: '1 viên/ngày × 14 ngày • Uống sau ăn',
        qty: 14,
        price: 16800,
      },
    ];
  }

  const totalCls = AppState.examination.clsOrders.reduce((sum, item) => sum + item.price, 0);
  const totalMeds = AppState.examination.prescriptions.reduce((sum, item) => sum + item.price, 0);
  // The shared render hooks own capture/restore; this view only reads their cache.
  const fieldValue = (id, fallback) =>
    typeof UIState !== 'undefined' ? (UIState?.fields?.[patient.id]?.[id] ?? fallback) : fallback;
  const disabled = patient.isLocked ? 'disabled' : '';
  const actions =
    button('Hàng đợi', "navigate('doctor-dashboard', 'doctor')", 'arrow-left', 'ghost') +
    (patient.status !== 'in_progress'
      ? button(
          'Bắt đầu khám',
          `startPatientExamination(${Number(patient.id)})`,
          'play',
          'primary',
          `id="btnStartExam" ${disabled}`,
        )
      : button(
          'Lưu nháp',
          `triggerManualSaveDraft(${Number(patient.id)})`,
          'save',
          'secondary',
          disabled,
        ));

  return /* HTML */ `
    <div data-exam-patient="${escapeHtml(patient.id)}">
      ${pageHeader('Khám bệnh / Hồ sơ điện tử', 'Phiếu khám bệnh', 'TS.BS Trần Thị Minh / Nội khoa / Phòng 201', actions)}
      <div class="section-heading wrap">
        <div class="row wrap">
          <strong>PK-20260914-${escapeHtml(String(patient.id).padStart(3, '0'))}</strong>
          <span
            id="examStatusBadge"
            class="badge badge-${patient.isLocked ? 'success' : patient.status === 'in_progress' ? 'info' : 'warning'}"
          >
            ${patient.isLocked ? 'Đã hoàn tất' : patient.status === 'in_progress' ? 'Đang khám' : 'Chờ khám'}
          </span>
        </div>
        <span id="autoSaveIndicator" class="row muted small" role="status" aria-live="polite">
          ${icon('save')}<span id="autoSaveText">Tự động lưu nháp: Đã sẵn sàng</span>
        </span>
      </div>
      ${renderClinicalPatientSummary(patient)}
      <div class="clinical-layout">
        <div class="stack">
          ${renderClinicalVitals(patient, fieldValue)}
          ${renderClinicalFindings(patient, fieldValue)}
          ${renderClinicalFollowUp(patient, fieldValue)}
        </div>
        <div class="stack">
          ${renderClinicalOrders(patient, totalCls)}
          ${renderClinicalPrescriptions(patient, totalMeds)}
        </div>
      </div>
      ${renderClinicalCompletion(patient, totalCls, totalMeds)}
    </div>
  `;
}

function renderClinicalPatientSummary(patient) {
  const names = String(patient.name || '')
    .trim()
    .split(/\s+/);
  const initials = (names[names.length - 1]?.charAt(0) || '') + (names[0]?.charAt(0) || '');
  return /* HTML */ `
    <section class="surface" aria-labelledby="clinicalPatientHeading">
      <div class="section-heading wrap">
        <div class="row wrap">
          <span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span>
          <div>
            <h2 id="clinicalPatientHeading">${escapeHtml(patient.name)}</h2>
            <p class="muted small">
              Ngày sinh: ${escapeHtml(formatDate(patient.dob))} / ${escapeHtml(patient.gender)} /
              ${escapeHtml(patient.phone)}
            </p>
          </div>
        </div>
        <span class="badge badge-info"
          >STT #${escapeHtml(String(patient.stt || 1).padStart(2, '0'))}</span
        >
      </div>
      <div class="row wrap">
        <span class="badge badge-${patient.allergy !== 'Không' ? 'danger' : 'success'}"
          >Dị ứng: ${escapeHtml(patient.allergy)}</span
        >
        <span class="badge badge-info">Tiền sử: ${escapeHtml(patient.history)}</span>
      </div>
    </section>
  `;
}

function renderClinicalField({
  id,
  label,
  type = 'text',
  value,
  handler = '',
  placeholder,
  unit,
  locked,
}) {
  const attributes = `id="${escapeHtml(id)}" class="form-input" ${handler ? `oninput="${escapeHtml(handler)}"` : ''} ${locked ? 'disabled' : ''} ${placeholder !== undefined ? `placeholder="${escapeHtml(placeholder)}"` : ''} ${unit ? `aria-describedby="${escapeHtml(id)}Unit"` : ''}`;
  return /* HTML */ `
    <div class="field">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      ${
        type === 'textarea'
          ? `<textarea ${attributes} rows="2">${escapeHtml(value)}</textarea>`
          : `<input ${attributes} type="${escapeHtml(type)}" value="${escapeHtml(value)}">`
      }
      ${unit ? `<span class="muted small" id="${escapeHtml(id)}Unit">${escapeHtml(unit)}</span>` : ''}
    </div>
  `;
}

function renderClinicalVitals(patient, fieldValue) {
  const fields = [
    { id: 'vitalPulse', label: 'Mạch', value: '80', placeholder: '80', unit: 'lần/phút' },
    { id: 'vitalBP', label: 'Huyết áp', value: '120/80', placeholder: '120/80', unit: 'mmHg' },
    { id: 'vitalTemp', label: 'Thân nhiệt', value: '36.8', placeholder: '36.5', unit: '°C' },
    {
      id: 'vitalHeight',
      label: 'Chiều cao',
      value: '170',
      placeholder: '170',
      unit: 'cm',
      type: 'number',
    },
    {
      id: 'vitalWeight',
      label: 'Cân nặng',
      value: '65',
      placeholder: '65',
      unit: 'kg',
      type: 'number',
    },
    { id: 'vitalSpo2', label: 'SpO2', value: '98', placeholder: '98', unit: '%', type: 'number' },
  ];
  return /* HTML */ `
    <section class="clinical-section" aria-labelledby="clinicalVitalsHeading">
      <div class="section-heading wrap">
        <h2 id="clinicalVitalsHeading">Sinh hiệu &amp; thể trạng</h2>
        <span class="badge badge-success" id="bmiBadge" role="status">BMI: 22.5 (Bình thường)</span>
      </div>
      <div class="vitals-grid">
        ${fields
          .map(field =>
            renderClinicalField({
              ...field,
              value: fieldValue(field.id, field.value),
              handler: `${field.id === 'vitalHeight' || field.id === 'vitalWeight' ? 'calculateBMI(); ' : ''}handleAutoSaveDraft(${Number(patient.id)})`,
              locked: patient.isLocked,
            }),
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderClinicalFindings(patient, fieldValue) {
  const handler = `handleAutoSaveDraft(${Number(patient.id)})`;
  const fields = [
    { id: 'examReason', label: 'Lý do đến khám ban đầu', value: patient.reason },
    {
      id: 'examHistory',
      label: 'Bệnh sử hiện tại & Diễn tiến',
      type: 'textarea',
      placeholder: 'Nhập bệnh sử hiện tại...',
      value:
        'Khởi phát cách đây 3 ngày với cảm giác ợ chua, cồn cào vùng thượng vị sau ăn. Đã tự dùng thuốc dạ dày không đỡ.',
    },
    {
      id: 'examSymptoms',
      label: 'Ghi nhận triệu chứng lâm sàng',
      type: 'textarea',
      value: 'Bụng mềm, ấn đau tức nhẹ thượng vị, không đề kháng. Tim đều, phổi trong, không ran.',
    },
    {
      id: 'examPrelimDiagnosis',
      label: 'Chẩn đoán sơ bộ ban đầu',
      type: 'textarea',
      value: 'Theo dõi Viêm loét dạ dày tá tràng cấp',
    },
  ];
  const diagnoses = [
    ['K29', 'K29 - Viêm dạ dày'],
    ['K21', 'K21 - Trào ngược dạ dày (GERD)'],
    ['I10', 'I10 - Tăng huyết áp vô căn'],
    ['J00', 'J00 - Viêm mũi họng cấp'],
    ['M17', 'M17 - Thoái hóa khớp gối'],
  ];
  return /* HTML */ `
    <section class="clinical-section" aria-labelledby="clinicalFindingsHeading">
      <div class="section-heading">
        <h2 id="clinicalFindingsHeading">Khám lâm sàng &amp; chẩn đoán</h2>
      </div>
      <div class="stack">
        ${fields
          .map(field =>
            renderClinicalField({
              ...field,
              value: fieldValue(field.id, field.value),
              handler,
              locked: patient.isLocked,
            }),
          )
          .join('')}
        <div class="form-grid">
          ${renderClinicalField({
            id: 'examDiagnosis',
            label: 'Chẩn đoán xác định',
            type: 'textarea',
            value: fieldValue(
              'examDiagnosis',
              'Viêm dạ dày tá tràng / Theo dõi trào ngược dạ dày thực quản',
            ),
            handler,
            locked: patient.isLocked,
          })}
          <div class="field">
            <label for="examIcd10">Mã ICD-10</label>
            <select
              class="form-input"
              id="examIcd10"
              onchange="${escapeHtml(handler)}"
              ${patient.isLocked ? 'disabled' : ''}
            >
              ${diagnoses.map(([code, label]) => `<option value="${escapeHtml(code)}" ${fieldValue('examIcd10', 'K29') === code ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderClinicalFollowUp(patient, fieldValue) {
  return /* HTML */ `
    <section class="clinical-section" aria-labelledby="clinicalFollowUpHeading">
      <div class="section-heading">
        <h2 id="clinicalFollowUpHeading">Lời dặn &amp; hẹn tái khám</h2>
      </div>
      <div class="stack">
        ${renderClinicalField({
          id: 'examNotes',
          label: 'Chế độ dinh dưỡng & sinh hoạt',
          type: 'textarea',
          value: fieldValue(
            'examNotes',
            'Ăn uống điều độ, tránh thức ăn cay nóng, kiêng rượu bia và cà phê. Nghỉ ngơi hợp lý.',
          ),
          locked: patient.isLocked,
        })}
        ${renderClinicalField({
          id: 'examFollowUp',
          label: 'Hẹn ngày tái khám',
          type: 'date',
          value: fieldValue('examFollowUp', '2026-09-28'),
          locked: patient.isLocked,
        })}
      </div>
    </section>
  `;
}

function renderClinicalRemoveButton(label, handler, locked) {
  return /* HTML */ `<button
    type="button"
    class="icon-btn"
    title="${escapeHtml(label)}"
    aria-label="${escapeHtml(label)}"
    onclick="${escapeHtml(handler)}"
    ${locked ? 'disabled' : ''}
  >
    ${icon('trash-2')}
  </button>`;
}

function renderClinicalOrders(patient, totalCls) {
  return /* HTML */ `
    <section class="clinical-section" aria-labelledby="clinicalOrdersHeading">
      <div class="section-heading wrap">
        <h2 id="clinicalOrdersHeading">Cận lâm sàng &amp; kết quả</h2>
        ${button('Thêm chỉ định', 'openAddClsModal()', 'plus', 'secondary', patient.isLocked ? 'disabled' : '')}
      </div>
      <div class="stack">
        ${AppState.examination.clsOrders.map((order, index) => renderClinicalOrder(order, index, patient.isLocked)).join('')}
      </div>
      <div class="summary-line">
        <span>Tổng chi phí cận lâm sàng</span><strong>${escapeHtml(money(totalCls))}</strong>
      </div>
    </section>
  `;
}

function renderClinicalOrder(order, index, locked) {
  const status =
    order.status === 'COMPLETED'
      ? badge('Đã có kết quả', 'success')
      : order.status === 'PAID'
        ? badge('Đã thu tiền', 'info')
        : badge('Chờ thu tiền', 'warning');
  const disabled = locked ? 'disabled' : '';
  const action =
    order.status === 'ORDERED'
      ? button('Thu tiền tại quầy', `payClsOrder(${index})`, 'credit-card', 'secondary', disabled)
      : order.status === 'PAID'
        ? button(
            'KTV nhập kết quả',
            `enterClsResult(${index})`,
            'file-pen-line',
            'primary',
            disabled,
          )
        : button(
            'Cập nhật kết quả KTV',
            `enterClsResult(${index})`,
            'file-pen-line',
            'ghost',
            disabled,
          );
  return /* HTML */ `
    <article class="order-item stack" aria-labelledby="clinicalOrderHeading${index}">
      <div class="section-heading wrap">
        <div>
          <h3 id="clinicalOrderHeading${index}">${escapeHtml(order.name)}</h3>
          <p class="muted small">${escapeHtml(order.type)} / ${escapeHtml(order.code || 'CLS')}</p>
        </div>
        <div class="row wrap">
          ${status}
          ${renderClinicalRemoveButton(`Hủy chỉ định: ${order.name}`, `removeClsOrder(${index})`, locked)}
        </div>
      </div>
      <div class="summary-line">
        <span>Chi phí dịch vụ</span><strong>${escapeHtml(money(order.price))}</strong>
      </div>
      ${order.status === 'COMPLETED' ? renderClinicalResults(order, index) : ''}
      <div class="actions">${action}</div>
    </article>
  `;
}

function renderClinicalResults(order, index) {
  const hasAbnormal = order.indicators && order.indicators.some(indicator => indicator.isAbnormal);
  return /* HTML */ `
    <div class="stack">
      ${hasAbnormal ? `<div class="alert alert-warning" role="note">${icon('triangle-alert')}<span>Có chỉ số bất thường</span></div>` : ''}
      ${order.conclusion ? `<p><strong>Kết luận:</strong> ${escapeHtml(order.conclusion)}</p>` : ''}
      ${order.result ? `<p class="small"><strong>Mô tả kết quả:</strong> ${escapeHtml(order.result)}</p>` : ''}
      ${
        order.indicators && order.indicators.length > 0
          ? `
        <div class="table-wrap" role="region" aria-labelledby="clinicalOrderHeading${index}" tabindex="0">
          <table class="data-table results-table">
            <thead>
              <tr>
                <th scope="col">Chỉ số đo lường</th>
                <th scope="col">Kết quả</th>
                <th scope="col">Đơn vị</th>
                <th scope="col">Khoảng tham chiếu</th>
                <th scope="col">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              ${order.indicators
                .map(
                  indicator => `
                <tr>
                  <th scope="row">${escapeHtml(indicator.name)}</th>
                  <td><strong>${escapeHtml(indicator.value)}</strong></td>
                  <td>${escapeHtml(indicator.unit || '-')}</td>
                  <td>${escapeHtml(indicator.normalRange || '-')}</td>
                  <td>${badge(indicator.isAbnormal ? 'Cao / Bất thường' : 'Bình thường', indicator.isAbnormal ? 'danger' : 'success')}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
      <div class="actions wrap">
        ${(order.attachments || []).map((url, attachmentIndex) => renderClinicalResultLink(url, `Xem ảnh ${attachmentIndex + 1}`, 'image')).join('')}
      </div>
    </div>
  `;
}

function renderClinicalResultLink(url, label, iconName) {
  const href = safeHref(url);
  if (!href || href === '#')
    return /* HTML */ `<span class="muted small"
      >${escapeHtml(label)}: liên kết không khả dụng</span
    >`;
  return /* HTML */ `<a
    class="btn btn-ghost small"
    href="${href}"
    target="_blank"
    rel="noopener noreferrer"
    >${icon(iconName)}${escapeHtml(label)}</a
  >`;
}

function renderClinicalPrescriptions(patient, totalMeds) {
  const prescriptions = AppState.examination.prescriptions;
  return /* HTML */ `
    <section class="clinical-section" aria-labelledby="clinicalPrescriptionHeading">
      <div class="section-heading wrap">
        <h2 id="clinicalPrescriptionHeading">Đơn thuốc điện tử</h2>
        ${patient.isLocked ? badge('Hồ sơ đã khóa', 'neutral') : button('Thêm thuốc', 'openAddMedicineModal()', 'plus', 'secondary')}
      </div>
      ${
        prescriptions.length
          ? `
        <div class="stack">
          ${prescriptions
            .map(
              (medication, index) => `
            <article class="order-item stack" aria-labelledby="clinicalMedicineHeading${index}">
              <div class="section-heading wrap">
                <div>
                  <h3 id="clinicalMedicineHeading${index}">${index + 1}. ${escapeHtml(medication.name)}</h3>
                  ${medication.active ? `<p class="muted small">Hoạt chất: ${escapeHtml(medication.active)}</p>` : ''}
                </div>
                ${!patient.isLocked ? renderClinicalRemoveButton(`Xóa thuốc: ${medication.name}`, `removeMedicine(${index})`, false) : ''}
              </div>
              <div class="summary-line">
                <span>Số lượng: <strong>${escapeHtml(medication.qty)} ${escapeHtml(medication.unit || '')}</strong></span>
                <strong>${escapeHtml(money(medication.price))}</strong>
              </div>
              <p class="small"><strong>Liều dùng:</strong> ${escapeHtml(medication.doseDetail || medication.dose || '')}</p>
              ${medication.usage ? `<p class="small"><strong>Cách dùng:</strong> ${escapeHtml(medication.usage)}</p>` : ''}
            </article>
          `,
            )
            .join('')}
        </div>
      `
          : emptyState('pill', 'Chưa kê thuốc', 'Đơn thuốc của ca khám hiện chưa có thuốc.')
      }
      <div class="summary-line">
        <span>Tổng tiền thuốc</span><strong>${escapeHtml(money(totalMeds))}</strong>
      </div>
    </section>
  `;
}

function renderClinicalCompletion(patient, totalCls, totalMeds) {
  return /* HTML */ `
    <section class="surface" aria-labelledby="clinicalCompletionHeading">
      <div class="section-heading"><h2 id="clinicalCompletionHeading">Chi phí ca khám</h2></div>
      <dl class="summary-list">
        <div class="summary-line">
          <dt>Khám chuyên khoa</dt>
          <dd>${escapeHtml(money(200000))}</dd>
        </div>
        <div class="summary-line">
          <dt>Cận lâm sàng</dt>
          <dd>${escapeHtml(money(totalCls))}</dd>
        </div>
        <div class="summary-line">
          <dt>Thuốc theo đơn</dt>
          <dd>${escapeHtml(money(totalMeds))}</dd>
        </div>
        <div class="summary-line">
          <dt><strong>Tổng viện phí</strong></dt>
          <dd><strong>${escapeHtml(money(200000 + totalCls + totalMeds))}</strong></dd>
        </div>
      </dl>
      ${
        patient.isLocked
          ? `
        <div class="alert alert-info" role="status">
          ${icon('lock-keyhole')}
          <div><strong>Ca khám đã hoàn tất. Hồ sơ đã khóa.</strong><p class="small">Bảng kê viện phí đã chuyển sang quầy thu ngân.</p></div>
        </div>
      `
          : `
        <div class="actions">
          ${button('Hoàn tất khám & chuyển thu ngân', `completeExamination(${Number(patient.id)})`, 'clipboard-check')}
        </div>
      `
      }
    </section>
  `;
}
