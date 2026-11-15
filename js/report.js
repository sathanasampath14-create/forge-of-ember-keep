/* Report card: scores, the old blacksmith's verdict (the mentor speaks ONLY here), and the bias-variance chart. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, R = F.Reg, r = null;
  F.scenes = F.scenes || {};
  var X0 = 100, X1 = 590, Y0 = 350, Y1 = 105;
  var NOTES = 'Bias vs variance: a model that is too simple has high bias (it misses the real pattern). A model that is too complex has high variance (it chases noise). A good model balances the two.\n\n' +
    'Why hold data back? Training error keeps falling as the model grows. Only error on unseen data shows the U-shape and tells you where to stop.\n\n' +
    'The war was a test set: fresh ore never used for training or validation. It is the honest measure of how the model will perform in the real world.';

  function text(res, best) {
    var d = res.degree, hint = ' (about ' + best + ' strikes worked best on your ore)';
    return {
      good: ['A fine blade! It cut down every enemy, even ones it had never met.',
             'Good fit: the blade is complex enough to follow the true pattern, yet simple enough not to chase every flaw in the ore.',
             d === best ? 'You chose well. Keep comparing your practice and check scores before going to war.' : 'The lowest error on your check ore came at ' + best + ' strikes; try that for an even smoother blade.'],
      mild: ['You won, but the blade cracked with every wave.',
             'Mild overfitting: the blade matched your practice ore better than ore it had never seen.',
             'Try fewer strikes' + hint + '. A big gap between practice and check scores means the blade is memorising.'],
      severe: ['The blade shattered just as the Warlord fell. A very narrow win!',
               'Overfitting: the blade memorised every bump in the practice ore, so it broke on new enemies.',
               'Do not trust the Practice Score alone, because it always rises with more strikes. Fewer strikes would have held' + hint + '.'],
      underfit: ['The blade bounced off the first enemy and the kingdom has lost this battle.',
                 'Underfitting: the blade was too simple. It was poor even on the ore it was shaped from.',
                 'Strike more times so the edge follows the dots' + hint + '.']
    }[res.kind];
  }
  function mentor(x, y) {
    push(); noStroke(); UI.sf([120, 80, 50]); rect(x - 38, y + 20, 76, 110, 10); UI.sf([226, 190, 150]); ellipse(x, y, 64, 64);
    UI.sf([245, 245, 245]); beginShape(); vertex(x - 30, y + 6); vertex(x + 30, y + 6); vertex(x + 22, y + 56); vertex(x, y + 72); vertex(x - 22, y + 56); endShape(CLOSE);
    UI.sf([240, 240, 240]); ellipse(x - 28, y - 16, 14, 24); ellipse(x + 28, y - 16, 14, 24); UI.sf([60, 40, 30]); rect(x - 20, y - 12, 14, 4); rect(x + 6, y - 12, 14, 4); ellipse(x - 12, y - 4, 5, 5); ellipse(x + 12, y - 4, 5, 5);
    stroke(110, 76, 42); strokeWeight(7); line(x + 40, y + 110, x + 62, y + 30); noStroke(); UI.sf([95, 98, 110]); rect(x + 48, y + 18, 30, 16, 3);
    UI.txt('Old Smith', x, y + 150, 15, UI.COL.gold, CENTER); pop();
  }
  function marker(shape, x, y, col) { noStroke(); UI.sf(col); if (shape === 'c') ellipse(x, y, 9, 9); else rect(x - 4.5, y - 4.5, 9, 9); }
  function go(lvl) { F.State.startRun(lvl); F.go('ore'); }

  F.scenes.report = {
    enter: function () {
      var run = F.State.run, res = run && run.result;
      if (!res) { F.go('levelSelect'); r = null; return; }
      var tr = [], va = [], d, m, best = 1, i;
      for (d = 1; d <= 12; d++) { m = R.fit(run.train, d); tr.push(Math.sqrt(R.mse(m, run.train))); va.push(Math.sqrt(R.mse(m, run.val))); if (va[d - 1] < va[best - 1]) best = d; }
      var sorted = va.slice().sort(function (a, c) { return a - c; });
      r = { run: run, res: res, tr: tr, va: va, best: best, cap: Math.max(1e-6, 2.5 * sorted[6], 1.2 * Math.max.apply(null, tr)), page: 0 };
      var lvl = run.levelIdx;
      this.btn = [
        { x: 40, y: 488, w: 170, h: 42, label: 'Play Again', size: 17, fn: function () { go(lvl); } },
        { x: 225, y: 488, w: 190, h: 42, label: function () { return lvl >= 2 ? 'Next Level (none)' : 'Next Level'; }, size: 17, enabled: function () { return lvl < 2 && F.State.isUnlocked(lvl + 1); }, fn: function () { go(lvl + 1); } },
        { x: 430, y: 488, w: 170, h: 42, label: 'Level Select', size: 17, fn: function () { F.go('levelSelect'); } },
        { x: 640, y: 488, w: 280, h: 42, label: function () { return r.page === 0 ? 'Chart and notes >' : '< Back to verdict'; }, size: 17, fn: function () { r.page = 1 - r.page; } }
      ];
    },
    draw: function () {
      if (!r) return;
      var res = r.res, run = r.run, i, d;
      UI.bg(); UI.txt('Report Card: Level ' + run.level.id + ' ' + run.level.name, 480, 42, 28, UI.COL.gold, CENTER);
      if (r.page === 0) {
        var cards = [['Training (practice ore)', res.T, UI.COL.steel], ['Validation (check ore)', res.V, UI.COL.gold], ['War (final test)', res.test, UI.COL.green]];
        cards.forEach(function (c, k) {
          var x = 40 + k * 300; UI.panel(x, 62, 280, 92);
          UI.txt(c[0], x + 14, 86, 15, UI.COL.dim); UI.txt(c[1].toFixed(0) + '%', x + 14, 128, 34, UI.COL.ink);
          noStroke(); UI.sf([50, 44, 58]); rect(x + 110, 104, 150, 16, 5); UI.sf(c[2]); rect(x + 110, 104, 150 * Math.max(0, Math.min(100, c[1])) / 100, 16, 5);
        });
        for (i = 0; i < 3; i++) UI.star(75 + i * 56, 190, 22, res.stars > i);
        UI.txt('Points: ' + res.points, 260, 200, 26, UI.COL.ink);
        var bonus = (res.master ? '  Master Smith +' + res.master : '') + (res.combo ? '  Hammer combo +' + res.combo : '');
        UI.txt(res.win ? 'Strikes: ' + res.degree + bonus : 'Strikes: ' + res.degree + '  (no points for a lost war)', 520, 200, 15, UI.COL.dim);
        var t = text(res, r.best);
        mentor(80, 305); UI.panel(160, 228, 770, 250);
        UI.txt('Old Smith says:', 180, 255, 17, UI.COL.gold);
        UI.wrap(t[0] + '\n\nWhat you learned: ' + t[1] + '\n\nTip: ' + t[2], 180, 268, 730, 205, 16);
      } else {
        UI.panel(40, 62, 590, 360); UI.txt('Error on the ore (lower is better)', 60, 86, 15, UI.COL.ink);
        function cx(dd) { return X0 + (dd - 1) / 11 * (X1 - X0); }
        function cy(e) { return Y0 - Math.min(e, r.cap) / r.cap * (Y0 - Y1); }
        stroke(90, 82, 100); strokeWeight(1); line(X0, Y0, X1, Y0); line(X0, Y1, X0, Y0);
        for (d = 1; d <= 12; d++) { UI.txt(String(d), cx(d), Y0 + 18, 13, UI.COL.dim, CENTER); }
        UI.txt('Strikes (how complex the blade is) >', 345, Y0 + 40, 14, UI.COL.dim, CENTER);
        stroke(255, 140, 40); strokeWeight(2); line(cx(res.degree), Y1 - 8, cx(res.degree), Y0); noStroke(); UI.txt('You: ' + res.degree, cx(res.degree), Y1 - 14, 14, UI.COL.ember, CENTER);
        noStroke(); UI.sf(UI.COL.green); triangle(cx(r.best), Y0 + 2, cx(r.best) - 7, Y0 + 14, cx(r.best) + 7, Y0 + 14); UI.txt('Best: ' + r.best, cx(r.best), Y0 + 64, 14, UI.COL.green, CENTER);
        noFill(); strokeWeight(3); UI.ss(UI.COL.steel); beginShape(); for (d = 1; d <= 12; d++) vertex(cx(d), cy(r.tr[d - 1])); endShape();
        drawingContext.setLineDash([8, 6]); UI.ss(UI.COL.gold); beginShape(); for (d = 1; d <= 12; d++) vertex(cx(d), cy(r.va[d - 1])); endShape(); drawingContext.setLineDash([]);
        for (d = 1; d <= 12; d++) { marker('c', cx(d), cy(r.tr[d - 1]), UI.COL.steel); marker('s', cx(d), cy(r.va[d - 1]), UI.COL.gold); }
        marker('c', 400, 100, UI.COL.steel); UI.txt('Training error (solid, circles)', 412, 105, 13, UI.COL.ink); marker('s', 400, 120, UI.COL.gold); UI.txt('Validation error (dashed, squares)', 412, 125, 13, UI.COL.ink);
        UI.txt('The bottom of the validation curve is the best blade.', 335, 412, 13, UI.COL.dim, CENTER);
        UI.panel(645, 62, 280, 360); UI.txt('Data Science Notes', 660, 86, 17, UI.COL.gold); UI.wrap(NOTES, 658, 98, 255, 320, 12.5);
      }
      UI.drawButtons(this.btn);
    },
    mousePressed: function (mx, my) { UI.clickButtons(this.btn, mx, my); }
  };
})();
