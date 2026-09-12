(() => {
  const authState = { session: null, mode: 'login', resetToken: null, busy: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#auth-form');
  if (!form || typeof window.fetch !== 'function') return;

  const googleButton = $('.google-button');
  const divider = $('.auth-divider');
  const switchButtons = $$('.auth-switch');
  const note = $('#auth-note');
  const title = $('#auth-title');
  const copy = $('#auth-copy');

  function isEnglish() { return document.documentElement.lang === 'en'; }
  function text(vi, en) { return isEnglish() ? en : vi; }
  function setNote(message, isError = false) {
    if (!note) return;
    note.textContent = message || '';
    note.dataset.status = isError ? 'error' : 'info';
  }

  function localizeAccountUi() {
    const labels = {
      home: '⌂ Trang chủ',
      tools: '◇ Tất cả công cụ',
      creations: '◫ Sản phẩm đã tạo',
      usage: '◌ Mức sử dụng / Điểm',
      billing: '▤ Thanh toán',
      account: '○ Tài khoản',
      help: '? Trợ giúp'
    };
    $$('#workspace-nav [data-workspace]').forEach(button => {
      const label = labels[button.dataset.workspace];
      if (label) button.textContent = label;
    });
    const workspaceCategory = $('#workspace-shell .skill-category');
    if (workspaceCategory) workspaceCategory.textContent = 'KHÔNG GIAN LÀM VIỆC';
    const authCategory = $('#auth-shell .skill-category');
    if (authCategory) authCategory.textContent = 'TÀI KHOẢN TÔI LÀ AI';
  }

  function rememberAuthSlots() {
    $$('[data-auth]').forEach(button => {
      if (!button.dataset.authSlot && (button.dataset.auth === 'login' || button.dataset.auth === 'signup')) button.dataset.authSlot = button.dataset.auth;
    });
  }

  function renderAuthNav() {
    rememberAuthSlots();
    const signedIn = Boolean(authState.session?.user);
    $$('[data-auth-slot]').forEach(button => {
      const slot = button.dataset.authSlot;
      if (signedIn) {
        button.dataset.auth = slot === 'login' ? 'account' : 'logout';
        button.textContent = slot === 'login' ? text('Tài khoản', 'Account') : text('Đăng xuất', 'Sign out');
        button.removeAttribute('data-i18n');
      } else {
        button.dataset.auth = slot;
        button.textContent = slot === 'login' ? text('Đăng nhập', 'Sign in') : text(button.closest('footer') ? 'Đăng ký' : 'Bắt đầu miễn phí', button.closest('footer') ? 'Sign up' : 'Start free');
      }
    });
  }

  async function authRequest(path, options = {}) {
    const method = options.method || 'GET';
    const url = new URL('/api/auth', location.origin);
    url.searchParams.set('path', path);
    if (options.verifier) url.searchParams.set('neon_auth_session_verifier', options.verifier);
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(options.body || {}) : undefined
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.message || payload?.error || text('Yêu cầu đăng nhập không thành công.', 'Authentication request failed.');
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function field(label, name, type, autocomplete, placeholder = '', extra = '') {
    return `<label>${label}<input name="${name}" type="${type}" ${extra} autocomplete="${autocomplete}" placeholder="${placeholder}"></label>`;
  }

  function configureSwitches(mode) {
    const first = switchButtons[0];
    const second = switchButtons[1];
    if (!first || !second) return;
    [first, second].forEach(button => {
      button.hidden = false;
      button.removeAttribute('data-open-workspace');
      button.removeAttribute('data-auth');
    });

    if (mode === 'login') {
      first.dataset.auth = 'forgot'; first.textContent = text('Quên mật khẩu?', 'Forgot password?');
      second.dataset.auth = 'signup'; second.textContent = text('Tạo tài khoản', 'Create account');
    } else if (mode === 'signup') {
      first.dataset.auth = 'login'; first.textContent = text('Đã có tài khoản? Đăng nhập', 'Already have an account? Sign in');
      second.hidden = true;
    } else if (mode === 'forgot' || mode === 'reset') {
      first.dataset.auth = 'login'; first.textContent = text('Quay lại đăng nhập', 'Back to sign in');
      second.hidden = true;
    } else if (mode === 'change-password') {
      first.dataset.auth = 'account'; first.textContent = text('Quay lại tài khoản', 'Back to account');
      second.hidden = true;
    }
  }

  function openAuthReal(mode = 'login') {
    if (mode === 'account') return openWorkspace('account');
    if (mode === 'logout') return signOut();
    if (mode === 'change-password' && !authState.session?.user) mode = 'login';
    authState.mode = mode;
    if (googleButton) googleButton.hidden = false;
    if (divider) divider.hidden = false;
    setNote('');

    if (mode === 'signup') {
      title.textContent = text('Tạo tài khoản', 'Create account');
      copy.textContent = text('Tạo tài khoản TÔI LÀ AI bằng Google hoặc email và mật khẩu.', 'Create your TÔI LÀ AI account with Google or email and password.');
      form.innerHTML = `${field(text('Tên hiển thị', 'Display name'), 'name', 'text', 'name', text('Tên của bạn', 'Your name'), 'required maxlength="80"')}${field('Email', 'email', 'email', 'email', 'you@example.com', 'required')}${field(text('Mật khẩu', 'Password'), 'password', 'password', 'new-password', '', 'required minlength="8" maxlength="128"')}<button class="button" type="submit">${text('Tạo tài khoản', 'Create account')}</button>`;
    } else if (mode === 'forgot') {
      if (googleButton) googleButton.hidden = true;
      if (divider) divider.hidden = true;
      title.textContent = text('Khôi phục mật khẩu', 'Reset password');
      copy.textContent = text('Nhập email để nhận liên kết đặt lại mật khẩu.', 'Enter your email to receive a password reset link.');
      form.innerHTML = `${field('Email', 'email', 'email', 'email', 'you@example.com', 'required')}<button class="button" type="submit">${text('Gửi liên kết', 'Send reset link')}</button>`;
    } else if (mode === 'reset') {
      if (googleButton) googleButton.hidden = true;
      if (divider) divider.hidden = true;
      title.textContent = text('Đặt mật khẩu mới', 'Set a new password');
      copy.textContent = text('Nhập mật khẩu mới cho tài khoản của bạn.', 'Enter a new password for your account.');
      form.innerHTML = `${field(text('Mật khẩu mới', 'New password'), 'newPassword', 'password', 'new-password', '', 'required minlength="8" maxlength="128"')}<button class="button" type="submit">${text('Lưu mật khẩu mới', 'Save new password')}</button>`;
    } else if (mode === 'change-password') {
      if (googleButton) googleButton.hidden = true;
      if (divider) divider.hidden = true;
      title.textContent = text('Đổi mật khẩu', 'Change password');
      copy.textContent = text('Xác nhận mật khẩu hiện tại trước khi đặt mật khẩu mới.', 'Confirm your current password before setting a new one.');
      form.innerHTML = `${field(text('Mật khẩu hiện tại', 'Current password'), 'currentPassword', 'password', 'current-password', '', 'required minlength="8" maxlength="128"')}${field(text('Mật khẩu mới', 'New password'), 'newPassword', 'password', 'new-password', '', 'required minlength="8" maxlength="128"')}<button class="button" type="submit">${text('Đổi mật khẩu', 'Change password')}</button>`;
    } else {
      authState.mode = 'login';
      title.textContent = text('Đăng nhập', 'Sign in');
      copy.textContent = text('Tiếp tục bằng Google hoặc email và mật khẩu.', 'Continue with Google or email and password.');
      form.innerHTML = `${field('Email', 'email', 'email', 'email', 'you@example.com', 'required')}${field(text('Mật khẩu', 'Password'), 'password', 'password', 'current-password', '', 'required minlength="8" maxlength="128"')}<label><span>${text('Ghi nhớ đăng nhập', 'Remember me')}</span><input name="rememberMe" type="checkbox" checked></label><button class="button" type="submit">${text('Đăng nhập', 'Sign in')}</button>`;
    }
    configureSwitches(authState.mode);
    localizeAccountUi();
    window.openShell?.('auth-shell');
  }

  async function signInGoogle() {
    if (authState.busy) return;
    authState.busy = true;
    if (googleButton) googleButton.disabled = true;
    setNote(text('Đang mở Google…', 'Opening Google…'));
    try {
      const payload = await authRequest('sign-in/social', {
        method: 'POST',
        body: {
          provider: 'google',
          callbackURL: `${location.origin}/`,
          errorCallbackURL: `${location.origin}/?auth=error`,
          newUserCallbackURL: `${location.origin}/`
        }
      });
      if (!payload?.url) throw new Error(text('Không nhận được liên kết đăng nhập Google.', 'Google sign-in did not return a redirect URL.'));
      location.assign(payload.url);
    } catch (error) {
      setNote(error.message, true);
      authState.busy = false;
      if (googleButton) googleButton.disabled = false;
    }
  }

  async function hydrateSession(verifier = '') {
    try {
      const data = await authRequest('get-session', verifier ? { verifier } : {});
      authState.session = data?.user ? data : null;
    } catch {
      authState.session = null;
    }
    renderAuthNav();
    return authState.session;
  }

  async function signOut() {
    try {
      await authRequest('sign-out', { method: 'POST', body: {} });
    } catch (error) {
      setNote(error.message, true);
      return;
    }
    authState.session = null;
    renderAuthNav();
    window.closeShells?.();
  }

  function clearWorkspace() {
    const box = $('#workspace-content');
    if (box) box.replaceChildren();
    return box;
  }

  function workspaceCard(lines) {
    const box = clearWorkspace();
    if (!box) return;
    const card = document.createElement('div');
    card.className = 'workspace-empty';
    const icon = document.createElement('span'); icon.textContent = '✦';
    card.append(icon);
    lines.forEach((line, index) => {
      const node = document.createElement(index === 0 ? 'b' : 'p');
      node.textContent = line;
      card.append(node);
    });
    box.append(card);
  }

  function renderWorkspace(section = 'home') {
    const user = authState.session?.user;
    if (!user) return openAuthReal('login');
    localizeAccountUi();
    const workspaceTitle = $('#workspace-title');
    const titles = {
      home: 'Trang chủ',
      tools: 'Tất cả công cụ',
      creations: 'Sản phẩm đã tạo',
      usage: 'Mức sử dụng / Điểm',
      billing: 'Thanh toán',
      account: 'Tài khoản',
      help: 'Trợ giúp'
    };
    if (workspaceTitle) workspaceTitle.textContent = titles[section] || 'Trang chủ';

    if (section === 'account') {
      workspaceCard([user.name || 'Tài khoản TÔI LÀ AI', user.email || '', 'Phiên đăng nhập đang hoạt động.']);
      const box = $('#workspace-content');
      const button = document.createElement('button');
      button.className = 'button button-outline';
      button.type = 'button';
      button.dataset.auth = 'change-password';
      button.textContent = 'Đổi mật khẩu';
      box?.append(button);
    } else if (section === 'tools') {
      workspaceCard(['11 công cụ đang hoạt động', 'Mở mục Sản phẩm trên trang chính để sử dụng các công cụ đã được kiểm thử.']);
    } else if (section === 'creations') {
      workspaceCard(['Lịch sử kết quả', 'Chưa lưu lịch sử vào tài khoản.']);
    } else if (section === 'usage') {
      workspaceCard(['Mức sử dụng / Điểm', 'Hạn mức theo tài khoản sẽ được bật ở bước tiếp theo.']);
    } else if (section === 'billing') {
      workspaceCard(['Thanh toán', 'Thanh toán chưa được kích hoạt cho tài khoản này.']);
    } else if (section === 'help') {
      workspaceCard(['Hỗ trợ', 'admintoilaai@gmail.com']);
    } else {
      workspaceCard([`Xin chào, ${user.name || user.email}`, 'Tài khoản đã đăng nhập.']);
    }
  }

  function openWorkspace(section = 'home') {
    if (!authState.session?.user) return openAuthReal('login');
    localizeAccountUi();
    renderWorkspace(section);
    window.openShell?.('workspace-shell');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (authState.busy) return;
    authState.busy = true;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setNote(text('Đang xử lý…', 'Working…'));
    const data = new FormData(form);

    try {
      if (authState.mode === 'signup') {
        await authRequest('sign-up/email', { method: 'POST', body: { name: String(data.get('name') || '').trim(), email: String(data.get('email') || '').trim(), password: String(data.get('password') || ''), callbackURL: `${location.origin}/` } });
        await hydrateSession();
        window.closeShells?.();
      } else if (authState.mode === 'forgot') {
        await authRequest('request-password-reset', { method: 'POST', body: { email: String(data.get('email') || '').trim(), redirectTo: `${location.origin}/?auth=reset` } });
        setNote(text('Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.', 'If the email exists, password reset instructions have been sent.'));
      } else if (authState.mode === 'reset') {
        if (!authState.resetToken) throw new Error(text('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 'The password reset link is invalid or expired.'));
        await authRequest('reset-password', { method: 'POST', body: { newPassword: String(data.get('newPassword') || ''), token: authState.resetToken } });
        authState.resetToken = null;
        history.replaceState({}, '', `${location.pathname}${location.hash || ''}`);
        openAuthReal('login');
        setNote(text('Đã đặt lại mật khẩu. Bạn có thể đăng nhập.', 'Password reset. You can now sign in.'));
      } else if (authState.mode === 'change-password') {
        await authRequest('change-password', { method: 'POST', body: { currentPassword: String(data.get('currentPassword') || ''), newPassword: String(data.get('newPassword') || ''), revokeOtherSessions: true } });
        setNote(text('Đã đổi mật khẩu và thu hồi các phiên khác.', 'Password changed and other sessions revoked.'));
      } else {
        await authRequest('sign-in/email', { method: 'POST', body: { email: String(data.get('email') || '').trim(), password: String(data.get('password') || ''), rememberMe: data.get('rememberMe') === 'on' } });
        await hydrateSession();
        window.closeShells?.();
      }
    } catch (error) {
      setNote(error.message, true);
    } finally {
      authState.busy = false;
      if (submit) submit.disabled = false;
    }
  }

  document.addEventListener('submit', event => {
    if (event.target === form) handleSubmit(event);
  }, true);

  googleButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    signInGoogle();
  }, true);

  document.addEventListener('click', event => {
    const authButton = event.target.closest('[data-auth]');
    if (authButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const mode = authButton.dataset.auth;
      if (mode === 'logout') signOut();
      else if (mode === 'account') openWorkspace('account');
      else openAuthReal(mode);
      return;
    }

    const workspaceButton = event.target.closest('[data-open-workspace]');
    if (workspaceButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openWorkspace('home');
      return;
    }

    const workspaceNav = event.target.closest('[data-workspace]');
    if (workspaceNav) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $$('#workspace-nav button').forEach(button => button.classList.toggle('active', button === workspaceNav));
      renderWorkspace(workspaceNav.dataset.workspace);
    }
  }, true);

  $('#language')?.addEventListener('change', () => {
    setTimeout(() => {
      renderAuthNav();
      localizeAccountUi();
      const activeWorkspace = $('#workspace-nav button.active')?.dataset.workspace;
      if (authState.session?.user && activeWorkspace) renderWorkspace(activeWorkspace);
    }, 0);
  });

  window.openAuth = openAuthReal;
  window.toilaaiAuth = { hydrateSession, openAuth: openAuthReal, openWorkspace, getSession: () => authState.session };
  rememberAuthSlots();
  localizeAccountUi();

  const params = new URLSearchParams(location.search);
  const verifier = params.get('neon_auth_session_verifier') || '';
  if (params.get('auth') === 'reset' && params.get('token')) authState.resetToken = params.get('token');
  if (params.get('auth') === 'error') setTimeout(() => { openAuthReal('login'); setNote(text('Đăng nhập Google chưa hoàn tất. Vui lòng thử lại.', 'Google sign-in did not complete. Please try again.'), true); }, 0);

  (async () => {
    if (verifier) {
      const session = await hydrateSession(verifier);
      const clean = new URL(location.href);
      clean.searchParams.delete('neon_auth_session_verifier');
      clean.searchParams.delete('auth');
      history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`);
      if (!session?.user) {
        openAuthReal('login');
        setNote(text('Không thể hoàn tất phiên đăng nhập Google. Vui lòng thử lại.', 'Could not complete the Google session. Please try again.'), true);
      }
    } else {
      await hydrateSession();
    }
    if (authState.resetToken) openAuthReal('reset');
  })();
})();
