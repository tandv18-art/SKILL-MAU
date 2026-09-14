const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = file => fs.readFileSync(file, 'utf8');
const hero = read('hero-media.js');
const heroCss = read('hero-media.css');
const admin = read('hero-admin.js');
const owner = read('lib/site-owner.js');
const store = read('lib/hero-store.js');
const slidesApi = read('api/hero-slides.js');
const uploadApi = read('api/hero-upload.js');
const checkout = read('checkout-runtime.js');

assert.match(hero, /fetch\('\/api\/hero-slides'/);
assert.match(hero, /\.filter\(item => item && item\.enabled !== false && item\.src\)/);
assert.ok(!hero.includes('hero-premium-portrait.svg'));
assert.ok(!hero.includes('hero-product-photo.svg'));
assert.ok(!hero.includes('hero-content-ai.svg'));
assert.match(heroCss, /grid-template-columns:minmax\(330px,.8fr\) minmax\(600px,1.2fr\)/);
assert.match(admin, /8 - state\.slides\.length/);
assert.match(admin, /createImageBitmap/);
assert.match(admin, /\/api\/hero-upload/);
assert.match(admin, /\/api\/hero-delete/);
assert.match(owner, /ORDER BY created_at ASC, user_id ASC/);
assert.match(slidesApi, /requireSiteOwner/);
assert.match(uploadApi, /requireSiteOwner/);
assert.match(store, /access: 'public'/);
assert.match(store, /site\/hero-config\//);
assert.match(store, /site\/hero\//);
assert.match(checkout, /const CHECKOUT_LIVE_ENABLED = false;/);

console.log('WEB41 hero manager regression test passed.');
