#!/usr/bin/env node
// Erzeugt mimic/sounds/sounds.js aus mimic/sounds/credits.json (Liste aller Töne mit Quelle/Lizenz).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'mimic', 'sounds');
const list = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8')).filter((s) => fs.existsSync(path.join(dir, s.file)));
fs.writeFileSync(path.join(dir, 'sounds.js'), '// AUTOMATISCH ERZEUGT von tools/build-sounds.js\nwindow.SOUNDS = ' + JSON.stringify(list) + ';\n');
console.log('Töne:', list.length);
