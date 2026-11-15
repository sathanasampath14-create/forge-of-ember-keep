/* "Data Science Note": a short plain-language note shown AFTER a concept has been played (once per session per note).
   The validation screen deliberately has no note, so the overfitting idea is still discovered by playing. */
(function () {
  'use strict';
  var F = Forge, UI = F.UI;
  F.scenes = F.scenes || {};
  var NOTES = {
    ore: { title: 'Collecting data',
      text: 'Each rock you caught is one observation: where it landed (the input) and how high it shines (the output).\n\n' +
            'More observations give a model more to learn from (sample size). Cracked ore is noise: random scatter around the true pattern. Fake gold is an outlier: a value far away from the pattern. Both make the true pattern harder to see.' },
    heat: { title: 'Cleaning data',
      text: 'Heating was data cleaning: removing noisy points and outliers before learning.\n\n' +
            'Cleaning too little leaves bad data in. Cleaning too much throws away good data and shrinks your sample. Good cleaning removes the bad points and keeps the good ones.' },
    pour: { title: 'Splitting data',
      text: 'The ore in the sword is the training set: the model learns from it. The ore left in the bucket is the validation set, kept aside to check the model on data it has never seen.\n\n' +
            'Pour too little and the model has too little to learn from. Pour everything and nothing is left for an honest check.' }
  };
  F.scenes.note = {
    enter: function () {
      this.n = NOTES[F.noteData.key];
      this.btn = [{ x: 380, y: 440, w: 200, h: 50, label: 'Got it', fn: function () { F.go(F.noteData.next); } }];
    },
    draw: function () {
      UI.bg(); noStroke(); UI.sf([236, 222, 190]); stroke(110, 80, 40); strokeWeight(4); rect(130, 70, 700, 350, 14);
      noStroke(); UI.sf([200, 180, 140]); rect(130, 70, 700, 14, 7); rect(130, 406, 700, 14, 7);
      UI.txt('DATA SCIENCE NOTE', 480, 118, 15, [130, 90, 40], CENTER);
      UI.txt(this.n.title, 480, 160, 30, [60, 36, 16], CENTER);
      UI.wrap(this.n.text, 175, 190, 610, 220, 17, [50, 36, 24]);
      UI.drawButtons(this.btn);
    },
    mousePressed: function (mx, my) { UI.clickButtons(this.btn, mx, my); },
    keyPressed: function (k, kc) { if (kc === F.K.ENTER || kc === F.K.SPACE) F.go(F.noteData.next); }
  };
})();
