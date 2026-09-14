const { IMAGE_PREFIX, blobAuthOptions } = require('../lib/hero-store');

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ success: false, error: message }));
}

function safePath(value) {
  const pathname = String(value || '').trim();
  if (!pathname.startsWith(IMAGE_PREFIX) || pathname.includes('..')) return '';
  if (!/^site\/hero\/[a-zA-Z0-9_.-]+$/.test(pathname)) return '';
  return pathname;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.');
  const origin = `https://${String(req.headers['x-forwarded-host'] || req.headers.host || 'toilaai.net').split(',')[0].trim()}`;
  const url = new URL(req.url, origin);
  const pathname = safePath(url.searchParams.get('path'));
  if (!pathname) return sendError(res, 400, 'Ảnh không hợp lệ.');

  try {
    const { get } = await import('@vercel/blob');
    const result = await get(pathname, { access: 'private', ...blobAuthOptions() });
    if (!result?.stream || !result?.blob) return sendError(res, 404, 'Không tìm thấy ảnh.');

    res.statusCode = 200;
    res.setHeader('content-type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('cache-control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('x-content-type-options', 'nosniff');
    if (result.blob.size) res.setHeader('content-length', String(result.blob.size));

    for await (const chunk of result.stream) res.write(Buffer.from(chunk));
    res.end();
  } catch (error) {
    console.error('Hero image read failed:', error.message);
    return sendError(res, 404, 'Không tìm thấy ảnh.');
  }
};
