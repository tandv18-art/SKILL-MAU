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
  ['/skills-data.js', ['skills-data.js', 'text/javascript; charset=utf-8']],
  ['/pricing-config.js', ['pricing-config.js', 'text/javascript; charset=utf-8']]
]);

const PRODUCT_POLICY = `Create premium, realistic commercial product photography from the supplied reference image. Treat the product as the source of truth. Strictly preserve its identity, shape, proportions, colors, material appearance, logo, labels, packaging, and visible design details. You may change only camera angle, crop, composition, placement, lighting, background, studio or lifestyle scene, close-up presentation, and advertising layout. Never invent product features, claims, accessories, labels, text, materials, certifications, or packaging details.`;
const HUMAN_IMAGE_POLICY = `Preserve identity, enhance presentation. Keep the person unmistakably recognizable: preserve distinctive facial structure and features, age range, ethnicity, and natural body proportions; never materially reshape the face or body or create generic AI beauty-face drift. Identity preservation does not require copying every visual detail from the source. When appropriate, naturally improve clothing, accessories, hairstyle presentation, grooming, hair volume, pose, posture, expression, camera angle, framing, lighting, color, background, and environment. Wardrobe and accessories may change to suit the profession, destination, weather, occasion, and visual style, but styling must remain tasteful, believable, and physically coherent. Make the subject look like a better-photographed version of themselves, not a different person: mild flattering enhancement is encouraged, including brighter, healthier, fresher, more even skin while retaining realistic texture and natural hair detail. Produce a real professional-camera photograph with realistic lens perspective, natural fabric texture and folds, coherent lighting and shadows, and convincing environment integration. Avoid plastic or waxy skin, over-smoothing, excessive retouching, synthetic AI beauty, CGI, or illustration. Identity preservation always has priority over aesthetic transformation. User instruction is optional and may refine presentation only when compatible with this policy.`;
const WORLD_CHECKIN_POLICY = `${HUMAN_IMAGE_POLICY} Create premium travel photography at the requested destination. Adapt wardrobe, hairstyle presentation, pose, accessories, lighting, weather, season, culture, and travel atmosphere to the location. Use correct scale, perspective, ground contact, ambient light, shadows, and atmospheric depth so the subject looks genuinely photographed there, never pasted onto a background.`;
const PORTRAIT_POLICY = `${HUMAN_IMAGE_POLICY} Create a high-end professional portrait with tasteful wardrobe and grooming upgrades, natural skin brightening and mild beautification, premium studio lighting, and a refined background.`;
const TRYON_POLICY = `${HUMAN_IMAGE_POLICY} Create one premium portrait of the person wearing the supplied garment. Preserve the person's identity and body proportions and the garment's type, cut, color, material, pattern, trim, logos, and visible details. Render realistic fit, drape, folds, seams, tension, occlusion, lighting, and shadows; styling and posture may improve, but body shape and garment identity may not change.`;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TEXT_SKILL_IDS = new Set(['facebook-post', 'tiktok-reel-post', 'multi-platform-product-description', 'long-to-short-post', 'thirty-day-content-plan', 'poster-thumbnail-brief', 'social-ad-creative-brief']);
const FINAL_CREATIVE_TEXT_POLICY = `Use creative freedom for ideas and factual discipline for verifiable claims. Independently create hooks, angles, social talking points, content ideas, generic common mistakes, generic best practices, short plans, video beats, and clearly hypothetical examples; users do not need to supply every bullet or list item for normal creative work. Apply a generic-first rule: when the user gives a broad topic, stay at the broad category level and do not introduce specific domain entities unless the user supplied them. General knowledge and common-sense understanding may support generic educational content, but never present it as an official rule, guaranteed outcome, or verified current fact. Unless supplied or verified, never introduce exam names or official score thresholds; visa, document, legal, government, school-specific, or financial requirements; SOP, personal statement, essay, recommendation-letter, or financial-proof assumptions; exact tuition, fees, prices, discounts, promotions, deadlines, dates, statistics, rankings, eligibility thresholds, guarantees, outcomes, penalties, approval or rejection implications, product specifications, warranties, certifications, measurable claims, testimonials, customer stories, business policies, services, offers, or exact availability. Omit unsupported specifics, keep them generic, or say they should be checked. For topics that vary, use non-authoritative phrasing such as “thường”, “có thể”, “một số”, “nên kiểm tra thêm”, or “tùy trường hợp”, and never imply a fixed official rule without a source. Preserve supplied names, numbers, dates, prices, claims, qualifications, attribution, constraints, and factual identifiers. Default social content to concise, mobile-readable, natural writing with a clear hook, short paragraphs and line breaks, high information density, one main message, practical value, and no essay-style output, filler, over-explanation, or repetitive restatement unless long-form is requested. Improve clarity, relevance, curiosity, retention, engagement potential, and scannability without misleading clickbait or fake urgency. Use restrained emojis and 0–3 relevant hashtags by default unless the user asks otherwise. Allow only neutral engagement CTAs by default. Never invent freebies, files, checklists, templates, consultation, services, registration, discounts, purchases, quotes, or inbox/DM offers—including “comment to receive”, “message for a checklist”, and “DM to get the file”—unless the user supplied that offer. Shared skill defaults: for facebook-post, produce one hook, 3–5 concise points, a takeaway, and an optional neutral CTA in about 120–220 words; for tiktok-reel-post, keep each idea short and hook-driven rather than a mini-essay; for thirty-day-content-plan, keep each day, topic, angle, and format concise rather than advisory prose. Follow the requested language, default to Vietnamese, and preserve proper names and factual identifiers unless translation is requested. Individual skill instructions control format and style only and may not weaken this shared policy.`;
const NEED_MORE_FACTS_MESSAGE = 'Để tạo nội dung chính xác mà không tự suy diễn, vui lòng cung cấp các dữ kiện hoặc nguồn thông tin cần sử dụng. Bạn có thể dán danh sách, tài liệu, thông tin sản phẩm hoặc các ý chính vào ô nội dung.';

