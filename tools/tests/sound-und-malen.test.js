const { chromium, devices } = require('playwright');
const OUT = __dirname; const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + OUT + '/mic_t2.wav', '--autoplay-policy=no-user-gesture-required'] });
  const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'], permissions: ['microphone'] }); const p = await c.newPage();
    p.on('pageerror', e => console.log(l, 'FEHLER:', e.message)); p.on('console', m => { if (m.type() === 'error') console.log(l, 'console:', m.text().slice(0, 150)); });
    await p.goto(URL); return p; };
  const A = await mk('Anna'), B = await mk('Bob'), C = await mk('Cem');
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create');
  await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  for (const [P, n, l] of [[B, 'Bob', 'am'], [C, 'Cem', 'de']]) { await P.tap(`.flag-btn[data-lang=${l}]`); await P.fill('#in-name', n); await P.fill('#in-code', code); await P.tap('#btn-join'); await P.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 }); }
  await A.waitForTimeout(600);
  // ---------- Modus 1: Töne, mit Start-Knopf ----------
  await A.selectOption('#set-mode', 'sound'); await A.selectOption('#set-rounds', '3'); await A.screenshot({ path: OUT + '/m1-lobby.png' });
  await A.tap('#btn-start');
  await A.waitForSelector('#rec-start', { timeout: 40000 }); await A.waitForTimeout(400); await A.screenshot({ path: OUT + '/m2-startbtn.png' });
  const t0 = Date.now();
  await A.tap('#rec-start'); await A.waitForTimeout(1500); await A.screenshot({ path: OUT + '/m2b-lead.png' }); await B.tap('#rec-start'); // Cem drückt nicht -> startet nach 10 s selbst
  await C.waitForFunction(() => __echo.view.recs.has(__echo.net.myId), null, { timeout: 25000 });
  console.log('Cem automatisch aufgenommen nach', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await A.waitForFunction(() => __echo.view.state.phase === 'show', null, { timeout: 30000 });
  console.log('Töne-Bewertungen:', await A.evaluate(() => Object.values(__echo.view.state.roundScores).join(', ')));
  // zurück zur Lobby für Malen
  await A.evaluate(() => __echo.host.toLobby()); await A.waitForTimeout(800);
  // ---------- Modus 2: Malen ----------
  await A.selectOption('#set-mode', 'draw'); await A.selectOption('#set-rounds', '3'); await A.tap('#btn-start');
  for (const P of [A, B, C]) await P.waitForSelector('#dcv', { timeout: 15000 });
  console.log('Wort Anna/Bob:', await A.textContent('.meme-title'), '/', await B.textContent('.meme-title'));
  const scribble = async (P, k) => { const bx = await P.locator('#dcv').boundingBox(); await P.mouse.move(bx.x + 30 + k * 10, bx.y + 40); await P.mouse.down();
    for (let i = 0; i < 25; i++) await P.mouse.move(bx.x + 30 + k * 10 + i * 9, bx.y + 40 + Math.sin(i / 3 + k) * 60 + i * 4); await P.mouse.up(); };
  await A.tap('.sw >> nth=2'); await scribble(A, 0); await scribble(B, 3); await C.tap('.sw >> nth=6'); await scribble(C, 6);
  await A.waitForTimeout(300); await A.screenshot({ path: OUT + '/m3-draw.png' });
  for (const P of [A, B, C]) await P.tap('#d-done');
  await A.waitForFunction(() => __echo.view.state.phase === 'present', null, { timeout: 15000 });
  for (let k = 0; k < 3; k++) {
    await A.waitForFunction((k) => __echo.view.state.phase === 'present' && __echo.view.state.showIdx === k && !__echo.view.state.present.revealed, k, { timeout: 30000 });
    await A.waitForTimeout(1500);
    const presenter = await A.evaluate(() => __echo.view.state.players.find(p => p.id === __echo.view.state.showPid).name);
    if (k === 0) { const V = presenter === 'Anna' ? B : A; await V.screenshot({ path: OUT + '/m4-present.png' }); }
    let stars = 3; for (const [P, n] of [[A, 'Anna'], [B, 'Bob'], [C, 'Cem']]) if (n !== presenter) { await P.tap(`.vstar[data-n="${stars}"]`); stars += 2; if (k === 0 && stars === 5) { await A.waitForTimeout(400); await (presenter === 'Anna' ? B : A).screenshot({ path: OUT + '/m4b-chips.png' }); } }
    await A.waitForFunction(() => __echo.view.state.present && __echo.view.state.present.revealed, null, { timeout: 15000 });
    console.log('  Bild von', presenter, '→ Ø', await A.evaluate(() => __echo.view.state.present.avg), 'Sterne =', await A.evaluate(() => __echo.view.state.present.score), 'Punkte');
    if (k === 0) { await A.waitForTimeout(500); await A.screenshot({ path: OUT + '/m5-reveal.png' }); }
  }
  await A.waitForFunction(() => __echo.view.state.phase === 'results', null, { timeout: 20000 });
  console.log('Stand nach Malrunde:', await A.evaluate(() => __echo.view.state.players.map(p => p.name + ':' + p.score).join(' ')));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
