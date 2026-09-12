const { requireSkillAccess, recordUsage } = require('./account-gate');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

function successfulJson(statusCode, chunk) {
  if (statusCode < 200 || statusCode >= 300 || chunk == null) return false;
  try {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    const payload = JSON.parse(text);
    return payload?.success === true;
  } catch {
    return false;
  }
}

function serverUsageRecordingEnabled() {
  return String(process.env.SERVER_USAGE_RECORDING_ENABLED || '').toLowerCase() === 'true';
}

function withUsageGate(handler, { kind, skillId = null }) {
  return async function gatedHandler(req, res) {
    const access = await requireSkillAccess(req, kind);
    if (!access.ok) {
      return sendJson(res, access.status || 503, {
        success: false,
        code: access.status === 401 ? 'AUTH_REQUIRED' : access.status === 402 ? 'LIMIT_REACHED' : 'ACCOUNT_UNAVAILABLE',
        error: access.error,
        entitlement: access.entitlement || undefined
      });
    }

    if (!serverUsageRecordingEnabled()) return handler(req, res);

    const originalEnd = res.end.bind(res);
    let ending = false;
    res.end = function interceptedEnd(chunk, ...args) {
      if (ending) return res;
      ending = true;
      const success = successfulJson(Number(res.statusCode || 200), chunk);
      if (!success) return originalEnd(chunk, ...args);

      const resolvedSkillId = skillId || String(req.body?.skillId || 'text-skill');
      Promise.resolve(recordUsage(access, { skillId: resolvedSkillId, kind, units: 1 }))
        .catch(error => console.error('Usage write failed after provider success:', error.message))
        .finally(() => originalEnd(chunk, ...args));
      return res;
    };

    try {
      return await handler(req, res);
    } catch (error) {
      if (!ending) res.end = originalEnd;
      throw error;
    }
  };
}

module.exports = { withUsageGate };
