/* Stage 1B: heat the ore (data cleaning). Rules live in Forge.Rules.applyHeat. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, H = C.heat, h = null, CX = 220, CY = 290, R = 115;
  F.scenes = F.scenes || {};
  function stop() {
    var run = F.State.run, res = F.Rules.applyHeat(run.caught, h.t, F.RNG.create(run.seed ^ 0x4EA7));
    run.heatT = h.t; run.cleaned = res.kept; h.res = res; h.phase = 'stopped';
  }
  function msg(r) {
    if (r.verdict === 'cold') return 'Too cold! Only some flawed ore burned off (' + r.removed + ' of ' + r.impure + '). The rest is still in your bucket.';
    if (r.verdict === 'hot') return 'Too hot! The flawed ore is gone, but ' + r.burned + ' good pieces burned away too.';
    return r.impure ? 'Just right! All ' + r.removed + ' flawed pieces burned off and every good piece survived.' : 'Just right! There was no flawed ore to remove.';
  }
  F.scenes.heat = {
    enter: function () {
      var run = F.State.run, before = run.caught;
      h = { phase: 'ready', t: 0, res: null, before: before,
            ymax: Math.max(1.0, before.reduce(function (m, p) { return Math.max(m, Math.abs(p.y)); }, 0) * 1.1) };
      this.btn = [
        { x: 100, y: 455, w: 240, h: 50, label: function () { return h.phase === 'running' ? 'STOP (click / Space)' : 'Start'; }, enabled: function () { return h.phase === 'ready' || h.phase === 'running'; }, fn: function () { if (h.phase === 'ready') { h.phase = 'running'; h.t = 0; } else if (h.phase === 'running') stop(); } },
        { x: 700, y: 455, w: 200, h: 50, label: 'Continue', enabled: function () { return h.phase === 'stopped'; }, fn: function () { F.note('heat', 'pour'); } }
      ];
    },
    update: function (dt) {
      if (h.phase === 'running') { h.t += dt / H.sweepSeconds; if (h.t >= 1) { h.t = 1; stop(); } }
    },
    draw: function () {
      UI.bg(); UI.txt('Heat the ore', 480, 50, 32, UI.COL.gold, CENTER);
      push(); strokeWeight(3); UI.ss(UI.COL.line); UI.sf([40, 34, 48]); ellipse(CX, CY, R * 2, R * 2);
      var a0 = -HALF_PI + H.greenLo * TWO_PI, a1 = -HALF_PI + H.greenHi * TWO_PI;
      noStroke(); UI.sf(UI.COL.green); arc(CX, CY, R * 2 - 6, R * 2 - 6, a0, a1, PIE);
      UI.sf([40, 34, 48]); ellipse(CX, CY, R * 1.1, R * 1.1);
      var ang = -HALF_PI + h.t * TWO_PI; strokeWeight(5); UI.ss(UI.COL.ember); line(CX, CY, CX + Math.cos(ang) * (R - 10), CY + Math.sin(ang) * (R - 10));
      pop();
      UI.txt('GREEN ZONE', CX - 78, CY + R + 22, 14, UI.COL.green);
      UI.txt(h.phase === 'ready' ? 'Press START, then click anywhere or press SPACE to stop the hand in the green zone.' : (h.phase === 'running' ? 'STOP IT IN THE GREEN!' : 'The hand stopped.'), CX, CY + R + 48, 15, UI.COL.ink, CENTER);
      UI.txt('Before heating', 565, 115, 16, UI.COL.dim, CENTER); UI.txt('After heating', 815, 115, 16, UI.COL.dim, CENTER);
      UI.scatter(h.before, 450, 125, 230, 190, { yMax: h.ymax });
      if (h.res) UI.scatter(h.res.kept, 700, 125, 230, 190, { yMax: h.ymax });
      else { UI.panel(700, 125, 230, 190); UI.txt('?', 815, 220, 40, UI.COL.dim, CENTER, CENTER); }
      UI.legend(560, 340);
      if (h.res) UI.wrap(msg(h.res) + '  Ore left: ' + h.res.kept.length + '.', 450, 365, 480, 80, 16, UI.COL.ink);
      UI.drawButtons(this.btn);
      UI.txt('Click or SPACE = stop the hand   P = pause', 480, 528, 14, UI.COL.dim, CENTER);
    },
    mousePressed: function (mx, my) { if (UI.clickButtons(this.btn, mx, my)) return; if (h.phase === 'running') stop(); },
    keyPressed: function (k, kc) {
      if (h.phase === 'ready' && kc === F.K.ENTER) { h.phase = 'running'; h.t = 0; }
      else if (h.phase === 'running' && kc === F.K.SPACE) stop();
      else if (h.phase === 'stopped' && kc === F.K.ENTER) F.note('heat', 'pour');
    }
  };
})();
