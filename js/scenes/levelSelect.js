(function () {
  'use strict';
  var F = Forge, UI = F.UI, S = F.State;
  F.scenes = F.scenes || {};
  function cardX(i) { return 45 + i * 292; }
  function play(i) { if (S.isUnlocked(i)) { S.startRun(i); F.go('ore'); } }
  F.scenes.levelSelect = {
    enter: function () { this.back = { x: 40, y: 470, w: 140, h: 48, label: 'Back', fn: function () { F.go('title'); } }; },
    draw: function () {
      UI.bg(); UI.txt('Choose your forge', 480, 80, 34, UI.COL.gold, CENTER);
      for (var i = 0; i < 3; i++) {
        var L = F.LEVELS[i], x = cardX(i), y = 120, open = S.isUnlocked(i), hov = open && UI.hit({ x: x, y: y, w: 270, h: 320 }, mouseX, mouseY);
        UI.panel(x, y, 270, 320, hov ? 255 : 230);
        UI.txt('Level ' + L.id, x + 135, y + 40, 16, UI.COL.dim, CENTER);
        UI.txt(L.name, x + 135, y + 78, 28, open ? UI.COL.ember : UI.COL.dim, CENTER);
        UI.wrap(L.blurb, x + 20, y + 100, 230, 80, 16, UI.COL.ink, CENTER);
        for (var s = 0; s < 3; s++) UI.star(x + 70 + s * 65, y + 205, 22, S.stars[i] > s);
        UI.txt(S.stars[i] + ' / 3 stars', x + 135, y + 252, 16, UI.COL.ink, CENTER);
        if (open) UI.txt('Best score: ' + S.points[i] + '   [press ' + (i + 1) + ']', x + 135, y + 290, 14, UI.COL.dim, CENTER);
        else UI.wrap('LOCKED: earn at least 1 star in Level ' + i + ' to unlock.', x + 20, y + 270, 230, 40, 14, UI.COL.red, CENTER);
      }
      UI.drawButtons([this.back]);
    },
    mousePressed: function (mx, my) {
      if (UI.clickButtons([this.back], mx, my)) return;
      for (var i = 0; i < 3; i++) if (UI.hit({ x: cardX(i), y: 120, w: 270, h: 320 }, mx, my)) play(i);
    },
    keyPressed: function (k, kc) {
      if (kc === F.K.ESC) F.go('title');
      if (k === '1' || k === '2' || k === '3') play(parseInt(k, 10) - 1);
    }
  };
})();
