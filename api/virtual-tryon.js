const { generateTryon } = require('../lib/image-storage-runtime');
const { withUsageGate } = require('../lib/usage-gated-handler');
module.exports = withUsageGate(generateTryon, { kind: 'image', skillId: 'virtual-tryon' });
