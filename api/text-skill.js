const { runTextSkill } = require('../lib/skill-runtime');
const { withUsageGate } = require('../lib/usage-gated-handler');
module.exports = withUsageGate(runTextSkill, { kind: 'text' });
