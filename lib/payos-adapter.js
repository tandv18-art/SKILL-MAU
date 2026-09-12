const crypto = require('node:crypto');

const PAYOS_API_BASE = String(process.env.PAYOS_API_BASE || 'https://api-merchant.payos.vn').replace(/\/$/, '');

function configured() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

function requireConfigured() {
  if (!configured()) {
    const error = new Error('PayOS is not configured.');
    error.code = 'PAYMENT_PROVIDER_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
}

function hmac(value) {
  requireConfigured();
  return crypto.createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY).update(String(value)).digest('hex');
}

function createPaymentSignature({ amount, cancelUrl, description, orderCode, returnUrl }) {
  const data = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  return hmac(data);
}

function webhookCanonicalData(data) {
  return Object.keys(data || {}).sort().map(key => {
    const value = data[key];
    if (value == null) return `${key}=`;
    if (typeof value === 'object') return `${key}=${JSON.stringify(value)}`;
    return `${key}=${String(value)}`;
  }).join('&');
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhook(payload) {
  requireConfigured();
  const signature = String(payload?.signature || '');
  if (!signature || !payload?.data || typeof payload.data !== 'object') return false;
  const expected = hmac(webhookCanonicalData(payload.data));
  return safeEqualHex(signature, expected);
}

async function createPaymentLink(input) {
  requireConfigured();
  const payload = {
    orderCode: input.orderCode,
    amount: input.amount,
    description: input.description,
    buyerEmail: input.buyerEmail || undefined,
    items: [{ name: input.itemName, quantity: 1, price: input.amount }],
    cancelUrl: input.cancelUrl,
    returnUrl: input.returnUrl,
    expiredAt: input.expiredAt,
  };
  payload.signature = createPaymentSignature(payload);

  const response = await fetch(`${PAYOS_API_BASE}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-client-id': process.env.PAYOS_CLIENT_ID,
      'x-api-key': process.env.PAYOS_API_KEY,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.code !== '00' || !body?.data?.checkoutUrl) {
    const error = new Error(body?.desc || `PayOS request failed (${response.status}).`);
    error.code = 'PAYMENT_PROVIDER_ERROR';
    error.status = 502;
    throw error;
  }
  return body.data;
}

module.exports = { configured, createPaymentLink, verifyWebhook };
