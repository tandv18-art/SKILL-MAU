(() => {
  const CHECKOUT_LIVE_ENABLED = false;
  const $ = (selector, root = document) => root.querySelector(selector);
  let selectedPlanId = null;

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

  function openCheckout(plan) {
    selectedPlanId = plan.id;
    document.querySelectorAll('.shell-overlay.open').forEach(shell => {
      shell.classList.remove('open');
      shell.setAttribute('aria-hidden', 'true');
    });
    const shell = $('#checkout-shell');
    const planBox = $('#checkout-plan');
    const status = $('#checkout-status');
    if (!shell || !planBox) return;
    planBox.innerHTML = `<b>${plan.name}</b><strong>${plan.price}${plan.billingPeriod ? ' / tháng' : ''}</strong>`;
    if (status) {
      status.textContent = CHECKOUT_LIVE_ENABLED
        ? 'Bạn sẽ được chuyển sang trang thanh toán bảo mật của PayOS.'
        : 'Thanh toán thật đang được khóa trong giai đoạn kiểm thử. Không có giao dịch nào được tạo.';
    }
    shell.classList.add('open');
    shell.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function normalizeCheckoutUi() {
    const grid = $('.payment-grid');
    const title = $('#checkout-title');
    if (title) title.textContent = 'Thanh toán an toàn';
    if (!grid) return;
    grid.innerHTML = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.checkoutPayos = 'true';
    button.disabled = !CHECKOUT_LIVE_ENABLED;
    button.innerHTML = '<b>PayOS / VietQR</b><span>Chuyển khoản QR ngân hàng</span>';
    grid.append(button);

    let status = $('#checkout-status');
    if (!status) {
      status = document.createElement('p');
      status.id = 'checkout-status';
      status.className = 'shell-note';
      grid.insertAdjacentElement('afterend', status);
    }
    status.textContent = 'Hiện TÔI LÀ AI chỉ tích hợp PayOS / VietQR. Thanh toán thật chưa được bật trong Preview.';
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
    if (!CHECKOUT_LIVE_ENABLED) return;
    if (!selectedPlanId) return;
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeCheckoutUi, { once: true });
  } else {
    normalizeCheckoutUi();
  }
})();
