const { randomUUID } = require('node:crypto');

const CONFIG_PREFIX = 'site/hero-config/';
const IMAGE_PREFIX = 'site/hero/';
const DEFAULT_SLIDES = Object.freeze([
  { id: 'default-world-checkin', src: '/assets/hero-world-checkin.svg', title: '', enabled: true, position: 'center' }
]);

function blobAuthOptions() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return { token: process.env.BLOB_READ_WRITE_TOKEN };
  if (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID) {
    return { oidcToken: process.env.VERCEL_OIDC_TOKEN, storeId: process.env.BLOB_STORE_ID };
  }
  return {};
}

function safeText(value, max = 80) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function safeSrc(value) {
  const src = String(value || '').trim();
  if (src === '/assets/hero-world-checkin.svg') return src;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeSlide(input, index = 0) {
  const src = safeSrc(input?.src);
  if (!src) return null;
  const position = ['left', 'center', 'right'].includes(input?.position) ? input.position : 'center';
  return {
    id: safeText(input?.id, 100) || `slide-${index + 1}`,
    src,
    title: safeText(input?.title, 80),
    enabled: input?.enabled !== false,
    position
  };
}

function sanitizeSlides(input) {
  const rows = (Array.isArray(input) ? input : []).slice(0, 8)
    .map((item, index) => normalizeSlide(item, index))
    .filter(Boolean);
  return rows.length ? rows : DEFAULT_SLIDES.map(item => ({ ...item }));
}

async function loadHeroSlides() {
  try {
    const { list } = await import('@vercel/blob');
    const result = await list({ prefix: CONFIG_PREFIX, limit: 100, ...blobAuthOptions() });
    const blobs = Array.isArray(result?.blobs) ? [...result.blobs] : [];
    blobs.sort((a, b) => String(b.pathname || '').localeCompare(String(a.pathname || '')));
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
        if (!response.ok) continue;
        const payload = await response.json();
        const slides = sanitizeSlides(payload?.slides);
        if (slides.length) return slides;
      } catch {}
    }
  } catch (error) {
    console.warn('Hero config load failed:', error.message);
  }
  return DEFAULT_SLIDES.map(item => ({ ...item }));
}

async function saveHeroSlides(input) {
  const slides = sanitizeSlides(input);
  if (!slides.some(item => item.enabled)) {
    const error = new Error('Cần ít nhất một ảnh đang bật.');
    error.code = 'HERO_REQUIRES_ENABLED_SLIDE';
    throw error;
  }
  const { put } = await import('@vercel/blob');
  const pathname = `${CONFIG_PREFIX}${Date.now()}-${randomUUID()}.json`;
  await put(pathname, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), slides }), {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    ...blobAuthOptions()
  });
  return slides;
}

function extensionFor(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

async function uploadHeroImage(buffer, contentType) {
  const { put } = await import('@vercel/blob');
  const pathname = `${IMAGE_PREFIX}${Date.now()}-${randomUUID()}.${extensionFor(contentType)}`;
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    ...blobAuthOptions()
  });
  return { url: blob.url, pathname: blob.pathname };
}

function isManagedHeroUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.pathname.includes(`/${IMAGE_PREFIX}`) && /vercel-storage\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function deleteHeroImage(url) {
  if (!isManagedHeroUrl(url)) return false;
  const { del } = await import('@vercel/blob');
  await del(url, blobAuthOptions());
  return true;
}

module.exports = {
  DEFAULT_SLIDES,
  sanitizeSlides,
  loadHeroSlides,
  saveHeroSlides,
  uploadHeroImage,
  deleteHeroImage,
  isManagedHeroUrl
};
