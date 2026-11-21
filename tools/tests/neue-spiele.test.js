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
    const tapAt = async (P, la, lo) => { await P.evaluate(() => document.querySelector('.geo-map').scrollIntoView({ block: 'center' })); await P.waitForTimeout(150); const pt = await P.evaluate(([la, lo]) => { const svg = document.querySelector('.geo-map'), p = svg.createSVGPoint(), [x0, y0, w, h] = svg.getAttribute('viewBox').split(' ').map(Number); p.x = Math.min(x0 + w * .97, Math.max(x0 + w * .03, (lo + 180) * 4)); p.y = Math.min(y0 + h * .97, Math.max(y0 + h * .03, (90 - la) * 4)); const s = p.matrixTransform(svg.getScreenCTM()); return [s.x, s.y]; }, [la, lo]); await P.mouse.click(pt[0], pt[1]); await P.waitForTimeout(200); await P.locator('#geo-ok').scrollIntoViewIfNeeded(); await P.tap('#geo-ok', { timeout: 5000 }); };
    const span = { w: 8, eu: 4, af: 6, as: 8, am: 8, de: 0.6, et: 0.8 }[pl[4]];
    await tapAt(A, pl[2], pl[3]); console.log('    nach Tippen: Knopf aktiv?', await A.evaluate(() => !document.querySelector('#geo-ok').disabled)); await tapAt(B, pl[2] + span, pl[3]); await tapAt(C, pl[2] - span * 2, pl[3] + span);
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
  await run('treasure', async () => {
    await start('treasure'); await Promise.all(ALL.map((P) => P.waitForSelector('.tr-c', { timeout: 20000 })));
    for (const [P, cells] of [[A, [0, 1, 2]], [B, [3, 4, 5]], [C, [6, 7, 8]]]) { for (const c of cells) await P.tap(`.tr-c[data-i="${c}"]`); if (P === B) await shot(B, 'treasure-verstecken'); await P.tap('#tr-ok'); }
    await waitPhase(A, 'xtr_dig'); await Promise.all(ALL.map((P) => P.waitForSelector('.tr-c:not([disabled])')));
    await A.tap('.tr-c[data-i="3"]'); await B.tap('.tr-c[data-i="0"]'); await C.tap('.tr-c[data-i="20"]');
    await waitPhase(A, 'xtr_show', 8000); await A.waitForTimeout(400); await shot(A, 'treasure-fund'); console.log('   ', (await A.textContent('#stage')).replace(/\s+/g, ' ').slice(0, 120));
    for (let turn = 2; turn <= 6; turn++) {
      const ph = await A.waitForFunction(() => ['xtr_dig', 'results'].includes(__echo.view.state.phase) && __echo.view.state.phase, null, { timeout: 15000 }).then((h) => h.jsonValue());
      if (ph === 'results') break;
      for (const P of ALL) { await P.waitForSelector('.tr-c:not([disabled])', { timeout: 8000 }); await P.locator('.tr-c:not([disabled])').last().tap(); }
      await A.waitForFunction(() => __echo.view.state.phase !== 'xtr_dig', null, { timeout: 15000 });
    }
    await waitPhase(A, 'results', 20000); await A.waitForTimeout(400); await shot(A, 'treasure-erg'); console.log('   ', await gains());
  });
  await run('letters', async () => {
    await start('letters'); await Promise.all(ALL.map((P) => P.waitForSelector('#let-in', { timeout: 20000 })));
    const xs = await A.evaluate(() => __echo.view.state.xs); console.log('    Buchstaben DE:', xs.de.join(' '), '| AM:', xs.am.join(' '));
    await A.fill('#let-in', 'x'); await A.press('#let-in', 'Enter'); await A.waitForTimeout(200);
    console.log('    falsches Wort abgelehnt:', await A.isVisible('#let-f') ? 'ja ✔' : 'NEIN ✘');
    await A.fill('#let-in', 'Wort' + xs.de.join('').toLowerCase()); await A.press('#let-in', 'Enter');
    await B.fill('#let-in', xs.am.join('')); await shot(B, 'letters'); await B.press('#let-in', 'Enter');
    await waitPhase(A, 'xlet_rev', 8000); console.log('    Runde sofort beendet, als nur Cem übrig war ✔');
    await A.waitForSelector('.bw-f'); await A.waitForTimeout(400); await shot(A, 'letters-abstimmung');
    await A.locator('.bw-f[data-i="1"]').click(); await C.locator('.bw-f[data-i="1"]').click(); await A.waitForTimeout(500);
    for (const P of ALL) await P.tap('#let-ok');
    await waitPhase(A, 'results', 8000); await A.waitForTimeout(400); await shot(A, 'letters-erg');
    const g = await gains(); console.log('   ', g, g === 'Anna:+100 Bob:+0 Cem:+0' ? '(richtig: Bobs Wort zählt nicht)' : '(FALSCH: erwartet Anna 100, Bob 0, Cem 0)');
  });
  const ids = async () => ({ A: await A.evaluate(() => __echo.net.myId), B: await B.evaluate(() => __echo.net.myId), C: await C.evaluate(() => __echo.net.myId) });
  const expect = async (want) => { const g = await gains(); console.log('   ', g, g === want ? '(richtig)' : '(FALSCH, erwartet ' + want + ')'); };
  await run('wyr', async () => {
    await start('wyr'); await Promise.all(ALL.map((P) => P.waitForSelector('.wyr-b', { timeout: 20000 }))); await shot(B, 'wyr');
    await A.tap('.wyr-b[data-c="0"]'); await B.tap('.wyr-b[data-c="0"]'); await C.tap('.wyr-b[data-c="1"]');
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'wyr-erg'); await expect('Anna:+100 Bob:+100 Cem:+0');
  });
  await run('group', async () => {
    await start('group'); await Promise.all(ALL.map((P) => P.waitForSelector('.grp-b', { timeout: 20000 }))); await shot(A, 'group');
    await A.tap('.grp-b[data-c="0"]'); await B.tap('.grp-b[data-c="0"]'); await C.tap('.grp-b[data-c="1"]');
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'group-erg'); await expect('Anna:+30 Bob:+30 Cem:+0');
  });
  await run('balloon', async () => {
    await start('balloon'); await Promise.all(ALL.map((P) => P.waitForSelector('#b-pump', { timeout: 20000 })));
    for (let i = 0; i < 2; i++) await A.locator('#b-pump').dispatchEvent('pointerdown');
    await shot(A, 'balloon'); await A.tap('#b-bank');
    for (let i = 0; i < 60 && !(await B.isDisabled('#b-pump')); i++) await B.locator('#b-pump').dispatchEvent('pointerdown');
    await B.waitForTimeout(200); await shot(B, 'balloon-platzt'); await C.tap('#b-bank');
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await expect('Anna:+10 Bob:+0 Cem:+0');
  });
  await run('noise', async () => {
    await start('noise'); await Promise.all(ALL.map((P) => P.waitForSelector('.grp-b', { timeout: 20000 })));
    const xs = await A.evaluate(() => __echo.view.state.xs), ok = xs.opts.indexOf(xs.snd); await shot(B, 'noise');
    await A.tap(`.grp-b[data-o="${ok}"]`); await A.waitForTimeout(150); await B.tap(`.grp-b[data-o="${(ok + 1) % 4}"]`); await C.tap(`.grp-b[data-o="${ok}"]`);
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'noise-erg'); await expect('Anna:+100 Bob:+0 Cem:+80');
  });
  await run('oneword', async () => {
    for (const dup of [true, false]) {
      if (dup) await start('oneword'); else await waitPhase(A, 'xow_hint', 30000);
      await A.waitForFunction(() => __echo.view.state.phase === 'xow_hint' && __echo.view.state.xs, null, { timeout: 20000 });
      const I = await ids(), g = await A.evaluate(() => __echo.view.state.xs.guesser), word = await A.evaluate(() => WORDS[__echo.host.xs.w][0]);
      const givers = [['A', A], ['B', B], ['C', C]].filter(([k]) => I[k] !== g), guesser = [['A', A], ['B', B], ['C', C]].find(([k]) => I[k] === g);
      for (const [k, P] of givers) { await P.waitForSelector('#ow-in'); await P.fill('#ow-in', dup ? 'Haus' : 'Hinweis' + k); await P.press('#ow-in', 'Enter'); }
      if (dup) await shot(givers[0][1], 'oneword-hinweis');
      await guesser[1].waitForSelector('#ow-gi', { timeout: 10000 }); if (dup) await shot(guesser[1], 'oneword-raten');
      await guesser[1].fill('#ow-gi', word); await guesser[1].press('#ow-gi', 'Enter');
      await waitPhase(A, 'results'); await A.waitForTimeout(400); if (dup) await shot(A, 'oneword-erg');
      const gg = await A.evaluate(() => __echo.view.state.gains), pts = [gg[g] || 0, ...givers.map(([k]) => gg[I[k]] || 0)];
      console.log(`    Wort „${word}“, ${dup ? 'doppelte Hinweise' : 'verschiedene Hinweise'}: Rater +${pts[0]}, Hinweisgeber +${pts[1]} / +${pts[2]}`, (dup ? pts.join() === '100,0,0' : pts.join() === '100,50,50') ? '(richtig)' : '(FALSCH)');
    }
  });
  await run('slf', async () => {
    await start('slf'); await Promise.all(ALL.map((P) => P.waitForSelector('.slf-form input', { timeout: 20000 })));
    const xs = await A.evaluate(() => __echo.view.state.xs);
    const fill = async (P, L, wrong) => { for (let i = 0; i < 5; i++) await P.locator(`.slf-form input[data-i="${i}"]`).fill(i < wrong ? 'Q' + i + 'x' : L + 'wort' + i); };
    await fill(A, xs.de, 0); await fill(B, xs.am, 0); await fill(C, xs.de, 2); await shot(B, 'slf'); await A.waitForTimeout(900);
    await A.tap('#slf-stop-b'); await waitPhase(A, 'xslf_rev', 12000); await A.waitForTimeout(600); await shot(A, 'slf-pruefen');
    const I = await ids(); await B.locator(`.bw-f[data-p="${I.A}"][data-k="0"]`).click(); await C.locator(`.bw-f[data-p="${I.A}"][data-k="0"]`).click(); await A.waitForTimeout(500);
    for (const P of ALL) await P.tap('#slf-ok');
    await waitPhase(A, 'results', 8000); await A.waitForTimeout(400); await shot(A, 'slf-erg'); await expect('Anna:+50 Bob:+100 Cem:+30');  // Anna: 1 ungültig, 1 allein (20), 3 gleich wie Cem (je 10)
  });
  await run('story', async () => {
    await start('story'); const I = await ids(), byId = { [I.A]: A, [I.B]: B, [I.C]: C }, nameOf = { [I.A]: 'Anna', [I.B]: 'Bob', [I.C]: 'Cem' };
    for (let n = 0; n < 6; n++) {
      await A.waitForFunction((n) => __echo.view.state.phase === 'xst_write' && __echo.view.state.xs && __echo.view.state.xs.n === n, n, { timeout: 15000 });
      const cur = await A.evaluate(() => __echo.view.state.xs.cur), P = byId[cur];
      await P.waitForSelector('#st-in', { timeout: 8000 }); if (n === 1) await shot(P, 'story-schreiben');
      await P.fill('#st-in', `Satz ${n + 1} von ${nameOf[cur]}.`); await P.tap('#st-f button');
    }
    await waitPhase(A, 'xst_read'); await A.waitForTimeout(800); await shot(A, 'story-lesen');
    const lines = await A.evaluate(() => __echo.view.state.xs.lines.map((l) => l.pid));
    const voteFor = async (P, who) => { const i = lines.findIndex((x) => x === who); await P.locator(`.st-line[data-i="${i}"]`).click(); };
    await voteFor(A, I.B); await voteFor(B, I.C); await voteFor(C, I.B);
    await waitPhase(A, 'results'); await A.waitForTimeout(400); await shot(A, 'story-erg'); await expect('Anna:+40 Bob:+120 Cem:+80');
  });
  console.log(errs.length ? 'JS-FEHLER:\n  ' + [...new Set(errs)].join('\n  ') : 'keine JS-Fehler');
  await b.close();
})();
