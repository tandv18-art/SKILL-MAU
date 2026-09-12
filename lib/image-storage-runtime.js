const { randomUUID } = require('node:crypto');
const baseRuntime = require('./skill-runtime');
const { getSession, safeUserSegment } = require('./auth-session');

const MAX_PERSIST_BYTES = 20 * 1024 * 1024;

function safeSkillSegment(value) {
  return String(value || 'image').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'image';
}

function dataUrlToBinary(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''));
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PERSIST_BYTES) return null;
  return { buffer, contentType: match[1].toLowerCase() };
}

async function imageToBinary(url) {
  const inline = dataUrlToBinary(url);
  if (inline) return inline;
  if (!/^https:\/\//i.test(String(url || ''))) return null;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Unable to fetch generated image (${response.status}).`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_PERSIST_BYTES) throw new Error('Generated image is too large to persist.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_PERSIST_BYTES) throw new Error('Generated image is too large to persist.');
  return {
    buffer,
    contentType: String(response.headers.get('content-type') || 'image/png').split(';')[0].trim().toLowerCase()
  };
}

function extensionFor(contentType) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/webp') return 'webp';
  return 'png';
}

async function persistImages(req, skillId, images) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !Array.isArray(images) || !images.length) return images;
  const session = await getSession(req);
  const userId = safeUserSegment(session?.user?.id);
  if (!userId) return images;

  const { put } = await import('@vercel/blob');
  const skill = safeSkillSegment(skillId);

  return Promise.all(images.map(async (image, index) => {
    try {
      const binary = await imageToBinary(image?.url);
      if (!binary) return image;
      const pathname = `users/${userId}/${skill}/${Date.now()}-${index + 1}-${randomUUID()}.${extensionFor(binary.contentType)}`;
      const blob = await put(pathname, binary.buffer, {
        access: 'private',
        addRandomSuffix: false,
        contentType: binary.contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      const storedPath = String(blob?.pathname || pathname);
      return {
        ...image,
        url: `/api/media?pathname=${encodeURIComponent(storedPath)}`,
        persisted: true
      };
    } catch (error) {
      console.warn('Private image persistence skipped:', error.message);
      return image;
    }
  }));
}

function wrapImageHandler(handler, skillId) {
  return async function storedImageHandler(req, res) {
    const originalEnd = res.end.bind(res);
    let captured = null;

    res.end = (chunk, encoding, callback) => {
      captured = { chunk, encoding, callback };
      return res;
    };

    await handler(req, res);
    res.end = originalEnd;

    if (!captured) return originalEnd();
    if (res.statusCode !== 200) return originalEnd(captured.chunk, captured.encoding, captured.callback);

    try {
      const text = Buffer.isBuffer(captured.chunk) ? captured.chunk.toString('utf8') : String(captured.chunk || '');
      const payload = JSON.parse(text);
      if (payload?.success && Array.isArray(payload.images)) {
        payload.images = await persistImages(req, skillId, payload.images);
        if (typeof res.removeHeader === 'function') res.removeHeader('content-length');
        return originalEnd(JSON.stringify(payload), captured.encoding, captured.callback);
      }
    } catch (error) {
      console.warn('Image response persistence wrapper skipped:', error.message);
    }

    return originalEnd(captured.chunk, captured.encoding, captured.callback);
  };
}

module.exports = {
  generateProductPhotos: wrapImageHandler(baseRuntime.generateProductPhotos, 'product-photo'),
  generateWorldCheckin: wrapImageHandler(baseRuntime.generateWorldCheckin, 'world-checkin'),
  generatePortrait: wrapImageHandler(baseRuntime.generatePortrait, 'premium-portrait-enhancer'),
  generateTryon: wrapImageHandler(baseRuntime.generateTryon, 'virtual-tryon')
};
