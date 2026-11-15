/* Stage 1C: pour into the mould. Poured fraction -> training set, leftover -> validation set (words hidden until the report).
   The falling ore, tilting bucket and sparks are cosmetic; the real split is Forge.Rules.pour. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, P = C.pour, p = null;
  F.scenes = F.scenes || {};
  var PB = { x: 110, y: 450, w: 210, h: 64 }, PIV = { x: 400, y: 175 }, SW = { x: 660, y: 335, L: 420 };
  function finalize() {
    var run = F.State.run, res = F.Rules.pour(run.cleaned, p.fill, F.RNG.create(run.seed ^ 0x9047));
    run.train = res.train; run.val = res.val; p.res = res; p.phase = 'done';
  }
  function spark(x, y, n) { for (var i = 0; i < n; i++) p.sparks.push({ x: x, y: y, vx: (p.rng.next() - 0.5) * 220, vy: -p.rng.next() * 220, life: 0.5, col: [255, 170 + p.rng.next() * 60, 50] }); }
  F.scenes.pour = {
    enter: function () {
      var run = F.State.run, L = run.level, notes = [];
      if (run.cleaned.length < P.minTotal) { // edge case: too little ore after heating
        var need = P.minTotal - run.cleaned.length;
        run.cleaned = run.cleaned.concat(F.Rules.scavenge(L, F.RNG.create(run.seed ^ 0x5CA7), need));
        notes.push('The fire left too little ore, so ' + need + ' pure pieces were scavenged.');
      }
      p = { fill: 0, phase: 'pour', holding: false, res: null, notes: notes, N: run.cleaned.length, tilt: 0, parts: [], sparks: [], acc: 0, rng: F.RNG.create(run.seed ^ 0xA11) };
      this.btn = [
        { x: 730, y: 468, w: 170, h: 44, label: 'Done pouring', enabled: function () { return p.phase === 'pour' && p.fill > 0; }, fn: finalize },
        { x: 380, y: 450, w: 200, h: 50, label: 'To the anvil', enabled: function () { return p.phase === 'done'; }, fn: function () { F.go('hammer'); } }
      ];
    },
    update: function (dt) {
      var cl = F.State.run.cleaned, i;
      p.holding = p.phase === 'pour' && ((mouseIsPressed && UI.hit(PB, mouseX, mouseY)) || keyIsDown(32) || keyIsDown(40));
      p.tilt += ((p.holding ? 1 : 0) - p.tilt) * Math.min(1, dt * 6);
      if (p.holding && p.fill < P.maxFill) {
        p.fill = Math.min(P.maxFill, p.fill + P.rate * dt);
        p.acc += dt * P.rate * p.N;
        while (p.acc >= 1) {
          p.acc -= 1; var over = p.fill > 1;
          p.parts.push({ x: PIV.x, y: PIV.y, vx: (over ? 250 : 110) + p.rng.next() * 70, vy: -70 - p.rng.next() * 30, rot: 0, w: (p.rng.next() - 0.5) * 12, seed: p.rng.next() * 1000, over: over, type: cl[p.rng.int(cl.length)].type });
        }
      }
      p.parts = p.parts.filter(function (q) {
        q.vy += 800 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.w * dt;
        if (!q.over && q.y >= SW.y - 10 && q.x > SW.x - 0.44 * SW.L) { spark(q.x, q.y, 4); return false; }
        if (q.y >= 490) { spark(q.x, 490, 2); return false; }
        return true;
      });
      p.sparks = p.sparks.filter(function (q) { q.life -= dt; q.vy += 600 * dt; q.x += q.vx * dt; q.y += q.vy * dt; return q.life > 0; });
    },
    draw: function () {
      UI.bg(); UI.txt('Pour the ore into the mould', 480, 50, 32, UI.COL.gold, CENTER);
      UI.txt('Poured ore shapes the sword; leftover ore stays in the bucket.', 480, 80, 16, UI.COL.ink, CENTER);
      var N = p.N, i, run = F.State.run;
      if (p.phase === 'pour') {
        var poured = Math.floor(Math.min(p.fill, 1) * N), left = N - poured;
        noStroke(); UI.sf([70, 46, 26]); rect(414, 175, 12, 240); rect(380, 408, 80, 10);          // wooden post
        UI.sf([86, 60, 36]); rect(430, 395, 460, 16, 3); rect(450, 411, 12, 60); rect(860, 411, 12, 60); // bench
        UI.sf([70, 62, 72]); stroke(30, 26, 32); strokeWeight(3); rect(440, 275, 440, 120, 8);   // stone mould block
        var glow = p.holding ? 1 : Math.min(1, p.fill);
        noStroke(); UI.sf([255, 120, 30], 40 * glow); ellipse(SW.x, SW.y, 520, 160);
        UI.drawSword(SW.x, SW.y, SW.L, { base: [40, 34, 40], fillFrac: Math.min(p.fill, 1), liquid: [255, 140 + 40 * Math.sin(millis() / 150), 40] });
        push(); translate(PIV.x, PIV.y); rotate(p.tilt * 0.95); strokeJoin(ROUND); strokeWeight(3); UI.ss([40, 36, 44]); UI.sf([112, 102, 118]);
        quad(-150, 0, 0, 0, -30, 170, -120, 170);
        for (i = 0; i < left; i++) UI.ore(-122 + (i % 6) * 17 + (Math.floor(i / 6) % 2) * 8, 150 - Math.floor(i / 6) * 14, run.cleaned[i].type, 8, i * 13 + 2);
        UI.sf([70, 62, 74]); noStroke(); rect(-147, 20, 146, 12); rect(-128, 100, 98, 10);
        noFill(); strokeWeight(4); UI.ss([40, 36, 44]); arc(-150, 20, 40, 60, HALF_PI, PI + HALF_PI);
        pop();
        p.parts.forEach(function (q) { UI.ore(q.x, q.y, q.type, 8, q.seed, q.rot); });
        noStroke(); p.sparks.forEach(function (q) { UI.sf(q.col, 255 * q.life / 0.5); ellipse(q.x, q.y, 4, 4); });
        UI.txt('In the bucket: ' + left, 235, 435, 18, UI.COL.ink, CENTER);
        UI.txt('In the mould: ' + poured, 660, 265, 18, UI.COL.ink, CENTER);
        noStroke(); UI.sf([50, 44, 58]); rect(440, 428, 380, 16, 6); UI.sf(p.fill > 1 ? UI.COL.red : UI.COL.ember); rect(440, 428, 380 * Math.min(p.fill, P.maxFill) / P.maxFill, 16, 6);
        stroke(255); strokeWeight(2); var fx = 440 + 380 / P.maxFill; line(fx, 422, fx, 450);
        UI.txt('FULL', fx, 466, 13, UI.COL.ink, CENTER);
        UI.txt(Math.round(p.fill * 100) + '%' + (p.fill > 1 ? '  OVERFLOW! Ore is spilling!' : ''), 440, 480, 15, p.fill > 1 ? UI.COL.red : UI.COL.ink);
        strokeWeight(3); UI.ss(UI.COL.gold); UI.sf(p.holding ? [255, 200, 90] : [200, 100, 30]); rect(PB.x, PB.y, PB.w, PB.h, 10);
        UI.txt('HOLD TO POUR', PB.x + PB.w / 2, PB.y + 24, 20, [20, 12, 8], CENTER, CENTER); UI.txt('(or hold SPACE)', PB.x + PB.w / 2, PB.y + 46, 13, [20, 12, 8], CENTER, CENTER);
        UI.drawButtons([this.btn[0]]);
        UI.txt('Hold to pour, release to stop. ENTER = done. P = pause', 480, 530, 14, UI.COL.ink, CENTER);
      } else {
        UI.drawSword(480, 230, 560, { base: [95, 90, 100] });
        UI.txt('A plain, blank sword. Time to shape it.', 480, 340, 18, UI.COL.ink, CENTER);
        UI.txt('In the sword: ' + run.train.length + ' ore     Left in the bucket: ' + run.val.length + ' ore', 480, 375, 18, UI.COL.gold, CENTER);
        UI.wrap(p.notes.concat(p.res.msgs).join(' '), 180, 395, 600, 50, 15, UI.COL.ember, CENTER);
        UI.drawButtons([this.btn[1]]);
      }
    },
    mousePressed: function (mx, my) { UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) {
      if (kc === F.K.ENTER) { if (p.phase === 'pour' && p.fill > 0) finalize(); else if (p.phase === 'done') F.go('hammer'); }
    }
  };
})();
