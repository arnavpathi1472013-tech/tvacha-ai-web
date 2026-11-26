import test from 'node:test'; import assert from 'node:assert/strict';
import { checkReport, analyze } from '../src/ai-provider.js'; import worker from '../src/index.js';
const good = { overview: { summary: 's' }, possibilities: [], care: {}, attention: { level: 'routine' } };

test('valid report passes', () => assert.equal(checkReport(good), good));
test('null report rejected', () => assert.throws(() => checkReport(null)));
test('unknown attention level rejected', () => assert.throws(() => checkReport({ ...good, attention: { level: 'urgent' } })));
test('possibilities must be an array', () => assert.throws(() => checkReport({ ...good, possibilities: 'x' })));
test('missing summary rejected', () => assert.throws(() => checkReport({ ...good, overview: {} })));
test('no API key gives labelled demo mode', async () => assert.equal((await analyze('AAAA', {}, {})).mode, 'demo'));
test('unknown provider is rejected', async () => await assert.rejects(analyze('AAAA', {}, { AI_API_KEY: 'k', AI_PROVIDER: 'nope' })));

const call = (body, method = 'POST') => worker.fetch(new Request('https://x/api/analyze', { method, body: body && JSON.stringify(body) }), { ASSETS: {} });
test('GET is rejected', async () => assert.equal((await call(null, 'GET')).status, 405));
test('missing consent is rejected', async () => assert.equal((await call({ image: 'AAAA' })).status, 400));
test('non-base64 image is rejected', async () => assert.equal((await call({ image: '<x>', consent: true })).status, 400));
test('oversized image is rejected', async () => assert.equal((await call({ image: 'A'.repeat(4e6 + 1), consent: true })).status, 400));
test('valid request without key returns demo', async () => { const r = await call({ image: 'AAAA', consent: true }); assert.equal(r.status, 200); assert.equal((await r.json()).mode, 'demo'); });
