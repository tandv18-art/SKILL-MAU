(() => {
  const state = { slides: [], pendingDeletes: new Set(), dirty: false, saving: false };
  const $ = selector => document.querySelector(selector);

  function message(text, tone = 'info') {
    const node = $('#admin-message');
    node.textContent = text || '';
    node.style.color = tone === 'error' ? '#ffadad' : tone === 'ok' ? '#dff36a' : '#b6c4bd';
  }

  function markDirty(value = true) {
    state.dirty = value;
    $('#save-state').textContent = value ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ';
  }

  function safe(value) { return String(value || '').replace(/[<>]/g, '').slice(0, 80); }

  function render() {
    $('#hero-count').textContent = `${state.slides.length} / 8 ảnh`;
    const list = $('#slides-list');
    list.replaceChildren();

    state.slides.forEach((slide, index) => {
      const card = document.createElement('article');
      card.className = 'slide-card';
      card.dataset.index = String(index);

      const preview = document.createElement('div');
      preview.className = 'slide-preview';
      const img = document.createElement('img');
      img.src = slide.src;
      img.alt = slide.title || `Ảnh ${index + 1}`;
      img.style.objectPosition = slide.position === 'left' ? '25% center' : slide.position === 'right' ? '75% center' : 'center';
      const badge = document.createElement('span');
      badge.className = 'slide-index';
      badge.textContent = `#${index + 1}`;
      preview.append(img, badge);

      const fields = document.createElement('div');
      fields.className = 'slide-fields';
      fields.innerHTML = `<label>Tiêu đề nhỏ (không bắt buộc)<input type="text" maxlength="80" data-field="title" value="${safe(slide.title).replace(/"/g, '&quot;')}"></label><label>Vị trí ảnh<select data-field="position"><option value="left">Ưu tiên trái</option><option value="center">Căn giữa</option><option value="right">Ưu tiên phải</option></select></label><div class="slide-actions"><button type="button" data-action="up">↑ Lên</button><button type="button" data-action="down">↓ Xuống</button><button type="button" class="danger" data-action="remove">Xóa</button><label class="toggle"><input type="checkbox" data-field="enabled" ${slide.enabled !== false ? 'checked' : ''}> Hiển thị</label></div>`;
      fields.querySelector('[data-field="position"]').value = slide.position || 'center';
      card.append(preview, fields);
      list.append(card);
    });
  }

  async function load() {
    message('Đang kiểm tra quyền quản trị…');
    try {
      const response = await fetch('/api/hero-slides?admin=1', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {
        message('Bạn cần đăng nhập tài khoản chủ website trước. Quay về trang chủ và đăng nhập.', 'error');
        $('#save-hero').disabled = true;
        return;
      }
      if (!response.ok) {
        message(payload?.error || 'Tài khoản này không có quyền quản trị.', 'error');
        $('#save-hero').disabled = true;
        return;
      }
      state.slides = Array.isArray(payload?.slides) ? payload.slides.slice(0, 8) : [];
      render();
      markDirty(false);
      message('Sẵn sàng. Thay ảnh theo ý bạn rồi bấm Lưu thay đổi.', 'ok');
    } catch {
      message('Không thể tải cấu hình slider lúc này.', 'error');
    }
  }

  async function normalizeImage(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WEBP.');
    if (file.size > 14 * 1024 * 1024) throw new Error('Ảnh gốc quá lớn. Vui lòng chọn ảnh dưới 14 MB.');
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1800;
    const maxHeight = 1150;
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
    if (!blob) throw new Error('Không thể xử lý ảnh này.');
    return blob;
  }

  async function uploadOne(file) {
    const blob = await normalizeImage(file);
    const response = await fetch('/api/hero-upload', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Không thể tải ảnh lên.');
    return { id: `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, src: payload.url, title: '', enabled: true, position: 'center' };
  }

  async function handleFiles(files) {
    const remaining = 8 - state.slides.length;
    if (remaining <= 0) return message('Slider đã đủ 8 ảnh.', 'error');
    const selected = [...files].slice(0, remaining);
    $('#hero-upload').disabled = true;
    try {
      for (let i = 0; i < selected.length; i += 1) {
        message(`Đang tải ảnh ${i + 1}/${selected.length}…`);
        state.slides.push(await uploadOne(selected[i]));
        render();
      }
      markDirty(true);
      message('Ảnh đã tải lên. Bấm Lưu thay đổi để áp dụng lên trang chủ.', 'ok');
    } catch (error) {
      message(error.message || 'Không thể tải ảnh.', 'error');
    } finally {
      $('#hero-upload').disabled = false;
      $('#hero-upload').value = '';
    }
  }

  async function save() {
    if (state.saving) return;
    if (!state.slides.length || !state.slides.some(item => item.enabled !== false)) return message('Cần ít nhất một ảnh đang bật.', 'error');
    state.saving = true;
    $('#save-hero').disabled = true;
    message('Đang lưu…');
    try {
      const response = await fetch('/api/hero-slides', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slides: state.slides }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Không thể lưu cấu hình.');
      state.slides = payload.slides || state.slides;
      const deletes = [...state.pendingDeletes];
      state.pendingDeletes.clear();
      for (const url of deletes) {
        fetch('/api/hero-delete', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) }).catch(() => {});
      }
      render();
      markDirty(false);
      message('Đã lưu. Trang chủ sẽ dùng bộ ảnh mới ngay khi tải lại.', 'ok');
    } catch (error) {
      message(error.message || 'Không thể lưu.', 'error');
    } finally {
      state.saving = false;
      $('#save-hero').disabled = false;
    }
  }

  $('#hero-upload').addEventListener('change', event => handleFiles(event.target.files));
  $('#save-hero').addEventListener('click', save);
  $('#slides-list').addEventListener('input', event => {
    const card = event.target.closest('.slide-card');
    if (!card) return;
    const index = Number(card.dataset.index);
    const field = event.target.dataset.field;
    if (field === 'title') state.slides[index].title = safe(event.target.value);
    if (field === 'position') state.slides[index].position = event.target.value;
    if (field === 'enabled') state.slides[index].enabled = event.target.checked;
    markDirty(true);
    if (field === 'position') render();
  });
  $('#slides-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('.slide-card');
    if (!button || !card) return;
    const index = Number(card.dataset.index);
    const action = button.dataset.action;
    if (action === 'up' && index > 0) [state.slides[index - 1], state.slides[index]] = [state.slides[index], state.slides[index - 1]];
    if (action === 'down' && index < state.slides.length - 1) [state.slides[index + 1], state.slides[index]] = [state.slides[index], state.slides[index + 1]];
    if (action === 'remove') {
      const removed = state.slides.splice(index, 1)[0];
      if (removed?.src && removed.src !== '/assets/hero-world-checkin.svg') state.pendingDeletes.add(removed.src);
    }
    markDirty(true);
    render();
  });
  window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  load();
})();
