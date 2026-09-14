const crypto = require('node:crypto');
const { verifyWebhook, configured: payosConfigured } = require('../lib/payos-adapter');
const {
  getOrderByProviderCode,
  recordIgnoredEvent,
  recordFailedEvent,
  applyPaidWebhook,
} = require('../lib/billing-db');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    const raw = JSON.stringify(req.body);
    return { payload: req.body, raw };
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return { payload: JSON.parse(raw || '{}'), raw: raw || '{}' }; }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

module.exports = async function payosWebhook(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
  if (!payosConfigured() || !process.env.TOILAAI_DATABASE_URL) {
    return sendJson(res, 503, { success: false, code: 'PAYMENTS_NOT_CONFIGURED', error: 'Payment webhook is not configured.' });
  }

  try {
    const { payload, raw } = await readJson(req);
    if (!verifyWebhook(payload)) {
      return sendJson(res, 400, { success: false, code: 'INVALID_SIGNATURE', error: 'Invalid webhook signature.' });
    }

    const data = payload.data || {};
    const providerEventId = String(payload.signature || '').slice(0, 128);
    const payloadSha256 = crypto.createHash('sha256').update(raw).digest('hex');
    const eventType = 'payment.webhook';
    const providerOrderId = String(data.orderCode ?? '');
    const order = providerOrderId ? await getOrderByProviderCode(providerOrderId) : null;

    if (!order) {
      await recordIgnoredEvent({ providerEventId, eventType, payloadSha256, errorMessage: 'Unknown order code (or PayOS webhook verification sample).' });
      return sendJson(res, 200, { success: true, ignored: true });
    }

    const paymentSucceeded = payload.success === true && String(data.code || '') === '00';
    if (!paymentSucceeded) {
      await recordIgnoredEvent({ providerEventId, eventType, payloadSha256, errorMessage: `Non-success payment webhook: ${String(data.code || payload.code || '')}` });
      return sendJson(res, 200, { success: true, ignored: true });
    }

    const paidAmount = Number(data.amount);
    if (!Number.isSafeInteger(paidAmount) || paidAmount !== Number(order.amount_vnd)) {
      await recordFailedEvent({ providerEventId, eventType, payloadSha256, errorMessage: `Amount mismatch: expected ${order.amount_vnd}, received ${data.amount}` });
      return sendJson(res, 200, { success: true, ignored: true });
    }

    const result = await applyPaidWebhook({
      order,
      providerEventId,
      eventType,
      payloadSha256,
      paymentLinkId: String(data.paymentLinkId || ''),
    });

    return sendJson(res, 200, {
      success: true,
      processed: Boolean(result?.order_updated),
      duplicate: !result?.order_updated,
    });
  } catch (error) {
    console.error('PayOS webhook processing failed:', error.message);
    return sendJson(res, Number(error.status) || 500, { success: false, code: error.code || 'WEBHOOK_ERROR', error: 'Webhook processing failed.' });
  }
};
