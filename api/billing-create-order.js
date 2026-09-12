const { getSession } = require('../lib/auth-session');
const { getPurchasablePlan } = require('../lib/billing-plan-catalog');
const { createPaymentLink, configured: payosConfigured } = require('../lib/payos-adapter');
const { createPendingOrder, attachProviderCheckout, markOrderFailed } = require('../lib/billing-db');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 50_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

function publicOrigin() {
  const configured = String(process.env.TOILAAI_PUBLIC_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  return vercelUrl ? `https://${vercelUrl}` : 'https://skill-mau.vercel.app';
}

module.exports = async function billingCreateOrder(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
  if (process.env.PAYOS_PAYMENTS_ENABLED !== 'true') {
    return sendJson(res, 503, { success: false, code: 'PAYMENTS_DISABLED', error: 'Thanh toán thật chưa được bật.' });
  }
  if (!payosConfigured() || !process.env.TOILAAI_DATABASE_URL) {
    return sendJson(res, 503, { success: false, code: 'PAYMENTS_NOT_CONFIGURED', error: 'Hệ thống thanh toán chưa được cấu hình đầy đủ.' });
  }

  const session = await getSession(req);
  if (!session?.user?.id) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Vui lòng đăng nhập trước khi thanh toán.' });

  try {
    const body = await readJson(req);
    const plan = getPurchasablePlan(body.planId);
    if (!plan) return sendJson(res, 400, { success: false, code: 'INVALID_PLAN', error: 'Gói dịch vụ không hợp lệ.' });

    const order = await createPendingOrder({ userId: session.user.id, planId: plan.id, amountVnd: plan.amountVnd });
    const code = Number(order.provider_order_id);
    const description = `TOILAAI ${String(order.provider_order_id).slice(-8)}`;
    const origin = publicOrigin();
    const expiredAt = Math.floor(Date.now() / 1000) + 30 * 60;

    try {
      const payment = await createPaymentLink({
        orderCode: code,
        amount: plan.amountVnd,
        description,
        buyerEmail: session.user.email || '',
        itemName: `TÔI LÀ AI - ${plan.name}`,
        returnUrl: `${origin}/?payment=success`,
        cancelUrl: `${origin}/?payment=cancel`,
        expiredAt,
      });
      const saved = await attachProviderCheckout({
        orderId: order.id,
        checkoutUrl: payment.checkoutUrl,
        paymentLinkId: payment.paymentLinkId || '',
        expiresAt: new Date(expiredAt * 1000).toISOString(),
      });
      return sendJson(res, 201, {
        success: true,
        order: {
          id: saved?.id || order.id,
          planId: plan.id,
          amountVnd: plan.amountVnd,
          status: 'pending',
          checkoutUrl: payment.checkoutUrl,
          expiresAt: new Date(expiredAt * 1000).toISOString(),
        }
      });
    } catch (error) {
      await markOrderFailed(order.id, error.message).catch(() => {});
      console.error('Payment provider create order failed:', error.message);
      return sendJson(res, Number(error.status) || 502, { success: false, code: error.code || 'PAYMENT_PROVIDER_ERROR', error: 'Không thể tạo phiên thanh toán lúc này.' });
    }
  } catch (error) {
    console.error('Billing create order failed:', error.message);
    return sendJson(res, Number(error.status) || 500, { success: false, code: error.code || 'BILLING_ERROR', error: Number(error.status) >= 400 && Number(error.status) < 500 ? error.message : 'Không thể khởi tạo thanh toán lúc này.' });
  }
};
