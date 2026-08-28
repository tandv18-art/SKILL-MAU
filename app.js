const state = { lang: 'vi', filter: 'all', activeSkill: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const t = (path) => path.split('.').reduce((value, key) => value?.[key], window.AIOS_TRANSLATIONS[state.lang]);

function applyTranslations() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((node) => { const value = t(node.dataset.i18n); if (typeof value === 'string') node.textContent = value; });
  renderPaths(); renderFilters(); renderSkills(); renderSteps(); renderPricing(); renderFaq();
}

function renderPaths() {
  const icons = { seller:'▣', content:'✦', photo:'◫', all:'✓' };
  $('#path-grid').innerHTML = ['seller','content','photo','all'].map(key => `<button class="path-card" data-path="${key}"><span class="path-icon">${icons[key]}</span><span><b>${t(`paths.${key}`)}</b><small>${t(`paths.${key}Text`)}</small></span><i>→</i></button>`).join('');
}

function renderFilters() {
  $('#filters').innerHTML = ['all','seller','content','photo','work'].map(key => `<button class="filter ${state.filter === key ? 'active' : ''}" data-filter="${key}">${t(`skills.${key}`)}</button>`).join('');
}

function renderSkills() {
  const skills = window.AIOS_SKILLS.filter(skill => (state.filter === 'all' ? true : skill.category === state.filter));
  const categoryIcons = { seller:'▣', content:'✦', photo:'◫', work:'✓' };
  $('#skill-grid').innerHTML = skills.map(skill => `<article class="skill-card"><div class="skill-card-top"><span class="skill-icon ${skill.category}">${categoryIcons[skill.category]}</span><span class="skill-type">${t(`skills.${skill.category}`)}</span></div><h3>${state.lang === 'vi' ? skill.titleVi : skill.titleEn}</h3><p>${state.lang === 'vi' ? skill.benefitVi : skill.benefitEn}</p><button class="text-button" data-skill="${skill.id}">${t('skills.open')} <span>→</span></button></article>`).join('');
}

function renderSteps() { $('#steps').innerHTML = t('how.steps').map(step => `<article><span>${step[0]}</span><h3>${step[1]}</h3><p>${step[2]}</p></article>`).join(''); }
function renderPricing() { $('#pricing-grid').innerHTML = t('pricing.plans').map(plan => `<article class="price-card ${plan.recommended ? 'recommended' : ''}">${plan.recommended ? `<span class="recommend-badge">${t('pricing.recommended')}</span>` : ''}<h3>${plan.name}</h3><div class="price"><b>${plan.price}</b>${plan.price !== '0đ' && plan.price !== '0₫' ? `<span>${t('pricing.month')}</span>` : ''}</div><p>${plan.message}</p><hr><small>${t('pricing.includes')}</small><ul>${plan.items.map(item => `<li>✓ <span>${item}</span></li>`).join('')}</ul><a class="button ${plan.recommended ? '' : 'button-outline'}" href="#trial">${plan.name === 'Free' ? t('common.tryFree') : t('common.choose')}</a></article>`).join(''); }
function renderFaq() { $('#faq-list').innerHTML = t('faq.items').map((item, i) => `<details ${i === 0 ? 'open' : ''}><summary>${item[0]}<span>+</span></summary><p>${item[1]}</p></details>`).join(''); }

