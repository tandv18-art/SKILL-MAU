const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const PUBLIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/i18n.js', ['i18n.js', 'text/javascript; charset=utf-8']],
  ['/skills-data.js', ['skills-data.js', 'text/javascript; charset=utf-8']]
]);

const PRODUCT_POLICY = `Create premium, realistic commercial product photography from the supplied reference image. Treat the product as the source of truth. Strictly preserve its identity, shape, proportions, colors, material appearance, logo, labels, packaging, and visible design details. You may change only camera angle, crop, composition, placement, lighting, background, studio or lifestyle scene, close-up presentation, and advertising layout. Never invent product features, claims, accessories, labels, text, materials, certifications, or packaging details.`;
const WORLD_CHECKIN_POLICY = `Create a premium, realistic travel photograph that makes the supplied person look genuinely present at the requested destination, never pasted onto a background. Preserve recognizable face identity, distinctive facial features, age range, ethnicity, facial structure, natural body proportions, size, and height. Adapt outfit, hairstyle, pose, posture, expression, accessories, camera angle, framing, lighting, weather, time of day, and destination atmosphere naturally. Ensure realistic perspective, scale, ground contact, light direction, shadows, atmospheric depth, color, weather, clean edges, and natural camera character. Use flattering photographic improvements without identity drift or material body reshaping. User instructions override defaults whenever compatible with identity preservation.`;

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readForm(req) {
  const size = Number(req.headers['content-length'] || 0);
  if (size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('Upload too large'), { status: 413 });
  const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body: req, duplex: 'half' });
  return request.formData();
}

async function generateProductPhotos(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  const form = await readForm(req);
  const image = form.get('image');
  if (!(image instanceof Blob) || !image.size) return json(res, 400, { success: false, error: 'A product image is required.' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return json(res, 415, { success: false, error: 'Unsupported image format.' });

  const variations = Math.min(8, Math.max(1, Number(form.get('variations')) || 1));
  const scene = String(form.get('scene') || 'Studio').slice(0, 200);
  const angle = String(form.get('angle') || 'Góc 45°').slice(0, 200);
  const intendedUse = String(form.get('intendedUse') || '').slice(0, 500);
  const instruction = String(form.get('instruction') || '').slice(0, 2000);
  const prompt = `${PRODUCT_POLICY}\nUser priorities: scene/style: ${scene}; camera angle: ${angle}; intended use: ${intendedUse || 'not specified'}; extra instruction: ${instruction || 'none'}. Follow these user choices wherever they do not conflict with strict product preservation.`;

  const providerForm = new FormData();
  providerForm.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5');
  providerForm.set('image', image, image.name || 'product.png');
  providerForm.set('prompt', prompt);
  providerForm.set('n', String(variations));
  providerForm.set('size', '1536x1024');
  providerForm.set('quality', 'high');

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/images/edits`, { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: providerForm });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'Image provider failed.'), { status: 502 });
  const images = (payload.data || []).map(item => item.url ? { url: item.url } : item.b64_json ? { url: `data:image/png;base64,${item.b64_json}` } : null).filter(Boolean);
  if (!images.length) throw Object.assign(new Error('No images returned.'), { status: 502 });
  return json(res, 200, { success: true, images });
}

async function generateWorldCheckin(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  const form = await readForm(req);
  const image = form.get('image');
  if (!(image instanceof Blob) || !image.size) return json(res, 400, { success: false, error: 'A reference image is required.' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return json(res, 415, { success: false, error: 'Unsupported image format.' });
  const destination = String(form.get('destination') || '').trim().slice(0, 300);
  if (!destination) return json(res, 400, { success: false, error: 'A destination is required.' });
  const preset = String(form.get('preset') || 'Natural travel').slice(0, 200);
  const instruction = String(form.get('instruction') || '').slice(0, 2000);
  const prompt = `${WORLD_CHECKIN_POLICY}\nDestination: ${destination}. Travel style: ${preset}. User instruction: ${instruction || 'none'}.`;

  const providerForm = new FormData();
  providerForm.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5');
  providerForm.set('image', image, image.name || 'person.png');
  providerForm.set('prompt', prompt);
  providerForm.set('n', '1');
  providerForm.set('size', '1024x1536');
  providerForm.set('quality', 'high');
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/images/edits`, { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: providerForm });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'Image provider failed.'), { status: 502 });
  const images = (payload.data || []).map(item => item.url ? { url: item.url } : item.b64_json ? { url: `data:image/png;base64,${item.b64_json}` } : null).filter(Boolean);
  if (!images.length) throw Object.assign(new Error('No images returned.'), { status: 502 });
  return json(res, 200, { success: true, images });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/product-photo') return await generateProductPhotos(req, res);
    if (req.method === 'POST' && url.pathname === '/api/world-checkin') return await generateWorldCheckin(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { success: false, error: 'Method not allowed.' });
    const asset = PUBLIC_FILES.get(url.pathname);
    if (!asset) return json(res, 404, { success: false, error: 'Not found.' });
    const content = await fs.readFile(path.join(__dirname, asset[0]));
    res.writeHead(200, { 'content-type': asset[1], 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error('Runtime error:', error.message);
    json(res, error.status || 500, { success: false, error: 'Product photo generation failed.' });
  }
});

server.listen(PORT, () => console.log(`AIOS Lab running at http://localhost:${PORT}`));
