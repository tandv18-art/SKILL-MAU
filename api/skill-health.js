module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), textModelConfigured: Boolean(process.env.OPENAI_TEXT_MODEL), imageModelConfigured: Boolean(process.env.OPENAI_IMAGE_MODEL || process.env.OPENAI_HUMAN_IMAGE_MODEL) });
};
