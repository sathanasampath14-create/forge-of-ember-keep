/* Stage 1C: pour into the mould. Poured fraction -> training set, leftover -> validation set (words hidden until the report). */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, P = C.pour, p = null;
  F.scenes = F.scenes || {};
  var PB = { x: 380, y: 440, w: 200, h: 64 };
  function finalize() {
    var run = F.State.run, res = F.Rules.pour(run.cleaned, p.fill, F.RNG.create(run.seed ^ 0x9047));
    run.train = res.train; run.val = res.val; p.res = res; p.phase = 'done';
  }
  F.scenes.pour = {
    enter: function () {
      var run = F.State.run, L = run.level, notes = [];
      if (run.cleaned.length < P.minTotal) { // edge case: too little ore after heating
        var need = P.minTotal - run.cleaned.length;
        run.cleaned = run.cleaned.concat(F.Rules.scavenge(L, F.RNG.create(run.seed ^ 0x5CA7), need));
        notes.push('The fire left too little ore, so ' + need + ' pure pieces were scavenged.');
      }
      p = { fill: 0, phase: 'pour', holding: false, res: null, notes: notes, N: run.cleaned.length };
      this.btn = [
        { x: 620, y: 446, w: 220, h: 52, label: 'Done pouring', enabled: function () { return p.phase === 'pour' && p.fill > 0; }, fn: finalize },
        { x: 380, y: 450, w: 200, h: 50, label: 'To the anvil', enabled: function () { return p.phase === 'done'; }, fn: function () { F.go('hammer'); } }
      ];
    },
    update: function (dt) {
      p.holding = p.phase === 'pour' && ((mouseIsPressed && UI.hit(PB, mouseX, mouseY)) || keyIsDown(32) || keyIsDown(40));
      if (p.holding) p.fill = Math.min(P.maxFill, p.fill + P.rate * dt);
    },
    draw: function () {
      UI.bg(); UI.txt('Pour the ore into the mould', 480, 50, 32, UI.COL.gold, CENTER);
      UI.txt('Poured ore shapes the sword; leftover ore stays in the bucket.', 480, 80, 16, UI.COL.ink, CENTER);
      var N = p.N, i;
      if (p.phase === 'pour') {
        var poured = Math.floor(Math.min(p.fill, 1) * N), left = N - poured;
        push(); strokeWeight(3); UI.ss(UI.COL.line); UI.sf([55, 45, 55]); quad(70, 150, 290, 150, 255, 380, 105, 380); pop();
        for (i = 0; i < left; i++) UI.ore(120 + (i % 8) * 20, 360 - Math.floor(i / 8) * 20, 'PURE', 6);
        UI.txt('In the bucket: ' + left, 180, 410, 18, UI.COL.ink, CENTER);
        if (p.holding) { stroke(255, 140, 30); strokeWeight(6); line(290, 170, 420, 250); }
        UI.drawSword(660, 280, 400, { fillFrac: Math.min(p.fill, 1) / 1.0 });
        UI.txt('In the mould: ' + poured, 660, 345, 18, UI.COL.ink, CENTER);
        noStroke(); UI.sf([50, 44, 58]); rect(470, 372, 380, 18, 6); UI.sf(p.fill > 1 ? UI.COL.red : UI.COL.ember); rect(470, 372, 380 * Math.min(p.fill, P.maxFill) / P.maxFill, 18, 6);
        stroke(255); strokeWeight(2); line(470 + 380 / P.maxFill, 366, 470 + 380 / P.maxFill, 396);
        UI.txt('FULL', 470 + 380 / P.maxFill, 412, 13, UI.COL.ink, CENTER);
        UI.txt(Math.round(p.fill * 100) + '%' + (p.fill > 1 ? '  OVERFLOW! Ore is spilling!' : ''), 470, 412, 15, p.fill > 1 ? UI.COL.red : UI.COL.ink);
        strokeWeight(3); UI.ss(UI.COL.gold); UI.sf(p.holding ? [255, 200, 90] : [200, 100, 30]); rect(PB.x, PB.y, PB.w, PB.h, 10);
        UI.txt('HOLD TO POUR', PB.x + PB.w / 2, PB.y + 24, 20, [20, 12, 8], CENTER, CENTER); UI.txt('(or hold SPACE)', PB.x + PB.w / 2, PB.y + 46, 13, [20, 12, 8], CENTER, CENTER);
        UI.drawButtons([this.btn[0]]);
        UI.txt('Hold to pour, release to stop. ENTER = done. P = pause', 480, 528, 14, UI.COL.dim, CENTER);
      } else {
        UI.drawSword(480, 240, 560, { base: [95, 90, 100] });
        UI.txt('A plain, blank sword. Time to shape it.', 480, 340, 18, UI.COL.ink, CENTER);
        var run = F.State.run;
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
