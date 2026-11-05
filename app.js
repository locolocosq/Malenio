/* Malenio – Mal- und Ratespiel, Peer-to-Peer (kein eigener Server nötig).
 * Das Gerät, das die Lobby erstellt, ist der Host: es hält den Spielstand und
 * leitet alles an die anderen weiter. Verbindungen laufen direkt über WebRTC;
 * der kostenlose PeerJS-Dienst wird nur zum ersten "Finden" der Geräte benutzt.
 */
(() => {
'use strict';

// ---------------------------------------------------------------- Konstanten
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I
const CODE_LEN = 5;
const MAX_PLAYERS = 8;
const CHOOSE_TIME = 15;   // Sekunden zum Wort wählen
const REVEAL_TIME = 8;    // Sekunden Auflösung
const DIFF_MULT = { 1: 1, 2: 1.3, 3: 1.6 };
const W = 800, H = 600;   // logische Canvas-Größe (für alle gleich)
const COLORS = [
  '#000000', '#4d4d4d', '#9e9e9e', '#ffffff', '#e53935', '#ff7043', '#ff9800', '#ffd600',
  '#7cb342', '#2e7d32', '#00bcd4', '#1e88e5', '#283593', '#8e24aa', '#ec407a', '#f8bbd0',
  '#795548', '#4e342e', '#ffcc80', '#c5e1a5', '#b3e5fc', '#d1c4e9', '#00897b', '#b71c1c',
];
const AVATAR_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#d81b60', '#6d4c41'];
// Verbindungs-Server fürs Telefon. TURN = kostenloser Relay von Metered (Open Relay),
// damit der Sprachchat auch zwischen WLAN und mobilen Daten funktioniert.
const TURN_USER = '44a0ba51e09545086b4b4ce3', TURN_PASS = 'xA+tBgw5yXc5eCSK';
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turn:global.relay.metered.ca:443', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: TURN_USER, credential: TURN_PASS },
] };
// Relay-Server (TURN), damit Spieler in verschiedenen Netzen (WLAN / mobile Daten) sich verbinden können.
// Kostenlos bei Metered "Open Relay" (20 GB/Monat). Hier die Adresse mit dem eigenen API-Key eintragen:
const TURN_CREDENTIALS_URL = '';
let iceConfigPromise = null;
function getIceConfig() {
  if (!iceConfigPromise) iceConfigPromise = (async () => {
    if (!TURN_CREDENTIALS_URL) return ICE;
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 5000);
      const servers = await (await fetch(TURN_CREDENTIALS_URL, { signal: ctrl.signal })).json();
      if (Array.isArray(servers) && servers.length) return { iceServers: ICE.iceServers.concat(servers) };
    } catch (e) { console.warn('TURN nicht erreichbar, nur direkte Verbindung', e); iceConfigPromise = null; }
    return ICE;
  })();
  return iceConfigPromise;
}
const WORDS = window.WORDS || [];
// Kennung der Wortliste – alle Spieler müssen dieselbe Liste haben (gleiche Wort-Nummern)
const WORDS_VERSION = (() => { let h = 5381; const s = JSON.stringify(WORDS); for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return WORDS.length + '-' + h.toString(36); })();
const wordDiff = (id) => (WORDS[id] ? WORDS[id][2] : 1);
// Geräte-ID (bleibt beim Neuladen gleich), damit man nach einem Verbindungsabbruch seine Punkte zurückbekommt
const CLIENT_ID = (() => {
  try { let id = sessionStorage.getItem('malenio-cid'); if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('malenio-cid', id); } return id; }
  catch (e) { return Math.random().toString(36).slice(2); }
})();

