const PLAN_POLICIES = Object.freeze({
  free: Object.freeze({ textMonthly: 10, imageMonthly: 0, imageLifetime: 1 }),
  starter: Object.freeze({ textMonthly: 150, imageMonthly: 0, imageLifetime: null }),
  'creator-pro': Object.freeze({ textMonthly: 500, imageMonthly: 0, imageLifetime: null }),
  'seller-pro': Object.freeze({ textMonthly: 250, imageMonthly: 8, imageLifetime: null }),
  'photo-pro': Object.freeze({ textMonthly: 50, imageMonthly: 10, imageLifetime: null }),
  'all-in': Object.freeze({ textMonthly: 500, imageMonthly: 15, imageLifetime: null })
});

function getPlanPolicy(planId) {
  return PLAN_POLICIES[String(planId || 'free')] || PLAN_POLICIES.free;
}

function enforcementEnabled() {
  return String(process.env.CREDIT_ENFORCEMENT_ENABLED || '').toLowerCase() === 'true';
}

function monthlyPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function remaining(limit, used) {
  if (limit == null) return null;
  return Math.max(0, Number(limit) - Math.max(0, Number(used) || 0));
}

module.exports = { PLAN_POLICIES, getPlanPolicy, enforcementEnabled, monthlyPeriod, remaining };
