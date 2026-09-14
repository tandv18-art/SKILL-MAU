const { requireSiteOwner } = require('../lib/site-owner');
const { uploadHeroImage } = require('../lib/hero-store');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBuffer(req, maxBytes = 8 * 1024 * 1024) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > maxBytes) throw new Error('FILE_TOO_LARGE');
    return req.body;
  }
  if (req.body instanceof Uint8Array) {
    const buffer = Buffer.from(req.body);
    if (buffer.length > maxBytes) throw new Error('FILE_TOO_LARGE');
    return buffer;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('FILE_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed.' });
  const owner = await requireSiteOwner(req);
  if (!owner.ok) return send(res, owner.status, { success: false, error: owner.error });

  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    return send(res, 415, { success: false, error: 'Chỉ hỗ trợ JPG, PNG hoặc WEBP.' });
  }

  try {
    const buffer = await readBuffer(req);
    if (!buffer.length) return send(res, 400, { success: false, error: 'Ảnh rỗng.' });
    const uploaded = await uploadHeroImage(buffer, contentType);
    return send(res, 200, { success: true, ...uploaded });
  } catch (error) {
    if (error.message === 'FILE_TOO_LARGE') return send(res, 413, { success: false, error: 'Ảnh quá lớn. Vui lòng dùng ảnh nhỏ hơn 8 MB.' });
    console.error('Hero image upload failed:', error.message);
    return send(res, 502, { success: false, error: 'Không thể tải ảnh lên lúc này.' });
  }
};