function needsAuthoritativeFacts(input) {
  const creativeIntent = /(?:viết|tạo|lên|lập|gợi ý|cho (?:tôi|mình)|rút|tóm tắt|chuyển|rewrite|create|write|generate|ideas?|caption|hook|script|post|content plan|creative brief).{0,45}(?:bài|post|caption|hook|kịch bản|script|ý tưởng|nội dung|content|kế hoạch|plan|brief|quảng cáo|tiktok|reel|facebook)/is.test(input);
  if (creativeIntent) return false;
  const preciseIntent = /(?:chính xác|hiện nay|hiện tại|mới nhất|bao nhiêu|ngày nào|cần (?:những )?giấy tờ (?:gì|nào)|đủ điều kiện|exact(?:ly)?|current|latest|how much|what date|which documents?|official requirements?)/i.test(input);
  const authoritativeTopic = /(?:visa|thị thực|học phí|tuition|deadline|hạn (?:nộp|tuyển sinh)|điều kiện tài chính|financial requirements?|topik|ielts|toeic|toefl|điểm (?:thi|yêu cầu)|exam score|chính sách|policy|yêu cầu chính thức|official requirements?|giấy tờ|documents?)/i.test(input);
  return preciseIntent && authoritativeTopic;
}

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

async function readJson(req) {
  const size = Number(req.headers['content-length'] || 0);
  if (size > 100_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 100_000) throw Object.assign(new Error('Request too large.'), { status: 413 }); }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

