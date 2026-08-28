const state = { lang: 'vi', filter: 'all', activeSkill: null, showAll: false, selectedImageUrl: '', viewerImages: [], viewerIndex: 0, viewerScale: 1, selectedPlan: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const t = (path) => path.split('.').reduce((value, key) => value?.[key], window.AIOS_TRANSLATIONS[state.lang]);

function applyTranslations() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((node) => { const value = t(node.dataset.i18n); if (typeof value === 'string') node.textContent = value; });
  renderCategories();
  renderSkills();
  renderSteps();
  renderPricing();
  renderFaq();
}

function renderCategories() {
  const categories = [...new Set(window.AIOS_SKILLS.map(skill => skill.category)), 'all'];
  $('#category-row').innerHTML = categories.map(key => `<button class="category-chip ${state.filter === key ? 'active' : ''}" type="button" data-filter="${key}">${t(`skills.${key}`)}</button>`).join('');
}

function renderSkills() {
  const skills = window.AIOS_SKILLS.filter(skill => state.filter === 'all' ? (state.showAll || skill.featured) : skill.category === state.filter);
  const categoryIcons = { seller:'▣', content:'✦', photo:'◫', work:'✓' };
  $('#skill-grid').innerHTML = skills.map(skill => `<article class="skill-card"><div class="skill-card-top"><span class="skill-icon ${skill.category}">${categoryIcons[skill.category]}</span><span class="skill-type">${t(`skills.${skill.category}`)}</span></div><h3>${state.lang === 'vi' ? skill.titleVi : skill.titleEn}</h3><p>${state.lang === 'vi' ? skill.benefitVi : skill.benefitEn}</p><button class="text-button" data-skill="${skill.id}">${t('skills.open')} <span>→</span></button></article>`).join('');
  $('#show-all-skills').hidden = state.showAll;
}

function renderSteps() { $('#steps').innerHTML = t('how.steps').map(step => `<article><span>${step[0]}</span><h3>${step[1]}</h3><p>${step[2]}</p></article>`).join(''); }
function renderPricing() {
  const plans = Array.isArray(window.AIOS_PRICING) ? window.AIOS_PRICING.filter(plan => plan.enabled) : [];
  $('#pricing-grid').innerHTML = plans.map(plan => { const items = state.lang === 'vi' ? plan.benefitsVi : plan.benefitsEn; const message = state.lang === 'vi' ? plan.messageVi : plan.messageEn; return `<article class="price-card ${plan.recommended ? 'recommended' : ''}">${plan.recommended ? `<span class="recommend-badge">${t('pricing.recommended')}</span>` : ''}<h3>${plan.name}</h3><div class="price"><b>${plan.price}</b>${plan.billingPeriod ? `<span>${t('pricing.month')}</span>` : ''}</div><p>${message}</p><hr><small>${t('pricing.includes')}</small><ul>${items.map(item => `<li>✓ <span>${item}</span></li>`).join('')}</ul><button class="button ${plan.recommended ? '' : 'button-outline'}" type="button" data-plan="${plan.id}">${plan.id === 'free' ? t('common.tryFree') : t('common.choose')}</button></article>`; }).join('');
}
function renderFaq() {
  const items = t('faq.items') || [];
  $('#faq-list').innerHTML = items.map((item, i) => `<details ${i === 0 ? 'open' : ''}><summary>${item[0]}<span aria-hidden="true">${i === 0 ? '−' : '+'}</span></summary><p>${item[1]}</p></details>`).join('');
  $$('#faq-list details').forEach(details => details.addEventListener('toggle', () => { $('summary span', details).textContent = details.open ? '−' : '+'; }));
}

