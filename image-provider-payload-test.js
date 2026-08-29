'use strict';

const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const {
  callImageProvider,
  readForm,
  resolveImageModel,
  createProductImageEditForm,
  createWorldImageEditForm,
  createPortraitImageEditForm,
  createTryonImageEditForm,
  buildProductPrompt,
  buildWorldCheckinPrompt,
  buildPortraitPrompt,
  buildTryonPrompt
} = require('./server');

const fixtureBytes = Uint8Array.from([0, 255, 17, 34, 128, 1, 2, 3]);
const makeFile = (name, type, suffix = []) => new File([fixtureBytes, Uint8Array.from(suffix)], name, { type });

async function assertFile(actual, expected, expectedName) {
  assert.ok(actual instanceof Blob);
  assert.equal(actual.name, expectedName);
  assert.equal(actual.type, expected.type);
  assert.equal(actual.size, expected.size);
  assert.deepEqual(new Uint8Array(await actual.arrayBuffer()), new Uint8Array(await expected.arrayBuffer()));
}

async function assertPayload({ form, fields, images }) {
  assert.deepEqual([...new Set(form.keys())].sort(), Object.keys(fields).concat(Object.keys(images)).sort());
  for (const [name, value] of Object.entries(fields)) assert.equal(form.get(name), value);
  for (const [name, expectedFiles] of Object.entries(images)) {
    const actualFiles = form.getAll(name);
    assert.equal(actualFiles.length, expectedFiles.length);
    for (let index = 0; index < expectedFiles.length; index++) await assertFile(actualFiles[index], expectedFiles[index].file, expectedFiles[index].name);
  }
}

(async () => {
  assert.equal(resolveImageModel({}), 'gpt-image-1.5');
  assert.equal(resolveImageModel({ OPENAI_IMAGE_MODEL: 'diagnostic-model' }), 'diagnostic-model');

  const product = makeFile('source-product.webp', 'image/webp');
  const person = makeFile('source-person.png', 'image/png');
  const portrait = makeFile('source-portrait.jpg', 'image/jpeg');
  const garment = makeFile('source-garment.webp', 'image/webp', [4, 5]);
  const env = { OPENAI_IMAGE_MODEL: 'diagnostic-model' };
  const productPrompt = buildProductPrompt('Studio', '45 degrees', 'catalog', 'clean');
  const worldPrompt = buildWorldCheckinPrompt('Seoul', 'natural', 'at dusk');
  const portraitPrompt = buildPortraitPrompt('editorial', 'soft light');
  const tryonPrompt = buildTryonPrompt('natural fit');

  const browserForm = new FormData();
  browserForm.set('image', person);
  const browserRequest = new Request('http://localhost/api/world-checkin', { method: 'POST', body: browserForm });
  const encodedBrowserBody = Buffer.from(await browserRequest.arrayBuffer());
  const incomingRequest = Readable.from(encodedBrowserBody);
  incomingRequest.url = '/api/world-checkin';
  incomingRequest.method = 'POST';
  incomingRequest.headers = {
    'content-type': browserRequest.headers.get('content-type'),
    'content-length': String(encodedBrowserBody.length)
  };
  const parsedBrowserForm = await readForm(incomingRequest);
  await assertFile(parsedBrowserForm.get('image'), person, 'source-person.png');

  await assertPayload({
    form: createProductImageEditForm(product, productPrompt, 3, env),
    fields: { model: 'diagnostic-model', prompt: productPrompt, n: '3', size: '1536x1024', quality: 'high' },
    images: { image: [{ file: product, name: 'source-product.webp' }] }
  });
  assert.equal(createProductImageEditForm(product, productPrompt, 3, env).has('input_fidelity'), false);
  await assertPayload({
    form: createWorldImageEditForm(person, worldPrompt, env),
    fields: { model: 'diagnostic-model', prompt: worldPrompt, n: '1', size: '1536x1024', quality: 'high', input_fidelity: 'high' },
    images: { image: [{ file: person, name: 'source-person.png' }] }
  });
  await assertPayload({
    form: createPortraitImageEditForm(portrait, portraitPrompt, env),
    fields: { model: 'diagnostic-model', prompt: portraitPrompt, n: '1', size: '1024x1536', quality: 'high', input_fidelity: 'high' },
    images: { image: [{ file: portrait, name: 'source-portrait.jpg' }] }
  });
  const tryonForm = createTryonImageEditForm(person, garment, tryonPrompt, env);
  await assertPayload({
    form: tryonForm,
    fields: { model: 'diagnostic-model', prompt: tryonPrompt, n: '1', size: '1024x1536', quality: 'high', input_fidelity: 'high' },
    images: { 'image[]': [{ file: person, name: 'source-person.png' }, { file: garment, name: 'source-garment.webp' }] }
  });

  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  const originalKey = process.env.OPENAI_API_KEY;
  let stubCalls = 0;
  process.env.OPENAI_BASE_URL = 'https://no-network.invalid/v1/';
  process.env.OPENAI_API_KEY = 'fixture-key';
  global.fetch = async (url, options) => {
    stubCalls++;
    assert.equal(url, 'https://no-network.invalid/v1/images/edits');
    assert.equal(options.method, 'POST');
    assert.deepEqual(Object.keys(options.headers), ['authorization']);
    assert.equal(options.body, tryonForm);
    throw new Error('FETCH_STUB_BLOCKED_PROVIDER_CALL');
  };
  await assert.rejects(callImageProvider(tryonForm, 'unused'), /FETCH_STUB_BLOCKED_PROVIDER_CALL/);
  assert.equal(stubCalls, 1);
  global.fetch = originalFetch;
  if (originalBaseUrl === undefined) delete process.env.OPENAI_BASE_URL; else process.env.OPENAI_BASE_URL = originalBaseUrl;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;

  console.log('Image provider payload diagnostics passed; throwing fetch stub blocked all provider traffic.');
})().catch(error => { console.error(error); process.exitCode = 1; });
