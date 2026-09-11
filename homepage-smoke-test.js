const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

class FakeElement {
  constructor(id = '') { this.id = id; this.innerHTML = ''; this.hidden = false; this.value = 'vi'; this.dataset = {}; this.open = false; this.classList = { add() {}, remove() {}, toggle() { return true; } }; }
  addEventListener() {}
  setAttribute() {}
  focus() {}
  scrollIntoView() {}
  remove() {}
  querySelector() { return new FakeElement(); }
}

const ids = ['category-row','skill-grid','show-all-skills','steps','pricing-grid','faq-list','language','skill-form','auth-form','image-viewer','skill-modal','modal-category','modal-title','modal-benefit','skill-fields','result-box'];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
const documentListeners = {};
const document = {
  documentElement: { lang: 'vi' }, body: { classList: { add() {}, remove() {} } },
  querySelector(selector) { if (selector.startsWith('#')) return elements[selector.slice(1)] || null; if (selector === '.menu-toggle' || selector === '.nav-links' || selector === '.modal-close') return new FakeElement(); return null; },
  querySelectorAll(selector) {
    if (selector === '[data-i18n]') return [];
    if (selector === '#faq-list details') return Array.from({length:(elements['faq-list'].innerHTML.match(/<details/g) || []).length}, () => new FakeElement());
    return [];
  },
  addEventListener(type, listener) { documentListeners[type] = listener; }, createElement() { return new FakeElement(); }
};
async function main() {
  const context = { console, document, setTimeout, FormData: class {}, File: class {} };
  context.window = context;
  vm.createContext(context);
  for (const file of ['skills-data.js','pricing-config.js','i18n.js','app.js']) {
    const source = process.env.BASE_URL
      ? await fetch(`${process.env.BASE_URL.replace(/\/$/, '')}/${file}`).then(response => { assert.equal(response.status, 200, `${file} must return HTTP 200`); return response.text(); })
      : fs.readFileSync(file, 'utf8');
    vm.runInContext(source, context, {filename:file});
  }

  assert.ok(Array.isArray(context.AIOS_SKILLS));
  assert.ok(Array.isArray(context.AIOS_PRICING));
  assert.ok(context.AIOS_TRANSLATIONS.vi);
  const publicSkillIds = [...elements['skill-grid'].innerHTML.matchAll(/data-skill="([^"]+)"/g)].map(match => match[1]);
  const expectedPublicSkillIds = ['product-photo','premium-portrait-enhancer','world-checkin','virtual-tryon','facebook-post','tiktok-reel-post','multi-platform-product-description','long-to-short-post','thirty-day-content-plan','poster-thumbnail-brief','social-ad-creative-brief'];
  assert.deepEqual(publicSkillIds, expectedPublicSkillIds);
  assert.equal(publicSkillIds.length, 11);
  assert.ok(context.AIOS_SKILLS.filter(skill => !expectedPublicSkillIds.includes(skill.id)).every(skill => !publicSkillIds.includes(skill.id)));
  for (const id of expectedPublicSkillIds) {
    documentListeners.click({target:{closest(selector) { return selector === '[data-skill]' ? {dataset:{skill:id}} : null; }}});
    assert.equal(elements['modal-title'].textContent, context.AIOS_SKILLS.find(skill => skill.id === id).titleVi);
  }
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('TÔI LÀ AI'));
  assert.ok(!html.includes('AIOS Lab'));
  assert.ok(html.includes('AI THỰC CHIẾN • DỄ HIỂU • DỄ DÙNG'));
  assert.ok(html.includes('AI KIẾN TẠO TƯƠNG LAI'));
  assert.ok(html.includes('Đơn giản hóa thế giới phức tạp cùng AI'));
  assert.ok(html.includes('id="hero-slider"') && html.includes('data-hero-slide') && html.includes('data-slider="prev"') && html.includes('data-slider="next"'));
  assert.ok(!html.includes('Khung kết quả'));
  assert.ok(!html.includes('id="results"') && !html.includes('href="#results"'));
  assert.equal((elements['pricing-grid'].innerHTML.match(/class="price-card/g) || []).length, 6);
  assert.equal((elements['pricing-grid'].innerHTML.match(/data-plan=/g) || []).length, 6);
  assert.ok(!elements['pricing-grid'].innerHTML.includes('href="#skills"'));
  assert.equal((elements['faq-list'].innerHTML.match(/<details/g) || []).length, context.AIOS_TRANSLATIONS.vi.faq.items.length);
  assert.equal((elements.steps.innerHTML.match(/<article>/g) || []).length, 3);
  console.log('Homepage DOM smoke test passed: 11 public skills, slider, branding, 6 plans, 3 FAQ rows, 3 process steps.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
