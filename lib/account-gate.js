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
  const select = new URLSearchParams({ select: 'plan_id,status,created_at,updated_at', limit: '1' });
  let rows = await dataApi(jwt, `workspace_accounts?${select}`);
  if (Array.isArray(rows) && rows.length) return rows[0];
  rows = await dataApi(jwt, 'workspace_accounts', {
    method: 'POST',
    body: { plan_id: 'free', status: 'active' },
    prefer: 'return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : { plan_id: 'free', status: 'active' };
}

function sumUnits(rows, kind) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    return row.kind === kind ? sum + Math.max(0, Number(row.units) || 0) : sum;
  }, 0);
}

async function usageSnapshot(jwt) {
  const { start, end } = monthlyPeriod();
  const monthlyParams = new URLSearchParams({
    select: 'kind,units,created_at',
    created_at: `gte.${start.toISOString()}`,
    order: 'created_at.desc',
    limit: '1000'
  });
  const allImageParams = new URLSearchParams({
    select: 'kind,units,created_at',
    kind: 'eq.image',
    order: 'created_at.desc',
    limit: '1000'
  });
  const [monthlyRows, allImageRows] = await Promise.all([
    dataApi(jwt, `workspace_usage?${monthlyParams}`),
    dataApi(jwt, `workspace_usage?${allImageParams}`)
  ]);
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    textMonthly: sumUnits(monthlyRows, 'text'),
    imageMonthly: sumUnits(monthlyRows, 'image'),
    imageLifetime: sumUnits(allImageRows, 'image')
  };
}

function evaluateAllowance(kind, account, usage) {
  const activePlanId = account?.status === 'active' ? account.plan_id : 'free';
  const plan = getPlanPolicy(activePlanId);
  let allowed = true;
  let reason = null;
  if (kind === 'text' && plan.textMonthly != null && usage.textMonthly >= plan.textMonthly) {
    allowed = false;
    reason = 'Bạn đã dùng hết lượt nội dung của kỳ hiện tại.';
  }
  if (kind === 'image') {
    if (plan.imageLifetime != null && usage.imageLifetime >= plan.imageLifetime) {
      allowed = false;
      reason = 'Bạn đã dùng hết lượt ảnh miễn phí.';
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
    const [account, usage] = await Promise.all([getOrCreateAccount(auth.jwt), usageSnapshot(auth.jwt)]);
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
    const [account, usage] = await Promise.all([getOrCreateAccount(auth.jwt), usageSnapshot(auth.jwt)]);
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

module.exports = { getEntitlements, requireSkillAccess, recordUsage };