// ---------------------------------------------------------------- Texte
const T = {
  de: {
    yourName: 'Dein Name', namePh: 'Name eingeben', create: 'Lobby erstellen', or: 'oder', join: 'Beitreten',
    codeNote: 'Der Code besteht immer nur aus lateinischen Buchstaben (A–Z) und Zahlen – keine amharischen Schriftzeichen.',
    code: 'Lobby-Code', copy: 'Kopieren', copied: 'Kopiert!', share: 'Teilen', players: 'Spieler',
    lobbyHint: 'Wer den Code hat, kann beitreten.', rounds: 'Runden', drawTime: 'Zeichenzeit (Sek.)',
    start: 'Spiel starten', needTwo: 'Mindestens 2 Spieler nötig', waitHost: 'Warte, bis der Host das Spiel startet…',
    hostTip: 'Lass diese Seite offen – dein Gerät ist der Spiel-Server.', host: 'Host', you: 'du',
    round: 'Runde {a}/{b}', chooseWord: 'Wähle ein Wort zum Zeichnen', isChoosing: '{name} wählt ein Wort…',
    drawThis: 'Zeichne:', guessed: 'Erraten!', whoGuessed: 'Wer hat es erraten?', cancel: 'Abbrechen',
    wordWas: 'Das Wort war', nobody: 'Niemand hat es erraten', timeUp: 'Zeit abgelaufen!', guessedBy: '{name} hat es erraten!',
    pts: 'Punkte', upTo: 'bis zu {n} Punkte', d1: 'Leicht', d2: 'Mittel', d3: 'Schwer',
    gameOver: 'Spiel vorbei!', backLobby: 'Zurück zur Lobby', winner: 'Gewinner',
    leaveConfirm: 'Spiel verlassen und zurück zum Menü?', yes: 'Ja', no: 'Nein',
    hostLeft: 'Der Host hat das Spiel verlassen.', notFound: 'Lobby nicht gefunden. Bitte Code prüfen!',
    full: 'Die Lobby ist voll (max. 8 Spieler).', connecting: 'Verbinde…', creating: 'Lobby wird erstellt…',
    netError: 'Verbindungsfehler – bitte nochmal versuchen.', enterName: 'Bitte gib einen Namen ein.', enterCode: 'Bitte gib einen 5-stelligen Code ein.',
    voiceOn: 'Telefon an – ihr könnt reden', voiceOff: 'Telefon aus', micDenied: 'Kein Zugriff aufs Mikrofon.',
    chatPh: 'Raten oder schreiben…', send: 'Senden', joined: '{name} ist beigetreten', left: '{name} hat verlassen',
    brush: 'Pinsel', eraser: 'Radierer', fill: 'Füllen', undo: 'Rückgängig', clear: 'Alles löschen',
    isDrawing: '{name} zeichnet', drawerLeft: 'Der Zeichner hat das Spiel verlassen.', notEnough: 'Zu wenige Spieler – zurück in die Lobby.',
    gameRunning: 'Spiel läuft – du bist mitten drin!', reconnecting: 'Verbindung kurz weg – verbinde neu…', updating: 'Neue Version wird geladen…', versionMismatch: 'Unterschiedliche Spielversionen – bitte alle die Seite neu laden.', voiceNA: 'Telefon wird noch verbunden – gleich nochmal tippen.', guessedChat: '{name} hat das Wort erraten! 🎉', speaking: 'im Telefon',
  },
  am: {
    yourName: 'ስምዎ', namePh: 'ስም ያስገቡ', create: 'ሎቢ ፍጠር', or: 'ወይም', join: 'ተቀላቀል',
    codeNote: 'ኮዱ ሁልጊዜ የላቲን ፊደላት (A–Z) እና ቁጥሮች ብቻ ነው – የአማርኛ ፊደል አይጠቀሙ።',
    code: 'የሎቢ ኮድ', copy: 'ቅዳ', copied: 'ተቀድቷል!', share: 'አጋራ', players: 'ተጫዋቾች',
    lobbyHint: 'ኮዱ ያለው ሰው መቀላቀል ይችላል።', rounds: 'ዙሮች', drawTime: 'የመሳያ ጊዜ (ሰከንድ)',
    start: 'ጨዋታ ጀምር', needTwo: 'ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ', waitHost: 'አስተናጋጁ ጨዋታውን እስኪጀምር ይጠብቁ…',
    hostTip: 'ይህን ገጽ ክፍት ይተዉት – መሣሪያዎ የጨዋታው አገልጋይ ነው።', host: 'አስተናጋጅ', you: 'እርስዎ',
    round: 'ዙር {a}/{b}', chooseWord: 'የሚስሉትን ቃል ይምረጡ', isChoosing: '{name} ቃል እየመረጠ ነው…',
    drawThis: 'ይሳሉ፦', guessed: 'ተገመተ!', whoGuessed: 'ማን ገመተው?', cancel: 'ሰርዝ',
    wordWas: 'ቃሉ', nobody: 'ማንም አልገመተውም', timeUp: 'ጊዜው አልቋል!', guessedBy: '{name} ገመተው!',
    pts: 'ነጥብ', upTo: 'እስከ {n} ነጥብ', d1: 'ቀላል', d2: 'መካከለኛ', d3: 'ከባድ',
    gameOver: 'ጨዋታው አበቃ!', backLobby: 'ወደ ሎቢ ተመለስ', winner: 'አሸናፊ',
    leaveConfirm: 'ጨዋታውን ትተው ወደ ዋና ማውጫ ይመለሱ?', yes: 'አዎ', no: 'አይ',
    hostLeft: 'አስተናጋጁ ጨዋታውን ለቋል።', notFound: 'ሎቢው አልተገኘም። እባክዎ ኮዱን ያረጋግጡ!',
    full: 'ሎቢው ሞልቷል (ከፍተኛው 8 ተጫዋቾች)።', connecting: 'በማገናኘት ላይ…', creating: 'ሎቢ በመፍጠር ላይ…',
    netError: 'የግንኙነት ስህተት – እባክዎ እንደገና ይሞክሩ።', enterName: 'እባክዎ ስም ያስገቡ።', enterCode: 'እባክዎ ባለ 5 ፊደል ኮድ ያስገቡ።',
    voiceOn: 'ስልኩ በርቷል – መነጋገር ትችላላችሁ', voiceOff: 'ስልኩ ጠፍቷል', micDenied: 'ማይክሮፎን መጠቀም አልተፈቀደም።',
    chatPh: 'ይገምቱ ወይም ይጻፉ…', send: 'ላክ', joined: '{name} ተቀላቀለ', left: '{name} ወጣ',
    brush: 'ብሩሽ', eraser: 'ማጥፊያ', fill: 'ሙላ', undo: 'መልስ', clear: 'ሁሉንም አጥፋ',
    isDrawing: '{name} እየሳለ ነው', drawerLeft: 'ሳዩ ጨዋታውን ለቋል።', notEnough: 'ተጫዋቾች በቂ አይደሉም – ወደ ሎቢ።',
    gameRunning: 'ጨዋታው እየተካሄደ ነው!', reconnecting: 'ግንኙነቱ ተቋርጧል – እንደገና በማገናኘት ላይ…', updating: 'አዲሱ ስሪት እየተጫነ ነው…', versionMismatch: 'የተለያዩ የጨዋታ ስሪቶች – ሁሉም ገጹን እንደገና ይጫኑ።', voiceNA: 'ስልኩ ገና እየተገናኘ ነው – ትንሽ ቆይተው እንደገና ይንኩ።', guessedChat: '{name} ቃሉን ገመተው! 🎉', speaking: 'በስልክ ላይ',
  },
};
let lang = localStorage.getItem('malenio-lang') || null;
const t = (k, vars) => {
  let s = (T[lang || 'de'][k]) ?? T.de[k] ?? k;
  if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
  return s;
};
const FLAG_SVG = {
  de: '<svg viewBox="0 0 5 3" class="pflag"><rect width="5" height="1" fill="#000"/><rect width="5" height="1" y="1" fill="#D00"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>',
  am: '<svg viewBox="0 0 12 6" class="pflag"><rect width="12" height="2" fill="#078930"/><rect width="12" height="2" y="2" fill="#FCDD09"/><rect width="12" height="2" y="4" fill="#DA121A"/><circle cx="6" cy="3" r="2" fill="#0F47AF"/></svg>',
};

// ---------------------------------------------------------------- Helfer
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);
const wordIn = (id, l) => (WORDS[id] ? WORDS[id][l === 'am' ? 1 : 0] : '?');
const maskWord = (w) => [...w].map((c) => (c === ' ' || c === '-' ? ' ' : '_')).join(' ');
const norm = (s) => String(s).toLowerCase().normalize('NFC').replace(/[\s\-_.!?,;:'"\u1361-\u1368]/g, '').replace(/ß/g, 'ss');
function makeCode() { let c = ''; for (let i = 0; i < CODE_LEN; i++) c += CODE_CHARS[rnd(CODE_CHARS.length)]; return c; }
function cleanCode(s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN); }

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function modal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); return $('#modal-box'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-box').innerHTML = ''; }
function confirmBox(text) {
  return new Promise((res) => {
    const box = modal(`<h3>${esc(text)}</h3><div class="row"><button class="btn primary" data-a="1">${t('yes')}</button><button class="btn" data-a="0">${t('no')}</button></div>`);
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { closeModal(); res(b.dataset.a === '1'); });
  });
}

let audioCtx;
function beep(freq = 660, dur = 0.12, type = 'sine', vol = 0.15) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* egal */ }
}
const jingle = () => { beep(523, .12); setTimeout(() => beep(659, .12), 110); setTimeout(() => beep(784, .25), 220); };

// ---------------------------------------------------------------- Bildschirme
function show(screen) {
  ['lang', 'menu', 'lobby', 'game'].forEach((s) => $('#screen-' + s).classList.toggle('hidden', s !== screen));
  const inRoom = screen === 'lobby' || screen === 'game';
  $('#btn-home').classList.toggle('hidden', screen === 'lang');
  $('#btn-phone').classList.toggle('hidden', !inRoom);
  $('#game-info').classList.toggle('hidden', screen !== 'game');
  $('#logo').classList.toggle('hidden', screen === 'game');
}
function applyLang() {
  document.body.classList.toggle('lang-am', lang === 'am');
  document.documentElement.lang = lang === 'am' ? 'am' : 'de';
  document.querySelectorAll('[data-i18n]').forEach((el) => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => el.title = t(el.dataset.i18nTitle));
  $('#btn-change-lang').innerHTML = FLAG_SVG[lang] + (lang === 'am' ? '<span class="am">አማርኛ</span>' : 'Deutsch') + ' ⇄';
}

// ================================================================ Netzwerk
// Spieldaten laufen über einen kostenlosen öffentlichen MQTT-Server (WebSocket über HTTPS).
// Das funktioniert in jedem Netz (WLAN, mobile Daten). Der Host (Ersteller) bleibt der "Chef"
// des Spiels; der MQTT-Server leitet nur Nachrichten weiter. Für Tests: ?broker=ws://...
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
const TOPIC_ROOT = 'malenio/v2/';
const HOST_TIMEOUT = 20000;   // so lange ohne Nachricht vom Host -> "Verbindung weg"
const HOST_GIVEUP = 45000;    // danach zurück ins Menü
const CLIENT_TIMEOUT = 25000; // Host entfernt Spieler, die so lange nichts senden

