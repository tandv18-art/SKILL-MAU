const AUTH_BASE_URL = String(process.env.NEON_AUTH_BASE_URL || 'https://ep-rough-fire-auhjgose.neonauth.c-10.us-east-1.aws.neon.tech/toilaai_main/auth').replace(/\/$/, '');

function appOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://skill-mau.vercel.app';
}

async function getSession(req) {
  if (!req?.headers?.cookie) return null;
  const origin = appOrigin(req);
  const headers = {
    accept: 'application/json',
    origin,
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
    return payload?.user?.id ? payload : null;
  } catch (error) {
    console.warn('Session lookup failed:', error.message);
    return null;
  }
}

function safeUserSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

module.exports = { getSession, safeUserSegment };
