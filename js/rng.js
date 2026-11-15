/* Seedable RNG (mulberry32). Every random choice in the game uses this, so a seed reproduces a run. */
(function () {
  'use strict';
  var F = (globalThis.Forge = globalThis.Forge || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  F.RNG = {
    create: function (seed) {
      var f = mulberry32(seed >>> 0);
      return {
        next: f,                                         // uniform [0,1)
        range: function (a, b) { return a + (b - a) * f(); },
        int: function (n) { return Math.floor(f() * n); }, // 0..n-1
        normal: function () {                            // standard normal (Box-Muller)
          var u = 1 - f(), v = f();
          return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        },
        shuffle: function (arr) {                        // in-place Fisher-Yates
          for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(f() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
          }
          return arr;
        }
      };
    }
  };
})();