const net = { mq: null, isHost: false, myId: null, code: null, peer: null, bye: false, timers: [] };
const T_ = (sub) => TOPIC_ROOT + net.code + '/' + sub;
const randId = () => 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function brokerList() {
  const q = new URLSearchParams(location.search).get('broker');
  return q ? [q] : BROKERS;
}
function tryBroker(url, opts) {
  return new Promise((resolve, reject) => {
    const c = mqtt.connect(url, { connectTimeout: 7000, reconnectPeriod: 0, keepalive: 20, clean: true, ...opts });
    const to = setTimeout(() => { c.end(true); reject(new Error('timeout')); }, 8000);
    c.once('connect', () => { clearTimeout(to); c.options.reconnectPeriod = 2000; resolve(c); });
    c.once('error', (e) => { clearTimeout(to); c.end(true); reject(e); });
  });
}
async function connectMqtt(opts) {
  if (!window.mqtt) throw new Error('mqtt.js fehlt');
  for (const url of brokerList()) {
    try { return await tryBroker(url, opts); } catch (e) { console.warn('Broker nicht erreichbar:', url, e && e.message); }
  }
  throw new Error('kein Broker erreichbar');
}
function pub(topic, obj, opts) {
  const m = obj && obj.m; const light = m && (m.t === 'draw' || m.t === 'ping');
  try { net.mq && net.mq.publish(topic, JSON.stringify(obj), Object.assign({ qos: light ? 0 : 1 }, opts || {})); } catch (e) {}
}
function every(ms, fn) { const id = setInterval(fn, ms); net.timers.push(id); }

function sayBye() {
  if (!net.isHost || !net.mq) return;
  try { broadcast({ t: 'bye' }); net.mq.publish(T_('p'), '', { retain: true }); } catch (e) {}
}
function destroyNet() {
  voiceOff(true);
  host.stopTimers();
  net.timers.forEach(clearInterval);
  if (net.mq && !net.isHost && net.myId) pub(T_('h'), { f: net.myId, m: { t: 'leave' } });
  const mq = net.mq; if (mq) setTimeout(() => { try { mq.end(true); } catch (e) {} }, 150);
  try { net.peer && net.peer.destroy(); } catch (e) {}
  Object.assign(net, { mq: null, isHost: false, myId: null, code: null, peer: null, bye: false, timers: [], peerStarting: false });
  view.reset();
}

// Nachricht an den Host (beim Host selbst: direkt verarbeiten)
function toHost(msg) {
  if (net.isHost) queueMicrotask(() => host.onMessage(net.myId, msg));
  else pub(T_('h'), { f: net.myId, m: msg });
}
// Nur Host: an einen bestimmten Spieler
function sendTo(id, msg) {
  if (id === net.myId) queueMicrotask(() => view.onMessage(msg));
  else pub(T_('c/' + id), { m: msg });
}
// Nur Host: an alle (optional außer einem) – eine einzige Nachricht für alle
function broadcast(msg, exceptId) {
  if (exceptId !== net.myId) queueMicrotask(() => view.onMessage(msg));
  pub(T_('a'), { x: exceptId || null, m: msg });
}

