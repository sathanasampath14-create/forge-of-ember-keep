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

  UI.bg = function () {
    noStroke();
    for (var y = 0; y < C.H; y += 6) { var k = y / C.H; fill(20 + k * 55, 14 + k * 20, 30 - k * 8); rect(0, y, C.W, 6); }
  };
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
      UI.txt(b.label, b.x + b.w / 2, b.y + b.h / 2, b.size || 20, en ? [20, 12, 8] : COL.dim, CENTER, CENTER);
    });
  };
  UI.clickButtons = function (list, mx, my) {
    for (var i = 0; i < list.length; i++) if (isEnabled(list[i]) && UI.hit(list[i], mx, my)) { list[i].fn(); return true; }
    return false;
  };

  // Ore shapes: PURE = steel circle, CRACKED = dark square with crack, FAKE = shiny gold diamond (shape + label, not just colour).
  UI.ore = function (x, y, type, r) {
    push(); strokeWeight(1.5);
    if (type === 'CRACKED') {
      ss(COL.dim); sf(COL.dark); rectMode(CENTER); rect(x, y, r * 2, r * 2, 2);
      line(x - r * 0.5, y - r * 0.7, x + r * 0.1, y); line(x + r * 0.1, y, x - r * 0.2, y + r * 0.7);
    } else if (type === 'FAKE') {
      ss([255, 250, 200]); sf(COL.gold); quad(x, y - r * 1.3, x + r * 1.1, y, x, y + r * 1.3, x - r * 1.1, y);
      line(x - r * 0.3, y - r * 0.3, x + r * 0.3, y - r * 0.3);
    } else { ss([235, 245, 255]); sf(COL.steel); ellipse(x, y, r * 2, r * 2); }
    pop();
  };
  UI.legend = function (x, y) {
    UI.ore(x + 8, y, 'PURE', 6); UI.txt('Pure', x + 22, y + 5, 14);
    UI.ore(x + 88, y, 'CRACKED', 6); UI.txt('Cracked', x + 102, y + 5, 14);
    UI.ore(x + 190, y, 'FAKE', 6); UI.txt('Fake gold', x + 206, y + 5, 14);
  };

  // Scatter of ore: x in [-1,1] across, y in [-yMax,yMax] up.
  UI.scatter = function (pts, x, y, w, h, o) {
    o = o || {}; var ym = o.yMax || 1.2, cy = y + h / 2;
    UI.panel(x, y, w, h);
    stroke(75, 68, 85); strokeWeight(1); line(x + 8, cy, x + w - 8, cy); line(x + w / 2, y + 8, x + w / 2, y + h - 8);
    pts.forEach(function (p) {
      var px = x + 10 + (p.x + 1) / 2 * (w - 20), py = cy - (p.y / ym) * (h / 2 - 10);
      py = Math.max(y + 6, Math.min(y + h - 6, py));
      UI.ore(px, py, p.type, o.r || 5);
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

  F.UI = UI;
})();
