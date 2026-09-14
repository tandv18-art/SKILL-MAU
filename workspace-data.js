(() => {
  const DATA_API_URL = 'https://ep-rough-fire-auhjgose.apirest.c-10.us-east-1.aws.neon.tech/toilaai_main/rest/v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let activeSkillId = null;
  let wasSuccess = false;
  let recording = false;

  function isJwt(value) {
    return typeof value === 'string' && value.split('.').length === 3 && value.length > 80;
  }

  async function getToken() {
    const response = await fetch('/api/auth?path=get-session', { credentials: 'same-origin', cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.user) throw new Error('Vui lòng đăng nhập.');
    const headerToken = response.headers.get('set-auth-jwt');
    const embeddedToken = payload?.session?.token;
    const token = isJwt(headerToken) ? headerToken : isJwt(embeddedToken) ? embeddedToken : null;
    if (!token) throw new Error('Không thể xác thực dữ liệu tài khoản.');
    return token;
  }

  async function api(path, options = {}) {
    const token = await getToken();
    const headers = { accept: 'application/json', authorization: `Bearer ${token}` };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.prefer) headers.prefer = options.prefer;
    const response = await fetch(`${DATA_API_URL}/${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    const payload = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
    if (!response.ok) throw new Error(payload?.message || 'Không thể tải dữ liệu tài khoản.');
    return payload;
  }

  function ensureStyles() {
    if ($('#workspace-data-styles')) return;
    const style = document.createElement('style');
    style.id = 'workspace-data-styles';
    style.textContent = `
      .workspace-data{display:grid;gap:14px;width:100%;align-self:start}
      .workspace-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .workspace-stat,.workspace-row{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.025);border-radius:16px;padding:16px}
      .workspace-stat b{display:block;font-size:26px;margin-top:6px}.workspace-stat small,.workspace-row small{color:#8f9d96}
      .workspace-row{display:grid;gap:8px}.workspace-row-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .workspace-row pre{white-space:pre-wrap;max-height:220px;overflow:auto;margin:0;color:#dbe5df;font:500 13px/1.55 Manrope,sans-serif}
      .workspace-thumbs{display:flex;gap:8px;overflow:auto}.workspace-thumb-button{display:block;padding:0;border:0;background:transparent;border-radius:10px;line-height:0;cursor:zoom-in}.workspace-thumb-button:focus-visible{outline:2px solid #d3ff4a;outline-offset:3px}.workspace-thumbs img{width:96px;height:72px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:zoom-in}
      .workspace-badge{display:inline-flex;width:max-content;border:1px solid rgba(211,255,74,.35);color:#d3ff4a;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:700}
      .workspace-note{color:#9ca9a2;font-size:13px;line-height:1.6}.workspace-actions{display:flex;gap:10px;flex-wrap:wrap}
      @media(max-width:760px){.workspace-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.workspace-row-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.append(style);
  }

  function box() {
    return $('#workspace-content');
  }

  function loading(label = 'Đang tải dữ liệu…') {
    const root = box();
    if (!root) return;
    root.innerHTML = `<div class="workspace-empty"><span>◌</span><b>${label}</b></div>`;
  }

  function empty(title, copy) {
    const root = box();
    if (!root) return;
    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'workspace-empty';
    const icon = document.createElement('span'); icon.textContent = '✦';
    const strong = document.createElement('b'); strong.textContent = title;
    const p = document.createElement('p'); p.textContent = copy;
    card.append(icon, strong, p);
    root.append(card);
  }

  function skillName(skillId) {
    const skill = window.AIOS_SKILLS?.find?.(item => item.id === skillId);
    return skill?.titleVi || skillId;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  function normalizeImageRef(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('/api/media?')) return raw;
    try {
      const parsed = new URL(raw, window.location.origin);
      if (parsed.pathname === '/api/media') return `${parsed.pathname}${parsed.search}`;
      if (parsed.protocol === 'https:') return parsed.toString();
    } catch {}
    return null;
  }

  async function renderCreations() {
    loading();
    try {
      const query = new URLSearchParams({ select: 'id,skill_id,kind,title,output_text,image_urls,metadata,created_at', order: 'created_at.desc', limit: '50' });
      const rows = await api(`workspace_creations?${query}`);
      if (!Array.isArray(rows) || !rows.length) return empty('Chưa có sản phẩm đã lưu', 'Kết quả mới tạo khi bạn đang đăng nhập sẽ xuất hiện tại đây.');
      const root = box(); root.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'workspace-data';
      rows.forEach(row => {
        const card = document.createElement('article'); card.className = 'workspace-row';
        const head = document.createElement('div'); head.className = 'workspace-row-head';
        const title = document.createElement('b'); title.textContent = row.title || skillName(row.skill_id);
        const date = document.createElement('small'); date.textContent = formatDate(row.created_at);
        head.append(title, date); card.append(head);
        const badge = document.createElement('span'); badge.className = 'workspace-badge'; badge.textContent = row.kind === 'image' ? 'HÌNH ẢNH' : 'NỘI DUNG'; card.append(badge);
        if (row.kind === 'text' && row.output_text) {
          const pre = document.createElement('pre'); pre.textContent = row.output_text; card.append(pre);
        } else if (row.kind === 'image') {
          const urls = Array.isArray(row.image_urls) ? row.image_urls.map(normalizeImageRef).filter(Boolean) : [];
          if (urls.length) {
            const thumbs = document.createElement('div'); thumbs.className = 'workspace-thumbs';
            urls.forEach((url, index) => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'workspace-thumb-button';
              button.setAttribute('aria-label', `Xem ảnh ${index + 1}`);
              button.title = 'Bấm để xem ảnh';
              const img = document.createElement('img');
              img.src = url;
              img.alt = row.title || 'Ảnh đã tạo';
              img.loading = 'lazy';
              button.append(img);
              button.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
              thumbs.append(button);
            });
            card.append(thumbs);
          } else {
            const note = document.createElement('div'); note.className = 'workspace-note'; note.textContent = `Đã ghi nhận ${Number(row.metadata?.imageCount) || 1} ảnh. Tệp ảnh chưa được lưu dài hạn.`; card.append(note);
          }
        }
        wrap.append(card);
      });
      root.append(wrap);
    } catch (error) {
      empty('Không tải được lịch sử', error.message);
    }
  }

  async function renderUsage() {
    loading();
    try {
      const query = new URLSearchParams({ select: 'skill_id,kind,units,created_at', order: 'created_at.desc', limit: '1000' });
      const rows = await api(`workspace_usage?${query}`);
      const items = Array.isArray(rows) ? rows : [];
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const totals = items.reduce((acc, row) => {
        const units = Math.max(0, Number(row.units) || 0); acc.total += units; if (row.kind === 'text') acc.text += units; if (row.kind === 'image') acc.image += units; if (new Date(row.created_at) >= monthStart) acc.month += units; return acc;
      }, { total: 0, text: 0, image: 0, month: 0 });
      const root = box(); root.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'workspace-data';
      const stats = document.createElement('div'); stats.className = 'workspace-stat-grid';
      [['Tổng lượt',totals.total],['Tháng này',totals.month],['Nội dung',totals.text],['Hình ảnh',totals.image]].forEach(([label,value]) => { const card=document.createElement('div'); card.className='workspace-stat'; const small=document.createElement('small'); small.textContent=label; const strong=document.createElement('b'); strong.textContent=String(value); card.append(small,strong); stats.append(card); });
      wrap.append(stats);
      const note = document.createElement('div'); note.className = 'workspace-row workspace-note'; note.textContent = 'Số lượt được ghi nhận ở máy chủ sau khi công cụ tạo kết quả thành công. Hạn mức theo gói chỉ được chặn khi hệ thống quota được bật chính thức.'; wrap.append(note);
      root.append(wrap);
    } catch (error) {
      empty('Không tải được mức sử dụng', error.message);
    }
  }

  async function getBillingRow() {
    const query = new URLSearchParams({ select: 'plan_id,status,created_at,updated_at', limit: '1' });
    let rows = await api(`workspace_accounts?${query}`);
    if (Array.isArray(rows) && rows.length) return rows[0];
    rows = await api('workspace_accounts', { method: 'POST', body: { plan_id: 'free', status: 'active' }, prefer: 'return=representation' });
    return Array.isArray(rows) ? rows[0] || { plan_id: 'free', status: 'active' } : { plan_id: 'free', status: 'active' };
  }

  async function renderBilling() {
    loading();
    try {
      const account = await getBillingRow();
      const root = box(); root.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'workspace-data';
      const card = document.createElement('div'); card.className = 'workspace-row';
      const badge = document.createElement('span'); badge.className = 'workspace-badge'; badge.textContent = String(account.plan_id || 'free').toUpperCase();
      const title = document.createElement('b'); title.textContent = `Gói hiện tại: ${account.plan_id === 'free' ? 'Free' : account.plan_id}`;
      const status = document.createElement('div'); status.className = 'workspace-note'; status.textContent = account.status === 'active' ? 'Trạng thái: đang hoạt động.' : `Trạng thái: ${account.status || 'chưa xác định'}.`;
      const copy = document.createElement('div'); copy.className = 'workspace-note'; copy.textContent = 'Thanh toán tự động chưa được bật. Hệ thống sẽ chỉ kích hoạt phương thức thanh toán sau khi kết nối provider thật; không có nút thanh toán giả.';
      const actions = document.createElement('div'); actions.className = 'workspace-actions';
      const viewPlans = document.createElement('button'); viewPlans.type = 'button'; viewPlans.className = 'button button-outline'; viewPlans.textContent = 'Xem gói dịch vụ';
      viewPlans.addEventListener('click', () => { window.closeShells?.(); document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' }); });
      actions.append(viewPlans); card.append(badge,title,status,copy,actions); wrap.append(card); root.append(wrap);
    } catch (error) {
      empty('Không tải được thông tin gói', error.message);
    }
  }

  async function recordResult() {
    if (recording || !window.toilaaiAuth?.getSession?.()?.user || !activeSkillId) return;
    const result = $('#result-box');
    if (!result?.classList.contains('success')) return;
    const kind = result.classList.contains('image-results') ? 'image' : result.classList.contains('text-results') ? 'text' : null;
    if (!kind) return;
    const skill = window.AIOS_SKILLS?.find?.(item => item.id === activeSkillId);
    const title = skill?.titleVi || activeSkillId;
    const body = { skill_id: activeSkillId, kind, title, metadata: {} };
    if (kind === 'text') body.output_text = $('pre.text-result', result)?.textContent || '';
    if (kind === 'image') {
      const allImages = $$('img[src]', result);
      body.image_urls = allImages.map(img => normalizeImageRef(img.getAttribute('src') || img.src)).filter(Boolean).slice(0,8);
      body.metadata = { imageCount: allImages.length, persistedImageCount: body.image_urls.length };
    }
    recording = true;
    try {
      await api('workspace_creations', { method: 'POST', body, prefer: 'return=minimal' });
    } catch (error) {
      console.warn('Không thể lưu lịch sử tài khoản:', error.message);
    } finally {
      recording = false;
    }
  }

  function observeResults() {
    const result = $('#result-box');
    if (!result) return;
    const update = () => {
      const success = result.classList.contains('success');
      if (success && !wasSuccess) setTimeout(recordResult, 0);
      wasSuccess = success;
    };
    new MutationObserver(update).observe(result, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });
    update();
  }

  function renderActiveWorkspaceData() {
    const section = $('#workspace-nav button.active')?.dataset.workspace;
    if (section === 'creations') renderCreations();
    if (section === 'usage') renderUsage();
    if (section === 'billing') renderBilling();
  }

  function observeWorkspaceNavigation() {
    const nav = $('#workspace-nav');
    if (!nav) return;
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        renderActiveWorkspaceData();
      });
    }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  document.addEventListener('click', event => {
    const skill = event.target.closest('[data-skill]');
    if (skill?.dataset.skill) activeSkillId = skill.dataset.skill;
  }, true);

  ensureStyles();
  observeResults();
  observeWorkspaceNavigation();
  window.toilaaiWorkspace = { renderCreations, renderUsage, renderBilling };
})();
