const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
(async () => {
  const b = await chromium.launch(); const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); p.on('pageerror', e => console.log(l, 'FEHLER', e.message, e.stack.split('\n')[1])); await p.goto(URL); return p; };
  const A = await mk('A'), B = await mk('B'), C = await mk('C');
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create'); await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  for (const [P, n] of [[B, 'Bob'], [C, 'Cem']]) { await P.tap('.flag-btn[data-lang=de]'); await P.fill('#in-name', n); await P.fill('#in-code', code); await P.tap('#btn-join'); await P.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 }); }
  await A.selectOption('#set-mode', 'guess'); await A.selectOption('#set-rounds', '1'); await A.tap('#btn-start');
  await A.waitForFunction(() => __echo.view.state.phase === 'choose', null, { timeout: 20000 });
  const P = { Anna: A, Bob: B, Cem: C };
  const dn = await A.evaluate(() => __echo.view.state.players.find(p => p.id === __echo.view.state.drawer).name); const D = P[dn];
  await D.waitForSelector('.choice'); await D.tap('.choice >> nth=0'); await D.waitForSelector('#gcv');
  const G = Object.entries(P).find(([n]) => n !== dn)[1];
  await G.waitForTimeout(1000);
  console.log('Phase:', await G.evaluate(() => __echo.view.state.phase), '| Eingabe da:', !!(await G.$('#g-in')), '| Bühne:', (await G.textContent('#stage')).slice(0, 120));
  await G.fill('#g-in', 'Quatsch'); await G.press('#g-in', 'Enter'); await G.waitForTimeout(800);
  console.log('Chat bei Malendem:', await D.evaluate(() => (document.querySelector('#g-chat')||{}).textContent), '| Chat bei Rater:', await G.evaluate(() => (document.querySelector('#g-chat')||{}).textContent));
  const w = await A.evaluate(() => WORDS[__echo.host.wordIdx][0]); console.log('Wort:', w);
  await G.fill('#g-in', w); await G.press('#g-in', 'Enter'); await G.waitForTimeout(1500);
  console.log('Phase danach:', await A.evaluate(() => __echo.view.state.phase), JSON.stringify(await A.evaluate(() => __echo.view.state.gains)));
  await G.screenshot({ path: __dirname + '/g7.png' });
  await b.close();
})();
