const crypto = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

function sqlClient() {
  const url = String(process.env.TOILAAI_DATABASE_URL || '').trim();
  if (!url) {
    const error = new Error('Billing database is not configured.');
    error.code = 'BILLING_DATABASE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  return neon(url);
}

function orderCode() {
  const suffix = crypto.randomInt(100, 1000);
  return Number(`${Date.now()}${suffix}`);
}

async function createPendingOrder({ userId, planId, amountVnd }) {
  const sql = sqlClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = String(orderCode());
    try {
      const [row] = await sql`
        INSERT INTO public.billing_orders (user_id, provider, provider_order_id, plan_id, amount_vnd, status)
        VALUES (${userId}, 'payos', ${code}, ${planId}, ${amountVnd}, 'pending')
        RETURNING id, provider_order_id, plan_id, amount_vnd, status, created_at
      `;
      return row;
    } catch (error) {
      if (String(error?.message || '').includes('billing_orders_provider_provider_order_id_key')) continue;
      throw error;
    }
  }
  throw new Error('Could not allocate a unique payment order code.');
}

async function attachProviderCheckout({ orderId, checkoutUrl, paymentLinkId, expiresAt }) {
  const sql = sqlClient();
  const [row] = await sql`
    UPDATE public.billing_orders
    SET checkout_url = ${checkoutUrl},
        expires_at = ${expiresAt},
        metadata = metadata || ${JSON.stringify({ paymentLinkId })}::jsonb,
        updated_at = now()
    WHERE id = ${orderId}
    RETURNING id, provider_order_id, plan_id, amount_vnd, status, checkout_url, expires_at
  `;
  return row || null;
}

async function markOrderFailed(orderId, reason) {
  const sql = sqlClient();
  await sql`
    UPDATE public.billing_orders
    SET status = CASE WHEN status = 'pending' THEN 'failed' ELSE status END,
        metadata = metadata || ${JSON.stringify({ providerError: String(reason || 'provider error').slice(0, 500) })}::jsonb,
        updated_at = now()
    WHERE id = ${orderId}
  `;
}

async function getOrderByProviderCode(providerOrderId) {
  const sql = sqlClient();
  const [row] = await sql`
    SELECT id, user_id, provider, provider_order_id, plan_id, amount_vnd, status, paid_at
    FROM public.billing_orders
    WHERE provider = 'payos' AND provider_order_id = ${String(providerOrderId)}
    LIMIT 1
  `;
  return row || null;
}

async function recordIgnoredEvent({ providerEventId, eventType, payloadSha256, errorMessage = null }) {
  const sql = sqlClient();
  await sql`
    INSERT INTO public.billing_events (provider, provider_event_id, event_type, payload_sha256, status, error_message, processed_at)
    VALUES ('payos', ${providerEventId}, ${eventType}, ${payloadSha256}, 'ignored', ${errorMessage}, now())
    ON CONFLICT (provider, provider_event_id) DO NOTHING
  `;
}

async function recordFailedEvent({ providerEventId, eventType, payloadSha256, errorMessage }) {
  const sql = sqlClient();
  await sql`
    INSERT INTO public.billing_events (provider, provider_event_id, event_type, payload_sha256, status, error_message, processed_at)
    VALUES ('payos', ${providerEventId}, ${eventType}, ${payloadSha256}, 'failed', ${String(errorMessage || '').slice(0, 1000)}, now())
    ON CONFLICT (provider, provider_event_id) DO NOTHING
  `;
}

async function applyPaidWebhook({ order, providerEventId, eventType, payloadSha256, paymentLinkId }) {
  const sql = sqlClient();
  const [result] = await sql`
    WITH inserted_event AS (
      INSERT INTO public.billing_events (provider, provider_event_id, event_type, payload_sha256, status, processed_at)
      VALUES ('payos', ${providerEventId}, ${eventType}, ${payloadSha256}, 'processed', now())
      ON CONFLICT (provider, provider_event_id) DO NOTHING
      RETURNING id
    ), paid_order AS (
      UPDATE public.billing_orders
      SET status = 'paid',
          paid_at = COALESCE(paid_at, now()),
          metadata = metadata || ${JSON.stringify({ paymentLinkId })}::jsonb,
          updated_at = now()
      WHERE id = ${order.id}
        AND status = 'pending'
        AND EXISTS (SELECT 1 FROM inserted_event)
      RETURNING user_id, plan_id
    ), activated_account AS (
      INSERT INTO public.workspace_accounts (
        user_id, plan_id, status, plan_started_at, current_period_start, current_period_end,
        billing_provider, cancel_at_period_end, updated_at
      )
      SELECT user_id, plan_id, 'active', now(), now(), now() + interval '30 days', 'payos', false, now()
      FROM paid_order
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        plan_started_at = CASE
          WHEN public.workspace_accounts.plan_id IS DISTINCT FROM EXCLUDED.plan_id THEN now()
          ELSE COALESCE(public.workspace_accounts.plan_started_at, now())
        END,
        current_period_start = now(),
        current_period_end = GREATEST(COALESCE(public.workspace_accounts.current_period_end, now()), now()) + interval '30 days',
        billing_provider = 'payos',
        cancel_at_period_end = false,
        updated_at = now()
      RETURNING user_id, plan_id, status, current_period_start, current_period_end
    )
    SELECT
      EXISTS (SELECT 1 FROM inserted_event) AS event_inserted,
      EXISTS (SELECT 1 FROM paid_order) AS order_updated,
      (SELECT row_to_json(a) FROM activated_account a LIMIT 1) AS account
  `;
  return result || { event_inserted: false, order_updated: false, account: null };
}

module.exports = {
  createPendingOrder,
  attachProviderCheckout,
  markOrderFailed,
  getOrderByProviderCode,
  recordIgnoredEvent,
  recordFailedEvent,
  applyPaidWebhook,
};
