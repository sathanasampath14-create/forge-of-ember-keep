/* Global game state: saved stars (localStorage, guarded) and the current run. */
(function () {
  'use strict';
  var F = Forge, KEY = 'forge-ember-keep-v1';
  F.scenes = F.scenes || {};
  F.K = { ENTER: 13, ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
  F.paused = false;

  F.State = {
    stars: [0, 0, 0], points: [0, 0, 0], run: null,
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (Array.isArray(d.stars) && d.stars.length === 3) this.stars = d.stars.map(function (v) { return Math.max(0, Math.min(3, v | 0)); });
          if (Array.isArray(d.points) && d.points.length === 3) this.points = d.points.map(function (v) { return Math.max(0, v | 0); });
        }
      } catch (e) { /* storage unavailable: ignore */ }
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify({ stars: this.stars, points: this.points })); } catch (e) { /* ignore */ }
    },
    isUnlocked: function (i) { return i === 0 || this.stars[i - 1] >= 1; },
    startRun: function (i) {
      var L = F.LEVELS[i];
      this.run = { levelIdx: i, level: L, seed: L.seed, caught: [], heatT: null, cleaned: [], train: [], val: [],
                   reforgeUsed: false, degree: 0, attempts: [], result: null };
      return this.run;
    },
    recordResult: function (i, stars, pts) {
      if (stars > this.stars[i]) this.stars[i] = stars;
      if (pts > this.points[i]) this.points[i] = pts;
      this.save();
    }
  };
})();
