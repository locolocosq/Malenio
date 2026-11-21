// Spielt alle 7 neuen Spiele mit 3 Handys (Anna = Host/Deutsch, Bob = Amharisch, Cem = Deutsch) durch.
// Start: python3 -m http.server 8123 (im Repo-Ordner), dann: node tools/tests/neue-spiele.test.js [spiel …]
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
const only = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(l + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1])); await p.goto(URL); return p; };
  const A = await mk('Anna'), B = await mk('Bob'), C = await mk('Cem'), ALL = [A, B, C];
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create'); await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  for (const [P, n, l] of [[B, 'Bob', 'am'], [C, 'Cem', 'de']]) { await P.tap(`.flag-btn[data-lang=${l}]`); await P.fill('#in-name', n); await P.fill('#in-code', code); await P.tap('#btn-join'); await P.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 }); }
  const phase = (P) => P.evaluate(() => __echo.view.state.phase);
  const waitPhase = (P, ph, ms = 20000) => P.waitForFunction((ph) => __echo.view.state.phase === ph, ph, { timeout: ms });
  const gains = () => A.evaluate(() => __echo.view.state.players.map((p) => p.name + ':+' + (__echo.view.state.gains[p.id] || 0)).join(' '));
  const shot = (P, n) => P.screenshot({ path: __dirname + '/x-' + n + '.png' });
  const start = async (mode) => { await A.evaluate(() => __echo.host.toLobby()); await A.waitForTimeout(600); await A.selectOption('#set-mode', mode); await A.selectOption('#set-rounds', { index: 0 }); await A.tap('#btn-start'); };
  const run = async (name, fn) => { if (only.length && !only.includes(name)) return; const t0 = Date.now(); try { await fn(); console.log(`✔ ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); } catch (e) { console.log(`✘ ${name}: ${e.message.split('\n')[0]}`); await shot(A, name + '-fehler'); } };

  await run('hunt', async () => {
    await start('hunt'); await Promise.all(ALL.map((P) => P.waitForSelector('.hunt-c', { timeout: 20000 })));
    await A.waitForTimeout(2600); await shot(A, 'hunt');
    await Promise.all(ALL.map(async (P, k) => {
      const seed = await P.evaluate(() => __echo.view.state.xs.seed), sp = await P.evaluate((s) => __echo.huntSpec(s), seed);
      for (const n of sp.seq) { const i = sp.cells.findIndex((c) => c.n === n); await P.locator(`.hunt-c[data-i="${i}"]`).dispatchEvent('pointerdown'); await P.waitForTimeout(40 + k * 30); }
    }));
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'hunt-erg'); console.log('   ', await gains());
  });
  await run('uniq', async () => {
    await start('uniq'); await Promise.all(ALL.map((P) => P.waitForSelector('.uniq-n', { timeout: 20000 })));
    await shot(B, 'uniq');
    await A.tap('.uniq-n[data-n="7"]'); await B.tap('.uniq-n[data-n="7"]'); await C.tap('.uniq-n[data-n="5"]');
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'uniq-erg');
    const g = await gains(); console.log('   ', g, g === 'Anna:+0 Bob:+0 Cem:+100' ? '(richtig)' : '(FALSCH: erwartet Cem +100)');
  });
  await run('photo', async () => {
    await start('photo'); await waitPhase(A, 'xphoto_show'); await A.waitForTimeout(500); await shot(A, 'photo-bild');
    await waitPhase(A, 'xphoto_q', 15000); await Promise.all(ALL.map((P) => P.waitForSelector('.pq-b')));
    const seed = await A.evaluate(() => __echo.view.state.xs.seed), sp = await A.evaluate((s) => __echo.photoSpec(s), seed);
    for (let q = 0; q < 3; q++) { await A.tap(`.pq-b[data-q="${q}"][data-o="${sp.qs[q].ok}"]`); await B.tap(`.pq-b[data-q="${q}"][data-o="${(sp.qs[q].ok + 1) % 4}"]`); }
    await shot(B, 'photo-fragen');
    for (let q = 0; q < 3; q++) await C.tap(`.pq-b[data-q="${q}"][data-o="${q === 0 ? sp.qs[q].ok : (sp.qs[q].ok + 1) % 4}"]`);
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'photo-erg');
    const g = await gains(); console.log('   ', g, g === 'Anna:+140 Bob:+0 Cem:+40' ? '(richtig)' : '(FALSCH: erwartet Anna 140, Bob 0, Cem 40)');
  });
  await run('diff', async () => {
    await start('diff'); await Promise.all(ALL.map((P) => P.waitForSelector('.dg-c', { timeout: 20000 })));
    const seed = await A.evaluate(() => __echo.view.state.xs.seed), sp = await A.evaluate((s) => __echo.diffSpec(s), seed);
    await shot(A, 'diff');
    for (const i of sp.spots) await A.locator(`.bot .dg-c[data-i="${i}"]`).dispatchEvent('pointerdown');
    for (const i of sp.spots.slice(0, 3)) await B.locator(`.top .dg-c[data-i="${i}"]`).dispatchEvent('pointerdown');
    const wrong = [...Array(25).keys()].find((i) => !sp.spots.includes(i)); await C.locator(`.bot .dg-c[data-i="${wrong}"]`).dispatchEvent('pointerdown');
    await C.waitForTimeout(1700); for (const i of sp.spots) { await C.locator(`.bot .dg-c[data-i="${i}"]`).dispatchEvent('pointerdown'); }
    await B.waitForTimeout(300); for (const i of sp.spots.slice(3)) await B.locator(`.bot .dg-c[data-i="${i}"]`).dispatchEvent('pointerdown');
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'diff-erg'); console.log('   ', await gains());
  });
  await run('sort', async () => {
    await start('sort'); await Promise.all(ALL.map((P) => P.waitForSelector('.sort-bin', { timeout: 20000 })));
    await A.waitForTimeout(2600);
    const seed = await A.evaluate(() => __echo.view.state.xs.seed), sp = await A.evaluate((s) => __echo.sortSpec(s), seed);
    const play = async (P, n, wrongEvery) => { for (let i = 0; i < n; i++) { const c = sp.seq[i].c, k = wrongEvery && i % wrongEvery === 0 ? (c + 1) % 3 : c; await P.locator(`.sort-bin[data-k="${k}"]`).dispatchEvent('pointerdown'); await P.waitForTimeout(60); } };
    await Promise.all([play(A, 20, 0), play(B, 15, 5), play(C, 8, 0)]); await shot(B, 'sort');
    await waitPhase(A, 'results', 45000); await A.waitForTimeout(400); await shot(A, 'sort-erg');
    const g = await gains(); console.log('   ', g, g === 'Anna:+130 Bob:+45 Cem:+40' ? '(richtig)' : '(prüfen: erwartet Anna 130, Bob 45, Cem 40)');
  });
  await run('geo', async () => {
    await start('geo'); await Promise.all(ALL.map((P) => P.waitForSelector('.geo-map', { timeout: 25000 })));
    const pl = await A.evaluate(() => window.GEO.places[__echo.view.state.xs.i]); console.log('    Ort:', pl[0], '/', pl[1], '(' + pl[4] + ')');
    await shot(B, 'geo');
    const tapAt = async (P, la, lo) => { const pt = await P.evaluate(([la, lo]) => { const svg = document.querySelector('.geo-map'), p = svg.createSVGPoint(); p.x = (lo + 180) * 4; p.y = (90 - la) * 4; const s = p.matrixTransform(svg.getScreenCTM()); return [s.x, s.y]; }, [la, lo]); await P.mouse.click(pt[0], pt[1]); await P.tap('#geo-ok'); };
    const span = { w: 20, eu: 4, af: 6, as: 8, am: 8, de: 0.6, et: 0.8 }[pl[4]];
    await tapAt(A, pl[2], pl[3]); await tapAt(B, pl[2] + span, pl[3]); await tapAt(C, pl[2] - span * 2, pl[3] + span);
    await waitPhase(A, 'results'); await A.waitForTimeout(500); await shot(A, 'geo-erg'); console.log('   ', await gains(), '| Liste:', (await A.textContent('.vlist')).replace(/\s+/g, ' ').slice(0, 140));
  });
  await run('bomb', async () => {
    await start('bomb'); await waitPhase(A, 'xbomb');
    const st = await A.evaluate(() => __echo.view.state); const byId = { [await A.evaluate(() => __echo.net.myId)]: A, [await B.evaluate(() => __echo.net.myId)]: B, [await C.evaluate(() => __echo.net.myId)]: C };
    console.log('    Thema:', (await A.textContent('.bomb-theme')).trim(), '| Anfänger:', st.players.find((p) => p.id === st.xs.holder).name);
    const words = ['Apfel', 'Banane', 'apfel', 'Kirsche', 'Waschmaschine'];
    for (const w of words) {
      const h = await A.evaluate(() => __echo.view.state.xs.holder), P = byId[h];
      await P.waitForSelector('#bomb-f:not(.hidden)'); await P.fill('#bomb-in', w); await P.press('#bomb-in', 'Enter'); await A.waitForTimeout(500);
      if (w === 'Banane') await shot(P, 'bomb');
    }
    const ws = await A.evaluate(() => __echo.view.state.xs.words.map((w) => w.w)); console.log('    Wörter:', ws.join(', '), ws.includes('apfel') ? '(FALSCH: doppelt angenommen)' : '(doppeltes „apfel“ abgelehnt ✔)');
    // die anderen beiden markieren „Waschmaschine“ als ungültig → sofort BUMM beim Schreiber
    const last = await A.evaluate(() => { const ws = __echo.view.state.xs.words; return { i: ws.length - 1, pid: ws[ws.length - 1].pid }; });
    for (const [id, P] of Object.entries(byId)) if (id !== last.pid) { await P.locator(`.bw-f[data-i="${last.i}"]`).click(); await P.waitForTimeout(300); }
    await waitPhase(A, 'xboom', 5000); await A.waitForTimeout(700); await shot(A, 'bomb-boom');
    const lo = await A.evaluate(() => __echo.view.state.xs.loser); console.log('    Verlierer = Schreiber des ungültigen Worts:', lo === last.pid ? 'ja ✔' : 'NEIN ✘');
    await waitPhase(A, 'results', 20000); await A.waitForTimeout(400); await shot(A, 'bomb-erg'); console.log('   ', await gains());
    // Runde 2: Bombe platzt von allein; danach wird das letzte Wort noch als ungültig markiert → Schreiber ist schuld
    await waitPhase(A, 'xbomb', 20000);
    const h1 = await A.evaluate(() => __echo.view.state.xs.holder); await byId[h1].fill('#bomb-in', 'Quatschwort'); await byId[h1].press('#bomb-in', 'Enter');
    await waitPhase(A, 'xboom', 70000);
    const before = await A.evaluate(() => __echo.view.state.xs.loser);
    const others = Object.entries(byId).filter(([id]) => id !== h1);
    for (const [, P] of others) { await P.locator('.bw-f[data-i="0"]').click(); await P.waitForTimeout(300); }
    await A.waitForTimeout(600);
    const after = await A.evaluate(() => __echo.view.state.xs.loser);
    console.log('    nach dem Platzen umgestimmt:', before !== h1 && after === h1 ? 'Schuld wandert zum Schreiber ✔' : `prüfen (vorher ${before === h1 ? 'Schreiber' : 'Halter'}, nachher ${after === h1 ? 'Schreiber' : 'Halter'})`);
  });
  console.log(errs.length ? 'JS-FEHLER:\n  ' + [...new Set(errs)].join('\n  ') : 'keine JS-Fehler');
  await b.close();
})();
