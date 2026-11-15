/* Run with: node tests/regression.test.js */
'use strict';
var assert = require('assert');
require('../js/rng.js'); require('../js/regression.js'); require('../js/levels.js');
var F = globalThis.Forge, R = F.Reg, passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

test('RNG is reproducible and differs between seeds', function () {
  var a = F.RNG.create(5), b = F.RNG.create(5), c = F.RNG.create(6);
  for (var i = 0; i < 20; i++) assert.strictEqual(a.next(), b.next());
  assert.notStrictEqual(F.RNG.create(5).next(), c.next());
});

test('fit recovers a known cubic exactly (noise-free)', function () {
  var g = function (x) { return 0.5 - x + 2 * x * x - 0.7 * x * x * x; }, pts = [];
  for (var i = 0; i < 30; i++) { var x = -1 + 2 * i / 29; pts.push({ x: x, y: g(x) }); }
  var m = R.fit(pts, 3);
  for (var t = -1; t <= 1; t += 0.05) assert.ok(Math.abs(R.predict(m, t) - g(t)) < 1e-5, 'mismatch at ' + t);
});

test('R^2 is about 1 for noise-free data', function () {
  var pts = [];
  for (var i = 0; i < 40; i++) { var x = -1 + 2 * i / 39; pts.push({ x: x, y: 0.7 * Math.sin(2.5 * x) }); }
  assert.ok(R.r2(R.fit(pts, 9), pts) > 0.99999);
});

test('high degree on few points: near-perfect training R^2, poor validation R^2', function () {
  var L = F.LEVELS[2], rng = F.RNG.create(42), tr = [], va = [], i, x;
  for (i = 0; i < 8; i++) { x = rng.range(-1, 1); tr.push({ x: x, y: L.f(x) + L.sigma * rng.normal() }); }
  for (i = 0; i < 200; i++) { x = rng.range(-1, 1); va.push({ x: x, y: L.f(x) + L.sigma * rng.normal() }); }
  var m = R.fit(tr, 12), T = R.r2(m, tr), V = R.r2(m, va);
  assert.ok(T > 0.999, 'train ' + T); assert.ok(V < T - 0.3, 'val ' + V);
});

test('guards: empty data, one point, effective degree cap, accuracy clamp', function () {
  assert.strictEqual(R.predict(R.fit([], 5), 0.3), 0);
  assert.strictEqual(R.r2(R.fit([], 5), []), 0);
  var m = R.fit([{ x: 0, y: 1 }], 6); assert.strictEqual(m.degree, 0); assert.ok(Math.abs(R.predict(m, 0.5) - 1) < 1e-6);
  var pts = [{ x: -1, y: 0 }, { x: 0, y: 5 }, { x: 1, y: 0 }];
  assert.strictEqual(R.fit(pts, 12).degree, 2);
  assert.ok(R.accuracy(R.fit(pts, 0), [{ x: 0, y: 9 }, { x: 1, y: -9 }]) >= 0);
});

test('heating rules: green removes all impure, cold keeps some, hot burns good ore', function () {
  var pts = [], i;
  for (i = 0; i < 30; i++) pts.push({ x: 0, y: 0, type: i < 20 ? 'PURE' : (i < 25 ? 'CRACKED' : 'FAKE') });
  var g = F.Rules.applyHeat(pts, 0.5, F.RNG.create(1));
  assert.strictEqual(g.kept.length, 20); assert.strictEqual(g.removed, 10); assert.strictEqual(g.burned, 0);
  var c = F.Rules.applyHeat(pts, 0.1, F.RNG.create(1)); assert.ok(c.kept.length >= 20);
  var h = F.Rules.applyHeat(pts, 1.0, F.RNG.create(1)); assert.strictEqual(h.burned, 12); assert.strictEqual(h.kept.length, 8);
});

test('pour rules: guards on training/validation size and spill', function () {
  var pts = []; for (var i = 0; i < 20; i++) pts.push({ x: i / 20, y: 0, type: 'PURE' });
  var a = F.Rules.pour(pts, 0.0, F.RNG.create(2)); assert.strictEqual(a.train.length, 6); assert.strictEqual(a.val.length, 14);
  var b = F.Rules.pour(pts, 1.0, F.RNG.create(2)); assert.strictEqual(b.val.length, 5);
  var s = F.Rules.pour(pts, 1.2, F.RNG.create(2)); assert.strictEqual(s.spilled, 2); assert.strictEqual(s.train.length + s.val.length, 18);
  var r = F.Rules.pour(pts, 0.5, F.RNG.create(2)); assert.strictEqual(r.train.length, 10);
});

console.log('\n' + passed + ' tests passed');
