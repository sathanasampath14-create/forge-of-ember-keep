/* Stage 1A: catch the ore. Every caught piece becomes a data point (x = landing spot, y = f(x) + noise by type). */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, O = C.ore, CART_Y = 468, s = null;
  F.scenes = F.scenes || {};
  function toX(sx) { return Math.max(-1, Math.min(1, (sx - O.xMin) / (O.xMax - O.xMin) * 2 - 1)); }

  function finish() {
    var run = F.State.run, L = run.level, pts = s.caught.slice(), got = pts.length;
    if (got < O.minCaught) { // edge case: too little data, scavengers top it up
      var need = O.minCaught - got;
      pts = pts.concat(F.Rules.scavenge(L, F.RNG.create(L.seed ^ 0xBEEF), need));
      s.note = 'You caught only ' + got + ' pieces, so scavengers added ' + need + ' pure pieces.';
    }
    run.caught = pts; s.done = true;
    s.ymax = Math.max(1.0, pts.reduce(function (m, p) { return Math.max(m, Math.abs(p.y)); }, 0) * 1.1);
  }

  F.scenes.ore = {
    enter: function () {
      var run = F.State.run || F.State.startRun(0), L = run.level, rng = F.RNG.create(L.seed), n = L.oreCount, gap = O.duration / n, pieces = [];
      for (var i = 0; i < n; i++) {
        var spec = F.Rules.makeSpec(L, rng);
        pieces.push({ spec: spec, sx: rng.range(O.xMin, O.xMax), spawn: (i + 0.5) * gap + rng.range(-0.2, 0.2) * gap, y: -20, state: 'wait' });
      }
      s = { pieces: pieces, t: 0, cartX: 480, caught: [], missed: 0, done: false, note: '', ymax: 1 };
      var self = this; this.btn = [{ x: 380, y: 470, w: 200, h: 50, label: 'Continue', fn: function () { F.go('heat'); } }];
    },
    update: function (dt) {
      if (s.done) return;
      var L = F.State.run.level; s.t += dt;
      var dir = (keyIsDown(37) || keyIsDown(65) ? -1 : 0) + (keyIsDown(39) || keyIsDown(68) ? 1 : 0);
      s.cartX = Math.max(O.cartW / 2, Math.min(C.W - O.cartW / 2, s.cartX + dir * O.cartSpeed * dt));
      var open = 0;
      s.pieces.forEach(function (p) {
        if (p.state === 'wait' && s.t >= p.spawn) p.state = 'fall';
        if (p.state === 'fall' || p.state === 'lost') {
          p.y += O.fallSpeed * dt;
          if (p.state === 'fall' && p.y >= CART_Y - 14) {
            if (Math.abs(p.sx - s.cartX) <= O.cartW / 2 + 6) {
              var x = toX(p.sx); p.state = 'caught';
              s.caught.push({ x: x, y: F.Rules.yOf(L, x, p.spec), type: p.spec.type });
            } else { p.state = 'lost'; s.missed++; }
          }
          if (p.state === 'lost' && p.y > C.H + 30) p.state = 'gone';
        }
        if (p.state === 'wait' || p.state === 'fall' || p.state === 'lost') open++;
      });
      if (open === 0) finish();
    },
    draw: function () {
      var i;
      if (!s.done) {
        UI.bg(); noStroke(); fill(30, 24, 38); triangle(0, 500, 220, 360, 440, 500); triangle(300, 500, 600, 330, 900, 500);
        s.pieces.forEach(function (p) { if (p.state === 'fall' || p.state === 'lost') UI.ore(p.sx, p.y, p.spec.type, 12); });
        var cx = s.cartX; strokeWeight(3); UI.ss(UI.COL.gold); UI.sf([120, 80, 50]);
        quad(cx - 48, CART_Y, cx + 48, CART_Y, cx + 38, CART_Y + 26, cx - 38, CART_Y + 26);
        UI.sf([60, 50, 50]); ellipse(cx - 24, CART_Y + 32, 18, 18); ellipse(cx + 24, CART_Y + 32, 18, 18);
        UI.txt('Ore caught: ' + s.caught.length, 30, 40, 24, UI.COL.gold);
        UI.txt('Time left: ' + Math.max(0, Math.ceil(O.duration - s.t)) + ' s', 930, 40, 20, UI.COL.ink, RIGHT);
        UI.txt('Missed: ' + s.missed, 930, 66, 16, UI.COL.dim, RIGHT);
        UI.txt('LEFT / RIGHT arrows (or A / D) move the cart.   P = pause', 480, 528, 14, UI.COL.dim, CENTER);
      } else {
        UI.bg(); UI.txt('Your ore', 480, 55, 32, UI.COL.gold, CENTER);
        UI.txt('Each dot is one piece: where it landed (across) and how high it shines (up).', 480, 85, 15, UI.COL.dim, CENTER);
        UI.scatter(F.State.run.caught, 150, 105, 660, 290, { yMax: s.ymax, r: 6 });
        UI.legend(300, 420);
        var c = F.State.run.caught, nPure = c.filter(F.Rules.isPure).length;
        UI.txt('Total: ' + c.length + ' pieces  (' + nPure + ' pure, ' + (c.length - nPure) + ' flawed)', 480, 455, 18, UI.COL.ink, CENTER);
        if (s.note) UI.txt(s.note, 480, 482, 15, UI.COL.ember, CENTER);
        this.btn[0].y = 490; this.btn[0].h = 40; UI.drawButtons(this.btn);
      }
    },
    mousePressed: function (mx, my) { if (s.done) UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) { if (s.done && kc === F.K.ENTER) F.go('heat'); }
  };
})();
