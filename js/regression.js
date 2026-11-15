/* Least-squares polynomial regression in a Chebyshev basis.
   x is mapped from the fixed domain [-1,1] to [-1,1] (identity here, kept explicit for clarity).
   Solved with the normal equations + Cholesky and a tiny ridge (1e-9, increased automatically if needed). */
(function () {
  'use strict';
  var F = (globalThis.Forge = globalThis.Forge || {});
  var LO = -1, HI = 1, RIDGE = 1e-9;

  function toU(x) { return (x - LO) / (HI - LO) * 2 - 1; }

  // Chebyshev polynomials T_0..T_d at u via the recurrence.
  function cheb(u, d) {
    var T = new Array(d + 1); T[0] = 1;
    if (d >= 1) T[1] = u;
    for (var k = 2; k <= d; k++) T[k] = 2 * u * T[k - 1] - T[k - 2];
    return T;
  }

  // Solve A c = b for symmetric positive definite A. Returns null if A is not numerically SPD.
  function cholSolve(A, b, n) {
    var L = [], i, j, k, s;
    for (i = 0; i < n; i++) L.push(new Array(n).fill(0));
    for (i = 0; i < n; i++) {
      for (j = 0; j <= i; j++) {
        s = A[i][j];
        for (k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) { if (!(s > 1e-14)) return null; L[i][i] = Math.sqrt(s); }
        else L[i][j] = s / L[j][j];
      }
    }
    var y = new Array(n), c = new Array(n);
    for (i = 0; i < n; i++) { s = b[i]; for (k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    for (i = n - 1; i >= 0; i--) { s = y[i]; for (k = i + 1; k < n; k++) s -= L[k][i] * c[k]; c[i] = s / L[i][i]; }
    for (i = 0; i < n; i++) if (!isFinite(c[i])) return null;
    return c;
  }

  // fit(points, degree): points = [{x,y}]. Effective degree is capped at n-1 (n points cannot pin down more).
  function fit(points, degree) {
    var n = points ? points.length : 0, req = Math.max(0, Math.floor(degree || 0));
    if (n === 0) return { coef: [0], degree: 0, requested: req, n: 0 };
    var deg = Math.min(req, n - 1), p = deg + 1, i, j, q;
    var A = [], b = new Array(p).fill(0);
    for (i = 0; i < p; i++) A.push(new Array(p).fill(0));
    for (q = 0; q < n; q++) {
      var T = cheb(toU(points[q].x), deg);
      for (i = 0; i < p; i++) { b[i] += T[i] * points[q].y; for (j = 0; j < p; j++) A[i][j] += T[i] * T[j]; }
    }
    var coef = null, ridge = RIDGE;
    for (var attempt = 0; attempt < 8 && !coef; attempt++, ridge *= 100) {
      var M = A.map(function (row) { return row.slice(); });
      for (i = 0; i < p; i++) M[i][i] += ridge;
      coef = cholSolve(M, b, p);
    }
    if (!coef) { // last resort: constant model at the mean
      var m = 0; for (q = 0; q < n; q++) m += points[q].y; coef = [m / n]; deg = 0;
    }
    return { coef: coef, degree: deg, requested: req, n: n };
  }

  function predict(model, x) {
    if (!model || !model.coef) return 0;
    var T = cheb(toU(x), model.coef.length - 1), s = 0;
    for (var k = 0; k < T.length; k++) s += model.coef[k] * T[k];
    return isFinite(s) ? s : 0;
  }

  // R^2 = 1 - SSres/SStot. Can be negative (worse than predicting the mean). Returns 0 if undefined.
  function r2(model, points) {
    if (!points || points.length < 2) return 0;
    var n = points.length, mean = 0, i;
    for (i = 0; i < n; i++) mean += points[i].y; mean /= n;
    var sst = 0, ssr = 0;
    for (i = 0; i < n; i++) {
      var d = points[i].y - mean, e = points[i].y - predict(model, points[i].x);
      sst += d * d; ssr += e * e;
    }
    if (sst < 1e-12) return 0;
    return 1 - ssr / sst;
  }

  function mse(model, points) {
    if (!points || !points.length) return 0;
    var s = 0; for (var i = 0; i < points.length; i++) { var e = points[i].y - predict(model, points[i].x); s += e * e; }
    return s / points.length;
  }

  // "Accuracy %" shown to the player: R^2 as a percentage clamped to [0,100].
  function accuracy(model, points) { return Math.max(0, Math.min(100, 100 * r2(model, points))); }

  F.Reg = { fit: fit, predict: predict, r2: r2, mse: mse, accuracy: accuracy };
})();
