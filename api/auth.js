const AUTH_BASE_URL = String(process.env.NEON_AUTH_BASE_URL || 'https://ep-rough-fire-auhjgose.neonauth.c-10.us-east-1.aws.neon.tech/toilaai_main/auth').replace(/\/$/, '');

const ROUTES = new Map([
  ['get-session', 'GET'],
  ['sign-up/email', 'POST'],
  ['sign-in/email', 'POST'],
  ['sign-in/social', 'POST'],
  ['sign-out', 'POST'],
  ['request-password-reset', 'POST'],
  ['reset-password', 'POST'],
  ['change-password', 'POST']
]);

function appOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://skill-mau.vercel.app';
}

function safeRedirect(value, origin, fallback = '/') {
  try {
    const candidate = new URL(String(value || fallback), origin);
    return candidate.origin === origin ? candidate.toString() : `${origin}${fallback}`;
  } catch {
    return `${origin}${fallback}`;
  }
}

function sameOriginMutation(req, origin) {
  const requestOrigin = String(req.headers.origin || '').trim();
  if (requestOrigin) return requestOrigin === origin;
  const site = String(req.headers['sec-fetch-site'] || '').trim();
  return !site || site === 'same-origin' || site === 'none';
}

function readBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body)); }
  catch { return {}; }
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function firstPartyCookie(cookie) {
  return String(cookie)
    .replace(/;\s*Domain=[^;]+/ig, '')
    .replace(/;\s*SameSite=None/ig, '; SameSite=Lax');
}

module.exports = async function handler(req, res) {
  const origin = appOrigin(req);
  const url = new URL(req.url, origin);
  const authPath = String(url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');
  const expectedMethod = ROUTES.get(authPath);

  if (!expectedMethod) return res.status(404).json({ success: false, error: 'Auth route not found.' });
  if (req.method !== expectedMethod) return res.status(405).json({ success: false, error: 'Method not allowed.' });
  if (req.method === 'POST' && !sameOriginMutation(req, origin)) return res.status(403).json({ success: false, error: 'Cross-origin auth request blocked.' });

  const upstreamUrl = new URL(`${AUTH_BASE_URL}/${authPath}`);
  const verifier = url.searchParams.get('neon_auth_session_verifier');
  if (verifier && authPath === 'get-session') upstreamUrl.searchParams.set('neon_auth_session_verifier', verifier);

  const headers = {
    accept: 'application/json',
    origin,
    'user-agent': String(req.headers['user-agent'] || 'TOI-LA-AI/1.0')
  };
  if (req.headers.cookie) headers.cookie = String(req.headers.cookie);

  let body;
  if (req.method === 'POST') {
    const payload = { ...readBody(req) };
    if (authPath === 'sign-up/email' || authPath === 'sign-in/email') {
      if (payload.callbackURL) payload.callbackURL = safeRedirect(payload.callbackURL, origin, '/');
    }
    if (authPath === 'sign-in/social') {
      payload.callbackURL = safeRedirect(payload.callbackURL, origin, '/');
      payload.errorCallbackURL = safeRedirect(payload.errorCallbackURL, origin, '/?auth=error');
      payload.newUserCallbackURL = safeRedirect(payload.newUserCallbackURL, origin, '/');
    }
    if (authPath === 'request-password-reset') {
      payload.redirectTo = safeRedirect(payload.redirectTo, origin, '/?auth=reset');
    }
    headers['content-type'] = 'application/json';
    body = JSON.stringify(payload);
  }

  try {
    const upstream = await fetch(upstreamUrl, { method: req.method, headers, body, redirect: 'manual' });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    const cookies = getSetCookies(upstream.headers).map(firstPartyCookie);

    res.statusCode = upstream.status;
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    if (cookies.length) res.setHeader('set-cookie', cookies);
    const authJwt = upstream.headers.get('set-auth-jwt');
    if (authJwt) res.setHeader('set-auth-jwt', authJwt);
    const location = upstream.headers.get('location');
    if (location) res.setHeader('location', location);
    res.end(bytes);
  } catch (error) {
    console.error('Auth bridge error:', error.message);
    res.status(502).json({ success: false, error: 'Dịch vụ đăng nhập tạm thời chưa sẵn sàng.' });
  }
};