function openSkill(id) {
  const skill = window.AIOS_SKILLS.find(item => item.id === id); if (!skill) return;
  state.activeSkill = skill; $('#modal-category').textContent = t(`skills.${skill.category}`); $('#modal-title').textContent = state.lang === 'vi' ? skill.titleVi : skill.titleEn; $('#modal-benefit').textContent = state.lang === 'vi' ? skill.benefitVi : skill.benefitEn;
  const imageFields = `<label class="upload-box"><input name="image" type="file" accept="image/png,image/jpeg,image/webp" ${skill.product || ['world-checkin', 'premium-portrait-enhancer'].includes(skill.id) ? 'required' : ''}><span class="upload-icon">↑</span><b>${t('launcher.upload')}</b><small>${t('launcher.uploadHint')}</small></label><label>${t('launcher.preset')}<select name="preset"><option>${state.lang === 'vi' ? 'Tự nhiên' : 'Natural'}</option><option>${state.lang === 'vi' ? 'Chuyên nghiệp' : 'Professional'}</option><option>${state.lang === 'vi' ? 'Điện ảnh' : 'Cinematic'}</option><option>${state.lang === 'vi' ? 'Theo yêu cầu' : 'Custom'}</option></select></label><label>${t('launcher.extra')}<textarea name="instruction" placeholder="${t('launcher.extraPlaceholder')}"></textarea></label>`;
  const textFields = `<label>${t('launcher.mainInput')}<textarea required placeholder="${t('launcher.mainPlaceholder')}"></textarea></label><label>${t('launcher.context')}<input type="text" placeholder="${t('launcher.contextPlaceholder')}"></label>`;
  const productFields = `<div class="field-row"><label>${t('launcher.variations')}<select name="variations"><option>1</option><option>3</option><option>5</option><option>8</option></select></label><label>${t('launcher.scene')}<select name="scene"><option>Studio</option><option>Lifestyle</option><option>Quảng cáo</option><option>Cận cảnh</option><option>Theo yêu cầu</option></select></label></div><div class="field-row"><label>${t('launcher.angle')}<select name="angle"><option>Góc 45°</option><option>Chính diện</option><option>Từ trên xuống</option><option>Cận cảnh</option><option>Theo yêu cầu</option></select></label><label>${t('launcher.use')}<input name="intendedUse" placeholder="${t('launcher.usePlaceholder')}"></label></div>`;
  const worldCheckinFields = `<label>${t('launcher.destination')}<input name="destination" required placeholder="${t('launcher.destinationPlaceholder')}"></label>`;
  $('#skill-fields').innerHTML = skill.type === 'image' ? imageFields + (skill.product ? productFields : skill.id === 'world-checkin' ? worldCheckinFields : '') : textFields;
  $('#result-box').className = 'result-box'; $('#result-box').innerHTML = `<span class="result-icon">◎</span><b>${t('launcher.resultTitle')}</b><p>${t('launcher.resultText')}</p>`;
  $('#skill-modal').classList.add('open'); $('#skill-modal').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); $('.modal-close').focus();
}

function closeModal() { $('#skill-modal').classList.remove('open'); $('#skill-modal').setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }
function renderProductImages(box, images, altKey = 'launcher.generatedAlt') {
  box.className = 'result-box success image-results'; box.replaceChildren(); const grid = document.createElement('div'); grid.className = 'generated-grid';
  images.forEach((item, index) => { const figure = document.createElement('figure'); const image = document.createElement('img'); image.src = item.url; image.alt = `${t(altKey)} ${index + 1}`; image.loading = 'lazy'; figure.append(image); grid.append(figure); });
  box.append(grid);
}
document.addEventListener('click', event => {
  const filter = event.target.closest('[data-filter]'); if (filter) { state.filter = filter.dataset.filter; renderFilters(); renderSkills(); }
  const path = event.target.closest('[data-path]'); if (path) { state.filter = path.dataset.path; renderFilters(); renderSkills(); $('#skills').scrollIntoView({behavior:'smooth'}); }
  const skill = event.target.closest('[data-skill]'); if (skill) openSkill(skill.dataset.skill);
  if (event.target.closest('[data-close-modal]')) closeModal();
});
$('#language').addEventListener('change', event => { if (!['vi','en'].includes(event.target.value)) { event.target.value = state.lang; return; } state.lang = event.target.value; applyTranslations(); });
$('.menu-toggle').addEventListener('click', event => { const open = $('.nav-links').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); });
$('#skill-form').addEventListener('submit', async event => {
  event.preventDefault(); const box = $('#result-box'); box.className = 'result-box loading'; box.innerHTML = `<span class="result-icon">◌</span><b>${t('launcher.working')}</b>`;
  const endpoint = { 'product-photo': '/api/product-photo', 'world-checkin': '/api/world-checkin', 'premium-portrait-enhancer': '/api/premium-portrait-enhancer' }[state.activeSkill?.id];
  if (!endpoint) return setTimeout(() => { box.className = 'result-box success'; box.innerHTML = `<span class="result-icon">✓</span><b>${t('launcher.ready')}</b><p>${t('launcher.readyText')}</p>`; }, 700);
  const formData = new FormData(event.currentTarget); const image = formData.get('image');
  if (!(image instanceof File) || !image.size) { box.className = 'result-box error'; box.innerHTML = `<span class="result-icon">!</span><b>${t(state.activeSkill.id === 'world-checkin' ? 'launcher.referenceRequired' : 'launcher.imageRequired')}</b>`; return; }
  try {
    const response = await fetch(endpoint, { method: 'POST', body: formData }); const payload = await response.json();
    if (!response.ok || !payload.success || !Array.isArray(payload.images) || !payload.images.length) throw new Error('Generation failed');
    renderProductImages(box, payload.images, state.activeSkill.id === 'world-checkin' ? 'launcher.worldGeneratedAlt' : 'launcher.generatedAlt');
  } catch { box.className = 'result-box error'; box.innerHTML = `<span class="result-icon">!</span><b>${t('launcher.generationError')}</b><p>${t('launcher.tryAgain')}</p>`; }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
applyTranslations();
