#!/usr/bin/env node
// Hängt an app.js, words.js und style.css in index.html eine Versions-Kennung (?v=...),
// damit Handys nach einem Update nie eine alte, gespeicherte Datei verwenden.
// Vor jedem Veröffentlichen ausführen:  node tools/build-words.js && node tools/stamp.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const f of ['app.js', 'words.js', 'style.css']) {
  const v = crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8);
  html = html.replace(new RegExp('(["\'])' + f.replace('.', '\\.') + '(\\?v=[0-9a-f]+)?\\1'), `$1${f}?v=${v}$1`);
  console.log(f, v);
}
fs.writeFileSync(path.join(root, 'index.html'), html);
