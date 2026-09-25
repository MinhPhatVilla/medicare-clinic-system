const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const email = `auth-test-${Date.now()}@example.com`;
  const password = 'TestOnly@2026';
  const url = 'http://127.0.0.1:5500';
  const results = path.resolve(__dirname, '../test-results');
  fs.mkdirSync(results, { recursive: true });
  const submit = () => page.locator('#authForm [type="submit"]').click();
  const fillLogin = async (value = password) => {
    await page.locator('#loginEmail').fill(email);
    await page.locator('#loginPass').fill(value);
  };
  const logout = async () => {
    await page.evaluate(() => handleLogout());
    await page.locator('#authForm').waitFor();
  };
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Đặt lịch khám ngay', exact: true }).click();
    await page.locator('#authForm').waitFor();
    assert.equal(await page.locator('#roleSelector').count(), 0);
    await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
    await page.locator('#fullName').fill('Bệnh nhân kiểm thử');
    await fillLogin();
    await page.locator('#confirmation').fill('Mismatch1');
    await submit();
    assert.match(await page.locator('#authError').innerText(), /chưa khớp/);
    await page.locator('#confirmation').fill(password);
    const registered = page.waitForResponse(r => r.url().endsWith('/auth/register'));
    await submit();
    assert.equal((await registered).status(), 201);
    await page.locator('.sidebar-user').waitFor();
    assert.match(await page.locator('.sidebar-user').innerText(), /Bệnh nhân kiểm thử/);
    assert.equal(await page.evaluate(() => AppState.currentView), 'patient-booking');
    const profile = await page.evaluate(() => authRequest('profile', undefined, true));
    assert.equal(profile.email, email);
    assert.equal(profile.role, 'PATIENT');
    assert.ok(profile.patient?.id, 'Patient record persisted in backend');
    assert.equal(profile.password, undefined);
    await page.evaluate(() => navigate('admin-dashboard', 'admin'));
    assert.equal(await page.evaluate(() => AppState.currentView), 'patient-booking');
    await page.evaluate(() => { saveAuthTokens({ ...authTokens, accessToken: 'expired' }); });
    await page.reload();
    await page.waitForFunction(() => !!AppState.currentUser);
    assert.equal(await page.evaluate(() => AppState.currentUser.email), email);
    await page.evaluate(() => navigate('patient-dashboard'));
    const oldRefresh = await page.evaluate(() => authTokens.refreshToken);
    await logout();
    const revoked = await page.request.post('http://localhost:3000/api/v1/auth/refresh',
      { data: { refreshToken: oldRefresh } });
    assert.equal(revoked.status(), 401);
    assert.equal(await page.evaluate(() => sessionStorage.getItem(AUTH_STORAGE_KEY)), null);
    await fillLogin('WrongPassword1');
    const failed = page.waitForResponse(r => r.url().endsWith('/auth/login'));
    await submit();
    assert.equal((await failed).status(), 401);
    await page.waitForFunction(() => !!document.getElementById('authError')?.textContent);
    assert.equal(await page.evaluate(() => AppState.currentUser), null);
    await fillLogin();
    await submit();
    await page.locator('.sidebar-user').waitFor();
    await logout();
    await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
    await page.locator('#fullName').fill('Bệnh nhân kiểm thử');
    await fillLogin();
    await page.locator('#confirmation').fill(password);
    const duplicate = page.waitForResponse(r => r.url().endsWith('/auth/register'));
    await submit();
    assert.equal((await duplicate).status(), 409);
    await page.waitForFunction(() => !!document.getElementById('authError')?.textContent);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(results, `auth-register-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Đã có tài khoản? Đăng nhập' }).click();
    await fillLogin();
    await page.context().setOffline(true);
    await submit();
    await page.waitForFunction(() => !!document.getElementById('authError')?.textContent);
    assert.match(await page.locator('#authError').innerText(), /Không kết nối/);
    assert.equal(await page.locator('#authForm [type="submit"]').isDisabled(), false);
    await page.context().setOffline(false);
    assert.deepEqual(errors, []);
    process.stdout.write('PASS: registration, persisted profile, role guard, refresh, logout/revocation, login, duplicate email, validation, offline, responsive.\n');
    process.stdout.write(`Test patient retained: ${email}\n`);
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
