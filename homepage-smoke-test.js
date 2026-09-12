const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const EXPECTED_PUBLIC_SKILL_IDS = ['product-photo','world-checkin','premium-portrait-enhancer','virtual-tryon','facebook-post','tiktok-reel-post','multi-platform-product-description','long-to-short-post','thirty-day-content-plan','poster-thumbnail-brief','social-ad-creative-brief'];

class FakeElement {
  constructor(id = '') { this.id = id; this.innerHTML = ''; this.textContent = ''; this.hidden = false; this.value = 'vi'; this.dataset = {}; this.open = false; this.classList = { add() {}, remove() {}, toggle() { return true; }, contains() { return false; } }; }
  addEventListener() {}
  setAttribute() {}
  focus() {}
  scrollIntoView() {}
  remove() {}
  querySelector() { return new FakeElement(); }
}

const ids = ['category-row','skill-grid','show-all-skills','steps','pricing-grid','faq-list','language','skill-form','auth-form','image-viewer','skill-modal','modal-category','modal-title','modal-benefit','skill-fields','result-box'];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
const document = {
  documentElement: { lang: 'vi' }, body: { classList: { add() {}, remove() {} } },
  querySelector(selector) { if (selector.startsWith('#')) return elements[selector.slice(1)] || null; if (selector === '.menu-toggle' || selector === '.nav-links' || selector === '.modal-close') return new FakeElement(); return null; },
  querySelectorAll(selector) {
    if (selector === '[data-i18n]' || selector === '.hero-slide' || selector === '[data-slide-to]') return [];
    if (selector === '#faq-list details') return Array.from({length:(elements['faq-list'].innerHTML.match(/<details/g) || []).length}, () => new FakeElement());
    return [];
  },
  addEventListener() {}, createElement() { return new FakeElement(); }
};
async function readSource(file) {
  if (!process.env.BASE_URL) return fs.readFileSync(file, 'utf8');
  const response = await fetch(`${process.env.BASE_URL.replace(/\/$/, '')}/${file}`);
  assert.equal(response.status, 200, `${file} must return HTTP 200`);
  return response.text();
}
async function main() {
  const context = { console, document, setTimeout, clearTimeout, FormData: class {}, File: class {} };
  context.window = context;
  vm.createContext(context);
  for (const file of ['skills-data.js','pricing-config.js','i18n.js','app.js']) vm.runInContext(await readSource(file), context, {filename:file});
  const html = await readSource('index.html');

  assert.ok(Array.isArray(context.AIOS_SKILLS));
  assert.ok(Array.isArray(context.AIOS_PRICING));
  assert.ok(context.AIOS_TRANSLATIONS.vi);
  assert.deepEqual(Array.from(context.PUBLIC_SKILL_IDS), EXPECTED_PUBLIC_SKILL_IDS);
  assert.equal((elements['skill-grid'].innerHTML.match(/class="skill-card"/g) || []).length, 11);
  const renderedIds = [...elements['skill-grid'].innerHTML.matchAll(/data-skill="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(renderedIds.sort(), [...EXPECTED_PUBLIC_SKILL_IDS].sort());
  const hiddenIds = context.AIOS_SKILLS.map(skill => skill.id).filter(id => !EXPECTED_PUBLIC_SKILL_IDS.includes(id));
  hiddenIds.forEach(id => assert.ok(!elements['skill-grid'].innerHTML.includes(`data-skill="${id}"`), `hidden skill ${id} must not render`));
  for (const id of EXPECTED_PUBLIC_SKILL_IDS) {
    vm.runInContext(`openSkill(${JSON.stringify(id)})`, context);
    assert.ok(elements['modal-title'].textContent, `${id} must populate the launcher`);
    assert.ok(elements['skill-fields'].innerHTML, `${id} must populate launcher fields`);
  }
  for (const category of ['seller','content','photo','work','all']) {
    vm.runInContext(`state.filter = ${JSON.stringify(category)}; renderSkills()`, context);
    const categoryIds = [...elements['skill-grid'].innerHTML.matchAll(/data-skill="([^"]+)"/g)].map(match => match[1]);
    categoryIds.forEach(id => assert.ok(EXPECTED_PUBLIC_SKILL_IDS.includes(id), `${category} filter exposed hidden skill ${id}`));
  }
  vm.runInContext("state.filter = 'all'; renderSkills()", context);
  assert.deepEqual([...elements['category-row'].innerHTML.matchAll(/data-filter="([^"]+)"/g)].map(match => match[1]), ['seller','content','photo','work','all']);
  assert.equal((elements['pricing-grid'].innerHTML.match(/class="price-card/g) || []).length, 6);
  assert.equal((elements['pricing-grid'].innerHTML.match(/data-plan=/g) || []).length, 6);
  assert.ok(!elements['pricing-grid'].innerHTML.includes('href="#skills"'));
  assert.equal((elements['faq-list'].innerHTML.match(/<details/g) || []).length, context.AIOS_TRANSLATIONS.vi.faq.items.length);
  assert.equal((elements.steps.innerHTML.match(/<article>/g) || []).length, 3);
  assert.ok(html.includes('AI THỰC CHIẾN • DỄ HIỂU • DỄ DÙNG'));
  assert.ok(html.includes('<h1 data-i18n="hero.title">ACT</h1>'));
  assert.ok(!html.includes('AI KIẾN TẠO TƯƠNG LAI'));
  assert.ok(html.includes('Đơn giản hóa thế giới phức tạp cùng AI'));
  assert.equal((html.match(/class="hero-slide(?: |")/g) || []).length, 4);
  assert.ok(html.includes('data-slider="prev"') && html.includes('data-slider="next"') && html.includes('class="slider-dots"'));
  assert.ok(!html.includes('Khung kết quả'));
  assert.ok(!html.includes('id="results"') && !html.includes('href="#results"'));
  console.log('Homepage DOM smoke test passed: exactly 11 public skills, 5 category chips, 4 hero slides, 6 plans, 3 FAQ rows, and 3 process steps.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
