/* Shared drawing helpers (p5 global mode) and button handling. */
(function () {
  'use strict';
  var F = Forge, C = F.CONFIG;
  var COL = { ink: [245, 235, 220], dim: [175, 165, 155], ember: [255, 140, 40], gold: [255, 215, 60], steel: [150, 185, 215],
              green: [90, 200, 120], red: [225, 80, 70], panel: [38, 32, 46], line: [100, 90, 110], dark: [60, 45, 40] };
  var UI = { COL: COL, FONT: 'Verdana, Geneva, sans-serif' };

  function sf(c, a) { fill(c[0], c[1], c[2], a === undefined ? (c[3] === undefined ? 255 : c[3]) : a); }
  function ss(c) { stroke(c[0], c[1], c[2]); }
  UI.sf = sf; UI.ss = ss;
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }

  UI.txt = function (s, x, y, size, col, h, v) {
    noStroke(); textFont(UI.FONT); textSize(size || 18); sf(col || COL.ink); textAlign(h || LEFT, v || BASELINE); text(s, x, y);
  };
  UI.wrap = function (s, x, y, w, h, size, col, align) {
    noStroke(); textFont(UI.FONT); textSize(size || 16); textLeading((size || 16) * 1.4); sf(col || COL.ink);
    textAlign(align || LEFT, TOP); text(s, x, y, w, h);
  };
  UI.panel = function (x, y, w, h, a) {
    sf(COL.panel, a === undefined ? 235 : a); ss(COL.line); strokeWeight(2); rect(x, y, w, h, 10);
  };

  // Buttons: {x,y,w,h,label,fn,enabled(optional bool|fn),active(optional bool)}
  function isEnabled(b) { return b.enabled === undefined || (typeof b.enabled === 'function' ? b.enabled() : b.enabled); }
  UI.hit = function (b, mx, my) { return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h; };
  UI.drawButtons = function (list) {
    list.forEach(function (b) {
      var en = isEnabled(b), hov = en && UI.hit(b, mouseX, mouseY);
      strokeWeight(2); ss(en ? COL.gold : COL.line);
      sf(!en ? [70, 64, 76] : (b.active ? [255, 190, 80] : (hov ? [255, 160, 60] : [200, 100, 30])));
      rect(b.x, b.y, b.w, b.h, 8);
      UI.txt(typeof b.label === 'function' ? b.label() : b.label, b.x + b.w / 2, b.y + b.h / 2, b.size || 20, en ? [20, 12, 8] : COL.dim, CENTER, CENTER);
    });
  };
  UI.clickButtons = function (list, mx, my) {
    for (var i = 0; i < list.length; i++) if (isEnabled(list[i]) && UI.hit(list[i], mx, my)) { list[i].fn(); return true; }
    return false;
  };

  // Scatter of ore: x in [-1,1] across, y in [-yMax,yMax] up.
  UI.scatter = function (pts, x, y, w, h, o) {
    o = o || {}; var ym = o.yMax || 1.2, cy = y + h / 2;
    UI.panel(x, y, w, h);
    stroke(75, 68, 85); strokeWeight(1); line(x + 8, cy, x + w - 8, cy); line(x + w / 2, y + 8, x + w / 2, y + h - 8);
    pts.forEach(function (p) {
      var px = x + 10 + (p.x + 1) / 2 * (w - 20), py = cy - (p.y / ym) * (h / 2 - 10);
      py = Math.max(y + 6, Math.min(y + h - 6, py));
      UI.ore(px, py, p.type, o.r || 5, p.x * 977 + p.y * 131);
    });
  };

  UI.star = function (cx, cy, r, on) {
    push(); strokeWeight(2); ss(COL.gold); if (on) sf(COL.gold); else noFill();
    beginShape();
    for (var i = 0; i < 10; i++) { var a = -HALF_PI + i * PI / 5, rr = i % 2 ? r * 0.45 : r; vertex(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    endShape(CLOSE); pop();
  };

  // Horizontal sword (hilt left, point right). o: base, liquid, fillFrac, outline
  var POLYS = [
    [[-0.2, -0.05], [0.38, -0.05], [0.5, 0], [0.38, 0.05], [-0.2, 0.05]],
    [[-0.24, -0.11], [-0.2, -0.11], [-0.2, 0.11], [-0.24, 0.11]],
    [[-0.4, -0.025], [-0.24, -0.025], [-0.24, 0.025], [-0.4, 0.025]]
  ];
  function swordPath(ctx, cx, cy, L) {
    ctx.beginPath();
    POLYS.forEach(function (poly) {
      poly.forEach(function (p, i) { if (i) ctx.lineTo(cx + p[0] * L, cy + p[1] * L); else ctx.moveTo(cx + p[0] * L, cy + p[1] * L); });
      ctx.closePath();
    });
    ctx.moveTo(cx - 0.39 * L, cy); ctx.arc(cx - 0.42 * L, cy, 0.03 * L, 0, Math.PI * 2);
  }
  UI.drawSword = function (cx, cy, L, o) {
    o = o || {}; var ctx = drawingContext;
    ctx.save();
    swordPath(ctx, cx, cy, L); ctx.fillStyle = rgb(o.base || [85, 78, 90]); ctx.fill();
    if (o.fillFrac > 0) {
      ctx.save(); swordPath(ctx, cx, cy, L); ctx.clip();
      ctx.fillStyle = rgb(o.liquid || [255, 130, 30]);
      ctx.fillRect(cx - 0.44 * L, cy - L, 0.94 * L * Math.min(1, o.fillFrac), 2 * L); ctx.restore();
    }
    swordPath(ctx, cx, cy, L); ctx.lineWidth = 3; ctx.strokeStyle = rgb(o.outline || [210, 200, 190]); ctx.stroke();
    ctx.restore();
  };


  // ---------- Real-looking ore: irregular rocks with facets. Shape differs by type (not colour alone). ----------
  var TWO = Math.PI * 2;
  function hash(n) { var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  UI.hash = hash;
  UI.ore = function (x, y, type, r, seed, rot) {
    seed = seed === undefined ? x * 37.7 + y * 11.3 : seed;
    var pts = [], i, a, rr;
    for (i = 0; i < 8; i++) { a = i / 8 * TWO; rr = r * (0.72 + 0.4 * hash(seed + i * 7.13)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.88]); }
    var base, edge;
    if (type === 'CRACKED') { base = [92, 66, 52]; edge = [38, 26, 22]; }
    else if (type === 'FAKE') { base = [246, 196, 40]; edge = [165, 105, 10]; }
    else { base = [128, 142, 160]; edge = [52, 60, 78]; }
    push(); translate(x, y); rotate(rot || 0); strokeJoin(ROUND); strokeWeight(Math.max(1, r * 0.16)); ss(edge); sf(base);
    beginShape(); pts.forEach(function (p) { vertex(p[0], p[1]); }); endShape(CLOSE);
    noStroke();
    sf([255, 255, 255], type === 'FAKE' ? 130 : 55); beginShape(); vertex(pts[4][0], pts[4][1]); vertex(pts[5][0], pts[5][1]); vertex(pts[6][0], pts[6][1]); vertex(0, 0); endShape(CLOSE);
    sf([0, 0, 0], 70); beginShape(); vertex(pts[0][0], pts[0][1]); vertex(pts[1][0], pts[1][1]); vertex(pts[2][0], pts[2][1]); vertex(0, 0); endShape(CLOSE);
    if (type === 'CRACKED') {
      ss([22, 14, 12]); strokeWeight(Math.max(1, r * 0.14)); noFill();
      line(-r * 0.5, -r * 0.6, -r * 0.1, -r * 0.1); line(-r * 0.1, -r * 0.1, r * 0.25, r * 0.15); line(r * 0.25, r * 0.15, r * 0.1, r * 0.6);
    } else if (type === 'FAKE') {
      var tw = 0.5 + 0.5 * Math.sin(millis() / 200 + seed), sz = r * 0.55;
      sf([255, 255, 255], 120 + 130 * tw); beginShape();
      vertex(r * 0.35, -r * 0.4 - sz); vertex(r * 0.35 + sz * 0.2, -r * 0.4 - sz * 0.2); vertex(r * 0.35 + sz, -r * 0.4); vertex(r * 0.35 + sz * 0.2, -r * 0.4 + sz * 0.2);
      vertex(r * 0.35, -r * 0.4 + sz); vertex(r * 0.35 - sz * 0.2, -r * 0.4 + sz * 0.2); vertex(r * 0.35 - sz, -r * 0.4); vertex(r * 0.35 - sz * 0.2, -r * 0.4 - sz * 0.2); endShape(CLOSE);
    } else {
      sf([205, 228, 255], 210); ellipse(-r * 0.2, -r * 0.15, r * 0.3, r * 0.2); ellipse(r * 0.25, r * 0.2, r * 0.18, r * 0.14);
    }
    pop();
  };
  UI.legend = function (x, y) {
    UI.ore(x + 10, y, 'PURE', 9, 3); UI.txt('Pure', x + 26, y + 5, 14);
    UI.ore(x + 90, y, 'CRACKED', 9, 5); UI.txt('Cracked', x + 106, y + 5, 14);
    UI.ore(x + 196, y, 'FAKE', 9, 8); UI.txt('Fake gold', x + 212, y + 5, 14);
  };

  // ---------- Backgrounds: static layers cached in p5.Graphics, light animation drawn on top ----------
  var cache = {};
  function makeBg(kind) {
    var g = createGraphics(C.W, C.H), r, c, i, k, v; g.pixelDensity(1); g.noStroke();
    if (kind === 'forge') {
      g.background(28, 22, 26);
      for (r = 0; r < 23; r++) for (c = -1; c < 21; c++) {
        v = hash(r * 31 + c * 7.7); g.fill(62 + v * 26, 48 + v * 18, 48 + v * 14); g.rect(c * 48 - (r % 2) * 24 + 1, r * 24 + 1, 46, 22, 2);
      }
      for (i = 0; i < C.H; i += 4) { k = i / C.H; g.fill(10, 6, 12, 165 - 95 * k); g.rect(0, i, C.W, 4); }
    } else {
      for (i = 0; i < C.H; i += 6) { k = i / C.H; g.fill(44 + k * 20, 34 + k * 14, 30 + k * 10); g.rect(0, i, C.W, 6); }
      for (i = 0; i < 80; i++) { v = hash(i * 3.1); g.fill(v > 0.5 ? 70 : 24, v > 0.5 ? 56 : 18, v > 0.5 ? 48 : 16, 60); g.ellipse(hash(i) * C.W, hash(i + 50) * 480, 40 + hash(i + 9) * 90, 30 + hash(i + 19) * 60); }
      g.fill(20, 15, 14); g.beginShape(); g.vertex(0, 0);
      for (i = 0; i <= C.W; i += 40) g.vertex(i, 20 + hash(i) * 36); g.vertex(C.W, 0); g.endShape(CLOSE);
      g.fill(94, 64, 36); g.rect(24, 0, 24, 500); g.rect(912, 0, 24, 500); g.rect(0, 40, C.W, 20);
      g.fill(66, 44, 24); for (i = 0; i < 10; i++) g.rect(24, 40 + i * 48, 24, 3);
      g.fill(58, 50, 48); g.rect(0, 500, C.W, 40);
      g.fill(135, 130, 125); g.rect(0, 498, C.W, 5);
      g.fill(82, 56, 32); for (i = 0; i < C.W; i += 40) g.rect(i, 506, 18, 9);
    }
    return g;
  }
  UI.bg = function () {
    cache.forge = cache.forge || makeBg('forge'); image(cache.forge, 0, 0);
    var t = millis() / 1000, k, i; noStroke();
    for (k = 0; k < 6; k++) { fill(255, 100 + k * 10, 20, (10 + k * 2) * (0.8 + 0.2 * Math.sin(t * 5 + k))); ellipse(480, 560, 1200 - k * 170, 300 - k * 40); }
    for (i = 0; i < 22; i++) { fill(255, 150 + (i % 4) * 25, 40, 150); ellipse((i * 83 + Math.sin(t * 1.3 + i) * 25) % C.W, C.H - ((t * 28 + i * 47) % C.H), 2 + i % 3, 2 + i % 3); }
  };
  UI.mineBg = function () {
    cache.mine = cache.mine || makeBg('mine'); image(cache.mine, 0, 0);
    var t = millis() / 1000, tx = [120, 840], j, k, x, y; noStroke();
    for (j = 0; j < 2; j++) {
      x = tx[j]; y = 170;
      for (k = 0; k < 5; k++) { fill(255, 140, 40, 13); ellipse(x, y, 80 + k * 70, 80 + k * 70); }
      fill(70, 52, 34); rect(x - 4, y, 8, 44); fill(55, 55, 60); rect(x - 10, y - 4, 20, 8, 2);
      for (k = 0; k < 3; k++) { fill(255, 120 + k * 45, 30, 220 - k * 55); ellipse(x + Math.sin(t * 9 + x + k) * 2, y - 10 - k * 4, 18 - k * 4, 28 - k * 7); }
    }
    for (k = 0; k < 16; k++) { fill(220, 200, 170, 55); ellipse((k * 71 + t * 8 * (1 + k % 3)) % C.W, (k * 113 + Math.sin(t + k) * 25) % 470 + 30, 2, 2); }
  };

  F.UI = UI;
})();
