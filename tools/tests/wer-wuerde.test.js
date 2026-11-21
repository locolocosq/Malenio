const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); p.on('pageerror', e => errs.push(l + ': ' + e.message)); await p.goto(URL); return p; };
  const A = await mk('Anna'), B = await mk('Bob'), C = await mk('Cem'), D = await mk('Dora');
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create'); await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  for (const [P, n, l] of [[B, 'Bob', 'am'], [C, 'Cem', 'de'], [D, 'Dora', 'de']]) { await P.tap(`.flag-btn[data-lang=${l}]`); await P.fill('#in-name', n); await P.fill('#in-code', code); await P.tap('#btn-join'); await P.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 }); }
  await A.selectOption('#set-mode', 'most'); await A.waitForTimeout(400);
  console.log('Runden:', await A.$$eval('#set-rounds option', o => o.map(x => x.textContent).join(',')), '| Bob sieht:', await B.textContent('#lobby-mode'));
  await A.tap('#btn-start');
  for (const P of [A, B, C, D]) await P.waitForSelector('.most-p', { timeout: 20000 });
  console.log('Frage DE:', await A.textContent('.est-q'), '| AM:', await B.textContent('.est-q'));
  await A.screenshot({ path: __dirname + '/w1-frage.png' }); await B.screenshot({ path: __dirname + '/w1-frage-am.png' });
  // Anna, Bob, Cem wählen Dora; Dora wählt Anna
  await A.tap('.most-p >> nth=3'); await B.tap('.most-p >> nth=3'); await C.tap('.most-p >> nth=3');
  await A.waitForTimeout(300); console.log('Hinweis nach Wahl:', await A.textContent('#most-hint'));
  await D.tap('.most-p >> nth=0');
  await A.waitForFunction(() => __echo.view.state.phase === 'results', null, { timeout: 8000 }); await A.waitForTimeout(600);
  await A.screenshot({ path: __dirname + '/w2-ergebnis.png' });
  const g = await A.evaluate(() => __echo.view.state.players.map(p => p.name + ':+' + __echo.view.state.gains[p.id]).join(' '));
  console.log('Punkte:', g, g === 'Anna:+100 Bob:+100 Cem:+100 Dora:+25' ? '✔' : '✘ erwartet Anna/Bob/Cem +100, Dora +25');
  // Runde 2: Dora geht während der Abstimmung, die anderen haben schon gewählt -> Runde endet trotzdem
  await A.waitForFunction(() => __echo.view.state.phase === 'most' && __echo.view.state.round === 2, null, { timeout: 20000 });
  for (const P of [A, B, C]) await P.tap('.most-p >> nth=1');
  await D.close(); await A.waitForFunction(() => __echo.view.state.phase === 'results', null, { timeout: 30000 });
  console.log('Runde 2 nach Verlassen beendet, Punkte:', await A.evaluate(() => JSON.stringify(Object.values(__echo.view.state.gains))));
  console.log(errs.length ? 'FEHLER: ' + errs.join(' | ') : 'keine JS-Fehler');
  await b.close();
})();
