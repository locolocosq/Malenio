/* Echo Party – Töne nachmachen! Peer-to-Peer: das Gerät des Erstellers ist der Host.
 * Alle Spieldaten, Aufnahmen und der Sprachchat laufen direkt zwischen den Geräten (WebRTC).
 * PeerJS (kostenlos, ohne Konto) wird nur zum ersten Finden der Geräte genutzt; ein
 * kostenloser Relay-Server (TURN) sorgt dafür, dass es auch zwischen verschiedenen Netzen klappt.
 */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ Einstellungen
const PREFIX = 'echoparty-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 8;
const RECORD_TIME = 20;      // Sekunden zum Aufnehmen
const RESULT_TIME = 7;
const TURN_USER = '44a0ba51e09545086b4b4ce3', TURN_PASS = 'xA+tBgw5yXc5eCSK';
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turn:global.relay.metered.ca:443', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: TURN_USER, credential: TURN_PASS },
] };
const SOUNDS = window.SOUNDS || [];
const SOUNDS_VERSION = SOUNDS.length + '-' + SOUNDS.map((s) => s.id).join('').length;

// ------------------------------------------------------------------ Texte
const T = {
  de: {
    namePh: 'Dein Name', create: 'Party erstellen', or: 'oder', join: 'Beitreten', editChar: '🎨 Figur gestalten',
    codeNote: 'Der Code besteht nur aus lateinischen Buchstaben (A–Z) und Zahlen.', credits: 'Quellen der Töne',
    makeChar: 'Deine Figur', random: '🎲 Zufall', done: 'Fertig', color: 'Farbe', eyes: 'Augen', mouth: 'Mund', hat: 'Kopf', extra: 'Extra', dance: 'Tanz',
    code: 'Party-Code', copy: 'Kopieren', copied: 'Kopiert!', share: 'Teilen', players: 'Spieler', rounds: 'Anzahl Töne',
    start: 'Party starten', needTwo: 'Mindestens 2 Spieler nötig', waitHost: 'Warte, bis der Host startet…',
    hostTip: 'Lass diese Seite offen – dein Gerät ist der Spiel-Server.', micTip: '🎤 Du brauchst ein Mikrofon. Am besten mit Kopfhörern spielen.',
    round: 'Ton {a}/{b}', listen: 'Hör gut zu!', yourTurn: 'Jetzt du! Mach den Ton nach.', tapRec: 'Aufnehmen', stop: 'Stopp',
    again: '🔁 Nochmal anhören', retry: '🎙️ Neu aufnehmen', playMine: '▶️ Meine Aufnahme', send: '✅ Abschicken', sent: 'Abgeschickt! Warte auf die anderen…',
    showTime: 'Wie gut war es?', noRec: 'Keine Aufnahme 😶', points: 'Punkte', results: 'Ergebnis', gameOver: 'Party vorbei!', playAgain: 'Nochmal spielen',
    leave: 'Party verlassen und zum Menü?', yes: 'Ja', no: 'Nein', hostLeft: 'Der Host hat die Party verlassen.', notFound: 'Party nicht gefunden. Code prüfen!',
    full: 'Die Party ist voll (max. 8).', connecting: 'Verbinde…', creating: 'Party wird erstellt…', netError: 'Verbindungsfehler – bitte nochmal versuchen.',
    enterName: 'Bitte gib einen Namen ein.', enterCode: 'Bitte gib den 5-stelligen Code ein.', micDenied: 'Kein Zugriff aufs Mikrofon – bitte erlauben.',
    voiceOn: 'Telefon an – ihr könnt reden', voiceOff: 'Telefon aus', joined: '{name} ist da!', left: '{name} ist gegangen', reconnecting: 'Verbindung weg – verbinde neu…',
    notEnough: 'Zu wenige Spieler – zurück zur Lobby.', you: 'du', creditsTitle: 'Quellen der Töne (Wikimedia Commons, freie Lizenzen)', close: 'Schließen',
    tooQuiet: 'Zu leise – nochmal lauter!', loading: 'Lade Ton…',
  },
  am: {
    namePh: 'ስምዎ', create: 'ፓርቲ ፍጠር', or: 'ወይም', join: 'ተቀላቀል', editChar: '🎨 ገጸ ባሕሪ ሥራ',
    codeNote: 'ኮዱ የላቲን ፊደላት (A–Z) እና ቁጥሮች ብቻ ነው።', credits: 'የድምፆቹ ምንጮች',
    makeChar: 'የእርስዎ ገጸ ባሕሪ', random: '🎲 በዘፈቀደ', done: 'ጨርስ', color: 'ቀለም', eyes: 'ዓይኖች', mouth: 'አፍ', hat: 'ራስ', extra: 'ተጨማሪ', dance: 'ዳንስ',
    code: 'የፓርቲ ኮድ', copy: 'ቅዳ', copied: 'ተቀድቷል!', share: 'አጋራ', players: 'ተጫዋቾች', rounds: 'የድምፆች ብዛት',
    start: 'ፓርቲ ጀምር', needTwo: 'ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ', waitHost: 'አስተናጋጁ እስኪጀምር ይጠብቁ…',
    hostTip: 'ይህን ገጽ ክፍት ይተዉት – መሣሪያዎ የጨዋታው አገልጋይ ነው።', micTip: '🎤 ማይክሮፎን ያስፈልጋል። በጆሮ ማዳመጫ ቢጫወቱ ይሻላል።',
    round: 'ድምፅ {a}/{b}', listen: 'በደንብ ያዳምጡ!', yourTurn: 'አሁን እርስዎ! ድምፁን ይድገሙ።', tapRec: 'ቅዳ', stop: 'አቁም',
    again: '🔁 እንደገና ያዳምጡ', retry: '🎙️ እንደገና ቅዳ', playMine: '▶️ የእኔ ቅጂ', send: '✅ ላክ', sent: 'ተልኳል! ሌሎችን ይጠብቁ…',
    showTime: 'ምን ያህል ጥሩ ነበር?', noRec: 'ቅጂ የለም 😶', points: 'ነጥብ', results: 'ውጤት', gameOver: 'ፓርቲው አበቃ!', playAgain: 'እንደገና ተጫወት',
    leave: 'ፓርቲውን ትተው ወደ ዋና ማውጫ ይመለሱ?', yes: 'አዎ', no: 'አይ', hostLeft: 'አስተናጋጁ ፓርቲውን ለቋል።', notFound: 'ፓርቲው አልተገኘም። ኮዱን ያረጋግጡ!',
    full: 'ፓርቲው ሞልቷል (ከፍተኛ 8)።', connecting: 'በማገናኘት ላይ…', creating: 'ፓርቲ በመፍጠር ላይ…', netError: 'የግንኙነት ስህተት – እንደገና ይሞክሩ።',
    enterName: 'እባክዎ ስም ያስገቡ።', enterCode: 'እባክዎ ባለ 5 ፊደል ኮዱን ያስገቡ።', micDenied: 'ማይክሮፎን አልተፈቀደም – እባክዎ ይፍቀዱ።',
    voiceOn: 'ስልኩ በርቷል – መነጋገር ትችላላችሁ', voiceOff: 'ስልኩ ጠፍቷል', joined: '{name} መጣ!', left: '{name} ወጣ', reconnecting: 'ግንኙነቱ ተቋርጧል – እንደገና በማገናኘት ላይ…',
    notEnough: 'ተጫዋቾች በቂ አይደሉም – ወደ ሎቢ።', you: 'እርስዎ', creditsTitle: 'የድምፆቹ ምንጮች (Wikimedia Commons፣ ነፃ ፈቃድ)', close: 'ዝጋ',
    tooQuiet: 'በጣም ዝቅ ያለ ነው – እንደገና ጮክ ብለው!', loading: 'ድምፁ እየተጫነ ነው…',
  },
};
let lang = null; try { lang = localStorage.getItem('echo-lang'); } catch (e) {}
const t = (k, v) => { let s = (T[lang || 'de'][k]) ?? T.de[k] ?? k; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
const soundName = (i) => (SOUNDS[i] ? SOUNDS[i][lang === 'am' ? 'am' : 'de'] : '?');

function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.remove('hidden'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add('hidden'), 2600); }
function modal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); return $('#modal-box'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function confirmBox(text) {
  return new Promise((res) => {
    const b = modal(`<h3>${esc(text)}</h3><div class="row"><button class="btn primary" data-a="1">${t('yes')}</button><button class="btn" data-a="0">${t('no')}</button></div>`);
    b.querySelectorAll('button').forEach((x) => x.onclick = () => { closeModal(); res(x.dataset.a === '1'); });
  });
}

// ------------------------------------------------------------------ Figuren
const OPTS = {
  color: ['#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#54a0ff', '#5f27cd', '#ff9ff3', '#c8d6e5', '#8d6e63', '#576574', '#10ac84'],
  eyes: ['rund', 'froh', 'muede', 'stern', 'brille', 'herz'],
  mouth: ['laecheln', 'grinsen', 'oh', 'zunge', 'zaehne'],
  hat: ['keiner', 'kappe', 'krone', 'zylinder', 'blume', 'muetze', 'kopfhoerer', 'haare'],
  extra: ['keins', 'fliege', 'schal', 'kette'],
  dance: ['huepfen', 'wackeln', 'drehen', 'roboter', 'disco'],
};
const OPT_ICON = {
  eyes: { rund: '👀', froh: '😊', muede: '😪', stern: '🤩', brille: '😎', herz: '😍' },
  mouth: { laecheln: '🙂', grinsen: '😁', oh: '😮', zunge: '😛', zaehne: '😬' },
  hat: { keiner: '—', kappe: '🧢', krone: '👑', zylinder: '🎩', blume: '🌸', muetze: '🧶', kopfhoerer: '🎧', haare: '💇' },
  extra: { keins: '—', fliege: '🎀', schal: '🧣', kette: '📿' },
  dance: { huepfen: '🦘', wackeln: '〰️', drehen: '🌀', roboter: '🤖', disco: '🕺' },
};
function randomChar() { const c = {}; for (const k in OPTS) c[k] = OPTS[k][rnd(OPTS[k].length)]; return c; }
function validChar(c) { const o = {}; for (const k in OPTS) o[k] = c && OPTS[k].includes(c[k]) ? c[k] : OPTS[k][0]; return o; }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const ch = (s) => clamp(Math.round(((n >> s) & 255) * f), 0, 255); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }

