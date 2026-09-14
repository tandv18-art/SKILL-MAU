const { requireSiteOwner } = require('../lib/site-owner');
const { deleteHeroImage, isManagedHeroUrl } = require('../lib/hero-store');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed.' });
  const owner = await requireSiteOwner(req);
  if (!owner.ok) return send(res, owner.status, { success: false, error: owner.error });

  try {
    const body = await readJson(req);
    const url = String(body?.url || '').trim();
    if (!isManagedHeroUrl(url)) return send(res, 400, { success: false, error: 'Ảnh này không thuộc kho Hero.' });
    await deleteHeroImage(url);
    return send(res, 200, { success: true });
  } catch (error) {
    console.error('Hero image delete failed:', error.message);
    return send(res, 502, { success: false, error: 'Không thể xóa ảnh lúc này.' });
  }
};