// Sprachchat läuft weiter direkt zwischen den Geräten (PeerJS / WebRTC)
async function newPeer() {
  const config = await getIceConfig();
  return new Promise((resolve, reject) => {
    const p = new Peer({ config, debug: 1 });
    let done = false;
    p.on('open', () => { done = true; resolve(p); });
    p.on('error', (err) => { if (!done) { done = true; try { p.destroy(); } catch (e) {} reject(err); } });
  });
}
function startVoicePeer() {
  if (!window.Peer || net.peerStarting) return;
  const myId = net.myId;
  net.peerStarting = true;
  newPeer().then((peer) => {
    net.peerStarting = false;
    if (net.myId !== myId) { peer.destroy(); return; }
    net.peer = peer;
    peer.on('call', (call) => voiceIncoming(call));
    peer.on('disconnected', () => setTimeout(() => { try { if (net.peer === peer && !peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500));
    toHost({ t: 'vid', vid: peer.id });
  }).catch((e) => { net.peerStarting = false; console.warn('Sprachchat nicht verfügbar', e); });
}

// Prüft, ob unter diesem Code gerade ein Host aktiv ist (gespeicherte "Anwesenheit")
function readPresence(mq, code, wait) {
  return new Promise((resolve) => {
    const topic = TOPIC_ROOT + code + '/p';
    let result = null;
    const onMsg = (tp, buf) => {
      if (tp !== topic) return;
      try { const d = buf.length ? JSON.parse(buf.toString()) : null; result = d && Date.now() - d.t < 120000 ? d : null; } catch (e) { result = null; }
      finish();
    };
    const finish = () => { clearTimeout(to); mq.removeListener('message', onMsg); mq.unsubscribe(topic); resolve(result); };
    const to = setTimeout(finish, wait);
    mq.on('message', onMsg);
    mq.subscribe(topic);
  });
}

async function createLobby(name) {
  setStatus(t('creating'), true);
  let mq = null, code = null;
  try {
    for (let i = 0; i < 4 && !mq; i++) {
      code = makeCode();
      const c = await connectMqtt({ will: { topic: TOPIC_ROOT + code + '/p', payload: '', retain: true, qos: 1 } });
      if (await readPresence(c, code, 1200)) { c.end(true); continue; } // Code schon belegt
      mq = c;
    }
  } catch (e) { console.error(e); setStatus(t('netError')); return; }
  if (!mq) { setStatus(t('netError')); return; }
  Object.assign(net, { mq, isHost: true, myId: randId(), code });
  const presence = () => pub(T_('p'), { t: Date.now() }, { retain: true, qos: 1 });
  presence();
  mq.subscribe(T_('h'));
  mq.on('connect', () => { mq.subscribe(T_('h')); presence(); }); // nach Wiederverbindung
  mq.on('message', (tp, buf) => {
    if (tp !== T_('h')) return;
    let d; try { d = JSON.parse(buf.toString()); } catch (e) { return; }
    if (d && d.f && d.m) host.receive(d.f, d.m);
  });
  every(30000, presence);
  every(4000, () => { host.sweep(); host.pushState(); }); // Lebenszeichen + Stand für alle
  host.init({ id: net.myId, name, lang });
  setStatus('');
  view.enterRoom(code);
  startVoicePeer();
}

let resumeVoice = false; // Telefon nach Wiederverbinden wieder einschalten
let joinSession = 0;     // erhöht sich bei jedem Verlassen – verhindert alte Versuche
async function joinLobby(name, code) {
  const session = joinSession;
  setStatus(t('connecting'), true);
  let mq;
  try { mq = await connectMqtt({}); } catch (e) { console.error(e); setStatus(t('netError')); return; }
  if (session !== joinSession) { mq.end(true); return; }
  const pres = await readPresence(mq, code, 4000);
  if (session !== joinSession) { mq.end(true); return; }
  if (!pres) { mq.end(true); setStatus(t('notFound')); return; }
  Object.assign(net, { mq, isHost: false, myId: randId(), code });
  let lastHost = Date.now(), welcomed = false, warned = false;
  const hello = () => pub(T_('h'), { f: net.myId, m: { t: 'hello', name, lang, cid: CLIENT_ID, vid: net.peer ? net.peer.id : null } });
  const subscribeAll = () => mq.subscribe([T_('a'), T_('c/' + net.myId), T_('p')]);
  subscribeAll();
  mq.on('connect', () => { if (net.mq === mq) { subscribeAll(); hello(); } });
  mq.on('message', (tp, buf) => {
    if (net.mq !== mq) return;
    if (tp === T_('p')) { // Anwesenheit des Hosts
      if (!buf.length && welcomed) lastHost = Math.min(lastHost, Date.now() - HOST_GIVEUP + 8000); // Host weg? kurz warten
      return;
    }
    let d; try { d = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!d || !d.m) return;
    if (tp === T_('a') && d.x === net.myId) return;
    lastHost = Date.now();
    warned = false;
    const m = d.m;
    if (m.t === 'rejoin') { hello(); return; }
    if (m.t === 'bye') { leaveWith('hostLeft'); return; }
    if (m.t === 'welcome') welcomed = true;
    view.onMessage(m);
  });
  const leaveWith = (key) => { const wasIn = view.inRoom; destroyNet(); show('menu'); if (wasIn) toast(t(key)); else setStatus(t(key)); };
  every(4000, () => {
    if (net.mq !== mq) return;
    pub(T_('h'), { f: net.myId, m: { t: 'ping' } });
    const silent = Date.now() - lastHost;
    if (!welcomed && silent > 12000) { leaveWith('notFound'); return; }
    if (silent > HOST_GIVEUP) { leaveWith('hostLeft'); return; }
    if (silent > HOST_TIMEOUT && !warned) { warned = true; toast(t('reconnecting')); hello(); }
  });
  hello();
  startVoicePeer();
}

// ================================================================ HOST
const host = {
  players: [], settings: { rounds: 3, drawTime: 80 }, phase: 'lobby',
  round: 0, order: [], turn: -1, drawerId: null, wordId: null, choices: [], usedWords: new Set(),
  deadline: 0, timer: null, history: [], reveal: null, colorIdx: 0, departed: new Map(), lobbyCheck: null,

  init(me) {
    this.departed = new Map();
    this.players = []; this.phase = 'lobby'; this.history = []; this.usedWords = new Set(); this.colorIdx = 0;
    this.addPlayer(me.id, me.name, me.lang);
    this.pushState();
  },
  stopTimers() { clearTimeout(this.timer); this.timer = null; },
  get(id) { return this.players.find((p) => p.id === id); },
  addPlayer(id, name, l) {
    const p = { id, name: String(name).slice(0, 16) || '???', lang: l === 'am' ? 'am' : 'de', score: 0, voice: false,
      color: AVATAR_COLORS[this.colorIdx++ % AVATAR_COLORS.length], host: id === net.myId };
    this.players.push(p);
    return p;
  },

  // Nachricht von einem Mitspieler über MQTT
  receive(from, msg) {
    const p = this.get(from);
    if (p) p.lastSeen = Date.now();
    if (msg.t === 'hello') { this.onHello(from, msg); return; }
    if (!p) { if (msg.t !== 'leave') sendTo(from, { t: 'rejoin' }); return; }
    if (msg.t === 'ping') return;
    if (msg.t === 'leave') { this.removePlayer(from); return; }
    this.onMessage(from, msg);
  },
  onHello(from, msg) {
    const existing = this.get(from);
    if (existing) { // Wiederverbindung mit gleicher ID
      if (msg.vid) existing.vid = String(msg.vid).slice(0, 64);
      sendTo(from, { t: 'welcome', code: net.code, history: this.history, wv: WORDS_VERSION });
      this.pushState();
      return;
    }
    const key = String(msg.cid || from).slice(0, 40);
    // gleiches Gerät mit neuer ID -> alten Eintrag ersetzen
    const dup = this.players.find((x) => !x.host && x.cid === key);
    if (dup) this.removePlayer(dup.id, true);
    if (this.players.length >= MAX_PLAYERS) { sendTo(from, { t: 'full' }); return; }
    const p = this.addPlayer(from, msg.name, msg.lang);
    p.cid = key; p.lastSeen = Date.now();
    if (msg.vid) p.vid = String(msg.vid).slice(0, 64);
    const back = this.phase !== 'lobby' && this.departed.get(key);
    if (back) { p.score = back.score; p.color = back.color; this.departed.delete(key); }
    sendTo(from, { t: 'welcome', code: net.code, history: this.history, wv: WORDS_VERSION });
    if (!dup) broadcast({ t: 'sys', key: 'joined', name: p.name });
    this.pushState();
  },
  // entfernt Spieler, von denen lange nichts kam
  sweep() {
    const now = Date.now();
    for (const p of [...this.players]) if (!p.host && now - (p.lastSeen || now) > CLIENT_TIMEOUT) this.removePlayer(p.id);
  },

  removePlayer(id, silent) {
    const p = this.get(id); if (!p) return;
    this.players = this.players.filter((x) => x.id !== id);
    if (this.phase !== 'lobby' && p.cid) this.departed.set(p.cid, { score: p.score, color: p.color });
    if (!silent) broadcast({ t: 'sys', key: 'left', name: p.name });
    if (this.phase !== 'lobby' && this.phase !== 'end') {
      if (this.players.length < 2) {
        // kurz warten – vielleicht verbindet sich der Spieler gleich wieder (Handy kurz weg)
        clearTimeout(this.lobbyCheck);
        this.lobbyCheck = setTimeout(() => {
          if (this.players.length < 2 && this.phase !== 'lobby' && this.phase !== 'end') { this.toLobby(); broadcast({ t: 'sys', key: 'notEnough' }); }
        }, 10000);
      }
      if (id === this.drawerId && (this.phase === 'choosing' || this.phase === 'drawing')) {
        broadcast({ t: 'sys', key: 'drawerLeft' });
        this.endTurn(null);
        return;
      }
    }
    this.pushState();
  },

  publicState(forId) {
    const st = {
      t: 'state', phase: this.phase, settings: this.settings, round: this.round, drawerId: this.drawerId,
      remaining: Math.max(0, this.deadline - Date.now()),
      players: this.players.map(({ id, name, lang, score, voice, color, host, vid }) => ({ id, name, lang, score, voice, color, host, vid: vid || null })),
      reveal: this.reveal,
    };
    if (this.phase === 'drawing' && this.wordId != null) {
      st.diff = wordDiff(this.wordId);
      st.hint = { de: maskWord(wordIn(this.wordId, 'de')), am: maskWord(wordIn(this.wordId, 'am')) };
      if (forId === this.drawerId) st.wordId = this.wordId; // nur der Zeichner kennt das Wort
    }
    if (this.phase === 'choosing' && forId === this.drawerId) st.choices = this.choices;
    return st;
  },
  pushState() { for (const p of this.players) sendTo(p.id, this.publicState(p.id)); },

  onMessage(from, msg) {
    const p = this.get(from); if (!p || !msg) return;
    switch (msg.t) {
      case 'start':
        if (from !== net.myId || this.phase !== 'lobby' || this.players.length < 2) return;
        this.settings = { rounds: clamp(+msg.rounds || 3, 1, 10), drawTime: clamp(+msg.drawTime || 80, 30, 240) };
        this.startGame();
        break;
      case 'toLobby':
        if (from === net.myId) this.toLobby();
        break;
      case 'choose':
        if (from !== this.drawerId || this.phase !== 'choosing') return;
        this.startDrawing(this.choices[clamp(msg.i | 0, 0, this.choices.length - 1)]);
        break;
      case 'draw': case 'fill': case 'clear': case 'undo':
        if (from !== this.drawerId || this.phase !== 'drawing') return;
        applyOpToHistory(this.history, msg);
        broadcast(msg, from);
        break;
      case 'guessed':
        if (from !== this.drawerId || this.phase !== 'drawing') return;
        if (!this.get(msg.id) || msg.id === from) return;
        this.endTurn(msg.id);
        break;
      case 'chat': {
        const text = String(msg.text || '').slice(0, 60).trim(); if (!text) return;
        if (this.phase === 'drawing' && from !== this.drawerId && this.wordId != null) {
          const g = norm(text);
          if (g && (g === norm(wordIn(this.wordId, 'de')) || g === norm(wordIn(this.wordId, 'am')))) { this.endTurn(from); return; }
        }
        if (this.phase === 'drawing' && from === this.drawerId) return; // Zeichner darf nichts verraten
        broadcast({ t: 'chat', name: p.name, color: p.color, text });
        break;
      }
      case 'voice':
        p.voice = !!msg.on; this.pushState();
        break;
      case 'vid':
        p.vid = String(msg.vid || '').slice(0, 64) || null; this.pushState();
        break;
    }
  },

  startGame() {
    this.players.forEach((p) => p.score = 0);
    this.departed = new Map();
    this.round = 1; this.turn = -1; this.usedWords = new Set();
    this.order = shuffle(this.players.map((p) => p.id));
    this.nextTurn();
  },
  toLobby() {
    this.stopTimers(); this.phase = 'lobby'; this.drawerId = null; this.wordId = null; this.reveal = null; this.history = [];
    broadcast({ t: 'clear' }); this.pushState();
  },
  nextTurn() {
    this.stopTimers();
    this.reveal = null; this.wordId = null;
    // nächsten Zeichner finden, der noch da ist
    for (;;) {
      this.turn++;
      if (this.turn >= this.order.length) {
        this.round++; this.turn = 0;
        if (this.round > this.settings.rounds) { this.endGame(); return; }
        // neue Runde: auch Spieler, die mittendrin beigetreten sind, kommen dran
        const ids = this.players.map((p) => p.id);
        this.order = this.order.filter((id) => ids.includes(id)).concat(ids.filter((id) => !this.order.includes(id)));
      }
      if (this.get(this.order[this.turn])) break;
    }
    this.drawerId = this.order[this.turn];
    this.choices = [pickWord(1, this.usedWords), pickWord(2, this.usedWords), pickWord(3, this.usedWords)];
    this.phase = 'choosing';
    this.deadline = Date.now() + CHOOSE_TIME * 1000;
    this.history = []; broadcast({ t: 'clear' });
    this.pushState();
    this.timer = setTimeout(() => this.startDrawing(this.choices[rnd(3)]), CHOOSE_TIME * 1000);
  },
  startDrawing(wordId) {
    this.stopTimers();
    this.wordId = wordId; this.usedWords.add(wordId);
    this.phase = 'drawing';
    this.deadline = Date.now() + this.settings.drawTime * 1000;
    this.pushState();
    this.timer = setTimeout(() => this.endTurn(null), this.settings.drawTime * 1000);
  },
  endTurn(guesserId) {
    this.stopTimers();
    const gains = {};
    if (guesserId && this.wordId != null) {
      const frac = clamp((this.deadline - Date.now()) / (this.settings.drawTime * 1000), 0, 1);
      const mult = DIFF_MULT[wordDiff(this.wordId)] || 1;
      const g = Math.round((50 + 250 * frac) * mult / 5) * 5;
      const d = Math.round((25 + 125 * frac) * mult / 5) * 5;
      const gp = this.get(guesserId), dp = this.get(this.drawerId);
      if (gp) { gp.score += g; gains[gp.id] = g; }
      if (dp) { dp.score += d; gains[dp.id] = d; }
    }
    this.reveal = { wordId: this.wordId, guesserId: guesserId || null, gains };
    if (this.wordId != null) { const gp = guesserId && this.get(guesserId); broadcast({ t: 'revealed', wordId: this.wordId, guesser: gp ? gp.name : null }); }
    this.phase = 'reveal';
    this.deadline = Date.now() + REVEAL_TIME * 1000;
    this.pushState();
    this.timer = setTimeout(() => this.nextTurn(), REVEAL_TIME * 1000);
  },
  endGame() {
    this.stopTimers();
    this.phase = 'end'; this.drawerId = null; this.reveal = null; this.deadline = 0;
    this.pushState();
  },
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const WORDS_BY_DIFF = { 1: [], 2: [], 3: [] };
WORDS.forEach((w, i) => WORDS_BY_DIFF[w[2]].push(i));
function pickWord(diff, used) {
  const list = WORDS_BY_DIFF[diff];
  for (let i = 0; i < 50; i++) { const id = list[rnd(list.length)]; if (!used.has(id)) return id; }
  return list[rnd(list.length)];
}

// Zeichen-Operationen (gleiche Logik für Host-Verlauf und Anzeige)
function applyOpToHistory(hist, op) {
  if (op.t === 'clear') { hist.length = 0; return; }
  if (op.t === 'undo') { hist.pop(); return; }
  if (op.t === 'fill') { hist.push({ t: 'fill', x: op.x, y: op.y, c: op.c }); return; }
  if (op.t === 'draw') {
    let s = hist.length && hist[hist.length - 1];
    if (!s || s.t !== 'stroke' || s.id !== op.id) { s = { t: 'stroke', id: op.id, c: op.c, w: op.w, pts: [] }; hist.push(s); }
    for (const p of op.pts) s.pts.push(p);
  }
}

// ================================================================ ANZEIGE (alle Spieler)
const canvas = $('#board');
const ctx = canvas.getContext('2d');

const view = {
  inRoom: false, state: null, history: [], deadlineLocal: 0, tick: null,
  tool: 'brush', color: '#000000', size: 10,
  lastPhase: null, lastDrawer: null,

  reset() {
    releaseAwake();
    this.inRoom = false; this.state = null; this.history = []; clearInterval(this.tick); this.tick = null;
    this.lastPhase = null; this.lastDrawer = null; this.ovKey = null; this.chosen = null;
    closeModal(); $('#chat-log').innerHTML = ''; clearBoard();
  },
  enterRoom(code) {
    this.inRoom = true;
    keepAwake();
    $('#lobby-code').textContent = code;
    history.replaceState(null, '', location.pathname + '?code=' + code);
    clearInterval(this.tick); this.tick = setInterval(() => this.updateTimer(), 250);
  },
  turnKeyOf(st) { return st.round + '|' + st.drawerId + '|' + (st.choices || []).join(','); },
  me() { return this.state && this.state.players.find((p) => p.id === net.myId); },
  isDrawer() { return this.state && this.state.phase === 'drawing' && this.state.drawerId === net.myId; },

  onMessage(msg) {
    switch (msg.t) {
      case 'welcome':
        if (msg.wv && msg.wv !== WORDS_VERSION) {
          let tried = false; try { tried = sessionStorage.getItem('malenio-reload') === msg.wv; } catch (e) {}
          if (!tried) {
            try { sessionStorage.setItem('malenio-reload', msg.wv); sessionStorage.setItem('malenio-autojoin', msg.code); } catch (e) {}
            toast(t('updating'));
            const code = msg.code; destroyNet();
            setTimeout(() => { const q = new URLSearchParams(location.search); q.set('code', code); q.set('r', Date.now()); location.href = location.pathname + '?' + q.toString(); }, 600);
            return;
          }
          toast(t('versionMismatch'));
        }
        this.enterRoom(msg.code);
        this.history = msg.history || []; redraw(this.history);
        setStatus('');
        if (resumeVoice) { resumeVoice = false; voiceToggle(); }
        break;
      case 'full': destroyNet(); show('menu'); setStatus(t('full')); break;
      case 'state': this.onState(msg); break;
      case 'draw': case 'fill': case 'clear': case 'undo':
        applyOpToHistory(this.history, msg);
        if (msg.t === 'draw') drawSegment(this.history[this.history.length - 1], msg.pts);
        else if (msg.t === 'fill') floodFill(msg.x, msg.y, msg.c);
        else redraw(this.history);
        break;
      case 'revealed': {
        const other = lang === 'am' ? 'de' : 'am';
        if (msg.guesser) addChat(esc(t('guessedChat', { name: msg.guesser })), 'good');
        addChat(`${t('wordWas')}: <b>${esc(wordIn(msg.wordId, lang))}</b> (${esc(wordIn(msg.wordId, other))})`, 'good');
        break;
      }
      case 'chat': addChat(`<b style="color:${esc(msg.color)}">${esc(msg.name)}:</b> ${esc(msg.text)}`, 'msg'); break;
      case 'sys': addChat(esc(t(msg.key, { name: msg.name })), 'sys'); break;
    }
  },

  onState(st) {
    const prev = this.state; this.state = st;
    this.deadlineLocal = Date.now() + (st.remaining || 0);
    const phaseChanged = !prev || prev.phase !== st.phase || prev.drawerId !== st.drawerId;

    if (st.phase === 'lobby') { show('lobby'); this.renderLobby(); }
    else { show('game'); this.renderGame(phaseChanged); }

    if (phaseChanged) {
      if (st.phase === 'choosing' && st.drawerId === net.myId) beep(880, .15);
      if (st.phase === 'reveal' && st.reveal && st.reveal.guesserId) jingle();
      if (st.phase === 'end') jingle();
      closeModal();
    }
    voiceSync(st);
    this.updateTimer();
  },

  renderLobby() {
    const st = this.state;
    $('#lobby-count').textContent = `(${st.players.length}/${MAX_PLAYERS})`;
    $('#lobby-players').innerHTML = st.players.map((p) => playerItem(p, false)).join('');
    $('#host-settings').classList.toggle('hidden', !net.isHost);
    $('#lobby-wait').classList.toggle('hidden', net.isHost);
    const btn = $('#btn-start');
    btn.disabled = st.players.length < 2;
    btn.textContent = st.players.length < 2 ? t('needTwo') : t('start');
  },

  renderGame(phaseChanged) {
    const st = this.state;
    const drawer = st.players.find((p) => p.id === st.drawerId);
    // Spielerliste nach Punkten
    const sorted = [...st.players].sort((a, b) => b.score - a.score);
    $('#game-players').innerHTML = sorted.map((p, i) => playerItem(p, true, i + 1)).join('');
    // Kopfzeile
    $('#info-round').textContent = st.phase === 'end' ? '' : t('round', { a: Math.min(st.round, st.settings.rounds), b: st.settings.rounds });
    const hint = $('#info-hint');
    hint.classList.remove('word');
    if (st.phase === 'drawing') {
      if (st.wordId != null) { hint.textContent = wordIn(st.wordId, lang); hint.classList.add('word'); }
      else hint.textContent = st.hint ? st.hint[lang] : '';
    } else hint.textContent = '';
    // Werkzeugleiste nur für Zeichner
    const amDrawer = this.isDrawer();
    $('#draw-bar').classList.toggle('hidden', !amDrawer);
    canvas.style.cursor = amDrawer ? 'crosshair' : 'default';
    $('#chat-in').disabled = amDrawer;

    // Overlay – nur neu zeichnen, wenn sich wirklich etwas geändert hat (sonst gehen Klicks verloren)
    const ov = $('#overlay');
    const turnKey = this.turnKeyOf(st);
    if (st.phase !== 'choosing') this.chosen = null; // alte Wahl vergessen
    const ovKey = JSON.stringify([lang, st.phase, turnKey, this.chosen && this.chosen.turn === turnKey ? this.chosen.i : -1, st.reveal,
      st.phase === 'end' ? sorted.map((p) => p.id + p.score) : 0, st.phase === 'choosing' && drawer ? drawer.name : '']);
    if (ovKey === this.ovKey) { if (phaseChanged && st.phase === 'drawing') redraw(this.history); return; }
    this.ovKey = ovKey;
    if (st.phase === 'choosing' && st.drawerId === net.myId && this.chosen && this.chosen.turn === turnKey) {
      ov.classList.remove('hidden'); ov.innerHTML = '<h2>…</h2>';
    } else if (st.phase === 'choosing') {
      ov.classList.remove('hidden');
      if (st.drawerId === net.myId && st.choices) {
        ov.innerHTML = `<h2>${t('chooseWord')}</h2><div class="choices">` + st.choices.map((id, i) => {
          const d = wordDiff(id); const maxPts = Math.round(300 * DIFF_MULT[d] / 5) * 5;
          return `<button class="choice" data-i="${i}">${esc(wordIn(id, lang))}<span class="stars">${'★'.repeat(d)}${'☆'.repeat(3 - d)}</span><small>${t('d' + d)} · ${t('upTo', { n: maxPts })}</small></button>`;
        }).join('') + '</div>';
        ov.querySelectorAll('.choice').forEach((b) => b.onclick = () => {
          this.chosen = { turn: turnKey, i: +b.dataset.i, at: Date.now() };
          toHost({ t: 'choose', i: this.chosen.i });
          this.ovKey = null; this.renderGame(false);
        });
      } else {
        ov.innerHTML = `<h2>${esc(t('isChoosing', { name: drawer ? drawer.name : '?' }))}</h2>`;
      }
    } else if (st.phase === 'reveal' && st.reveal) {
      ov.classList.remove('hidden');
      const r = st.reveal; const g = st.players.find((p) => p.id === r.guesserId);
      const other = lang === 'am' ? 'de' : 'am';
      const gains = Object.entries(r.gains || {}).map(([id, pts]) => {
        const p = st.players.find((x) => x.id === id); return p ? `<div>${esc(p.name)} <span class="plus">+${pts}</span></div>` : '';
      }).join('');
      ov.innerHTML = `<h2>${g ? esc(t('guessedBy', { name: g.name })) : (t('timeUp') + ' ' + t('nobody'))}</h2>
        <div>${t('wordWas')}:</div>
        <div class="reveal-word">${esc(wordIn(r.wordId, lang))}</div>
        <div class="reveal-sub">${FLAG_SVG[other]} ${esc(wordIn(r.wordId, other))}</div>
        <div class="gains">${gains}</div>`;
    } else if (st.phase === 'end') {
      ov.classList.remove('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      ov.innerHTML = `<h2>${t('gameOver')}</h2><div class="podium">` +
        sorted.map((p, i) => `<div><span>${medals[i] || (i + 1) + '.'} ${esc(p.name)}</span><span>${p.score} ${t('pts')}</span></div>`).join('') +
        '</div>' + (net.isHost ? `<button class="btn primary" id="btn-again">${t('backLobby')}</button>` : '');
      const again = $('#btn-again'); if (again) again.onclick = () => toHost({ t: 'toLobby' });
    } else {
      ov.classList.add('hidden'); ov.innerHTML = '';
    }
    if (phaseChanged && st.phase === 'drawing') redraw(this.history);
  },

  updateTimer() {
    const st0 = this.state, c = this.chosen;
    // Wahl nur für GENAU diesen Zug wiederholen (nie eine alte Wahl aus einer früheren Runde)
    if (st0 && c && st0.phase === 'choosing' && st0.drawerId === net.myId && c.turn === this.turnKeyOf(st0) && Date.now() - c.at > 2500) {
      c.at = Date.now(); toHost({ t: 'choose', i: c.i });
    }
    const el = $('#info-timer');
    if (!this.state || this.state.phase === 'lobby' || this.state.phase === 'end') { el.textContent = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = Math.max(0, Math.ceil((this.deadlineLocal - Date.now()) / 1000));
    el.textContent = s;
    el.classList.toggle('low', this.state.phase === 'drawing' && s <= 10);
  },
};

function playerItem(p, inGame, rank) {
  const st = view.state;
  const cls = ['pitem'];
  if (p.id === net.myId) cls.push('me');
  if (inGame && st.drawerId === p.id && (st.phase === 'drawing' || st.phase === 'choosing')) cls.push('drawing');
  if (inGame && st.reveal && st.reveal.guesserId === p.id) cls.push('winner');
  const pen = inGame && st.drawerId === p.id && st.phase === 'drawing' ? ' ✏️' : '';
  return `<li class="${cls.join(' ')}" title="${esc(p.name)}">
    ${inGame ? `<span class="rank">#${rank}</span>` : ''}
    <span class="avatar" style="background:${esc(p.color)}">${esc([...p.name][0] || '?').toUpperCase()}</span>
    <span class="pname">${esc(p.name)}${p.id === net.myId ? ` (${t('you')})` : ''}${pen}</span>
    ${p.voice ? `<span class="pmic" title="${t('speaking')}">📞</span>` : ''}
    ${FLAG_SVG[p.lang] || ''}
    ${p.host ? (inGame ? `<span title="${t('host')}">👑</span>` : `<span class="badge">${t('host')}</span>`) : ''}
    ${inGame ? `<span class="pscore">${p.score}</span>` : ''}
  </li>`;
}

function addChat(html, cls) {
  const log = $('#chat-log'); const d = document.createElement('div');
  d.className = cls; d.innerHTML = html; log.appendChild(d);
  while (log.children.length > 150) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}

// Bildschirm bleibt an, solange man im Spiel ist (wichtig fürs Handy – v. a. beim Host)
let wakeLock = null;
async function keepAwake() {
  try {
    if (!('wakeLock' in navigator) || !view.inRoom || document.visibilityState !== 'visible' || wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }
}
function releaseAwake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

// ================================================================ Zeichnen
function clearBoard() { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
function redraw(hist) {
  clearBoard();
  for (const op of hist) {
    if (op.t === 'stroke') drawSegment(op, op.pts, true);
    else if (op.t === 'fill') floodFill(op.x, op.y, op.c);
  }
}
// zeichnet die Punkte "pts" des Strichs s (bei neuen Punkten wird am vorherigen Punkt angesetzt)
function drawSegment(s, pts, full) {
  if (!s || !pts.length) return;
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const all = s.pts;
  let startIdx = full ? 0 : all.length - pts.length;
  let prev = startIdx > 0 ? all[startIdx - 1] : null;
  ctx.beginPath();
  if (!prev) {
    const [x, y] = all[startIdx];
    ctx.arc(x, y, s.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); prev = all[startIdx]; startIdx++;
  }
  ctx.moveTo(prev[0], prev[1]);
  for (let i = startIdx; i < all.length; i++) ctx.lineTo(all[i][0], all[i][1]);
  ctx.stroke();
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function floodFill(x0, y0, color) {
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
  const img = ctx.getImageData(0, 0, W, H); const d = img.data;
  const [r, g, b] = hexToRgb(color);
  const i0 = (y0 * W + x0) * 4; const sr = d[i0], sg = d[i0 + 1], sb = d[i0 + 2];
  if (Math.abs(sr - r) + Math.abs(sg - g) + Math.abs(sb - b) < 10) return;
  const tol = 110; // nimmt die weichen Kanten (Antialiasing) mit
  const match = (i) => Math.abs(d[i] - sr) + Math.abs(d[i + 1] - sg) + Math.abs(d[i + 2] - sb) <= tol;
  const seen = new Uint8Array(W * H);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    let xl = x; while (xl >= 0 && !seen[y * W + xl] && match((y * W + xl) * 4)) xl--;
    xl++;
    let up = false, down = false;
    for (let xi = xl; xi < W; xi++) {
      const pi = y * W + xi; if (seen[pi] || !match(pi * 4)) break;
      seen[pi] = 1; const i = pi * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      if (y > 0) { const q = pi - W; const ok = !seen[q] && match(q * 4); if (ok && !up) { stack.push(xi, y - 1); up = true; } else if (!ok) up = false; }
      if (y < H - 1) { const q = pi + W; const ok = !seen[q] && match(q * 4); if (ok && !down) { stack.push(xi, y + 1); down = true; } else if (!ok) down = false; }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Eingabe des Zeichners
let drawing = null, pending = [], flushTimer = null, strokeCounter = 0;
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.round((e.clientX - r.left) / r.width * W * 10) / 10, Math.round((e.clientY - r.top) / r.height * H * 10) / 10];
}
function sendOp(op) { applyOpToHistory(view.history, op); toHost(op); }
function flush() {
  flushTimer = null;
  if (!drawing || !pending.length) return;
  const op = { t: 'draw', id: drawing.id, c: drawing.c, w: drawing.w, pts: pending };
  pending = [];
  toHost(op);
}
canvas.addEventListener('pointerdown', (e) => {
  if (!view.isDrawer()) return;
  e.preventDefault();
  const pos = canvasPos(e);
  if (view.tool === 'fill') {
    const op = { t: 'fill', x: pos[0], y: pos[1], c: view.color };
    sendOp(op); floodFill(op.x, op.y, op.c); return;
  }
  canvas.setPointerCapture(e.pointerId);
  const c = view.tool === 'eraser' ? '#ffffff' : view.color;
  const w = view.tool === 'eraser' ? Math.max(view.size, 16) : view.size;
  drawing = { id: net.myId.slice(-6) + '-' + (++strokeCounter), c, w };
  const s = { t: 'stroke', id: drawing.id, c, w, pts: [pos] };
  view.history.push(s); drawSegment(s, [pos]);
  pending = [pos]; flushTimer = flushTimer || setTimeout(flush, 70);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  const s = view.history[view.history.length - 1];
  if (!s || s.id !== drawing.id) return;
  const added = [];
  for (const ev of evs) {
    const p = canvasPos(ev); const last = s.pts[s.pts.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 1.5) continue;
    s.pts.push(p); added.push(p); pending.push(p);
  }
  if (added.length) drawSegment(s, added);
  if (!flushTimer) flushTimer = setTimeout(flush, 70);
});
const endStroke = () => { if (!drawing) return; clearTimeout(flushTimer); flush(); drawing = null; };
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('lostpointercapture', endStroke);

// Werkzeugleiste
$('#palette').innerHTML = COLORS.map((c) => `<button class="swatch${c === '#000000' ? ' active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('');
$('#palette').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch'); if (!b) return;
  view.color = b.dataset.c;
  document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === b));
  if (view.tool === 'eraser') setTool('brush');
});
document.querySelectorAll('.tool.size').forEach((b) => b.onclick = () => {
  view.size = +b.dataset.size;
  document.querySelectorAll('.tool.size').forEach((s) => s.classList.toggle('active', s === b));
});
function setTool(tool) {
  view.tool = tool;
  $('#tool-brush').classList.toggle('active', tool === 'brush');
  $('#tool-eraser').classList.toggle('active', tool === 'eraser');
  $('#tool-fill').classList.toggle('active', tool === 'fill');
}
setTool('brush');
$('#tool-brush').onclick = () => setTool('brush');
$('#tool-eraser').onclick = () => setTool('eraser');
$('#tool-fill').onclick = () => setTool('fill');
$('#tool-undo').onclick = () => { if (!view.isDrawer()) return; sendOp({ t: 'undo' }); redraw(view.history); };
$('#tool-clear').onclick = () => { if (!view.isDrawer()) return; sendOp({ t: 'clear' }); clearBoard(); };

// "Erraten!" – Zeichner wählt, wer es erraten hat
$('#btn-guessed').onclick = () => {
  if (!view.isDrawer()) return;
  const others = view.state.players.filter((p) => p.id !== net.myId);
  const box = modal(`<h3>${t('whoGuessed')}</h3>` + others.map((p) =>
    `<button class="btn pick" data-id="${esc(p.id)}"><span class="avatar" style="background:${esc(p.color)}">${esc([...p.name][0] || '?').toUpperCase()}</span>${esc(p.name)}</button>`).join('') +
    `<button class="btn" data-cancel="1">${t('cancel')}</button>`);
  box.querySelectorAll('button').forEach((b) => b.onclick = () => {
    closeModal();
    if (b.dataset.id && view.isDrawer()) toHost({ t: 'guessed', id: b.dataset.id });
  });
};

// Chat
$('#chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#chat-in').value.trim(); if (!v) return;
  toHost({ t: 'chat', text: v }); $('#chat-in').value = '';
});

// ================================================================ Sprachchat (Telefon)
const voice = { on: false, stream: null, calls: new Map(), audios: new Map() };

async function voiceToggle() {
  if (voice.on) { voiceOff(); toast(t('voiceOff')); return; }
  if (!net.peer) { toast(t('voiceNA')); if (!net.peerStarting) startVoicePeer(); return; }
  try {
    voice.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  } catch (e) { console.error(e); toast(t('micDenied')); return; }
  voice.on = true;
  $('#btn-phone').classList.add('on');
  toast(t('voiceOn'));
  toHost({ t: 'voice', on: true });
  if (view.state) voiceSync(view.state);
}
function voiceOff(silent) {
  voice.calls.forEach((c) => { try { c.close(); } catch (e) {} });
  voice.calls.clear();
  voice.audios.forEach((a) => { a.srcObject = null; a.remove(); });
  voice.audios.clear();
  if (voice.stream) voice.stream.getTracks().forEach((tr) => tr.stop());
  voice.stream = null;
  const was = voice.on; voice.on = false;
  $('#btn-phone').classList.remove('on');
  if (was && !silent) toHost({ t: 'voice', on: false });
}
function attachCall(call) {
  const id = call.peer;
  voice.calls.set(id, call);
  call.on('stream', (stream) => {
    let a = voice.audios.get(id);
    if (!a) { a = document.createElement('audio'); a.autoplay = true; a.playsInline = true; $('#audio-sink').appendChild(a); voice.audios.set(id, a); }
    a.srcObject = stream; a.play().catch(() => {});
  });
  const cleanup = () => {
    if (voice.calls.get(id) === call) voice.calls.delete(id);
    const a = voice.audios.get(id); if (a) { a.srcObject = null; a.remove(); voice.audios.delete(id); }
  };
  call.on('close', cleanup); call.on('error', cleanup);
}
function voiceIncoming(call) {
  if (!voice.on || !voice.stream) { try { call.close(); } catch (e) {} return; }
  const old = voice.calls.get(call.peer); if (old) { try { old.close(); } catch (e) {} }
  call.answer(voice.stream);
  attachCall(call);
}
// Gleicht Anrufe mit dem Spielstand ab: Wer die "kleinere" ID hat, ruft an – so gibt es keine doppelten Anrufe.
function voiceSync(st) {
  if (!voice.on || !net.peer || !voice.stream) return;
  const myVid = net.peer.id;
  const others = st.players.filter((p) => p.id !== net.myId && p.vid);
  for (const p of others) {
    const has = voice.calls.has(p.vid);
    if (p.voice && !has && myVid < p.vid) { const c = net.peer.call(p.vid, voice.stream); if (c) attachCall(c); }
    if (!p.voice && has) { try { voice.calls.get(p.vid).close(); } catch (e) {} voice.calls.delete(p.vid); const a = voice.audios.get(p.vid); if (a) { a.remove(); voice.audios.delete(p.vid); } }
  }
  for (const vid of [...voice.calls.keys()]) if (!others.some((p) => p.vid === vid)) { try { voice.calls.get(vid).close(); } catch (e) {} voice.calls.delete(vid); }
}

// ================================================================ Menü & Bedienung
function setStatus(msg, ok) { const el = $('#menu-status'); el.textContent = msg || ''; el.classList.toggle('ok', !!ok); }

document.querySelectorAll('.flag-btn').forEach((b) => b.onclick = () => {
  lang = b.dataset.lang; localStorage.setItem('malenio-lang', lang);
  applyLang(); show('menu'); $('#in-name').focus();
});
$('#btn-change-lang').onclick = () => {
  lang = lang === 'am' ? 'de' : 'am'; localStorage.setItem('malenio-lang', lang); applyLang();
};
$('#in-name').value = localStorage.getItem('malenio-name') || '';
$('#in-code').addEventListener('input', (e) => { const v = cleanCode(e.target.value); if (v !== e.target.value) e.target.value = v; });

function getName() {
  const n = $('#in-name').value.trim().slice(0, 16);
  if (!n) { setStatus(t('enterName')); $('#in-name').focus(); return null; }
  localStorage.setItem('malenio-name', n); return n;
}
let busy = false;
$('#btn-create').onclick = async () => {
  if (busy) return; const n = getName(); if (!n) return;
  busy = true; try { await createLobby(n); } finally { busy = false; }
};
$('#btn-join').onclick = async () => {
  if (busy) return; const n = getName(); if (!n) return;
  const code = cleanCode($('#in-code').value);
  if (code.length !== CODE_LEN) { setStatus(t('enterCode')); $('#in-code').focus(); return; }
  joinSession++;
  busy = true; try { await joinLobby(n, code); } finally { busy = false; }
};
$('#in-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#in-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') ($('#in-code').value ? $('#btn-join') : $('#btn-create')).click(); });

