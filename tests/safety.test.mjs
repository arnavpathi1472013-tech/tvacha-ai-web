import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm';
const win = {}; vm.runInNewContext(fs.readFileSync('public/safety.js', 'utf8'), { window: win });
const Safety = win.Safety; const check = (t, k) => [...Safety.check(t, k)]; // copy: arrays from the vm realm fail strict deepEqual
Safety.signs = JSON.parse(fs.readFileSync('public/data/warning-signs.json', 'utf8'));

test('ticked warning signs are always returned', () => assert.deepEqual(check('', ['Difficulty breathing']), ['Difficulty breathing']));
test('detects throat swelling in free text', () => assert.equal(check('my throat is swelling', []).length, 1));
test('detects fever with spreading rash', () => assert.equal(check('fever and the rash is spreading fast', []).length, 1));
test('ordinary text raises no alarm', () => assert.deepEqual(check('itchy patch on my arm for a week', []), []));
test('empty or missing text is safe', () => { assert.deepEqual(check('', []), []); assert.deepEqual(check(undefined, []), []); });
test('same sign ticked and typed is reported once', () => assert.equal(check('severe pain', ['Severe, unbearable pain']).length, 1));
