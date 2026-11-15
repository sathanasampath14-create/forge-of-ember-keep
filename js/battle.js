/* Stage 4: auto battle (watch only). The animation follows the Stage 3 classification; the numbers (durability, war %)
   are real: every enemy is 150 fresh test points that were never used for training or validation. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, b = null, SEG = 3.4, GROUND = 400, SX = 230, EX = 640, SWL = 150;
  F.scenes = F.scenes || {};
  var TITLE = { scout: 'Wave 1: the Scout', armored: 'Wave 2: the Armored Soldier', captain: 'Wave 3: the Captain', boss: 'Final battle: the Warlord!' };
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, c, t) { return a + (c - a) * t; }
  function sc(c, a) { UI.sf(c, a === undefined ? 255 : a); }

  function drawEnemy(name, x, y, rot, alpha) {
    var s = { scout: 0.85, armored: 1, captain: 1.1, boss: 1.7 }[name], col = { scout: [96, 150, 76], armored: [132, 138, 150], captain: [168, 56, 56], boss: [70, 46, 84] }[name];
    push(); translate(x, y); rotate(rot); scale(s); noStroke();
    sc([50, 40, 40], alpha); rect(-14, -30, 10, 30); rect(4, -30, 10, 30);
    sc(col, alpha); rect(-20, -80, 40, 52, 4);
    sc([226, 190, 150], alpha); ellipse(0, -96, 26, 26);
    if (name === 'armored') { sc([180, 185, 195], alpha); arc(0, -98, 30, 30, PI, TWO_PI); sc([100, 105, 118], alpha); rect(-44, -76, 22, 40, 6); }
    if (name === 'captain') { sc([120, 30, 30], alpha); triangle(20, -80, 34, -20, 10, -30); sc([240, 200, 60], alpha); rect(-3, -122, 6, 14); }
    if (name === 'boss') { sc([200, 60, 40], alpha); triangle(-13, -104, -24, -130, -6, -108); triangle(13, -104, 24, -130, 6, -108); sc([255, 80, 40], alpha); ellipse(-5, -97, 5, 5); ellipse(5, -97, 5, 5); }
    stroke(120, 120, 135, alpha); strokeWeight(5); line(-22, -62, -50, -96);
    pop();
  }
  function drawSoldier(x, rot, ang, cracks, broken) {
    push(); translate(x, GROUND); rotate(rot); noStroke();
    sc([60, 50, 50]); rect(-14, -30, 10, 30); rect(4, -30, 10, 30);
    sc([60, 90, 170]); rect(-20, -80, 40, 52, 4);
    sc([226, 190, 150]); ellipse(0, -96, 26, 26); sc([160, 165, 175]); arc(0, -98, 30, 30, PI, TWO_PI);
    stroke(226, 190, 150); strokeWeight(6); line(14, -66, 26, -62);
    push(); translate(26, -62); rotate(ang);
    if (!broken) {
      UI.drawSword(0.4 * SWL, 0, SWL, { base: [200, 208, 220], outline: [60, 70, 90] });
      stroke(40, 40, 52); strokeWeight(2);
      for (var i = 0; i < cracks; i++) { var cx = 40 + i * 20; line(cx, -5, cx + 5, 0); line(cx + 5, 0, cx - 2, 6); }
    } else { noStroke(); sc([120, 90, 50]); rect(0, -3, 28, 6); sc([180, 160, 60]); rect(26, -10, 5, 20); }
    pop(); pop();
  }
  function dur(i, local) {
    var a = i === 0 ? C.battle.durability : b.enemies[i - 1].durability, c = b.enemies[i].durability;
    return lerp(a, c, ease((local - 1.0) / 1.4));
  }

  F.scenes.battle = {
    enter: function () {
      var run = F.State.run, fin = run.final || { degree: run.degree, T: 0, V: 0, G: 0, combo: 0, skippedReforge: true };
      var model = run.model || F.Reg.fit(run.train, fin.degree), res = F.Rules.evaluate(fin), bat = F.Rules.battle(model, run.level, run.seed);
      run.result = { kind: res.kind, stars: res.stars, win: res.win, points: res.points, master: res.master, combo: res.combo, G: res.G,
                     T: fin.T, V: fin.V, degree: fin.degree, test: bat.test, enemies: bat.enemies };
      F.State.recordResult(run.levelIdx, res.stars, res.points);
      b = { t: 0, kind: res.kind, enemies: bat.enemies, n: res.kind === 'underfit' ? 1 : 4 };
      b.fightEnd = b.n * SEG;
      this.btn = [
        { x: 380, y: 450, w: 200, h: 50, label: 'See your report', enabled: function () { return b.t >= b.fightEnd + 0.8; }, fn: function () { F.go('report'); } },
        { x: 840, y: 14, w: 110, h: 36, label: 'Skip >>', size: 15, enabled: function () { return b.t < b.fightEnd + 0.8; }, fn: function () { b.t = b.fightEnd + 0.8; } }
      ];
    },
    update: function (dt) { b.t += dt; },
    draw: function () {
      var t = b.t, done = t >= b.fightEnd, i = Math.min(b.n - 1, Math.floor(t / SEG)), local = done ? SEG : t - i * SEG, k;
      // battlefield: dusk sky, distant castle, ground
      noStroke(); for (k = 0; k < GROUND; k += 8) { var f = k / GROUND; fill(40 + f * 170, 24 + f * 80, 60 + f * 20); rect(0, k, C.W, 8); }
      sc([255, 190, 90], 90); ellipse(760, 330, 220, 220); sc([40, 28, 48]); triangle(0, GROUND, 180, 270, 360, GROUND); triangle(250, GROUND, 520, 250, 800, GROUND);
      sc([30, 22, 38]); rect(600, 280, 40, 120); rect(660, 250, 50, 150); triangle(660, 250, 685, 215, 710, 250); sc([34, 40, 30]); rect(0, GROUND, C.W, C.H - GROUND);
      var ex, eAlpha = 255, eRot = 0, sx = SX, sRot = 0, ang = -0.5 + 0.05 * Math.sin(t * 3), peak = 0, name = ['scout', 'armored', 'captain', 'boss'][i];
      ex = local < 1 ? lerp(1000, EX, ease(local)) : EX;
      if (local >= 1 && local < 2.4) { var s = Math.abs(Math.sin((local - 1) * Math.PI * 1.2)); ang = -1.1 + 1.4 * s; peak = Math.max(0, (s - 0.88) / 0.12); ex += 5 * peak * Math.sin(local * 60); }
      if (b.kind === 'underfit') {
        if (local >= 1) sx = SX - 45 * ease((local - 1.1) / 1.0);
        if (local >= 2.4) { sRot = -Math.PI / 2 * ease((local - 2.4) / 0.9); ang = -0.3; }
      } else if (local >= 2.4) { eRot = Math.PI / 2 * ease((local - 2.4) / 0.8); eAlpha = 255 * (1 - ease((local - 3.0) / 0.4)); ex = EX + 30 * ease((local - 2.4) / 0.8); ang = -0.3; }
      var cracks = b.kind === 'mild' ? Math.min(4, i + (local >= 2.4 ? 1 : 0)) : 0;
      var tBreak = 3 * SEG + 2.9, broken = b.kind === 'severe' && t >= tBreak;
      if (eAlpha > 4) drawEnemy(name, ex, GROUND, eRot, eAlpha);
      drawSoldier(sx, sRot, ang, cracks, broken);
      if (broken) { // shards fly out
        var dt = t - tBreak;
        for (k = 0; k < 8; k++) { var vx = 60 + 90 * UI.hash(k), vy = -200 - 160 * UI.hash(k + 9);
          push(); translate(SX + 100 + vx * dt, GROUND - 90 + vy * dt + 450 * dt * dt); rotate(dt * (3 + k)); sc([200, 208, 220], 255 * Math.max(0, 1 - dt / 2)); triangle(-8, -4, 10, 0, -2, 7); pop(); }
        if (dt < 1.2) UI.txt('SNAP!', SX + 120, GROUND - 190, 34, UI.COL.red, CENTER);
      }
      if (peak > 0.1) { // clash flash
        stroke(255, 220, 100, 255 * peak); strokeWeight(3);
        for (k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2; line(ex - 45 + Math.cos(a) * 8, GROUND - 80 + Math.sin(a) * 8, ex - 45 + Math.cos(a) * (14 + 30 * peak), GROUND - 80 + Math.sin(a) * (14 + 30 * peak)); }
        noStroke(); UI.txt(b.kind === 'underfit' ? 'CLANG!' : 'SLASH!', ex - 45, GROUND - 150, 28, b.kind === 'underfit' ? UI.COL.red : UI.COL.gold, CENTER);
      }
      if (b.kind === 'underfit' && local >= 2.4) { sc([120, 0, 0], 110 * ease((local - 2.4) / 1.0)); rect(0, 0, C.W, C.H); }
      // HUD
      if (!done) {
        UI.panel(250, 12, 460, 62, 220); UI.txt(TITLE[name], 480, 38, 20, UI.COL.gold, CENTER);
        var d = Math.max(0, dur(i, local)); noStroke(); sc([50, 44, 58]); rect(280, 50, 280, 14, 5); sc(d > 66 ? UI.COL.green : (d > 33 ? UI.COL.ember : UI.COL.red)); rect(280, 50, 280 * d / 100, 14, 5);
        UI.txt('Durability ' + Math.round(d), 575, 63, 14, UI.COL.ink);
      } else {
        var T = { good: ['VICTORY!', 'Your sword held strong through every battle.'], mild: ['VICTORY... but the blade is cracked.', 'It won, but it took damage in every wave.'],
                  severe: ['VICTORY! ...barely.', 'The blade shattered the moment the Warlord fell.'], underfit: ['DEFEAT.', 'Your blade bounced off the first enemy. The kingdom has fallen.'] }[b.kind];
        UI.panel(200, 150, 560, 150, 235); UI.txt(T[0], 480, 210, 34, b.kind === 'underfit' ? UI.COL.red : UI.COL.gold, CENTER); UI.txt(T[1], 480, 255, 17, UI.COL.ink, CENTER);
      }
      UI.drawButtons(this.btn);
    },
    mousePressed: function (mx, my) { UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) { if (kc === F.K.ENTER || kc === F.K.SPACE) { if (b.t < b.fightEnd + 0.8) b.t = b.fightEnd + 0.8; else F.go('report'); } }
  };
})();
