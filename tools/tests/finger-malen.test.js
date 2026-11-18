const { chromium, devices, webkit } = require('playwright');
const URL = process.env.URL || 'http://localhost:8123/mimic/?debug';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const mk = async (l) => { const c = await b.newContext({ ...devices['iPhone 13'], permissions: ['microphone'] }); const p = await c.newPage(); p.on('pageerror', e => { if (!global.seenErr) { global.seenErr = 1; console.log(l, 'FEHLER', e.message, '\n', e.stack); } }); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(l, m.type(), m.text().slice(0, 200)); }); await p.goto(URL); return p; };
  const A = await mk('A'), B = await mk('B');
  await A.tap('.flag-btn[data-lang=de]'); await A.fill('#in-name', 'Anna'); await A.tap('#btn-create'); await A.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 20000 });
  const code = (await A.textContent('#lobby-code')).trim();
  await B.tap('.flag-btn[data-lang=de]'); await B.fill('#in-name', 'Bob'); await B.fill('#in-code', code); await B.tap('#btn-join'); await B.waitForSelector('#screen-lobby:not(.hidden)', { timeout: 30000 });
  await A.selectOption('#set-mode', 'draw'); await A.tap('#btn-start');
  await B.waitForSelector('#dcv'); await B.waitForTimeout(500);
  const cdp = await B.context().newCDPSession(B);
  const bx = await B.locator('#dcv').boundingBox();
  const pts = Array.from({ length: 20 }, (_, i) => ({ x: bx.x + 20 + i * 12, y: bx.y + 30 + i * 6 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
  for (const p of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] }); await B.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await B.waitForTimeout(300);
  console.log('Striche nach Finger-Malen:', await B.evaluate(() => __echo.view.draw.strokes.map(s => s.p.length / 2)));
  await B.screenshot({ path: __dirname + '/tch.png' });
  await b.close();
})();
