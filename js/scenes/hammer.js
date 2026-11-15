/* Stage 2: rhythm hammering (training). EVERY strike raises the polynomial degree by 1, whatever the timing.
   Timing only gives sparks and a cosmetic combo bonus (max +50 points). Validation is never shown here. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, Hc = C.hammer, R = F.Reg, h = null;
  var PLOT = { x: 60, y: 90, w: 640, h: 225 }, BAR = { x: 60, y: 470, w: 500, h: 26 };
  F.scenes = F.scenes || {};
  function px(x) { return PLOT.x + 10 + (x + 1) / 2 * (PLOT.w - 20); }
  function py(y) { var v = PLOT.y + PLOT.h / 2 - (y / h.yMax) * (PLOT.h / 2 - 14); return Math.max(PLOT.y + 4, Math.min(PLOT.y + PLOT.h - 4, v)); }
  function refit() { var run = F.State.run; h.model = R.fit(run.train, h.strikes); h.T = R.accuracy(h.model, run.train); }
  function pos() { var ph = (h.t / Hc.period) % 1; return ph < 0.5 ? ph * 2 : 2 - ph * 2; }
  function strike() {
    if (h.strikes >= Hc.maxDegree) { h.msg = 'The blade cannot take more strikes.'; h.msgT = 1.2; return; }
    var d = Math.abs(pos() - 0.5), grade = d < 0.06 ? 'PERFECT!' : (d < 0.15 ? 'GOOD' : 'OK');
    h.strikes++; refit(); h.swingT = 0; h.heat = 1;
    h.combo = Math.min(Hc.comboMax, h.combo + (grade === 'PERFECT!' ? Hc.comboPerHit : (grade === 'GOOD' ? Hc.comboPerHit / 2 : 0)));
    h.msg = grade; h.msgT = 0.8;
    var n = grade === 'PERFECT!' ? 22 : (grade === 'GOOD' ? 12 : 6), bx = PLOT.x + 120 + h.rng.next() * 360;
    for (var i = 0; i < n; i++) h.sparks.push({ x: 540, y: 352, vx: -80 - h.rng.next() * 260, vy: -h.rng.next() * 260, life: 0.6 });
  }
  function finish() {
    if (h.strikes < 1) return;
    var run = F.State.run, m = R.fit(run.train, h.strikes), T = R.accuracy(m, run.train), V = R.accuracy(m, run.val);
    run.degree = h.strikes; run.model = m; run.comboBonus = h.combo;
    run.attempts.push({ degree: h.strikes, T: T, V: V, G: T - V, combo: h.combo });
    F.go('validate');
  }
  F.scenes.hammer = {
    enter: function () {
      var run = F.State.run, mx = run.train.reduce(function (m, q) { return Math.max(m, Math.abs(q.y)); }, 0);
      h = { strikes: 0, t: 0, swingT: 1, heat: 0, combo: 0, sparks: [], msg: '', msgT: 0, yMax: Math.max(0.9, mx * 1.25), rng: F.RNG.create(run.seed ^ 0x77A) };
      refit();
      this.btn = [
        { x: 720, y: 330, w: 210, h: 56, label: 'STRIKE (Space / click)', size: 17, fn: strike },
        { x: 720, y: 400, w: 210, h: 48, label: 'Finish forging', enabled: function () { return h.strikes >= 1; }, fn: finish }
      ];
    },
    update: function (dt) {
      h.t += dt; h.swingT = Math.min(1, h.swingT + dt / 0.3); h.heat = Math.max(0, h.heat - dt * 0.5); h.msgT = Math.max(0, h.msgT - dt);
      h.sparks = h.sparks.filter(function (s) { s.life -= dt; s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; return s.life > 0; });
    },
    draw: function () {
      var run = F.State.run, i, x;
      UI.bg(); UI.txt('Strike the blade to shape it', 480, 55, 30, UI.COL.gold, CENTER);
      UI.panel(PLOT.x, PLOT.y, PLOT.w, PLOT.h);
      stroke(75, 68, 85); strokeWeight(1); line(PLOT.x + 8, PLOT.y + PLOT.h / 2, PLOT.x + PLOT.w - 8, PLOT.y + PLOT.h / 2);
      // blade: a strip under the fitted curve, edge glows after each strike
      var top = [], k; for (x = -1; x <= 1.0001; x += 0.01) top.push([px(x), py(R.predict(h.model, x))]);
      noStroke(); UI.sf([150, 160, 178]); beginShape(); top.forEach(function (q) { vertex(q[0], q[1]); });
      for (k = top.length - 1; k >= 0; k--) vertex(top[k][0], Math.min(PLOT.y + PLOT.h - 2, top[k][1] + 30)); endShape(CLOSE);
      noFill(); strokeWeight(10); stroke(255, 140, 40, 40 + 120 * h.heat); beginShape(); top.forEach(function (q) { vertex(q[0], q[1]); }); endShape();
      strokeWeight(3); stroke(255, 215 - 60 * h.heat, 150 - 100 * h.heat); beginShape(); top.forEach(function (q) { vertex(q[0], q[1]); }); endShape();
      noStroke(); run.train.forEach(function (q) { UI.sf([255, 200, 80], 70); ellipse(px(q.x), py(q.y), 22, 22); UI.ore(px(q.x), py(q.y), q.type, 5, q.x * 977 + q.y * 131); });
      UI.txt('Glowing dots = the ore poured into the sword', PLOT.x + 10, PLOT.y + PLOT.h - 8, 13, UI.COL.dim);
      // anvil
      noStroke(); UI.sf([70, 72, 82]); rect(400, 350, 240, 20, 3); triangle(400, 350, 330, 350, 400, 368); rect(450, 370, 140, 40); rect(420, 410, 200, 24, 3);
      // hammer
      var bump = Math.sin(Math.PI * h.swingT), a = -1.7 - 0.6 * bump, hx = 640 + Math.cos(a) * 150, hy = 470 + Math.sin(a) * 150;
      stroke(110, 76, 42); strokeWeight(10); line(640, 470, hx, hy);
      push(); translate(hx, hy); rotate(a + HALF_PI); noStroke(); UI.sf([95, 98, 110]); rect(-30, -14, 60, 28, 4); pop();
      noStroke(); h.sparks.forEach(function (s) { UI.sf([255, 200, 70], 255 * s.life / 0.6); ellipse(s.x, s.y, 4, 4); });
      // HUD
      UI.txt('Strikes: ' + h.strikes + ' / ' + Hc.maxDegree, 825, 130, 26, UI.COL.ink, CENTER);
      UI.txt('Practice Score', 825, 175, 18, UI.COL.gold, CENTER);
      noStroke(); UI.sf([50, 44, 58]); rect(720, 190, 210, 24, 6); UI.sf(UI.COL.green); rect(720, 190, 210 * h.T / 100, 24, 6);
      UI.txt(Math.round(h.T) + '%', 825, 250, 34, UI.COL.ink, CENTER);
      UI.txt('Combo bonus: +' + h.combo, 825, 290, 16, UI.COL.dim, CENTER);
      UI.drawButtons(this.btn);
      if (h.msgT > 0) UI.txt(h.msg, 480, 440, 26, UI.COL.gold, CENTER);
      // timing bar
      UI.panel(BAR.x - 6, BAR.y - 6, BAR.w + 12, BAR.h + 12, 220);
      noStroke(); UI.sf([90, 80, 40]); rect(BAR.x + BAR.w * 0.35, BAR.y, BAR.w * 0.3, BAR.h); UI.sf(UI.COL.green); rect(BAR.x + BAR.w * 0.44, BAR.y, BAR.w * 0.12, BAR.h);
      stroke(255); strokeWeight(5); var mxp = BAR.x + pos() * BAR.w; line(mxp, BAR.y - 4, mxp, BAR.y + BAR.h + 4);
      UI.txt('Strike in the green for sparks and bonus points. Timing never changes the blade.', 60, 520, 13, UI.COL.dim);
      UI.txt('SPACE or click STRIKE = hammer.  ENTER = finish forging.  P = pause', 480, 535, 13, UI.COL.dim, CENTER);
    },
    mousePressed: function (mx, my) { UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) { if (kc === F.K.SPACE) strike(); else if (kc === F.K.ENTER) finish(); }
  };
})();
