const assert = require('node:assert/strict');
const { PLAN_POLICIES, getPlanPolicy, remaining } = require('./lib/plan-policy');

assert.deepEqual(
  { textMonthly: getPlanPolicy('free').textMonthly, imageLifetime: getPlanPolicy('free').imageLifetime },
  { textMonthly: 10, imageLifetime: 3 },
  'Free keeps 3 lifetime image trials'
);
assert.equal(getPlanPolicy('starter').imageMonthly, 5, 'Starter gets 5 images per 30-day period');
assert.equal(getPlanPolicy('creator-pro').imageMonthly, 6, 'Creator Pro gets 6 images per 30-day period');

// Keep the higher image allowances and all plan text quotas unchanged.
assert.deepEqual(
  Object.fromEntries(['seller-pro', 'photo-pro', 'all-in'].map(id => [id, {
    textMonthly: PLAN_POLICIES[id].textMonthly,
    imageMonthly: PLAN_POLICIES[id].imageMonthly
  }])),
  {
    'seller-pro': { textMonthly: 250, imageMonthly: 8 },
    'photo-pro': { textMonthly: 50, imageMonthly: 10 },
    'all-in': { textMonthly: 500, imageMonthly: 15 }
  }
);
assert.equal(remaining(5, 2), 3);
assert.equal(remaining(5, 7), 0);

console.log('Skill image quota policy tests passed.');
