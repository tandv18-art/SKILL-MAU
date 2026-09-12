module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL);
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, databaseConfigured: hasDatabaseUrl });
};
