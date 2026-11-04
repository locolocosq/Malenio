/* Malenio – Mal- und Ratespiel, Peer-to-Peer (kein eigener Server nötig).
 * Das Gerät, das die Lobby erstellt, ist der Host: es hält den Spielstand und
 * leitet alles an die anderen weiter. Verbindungen laufen direkt über WebRTC;
 * der kostenlose PeerJS-Dienst wird nur zum ersten "Finden" der Geräte benutzt.
 */
(() => {
'use strict';

// ---------------------------------------------------------------- Konstanten
const PEER_PREFIX = 'malenio-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I
const CODE_LEN = 5;
const MAX_PLAYERS = 8;
const CHOOSE_TIME = 15;   // Sekunden zum Wort wählen
const REVEAL_TIME = 6;    // Sekunden Auflösung
const DIFF_MULT = { 1: 1, 2: 1.3, 3: 1.6 };
const W = 800, H = 600;   // logische Canvas-Größe (für alle gleich)
const COLORS = [
  '#000000', '#4d4d4d', '#9e9e9e', '#ffffff', '#e53935', '#ff7043', '#ff9800', '#ffd600',
  '#7cb342', '#2e7d32', '#00bcd4', '#1e88e5', '#283593', '#8e24aa', '#ec407a', '#f8bbd0',
  '#795548', '#4e342e', '#ffcc80', '#c5e1a5', '#b3e5fc', '#d1c4e9', '#00897b', '#b71c1c',
];
const AVATAR_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#d81b60', '#6d4c41'];
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
] };
const WORDS = window.WORDS || [];

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
    gameRunning: 'Spiel läuft – du bist mitten drin!', guessedChat: '{name} hat das Wort erraten! 🎉', speaking: 'im Telefon',
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
    gameRunning: 'ጨዋታው እየተካሄደ ነው!', guessedChat: '{name} ቃሉን ገመተው! 🎉', speaking: 'በስልክ ላይ',
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
const net = {
  peer: null, isHost: false, myId: null, hostConn: null, conns: new Map(), code: null,
};

function destroyNet() {
  voiceOff(true);
  host.stopTimers();
  try { net.hostConn && net.hostConn.close(); } catch (e) {}
  net.conns.forEach((c) => { try { c.close(); } catch (e) {} });
  try { net.peer && net.peer.destroy(); } catch (e) {}
  Object.assign(net, { peer: null, isHost: false, myId: null, hostConn: null, conns: new Map(), code: null });
  view.reset();
}

// Nachricht an den Host (beim Host selbst: direkt verarbeiten)
function toHost(msg) {
  if (net.isHost) queueMicrotask(() => host.onMessage(net.myId, msg));
  else if (net.hostConn && net.hostConn.open) net.hostConn.send(msg);
}
// Nur Host: an einen bestimmten Spieler
function sendTo(id, msg) {
  if (id === net.myId) queueMicrotask(() => view.onMessage(msg));
  else { const c = net.conns.get(id); if (c && c.open) c.send(msg); }
}
// Nur Host: an alle (optional außer einem)
function broadcast(msg, exceptId) {
  for (const p of host.players) if (p.id !== exceptId) sendTo(p.id, msg);
}

function newPeer(id) {
  return new Promise((resolve, reject) => {
    const p = id ? new Peer(id, { config: ICE, debug: 1 }) : new Peer({ config: ICE, debug: 1 });
    let done = false;
    p.on('open', (pid) => { done = true; resolve(p); });
    p.on('error', (err) => { if (!done) { done = true; try { p.destroy(); } catch (e) {} reject(err); } });
  });
}

async function createLobby(name) {
  setStatus(t('creating'), true);
  let peer = null, code = null;
  for (let i = 0; i < 5 && !peer; i++) {
    code = makeCode();
    try { peer = await newPeer(PEER_PREFIX + code); }
    catch (err) { if (err.type !== 'unavailable-id') { setStatus(t('netError')); console.error(err); return; } }
  }
  if (!peer) { setStatus(t('netError')); return; }
  net.peer = peer; net.isHost = true; net.myId = peer.id; net.code = code;
  setupPeerCommon(peer);
  peer.on('connection', (conn) => host.onConnection(conn));
  host.init({ id: peer.id, name, lang });
  setStatus('');
  view.enterRoom(code);
}

