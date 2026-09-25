const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const artifacts = process.env.UI_ARTIFACTS || path.resolve(__dirname, '..', 'test-results');
const appointmentDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let checks = 0;
  const check = (value, message) => {
    assert.ok(value, message);
    checks++;
  };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
      await page.goto(url);
      await page.getByRole('button', { name: 'Đặt lịch khám ngay', exact: true }).click();
      check(
        await page.getByRole('button', { name: 'Tiếp theo', exact: true }).isDisabled(),
        'Specialty required',
      );
      await page.getByRole('button', { name: 'Nội khoa', exact: true }).click();
      check(
        await page
          .locator('[data-focus-key="specialty-1"]')
          .evaluate(el => el === document.activeElement),
        'Selection keeps keyboard focus',
      );
      await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click();
      await page.locator('[data-focus-key="doctor-1"]').click();
      await page.screenshot({
        path: path.join(artifacts, `booking-doctor-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click();
      await page.locator('#bookingDate').fill(appointmentDate);
      const reason = 'Đau bụng <img src=x onerror=alert(1)> & kiểm tra';
      await page.locator('#bookingReason').fill(reason);
      await page.locator('.time-slot:not(:disabled)').first().click();
      const selectedTime = await page.locator('.time-slot[aria-pressed="true"]').innerText();
      check(
        (await page.locator('#bookingReason').inputValue()) === reason,
        'Reason retained when selecting time',
      );
      await page.screenshot({
        path: path.join(artifacts, `booking-time-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click();
      check(
        (await page.locator('.confirmation-summary').innerText()).includes(reason),
        'Confirmation escapes patient input',
      );
      check((await page.locator('.confirmation-summary img').count()) === 0, 'No injected HTML');
      await page.screenshot({
        path: path.join(artifacts, `booking-confirm-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Xác nhận đặt lịch', exact: true }).click();
      check((await page.locator('.qr-code svg').count()) === 1, 'Booking QR generated');
      const apt = await page.evaluate(() => AppState.lastCreatedAppointment);
      check(
        apt.date === appointmentDate && apt.time === selectedTime && apt.reason === reason,
        'Existing booking data contract',
      );
      await page.screenshot({
        path: path.join(artifacts, `booking-success-${width}.png`),
        fullPage: true,
      });
      await page.emulateMedia({ media: 'print' });
      check(!(await page.locator('.sidebar').isVisible()), 'Print hides navigation');
      check(await page.locator('.appointment-slip').isVisible(), 'Print retains slip');
      if (width === 1440)
        await page.pdf({
          path: path.join(artifacts, 'appointment-slip.pdf'),
          format: 'A4',
          printBackground: true,
        });
      await page.emulateMedia({ media: 'screen' });
      await page.getByRole('button', { name: 'Lịch hẹn của tôi', exact: true }).last().click();
      await page
        .locator('.appointment-card')
        .first()
        .getByRole('button', { name: 'Hủy lịch hẹn', exact: true })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Hủy lịch hẹn', exact: true })
        .click();
      await page.waitForFunction(
        id => MOCK_DATA.appointments.find(a => a.id === id).status === 'cancelled',
        apt.id,
      );
      check(
        (await page.locator('.appointment-card').first().innerText()).includes('Đã hủy'),
        'Cancellation updates status',
      );
      if (width < 768) {
        await page.locator('#sidebarToggle').click();
        check(
          (await page.locator('#sidebarToggle').getAttribute('aria-expanded')) === 'true',
          'Mobile menu opens',
        );
        await page.keyboard.press('Escape');
        check(
          (await page.locator('#sidebarToggle').getAttribute('aria-expanded')) === 'false',
          'Escape closes menu',
        );
        check(
          await page.locator('#sidebarToggle').evaluate(el => el === document.activeElement),
          'Menu restores focus',
        );
      }
      check(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `No page overflow at ${width}`,
      );
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(url);
    for (const [role, name, view] of [
      ['patient', 'Người bệnh', 'patient-dashboard'],
      ['doctor', 'Bác sĩ', 'doctor-dashboard'],
      ['receptionist', 'Tiếp nhận', 'receptionist-dashboard'],
      ['admin', 'Quản trị', 'admin-dashboard'],
    ]) {
      await page.evaluate(() => navigate('login'));
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: 'Vào không gian làm việc' }).click();
      check((await page.evaluate(() => AppState.currentView)) === view, `${role} login preserved`);
    }
    await page.evaluate(() => navigate('receptionist-dashboard', 'receptionist'));
    await page.locator('#searchReceptionistApt').fill('Trần Thị Bích');
    check(
      (await page.locator('#receptionistAptTbody tr:visible').count()) === 1,
      'Reception search',
    );
    await page.locator('#quickCheckInInput').fill('LH-20260913-001');
    await page.getByRole('button', { name: 'Check-in', exact: true }).click();
    check(
      (await page.evaluate(() => MOCK_DATA.appointments[0].status)) === 'checked-in',
      'Check-in updates appointment',
    );
    await page.getByRole('button', { name: 'Tiếp nhận vãng lai' }).click();
    await page.locator('#dialog-name').fill('Khách kiểm thử');
    await page.locator('#dialog-phone').fill('0901234567');
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
    await page.waitForFunction(() => MOCK_DATA.appointments[0].patient === 'Khách kiểm thử');
    check(
      await page.evaluate(() => MOCK_DATA.patients.some(p => p.name === 'Khách kiểm thử')),
      'Walk-in preserves queue insertion',
    );

    await page.evaluate(() => navigate('doctor-dashboard', 'doctor'));
    await page.getByRole('button', { name: 'Gọi bệnh nhân tiếp theo' }).click();
    await page.locator('#examHistory').fill('Nội dung đang nhập được giữ nguyên qua render.');
    await page.getByRole('button', { name: 'Bắt đầu khám', exact: true }).click();
    check(
      (await page.locator('#examHistory').inputValue()) ===
        'Nội dung đang nhập được giữ nguyên qua render.',
      'Clinical fields survive start',
    );
    await page.getByRole('button', { name: 'Thêm chỉ định', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Thêm chỉ định', exact: true })
      .click();
    await page.waitForFunction(() => AppState.examination.clsOrders.length === 3);
    check(
      (await page.evaluate(() => AppState.examination.clsOrders[2].status)) === 'ORDERED',
      'CLS creation',
    );
    await page.getByRole('button', { name: 'Thu tiền tại quầy', exact: true }).click();
    await page.getByRole('button', { name: 'KTV nhập kết quả', exact: true }).click();
    await page.locator('#dialog-conclusion').fill('Kết quả kiểm thử');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Lưu kết quả', exact: true })
      .click();
    await page.waitForFunction(() => AppState.examination.clsOrders[2].status === 'COMPLETED');
    check(
      (await page.evaluate(() => AppState.examination.clsOrders[2].conclusion)) ===
        'Kết quả kiểm thử',
      'CLS result transitions',
    );
    await page.getByRole('button', { name: 'Thêm thuốc', exact: true }).click();
    await page.locator('#dialog-qty').fill('21');
    await page.locator('#dialog-usage').fill('Theo hướng dẫn bác sĩ');
    await page.getByRole('dialog').getByRole('button', { name: 'Thêm thuốc', exact: true }).click();
    await page.waitForFunction(() => AppState.examination.prescriptions.length === 1);
    check(
      (await page.evaluate(() => AppState.examination.prescriptions[0].price)) === 52500,
      'Prescription quantity and price unchanged',
    );
    await page.locator('#examDiagnosis').fill('Chẩn đoán kiểm thử');
    await page
      .getByRole('button', { name: 'Hoàn tất khám & chuyển thu ngân', exact: true })
      .click();
    await page.waitForFunction(() => AppState.currentView === 'receptionist-billing');
    check(await page.evaluate(() => MOCK_DATA.patients[0].isLocked), 'Completion locks record');
    await page.getByRole('button', { name: 'Thẻ POS', exact: true }).click();
    check(await page.locator('.pos-payment').isVisible(), 'POS view');
    await page.getByRole('button', { name: 'Chuyển khoản', exact: true }).click();
    check(await page.locator('.qr-payment').isVisible(), 'VietQR view');
    await page.getByRole('button', { name: 'Tiền mặt', exact: true }).click();
    await page.locator('#cashReceived').fill('900000');
    check(
      (await page.locator('#changeAmount').innerText()).includes('181'),
      'Existing demo change calculation remains unchanged',
    );
    await page.getByRole('button', { name: 'Xác nhận thu tiền', exact: true }).click();
    await page.waitForFunction(() => AppState.currentView === 'receptionist-dashboard');
    check(await page.locator('#receptionistAptTbody').isVisible(), 'Payment returns to reception');
    await page.evaluate(() => navigate('admin-dashboard', 'admin'));
    for (const [name, count] of [
      ['Bác sĩ', 6],
      ['Dịch vụ', 9],
      ['Kho thuốc', 8],
    ]) {
      await page.locator('.admin-tabs').getByRole('button', { name, exact: true }).click();
      check(
        (await page.locator('.data-table tbody tr').count()) === count,
        `${name} catalog preserved`,
      );
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url);
      await page.evaluate(() => quickBookSpecialty(8));
      check(
        await page.getByRole('heading', { name: 'Chưa có lịch bác sĩ' }).isVisible(),
        'Unavailable specialty has empty state',
      );
      check(
        await page.getByRole('button', { name: 'Tiếp theo', exact: true }).isDisabled(),
        'Cannot advance without doctor',
      );
      await page.evaluate(() => quickBookDoctor(1));
      await page.locator('.time-slot:not(:disabled)').first().click();
      await page.locator('#bookingDate').fill('2000-01-01');
      await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click();
      check(
        (await page.evaluate(() => AppState.booking.step)) === 3,
        'Invalid date cannot advance',
      );
      await page.evaluate(() => navigate('doctor-examination', 'doctor'));
      for (const [action, filename] of [
        ['Thêm chỉ định', 'service'],
        ['Thêm thuốc', 'medicine'],
      ]) {
        await page.getByRole('button', { name: action, exact: true }).click();
        check(await page.getByRole('dialog').isVisible(), `${action} opens accessible dialog`);
        check(
          await page.getByRole('dialog').evaluate(el => {
            const r = el.getBoundingClientRect();
            return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
          }),
          'Dialog stays within viewport',
        );
        await page.screenshot({ path: path.join(artifacts, `dialog-${filename}-${width}.png`) });
        await page.keyboard.press('Escape');
        check((await page.getByRole('dialog').count()) === 0, 'Escape dismisses dialog');
      }
      check(
        (await page.evaluate(() => AppState.examination.prescriptions.length)) === 0,
        'Cancel does not add medication',
      );
      check(
        await page.locator('#sidebar').evaluate(el => el.inert),
        'Closed mobile sidebar is not keyboard focusable',
      );
      await page.locator('#sidebarToggle').click();
      check(
        !(await page.locator('#sidebar').evaluate(el => el.inert)),
        'Open sidebar becomes accessible',
      );
      await page.screenshot({ path: path.join(artifacts, `mobile-navigation-${width}.png`) });
      await page.keyboard.press('Escape');
    }
    await page.route('https://api.vietqr.io/**', route => route.abort());
    await page.evaluate(() => {
      navigate('receptionist-billing', 'receptionist');
      selectBillingMethod('vietqr');
    });
    await page.locator('.qr-payment .alert').waitFor({ state: 'visible' });
    check(
      await page.locator('.qr-payment .alert').isVisible(),
      'External QR failure has visible fallback',
    );
    await page.context().setOffline(true);
    await page.goto(url);
    check(
      await page.locator('.hero-photo').evaluate(img => img.complete && img.naturalWidth > 0),
      'Local hero image works offline',
    );
    check((await page.locator('.hero .lucide').count()) > 0, 'Local icon bundle works offline');
    await page.context().setOffline(false);
    check(errors.length === 0, `No runtime errors: ${errors.join(', ')}`);
    console.log(
      `PASS: ${checks} UI assertions, four viewport booking flows, all roles and clinical/payment workflow.`,
    );
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
