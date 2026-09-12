const DEFAULT_NEON_AUTH_BASE_URL = 'https://ep-rough-fire-auhjgose.neonauth.c-10.us-east-1.aws.neon.tech/toilaai_main/auth';
const AUTH_BASE_URL = String(process.env.NEON_AUTH_BASE_URL || DEFAULT_NEON_AUTH_BASE_URL).replace(/\/$/, '');
const AUTH_ROUTES = new Map([
  ['get-session', 'GET'],
  ['sign-up/email', 'POST'],
  ['sign-in/email', 'POST'],
  ['sign-out', 'POST'],
  ['request-password-reset', 'POST'],
  ['reset-password', 'POST'],
  ['change-password', 'POST']
]);

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function requestOrigin(req) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || String(req.headers.host || '').trim();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const local = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(host);
  const proto = forwardedProto || (local ? 'http' : 'https');
  return host ? `${proto}://${host}` : String(process.env.PUBLIC_APP_URL || 'https://skill-mau.vercel.app');
}

function isSameOriginRequest(req) {
  const origin = String(req.headers.origin || '').trim();
  if (origin) return origin === requestOrigin(req);
  const fetchSite = String(req.headers['sec-fetch-site'] || '').trim();
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

async function readJsonBody(req) {
  const size = Number(req.headers['content-length'] || 0);
  if (size > 100_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

function safeRedirect(value, origin, fallbackPath) {
  if (!value) return `${origin}${fallbackPath}`;
  try {
    const candidate = new URL(String(value), origin);
    return candidate.origin === origin ? candidate.toString() : `${origin}${fallbackPath}`;
  } catch {
    return `${origin}${fallbackPath}`;
  }
}

function forwardedSetCookies(headers) {
  const cookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  if (!cookies.length) {
    const fallback = headers.get('set-cookie');
    if (fallback) cookies.push(fallback);
  }
  return cookies.map(cookie => cookie.replace(/;\s*Domain=[^;]+/ig, ''));
}

async function proxyAuth(req, res, url) {
  const authPath = url.pathname.slice('/api/auth/'.length).replace(/^\/+|\/+$/g, '');
  const expectedMethod = AUTH_ROUTES.get(authPath);
  if (!expectedMethod) return sendJson(res, 404, { success: false, error: 'Auth route not found.' });
  if (req.method !== expectedMethod) return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
  if (req.method === 'POST' && !isSameOriginRequest(req)) return sendJson(res, 403, { success: false, error: 'Cross-origin auth request blocked.' });

  const origin = requestOrigin(req);
  const headers = {
    accept: 'application/json',
    origin,
    'user-agent': String(req.headers['user-agent'] || 'TOI-LA-AI/1.0')
  };
  if (req.headers.cookie) headers.cookie = String(req.headers.cookie);

  let body;
  if (req.method === 'POST') {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return sendJson(res, 415, { success: false, error: 'JSON content is required.' });
    const payload = await readJsonBody(req);
    if (authPath === 'request-password-reset') payload.redirectTo = safeRedirect(payload.redirectTo, origin, '/?auth=reset');
    if (authPath === 'sign-up/email' && payload.callbackURL) payload.callbackURL = safeRedirect(payload.callbackURL, origin, '/');
    if (authPath === 'sign-in/email' && payload.callbackURL) payload.callbackURL = safeRedirect(payload.callbackURL, origin, '/');
    body = JSON.stringify(payload);
    headers['content-type'] = 'application/json';
  }

  let upstream;
  try {
    upstream = await fetch(`${AUTH_BASE_URL}/${authPath}${url.search}`, { method: req.method, headers, body, redirect: 'manual' });
  } catch (error) {
    console.error('Auth upstream error:', error.message);
    return sendJson(res, 502, { success: false, error: 'Dịch vụ đăng nhập tạm thời chưa sẵn sàng.' });
  }

  const responseBody = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = {
    'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
  const location = upstream.headers.get('location');
  if (location) responseHeaders.location = location;
  const cookies = forwardedSetCookies(upstream.headers);
  if (cookies.length) responseHeaders['set-cookie'] = cookies;
  res.writeHead(upstream.status, responseHeaders);
  res.end(responseBody);
}

module.exports = { proxyAuth, requestOrigin, isSameOriginRequest, AUTH_ROUTES };