$('#btn-start').onclick = () => toHost({ t: 'start', rounds: +$('#set-rounds').value, drawTime: +$('#set-time').value });
$('#btn-copy').onclick = async () => {
  try { await navigator.clipboard.writeText(net.code); toast(t('copied')); } catch (e) { toast(net.code); }
};
$('#btn-share').onclick = async () => {
  const url = location.origin + location.pathname + '?code=' + net.code;
  if (navigator.share) { try { await navigator.share({ title: 'Malenio', text: `Malenio – Code: ${net.code}`, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { toast(url); } }
};
$('#btn-phone').onclick = () => voiceToggle();
$('#btn-home').onclick = async () => {
  if (view.inRoom) { if (!(await confirmBox(t('leaveConfirm')))) return; }
  const inRoom = view.inRoom;
  joinSession++; resumeVoice = false;
  if (net.isHost) { sayBye(); await sleep(250); }
  destroyNet();
  history.replaceState(null, '', location.pathname);
  show(inRoom || $('#screen-menu').classList.contains('hidden') ? 'menu' : 'lang');
  setStatus('');
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
window.addEventListener('pagehide', () => { sayBye(); });
window.addEventListener('beforeunload', () => { sayBye(); try { net.peer && net.peer.destroy(); } catch (e) {} });

// Start
if (new URLSearchParams(location.search).has('debug')) window.__malenioDebug = { net, host, view };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
const urlCode = cleanCode(new URLSearchParams(location.search).get('code') || '');
if (urlCode) $('#in-code').value = urlCode;
try {
  const aj = sessionStorage.getItem('malenio-autojoin');
  if (aj && aj === urlCode && lang && $('#in-name').value) { sessionStorage.removeItem('malenio-autojoin'); setTimeout(() => $('#btn-join').click(), 300); }
} catch (e) {}
if (lang) { applyLang(); show('menu'); } else { applyLang(); show('lang'); }
if (!window.Peer) setStatus('PeerJS konnte nicht geladen werden (Internet?)');
})();
