const PLANS = Object.freeze({
  starter: Object.freeze({ id: 'starter', name: 'Starter', amountVnd: 49000, durationDays: 30 }),
  'creator-pro': Object.freeze({ id: 'creator-pro', name: 'Creator Pro', amountVnd: 129000, durationDays: 30 }),
  'seller-pro': Object.freeze({ id: 'seller-pro', name: 'Seller Pro', amountVnd: 149000, durationDays: 30 }),
  'photo-pro': Object.freeze({ id: 'photo-pro', name: 'Photo Pro', amountVnd: 149000, durationDays: 30 }),
  'all-in': Object.freeze({ id: 'all-in', name: 'All-in', amountVnd: 249000, durationDays: 30 })
});

function getPurchasablePlan(planId) {
  return PLANS[String(planId || '').trim()] || null;
}

module.exports = { PLANS, getPurchasablePlan };
