const { neon } = require('@neondatabase/serverless');
const { getPlanPolicy, enforcementEnabled, monthlyPeriod, remaining } = require('./plan-policy');

const AUTH_BASE_URL = String(process.env.NEON_AUTH_BASE_URL || 'https://ep-rough-fire-auhjgose.neonauth.c-10.us-east-1.aws.neon.tech/toilaai_main/auth').replace(/\/$/, '');
const DATA_API_URL = String(process.env.NEON_DATA_API_URL || 'https://ep-rough-fire-auhjgose.apirest.c-10.us-east-1.aws.neon.tech/toilaai_main/rest/v1').replace(/\/$/, '');

function appOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://skill-mau.vercel.app';
}

function isJwt(value) {
  return typeof value === 'string' && value.split('.').length === 3 && value.length > 80;
}

async function getAuthContext(req) {
  if (!req?.headers?.cookie) return null;
  const headers = {
    accept: 'application/json',
    origin: appOrigin(req),
    cookie: String(req.headers.cookie),
    'user-agent': String(req.headers['user-agent'] || 'TOI-LA-AI/1.0')
  };
  try {
    const response = await fetch(`${AUTH_BASE_URL}/get-session`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (!payload?.user?.id) return null;
    const jwtHeader = response.headers.get('set-auth-jwt');
    const embedded = payload?.session?.token;
    const jwt = isJwt(jwtHeader) ? jwtHeader : isJwt(embedded) ? embedded : null;
    return jwt ? { session: payload, jwt } : null;
  } catch (error) {
    console.warn('Account gate session lookup failed:', error.message);
    return null;
  }
}

async function dataApi(jwt, path, options = {}) {
  const headers = { accept: 'application/json', authorization: `Bearer ${jwt}` };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.prefer) headers.prefer = options.prefer;
  const response = await fetch(`${DATA_API_URL}/${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  });
  const text = await response.text();
  const payload = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!response.ok) throw new Error(payload?.message || `Data API ${response.status}`);
  return payload;
}

async function getOrCreateAccount(jwt) {
  const select = new URLSearchParams({
    select: 'plan_id,status,plan_started_at,current_period_start,current_period_end,billing_provider,created_at,updated_at',
    limit: '1'
  });
  let rows = await dataApi(jwt, `workspace_accounts?${select}`);
  if (Array.isArray(rows) && rows.length) return rows[0];
  rows = await dataApi(jwt, 'workspace_accounts', {
    method: 'POST',
    body: { plan_id: 'free', status: 'active' },
    prefer: 'return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : { plan_id: 'free', status: 'active' };
}

function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function effectivePlanId(account, now = new Date()) {
  const planId = String(account?.plan_id || 'free');
  if (planId === 'free') return 'free';
  if (account?.status !== 'active') return 'free';
  const periodEnd = validDate(account?.current_period_end);
  if (!periodEnd || periodEnd <= now) return 'free';
  return planId;
}

function usagePeriod(account, now = new Date()) {
  const planId = effectivePlanId(account, now);
  if (planId !== 'free') {
    const start = validDate(account?.current_period_start);
    const end = validDate(account?.current_period_end);
    if (start && end && start < end && end > now) return { start, end };
  }
  return monthlyPeriod(now);
}

function sumUnits(rows, kind) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    return row.kind === kind ? sum + Math.max(0, Number(row.units) || 0) : sum;
  }, 0);
}

async function usageSnapshot(jwt, account) {
  const { start, end } = usagePeriod(account);
  const monthlyParams = new URLSearchParams({
    select: 'kind,units,created_at',
    order: 'created_at.desc',
    limit: '1000'
  });
  monthlyParams.append('created_at', `gte.${start.toISOString()}`);
  monthlyParams.append('created_at', `lt.${end.toISOString()}`);

  const allImageParams = new URLSearchParams({
    select: 'kind,units,created_at',
    kind: 'eq.image',
    order: 'created_at.desc',
    limit: '1000'
  });

  const [periodRows, allImageRows] = await Promise.all([
    dataApi(jwt, `workspace_usage?${monthlyParams}`),
    dataApi(jwt, `workspace_usage?${allImageParams}`)
  ]);
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    textMonthly: sumUnits(periodRows, 'text'),
    imageMonthly: sumUnits(periodRows, 'image'),
    imageLifetime: sumUnits(allImageRows, 'image')
  };
}

function evaluateAllowance(kind, account, usage) {
  const activePlanId = effectivePlanId(account);
  const plan = getPlanPolicy(activePlanId);
  let allowed = true;
  let reason = null;

  if (kind === 'text' && plan.textMonthly != null && usage.textMonthly >= plan.textMonthly) {
    allowed = false;
    reason = 'Bạn đã dùng hết lượt nội dung của kỳ hiện tại.';
  }

  if (kind === 'image') {
    if (plan.imageLifetime != null) {
      if (usage.imageLifetime >= plan.imageLifetime) {
        allowed = false;
        reason = 'Bạn đã dùng hết lượt ảnh miễn phí.';
      }
    } else if (plan.imageMonthly != null && usage.imageMonthly >= plan.imageMonthly) {
      allowed = false;
      reason = 'Bạn đã dùng hết lượt hình ảnh của kỳ hiện tại.';
    }
  }

  return {
    planId: activePlanId,
    status: account?.status || 'active',
    limits: plan,
    usage,
    remaining: {
      textMonthly: remaining(plan.textMonthly, usage.textMonthly),
      imageMonthly: remaining(plan.imageMonthly, usage.imageMonthly),
      imageLifetime: remaining(plan.imageLifetime, usage.imageLifetime)
    },
    wouldAllow: allowed,
    reason,
    enforcementEnabled: enforcementEnabled()
  };
}

async function getEntitlements(req) {
  const auth = await getAuthContext(req);
  if (!auth) return { ok: false, status: 401, error: 'Vui lòng đăng nhập để sử dụng công cụ.' };
  try {
    const account = await getOrCreateAccount(auth.jwt);
    const usage = await usageSnapshot(auth.jwt, account);
    return { ok: true, auth, account, entitlement: evaluateAllowance(null, account, usage) };
  } catch (error) {
    console.error('Entitlement lookup failed:', error.message);
    return { ok: false, status: 503, error: 'Không thể kiểm tra hạn mức tài khoản lúc này.' };
  }
}

async function requireSkillAccess(req, kind) {
  const auth = await getAuthContext(req);
  if (!auth) return { ok: false, status: 401, error: 'Vui lòng đăng nhập để sử dụng công cụ.' };
  try {
    const account = await getOrCreateAccount(auth.jwt);
    const usage = await usageSnapshot(auth.jwt, account);
    const entitlement = evaluateAllowance(kind, account, usage);
    if (entitlement.enforcementEnabled && !entitlement.wouldAllow) {
      return { ok: false, status: 402, error: entitlement.reason || 'Đã hết hạn mức sử dụng.', entitlement };
    }
    return { ok: true, auth, account, entitlement };
  } catch (error) {
    console.error('Account gate failed:', error.message);
    return { ok: false, status: 503, error: 'Không thể kiểm tra tài khoản lúc này.' };
  }
}

async function recordUsage(access, { skillId, kind, units = 1 }) {
  if (!access?.auth?.jwt) throw new Error('Missing authenticated usage context.');
  await dataApi(access.auth.jwt, 'workspace_usage', {
    method: 'POST',
    body: {
      skill_id: String(skillId || 'unknown').slice(0, 120),
      kind: kind === 'image' ? 'image' : 'text',
      units: Math.max(1, Math.min(100, Number(units) || 1))
    },
    prefer: 'return=minimal'
  });
}

function quotaSqlClient() {
  const url = String(process.env.TOILAAI_DATABASE_URL || '').trim();
  if (!url) {
    const error = new Error('Quota database is not configured.');
    error.code = 'QUOTA_DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return neon(url);
}

function reservationSpec(entitlement, kind) {
  const limits = entitlement?.limits || {};
  const usage = entitlement?.usage || {};
  if (kind === 'text') {
    return {
      limit: limits.textMonthly,
      lifetime: false,
      start: usage.periodStart,
      end: usage.periodEnd,
      reason: 'Bạn đã dùng hết lượt nội dung của kỳ hiện tại.'
    };
  }
  if (limits.imageLifetime != null) {
    return {
      limit: limits.imageLifetime,
      lifetime: true,
      start: null,
      end: null,
      reason: 'Bạn đã dùng hết lượt ảnh miễn phí.'
    };
  }
  return {
    limit: limits.imageMonthly,
    lifetime: false,
    start: usage.periodStart,
    end: usage.periodEnd,
    reason: 'Bạn đã dùng hết lượt hình ảnh của kỳ hiện tại.'
  };
}

async function reserveUsage(access, { skillId, kind, units = 1 }) {
  if (!access?.entitlement?.enforcementEnabled) return { ok: true, active: false, id: null };
  const userId = String(access?.auth?.session?.user?.id || '').trim();
  if (!userId) throw new Error('Missing authenticated quota user.');

  const normalizedKind = kind === 'image' ? 'image' : 'text';
  const normalizedSkillId = String(skillId || 'unknown').slice(0, 120);
  const normalizedUnits = Math.max(1, Math.min(100, Number(units) || 1));
  const spec = reservationSpec(access.entitlement, normalizedKind);
  const sql = quotaSqlClient();

  if (spec.limit == null) {
    const [row] = await sql`
      INSERT INTO public.workspace_usage (user_id, skill_id, kind, units)
      VALUES (${userId}, ${normalizedSkillId}, ${normalizedKind}, ${normalizedUnits})
      RETURNING id
    `;
    return { ok: Boolean(row?.id), active: true, id: row?.id || null, userId };
  }

  const limit = Math.max(0, Number(spec.limit) || 0);
  let reserveQuery;
  if (spec.lifetime) {
    reserveQuery = sql`
      INSERT INTO public.workspace_usage (user_id, skill_id, kind, units)
      SELECT ${userId}, ${normalizedSkillId}, ${normalizedKind}, ${normalizedUnits}
      WHERE EXISTS (
        SELECT 1 FROM public.workspace_accounts WHERE user_id = ${userId}
      )
        AND COALESCE((
          SELECT SUM(units)
          FROM public.workspace_usage
          WHERE user_id = ${userId} AND kind = ${normalizedKind}
        ), 0) + ${normalizedUnits} <= ${limit}
      RETURNING id
    `;
  } else {
    const start = validDate(spec.start);
    const end = validDate(spec.end);
    if (!start || !end || start >= end) throw new Error('Invalid quota period.');
    reserveQuery = sql`
      INSERT INTO public.workspace_usage (user_id, skill_id, kind, units)
      SELECT ${userId}, ${normalizedSkillId}, ${normalizedKind}, ${normalizedUnits}
      WHERE EXISTS (
        SELECT 1 FROM public.workspace_accounts WHERE user_id = ${userId}
      )
        AND COALESCE((
          SELECT SUM(units)
          FROM public.workspace_usage
          WHERE user_id = ${userId}
            AND kind = ${normalizedKind}
            AND created_at >= ${start.toISOString()}::timestamptz
            AND created_at < ${end.toISOString()}::timestamptz
        ), 0) + ${normalizedUnits} <= ${limit}
      RETURNING id
    `;
  }

  const [, insertedRows] = await sql.transaction([
    sql`SELECT user_id FROM public.workspace_accounts WHERE user_id = ${userId} FOR UPDATE`,
    reserveQuery
  ], { isolationMode: 'ReadCommitted' });

  const row = Array.isArray(insertedRows) ? insertedRows[0] : null;
  if (!row?.id) return { ok: false, active: true, id: null, userId, reason: spec.reason };
  return { ok: true, active: true, id: row.id, userId };
}

async function releaseUsageReservation(reservation) {
  if (!reservation?.active || !reservation?.id || !reservation?.userId) return;
  const sql = quotaSqlClient();
  await sql`
    DELETE FROM public.workspace_usage
    WHERE id = ${reservation.id} AND user_id = ${reservation.userId}
  `;
}

module.exports = {
  getEntitlements,
  requireSkillAccess,
  recordUsage,
  reserveUsage,
  releaseUsageReservation
};
