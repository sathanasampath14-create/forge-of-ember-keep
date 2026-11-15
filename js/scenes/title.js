(function () {
  'use strict';
  var F = Forge, UI = F.UI, C = F.CONFIG, modal = null;
  F.scenes = F.scenes || {};
  var HOW = 'The kingdom is at war and you are its last blacksmith.\n\n' +
    '1. CATCH ORE: move the cart with the LEFT/RIGHT arrows (or A/D). Every piece you catch is saved.\n' +
    '2. HEAT: press Start, then SPACE to stop the hand inside the green zone.\n' +
    '3. POUR: hold the POUR button (or SPACE). Poured ore shapes the sword; leftover ore stays in the bucket.\n' +
    '4. HAMMER: press SPACE to strike. Each strike changes the edge of the blade. Press ENTER when you are done.\n' +
    '5. CHECK the blade, re-forge once if you want, then watch the war.\n\n' +
    'Press P at any time to pause. Experiment: you learn by playing.';
  var GOALS = 'After playing you can:\n\n' +
    '1. Explain that more and cleaner data gives a model more to learn from (sample size, noise, outliers).\n' +
    '2. Describe why data is split into training and validation sets.\n' +
    '3. Recognize underfitting (too simple) and overfitting (memorizes the training data).\n' +
    '4. Explain the bias-variance trade-off as finding the right model complexity.\n' +
    '5. Explain why a final, unseen test is the real measure of performance.';
  var t = 0;
  function mk() {
    return [
      { x: 380, y: 270, w: 200, h: 52, label: 'Play', fn: function () { F.go('levelSelect'); } },
      { x: 380, y: 336, w: 200, h: 52, label: 'How to Play', fn: function () { modal = 'how'; } },
      { x: 380, y: 402, w: 200, h: 52, label: 'Learning Objectives', size: 17, fn: function () { modal = 'goals'; } }
    ];
  }
  F.scenes.title = {
    enter: function () { modal = null; t = 0; this.buttons = mk(); this.closeBtn = { x: 390, y: 420, w: 180, h: 44, label: 'Close', fn: function () { modal = null; } }; },
    update: function (dt) { t += dt; },
    draw: function () {
      UI.bg(); noStroke();
      for (var i = 0; i < 30; i++) { // rising embers
        var ex = (i * 97 + Math.sin(t + i) * 20) % C.W, ey = C.H - ((t * 30 + i * 53) % C.H);
        fill(255, 140 + (i % 5) * 20, 40, 150); ellipse(ex, ey, 3 + i % 3, 3 + i % 3);
      }
      UI.txt('THE FORGE OF', 480, 110, 28, UI.COL.dim, CENTER);
      UI.txt('EMBER KEEP', 480, 175, 58, UI.COL.ember, CENTER);
      UI.txt('A kingdom at war. You are its last blacksmith.', 480, 215, 18, UI.COL.ink, CENTER);
      if (!modal) UI.drawButtons(this.buttons);
      else {
        UI.panel(110, 50, 740, 430);
        UI.txt(modal === 'how' ? 'How to Play' : 'Learning Objectives', 480, 90, 26, UI.COL.gold, CENTER);
        UI.wrap(modal === 'how' ? HOW : GOALS, 140, 110, 680, 300, 16);
        UI.drawButtons([this.closeBtn]);
      }
    },
    mousePressed: function (mx, my) { if (modal) UI.clickButtons([this.closeBtn], mx, my); else UI.clickButtons(this.buttons, mx, my); },
    keyPressed: function (k, kc) {
      if (kc === F.K.ESC) modal = null; else if (kc === F.K.ENTER && !modal) F.go('levelSelect');
    }
  };
})();
