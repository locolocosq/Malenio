#!/usr/bin/env node
// Baut words.js aus den Textdateien in /words.
// Format pro Zeile:  Deutsch|Amharisch     Schwierigkeit per "@1" / "@2" / "@3"
// Jedes Wort bekommt eine feste ID (Position in der Liste), damit deutsche und
// äthiopische Spieler im selben Spiel dasselbe Wort haben.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'words');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();

const seenDe = new Set();
const out = [];
let dupes = 0;
for (const f of files) {
  let diff = 1;
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^@[123]$/.test(line)) { diff = Number(line[1]); continue; }
    const parts = line.split('|');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      console.warn(`Ungültige Zeile in ${f}: ${line}`);
      continue;
    }
    const de = parts[0].trim();
    const am = parts[1].trim();
    const key = de.toLowerCase();
    if (seenDe.has(key)) { dupes++; continue; }
    seenDe.add(key);
    out.push([de, am, diff]);
  }
}

const counts = [0, 0, 0];
out.forEach(w => counts[w[2] - 1]++);
const js = '// AUTOMATISCH ERZEUGT von tools/build-words.js – nicht von Hand bearbeiten.\n' +
  '// [Deutsch, Amharisch, Schwierigkeit 1-3]\n' +
  'window.WORDS = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'words.js'), js);
console.log(`Wörter: ${out.length} (leicht ${counts[0]}, mittel ${counts[1]}, schwer ${counts[2]}), Duplikate übersprungen: ${dupes}`);
