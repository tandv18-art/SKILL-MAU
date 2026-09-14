const { generateWorldCheckin } = require('../lib/image-storage-runtime');
const { withUsageGate } = require('../lib/usage-gated-handler');
module.exports = withUsageGate(generateWorldCheckin, { kind: 'image', skillId: 'world-checkin' });
