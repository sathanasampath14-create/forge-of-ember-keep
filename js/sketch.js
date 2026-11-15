/* p5 global-mode entry point + tiny scene manager. */
Forge.go = function (name) {
  var sc = Forge.scenes[name] || Forge.placeholder(name);
  Forge.current = sc; Forge.sceneName = name;
  if (sc.enter) sc.enter();
};
Forge.resize = function () { // scale the 960x540 canvas to fit the window (p5 maps mouse coords for CSS scaling)
  var s = Math.max(0.3, Math.min(window.innerWidth / 960, window.innerHeight / 540));
  var cv = document.querySelector('#game-holder canvas');
  if (cv) { cv.style.width = Math.floor(960 * s) + 'px'; cv.style.height = Math.floor(540 * s) + 'px'; }
};
// Stand-in for scenes not built yet (Phase 1 only): shows the data so far.
Forge.placeholder = function (name) {
  var UI = Forge.UI, btn = [{ x: 380, y: 450, w: 200, h: 50, label: 'Level Select', fn: function () { Forge.go('levelSelect'); } }];
  return {
    draw: function () {
      var r = Forge.State.run || { caught: [], cleaned: [], train: [], val: [] };
      UI.bg(); UI.txt('Stage "' + name + '" arrives in the next phase', 480, 120, 28, UI.COL.gold, CENTER);
      UI.txt('Phase 1 check: caught ' + r.caught.length + ', after heating ' + r.cleaned.length + ', sword ore ' + r.train.length + ', bucket ore ' + r.val.length, 480, 200, 18, UI.COL.ink, CENTER);
      var fz = r.final; if (fz) UI.txt('Your blade: ' + fz.degree + ' strikes, training ' + fz.T.toFixed(0) + '%, validation ' + fz.V.toFixed(0) + '%, gap ' + fz.G.toFixed(0), 480, 240, 18, UI.COL.gold, CENTER);
      UI.drawButtons(btn);
    },
    mousePressed: function (mx, my) { UI.clickButtons(btn, mx, my); }
  };
};
function setup() {
  var c = createCanvas(Forge.CONFIG.W, Forge.CONFIG.H); c.parent('game-holder'); pixelDensity(1); frameRate(60);
  Forge.State.load(); Forge.go('title'); Forge.resize();
}
function draw() {
  var dt = Math.min(deltaTime / 1000, 0.05), sc = Forge.current;
  if (!Forge.paused && sc.update) sc.update(dt);
  sc.draw();
  if (Forge.paused) {
    noStroke(); fill(0, 0, 0, 170); rect(0, 0, Forge.CONFIG.W, Forge.CONFIG.H);
    Forge.UI.txt('PAUSED', 480, 260, 48, Forge.UI.COL.gold, CENTER, CENTER); Forge.UI.txt('Press P to continue', 480, 305, 18, Forge.UI.COL.ink, CENTER);
  }
}
function windowResized() { Forge.resize(); }
function keyPressed() {
  if (key === 'p' || key === 'P') { Forge.paused = !Forge.paused; return false; }
  if (Forge.paused) return false;
  var sc = Forge.current; if (sc && sc.keyPressed) sc.keyPressed(key, keyCode);
  return (keyCode === 32 || (keyCode >= 37 && keyCode <= 40)) ? false : undefined; // stop page scrolling
}
function mousePressed() {
  if (Forge.paused || mouseX < 0 || mouseY < 0 || mouseX > Forge.CONFIG.W || mouseY > Forge.CONFIG.H) return;
  var sc = Forge.current; if (sc && sc.mousePressed) sc.mousePressed(mouseX, mouseY);
}