function charSVG(c) {
  c = validChar(c);
  const col = c.color, dark = shade(col, 0.72);
  const eyes = {
    rund: '<circle cx="47" cy="72" r="7" fill="#fff"/><circle cx="73" cy="72" r="7" fill="#fff"/><circle cx="48" cy="73" r="3.5" fill="#222"/><circle cx="74" cy="73" r="3.5" fill="#222"/>',
    froh: '<path d="M40 74 q7 -9 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M66 74 q7 -9 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    muede: '<path d="M40 72 h14" stroke="#222" stroke-width="3.5" stroke-linecap="round"/><path d="M66 72 h14" stroke="#222" stroke-width="3.5" stroke-linecap="round"/><path d="M42 74 q5 4 10 0 M68 74 q5 4 10 0" stroke="#222" stroke-width="2" fill="none"/>',
    stern: '<path d="M47 64 l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#ffd600" stroke="#222" stroke-width="1"/><path d="M73 64 l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#ffd600" stroke="#222" stroke-width="1"/>',
    brille: '<rect x="36" y="66" width="21" height="13" rx="5" fill="#222"/><rect x="63" y="66" width="21" height="13" rx="5" fill="#222"/><path d="M57 71 h6" stroke="#222" stroke-width="3"/><path d="M40 69 l6 0" stroke="#fff" stroke-width="2" opacity=".6"/>',
    herz: '<path d="M47 79 l-7-7 a4 4 0 0 1 7-5 a4 4 0 0 1 7 5z" fill="#ff2e63"/><path d="M73 79 l-7-7 a4 4 0 0 1 7-5 a4 4 0 0 1 7 5z" fill="#ff2e63"/>',
  }[c.eyes];
  const mouth = {
    laecheln: '<path d="M50 92 q10 10 20 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    grinsen: '<path d="M46 90 q14 16 28 0 z" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/><path d="M50 91 h20" stroke="#fff" stroke-width="3"/>',
    oh: '<ellipse cx="60" cy="96" rx="6" ry="8" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/>',
    zunge: '<path d="M48 91 q12 12 24 0 z" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/><path d="M56 97 q4 9 8 0 z" fill="#ff7aa2"/>',
    zaehne: '<rect x="47" y="89" width="26" height="12" rx="5" fill="#fff" stroke="#222" stroke-width="2.5"/><path d="M53.5 89 v12 M60 89 v12 M66.5 89 v12 M47 95 h26" stroke="#222" stroke-width="1.3"/>',
  }[c.mouth];
  const hat = {
    keiner: '',
    kappe: `<path d="M30 46 q30 -34 60 0 z" fill="#e53935"/><path d="M78 45 q22 1 26 6 l-26 2 z" fill="#b71c1c"/>`,
    krone: '<path d="M38 44 l6 -20 9 12 7 -16 7 16 9 -12 6 20 z" fill="#ffd600" stroke="#c79a00" stroke-width="2"/><circle cx="60" cy="38" r="3" fill="#e53935"/>',
    zylinder: '<rect x="42" y="8" width="36" height="34" rx="3" fill="#222"/><rect x="34" y="40" width="52" height="7" rx="3" fill="#222"/><rect x="42" y="32" width="36" height="5" fill="#e53935"/>',
    blume: '<g transform="translate(78 40)"><circle r="5" fill="#ffd600"/><circle cx="0" cy="-8" r="5" fill="#ff7ab6"/><circle cx="8" cy="0" r="5" fill="#ff7ab6"/><circle cx="0" cy="8" r="5" fill="#ff7ab6"/><circle cx="-8" cy="0" r="5" fill="#ff7ab6"/><circle r="4" fill="#ffd600"/></g>',
    muetze: '<path d="M30 50 q30 -46 60 0 z" fill="#5f27cd"/><rect x="28" y="44" width="64" height="9" rx="4" fill="#fff"/><circle cx="60" cy="10" r="7" fill="#fff"/>',
    kopfhoerer: '<path d="M26 66 q34 -60 68 0" stroke="#222" stroke-width="6" fill="none"/><rect x="18" y="58" width="12" height="20" rx="5" fill="#e53935"/><rect x="90" y="58" width="12" height="20" rx="5" fill="#e53935"/>',
    haare: `<path d="M28 58 q4 -34 32 -32 q28 -2 32 32 q-8 -14 -16 -12 q-6 -12 -16 -6 q-10 -8 -18 4 q-8 -2 -14 14z" fill="#3e2723"/>`,
  }[c.hat];
  const extra = {
    keins: '',
    fliege: '<path d="M60 116 l-12 -7 v14 z M60 116 l12 -7 v14 z" fill="#e53935"/><circle cx="60" cy="116" r="3.5" fill="#b71c1c"/>',
    schal: '<path d="M30 110 q30 12 60 0 v9 q-30 12 -60 0 z" fill="#1dd1a1"/><rect x="70" y="114" width="10" height="22" rx="3" fill="#10ac84"/>',
    kette: '<path d="M34 108 q26 20 52 0" stroke="#ffd600" stroke-width="3" fill="none"/><circle cx="60" cy="118" r="5" fill="#ffd600" stroke="#c79a00"/>',
  }[c.extra];
  return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="154" rx="34" ry="5" fill="rgba(0,0,0,.15)"/>
    <ellipse cx="45" cy="146" rx="13" ry="7" fill="${dark}"/><ellipse cx="75" cy="146" rx="13" ry="7" fill="${dark}"/>
    <g class="arm-l"><path d="M32 86 q-16 10 -18 26" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="14" cy="113" r="6" fill="${col}"/></g>
    <g class="arm-r"><path d="M88 86 q16 10 18 26" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="106" cy="113" r="6" fill="${col}"/></g>
    <path d="M60 32 C 94 32 100 70 98 100 C 96 132 82 146 60 146 C 38 146 24 132 22 100 C 20 70 26 32 60 32 Z" fill="${col}" stroke="${dark}" stroke-width="3"/>
    <ellipse cx="44" cy="52" rx="9" ry="6" fill="#fff" opacity=".35"/>
    <circle cx="38" cy="88" r="5" fill="#ff8fab" opacity=".55"/><circle cx="82" cy="88" r="5" fill="#ff8fab" opacity=".55"/>
    ${eyes}<g class="mouth">${mouth}</g>${extra}${hat}
  </svg>`;
}
function charEl(c, size, dancing) {
  const cc = validChar(c);
  return `<div class="char ${dancing ? 'dancing' : 'idle'} d-${cc.dance}" style="width:${size}px">${charSVG(cc)}</div>`;
}

let myChar = null; try { myChar = JSON.parse(localStorage.getItem('echo-char')); } catch (e) {}
myChar = myChar ? validChar(myChar) : randomChar();
const saveChar = () => { try { localStorage.setItem('echo-char', JSON.stringify(myChar)); } catch (e) {} };

// ------------------------------------------------------------------ Audio (Abspielen, Aufnehmen)
let actx = null;
function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
document.addEventListener('pointerdown', () => ac(), { capture: true });
const bufCache = new Map();
async function loadSound(i) {
  if (bufCache.has(i)) return bufCache.get(i);
  const p = (async () => {
    const r = await fetch('sounds/' + SOUNDS[i].file);
    const ab = await r.arrayBuffer();
    const buf = await new Promise((res, rej) => ac().decodeAudioData(ab, res, rej));
    const ch = buf.getChannelData(0);
    return { buf, feat: EchoScore.features(ch, buf.sampleRate) };
  })();
  bufCache.set(i, p);
  p.catch(() => bufCache.delete(i));
  return p;
}
// spielt einen AudioBuffer; onLevel(0..1) wird ca. 30x pro Sekunde aufgerufen (für den Mund)
let playing = null;
function stopPlay() { if (playing) { try { playing.src.stop(); } catch (e) {} playing.done(); playing = null; } }
function playBuffer(buf, onLevel) {
  stopPlay();
  return new Promise((resolve) => {
    const ctx = ac(), src = ctx.createBufferSource(), an = ctx.createAnalyser();
    an.fftSize = 512; src.buffer = buf; src.connect(an); an.connect(ctx.destination);
    const data = new Uint8Array(an.fftSize); let raf = 0, finished = false;
    const loop = () => { an.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128)); onLevel && onLevel(m / 128); raf = requestAnimationFrame(loop); };
    const done = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); onLevel && onLevel(0); resolve(); };
    playing = { src, done };
    src.onended = () => { if (playing && playing.src === src) playing = null; done(); };
    src.start(); if (onLevel) loop();
  });
}
function wavToBuffer(ab) { return new Promise((res, rej) => ac().decodeAudioData(ab.slice(0), res, rej)); }
function encodeWav(samples, sr) {
  const n = samples.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const g = peak > 0.01 ? Math.min(4, 0.9 / peak) : 1; // auf angenehme Lautstärke bringen
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, clamp(samples[i] * g, -1, 1) * 32767, true);
  return b;
}

let micStream = null;
async function getMic() {
  if (micStream && micStream.getAudioTracks().some((tr) => tr.readyState === 'live')) return micStream;
  micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
  return micStream;
}
// Aufnahme mit Pegelanzeige; liefert Float32-Daten in ctx.sampleRate
function recordFor(maxSec, onLevel) {
  let stopFn;
  const promise = (async () => {
    const stream = await getMic(), ctx = ac();
    const srcNode = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(2048, 1, 1), mute = ctx.createGain();
    mute.gain.value = 0; srcNode.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
    const chunks = []; let len = 0; const maxLen = Math.floor(maxSec * ctx.sampleRate);
    return await new Promise((resolve) => {
      let ended = false;
      const finish = () => {
        if (ended) return; ended = true; proc.disconnect(); srcNode.disconnect(); mute.disconnect(); onLevel && onLevel(0);
        const out = new Float32Array(len); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
        resolve({ data: out, sr: ctx.sampleRate });
      };
      stopFn = finish;
      proc.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0); const c = new Float32Array(d); chunks.push(c); len += c.length;
        let m = 0; for (let i = 0; i < c.length; i += 8) m = Math.max(m, Math.abs(c[i])); onLevel && onLevel(m);
        if (len >= maxLen) finish();
      };
    });
  })();
  return { promise, stop: () => stopFn && stopFn() };
}

// ------------------------------------------------------------------ Netzwerk (PeerJS, Host-Stern)
const net = { peer: null, isHost: false, myId: null, code: null, conns: new Map(), hostConn: null, timers: [], bye: false };
let CLIENT_ID = null; try { CLIENT_ID = sessionStorage.getItem('echo-cid'); if (!CLIENT_ID) { CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('echo-cid', CLIENT_ID); } } catch (e) { CLIENT_ID = Math.random().toString(36).slice(2); }
function every(ms, fn) { net.timers.push(setInterval(fn, ms)); }
function newPeer(id) {
  return new Promise((resolve, reject) => {
    const p = id ? new Peer(id, { config: ICE, debug: 1 }) : new Peer({ config: ICE, debug: 1 });
    let done = false;
    p.on('open', () => { done = true; resolve(p); });
    p.on('error', (e) => { if (!done) { done = true; try { p.destroy(); } catch (x) {} reject(e); } });
  });
}
function toHost(msg) {
  if (net.isHost) queueMicrotask(() => host.receive(net.myId, msg));
  else if (net.hostConn && net.hostConn.open) net.hostConn.send(msg);
}
function sendTo(id, msg) {
  if (id === net.myId) queueMicrotask(() => view.onMessage(msg));
  else { const c = net.conns.get(id); if (c && c.open) try { c.send(msg); } catch (e) {} }
}
function broadcast(msg, except) { for (const p of host.players) if (p.id !== except) sendTo(p.id, msg); }
function sayBye() { if (net.isHost) try { broadcast({ t: 'bye' }); } catch (e) {} }
function destroyNet() {
  voiceOff(true); host.stop(); net.timers.forEach(clearInterval);
  try { net.hostConn && net.hostConn.close(); } catch (e) {}
  net.conns.forEach((c) => { try { c.close(); } catch (e) {} });
  try { net.peer && net.peer.destroy(); } catch (e) {}
  Object.assign(net, { peer: null, isHost: false, myId: null, code: null, conns: new Map(), hostConn: null, timers: [], bye: false });
  view.reset();
}
function watchPeer(peer) {
  peer.on('call', (call) => voiceIncoming(call));
  peer.on('disconnected', () => setTimeout(() => { try { if (net.peer === peer && !peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500));
}

async function createParty(name) {
  setStatus(t('creating'), true);
  let peer = null, code = null;
  for (let i = 0; i < 5 && !peer; i++) {
    code = ''; for (let k = 0; k < 5; k++) code += CODE_CHARS[rnd(CODE_CHARS.length)];
    try { peer = await newPeer(PREFIX + code); } catch (e) { if (e.type !== 'unavailable-id') { console.error(e); setStatus(t('netError')); return; } }
  }
  if (!peer) { setStatus(t('netError')); return; }
  Object.assign(net, { peer, isHost: true, myId: peer.id, code });
  watchPeer(peer);
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => { if (msg && msg.t === 'hello') net.conns.set(conn.peer, conn); host.receive(conn.peer, msg); });
    conn.on('close', () => { if (net.conns.get(conn.peer) === conn) host.removePlayer(conn.peer); });
  });
  every(3000, () => { host.sweep(); host.pushState(); });
  host.init({ id: peer.id, name, char: myChar, lang });
  setStatus('');
  view.enterRoom(code);
}

let joinSession = 0;
async function joinParty(name, code, tries = 0) {
  const session = joinSession;
  if (!tries) setStatus(t('connecting'), true);
  let peer = net.peer;
  if (!peer || peer.destroyed) {
    try { peer = await newPeer(null); } catch (e) { console.error(e); setStatus(t('netError')); return; }
    if (session !== joinSession) { peer.destroy(); return; }
    Object.assign(net, { peer, isHost: false, myId: peer.id, code });
    watchPeer(peer);
  }
  let opened = false, lastHost = Date.now();
  const conn = peer.connect(PREFIX + code, { reliable: true });
  net.hostConn = conn;
  const fail = setTimeout(() => { if (!opened && net.hostConn === conn) gone(tries ? 'hostLeft' : 'notFound'); }, 12000);
  const onErr = (e) => { if (e.type === 'peer-unavailable' && !opened && net.hostConn === conn) { clearTimeout(fail); gone(tries ? 'hostLeft' : 'notFound'); } };
  peer.on('error', onErr);
  const gone = (key) => { const wasIn = view.inRoom; destroyNet(); showScreen('menu'); if (wasIn) toast(t(key)); else setStatus(t(key)); };
  conn.on('open', () => { opened = true; clearTimeout(fail); conn.send({ t: 'hello', name, char: myChar, lang, cid: CLIENT_ID, sv: SOUNDS_VERSION }); });
  conn.on('data', (msg) => {
    lastHost = Date.now();
    if (!msg) return;
    if (msg.t === 'bye') { net.bye = true; return; }
    view.onMessage(msg);
  });
  conn.on('close', () => {
    if (net.hostConn !== conn || !net.peer) return;
    if (net.bye) { gone('hostLeft'); return; }
    reconnect();
  });
  const reconnect = () => {
    if (net.hostConn !== conn) return;
    net.hostConn = null; peer.off && peer.off('error', onErr);
    if (tries >= 4) { gone('hostLeft'); return; }
    toast(t('reconnecting'));
    setTimeout(() => { if (session === joinSession && net.peer === peer) joinParty(name, code, tries + 1); }, 1500);
  };
  if (!tries) every(3000, () => {
    if (!net.hostConn || !net.hostConn.open) return;
    try { net.hostConn.send({ t: 'ping' }); } catch (e) {}
    if (Date.now() - lastHost > 15000) { try { net.hostConn.close(); } catch (e) {} }
  });
}

// ------------------------------------------------------------------ HOST
const host = {
  players: [], phase: 'lobby', rounds: 5, round: 0, soundIdx: -1, used: new Set(), deadline: 0, timer: null,
  showOrder: [], showIdx: 0, recs: new Map(), gains: {}, departed: new Map(),
  init(me) { this.players = []; this.phase = 'lobby'; this.departed = new Map(); this.add(me.id, me, CLIENT_ID); this.pushState(); },
  stop() { clearTimeout(this.timer); this.timer = null; },
  get(id) { return this.players.find((p) => p.id === id); },
  add(id, m, cid) {
    const p = { id, name: String(m.name || '?').slice(0, 14), char: validChar(m.char), lang: m.lang === 'am' ? 'am' : 'de', score: 0, voice: false, host: id === net.myId, cid, seen: Date.now() };
    this.players.push(p); return p;
  },
  receive(from, msg) {
    if (!msg) return;
    const p = this.get(from); if (p) p.seen = Date.now();
    if (msg.t === 'hello') { this.hello(from, msg); return; }
    if (!p) return;
    switch (msg.t) {
      case 'ping': return;
      case 'start': if (p.host && this.phase === 'lobby' && this.players.length >= 2) { this.rounds = clamp(+msg.rounds || 5, 1, 20); this.startGame(); } return;
      case 'lobby': if (p.host) this.toLobby(); return;
      case 'voice': p.voice = !!msg.on; this.pushState(); return;
      case 'char': p.char = validChar(msg.char); this.pushState(); return;
      case 'rec':
        if (this.phase !== 'record' || msg.round !== this.round || this.recs.has(from)) return;
        this.recs.set(from, { score: clamp(+msg.score || 0, 0, 100), wav: msg.wav, sec: +msg.sec || 0 });
        broadcast({ t: 'rec', pid: from, round: this.round, wav: msg.wav, score: clamp(+msg.score || 0, 0, 100) }, from);
        this.pushState();
        if (this.players.every((x) => this.recs.has(x.id))) this.startShow();
        return;
    }
  },
  hello(from, msg) {
    const cid = String(msg.cid || from).slice(0, 40);
    const old = this.players.find((x) => x.cid === cid && x.id !== from);
    let p = this.get(from);
    if (!p && old) { old.id = from; p = old; } // gleiches Gerät, neue Verbindung -> übernehmen
    if (!p) {
      if (this.players.length >= MAX_PLAYERS) { sendTo(from, { t: 'full' }); return; }
      p = this.add(from, msg, cid);
      const back = this.departed.get(cid); if (back && this.phase !== 'lobby') { p.score = back; this.departed.delete(cid); }
      broadcast({ t: 'sys', key: 'joined', name: p.name });
    }
    p.name = String(msg.name || p.name).slice(0, 14); p.char = validChar(msg.char); p.seen = Date.now();
    sendTo(from, { t: 'welcome', code: net.code, sv: SOUNDS_VERSION });
    // bereits vorhandene Aufnahmen dieser Runde nachliefern
    if (this.phase === 'record' || this.phase === 'show') for (const [pid, r] of this.recs) if (pid !== from) sendTo(from, { t: 'rec', pid, round: this.round, wav: r.wav, score: r.score });
    this.pushState();
  },
  removePlayer(id) {
    const p = this.get(id); if (!p || p.host) return;
    net.conns.delete(id);
    this.players = this.players.filter((x) => x !== p);
    if (this.phase !== 'lobby') this.departed.set(p.cid, p.score);
    broadcast({ t: 'sys', key: 'left', name: p.name });
    if (this.phase !== 'lobby' && this.phase !== 'end' && this.players.length < 2) { this.toLobby(); broadcast({ t: 'sys', key: 'notEnough' }); return; }
    if (this.phase === 'record' && this.players.every((x) => this.recs.has(x.id))) this.startShow();
    this.pushState();
  },
  sweep() { const now = Date.now(); for (const p of [...this.players]) if (!p.host && now - p.seen > 20000) this.removePlayer(p.id); },
  state() {
    return {
      t: 'state', phase: this.phase, round: this.round, rounds: this.rounds, soundIdx: this.soundIdx,
      remaining: Math.max(0, this.deadline - Date.now()), showPid: this.showOrder[this.showIdx] || null, showIdx: this.showIdx, showCount: this.showOrder.length,
      players: this.players.map((p) => ({ id: p.id, name: p.name, char: p.char, score: p.score, voice: p.voice, host: p.host, lang: p.lang, done: this.recs.has(p.id) })),
      roundScores: Object.fromEntries([...this.recs].map(([k, v]) => [k, v.score])), gains: this.gains,
    };
  },
  pushState() { const s = this.state(); for (const p of this.players) sendTo(p.id, s); },
  setPhase(phase, sec, next) {
    this.stop(); this.phase = phase; this.deadline = Date.now() + sec * 1000; this.pushState();
    if (next) this.timer = setTimeout(next, sec * 1000);
  },
  startGame() { this.players.forEach((p) => p.score = 0); this.round = 0; this.used = new Set(); this.departed = new Map(); this.nextRound(); },
  toLobby() { this.stop(); this.phase = 'lobby'; this.recs = new Map(); this.gains = {}; this.pushState(); },
  nextRound() {
    this.round++;
    if (this.round > this.rounds) { this.setPhase('end', 0); return; }
    let i = rnd(SOUNDS.length); for (let k = 0; k < 60 && this.used.has(i); k++) i = rnd(SOUNDS.length);
    this.used.add(i); this.soundIdx = i; this.recs = new Map(); this.gains = {}; this.showOrder = []; this.showIdx = 0;
    const sec = (SOUNDS[i] && SOUNDS[i].seconds) || 3;
    this.setPhase('listen', sec * 2 + 3.5, () => this.setPhase('record', RECORD_TIME, () => this.startShow()));
  },
  startShow() {
    this.stop();
    // Reihenfolge: schlechteste zuerst – die beste Nachahmung kommt zum Schluss
    this.showOrder = this.players.map((p) => p.id).sort((a, b) => ((this.recs.get(a) || {}).score || 0) - ((this.recs.get(b) || {}).score || 0));
    this.showIdx = 0; this.showStep();
  },
  showStep() {
    if (this.showIdx >= this.showOrder.length) { this.finishRound(); return; }
    const r = this.recs.get(this.showOrder[this.showIdx]);
    const sec = r ? clamp(r.sec, 0.5, 8) + 3 : 2.5;
    this.setPhase('show', sec, () => { this.showIdx++; this.showStep(); });
  },
  finishRound() {
    const ranked = [...this.recs].sort((a, b) => b[1].score - a[1].score);
    this.gains = {};
    for (const p of this.players) {
      const r = this.recs.get(p.id); let g = r ? r.score : 0;
      if (ranked[0] && ranked[0][0] === p.id && r.score > 0) g += 30; else if (ranked[1] && ranked[1][0] === p.id && r.score > 0) g += 15;
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME, () => this.nextRound());
  },
};

// ------------------------------------------------------------------ ANZEIGE
const view = {
  inRoom: false, state: null, deadlineLocal: 0, tick: null, recs: new Map(), recRound: -1,
  lastKey: '', myRec: null, sentRound: -1, recorder: null, listenRound: -1,
  reset() { this.inRoom = false; this.state = null; this.recs = new Map(); this.myRec = null; this.sentRound = -1; this.lastKey = ''; clearInterval(this.tick); stopPlay(); if (this.recorder) this.recorder.stop(); },
  enterRoom(code) {
    this.inRoom = true; $('#lobby-code').textContent = code;
    history.replaceState(null, '', location.pathname + '?code=' + code);
    clearInterval(this.tick); this.tick = setInterval(() => this.updateTimer(), 250);
    keepAwake();
  },
  onMessage(msg) {
    switch (msg.t) {
      case 'welcome':
        if (msg.sv && msg.sv !== SOUNDS_VERSION) { location.reload(); return; }
        this.enterRoom(msg.code); setStatus(''); break;
      case 'full': destroyNet(); showScreen('menu'); setStatus(t('full')); break;
      case 'state': this.onState(msg); break;
      case 'rec': if (this.state && msg.round === this.state.round) this.storeRec(msg.pid, msg.round, msg.wav, msg.score); break;
      case 'sys': toast(t(msg.key, { name: msg.name })); break;
    }
  },
  storeRec(pid, round, wav, score) {
    if (round !== this.recRound) { this.recs = new Map(); this.recRound = round; }
    const entry = { score, buf: null };
    this.recs.set(pid, entry);
    if (wav) wavToBuffer(wav instanceof ArrayBuffer ? wav : new Uint8Array(wav).buffer).then((b) => entry.buf = b).catch(() => {});
  },
  me() { return this.state && this.state.players.find((p) => p.id === net.myId); },
  onState(st) {
    const prev = this.state; this.state = st;
    this.deadlineLocal = Date.now() + st.remaining;
    if (st.round !== this.recRound && st.phase !== 'lobby') { this.recs = new Map(); this.recRound = st.round; }
    voiceSync(st); applyVoiceMute(st.phase);
    if (st.phase === 'lobby') { showScreen('lobby'); this.renderLobby(); this.lastKey = ''; return; }
    showScreen('game');
    this.renderStrip();
    const key = [st.phase, st.round, st.showIdx, st.phase === 'record' ? st.players.map((p) => p.done ? 1 : 0).join('') : '', lang].join('|');
    if (key !== this.lastKey) { this.lastKey = key; this.renderStage(prev); }
    this.updateTimer();
  },
  renderLobby() {
    const st = this.state;
    $('#lobby-count').textContent = `(${st.players.length}/${MAX_PLAYERS})`;
    $('#lobby-players').innerHTML = st.players.map((p) => pcard(p, 86, true)).join('');
    $('#host-settings').classList.toggle('hidden', !net.isHost);
    $('#lobby-wait').classList.toggle('hidden', net.isHost);
    const b = $('#btn-start'); b.disabled = st.players.length < 2; b.textContent = st.players.length < 2 ? t('needTwo') : t('start');
  },
  renderStrip() {
    const st = this.state, dance = st.phase === 'results' || st.phase === 'end';
    const sorted = [...st.players].sort((a, b) => b.score - a.score);
    $('#game-players').innerHTML = sorted.map((p) => pcard(p, 56, dance, st.phase === 'record' && p.done ? '✅' : '')).join('');
  },
  async renderStage(prev) {
    const st = this.state, stage = $('#stage');
    $('#info-round').textContent = st.phase === 'end' ? '' : t('round', { a: Math.min(st.round, st.rounds), b: st.rounds });
    if (st.phase === 'listen') {
      stage.innerHTML = `<h2>${t('listen')}</h2><div class="speaker">🔊</div><div class="meme-title">${esc(soundName(st.soundIdx))}</div>`;
      if (this.listenRound !== st.round) {
        this.listenRound = st.round; this.myRec = null;
        try {
          const s = await loadSound(st.soundIdx);
          if (this.state.phase !== 'listen') return;
          await playBuffer(s.buf); await sleep(700);
          if (this.state.phase === 'listen') await playBuffer(s.buf);
        } catch (e) { console.warn(e); }
      }
    } else if (st.phase === 'record') {
      this.renderRecord();
    } else if (st.phase === 'show') {
      stopPlay(); if (this.recorder) this.recorder.stop();
      const p = st.players.find((x) => x.id === st.showPid);
      if (!p) { stage.innerHTML = ''; return; }
      const r = this.recs.get(p.id); const score = st.roundScores[p.id] ?? (r ? r.score : 0);
      stage.innerHTML = `<h2>${t('showTime')}</h2><div id="show-char">${charEl(p.char, 150, true)}</div><div class="meme-title">${esc(p.name)}</div>
        <div class="big-score" id="show-score">…</div><div class="stars" id="show-stars"></div><div class="note">${st.showIdx + 1} / ${st.showCount}</div>`;
      const mouth = stage.querySelector('.mouth');
      const reveal = () => { countUp($('#show-score'), score); $('#show-stars').textContent = '★'.repeat(Math.round(score / 20)) + '☆'.repeat(5 - Math.round(score / 20)); };
      const myRound = st.round, myIdx = st.showIdx;
      if (r && !r.buf) await sleep(400);
      if (this.state.showIdx !== myIdx || this.state.round !== myRound) return;
      if (r && r.buf) {
        await playBuffer(r.buf, (lv) => { if (mouth) mouth.style.transform = `scaleY(${1 + lv * 2.2}) scaleX(${1 + lv * .4})`; });
        if (this.state.showIdx === myIdx) reveal();
      } else { $('#show-score').textContent = ''; stage.querySelector('.meme-title').insertAdjacentHTML('afterend', `<div>${t('noRec')}</div>`); setTimeout(reveal, 600); }
    } else if (st.phase === 'results') {
      const sorted = [...st.players].sort((a, b) => b.score - a.score);
      stage.innerHTML = `<h2>${t('results')}</h2><div class="board">${sorted.map((p, i) => `<div class="line">${charEl(p.char, 40, true)}<span class="n">${i + 1}. ${esc(p.name)}</span><span class="gain">+${st.gains[p.id] || 0}</span><span>${p.score}</span></div>`).join('')}</div>`;
    } else if (st.phase === 'end') {
      const s = [...st.players].sort((a, b) => b.score - a.score);
      const pod = [s[1], s[0], s[2]].map((p, i) => p ? `<div class="pl">${charEl(p.char, i === 1 ? 110 : 80, true)}<div>${esc(p.name)}</div><div class="block" style="height:${[70, 100, 50][i]}px;background:${['#c0c0c0', '#ffc107', '#cd7f32'][i]}">${[2, 1, 3][i]}</div></div>` : '').join('');
      stage.innerHTML = `<h2>${t('gameOver')}</h2><div class="podium">${pod}</div><div class="board">${s.map((p, i) => `<div class="line"><span class="n">${i + 1}. ${esc(p.name)}</span><span>${p.score} ${t('points')}</span></div>`).join('')}</div>` +
        (net.isHost ? `<button class="btn primary" id="btn-again">${t('playAgain')}</button>` : '');
      const a = $('#btn-again'); if (a) a.onclick = () => toHost({ t: 'lobby' });
    }
  },
  renderRecord() {
    const st = this.state, stage = $('#stage'), me = this.me();
    const doneList = `<div class="done-list">${st.players.map((p) => `<span class="${p.done ? 'ok' : ''}">${p.done ? '✅' : '⏳'} ${esc(p.name)}</span>`).join('')}</div>`;
    if (me && me.done) { stage.innerHTML = `<h2>${t('sent')}</h2><div id="sent-char">${charEl(me.char, 120, true)}</div>${doneList}`; return; }
    if (this.recorder) return; // läuft gerade – nicht neu zeichnen
    const has = !!this.myRec;
    stage.innerHTML = `<h2>${t('yourTurn')}</h2><div class="meme-title">${esc(soundName(st.soundIdx))}</div>
      <button class="rec-btn" id="rec">🎙️<br>${has ? t('retry').replace('🎙️ ', '') : t('tapRec')}</button>
      <div class="meter"><i id="meter"></i></div>
      <div class="row"><button class="btn small" id="b-again">${t('again')}</button>${has ? `<button class="btn small" id="b-mine">${t('playMine')}</button>` : ''}</div>
      ${has ? `<button class="btn green" id="b-send">${t('send')}</button>` : ''}${doneList}`;
    $('#b-again').onclick = async () => { const s = await loadSound(st.soundIdx); playBuffer(s.buf); };
    if (has) {
      $('#b-mine').onclick = () => wavToBuffer(this.myRec.wav).then((b) => playBuffer(b));
      $('#b-send').onclick = () => this.sendRec();
    }
    $('#rec').onclick = () => this.startRecording();
  },
  async startRecording() {
    const st = this.state; if (this.recorder || st.phase !== 'record') return;
    stopPlay();
    let ref; try { ref = await loadSound(st.soundIdx); } catch (e) { toast(t('loading')); return; }
    const maxSec = clamp((SOUNDS[st.soundIdx].seconds || 3) + 1.5, 2, 7);
    try { await getMic(); } catch (e) { toast(t('micDenied')); return; }
    const btn = $('#rec'); btn.classList.add('recording'); btn.innerHTML = '⏹️<br>' + t('stop');
    const rec = recordFor(maxSec, (lv) => { const m = $('#meter'); if (m) m.style.width = Math.min(100, lv * 160) + '%'; });
    this.recorder = rec; btn.onclick = () => rec.stop();
    const { data, sr } = await rec.promise; this.recorder = null;
    const feat = EchoScore.features(data, sr);
    if (!feat) { toast(t('tooQuiet')); this.renderRecord(); return; }
    const score = EchoScore.compare(ref.feat, feat);
    const small = EchoScore.resample(data, sr); // 16 kHz zum Verschicken
    this.myRec = { wav: encodeWav(small, EchoScore.SR), score, sec: small.length / EchoScore.SR, round: st.round };
    if (this.state.phase === 'record') this.renderRecord();
  },
  sendRec() {
    const st = this.state, r = this.myRec; if (!r || r.round !== st.round) return;
    this.storeRec(net.myId, st.round, r.wav, r.score);
    toHost({ t: 'rec', round: st.round, score: r.score, wav: r.wav, sec: r.sec });
  },
  updateTimer() {
    const el = $('#info-timer'), st = this.state;
    if (!st || st.phase === 'lobby' || st.phase === 'end') { el.textContent = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = Math.max(0, Math.ceil((this.deadlineLocal - Date.now()) / 1000));
    el.textContent = s; el.classList.toggle('low', st.phase === 'record' && s <= 5);
    // Zeit fast um: vorhandene Aufnahme automatisch abschicken
    if (st.phase === 'record' && s <= 1 && this.myRec && this.myRec.round === st.round && this.sentRound !== st.round) {
      const me = this.me(); if (me && !me.done) { this.sentRound = st.round; this.sendRec(); }
    }
  },
};
function pcard(p, size, dancing, tag) {
  return `<div class="pcard${p.id === net.myId ? ' me' : ''}">${tag ? `<span class="tag">${tag}</span>` : (p.voice ? '<span class="tag">📞</span>' : (p.host ? '<span class="tag">👑</span>' : ''))}
    ${charEl(p.char, size, dancing)}<div class="pname">${esc(p.name)}${p.id === net.myId ? ` (${t('you')})` : ''}</div>${view.state && view.state.phase !== 'lobby' ? `<div class="pts">${p.score}</div>` : ''}</div>`;
}
function countUp(el, target) { if (!el) return; let v = 0; const step = Math.max(1, Math.round(target / 25)); const id = setInterval(() => { v = Math.min(target, v + step); el.textContent = v; if (v >= target) clearInterval(id); }, 30); }

// ------------------------------------------------------------------ Sprachchat
const voice = { on: false, track: null, stream: null, calls: new Map(), audios: new Map() };
async function voiceToggle() {
  if (voice.on) { voiceOff(); toast(t('voiceOff')); return; }
  if (!net.peer) return;
  try { const s = await getMic(); voice.track = s.getAudioTracks()[0].clone(); voice.stream = new MediaStream([voice.track]); } catch (e) { toast(t('micDenied')); return; }
  voice.on = true; $('#btn-phone').classList.add('on'); toast(t('voiceOn'));
  toHost({ t: 'voice', on: true });
  if (view.state) { voiceSync(view.state); applyVoiceMute(view.state.phase); }
}
function voiceOff(silent) {
  voice.calls.forEach((c) => { try { c.close(); } catch (e) {} }); voice.calls.clear();
  voice.audios.forEach((a) => { a.srcObject = null; a.remove(); }); voice.audios.clear();
  if (voice.track) voice.track.stop(); voice.track = null; voice.stream = null;
  const was = voice.on; voice.on = false; $('#btn-phone').classList.remove('on');
  if (was && !silent) toHost({ t: 'voice', on: false });
}
function attachCall(call) {
  const id = call.peer; voice.calls.set(id, call);
  call.on('stream', (s) => {
    let a = voice.audios.get(id);
    if (!a) { a = document.createElement('audio'); a.autoplay = true; a.playsInline = true; $('#audio-sink').appendChild(a); voice.audios.set(id, a); }
    a.srcObject = s; a.play().catch(() => {}); if (view.state) applyVoiceMute(view.state.phase);
  });
  const clean = () => { if (voice.calls.get(id) === call) voice.calls.delete(id); const a = voice.audios.get(id); if (a) { a.srcObject = null; a.remove(); voice.audios.delete(id); } };
  call.on('close', clean); call.on('error', clean);
}
function voiceIncoming(call) {
  if (!voice.on || !voice.stream) { try { call.close(); } catch (e) {} return; }
  const old = voice.calls.get(call.peer); if (old) try { old.close(); } catch (e) {}
  call.answer(voice.stream); attachCall(call);
}
function voiceSync(st) {
  if (!voice.on || !net.peer || !voice.stream) return;
  const others = st.players.filter((p) => p.id !== net.myId);
  for (const p of others) {
    const has = voice.calls.has(p.id);
    if (p.voice && !has && net.myId < p.id) { const c = net.peer.call(p.id, voice.stream); if (c) attachCall(c); }
    if (!p.voice && has) { try { voice.calls.get(p.id).close(); } catch (e) {} }
  }
  for (const id of [...voice.calls.keys()]) if (!others.some((p) => p.id === id)) try { voice.calls.get(id).close(); } catch (e) {}
}
// Beim Zuhören, Aufnehmen und Vorspielen ist das Telefon stumm (sonst stört es die Töne)
function applyVoiceMute(phase) {
  const quiet = phase === 'listen' || phase === 'record' || phase === 'show';
  if (voice.track) voice.track.enabled = !quiet;
  voice.audios.forEach((a) => a.muted = quiet);
}

// ------------------------------------------------------------------ Bildschirm wach halten
let wakeLock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && view.inRoom) keepAwake(); });

// ------------------------------------------------------------------ Bildschirme, Menü, Editor
function showScreen(s) {
  ['lang', 'menu', 'creator', 'lobby', 'game'].forEach((x) => $('#screen-' + x).classList.toggle('hidden', x !== s));
  const inRoom = s === 'lobby' || s === 'game';
  $('#btn-home').classList.toggle('hidden', s === 'lang');
  $('#btn-phone').classList.toggle('hidden', !inRoom);
  $('#game-info').classList.toggle('hidden', s !== 'game');
  $('#logo').classList.toggle('hidden', s === 'game');
  if (s === 'menu') $('#menu-char').innerHTML = charEl(myChar, 110, true);
}
function setStatus(m, ok) { const el = $('#menu-status'); el.textContent = m || ''; el.classList.toggle('ok', !!ok); }
function applyLang() {
  document.body.classList.toggle('lang-am', lang === 'am'); document.documentElement.lang = lang === 'am' ? 'am' : 'de';
  document.querySelectorAll('[data-i18n]').forEach((el) => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.placeholder = t(el.dataset.i18nPh));
}
function renderCreator() {
  $('#creator-preview').innerHTML = charEl(myChar, 105, true);
  $('#creator-options').innerHTML = Object.keys(OPTS).map((k) => `<div class="opt-row"><div class="lbl">${t(k)}</div><div class="opt-list">` +
    OPTS[k].map((v) => k === 'color'
      ? `<button class="opt swatch${myChar[k] === v ? ' active' : ''}" data-k="${k}" data-v="${v}"><i style="background:${v}"></i></button>`
      : `<button class="opt${myChar[k] === v ? ' active' : ''}" data-k="${k}" data-v="${v}">${OPT_ICON[k][v]}</button>`).join('') + '</div></div>').join('');
  $('#creator-options').querySelectorAll('.opt').forEach((b) => b.onclick = () => { myChar[b.dataset.k] = b.dataset.v; saveChar(); renderCreator(); });
}

document.querySelectorAll('.flag-btn').forEach((b) => b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem('echo-lang', lang); } catch (e) {} applyLang(); showScreen('menu'); });
$('#btn-edit-char').onclick = () => { renderCreator(); showScreen('creator'); };
$('#btn-random').onclick = () => { myChar = randomChar(); saveChar(); renderCreator(); };
$('#btn-char-done').onclick = () => { showScreen(view.inRoom ? (view.state && view.state.phase !== 'lobby' ? 'game' : 'lobby') : 'menu'); if (view.inRoom) toHost({ t: 'char', char: myChar }); };
try { $('#in-name').value = localStorage.getItem('echo-name') || ''; } catch (e) {}
const cleanCode = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
$('#in-code').addEventListener('input', (e) => { const v = cleanCode(e.target.value); if (v !== e.target.value) e.target.value = v; });
function getName() { const n = $('#in-name').value.trim().slice(0, 14); if (!n) { setStatus(t('enterName')); return null; } try { localStorage.setItem('echo-name', n); } catch (e) {} return n; }
let busy = false;
$('#btn-create').onclick = async () => { if (busy) return; const n = getName(); if (!n) return; busy = true; try { await createParty(n); } finally { busy = false; } };
$('#btn-join').onclick = async () => {
  if (busy) return; const n = getName(); if (!n) return;
  const c = cleanCode($('#in-code').value); if (c.length !== 5) { setStatus(t('enterCode')); return; }
  joinSession++; busy = true; try { await joinParty(n, c); } finally { busy = false; }
};
$('#btn-start').onclick = () => toHost({ t: 'start', rounds: +$('#set-rounds').value });
$('#btn-copy').onclick = async () => { try { await navigator.clipboard.writeText(net.code); toast(t('copied')); } catch (e) { toast(net.code); } };
$('#btn-share').onclick = async () => {
  const url = location.origin + location.pathname + '?code=' + net.code;
  if (navigator.share) { try { await navigator.share({ title: 'Echo Party', text: 'Echo Party – Code: ' + net.code, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { toast(url); } }
};
$('#btn-phone').onclick = () => voiceToggle();
$('#btn-home').onclick = async () => {
  if (view.inRoom) { if (!(await confirmBox(t('leave')))) return; joinSession++; sayBye(); await sleep(200); destroyNet(); history.replaceState(null, '', location.pathname); showScreen('menu'); return; }
  showScreen($('#screen-menu').classList.contains('hidden') ? 'menu' : 'lang');
};
$('#btn-credits').onclick = () => {
  const b = modal(`<h3>${t('creditsTitle')}</h3><div class="credits">${SOUNDS.map((s) => `<div>${esc(s[lang === 'am' ? 'am' : 'de'])} – ${esc(s.author)} – <a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(s.license)}</a></div>`).join('')}</div><button class="btn" id="cl">${t('close')}</button>`);
  b.querySelector('#cl').onclick = closeModal;
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
window.addEventListener('pagehide', sayBye);
if (new URLSearchParams(location.search).has('debug')) window.__echo = { net, host, view, EchoScore, SOUNDS };

const urlCode = cleanCode(new URLSearchParams(location.search).get('code') || '');
if (urlCode) $('#in-code').value = urlCode;
applyLang(); showScreen(lang ? 'menu' : 'lang');
if (!window.Peer) setStatus('PeerJS konnte nicht geladen werden (Internet?)');
})();