async function joinLobby(name, code) {
  setStatus(t('connecting'), true);
  let peer;
  try { peer = await newPeer(null); } catch (err) { setStatus(t('netError')); console.error(err); return; }
  net.peer = peer; net.isHost = false; net.myId = peer.id; net.code = code;
  setupPeerCommon(peer);
  const conn = peer.connect(PEER_PREFIX + code, { reliable: true, metadata: { v: 1 } });
  net.hostConn = conn;
  let opened = false;
  const failTimer = setTimeout(() => { if (!opened) { destroyNet(); setStatus(t('notFound')); } }, 12000);
  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable' && !opened) { clearTimeout(failTimer); destroyNet(); setStatus(t('notFound')); }
  });
  conn.on('open', () => { opened = true; clearTimeout(failTimer); conn.send({ t: 'hello', name, lang }); });
  conn.on('data', (msg) => view.onMessage(msg));
  conn.on('close', () => {
    if (!net.peer) return; // wir haben selbst verlassen
    const wasIn = view.inRoom;
    destroyNet(); show('menu');
    if (wasIn) toast(t('hostLeft'));
  });
}

function setupPeerCommon(peer) {
  peer.on('call', (call) => voiceIncoming(call));
  peer.on('disconnected', () => { // Verbindung zum Vermittlungsdienst verloren – erneut verbinden
    setTimeout(() => { try { if (net.peer === peer && !peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500);
  });
}

// ================================================================ HOST
const host = {
  players: [], settings: { rounds: 3, drawTime: 80 }, phase: 'lobby',
  round: 0, order: [], turn: -1, drawerId: null, wordId: null, choices: [], usedWords: new Set(),
  deadline: 0, timer: null, history: [], reveal: null, colorIdx: 0,

  init(me) {
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

  onConnection(conn) {
    conn.on('data', (msg) => {
      if (msg && msg.t === 'hello') {
        if (this.players.length >= MAX_PLAYERS) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 500); return; }
        net.conns.set(conn.peer, conn);
        const p = this.addPlayer(conn.peer, msg.name, msg.lang);
        conn.send({ t: 'welcome', code: net.code, history: this.history });
        broadcast({ t: 'sys', key: 'joined', name: p.name });
        this.pushState();
        return;
      }
      if (net.conns.get(conn.peer) === conn) this.onMessage(conn.peer, msg);
    });
    conn.on('close', () => this.removePlayer(conn.peer));
    conn.on('error', () => this.removePlayer(conn.peer));
  },

  removePlayer(id) {
    const p = this.get(id); if (!p) return;
    net.conns.delete(id);
    this.players = this.players.filter((x) => x.id !== id);
    broadcast({ t: 'sys', key: 'left', name: p.name });
    if (this.phase !== 'lobby' && this.phase !== 'end') {
      if (this.players.length < 2) { this.toLobby(); broadcast({ t: 'sys', key: 'notEnough' }); return; }
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
      players: this.players.map(({ id, name, lang, score, voice, color, host }) => ({ id, name, lang, score, voice, color, host })),
      reveal: this.reveal,
    };
    if (this.phase === 'drawing' && this.wordId != null) {
      st.diff = WORDS[this.wordId][2];
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
    }
  },

  startGame() {
    this.players.forEach((p) => p.score = 0);
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
      const mult = DIFF_MULT[WORDS[this.wordId][2]] || 1;
      const g = Math.round((50 + 250 * frac) * mult / 5) * 5;
      const d = Math.round((25 + 125 * frac) * mult / 5) * 5;
      const gp = this.get(guesserId), dp = this.get(this.drawerId);
      if (gp) { gp.score += g; gains[gp.id] = g; }
      if (dp) { dp.score += d; gains[dp.id] = d; }
    }
    this.reveal = { wordId: this.wordId, guesserId: guesserId || null, gains };
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
    this.inRoom = false; this.state = null; this.history = []; clearInterval(this.tick); this.tick = null;
    this.lastPhase = null; this.lastDrawer = null;
    closeModal(); $('#chat-log').innerHTML = ''; clearBoard();
  },
  enterRoom(code) {
    this.inRoom = true;
    $('#lobby-code').textContent = code;
    history.replaceState(null, '', location.pathname + '?code=' + code);
    clearInterval(this.tick); this.tick = setInterval(() => this.updateTimer(), 250);
  },
  me() { return this.state && this.state.players.find((p) => p.id === net.myId); },
  isDrawer() { return this.state && this.state.phase === 'drawing' && this.state.drawerId === net.myId; },

  onMessage(msg) {
    switch (msg.t) {
      case 'welcome':
        this.enterRoom(msg.code);
        this.history = msg.history || []; redraw(this.history);
        setStatus('');
        break;
      case 'full': destroyNet(); show('menu'); setStatus(t('full')); break;
      case 'state': this.onState(msg); break;
      case 'draw': case 'fill': case 'clear': case 'undo':
        applyOpToHistory(this.history, msg);
        if (msg.t === 'draw') drawSegment(this.history[this.history.length - 1], msg.pts);
        else if (msg.t === 'fill') floodFill(msg.x, msg.y, msg.c);
        else redraw(this.history);
        break;
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
      if (st.phase === 'reveal' && st.reveal && st.reveal.guesserId) {
        const g = st.players.find((p) => p.id === st.reveal.guesserId);
        if (g) addChat(esc(t('guessedChat', { name: g.name })), 'good');
      }
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

    // Overlay
    const ov = $('#overlay');
    if (st.phase === 'choosing') {
      ov.classList.remove('hidden');
      if (st.drawerId === net.myId && st.choices) {
        ov.innerHTML = `<h2>${t('chooseWord')}</h2><div class="choices">` + st.choices.map((id, i) => {
          const d = WORDS[id][2]; const maxPts = Math.round(300 * DIFF_MULT[d] / 5) * 5;
          return `<button class="choice" data-i="${i}">${esc(wordIn(id, lang))}<span class="stars">${'★'.repeat(d)}${'☆'.repeat(3 - d)}</span><small>${t('d' + d)} · ${t('upTo', { n: maxPts })}</small></button>`;
        }).join('') + '</div>';
        ov.querySelectorAll('.choice').forEach((b) => b.onclick = () => { toHost({ t: 'choose', i: +b.dataset.i }); ov.innerHTML = '<h2>…</h2>'; });
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
  pending = [pos]; flushTimer = flushTimer || setTimeout(flush, 40);
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
  if (!flushTimer) flushTimer = setTimeout(flush, 40);
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
  if (!voice.on || !net.peer) return;
  const others = st.players.filter((p) => p.id !== net.myId);
  for (const p of others) {
    const has = voice.calls.has(p.id);
    if (p.voice && !has && net.myId < p.id) { const c = net.peer.call(p.id, voice.stream); if (c) attachCall(c); }
    if (!p.voice && has) { try { voice.calls.get(p.id).close(); } catch (e) {} voice.calls.delete(p.id); const a = voice.audios.get(p.id); if (a) { a.remove(); voice.audios.delete(p.id); } }
  }
  for (const id of [...voice.calls.keys()]) if (!others.some((p) => p.id === id)) { try { voice.calls.get(id).close(); } catch (e) {} voice.calls.delete(id); }
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
  destroyNet();
  history.replaceState(null, '', location.pathname);
  show(inRoom || $('#screen-menu').classList.contains('hidden') ? 'menu' : 'lang');
  setStatus('');
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
window.addEventListener('beforeunload', () => { try { net.peer && net.peer.destroy(); } catch (e) {} });

// Start
const urlCode = cleanCode(new URLSearchParams(location.search).get('code') || '');
if (urlCode) $('#in-code').value = urlCode;
if (lang) { applyLang(); show('menu'); } else { applyLang(); show('lang'); }
if (!window.Peer) setStatus('PeerJS konnte nicht geladen werden (Internet?)');
})();