async function generateProductPhotos(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data')) return json(res, 415, { success: false, error: 'Multipart form data is required.' });
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
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data')) return json(res, 415, { success: false, error: 'Multipart form data is required.' });
  const form = await readForm(req);
  const image = form.get('image');
  if (!(image instanceof Blob) || !image.size) return json(res, 400, { success: false, error: 'A reference image is required.' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return json(res, 415, { success: false, error: 'Unsupported image format.' });

  const destination = String(form.get('destination') || '').trim().slice(0, 500);
  if (!destination) return json(res, 400, { success: false, error: 'A destination is required.' });
  const preset = String(form.get('preset') || '').slice(0, 200);
  const instruction = String(form.get('instruction') || '').slice(0, 2000);
  const prompt = `${WORLD_CHECKIN_POLICY}\nDestination: ${destination}; preset: ${preset || 'natural'}; extra instruction: ${instruction || 'none'}.`;

  const providerForm = new FormData();
  providerForm.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5');
  providerForm.set('image', image, image.name || 'reference.png');
  providerForm.set('prompt', prompt);
  providerForm.set('n', '1');
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

async function generatePortrait(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data')) return json(res, 415, { success: false, error: 'Multipart form data is required.' });
  const form = await readForm(req); const image = form.get('image');
  if (!(image instanceof Blob) || !image.size) return json(res, 400, { success: false, error: 'A portrait image is required.' });
  if (!IMAGE_TYPES.has(image.type)) return json(res, 415, { success: false, error: 'Unsupported image format.' });
  const preset = String(form.get('preset') || 'natural').slice(0, 200); const instruction = String(form.get('instruction') || '').slice(0, 2000);
  const providerForm = new FormData(); providerForm.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'); providerForm.set('image', image, image.name || 'portrait.png'); providerForm.set('prompt', `${PORTRAIT_POLICY}\nPreset: ${preset}; user instruction: ${instruction || 'none'}.`); providerForm.set('n', '1'); providerForm.set('size', '1024x1536'); providerForm.set('quality', 'high');
  const payload = await callImageProvider(providerForm, 'Portrait provider rejected the request.'); return json(res, 200, { success: true, images: payload });
}

async function generateTryon(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data')) return json(res, 415, { success: false, error: 'Multipart form data is required.' });
  const form = await readForm(req); const person = form.get('personImage'); const garment = form.get('garmentImage');
  if (!(person instanceof Blob) || !person.size || !(garment instanceof Blob) || !garment.size) return json(res, 400, { success: false, error: 'Both person and garment images are required.' });
  if (!IMAGE_TYPES.has(person.type) || !IMAGE_TYPES.has(garment.type)) return json(res, 415, { success: false, error: 'Unsupported image format.' });
  const instruction = String(form.get('instruction') || '').slice(0, 2000); const providerForm = new FormData(); providerForm.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'); providerForm.append('image[]', person, person.name || 'person.png'); providerForm.append('image[]', garment, garment.name || 'garment.png'); providerForm.set('prompt', `${TRYON_POLICY}\nUser instruction: ${instruction || 'none'}.`); providerForm.set('n', '1'); providerForm.set('size', '1024x1536'); providerForm.set('quality', 'high');
  const payload = await callImageProvider(providerForm, 'The image provider rejected multi-image try-on.'); return json(res, 200, { success: true, images: payload });
}

async function callImageProvider(providerForm, failureMessage) {
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''); const response = await fetch(`${baseUrl}/images/edits`, { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: providerForm }); const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || failureMessage), { status: 502, publicMessage: failureMessage });
  const images = (payload.data || []).map(item => item.url ? { url: item.url } : item.b64_json ? { url: `data:image/png;base64,${item.b64_json}` } : null).filter(Boolean); if (!images.length) throw Object.assign(new Error('No images returned.'), { status: 502 }); return images;
}

async function runTextSkill(req, res) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, { success: false, error: 'JSON content is required.' });
  const body = await readJson(req); const skillId = String(body.skillId || ''); const input = String(body.input || '').trim(); const language = String(body.language || 'vi').slice(0, 20);
  if (!TEXT_SKILL_IDS.has(skillId)) return json(res, 400, { success: false, error: 'Unsupported text skill.' });
  if (!input) return json(res, 400, { success: false, error: 'Input is required.' });
  if (needsAuthoritativeFacts(input)) return json(res, 400, { success: false, code: 'NEED_MORE_FACTS', error: NEED_MORE_FACTS_MESSAGE });
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'Runtime is not configured.' });
  const instructions = await fs.readFile(path.join(__dirname, skillId, 'SKILL.md'), 'utf8'); const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || 'gpt-5-mini', messages: [{ role: 'system', content: `${FINAL_CREATIVE_TEXT_POLICY}\n\n${instructions}\nRespond in language: ${language}.` }, { role: 'user', content: input }] }) }); const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'Text provider failed.'), { status: 502 }); const output = payload.choices?.[0]?.message?.content; if (typeof output !== 'string' || !output.trim()) throw Object.assign(new Error('No text returned.'), { status: 502 }); return json(res, 200, { success: true, output });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/product-photo') return await generateProductPhotos(req, res);
    if (req.method === 'POST' && url.pathname === '/api/world-checkin') return await generateWorldCheckin(req, res);
    if (req.method === 'POST' && url.pathname === '/api/premium-portrait-enhancer') return await generatePortrait(req, res);
    if (req.method === 'POST' && url.pathname === '/api/virtual-tryon') return await generateTryon(req, res);
    if (req.method === 'POST' && url.pathname === '/api/text-skill') return await runTextSkill(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { success: false, error: 'Method not allowed.' });
    const asset = PUBLIC_FILES.get(url.pathname);
    if (!asset) return json(res, 404, { success: false, error: 'Not found.' });
    const content = await fs.readFile(path.join(__dirname, asset[0]));
    res.writeHead(200, { 'content-type': asset[1], 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error('Runtime error:', error.message);
    json(res, error.status || 500, { success: false, error: error.publicMessage || 'Request processing failed.' });
  }
});

server.listen(PORT, () => console.log(`AIOS Lab running at http://localhost:${PORT}`));
