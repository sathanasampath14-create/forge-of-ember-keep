/* Stage 1A: catch the ore. Every caught piece becomes a data point (x = landing spot, y = f(x) + noise by type). */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, O = C.ore, CART_Y = 455, FLOOR = 498, s = null;
  F.scenes = F.scenes || {};
  function toX(sx) { return Math.max(-1, Math.min(1, (sx - O.xMin) / (O.xMax - O.xMin) * 2 - 1)); }
  function puff(x, y, n, col) { // cosmetic particles (seeded)
    for (var i = 0; i < n; i++) s.fx.push({ x: x, y: y, vx: (s.rng.next() - 0.5) * 160, vy: -s.rng.next() * 140, life: 0.7, max: 0.7, r: 2 + s.rng.next() * 3, col: col });
  }
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
  function drawCart(cx) {
    push(); strokeJoin(ROUND); strokeWeight(3); UI.ss([55, 35, 18]); UI.sf([128, 86, 48]);
    quad(cx - 50, CART_Y, cx + 50, CART_Y, cx + 40, CART_Y + 30, cx - 40, CART_Y + 30);
    strokeWeight(2); UI.ss([85, 56, 30]); line(cx - 46, CART_Y + 10, cx + 46, CART_Y + 10); line(cx - 43, CART_Y + 20, cx + 43, CART_Y + 20);
    for (var i = 0; i < Math.min(s.caught.length, 18); i++) UI.ore(cx - 36 + (i % 6) * 14.4, CART_Y - 3 - Math.floor(i / 6) * 10, s.caught[i].type, 8, i * 13 + 7);
    noStroke(); UI.sf([120, 125, 135]); rect(cx - 53, CART_Y - 3, 106, 7, 2);
    [cx - 26, cx + 26].forEach(function (wx) {
      strokeWeight(3); UI.ss([30, 30, 36]); UI.sf([78, 78, 88]); ellipse(wx, 489, 22, 22); strokeWeight(2);
      for (var k = 0; k < 4; k++) { var a = s.wheel + k * Math.PI / 2; line(wx, 489, wx + Math.cos(a) * 9, 489 + Math.sin(a) * 9); }
    });
    pop();
  }
  F.scenes.ore = {
    enter: function () {
      var run = F.State.run || F.State.startRun(0), L = run.level, rng = F.RNG.create(L.seed), n = L.oreCount, gap = O.duration / n, pieces = [];
      for (var i = 0; i < n; i++) {
        var spec = F.Rules.makeSpec(L, rng);
        pieces.push({ spec: spec, sx: rng.range(O.xMin, O.xMax), spawn: (i + 0.5) * gap + rng.range(-0.2, 0.2) * gap, y: -20, state: 'wait', spin: (i % 2 ? 1 : -1) * (1 + (i * 0.37) % 2), seed: i * 13 + 5 });
      }
      s = { pieces: pieces, t: 0, cartX: 480, caught: [], missed: 0, done: false, note: '', ymax: 1, fx: [], wheel: 0, rng: F.RNG.create(L.seed ^ 0xFEED) };
      this.btn = [{ x: 380, y: 490, w: 200, h: 40, label: 'Continue', fn: function () { F.note('ore', 'heat'); } }];
    },
    update: function (dt) {
      s.fx = s.fx.filter(function (f) { f.life -= dt; f.vy += 500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; return f.life > 0; });
      if (s.done) return;
      var L = F.State.run.level; s.t += dt;
      var dir = (keyIsDown(37) || keyIsDown(65) ? -1 : 0) + (keyIsDown(39) || keyIsDown(68) ? 1 : 0);
      s.cartX = Math.max(O.cartW / 2, Math.min(C.W - O.cartW / 2, s.cartX + dir * O.cartSpeed * dt));
      s.wheel += dir * O.cartSpeed * dt / 11;
      var open = 0;
      s.pieces.forEach(function (p) {
        if (p.state === 'wait' && s.t >= p.spawn) p.state = 'fall';
        if (p.state === 'fall' || p.state === 'lost') {
          p.y += O.fallSpeed * dt;
          if (p.state === 'fall' && p.y >= CART_Y - 14) {
            if (Math.abs(p.sx - s.cartX) <= O.cartW / 2 + 6) {
              var x = toX(p.sx); p.state = 'caught';
              s.caught.push({ x: x, y: F.Rules.yOf(L, x, p.spec), type: p.spec.type });
              puff(p.sx, CART_Y - 6, 6, p.spec.type === 'FAKE' ? [255, 215, 70] : [190, 180, 170]);
            } else p.state = 'lost';
          }
          if (p.state === 'lost' && p.y >= FLOOR - 6) { p.state = 'gone'; s.missed++; puff(p.sx, FLOOR - 4, 6, [120, 105, 95]); }
        }
        if (p.state === 'wait' || p.state === 'fall' || p.state === 'lost') open++;
      });
      if (open === 0) finish();
    },
    draw: function () {
      if (!s.done) {
        UI.mineBg();
        s.pieces.forEach(function (p) {
          if (p.state === 'fall' || p.state === 'lost') {
            stroke(255, 255, 255, 28); strokeWeight(2); line(p.sx, p.y - 34, p.sx, p.y - 10);
            UI.ore(p.sx, p.y, p.spec.type, 13, p.seed, p.spin * (s.t + p.spawn));
          }
        });
        drawCart(s.cartX);
      } else { UI.bg(); }
      noStroke(); s.fx.forEach(function (f) { UI.sf(f.col, 255 * f.life / f.max); ellipse(f.x, f.y, f.r * 2, f.r * 2); });
      if (!s.done) {
        UI.panel(20, 70, 210, 52); UI.txt('Ore caught: ' + s.caught.length, 36, 105, 22, UI.COL.gold);
        UI.panel(730, 70, 210, 76); UI.txt('Time left: ' + Math.max(0, Math.ceil(O.duration - s.t)) + ' s', 925, 100, 20, UI.COL.ink, RIGHT); UI.txt('Missed: ' + s.missed, 925, 128, 16, UI.COL.dim, RIGHT);
        UI.txt('LEFT / RIGHT arrows (or A / D) move the cart.   P = pause', 480, 530, 14, UI.COL.ink, CENTER);
      } else {
        UI.txt('Your ore', 480, 55, 32, UI.COL.gold, CENTER);
        UI.txt('Each rock is one piece: where it landed (across) and how high it shines (up).', 480, 85, 15, UI.COL.dim, CENTER);
        UI.scatter(F.State.run.caught, 150, 105, 660, 290, { yMax: s.ymax, r: 8 });
        UI.legend(300, 420);
        var c = F.State.run.caught, nPure = c.filter(F.Rules.isPure).length;
        UI.txt('Total: ' + c.length + ' pieces  (' + nPure + ' pure, ' + (c.length - nPure) + ' flawed)', 480, 455, 18, UI.COL.ink, CENTER);
        if (s.note) UI.txt(s.note, 480, 478, 15, UI.COL.ember, CENTER);
        UI.drawButtons(this.btn);
      }
    },
    mousePressed: function (mx, my) { if (s.done) UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) { if (s.done && kc === F.K.ENTER) F.note('ore', 'heat'); }
  };
})();
