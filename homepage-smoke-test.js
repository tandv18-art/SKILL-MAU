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

const ids = ['category-row','skill-grid','show-all-skills','steps','pricing-grid','faq-list','language','skill-form','skill-modal','modal-category','modal-title','modal-benefit','skill-fields','result-box'];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
const document = {
  documentElement: { lang: 'vi' }, body: { classList: { add() {}, remove() {} } },
  querySelector(selector) { if (selector.startsWith('#')) return elements[selector.slice(1)] || null; if (selector === '.menu-toggle' || selector === '.nav-links' || selector === '.modal-close') return new FakeElement(); return null; },
  querySelectorAll(selector) {
    if (selector === '[data-i18n]') return [];
    if (selector === '#faq-list details') return Array.from({length:(elements['faq-list'].innerHTML.match(/<details/g) || []).length}, () => new FakeElement());
    return [];
  },
  addEventListener() {}, createElement() { return new FakeElement(); }
};
const context = { console, document, setTimeout, FormData: class {}, File: class {} };
context.window = context;
vm.createContext(context);
for (const file of ['skills-data.js','pricing-config.js','i18n.js','app.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename:file});

assert.ok(Array.isArray(context.AIOS_SKILLS));
assert.ok(Array.isArray(context.AIOS_PRICING));
assert.ok(context.AIOS_TRANSLATIONS.vi);
assert.equal((elements['skill-grid'].innerHTML.match(/class="skill-card"/g) || []).length, 6);
assert.equal((elements['pricing-grid'].innerHTML.match(/class="price-card/g) || []).length, 6);
assert.equal((elements['faq-list'].innerHTML.match(/<details/g) || []).length, context.AIOS_TRANSLATIONS.vi.faq.items.length);
assert.equal((elements.steps.innerHTML.match(/<article>/g) || []).length, 3);
console.log('Homepage DOM smoke test passed: 6 skills, 6 plans, 3 FAQ rows, 3 process steps.');