function openSkill(id) {
  const skill = window.AIOS_SKILLS.find(item => item.id === id); if (!skill) return;
  state.activeSkill = skill; $('#modal-category').textContent = t(`skills.${skill.category}`); $('#modal-title').textContent = state.lang === 'vi' ? skill.titleVi : skill.titleEn; $('#modal-benefit').textContent = state.lang === 'vi' ? skill.benefitVi : skill.benefitEn;
  const imageFields = `<div class="upload-control"><label class="upload-box" id="upload-drop"><input id="image-input" name="image" type="file" accept="image/png,image/jpeg,image/webp" ${skill.product || skill.id === 'world-checkin' ? 'required' : ''}><span class="upload-icon">↑</span><b>${t('launcher.upload')}</b><small>${t('launcher.uploadHint')}</small></label><div class="upload-preview" id="upload-preview" hidden><img id="upload-thumbnail" alt="Ảnh đã chọn"><div><b id="upload-filename"></b><small id="upload-filesize"></small><span><button type="button" data-image-action="replace">Thay ảnh</button><button type="button" data-image-action="remove">Xóa</button></span></div></div><p class="field-error" id="upload-error" role="alert"></p></div><label>${t('launcher.preset')}<select name="preset"><option>${state.lang === 'vi' ? 'Tự nhiên' : 'Natural'}</option><option>${state.lang === 'vi' ? 'Chuyên nghiệp' : 'Professional'}</option><option>${state.lang === 'vi' ? 'Điện ảnh' : 'Cinematic'}</option><option>${state.lang === 'vi' ? 'Theo yêu cầu' : 'Custom'}</option></select></label><label>${t('launcher.extra')}<textarea name="instruction" placeholder="${t('launcher.extraPlaceholder')}"></textarea></label>`;
  const textFields = `<label>${t('launcher.mainInput')}<textarea required placeholder="${t('launcher.mainPlaceholder')}"></textarea></label><label>${t('launcher.context')}<input type="text" placeholder="${t('launcher.contextPlaceholder')}"></label>`;
  const productFields = `<div class="field-row"><label>${t('launcher.variations')}<select name="variations"><option>1</option><option>3</option><option>5</option><option>8</option></select></label><label>${t('launcher.scene')}<select name="scene"><option>Studio</option><option>Lifestyle</option><option>Quảng cáo</option><option>Cận cảnh</option><option>Theo yêu cầu</option></select></label></div><div class="field-row"><label>${t('launcher.angle')}<select name="angle"><option>Góc 45°</option><option>Chính diện</option><option>Từ trên xuống</option><option>Cận cảnh</option><option>Theo yêu cầu</option></select></label><label>${t('launcher.use')}<input name="intendedUse" placeholder="${t('launcher.usePlaceholder')}"></label></div>`;
  const worldCheckinFields = `<label>${t('launcher.destination')}<input name="destination" required placeholder="${t('launcher.destinationPlaceholder')}"></label>`;
  $('#skill-fields').innerHTML = skill.type === 'image' ? imageFields + (skill.product ? productFields : skill.id === 'world-checkin' ? worldCheckinFields : '') : textFields;
  clearSelectedImage();
  $('#result-box').className = 'result-box'; $('#result-box').innerHTML = `<span class="result-icon">◎</span><b>${t('launcher.resultTitle')}</b><p>${t('launcher.resultText')}</p>`;
  $('#skill-modal').classList.add('open'); $('#skill-modal').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); $('.modal-close').focus();
}

function closeModal() { $('#skill-modal').classList.remove('open'); $('#skill-modal').setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }
function renderProductImages(box, images, altKey = 'launcher.generatedAlt') {
  state.viewerImages = images.map(item => item.url); box.className = 'result-box success image-results'; box.replaceChildren(); const grid = document.createElement('div'); grid.className = 'generated-grid';
  images.forEach((item, index) => { const figure = document.createElement('figure'); const button = document.createElement('button'); button.type = 'button'; button.dataset.viewerIndex = index; const image = document.createElement('img'); image.src = item.url; image.alt = `${t(altKey)} ${index + 1}`; image.loading = 'lazy'; button.append(image); figure.append(button); grid.append(figure); });
  box.append(grid); $('[data-regenerate]').hidden = false;
}

