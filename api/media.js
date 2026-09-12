const { Readable } = require('node:stream');
const { getSession, safeUserSegment } = require('../lib/auth-session');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { success: false, error: 'Method not allowed.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { success: false, error: 'Media storage is not configured.' });

  const session = await getSession(req);
  const userId = safeUserSegment(session?.user?.id);
  if (!userId) return send(res, 401, { success: false, error: 'Vui lòng đăng nhập.' });

  const origin = `https://${String(req.headers['x-forwarded-host'] || req.headers.host || 'skill-mau.vercel.app').split(',')[0].trim()}`;
  const url = new URL(req.url, origin);
  const pathname = String(url.searchParams.get('pathname') || '');
  const expectedPrefix = `users/${userId}/`;

  if (!pathname || pathname.includes('..') || pathname.includes('\\') || pathname.includes('\0') || !pathname.startsWith(expectedPrefix)) {
    return send(res, 403, { success: false, error: 'Không có quyền truy cập tệp này.' });
  }

  try {
    const { get } = await import('@vercel/blob');
    const result = await get(pathname, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200 || !result.stream) return send(res, 404, { success: false, error: 'Không tìm thấy tệp.' });

    res.statusCode = 200;
    res.setHeader('cache-control', 'private, no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-type', result.blob?.contentType || 'application/octet-stream');
    const stream = Readable.fromWeb(result.stream);
    stream.on('error', error => {
      console.error('Private media stream error:', error.message);
      if (!res.headersSent) send(res, 502, { success: false, error: 'Không thể tải tệp.' });
      else res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Private media read error:', error.message);
    return send(res, 502, { success: false, error: 'Không thể tải tệp lúc này.' });
  }
};
