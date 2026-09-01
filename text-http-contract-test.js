const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');

const SKILLS = ['facebook-post','tiktok-reel-post','multi-platform-product-description','long-to-short-post','thirty-day-content-plan','poster-thumbnail-brief','social-ad-creative-brief'];
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); });
const close = server => new Promise(resolve => server.close(resolve));

async function reservePort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function post(base, body) {
  const response = await fetch(`${base}/api/text-skill`, {method:'POST', headers:{'content-type':'application/json'}, body});
  return {status:response.status, body:await response.json()};
}

async function main() {
  const captured = [];
  let fail = false;
  const provider = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    captured.push({url:req.url, method:req.method, auth:req.headers.authorization, body:JSON.parse(body)});
    res.setHeader('content-type', 'application/json');
    if (fail) { fail = false; res.statusCode = 429; return res.end(JSON.stringify({error:{message:'private provider detail'}})); }
    res.end(JSON.stringify({choices:[{message:{content:'local deterministic output'}}]}));
  });
  const providerPort = await listen(provider);
  const appPort = await reservePort();
  const app = spawn(process.execPath, ['server.js'], {cwd:__dirname, env:{...process.env, PORT:String(appPort), OPENAI_API_KEY:'local-only-key', OPENAI_BASE_URL:`http://127.0.0.1:${providerPort}`}, stdio:['ignore','ignore','pipe']});
  let stderr = ''; app.stderr.on('data', data => { stderr += data; });
  const base = `http://127.0.0.1:${appPort}`;
  try {
    for (let i = 0; i < 100; i += 1) {
      try { if ((await fetch(`${base}/`)).status === 200) break; } catch {}
      if (i === 99) throw new Error('Local application server did not start.');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    for (const [index, skillId] of SKILLS.entries()) {
      const language = index % 2 ? 'en' : 'vi';
      const result = await post(base, JSON.stringify({skillId, input:`input ${skillId}`, language}));
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {success:true, output:'local deterministic output'});
      const request = captured.at(-1);
      assert.equal(request.url, '/chat/completions');
      assert.equal(request.method, 'POST');
      assert.equal(request.auth, 'Bearer local-only-key');
      assert.equal(request.body.messages[1].content, `input ${skillId}`);
      assert.match(request.body.messages[0].content, new RegExp(`Respond in language: ${language}\\.`));
      assert.ok(request.body.messages[0].content.length > 500, 'Shared policy and resolved SKILL.md must be loaded.');
      const missing = await post(base, JSON.stringify({skillId, input:'   ', language}));
      assert.equal(missing.status, 400);
      assert.deepEqual(missing.body, {success:false, error:'Input is required.'});
    }
    const beforeRejected = captured.length;
    assert.deepEqual(await post(base, JSON.stringify({skillId:'unknown', input:'x'})), {status:400, body:{success:false, error:'Unsupported text skill.'}});
    assert.deepEqual(await post(base, '{'), {status:400, body:{success:false, error:'Request processing failed.'}});
    assert.equal(captured.length, beforeRejected, 'Rejected requests must not reach provider.');
    fail = true;
    const failed = await post(base, JSON.stringify({skillId:SKILLS[0], input:'provider failure', language:'vi'}));
    assert.deepEqual(failed, {status:502, body:{success:false, error:'Request processing failed.'}});
    assert.ok(!JSON.stringify(failed).includes('private provider detail'));
    const beforeImage = captured.length;
    const invalidImage = await fetch(`${base}/api/product-photo`, {method:'POST', headers:{'content-type':'application/json'}, body:'{}'});
    assert.equal(invalidImage.status, 415);
    assert.deepEqual(await invalidImage.json(), {success:false, error:'Multipart form data is required.'});
    assert.equal(captured.length, beforeImage);
    const unsupported = await fetch(`${base}/api/not-a-route`);
    assert.equal(unsupported.status, 404);
    assert.deepEqual(await unsupported.json(), {success:false, error:'Not found.'});
    console.log('Text/HTTP contracts passed for 7 skills; all provider calls intercepted on 127.0.0.1.');
  } finally {
    app.kill('SIGTERM');
    await new Promise(resolve => app.once('exit', resolve));
    await close(provider);
  }
  assert.ok(stderr.includes('private provider detail'));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
