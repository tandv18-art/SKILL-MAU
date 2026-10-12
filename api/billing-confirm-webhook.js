const { requireSiteOwner } = require('../lib/site-owner');
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

function productionOrigin() {
  const configured = String(process.env.TOILAAI_PUBLIC_URL || '').trim().replace(/\/$/, '');
  if (!configured) return '';
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' ? url.origin : '';
  } catch {
    return '';
  }
}

module.exports = async function billingConfirmWebhook(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });

  const owner = await requireSiteOwner(req);
  if (!owner.ok) return sendJson(res, owner.status, { success: false, code: 'OWNER_REQUIRED', error: owner.error });

  if (!payosConfigured()) {
    return sendJson(res, 503, { success: false, code: 'PAYOS_NOT_CONFIGURED', error: 'PayOS credentials are not configured.' });
  }

  const runtime = String(process.env.VERCEL_ENV || '');
  let origin = '';
  let webhookUrl = '';

  if (runtime === 'preview') {
    const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
    if (!bypass) {
      return sendJson(res, 503, {
        success: false,
        code: 'BYPASS_SECRET_NOT_CONFIGURED',
        error: 'Automation bypass secret is not available to the Preview deployment.'
      });
    }
    origin = requestOrigin(req);
    if (!origin.startsWith('https://')) {
      return sendJson(res, 500, { success: false, code: 'INVALID_PREVIEW_ORIGIN', error: 'Preview origin is unavailable.' });
    }
    webhookUrl = `${origin}/api/billing-payos-webhook?x-vercel-protection-bypass=${encodeURIComponent(bypass)}`;
  } else if (runtime === 'production') {
    if (String(process.env.PAYOS_WEBHOOK_REGISTRATION_ENABLED || '') !== 'true') {
      return sendJson(res, 403, { success: false, code: 'REGISTRATION_DISABLED', error: 'Production webhook registration is closed.' });
    }
    origin = productionOrigin();
    if (!origin) {
      return sendJson(res, 503, { success: false, code: 'PUBLIC_URL_NOT_CONFIGURED', error: 'Production public URL is not configured.' });
    }
    webhookUrl = `${origin}/api/billing-payos-webhook`;
  } else {
    return sendJson(res, 403, { success: false, code: 'UNSUPPORTED_RUNTIME', error: 'Webhook setup is not available in this environment.' });
  }

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
