const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (file) => fs.readFileSync(file, 'utf8');
const index = read('index.html');
const privacy = read('privacy.html');
const terms = read('terms.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const vercel = JSON.parse(read('vercel.json'));
const checkout = read('checkout-runtime.js');
const product = read('main-product.js');
const i18n = read('i18n.js');

assert.match(index, /<link rel="canonical" href="https:\/\/toilaai\.net\/">/);
assert.match(index, /<meta property="og:url" content="https:\/\/toilaai\.net\/">/);
assert.match(index, /<meta property="og:image" content="https:\/\/toilaai\.net\/toilaai-social-card\.png">/);
assert.match(index, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
assert.match(index, /href="\/privacy"/);
assert.match(index, /href="\/terms"/);
assert.match(index, /AI → Create → Results/);
assert.ok(!index.includes('>ACT</h1>'), 'stale raw hero title must not ship');

assert.match(privacy, /https:\/\/toilaai\.net\/privacy/);
assert.match(terms, /https:\/\/toilaai\.net\/terms/);
assert.match(privacy, /admintoilaai@gmail\.com/);
assert.match(terms, /admintoilaai@gmail\.com/);

assert.match(robots, /Sitemap: https:\/\/toilaai\.net\/sitemap\.xml/);
for (const url of ['https://toilaai.net/', 'https://toilaai.net/privacy', 'https://toilaai.net/terms']) {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap must include ${url}`);
}
assert.equal(vercel.cleanUrls, true, 'clean URLs must expose /privacy and /terms');

assert.match(checkout, /const CHECKOUT_LIVE_ENABLED = false;/, 'main-site real checkout must stay locked');
assert.match(product, /https:\/\/ai-social-post-kit\.vercel\.app/, 'main product CTA must keep SaaS separate');
assert.match(product, /SẢN PHẨM CHÍNH · WEB APP/, 'SaaS must remain visibly identified as the primary Web App product');
assert.match(i18n, /pricing:\{title:'GÓI CÔNG CỤ AI'/, 'tool pricing must be visibly distinct from SaaS pricing');
assert.match(i18n, /pricing:'Gói công cụ'/, 'navigation must label the main-site tool plans explicitly');

console.log('WEB22 domain readiness test passed.');
