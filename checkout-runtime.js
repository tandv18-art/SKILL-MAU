(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  let selectedPlanId = null;
  let checkoutLiveEnabled = false;
  let checkoutBusy = false;
  let readinessLoaded = false;

  function currentSession() {
    return window.toilaaiAuth?.getSession?.() || null;
  }

  function closeShells() {
    document.querySelectorAll('.shell-overlay.open').forEach(shell => {
      shell.classList.remove('open');
      shell.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  }

  function safeCheckoutUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  function syncCheckoutUi(message = '') {
    const button = $('[data-checkout-payos]');
    if (button) {
      button.disabled = !checkoutLiveEnabled || checkoutBusy;
      button.style.opacity = checkoutLiveEnabled && !checkoutBusy ? '1' : '.72';
      button.style.cursor = checkoutLiveEnabled && !checkoutBusy ? 'pointer' : 'not-allowed';
    }
    const status = $('#checkout-status');
    if (!status) return;
    if (message) status.textContent = message;
    else if (checkoutBusy) status.textContent = 'Đang tạo phiên thanh toán an toàn…';
    else if (checkoutLiveEnabled) status.textContent = 'Bạn sẽ được chuyển sang trang thanh toán bảo mật của PayOS.';
    else if (readinessLoaded) status.textContent = 'Thanh toán đang tạm khóa. Không có giao dịch nào được tạo.';
    else status.textContent = 'Đang kiểm tra trạng thái thanh toán…';
  }

  async function refreshCheckoutReadiness() {
    try {
      const response = await fetch('/api/billing-status', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      checkoutLiveEnabled = response.ok && payload?.live === true;
    } catch {
      checkoutLiveEnabled = false;
    } finally {
      readinessLoaded = true;
      syncCheckoutUi();
    }
  }

  function openCheckout(plan) {
    selectedPlanId = plan.id;
    document.querySelectorAll('.shell-overlay.open').forEach(shell => {
      shell.classList.remove('open');
      shell.setAttribute('aria-hidden', 'true');
    });
    const shell = $('#checkout-shell');
    const planBox = $('#checkout-plan');
    if (!shell || !planBox) return;
    planBox.innerHTML = `<b>${plan.name}</b><strong>${plan.price}${plan.billingPeriod ? ' / tháng' : ''}</strong>`;
    shell.classList.add('open');
    shell.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    syncCheckoutUi();
  }

  function normalizeCheckoutUi() {
    const grid = $('.payment-grid');
    const title = $('#checkout-title');
    if (title) title.textContent = 'Thanh toán an toàn';
    if (!grid) return;

    grid.style.gridTemplateColumns = '1fr';
    grid.innerHTML = '';

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.checkoutPayos = 'true';
    button.style.display = 'grid';
    button.style.gap = '3px';
    button.style.textAlign = 'left';
    button.innerHTML = '<b>PayOS / VietQR</b><span style="font-size:10px;color:#91a098">Chuyển khoản QR ngân hàng</span>';
    grid.append(button);

    let status = $('#checkout-status');
    if (!status) {
      status = $('.checkout-card > .shell-note');
      if (status) status.id = 'checkout-status';
    }
    if (!status) {
      status = document.createElement('p');
      status.id = 'checkout-status';
      status.className = 'shell-note';
      grid.insertAdjacentElement('afterend', status);
    }
    syncCheckoutUi();
  }

  async function startPayOSCheckout() {
    if (!checkoutLiveEnabled || checkoutBusy || !selectedPlanId) return;

    if (!currentSession()?.user) {
      closeShells();
      window.openAuth?.('login');
      return;
    }

    checkoutBusy = true;
    syncCheckoutUi();
    try {
      const response = await fetch('/api/billing-create-order', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          syncCheckoutUi('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi chủ động thử lại.');
          return;
        }
        syncCheckoutUi(payload?.error || 'Chưa thể tạo phiên thanh toán. Hệ thống không tự thử lại.');
        return;
      }
      const checkoutUrl = safeCheckoutUrl(payload?.order?.checkoutUrl);
      if (!checkoutUrl) {
        syncCheckoutUi('Phản hồi thanh toán không hợp lệ. Hệ thống không tự thử lại.');
        return;
      }
      syncCheckoutUi('Đang chuyển sang PayOS…');
      window.location.assign(checkoutUrl);
    } catch {
      syncCheckoutUi('Chưa xác định được kết quả kết nối PayOS. Hệ thống không tự thử lại; vui lòng kiểm tra trước khi thử lại.');
    } finally {
      checkoutBusy = false;
      syncCheckoutUi();
    }
  }

  document.addEventListener('click', event => {
    const planButton = event.target.closest('[data-plan]');
    if (planButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const planId = String(planButton.dataset.plan || '');
      const plan = window.AIOS_PRICING?.find?.(item => item.id === planId);
      if (!plan) return;
      if (plan.id === 'free') {
        closeShells();
        if (currentSession()?.user) window.toilaaiAuth?.openWorkspace?.();
        else window.openAuth?.('signup');
        return;
      }
      openCheckout(plan);
      return;
    }

    const payosButton = event.target.closest('[data-checkout-payos]');
    if (!payosButton) return;
    event.preventDefault();
    void startPayOSCheckout();
  }, true);

  async function mount() {
    normalizeCheckoutUi();
    await refreshCheckoutReadiness();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
  } else {
    void mount();
  }
})();
