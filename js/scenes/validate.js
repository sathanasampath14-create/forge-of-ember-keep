/* Stage 3: validation. Numbers only: no verdict, no hints. A "?" glossary explains terms on demand. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI, v = null;
  F.scenes = F.scenes || {};
  var GLOSS = 'Training accuracy: how well the blade matches the ore that was poured into it.\n\n' +
    'Validation accuracy: how well the blade matches the ore you kept in the bucket. The blade never saw that ore.\n\n' +
    'Gap: training accuracy minus validation accuracy, in percentage points.\n\n' +
    'Accuracy %: 100 means the blade matches perfectly; 0 means it does no better than always guessing the average.';
  function toWar() {
    var run = F.State.run, a = run.attempts[run.attempts.length - 1];
    run.final = { degree: a.degree, T: a.T, V: a.V, G: a.G, reforged: run.reforgeUsed, skippedReforge: !run.reforgeUsed, combo: a.combo };
    F.go('battle');
  }
  function bar(label, val, x, y, col, note) {
    UI.txt(label, x, y, 20, UI.COL.ink);
    noStroke(); UI.sf([50, 44, 58]); rect(x, y + 12, 520, 30, 6); UI.sf(col); rect(x, y + 12, 520 * Math.max(0, Math.min(100, Math.abs(val))) / 100, 30, 6);
    UI.txt(note, x + 540, y + 36, 26, UI.COL.ink);
  }
  F.scenes.validate = {
    enter: function () {
      var run = F.State.run; v = { a: run.attempts[run.attempts.length - 1], second: run.attempts.length >= 2, gloss: false };
      var self = this;
      this.btn = [
        { x: 140, y: 440, w: 240, h: 54, label: 'Re-forge (only once)', enabled: function () { return !v.second && !run.reforgeUsed && !v.gloss; }, fn: function () { run.reforgeUsed = true; F.go('hammer'); } },
        { x: 420, y: 440, w: 240, h: 54, label: function () { return v.second ? 'Go to war' : 'Skip to war'; }, enabled: function () { return !v.gloss; }, fn: toWar },
        { x: 880, y: 20, w: 50, h: 44, label: '?', fn: function () { v.gloss = !v.gloss; } }
      ];
    },
    draw: function () {
      var a = v.a, run = F.State.run, G = a.G;
      UI.bg(); UI.txt('Check the blade', 480, 55, 32, UI.COL.gold, CENTER);
      UI.txt('Strikes used: ' + a.degree, 480, 85, 16, UI.COL.dim, CENTER);
      UI.panel(50, 105, 860, 310);
      bar('Training accuracy', a.T, 90, 150, UI.COL.steel, a.T.toFixed(0) + '%');
      bar('Validation accuracy', a.V, 90, 235, UI.COL.gold, a.V.toFixed(0) + '%');
      bar('Gap (training minus validation)', G, 90, 320, UI.COL.ember, (G >= 0 ? '+' : '') + G.toFixed(0) + ' pts');
      if (v.second) { var f = run.attempts[0]; UI.txt('First forge: ' + f.degree + ' strikes   Training ' + f.T.toFixed(0) + '%   Validation ' + f.V.toFixed(0) + '%   Gap ' + (f.G >= 0 ? '+' : '') + f.G.toFixed(0), 480, 395, 15, UI.COL.dim, CENTER); }
      UI.drawButtons(this.btn.filter(function (b, i) { return i === 2 || (i === 1) || (i === 0 && !v.second); }));
      UI.txt('? = what do these words mean?   P = pause', 480, 530, 14, UI.COL.dim, CENTER);
      if (v.gloss) { UI.panel(120, 90, 720, 360, 250); UI.txt('Glossary', 480, 130, 26, UI.COL.gold, CENTER); UI.wrap(GLOSS, 150, 150, 660, 280, 17); UI.txt('Press ? or Esc to close', 480, 430, 14, UI.COL.dim, CENTER); }
    },
    mousePressed: function (mx, my) { UI.clickButtons(v.gloss ? [this.btn[2]] : this.btn.filter(function (b, i) { return i !== 0 || !v.second; }), mx, my); },
    keyPressed: function (k, kc) { if (k === '?' || (kc === F.K.ESC && v.gloss)) v.gloss = !v.gloss; }
  };
})();
