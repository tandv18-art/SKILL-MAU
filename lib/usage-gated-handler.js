const {
  requireSkillAccess,
  recordUsage,
  reserveUsage,
  releaseUsageReservation
} = require('./account-gate');

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

    const resolvedSkillId = skillId || String(req.body?.skillId || 'text-skill');
    let reservation = null;
    if (access.entitlement?.enforcementEnabled) {
      try {
        reservation = await reserveUsage(access, { skillId: resolvedSkillId, kind, units: 1 });
      } catch (error) {
        console.error('Quota reservation failed before provider call:', error.message);
        return sendJson(res, 503, {
          success: false,
          code: 'ACCOUNT_UNAVAILABLE',
          error: 'Không thể giữ lượt sử dụng lúc này. Vui lòng thử lại sau.'
        });
      }
      if (!reservation?.ok) {
        return sendJson(res, 402, {
          success: false,
          code: 'LIMIT_REACHED',
          error: reservation?.reason || 'Đã hết hạn mức sử dụng.',
          entitlement: access.entitlement
        });
      }
    }

    const originalEnd = res.end.bind(res);
    let ending = false;
    res.end = function interceptedEnd(chunk, ...args) {
      if (ending) return res;
      ending = true;
      const success = successfulJson(Number(res.statusCode || 200), chunk);

      if (reservation?.active) {
        if (success) return originalEnd(chunk, ...args);
        Promise.resolve(releaseUsageReservation(reservation))
          .catch(error => console.error('Quota reservation release failed after provider error:', error.message))
          .finally(() => originalEnd(chunk, ...args));
        return res;
      }

      if (!success) return originalEnd(chunk, ...args);
      Promise.resolve(recordUsage(access, { skillId: resolvedSkillId, kind, units: 1 }))
        .catch(error => console.error('Usage write failed after provider success:', error.message))
        .finally(() => originalEnd(chunk, ...args));
      return res;
    };

    try {
      return await handler(req, res);
    } catch (error) {
      if (!ending) {
        res.end = originalEnd;
        if (reservation?.active) {
          try {
            await releaseUsageReservation(reservation);
          } catch (releaseError) {
            console.error('Quota reservation release failed after handler exception:', releaseError.message);
          }
        }
      }
      throw error;
    }
  };
}

module.exports = { withUsageGate };
