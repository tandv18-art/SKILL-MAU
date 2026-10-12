const { configured: payosConfigured } = require('../lib/payos-adapter');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

module.exports = async function billingStatus(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { success: false, live: false });
  const production = String(process.env.VERCEL_ENV || '') === 'production';
  const enabled = String(process.env.PAYOS_PAYMENTS_ENABLED || '') === 'true';
  const databaseConfigured = Boolean(String(process.env.TOILAAI_DATABASE_URL || '').trim());
  const providerConfigured = payosConfigured();
  const live = production && enabled && databaseConfigured && providerConfigured;
  return sendJson(res, 200, { success: true, live, provider: 'payos' });
};
