/* All tunable constants (CONFIG), the three levels, and pure game rules (no p5 here, so Node can run them). */
(function () {
  'use strict';
  var F = (globalThis.Forge = globalThis.Forge || {});

  var CONFIG = {
    W: 960, H: 540,
    ore:    { duration: 40, fallSpeed: 230, cartSpeed: 520, cartW: 96, minCaught: 12, xMin: 70, xMax: 890 },
    heat:   { sweepSeconds: 3.5, greenLo: 0.45, greenHi: 0.60, coldRemoveMax: 0.8, burnMax: 0.6 },
    pour:   { rate: 0.25, spillFraction: 0.10, minTrain: 6, minVal: 5, minTotal: 14, maxFill: 1.25 },
    hammer: { minDegree: 1, maxDegree: 12, period: 1.2, comboMax: 50, comboPerHit: 10 },
    // Outcome thresholds (Phase 3 uses these). T=training %, V=validation %, G=T-V.
    outcome: { goodV: 70, goodGapMax: 15, overT: 75, mildGapMax: 35,
               goodPoints: 1000, overfitFloor: 300, overfitSlope: 15, masterBonus: 100 },
    battle: { testPoints: 150, durability: 100, damageScale: 40, testSeedOffset: 777,
              ranges: { scout: [-1, -0.33], armored: [-0.33, 0.33], captain: [0.33, 1], boss: [-1.1, 1.1] } }
  };
  F.CONFIG = CONFIG;

  F.LEVELS = [
    { id: 1, name: 'Apprentice', blurb: 'Plenty of ore, mostly clean. A gentle start.',
      f: function (x) { return 0.6 * x * x * x - 0.4 * x; }, formula: '0.6x^3 - 0.4x',
      sigma: 0.05, mix: [0.85, 0.15, 0.0], oreCount: 40, seed: 1101 },
    { id: 2, name: 'Journeyman', blurb: 'A wavier shape and much more flawed ore.',
      f: function (x) { return 0.7 * Math.sin(2.5 * x); }, formula: '0.7 sin(2.5x)',
      sigma: 0.15, mix: [0.60, 0.40, 0.0], oreCount: 40, seed: 2202 },
    { id: 3, name: 'Master', blurb: 'Scarce ore, flawed ore and fake gold. Be careful!',
      f: function (x) { return 0.5 * Math.sin(3.5 * x) + 0.3 * x; }, formula: '0.5 sin(3.5x) + 0.3x',
      sigma: 0.2, mix: [0.50, 0.35, 0.15], oreCount: 35, seed: 3303 }
  ];

  var Rules = {};
  Rules.isPure = function (p) { return p.type === 'PURE'; };

  // Pre-draw everything random about one ore piece so its y value is fixed once x is known.
  Rules.makeSpec = function (L, rng) {
    var r = rng.next(), type = r < L.mix[0] ? 'PURE' : (r < L.mix[0] + L.mix[1] ? 'CRACKED' : 'FAKE');
    return { type: type, z: rng.normal(), off: (rng.next() < 0.5 ? -1 : 1) * (1.5 + rng.next()) };
  };
  // y = f(x) + noise by type. CRACKED: 3*sigma. FAKE: outlier offset of +/-1.5..2.5 (plus normal noise).
  Rules.yOf = function (L, x, sp) {
    var f = L.f(x);
    if (sp.type === 'CRACKED') return f + 3 * L.sigma * sp.z;
    if (sp.type === 'FAKE') return f + sp.off + L.sigma * sp.z;
    return f + L.sigma * sp.z;
  };
  Rules.scavenge = function (L, rng, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var x = rng.range(-1, 1);
      out.push({ x: x, y: L.f(x) + L.sigma * rng.normal(), type: 'PURE', scav: true });
    }
    return out;
  };

  // Stage 1B. t = stop position in [0,1]. Returns kept points and a summary.
  Rules.applyHeat = function (points, t, rng) {
    var H = CONFIG.heat, kept = [], removed = 0, burned = 0, verdict, i;
    var impure = points.filter(function (p) { return !Rules.isPure(p); }).length;
    if (t < H.greenLo) {
      verdict = 'cold';
      var pr = H.coldRemoveMax * t / H.greenLo;
      points.forEach(function (p) { if (!Rules.isPure(p) && rng.next() < pr) removed++; else kept.push(p); });
    } else {
      verdict = t <= H.greenHi ? 'perfect' : 'hot';
      var good = points.filter(Rules.isPure);
      removed = impure;
      var frac = t > H.greenHi ? Math.min(H.burnMax, (t - H.greenHi) / (1 - H.greenHi) * H.burnMax) : 0;
      burned = Math.round(frac * good.length);
      var idx = rng.shuffle(good.map(function (_, k) { return k; })), burnSet = {};
      for (i = 0; i < burned; i++) burnSet[idx[i]] = true;
      kept = good.filter(function (_, k) { return !burnSet[k]; });
    }
    return { kept: kept, removed: removed, burned: burned, impure: impure, verdict: verdict };
  };

  // Stage 1C. fill in [0, maxFill]. Poured fraction -> training set; leftover -> validation set.
  Rules.pour = function (cleaned, fill, rng) {
    var P = CONFIG.pour, pts = cleaned.slice(), msgs = [], spilled = 0;
    rng.shuffle(pts);
    if (fill > 1) { spilled = Math.round(P.spillFraction * pts.length); pts = pts.slice(spilled); }
    var N = pts.length, k = Math.floor(Math.min(fill, 1) * N + 1e-9);
    if (k < P.minTrain) { k = P.minTrain; msgs.push('You poured very little, so a few more pieces went into the mould.'); }
    if (N - k < P.minVal) { k = N - P.minVal; msgs.push('You poured almost everything, so a few pieces were kept back in the bucket.'); }
    if (spilled) msgs.unshift('Ore spilled over the edge! ' + spilled + ' pieces were lost.');
    return { train: pts.slice(0, k), val: pts.slice(k), spilled: spilled, msgs: msgs };
  };

  F.Rules = Rules;
})();
