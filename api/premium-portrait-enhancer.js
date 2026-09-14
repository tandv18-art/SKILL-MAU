const { generatePortrait } = require('../lib/image-storage-runtime');
const { withUsageGate } = require('../lib/usage-gated-handler');
module.exports = withUsageGate(generatePortrait, { kind: 'image', skillId: 'premium-portrait-enhancer' });
