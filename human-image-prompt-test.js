const assert = require('node:assert/strict');

global.fetch = () => { throw new Error('Provider/API calls are forbidden in this test.'); };

const {
  buildProductPrompt,
  buildWorldCheckinPrompt,
  buildPortraitPrompt,
  buildTryonPrompt
} = require('./server');

const world = buildWorldCheckinPrompt('Kyoto', 'golden hour', 'Keep the pose natural');
assert.equal(world, `Create premium, realistic travel photography from the supplied reference image. Preserve the subject's recognizable identity, distinctive facial features, age range, ethnicity, and natural body proportions. Do not materially alter body size, height, or facial structure. Adapt the subject naturally to the destination through clothing, hairstyle, pose, posture, expression, accessories, camera angle, lighting, weather, time of day, and travel atmosphere. The subject must look genuinely photographed at the destination, not pasted onto a background. Ensure realistic perspective, believable scale, natural ground contact, coherent lighting and shadows, atmospheric depth, natural color, clean edges, and premium realistic travel photography. User instructions override these defaults when compatible with identity preservation.
Destination: Kyoto; preset: golden hour; extra instruction: Keep the pose natural.`);

const portrait = buildPortraitPrompt('editorial', 'Use a neutral background');
assert.equal(portrait, `Enhance the supplied portrait into premium realistic photography. Strictly preserve recognizable identity, face, distinctive features, age range, ethnicity, and natural body proportions. Improve only scene-appropriate lighting, color, framing, natural skin and hair detail, background integration, and mild photographic polish. Never replace the face, reshape the face or body, or cause generic beauty-face drift.
Preset: editorial; user instruction: Use a neutral background.`);

const tryon = buildTryonPrompt('Keep the original accessories');
assert.equal(tryon, `Create one premium realistic portrait of the supplied person wearing the supplied garment. Strictly preserve the person's recognizable identity, face, distinctive features, age range, ethnicity, and natural body proportions. Strictly preserve the garment type, cut, color, material, pattern, trim, logos, and visible details. Make fit, drape, seams, folds, tension, layering, occlusion, body contact, perspective, lighting, shadows, and edges physically coherent. Never replace or reshape the person and never invent or alter garment details.
User instruction: Keep the original accessories.`);

const product = buildProductPrompt('Studio', 'Góc 45°', '', '');
assert.equal(product, 'Create premium, realistic commercial product photography from the supplied reference image. Treat the product as the source of truth. Strictly preserve its identity, shape, proportions, colors, material appearance, logo, labels, packaging, and visible design details. You may change only camera angle, crop, composition, placement, lighting, background, studio or lifestyle scene, close-up presentation, and advertising layout. Never invent product features, claims, accessories, labels, text, materials, certifications, or packaging details.\nUser priorities: scene/style: Studio; camera angle: Góc 45°; intended use: not specified; extra instruction: none. Follow these user choices wherever they do not conflict with strict product preservation.');

const source = require('node:fs').readFileSync(require.resolve('./server'), 'utf8');
assert.ok(source.includes("process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'"));
assert.ok(source.includes("process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'"));
assert.ok(source.includes('`${baseUrl}/images/edits`'));
assert.ok(source.includes("process.env.OPENAI_TEXT_MODEL || 'gpt-5-mini'"));

console.log('Human-image prompt regression test passed without provider/API calls.');
