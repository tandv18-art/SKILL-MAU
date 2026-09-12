(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function planName(planId) {
    const plan = window.AIOS_PRICING?.find?.(item => item.id === planId);
    return plan?.name || String(planId || 'Free');
  }

  function formatValue(value) {
    return value == null ? '—' : String(Math.max(0, Number(value) || 0));
  }

  async function fetchEntitlements() {
    const response = await fetch('/api/account-entitlements', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Không thể tải hạn mức tài khoản.');
    return payload;
  }

  function statCard(label, value) {
    const card = document.createElement('div');
    card.className = 'workspace-stat';
    const small = document.createElement('small');
    small.textContent = label;
    const strong = document.createElement('b');
    strong.textContent = value;
    card.append(small, strong);
    return card;
  }

  async function renderQuotaUsage() {
    const active = $('#workspace-nav button.active')?.dataset.workspace;
    const root = $('#workspace-content');
    if (active !== 'usage' || !root) return;

    try {
      const payload = await fetchEntitlements();
      if ($('#workspace-nav button.active')?.dataset.workspace !== 'usage') return;

      const limits = payload.limits || {};
      const usage = payload.usage || {};
      const remaining = payload.remaining || {};
      const freeLifetimeImages = limits.imageLifetime != null;
      const textLimit = limits.textMonthly;
      const imageLimit = freeLifetimeImages ? limits.imageLifetime : limits.imageMonthly;
      const textUsed = usage.textMonthly || 0;
      const imageUsed = freeLifetimeImages ? (usage.imageLifetime || 0) : (usage.imageMonthly || 0);
      const textRemaining = remaining.textMonthly;
      const imageRemaining = freeLifetimeImages ? remaining.imageLifetime : remaining.imageMonthly;

      root.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'workspace-data';

      const heading = document.createElement('div');
      heading.className = 'workspace-row';
      const badge = document.createElement('span');
      badge.className = 'workspace-badge';
      badge.textContent = planName(payload.planId).toUpperCase();
      const title = document.createElement('b');
      title.textContent = `Hạn mức gói ${planName(payload.planId)}`;
      const period = document.createElement('div');
      period.className = 'workspace-note';
      period.textContent = freeLifetimeImages
        ? 'Text được tính theo kỳ hiện tại; 3 ảnh Free là tổng lượt thử trọn đời.'
        : 'Hạn mức được tính theo kỳ dịch vụ hiện tại.';
      heading.append(badge, title, period);
      wrap.append(heading);

      const stats = document.createElement('div');
      stats.className = 'workspace-stat-grid';
      stats.append(
        statCard('Text đã dùng', `${formatValue(textUsed)} / ${formatValue(textLimit)}`),
        statCard('Text còn lại', formatValue(textRemaining)),
        statCard('Ảnh đã dùng', `${formatValue(imageUsed)} / ${formatValue(imageLimit)}`),
        statCard('Ảnh còn lại', formatValue(imageRemaining))
      );
      wrap.append(stats);

      const note = document.createElement('div');
      note.className = 'workspace-row workspace-note';
      note.textContent = 'Mỗi lần tạo nội dung hoặc hình ảnh thành công được tính là 1 lượt. Lượt lỗi hoặc request bị chặn hạn mức không bị tính.';
      wrap.append(note);

      root.append(wrap);
    } catch (error) {
      if ($('#workspace-nav button.active')?.dataset.workspace !== 'usage') return;
      root.innerHTML = `<div class="workspace-empty"><span>!</span><b>Không tải được hạn mức</b><p>${String(error.message || 'Vui lòng thử lại.')}</p></div>`;
    }
  }

  function scheduleRender() {
    window.setTimeout(renderQuotaUsage, 120);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-workspace="usage"]')) scheduleRender();
  }, true);

  const start = () => {
    const nav = $('#workspace-nav');
    if (!nav) return;
    new MutationObserver(() => {
      if ($('#workspace-nav button.active')?.dataset.workspace === 'usage') scheduleRender();
    }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
