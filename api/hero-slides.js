const { requireSiteOwner } = require('../lib/site-owner');
const { loadHeroSlides, saveHeroSlides } = require('../lib/hero-store');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve(null); }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 200000) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const origin = `https://${String(req.headers['x-forwarded-host'] || req.headers.host || 'toilaai.net').split(',')[0].trim()}`;
    const url = new URL(req.url, origin);
    const adminMode = url.searchParams.get('admin') === '1';
    if (adminMode) {
      const owner = await requireSiteOwner(req);
      if (!owner.ok) return send(res, owner.status, { success: false, error: owner.error });
    }
    const slides = await loadHeroSlides();
    return send(res, 200, { success: true, admin: adminMode || undefined, slides });
  }

  if (req.method === 'POST') {
    const owner = await requireSiteOwner(req);
    if (!owner.ok) return send(res, owner.status, { success: false, error: owner.error });
    try {
      const body = await readJsonBody(req);
      if (!body || !Array.isArray(body.slides)) return send(res, 400, { success: false, error: 'Danh sách ảnh không hợp lệ.' });
      const slides = await saveHeroSlides(body.slides);
      return send(res, 200, { success: true, slides });
    } catch (error) {
      console.error('Hero config save failed:', error.message);
      const status = error.code === 'HERO_REQUIRES_ENABLED_SLIDE' ? 400 : 502;
      return send(res, status, { success: false, error: status === 400 ? error.message : 'Không thể lưu cấu hình slider lúc này.' });
    }
  }

  return send(res, 405, { success: false, error: 'Method not allowed.' });
};
