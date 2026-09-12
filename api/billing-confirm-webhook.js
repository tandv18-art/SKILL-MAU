const { getSession } = require('../lib/auth-session');
const { confirmWebhookUrl, configured: payosConfigured } = require('../lib/payos-adapter');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

function requestOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

module.exports = async function billingConfirmWebhook(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });

  if (String(process.env.VERCEL_ENV || '') !== 'preview') {
    return sendJson(res, 403, { success: false, code: 'PREVIEW_ONLY', error: 'Webhook setup is only available in Preview.' });
  }

  const session = await getSession(req);
  if (!session?.user?.id) {
    return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Authentication required.' });
  }

  if (!payosConfigured()) {
    return sendJson(res, 503, { success: false, code: 'PAYOS_NOT_CONFIGURED', error: 'PayOS credentials are not configured.' });
  }

  const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
  if (!bypass) {
    return sendJson(res, 503, {
      success: false,
      code: 'BYPASS_SECRET_NOT_CONFIGURED',
      error: 'Automation bypass secret is not available to the Preview deployment.'
    });
  }

  const origin = requestOrigin(req);
  if (!origin.startsWith('https://')) {
    return sendJson(res, 500, { success: false, code: 'INVALID_PREVIEW_ORIGIN', error: 'Preview origin is unavailable.' });
  }

  const webhookUrl = `${origin}/api/billing-payos-webhook?x-vercel-protection-bypass=${encodeURIComponent(bypass)}`;

  try {
    const data = await confirmWebhookUrl(webhookUrl);
    return sendJson(res, 200, {
      success: true,
      configured: true,
      webhookHost: new URL(origin).host,
      providerChannel: data?.name || null,
    });
  } catch (error) {
    console.error('PayOS webhook confirmation failed:', error.message);
    return sendJson(res, Number(error.status) || 500, {
      success: false,
      code: error.code || 'WEBHOOK_CONFIRM_ERROR',
      error: 'PayOS webhook confirmation failed.'
    });
  }
};
