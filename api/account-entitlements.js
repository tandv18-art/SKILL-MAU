const { getEntitlements } = require('../lib/account-gate');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { success: false, error: 'Method not allowed.' });
  const result = await getEntitlements(req);
  if (!result.ok) return send(res, result.status || 503, { success: false, error: result.error });
  return send(res, 200, {
    success: true,
    planId: result.entitlement.planId,
    status: result.entitlement.status,
    limits: result.entitlement.limits,
    usage: result.entitlement.usage,
    remaining: result.entitlement.remaining,
    enforcementEnabled: result.entitlement.enforcementEnabled
  });
};
