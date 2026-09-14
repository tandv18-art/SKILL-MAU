const { neon } = require('@neondatabase/serverless');
const { getSession } = require('./auth-session');

function database() {
  const url = String(process.env.TOILAAI_DATABASE_URL || '').trim();
  if (!url) {
    const error = new Error('Site owner database is not configured.');
    error.code = 'SITE_OWNER_DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return neon(url);
}

async function requireSiteOwner(req) {
  const session = await getSession(req);
  const userId = String(session?.user?.id || '').trim();
  if (!userId) return { ok: false, status: 401, error: 'Vui lòng đăng nhập.' };

  try {
    const sql = database();
    const rows = await sql`
      SELECT user_id
      FROM public.workspace_accounts
      ORDER BY created_at ASC, user_id ASC
      LIMIT 1
    `;
    const ownerId = String(rows?.[0]?.user_id || '').trim();
    if (!ownerId || ownerId !== userId) {
      return { ok: false, status: 403, error: 'Tài khoản này không có quyền quản trị trang chủ.' };
    }
    return { ok: true, session, userId };
  } catch (error) {
    console.error('Site owner check failed:', error.message);
    return { ok: false, status: 503, error: 'Không thể kiểm tra quyền quản trị lúc này.' };
  }
}

module.exports = { requireSiteOwner };
