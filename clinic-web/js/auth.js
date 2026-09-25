const AUTH_STORAGE_KEY = 'medicare.auth.tokens';
const API_BASE = 'http://localhost:3000/api/v1';
const AUTH_ROLES = {
  PATIENT: 'patient', DOCTOR: 'doctor', RECEPTIONIST: 'receptionist',
  CASHIER: 'receptionist', ADMIN: 'admin', MANAGER: 'admin',
};
let authTokens = null;
let authBusy = false;
let refreshRequest = null;

function saveAuthTokens(tokens) {
  authTokens = tokens;
  try {
    if (tokens) sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
    else sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch { /* The active session can still work when browser storage is unavailable. */ }
}

async function authRequest(path, body, authenticated = false, retry = true) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authenticated ? { Authorization: `Bearer ${authTokens?.accessToken || ''}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.');
  }
  if (response.status === 401 && authenticated && retry && authTokens?.refreshToken) {
    if (!refreshRequest) {
      refreshRequest = authRequest('refresh', { refreshToken: authTokens.refreshToken })
        .then(saveAuthTokens).finally(() => { refreshRequest = null; });
    }
    await refreshRequest;
    return authRequest(path, body, true, false);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || 'Yêu cầu chưa thành công. Vui lòng thử lại.');
  }
  return result.data;
}

function setAuthMode(mode) {
  if (authBusy) return;
  AppState.authMode = mode;
  render();
}

function enterAccount(user, redirect = true) {
  const role = AUTH_ROLES[user.role];
  if (!role) throw new Error('Vai trò này chưa có màn hình làm việc. Vui lòng liên hệ quản trị viên.');
  AppState.currentUser = user;
  AppState.currentRole = role;
  if (redirect) {
    const next = AppState.afterLogin;
    AppState.afterLogin = null;
    navigate(next?.startsWith(`${role}-`) ? next :
      (user.role === 'CASHIER' ? 'receptionist-billing' : `${role}-dashboard`));
  } else render();
}

async function handleLogin() {
  const form = document.getElementById('authForm');
  if (authBusy || !form?.reportValidity()) return;
  const registering = AppState.authMode === 'register';
  const fields = new FormData(form);
  const body = { email: fields.get('email').trim(), password: fields.get('password') };
  const error = document.getElementById('authError');
  error.textContent = '';
  if (registering) {
    body.fullName = fields.get('fullName').trim();
    if (body.fullName.length < 2 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(body.password)) {
      error.textContent = 'Họ tên cần ít nhất 2 ký tự. Mật khẩu cần chữ hoa, chữ thường và chữ số.';
      return;
    }
    if (body.password !== fields.get('confirmation')) {
      error.textContent = 'Mật khẩu xác nhận chưa khớp.';
      return;
    }
  }
  authBusy = true;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    const session = await authRequest(registering ? 'register' : 'login', body);
    saveAuthTokens(session.tokens);
    enterAccount(session.user);
    showToast(registering ? 'Đăng ký tài khoản thành công.' : 'Đăng nhập thành công.', 'success');
  } catch (failure) {
    saveAuthTokens(null);
    error.textContent = failure.message;
  } finally {
    authBusy = false;
    submit.disabled = false;
    form.removeAttribute('aria-busy');
  }
}

async function restoreAuth() {
  try {
    authTokens = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (!authTokens?.accessToken) return;
    authBusy = true;
    const user = await authRequest('profile', undefined, true);
    enterAccount(user, AppState.currentView === 'login');
  } catch {
    saveAuthTokens(null);
    showToast('Không thể khôi phục phiên. Vui lòng đăng nhập lại.', 'warning');
  } finally { authBusy = false; }
}

async function handleLogout() {
  if (authBusy) return;
  authBusy = true;
  let failed = false;
  try { await authRequest('logout', {}, true); }
  catch { failed = true; }
  finally {
    saveAuthTokens(null);
    AppState.currentUser = null;
    AppState.currentRole = null;
    AppState.afterLogin = null;
    AppState.authMode = 'login';
    authBusy = false;
    navigate('login');
  }
  if (failed) showToast('Đã thoát trên trình duyệt; chưa xác nhận thu hồi phiên trên máy chủ.', 'warning');
}