function clearSelectedImage() { if (state.selectedImageUrl) URL.revokeObjectURL(state.selectedImageUrl); state.selectedImageUrl = ''; const input = $('#image-input'); if (input) input.value = ''; const preview = $('#upload-preview'); if (preview) preview.hidden = true; const drop = $('#upload-drop'); if (drop) drop.hidden = false; const error = $('#upload-error'); if (error) error.textContent = ''; }
function selectImage(file) { const allowed = ['image/jpeg','image/png','image/webp']; if (!file || !allowed.includes(file.type)) { clearSelectedImage(); $('#upload-error').textContent = state.lang === 'vi' ? 'Chỉ hỗ trợ JPG, PNG hoặc WEBP.' : 'Use a JPG, PNG, or WEBP image.'; return; } state.selectedImageUrl = URL.createObjectURL(file); $('#upload-thumbnail').src = state.selectedImageUrl; $('#upload-filename').textContent = file.name; $('#upload-filesize').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`; $('#upload-preview').hidden = false; $('#upload-drop').hidden = true; }
function openViewer(index = 0) { state.viewerIndex = Math.max(0, Math.min(index, state.viewerImages.length - 1)); state.viewerScale = 1; updateViewer(); $('#image-viewer').classList.add('open'); $('#image-viewer').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
function updateViewer() { const src = state.viewerImages[state.viewerIndex]; if (!src) return; $('#viewer-image').src = src; $('#viewer-image').style.transform = `scale(${state.viewerScale})`; $('#viewer-download').href = src; $('#viewer-count').textContent = `${state.viewerIndex + 1} / ${state.viewerImages.length}`; }
function viewerAction(action) { if (action === 'close') { $('#image-viewer').classList.remove('open'); $('#image-viewer').setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); return; } if (action === 'next') state.viewerIndex = (state.viewerIndex + 1) % state.viewerImages.length; if (action === 'prev') state.viewerIndex = (state.viewerIndex - 1 + state.viewerImages.length) % state.viewerImages.length; if (action === 'zoom-in') state.viewerScale = Math.min(4, state.viewerScale + .25); if (action === 'zoom-out') state.viewerScale = Math.max(.5, state.viewerScale - .25); if (action === 'reset') state.viewerScale = 1; updateViewer(); }
function openShell(id) { $$('.shell-overlay.open').forEach(shell => shell.classList.remove('open')); const shell = $(`#${id}`); shell.classList.add('open'); shell.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
function closeShells() { $$('.shell-overlay.open').forEach(shell => { shell.classList.remove('open'); shell.setAttribute('aria-hidden','true'); }); document.body.classList.remove('modal-open'); }
function openAuth(mode) { const copy = { login:['Đăng nhập','Tiếp tục vào không gian làm việc AIOS Lab.'], signup:['Tạo tài khoản','Bắt đầu với AIOS Lab.'], forgot:['Khôi phục mật khẩu','Nhập email để nhận hướng dẫn đặt lại mật khẩu.'], verify:['Xác minh email','Kiểm tra hộp thư và xác minh địa chỉ email của bạn.'] }; const value = copy[mode] || copy.login; $('#auth-title').textContent = value[0]; $('#auth-copy').textContent = value[1]; $('#password-field').hidden = ['forgot','verify'].includes(mode); openShell('auth-shell'); }
function openCheckout(planId) { const plan = window.AIOS_PRICING.find(item => item.id === planId); if (!plan) return; state.selectedPlan = plan; $('#checkout-plan').innerHTML = `<b>${plan.name}</b><strong>${plan.price}${plan.billingPeriod ? ` ${t('pricing.month')}` : ''}</strong>`; openShell('checkout-shell'); }
const shellContent = { help:['Trợ giúp','Khám phá công cụ, quản lý yêu cầu hoặc liên hệ đội ngũ AIOS Lab.'], contact:['Liên hệ','Email: support@aioslab.vn'], terms:['Điều khoản','Các điều khoản sử dụng dịch vụ AIOS Lab.'], privacy:['Quyền riêng tư','Thông tin về cách AIOS Lab bảo vệ dữ liệu và quyền riêng tư.'], payment:['Thanh toán','Thông tin về phương thức và trạng thái thanh toán.'], refund:['Hoàn tiền','Chính sách và điều kiện yêu cầu hoàn tiền.'], cancellation:['Hủy / Gia hạn','Quản lý chu kỳ và lựa chọn gia hạn dịch vụ.'], policy:['Chính sách sử dụng AI','Nguyên tắc sử dụng công cụ AI an toàn và có trách nhiệm.'] };
document.addEventListener('click', event => {
  const showAll = event.target.closest('#show-all-skills'); if (showAll) { state.filter = 'all'; state.showAll = true; renderCategories(); renderSkills(); }
  const filter = event.target.closest('[data-filter]'); if (filter) { state.filter = filter.dataset.filter; state.showAll = true; renderCategories(); renderSkills(); $('#skills').scrollIntoView({behavior:'smooth'}); }
  const skill = event.target.closest('[data-skill]'); if (skill) openSkill(skill.dataset.skill);
  const plan = event.target.closest('[data-plan]'); if (plan) openCheckout(plan.dataset.plan);
  const auth = event.target.closest('[data-auth]'); if (auth) openAuth(auth.dataset.auth);
  if (event.target.closest('[data-open-workspace]')) { $('#workspace-content').innerHTML = '<div class="workspace-empty"><span>✦</span><b>AIOS Workspace</b><p>Chọn một mục để bắt đầu.</p></div>'; openShell('workspace-shell'); }
  const shell = event.target.closest('[data-shell]'); if (shell) { const content = shellContent[shell.dataset.shell]; if (content) { $('#content-shell-title').textContent = content[0]; $('#content-shell-body').innerHTML = `<p>${content[1]}</p>`; openShell('content-shell'); } }
  const workspace = event.target.closest('[data-workspace]'); if (workspace) { $$('#workspace-nav button').forEach(button => button.classList.toggle('active', button === workspace)); $('#workspace-title').textContent = workspace.textContent.replace(/^[^A-Za-zÀ-ỹ]+/, ''); $('#workspace-content').innerHTML = `<div class="workspace-empty"><span>✦</span><b>${workspace.textContent}</b><p>Không gian quản lý tập trung của AIOS Lab.</p></div>`; }
  const imageAction = event.target.closest('[data-image-action]'); if (imageAction?.dataset.imageAction === 'replace') $('#image-input')?.click(); if (imageAction?.dataset.imageAction === 'remove') clearSelectedImage();
  const viewerImage = event.target.closest('[data-viewer-index]'); if (viewerImage) openViewer(Number(viewerImage.dataset.viewerIndex));
  const viewerControl = event.target.closest('[data-viewer]'); if (viewerControl) viewerAction(viewerControl.dataset.viewer);
  if (event.target.closest('[data-regenerate]')) $('#skill-form').requestSubmit();
  if (event.target.closest('[data-close-shell]')) closeShells();
  if (event.target.closest('[data-close-modal]')) closeModal();
});
document.addEventListener('change', event => { if (event.target.matches('#image-input')) selectImage(event.target.files[0]); });
$('#language').addEventListener('change', event => { if (!['vi','en'].includes(event.target.value)) { event.target.value = state.lang; return; } state.lang = event.target.value; applyTranslations(); });
$('.menu-toggle').addEventListener('click', event => { const open = $('.nav-links').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); });
$('#auth-form').addEventListener('submit', event => { event.preventDefault(); openAuth('verify'); });
$('#skill-form').addEventListener('submit', async event => {
  event.preventDefault(); const box = $('#result-box'); $('[data-regenerate]').hidden = true; box.className = 'result-box loading'; box.innerHTML = `<span class="result-icon">◌</span><b>${t('launcher.working')}</b>`;
  if (!['product-photo', 'world-checkin'].includes(state.activeSkill?.id)) return setTimeout(() => { box.className = 'result-box success'; box.innerHTML = `<span class="result-icon">✓</span><b>${t('launcher.ready')}</b><p>${t('launcher.readyText')}</p>`; $('[data-regenerate]').hidden = false; }, 700);
  const formData = new FormData(event.currentTarget); const image = formData.get('image');
  if (!(image instanceof File) || !image.size) { box.className = 'result-box error'; box.innerHTML = `<span class="result-icon">!</span><b>${t(state.activeSkill.id === 'world-checkin' ? 'launcher.referenceRequired' : 'launcher.imageRequired')}</b>`; return; }
  try {
    const endpoint = state.activeSkill.id === 'world-checkin' ? '/api/world-checkin' : '/api/product-photo';
    const response = await fetch(endpoint, { method: 'POST', body: formData }); const payload = await response.json();
    if (!response.ok || !payload.success || !Array.isArray(payload.images) || !payload.images.length) throw new Error('Generation failed');
    renderProductImages(box, payload.images, state.activeSkill.id === 'world-checkin' ? 'launcher.worldGeneratedAlt' : 'launcher.generatedAlt');
  } catch { box.className = 'result-box error'; box.innerHTML = `<span class="result-icon">!</span><b>${t('launcher.generationError')}</b><p>${t('launcher.tryAgain')}</p>`; $('[data-regenerate]').hidden = false; }
});
$('#image-viewer').addEventListener('wheel', event => { event.preventDefault(); state.viewerScale = Math.max(.5, Math.min(4, state.viewerScale + (event.deltaY < 0 ? .15 : -.15))); updateViewer(); }, {passive:false});
document.addEventListener('keydown', event => { if ($('#image-viewer').classList.contains('open')) { if (event.key === 'ArrowRight') viewerAction('next'); if (event.key === 'ArrowLeft') viewerAction('prev'); if (event.key === '+' || event.key === '=') viewerAction('zoom-in'); if (event.key === '-') viewerAction('zoom-out'); if (event.key === 'Escape') viewerAction('close'); return; } if (event.key === 'Escape') { closeModal(); closeShells(); } });
applyTranslations();
