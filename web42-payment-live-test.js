const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = file => fs.readFileSync(file, 'utf8');
const checkout = read('checkout-runtime.js');
const statusApi = read('api/billing-status.js');
const createApi = read('api/billing-create-order.js');
const confirmApi = read('api/billing-confirm-webhook.js');
const workspace = read('workspace-data.js');
const pricing = read('pricing-config.js');
const vercel = JSON.parse(read('vercel.json'));

assert.match(checkout, /fetch\('\/api\/billing-status'/);
assert.match(checkout, /fetch\('\/api\/billing-create-order'/);
assert.match(checkout, /window\.location\.assign\(checkoutUrl\)/);
assert.match(checkout, /Hệ thống không tự thử lại/);
assert.ok(!checkout.includes('CHECKOUT_LIVE_ENABLED = false'));
assert.ok(!checkout.includes('setInterval('), 'checkout must never poll/retry provider mutation automatically');

assert.match(statusApi, /PAYOS_PAYMENTS_ENABLED/);
assert.match(statusApi, /payosConfigured\(\)/);
assert.match(statusApi, /TOILAAI_DATABASE_URL/);
assert.match(statusApi, /VERCEL_ENV/);

assert.match(createApi, /process\.env\.PAYOS_PAYMENTS_ENABLED !== 'true'/);
assert.match(createApi, /getPurchasablePlan\(body\.planId\)/);
assert.match(createApi, /createPaymentLink/);

assert.match(confirmApi, /requireSiteOwner/);
assert.match(confirmApi, /PAYOS_WEBHOOK_REGISTRATION_ENABLED/);
assert.match(confirmApi, /TOILAAI_PUBLIC_URL/);
assert.match(confirmApi, /\/api\/billing-payos-webhook/);

assert.match(workspace, /Xác nhận webhook PayOS/);
assert.match(workspace, /\/api\/hero-slides\?admin=1/);
assert.match(workspace, /\/api\/billing-confirm-webhook/);

assert.match(pricing, /checkout-runtime\.js\?v=web42-payos-live/);
for (const source of ['/checkout-runtime.js', '/pricing-config.js']) {
  const rule = vercel.headers.find(item => item.source === source);
  assert.ok(rule, `${source} must be no-store for payment readiness rollout`);
  assert.ok(rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store')));
}

console.log('WEB42 PayOS Production readiness regression test passed.');
