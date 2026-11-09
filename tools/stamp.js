#!/usr/bin/env node
// Hängt an die eingebundenen Dateien eine Versions-Kennung (?v=...), damit Handys nach einem
// Update nie eine alte, gespeicherte Datei verwenden. Gilt für Malenio und Echo Party (mimic/).
// Vor jedem Veröffentlichen ausführen:  node tools/build-words.js && node tools/build-sounds.js && node tools/stamp.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const PAGES = [
  ['index.html', ['app.js', 'words.js', 'style.css']],
  ['mimic/index.html', ['game.js', 'score.js', 'style.css', 'sounds/sounds.js']],
];
for (const [page, files] of PAGES) {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) continue;
  let html = fs.readFileSync(pagePath, 'utf8');
  for (const f of files) {
    const fp = path.join(path.dirname(pagePath), f);
    if (!fs.existsSync(fp)) continue;
    const v = crypto.createHash('sha1').update(fs.readFileSync(fp)).digest('hex').slice(0, 8);
    html = html.replace(new RegExp('(["\'])' + f.replace(/[.\/]/g, (c) => '\\' + c) + '(\\?v=[0-9a-f]+)?\\1'), `$1${f}?v=${v}$1`);
    console.log(page, f, v);
  }
  fs.writeFileSync(pagePath, html);
}
