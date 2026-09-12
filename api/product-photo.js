const { generateProductPhotos } = require('../lib/image-storage-runtime');
const { withUsageGate } = require('../lib/usage-gated-handler');
module.exports = withUsageGate(generateProductPhotos, { kind: 'image', skillId: 'product-photo' });
