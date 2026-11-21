// Mix mit ALLEN Spielen: jedes Spiel startet, wird kurz gezeigt und dann per ⏹ übersprungen. Prüft, dass nichts abstürzt.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(l + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1])); await p.goto(URL); return p; };
  const A = await mk('Anna'), B = await mk('Bob'), C = await mk('Cem');
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create'); await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  for (const [P, n, l] of [[B, 'Bob', 'am'], [C, 'Cem', 'de']]) { await P.tap(`.flag-btn[data-lang=${l}]`); await P.fill('#in-name', n); await P.fill('#in-code', code); await P.tap('#btn-join'); await P.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 }); }
  await A.evaluate(() => { try { localStorage.removeItem('echo-mix'); } catch (e) {} });
  await A.selectOption('#set-mode', 'mix'); await A.selectOption('#set-rounds', { index: 0 }); await A.tap('#btn-start');
  const n = await A.waitForFunction(() => __echo.view.state.phase === 'intro' && __echo.view.state.rounds, null, { timeout: 30000 }).then((h) => h.jsonValue());
  const seen = [];
  for (let i = 1; i <= n; i++) {
    await A.waitForFunction((i) => __echo.view.state.round === i && __echo.view.state.phase !== 'intro', i, { timeout: 30000 });
    seen.push(await A.evaluate(() => __echo.view.state.mode)); await A.waitForTimeout(1200);
    const ph = await A.evaluate(() => __echo.view.state.phase); if (ph === 'end') break;
    await A.evaluate(() => __echo.host.skip());
  }
  await A.waitForFunction(() => __echo.view.state.phase === 'end', null, { timeout: 20000 });
  console.log(`Mix: ${seen.length}/${n} Spiele gestartet → Ende ✔`);
  console.log(errs.length ? 'JS-FEHLER:\n  ' + [...new Set(errs)].join('\n  ') : 'keine JS-Fehler');
  await b.close();
})();
