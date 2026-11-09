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
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ Einstellungen
const PREFIX = 'echoparty-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 8;
const RESULT_TIME = 7;
const LEAD = 1.0;           // Vorlauf: der Zeiger startet 1 Sekunde vor dem Ton
const START_WAIT = 10;      // so lange darf man mit dem Start-Knopf warten
const DRAW_TIME = 60;       // Sekunden zum Malen
const VOTE_TIME = 12;       // Sekunden zum Bewerten eines Bildes
const WORDS = window.WORDS || [];
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
    code: 'Party-Code', copy: 'Kopieren', copied: 'Kopiert!', share: 'Teilen', players: 'Spieler', rounds: 'Anzahl Runden',
    start: 'Party starten', needTwo: 'Mindestens 2 Spieler nötig', waitHost: 'Warte, bis der Host startet…',
    hostTip: 'Lass diese Seite offen – dein Gerät ist der Spiel-Server.', micTip: '🎤 Du brauchst ein Mikrofon. Am besten mit Kopfhörern spielen.',
    round: 'Runde {a}/{b}', listen: 'Hör gut zu!', yourTurn: 'Jetzt du! Mach den Ton nach.', tapRec: 'Aufnehmen', stop: 'Stopp',
    again: '🔁 Nochmal anhören', retry: '🎙️ Neu aufnehmen', playMine: '▶️ Meine Aufnahme', send: '✅ Abschicken', sent: 'Abgeschickt! Warte auf die anderen…',
    showTime: 'Wie gut war es?', noRec: 'Keine Aufnahme 😶', points: 'Punkte', results: 'Ergebnis', gameOver: 'Party vorbei!', playAgain: 'Nochmal spielen',
    leave: 'Party verlassen und zum Menü?', yes: 'Ja', no: 'Nein', hostLeft: 'Der Host hat die Party verlassen.', notFound: 'Party nicht gefunden. Code prüfen!',
    full: 'Die Party ist voll (max. 8).', connecting: 'Verbinde…', creating: 'Party wird erstellt…', netError: 'Verbindungsfehler – bitte nochmal versuchen.',
    enterName: 'Bitte gib einen Namen ein.', enterCode: 'Bitte gib den 5-stelligen Code ein.', micDenied: 'Kein Zugriff aufs Mikrofon – bitte erlauben.',
    voiceOn: 'Telefon an – ihr könnt reden', voiceOff: 'Telefon aus', joined: '{name} ist da!', left: '{name} ist gegangen', reconnecting: 'Verbindung weg – verbinde neu…',
    notEnough: 'Zu wenige Spieler – zurück zur Lobby.', you: 'du', creditsTitle: 'Quellen der Töne (Wikimedia Commons, freie Lizenzen)', close: 'Schließen',
    tooQuiet: 'Zu leise – nochmal lauter!', loading: 'Lade Ton…', category: 'Mach es nach!', listenHint: 'Hör gut zu – gleich seid ihr alle dran!', oneShot: 'Alle gleichzeitig – nur ein Versuch!', go: 'LOS!', recording: 'Jetzt nachmachen!', micBtn: '🎤 Mikrofon erlauben', wins: 'gewinnt!', startRec: 'Start', waitLine: 'Gleich… los, wenn der Strich die gelbe Linie erreicht!', soundBtn: '🔊 Ton aktivieren', soundOn: 'Ton ist an 🔊', autoIn: 'Startet automatisch in {n} s', mode: 'Spielmodus', modeSound: '🎤 Töne nachmachen', modeDraw: '🎨 Malen & bewerten', drawThis: 'Male:', drawDone: 'Fertig', drawSent: 'Abgeschickt! Warte auf die anderen…', eraser: 'Radierer', undo: 'Rückgängig', clear: 'Alles löschen', rateIt: 'Wie gut ist das Bild? Gib Sterne:', thanksVote: 'Danke für deine Bewertung!', othersRate: 'Die anderen bewerten gerade dein Bild…', votedCount: 'haben bewertet',
  },
  am: {
    namePh: 'ስምዎ', create: 'ፓርቲ ፍጠር', or: 'ወይም', join: 'ተቀላቀል', editChar: '🎨 ገጸ ባሕሪ ሥራ',
    codeNote: 'ኮዱ የላቲን ፊደላት (A–Z) እና ቁጥሮች ብቻ ነው።', credits: 'የድምፆቹ ምንጮች',
    makeChar: 'የእርስዎ ገጸ ባሕሪ', random: '🎲 በዘፈቀደ', done: 'ጨርስ', color: 'ቀለም', eyes: 'ዓይኖች', mouth: 'አፍ', hat: 'ራስ', extra: 'ተጨማሪ', dance: 'ዳንስ',
    code: 'የፓርቲ ኮድ', copy: 'ቅዳ', copied: 'ተቀድቷል!', share: 'አጋራ', players: 'ተጫዋቾች', rounds: 'የዙሮች ብዛት',
    start: 'ፓርቲ ጀምር', needTwo: 'ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ', waitHost: 'አስተናጋጁ እስኪጀምር ይጠብቁ…',
    hostTip: 'ይህን ገጽ ክፍት ይተዉት – መሣሪያዎ የጨዋታው አገልጋይ ነው።', micTip: '🎤 ማይክሮፎን ያስፈልጋል። በጆሮ ማዳመጫ ቢጫወቱ ይሻላል።',
    round: 'ዙር {a}/{b}', listen: 'በደንብ ያዳምጡ!', yourTurn: 'አሁን እርስዎ! ድምፁን ይድገሙ።', tapRec: 'ቅዳ', stop: 'አቁም',
    again: '🔁 እንደገና ያዳምጡ', retry: '🎙️ እንደገና ቅዳ', playMine: '▶️ የእኔ ቅጂ', send: '✅ ላክ', sent: 'ተልኳል! ሌሎችን ይጠብቁ…',
    showTime: 'ምን ያህል ጥሩ ነበር?', noRec: 'ቅጂ የለም 😶', points: 'ነጥብ', results: 'ውጤት', gameOver: 'ፓርቲው አበቃ!', playAgain: 'እንደገና ተጫወት',
    leave: 'ፓርቲውን ትተው ወደ ዋና ማውጫ ይመለሱ?', yes: 'አዎ', no: 'አይ', hostLeft: 'አስተናጋጁ ፓርቲውን ለቋል።', notFound: 'ፓርቲው አልተገኘም። ኮዱን ያረጋግጡ!',
    full: 'ፓርቲው ሞልቷል (ከፍተኛ 8)።', connecting: 'በማገናኘት ላይ…', creating: 'ፓርቲ በመፍጠር ላይ…', netError: 'የግንኙነት ስህተት – እንደገና ይሞክሩ።',
    enterName: 'እባክዎ ስም ያስገቡ።', enterCode: 'እባክዎ ባለ 5 ፊደል ኮዱን ያስገቡ።', micDenied: 'ማይክሮፎን አልተፈቀደም – እባክዎ ይፍቀዱ።',
    voiceOn: 'ስልኩ በርቷል – መነጋገር ትችላላችሁ', voiceOff: 'ስልኩ ጠፍቷል', joined: '{name} መጣ!', left: '{name} ወጣ', reconnecting: 'ግንኙነቱ ተቋርጧል – እንደገና በማገናኘት ላይ…',
    notEnough: 'ተጫዋቾች በቂ አይደሉም – ወደ ሎቢ።', you: 'እርስዎ', creditsTitle: 'የድምፆቹ ምንጮች (Wikimedia Commons፣ ነፃ ፈቃድ)', close: 'ዝጋ',
    tooQuiet: 'በጣም ዝቅ ያለ ነው – እንደገና ጮክ ብለው!', loading: 'ድምፁ እየተጫነ ነው…', category: 'ይድገሙት!', listenHint: 'በደንብ ያዳምጡ – በቅርቡ ሁላችሁም ተራ ይደርሳችኋል!', oneShot: 'ሁሉም በአንድ ጊዜ – አንድ ሙከራ ብቻ!', go: 'ጀምር!', recording: 'አሁን ይድገሙ!', micBtn: '🎤 ማይክሮፎን ይፍቀዱ', wins: 'አሸነፈ!', startRec: 'ጀምር', waitLine: 'ቆይ… መስመሩ ቢጫውን መስመር ሲደርስ ይጀምሩ!', soundBtn: '🔊 ድምፅ አብራ', soundOn: 'ድምፁ በርቷል 🔊', autoIn: 'በ{n} ሰከንድ ውስጥ በራሱ ይጀምራል', mode: 'የጨዋታ ዓይነት', modeSound: '🎤 ድምፅ መድገም', modeDraw: '🎨 መሳልና መገምገም', drawThis: 'ይሳሉ፦', drawDone: 'ጨርሻለሁ', drawSent: 'ተልኳል! ሌሎችን ይጠብቁ…', eraser: 'ማጥፊያ', undo: 'መልስ', clear: 'ሁሉንም አጥፋ', rateIt: 'ሥዕሉ ምን ያህል ጥሩ ነው? ኮከብ ይስጡ፦', thanksVote: 'ስለ ግምገማዎ እናመሰግናለን!', othersRate: 'ሌሎች ሥዕልዎን እየገመገሙ ነው…', votedCount: 'ገምግመዋል',
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
// Ton sicher einschalten: AudioContext fortsetzen, stillen Ton abspielen und (iPhone) Wiedergabe-Modus setzen,
// damit der Ton auch kommt, wenn der Lautlos-Schalter an ist.
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAAGQAACuoAGhoaIyMjIy0tLS02NjY2QEBAQEpKSkpTU1NTXV1dXWZmZmZwcHBweXl5eYODg4ONjY2NlpaWlqCgoKCpqamps7Ozs729vb3GxsbG0NDQ0NnZ2dnj4+Pj7Ozs7Pb29vb/////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCUgAAAAAAAArqJwTg6QAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
let unlockEl = null;
function unlockAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = micStream ? 'play-and-record' : 'playback'; } catch (e) {}
  const ctx = ac();
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); } catch (e) {}
  try { if (!unlockEl) { unlockEl = new Audio(SILENT_MP3); unlockEl.loop = true; unlockEl.volume = 0.01; unlockEl.setAttribute('playsinline', ''); } unlockEl.play().catch(() => {}); } catch (e) {}
  return ctx.state === 'running';
}
document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
const bufCache = new Map();
async function loadSound(i) {
  if (bufCache.has(i)) return bufCache.get(i);
  const p = (async () => {
    const r = await fetch('sounds/' + SOUNDS[i].file);
    const ab = await r.arrayBuffer();
    const buf = await new Promise((res, rej) => ac().decodeAudioData(ab, res, rej));
    const ch = buf.getChannelData(0);
    return { buf, feat: EchoScore.features(ch, buf.sampleRate), peaks: peaks(ch, 100) };
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
  try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
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
  players: [], phase: 'lobby', rounds: 5, round: 0, soundIdx: -1, used: new Set(), deadline: 0, timer: null, mode: 'sound', wordIdx: -1, revealed: false,
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
      case 'start': if (p.host && this.phase === 'lobby' && this.players.length >= 2) { this.rounds = clamp(+msg.rounds || 5, 1, 20); this.mode = msg.mode === 'draw' ? 'draw' : 'sound'; this.startGame(); } return;
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
      case 'drawing': {
        if (this.phase !== 'draw' || msg.round !== this.round || this.recs.has(from)) return;
        const strokes = Array.isArray(msg.strokes) ? msg.strokes.slice(0, 800) : [];
        this.recs.set(from, { score: 0, strokes, votes: new Map(), avg: 0 });
        broadcast({ t: 'drawing', pid: from, round: this.round, strokes }, from);
        this.pushState();
        if (this.players.every((x) => this.recs.has(x.id))) this.startPresent();
        return;
      }
      case 'vote': {
        if (this.phase !== 'present' || this.revealed) return;
        const cur = this.showOrder[this.showIdx]; if (msg.pid !== cur || from === cur) return;
        const r = this.recs.get(cur); if (!r) return;
        r.votes.set(from, clamp(msg.stars | 0, 1, 5)); this.pushState();
        if (this.players.filter((x) => x.id !== cur).every((x) => r.votes.has(x.id))) this.revealVotes();
        return;
      }
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
    if (this.phase === 'draw' || this.phase === 'present') for (const [pid, r] of this.recs) if (pid !== from) sendTo(from, { t: 'drawing', pid, round: this.round, strokes: r.strokes });
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
    if (this.phase === 'draw' && this.players.every((x) => this.recs.has(x.id))) this.startPresent();
    this.pushState();
  },
  sweep() { const now = Date.now(); for (const p of [...this.players]) if (!p.host && now - p.seen > 20000) this.removePlayer(p.id); },
  state() {
    return {
      t: 'state', phase: this.phase, round: this.round, rounds: this.rounds, soundIdx: this.soundIdx,
      remaining: Math.max(0, this.deadline - Date.now()), showPid: this.showOrder[this.showIdx] || null, showIdx: this.showIdx, showCount: this.showOrder.length,
      players: this.players.map((p) => ({ id: p.id, name: p.name, char: p.char, score: p.score, voice: p.voice, host: p.host, lang: p.lang, done: this.recs.has(p.id) })),
      roundScores: Object.fromEntries([...this.recs].map(([k, v]) => [k, v.score])), gains: this.gains,
      mode: this.mode, wordIdx: this.wordIdx,
      present: this.phase === 'present' ? (() => { const r = this.recs.get(this.showOrder[this.showIdx]) || { votes: new Map() };
        return { revealed: this.revealed, voters: [...r.votes.keys()], votes: this.revealed ? Object.fromEntries(r.votes) : null, avg: this.revealed ? r.avg : 0, score: this.revealed ? r.score : 0 }; })() : null,
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
    if (this.mode === 'draw') {
      let w = rnd(WORDS.length); for (let k = 0; k < 300 && (this.used.has(w) || (WORDS[w] && WORDS[w][2] > 2)); k++) w = rnd(WORDS.length);
      this.used.add(w); this.wordIdx = w; this.recs = new Map(); this.gains = {}; this.showOrder = []; this.showIdx = 0;
      this.setPhase('draw', DRAW_TIME, () => this.startPresent());
      return;
    }
    let i = rnd(SOUNDS.length); for (let k = 0; k < 60 && this.used.has(i); k++) i = rnd(SOUNDS.length);
    this.used.add(i); this.soundIdx = i; this.recs = new Map(); this.gains = {}; this.showOrder = []; this.showIdx = 0;
    const sec = (SOUNDS[i] && SOUNDS[i].seconds) || 3;
    this.setPhase('listen', (LEAD + sec) * 2 + 3.5, () => this.setPhase('record', START_WAIT + LEAD + sec + 0.6 + 6, () => this.startShow()));
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
    const sec = r && r.wav ? clamp(r.sec, 0.5, 8) + 3.8 : 2.5;
    this.setPhase('show', sec, () => { this.showIdx++; this.showStep(); });
  },
  // Malen: jedes Bild kommt nacheinander auf die Bühne, die anderen geben Sterne
  startPresent() {
    this.stop();
    this.showOrder = shuffle(this.players.filter((p) => this.recs.has(p.id)).map((p) => p.id));
    this.showIdx = 0; this.presentStep();
  },
  presentStep() {
    if (this.showIdx >= this.showOrder.length) { this.finishRound(); return; }
    this.revealed = false;
    this.setPhase('present', 3.5 + VOTE_TIME, () => this.revealVotes());
  },
  revealVotes() {
    this.stop();
    const r = this.recs.get(this.showOrder[this.showIdx]);
    if (r) { const v = [...r.votes.values()]; r.avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; r.score = Math.round(r.avg * 20); }
    this.revealed = true;
    this.setPhase('present', 4, () => { this.showIdx++; this.presentStep(); });
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
  lastKey: '', myRec: null, recorder: null, listenRound: -1, recRoundStarted: -1, drawRoundStarted: -1, drawings: new Map(), drawRound: -1, draw: null, presentKey: '',
  reset() { this.inRoom = false; this.state = null; this.recs = new Map(); this.myRec = null; this.recRoundStarted = -1; this.listenRound = -1; this.drawRoundStarted = -1; this.drawings = new Map(); this.draw = null; this.presentKey = ''; this.lastKey = ''; clearInterval(this.tick); stopPlay(); if (this.recorder) this.recorder.stop(); },
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
      case 'drawing': if (this.state && msg.round === this.state.round) this.storeDrawing(msg.pid, msg.round, msg.strokes); break;
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
    const key = [st.phase, st.round, st.showIdx, (st.phase === 'record' || st.phase === 'draw') ? st.players.map((p) => p.done ? 1 : 0).join('') : '', st.present ? st.present.revealed : '', lang].join('|');
    if (key !== this.lastKey) { this.lastKey = key; this.renderStage(prev); }
    else if (st.phase === 'present') this.updateVoteArea();
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
    const onStage = st.phase === 'show' || st.phase === 'present' || st.phase === 'results' || st.phase === 'end';
    stage.classList.toggle('on-stage', onStage);
    $('#game-players').classList.toggle('hidden', onStage);
    if (st.phase === 'listen') {
      stage.innerHTML = `<div class="cat">${t('category')}</div><div class="meme-title">${esc(soundName(st.soundIdx))}</div>
        <div class="wave-box"><canvas id="wave" width="640" height="130"></canvas><div class="wave-cd" id="wave-cd"></div></div>
        <div class="hint">👂 ${t('listenHint')}</div>${micStream ? '' : `<button class="btn green" id="mic-ok">${t('micBtn')}</button>`}`;
      const mb = $('#mic-ok'); if (mb) mb.onclick = async () => { try { await getMic(); mb.remove(); } catch (e) { toast(t('micDenied')); } };
      try {
        const s = await loadSound(st.soundIdx); if (this.state.phase !== 'listen') return;
        const lf = LEAD / (LEAD + s.buf.duration);
        const cv = $('#wave'); if (cv) drawWave(cv, s.peaks, null, -1, lf);
        const round = st.round;
        const offerSound = () => { if (ac().state === 'running' || $('#snd-btn')) return;
          $('#stage').insertAdjacentHTML('beforeend', `<button class="btn primary" id="snd-btn">${t('soundBtn')}</button>`);
          $('#snd-btn').onclick = async () => { unlockAudio(); $('#snd-btn').remove(); if (this.state.phase === 'listen' && this.state.round === round) await this.playWithHead(s.buf, s.peaks, null, () => $('#wave'), null, LEAD); }; };
        if (this.listenRound !== st.round) {
          this.listenRound = st.round;
          for (let k = 0; k < 2; k++) {
            if (this.state.phase !== 'listen' || this.state.round !== round) return;
            offerSound();
            await this.playWithHead(s.buf, s.peaks, null, () => $('#wave'), null, LEAD);
            await sleep(600);
          }
        }
      } catch (e) { console.warn(e); }
    } else if (st.phase === 'record') {
      if (this.recRoundStarted !== st.round) { this.recRoundStarted = st.round; this.runRecord(st.round, st.soundIdx); }
      else this.updateDone();
    } else if (st.phase === 'draw') {
      if (this.drawRoundStarted !== st.round) { this.drawRoundStarted = st.round; this.runDraw(st.round, st.wordIdx); }
      else this.updateDone();
    } else if (st.phase === 'present') {
      this.renderPresent();
    } else if (st.phase === 'show') {
      stopPlay();
      const p = st.players.find((x) => x.id === st.showPid);
      if (!p) { stage.innerHTML = ''; return; }
      const r = this.recs.get(p.id); const score = st.roundScores[p.id] ?? (r ? r.score : 0);
      stage.innerHTML = scoreCards(st, p.id) + `<div class="floor">
          <div class="speaker-box left">🔊</div><div class="speaker-box right">🔊</div>
          <div class="backline">${st.players.filter((x) => x.id !== p.id).map((x) => charEl(x.char, 46, false)).join('')}</div>
          <div class="performer"><div class="mic-stand">${MIC_SVG}</div>${charEl(p.char, 120, true)}</div>
        </div>
        <div class="perf-name">🎤 ${esc(p.name)}</div>
        <div class="wave-box small"><canvas id="wave" width="640" height="90"></canvas></div>
        <div class="score-row"><span class="big-score" id="show-score"></span><span class="stars" id="show-stars"></span></div>`;
      const mouth = stage.querySelector('.performer .mouth');
      const myRound = st.round, myIdx = st.showIdx;
      const reveal = () => { const st2 = this.state; if (!st2 || st2.phase !== 'show' || st2.showIdx !== myIdx || st2.round !== myRound) return; const el = $('#show-stars'); if (!el) return; countUp($('#show-score'), score); const s5 = Math.round(score / 20); el.textContent = '★'.repeat(s5) + '☆'.repeat(5 - s5); };
      if (r && !r.buf) await sleep(500);
      if (this.state.showIdx !== myIdx || this.state.round !== myRound) return;
      if (r && r.buf) {
        const pk = peaks(r.buf.getChannelData(0), 100);
        await this.playWithHead(r.buf, null, pk, () => $('#wave'), (lv) => { if (mouth) mouth.style.transform = `scaleY(${1 + lv * 2.2}) scaleX(${1 + lv * .4})`; });
        if (this.state.showIdx === myIdx) reveal();
      } else { const e = $('#show-score'); if (e) e.textContent = t('noRec'); setTimeout(reveal, 900); }
    } else if (st.phase === 'results') {
      const sorted = [...st.players].sort((a, b) => b.score - a.score);
      stage.innerHTML = scoreCards(st, null, true) + `<div class="floor"><div class="speaker-box left">🔊</div><div class="speaker-box right">🔊</div>
        <div class="crowd">${sorted.map((p) => `<div class="crowd-p">${charEl(p.char, 70, true)}<div class="gain">+${st.gains[p.id] || 0}</div></div>`).join('')}</div></div>
        <h2>${t('results')}</h2>`;
    } else if (st.phase === 'end') {
      const s = [...st.players].sort((a, b) => b.score - a.score);
      const pod = [s[1], s[0], s[2]].map((p, i) => p ? `<div class="pl">${charEl(p.char, i === 1 ? 100 : 74, true)}<div>${esc(p.name)}</div><div class="block" style="height:${[60, 90, 44][i]}px;background:${['#c0c0c0', '#ffc107', '#cd7f32'][i]}">${[2, 1, 3][i]}</div></div>` : '').join('');
      stage.innerHTML = `<h2>🏆 ${t('gameOver')}</h2><div class="winner">${esc(s[0].name)} ${t('wins')}</div><div class="podium">${pod}</div>
        <div class="board">${s.map((p, i) => `<div class="line"><span class="n">${i + 1}. ${esc(p.name)}</span><span>${p.score} ${t('points')}</span></div>`).join('')}</div>` +
        (net.isHost ? `<button class="btn primary" id="btn-again">${t('playAgain')}</button>` : '');
      const a = $('#btn-again'); if (a) a.onclick = () => toHost({ t: 'lobby' });
    }
  },
  // spielt einen Ton und lässt den roten Strich über die Wellenform laufen
  playWithHead(buf, refPk, recPk, getCanvas, onLevel, lead) {
    lead = lead || 0; const total = lead + buf.duration, lf = lead / total;
    const t0 = performance.now(); let raf = 0;
    const loop = () => { const cv = getCanvas(); if (cv) drawWave(cv, refPk, recPk, (performance.now() - t0) / 1000 / total, lf); raf = requestAnimationFrame(loop); };
    loop();
    return sleep(lead * 1000).then(() => playBuffer(buf, onLevel)).then(() => { cancelAnimationFrame(raf); const cv = getCanvas(); if (cv) drawWave(cv, refPk, recPk, -1, lf); });
  },
  updateDone() {
    const el = $('#done-list'); const st = this.state; if (!el || !st) return;
    el.innerHTML = st.players.map((p) => `<span class="${p.done ? 'ok' : ''}">${p.done ? '✅' : '🎙️'} ${esc(p.name)}</span>`).join('');
  },
  // Alle gleichzeitig: 3-2-1-LOS, dann genau ein Versuch
  async runRecord(round, idx) {
    const stage = $('#stage'); stopPlay();
    stage.innerHTML = `<div class="cat">${t('category')}</div><div class="meme-title">${esc(soundName(idx))}</div>
      <div class="wave-box"><canvas id="wave" width="640" height="130"></canvas><div class="wave-cd" id="wave-cd"></div></div>
      <div class="hint" id="rec-hint">⚡ ${t('oneShot')}</div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const alive = () => this.state && this.state.round === round && this.state.phase === 'record';
    let ref; try { ref = await loadSound(idx); } catch (e) { toast(t('loading')); return; }
    const lf = LEAD / (LEAD + ref.buf.duration);
    const cv = $('#wave'); drawWave(cv, ref.peaks, null, -1, lf);
    let micOk = true; try { await getMic(); } catch (e) { micOk = false; }
    // Start-Knopf: selbst drücken – nach 10 Sekunden startet es von allein
    const hint = $('#rec-hint');
    hint.innerHTML = `<button class="rec-btn" id="rec-start">🎙️<br>${t('startRec')}</button><div class="note" id="auto-note"></div>`;
    await new Promise((resolve) => {
      let left = START_WAIT, done = false;
      const fin = () => { if (done) return; done = true; clearInterval(iv); resolve(); };
      const upd = () => { const n = $('#auto-note'); if (n) n.textContent = t('autoIn', { n: left }); };
      const iv = setInterval(() => { left--; if (left <= 0 || !alive()) fin(); else { upd(); if (left <= 3) tick(440); } }, 1000);
      upd(); const rb = $('#rec-start'); if (rb) rb.onclick = fin; else fin();
    });
    if (!alive()) return;
    { const h0 = $('#rec-hint'); if (h0) h0.textContent = '👀 ' + t('waitLine'); }
    // Wenn der Zeiger die gestrichelte Linie erreicht: LOS!
    setTimeout(() => { if (!alive()) return; const cd = $('#wave-cd'); if (cd) { cd.textContent = t('go'); cd.classList.add('go'); setTimeout(() => { cd.textContent = ''; cd.classList.remove('go'); }, 700); } tick(880); const h1 = $('#rec-hint'); if (h1) h1.textContent = '🎙️ ' + t('recording'); }, LEAD * 1000);
    tick(520);
    if (!micOk) { const h2 = $('#rec-hint'); if (h2) h2.textContent = t('micDenied'); toHost({ t: 'rec', round, score: 0, wav: null, sec: 0 }); return; }
    const sec = ref.buf.duration, total = LEAD + sec, N = 120, recPk = new Array(N).fill(0);
    const t0 = performance.now();
    let lastI = 0;
    const rec = recordFor(total + 0.6, (lv) => {
      const el = (performance.now() - t0) / 1000;
      if (el < LEAD) return; // im Vorlauf noch nichts zeichnen – erst ab der gelben Linie
      const i = Math.min(N - 1, Math.floor(el / total * N));
      if (lastI === 0) lastI = Math.floor(LEAD / total * N);
      for (let k = lastI; k <= i; k++) recPk[k] = Math.max(recPk[k], Math.min(1, lv * 1.8)); // Lücken füllen
      lastI = i + 1;
    });
    this.recorder = rec;
    let raf = 0; const loop = () => { const c = $('#wave'); if (c) drawWave(c, ref.peaks, recPk, (performance.now() - t0) / 1000 / total, lf); if (this.recorder === rec) raf = requestAnimationFrame(loop); };
    loop();
    const res = await rec.promise; this.recorder = null; cancelAnimationFrame(raf);
    const c2 = $('#wave'); if (c2) drawWave(c2, ref.peaks, recPk, -1, lf);
    const data = trimStart(res.data, res.sr), sr = res.sr;
    const feat = EchoScore.features(data, sr); const score = feat ? EchoScore.compare(ref.feat, feat) : 0;
    const small = EchoScore.resample(data, sr); const wav = encodeWav(small, EchoScore.SR);
    if (this.state.round !== round) return;
    this.storeRec(net.myId, round, wav, score);
    toHost({ t: 'rec', round, score, wav, sec: small.length / EchoScore.SR });
    const h = $('#rec-hint'); if (h) h.textContent = '✅ ' + t('sent');
  },
  // ---------------- Malen ----------------
  storeDrawing(pid, round, strokes) {
    if (round !== this.drawRound) { this.drawings = new Map(); this.drawRound = round; }
    this.drawings.set(pid, strokes || []);
  },
  runDraw(round, wordIdx) {
    const stage = $('#stage');
    stage.innerHTML = `<div class="cat">${t('drawThis')}</div><div class="meme-title">${esc(wordName(wordIdx))}</div>
      <div class="draw-wrap"><canvas id="dcv" width="800" height="600"></canvas><div class="draw-sent hidden" id="draw-sent">✅ ${t('drawSent')}</div></div>
      <div class="palette">${PALETTE.map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
      <div class="dtools"><button class="tl sz" data-s="5">•</button><button class="tl sz on" data-s="12">●</button><button class="tl sz" data-s="28">⬤</button>
        <button class="tl" id="t-er" title="${t('eraser')}">🧽</button><button class="tl" id="t-undo" title="${t('undo')}">↩️</button><button class="tl" id="t-clear" title="${t('clear')}">🗑️</button></div>
      <button class="btn green" id="d-done">✅ ${t('drawDone')}</button><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const cv = $('#dcv'), ctx = cv.getContext('2d');
    const d = { strokes: [], color: PALETTE[0], size: 12, eraser: false, cur: null, sent: false, round };
    this.draw = d;
    const redraw = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600); for (const s of d.strokes) drawStroke(ctx, s); };
    redraw();
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 800), Math.round((e.clientY - r.top) / r.height * 600)]; };
    cv.addEventListener('pointerdown', (e) => {
      if (d.sent) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const [x, y] = pos(e); d.cur = { c: d.eraser ? '#ffffff' : d.color, w: d.eraser ? Math.max(24, d.size) : d.size, p: [x, y] };
      d.strokes.push(d.cur); drawStroke(ctx, d.cur);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!d.cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) { const [x, y] = pos(ev); const p = d.cur.p, lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.abs(x - lx) + Math.abs(y - ly) < 3) continue;
        ctx.strokeStyle = d.cur.c; ctx.lineWidth = d.cur.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); p.push(x, y); }
    });
    const end = () => { d.cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    stage.querySelectorAll('.sw').forEach((b) => b.onclick = () => { d.color = b.dataset.c; d.eraser = false; stage.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b)); $('#t-er').classList.remove('on'); });
    stage.querySelectorAll('.sz').forEach((b) => b.onclick = () => { d.size = +b.dataset.s; stage.querySelectorAll('.sz').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#t-er').onclick = () => { d.eraser = !d.eraser; $('#t-er').classList.toggle('on', d.eraser); };
    $('#t-undo').onclick = () => { if (!d.sent) { d.strokes.pop(); redraw(); } };
    $('#t-clear').onclick = () => { if (!d.sent) { d.strokes = []; redraw(); } };
    $('#d-done').onclick = () => this.sendDrawing();
  },
  sendDrawing() {
    const d = this.draw, st = this.state; if (!d || d.sent || !st || st.round !== d.round || st.phase !== 'draw') return;
    d.sent = true;
    this.storeDrawing(net.myId, d.round, d.strokes);
    toHost({ t: 'drawing', round: d.round, strokes: d.strokes });
    const s = $('#draw-sent'); if (s) s.classList.remove('hidden');
    const b = $('#d-done'); if (b) b.disabled = true;
  },
  renderPresent() {
    const st = this.state, stage = $('#stage'), pid = st.showPid, p = st.players.find((x) => x.id === pid);
    if (!p) { stage.innerHTML = ''; return; }
    const key = st.round + '|' + st.showIdx;
    if (this.presentKey === key && $('#pcv')) { this.updateVoteArea(); return; }
    this.presentKey = key;
    stage.innerHTML = scoreCards(st, pid) + `<div class="floor draw-floor"><div class="speaker-box left">🔊</div><div class="speaker-box right">🔊</div>
        <div class="easel"><canvas id="pcv" width="800" height="600"></canvas></div>
        <div class="presenter">${charEl(p.char, 78, true)}</div></div>
      <div class="perf-name">🎨 ${esc(p.name)} · „${esc(wordName(st.wordIdx))}“</div><div id="vote-area"></div>`;
    replayStrokes($('#pcv'), (this.drawings && this.drawings.get(pid)) || [], 3200);
    this.updateVoteArea();
  },
  updateVoteArea() {
    const st = this.state, el = $('#vote-area'); if (!el || !st.present) return;
    const pid = st.showPid, pr = st.present, others = st.players.length - 1;
    const raters = st.players.filter((x) => x.id !== pid);
    if (pr.revealed) {
      const s5 = Math.round(pr.avg);
      const list = raters.map((x) => { const v = pr.votes && pr.votes[x.id]; return `<div class="vline">${charEl(x.char, 26, false)}<span class="vn">${esc(x.name)}</span><span class="vs">${v ? '★'.repeat(v) + '☆'.repeat(5 - v) : '—'}</span></div>`; }).join('');
      el.innerHTML = `<div class="score-row"><span class="stars big">${'★'.repeat(s5)}${'☆'.repeat(5 - s5)}</span><span class="big-score">+${pr.score}</span></div><div class="vlist">${list}</div>`;
      return;
    }
    const counter = `<div class="voter-chips">${raters.map((x) => `<span class="${pr.voters.includes(x.id) ? 'ok' : ''}">${pr.voters.includes(x.id) ? '✅' : '⏳'} ${esc(x.name)}</span>`).join('')}</div>`;
    if (pid === net.myId) { el.innerHTML = `<div class="hint light">${t('othersRate')}</div>${counter}`; return; }
    if (pr.voters.includes(net.myId)) { el.innerHTML = `<div class="hint light">✅ ${t('thanksVote')}</div>${counter}`; return; }
    el.innerHTML = `<div class="hint light">${t('rateIt')}</div><div class="vote-stars">${[1, 2, 3, 4, 5].map((n) => `<button class="vstar" data-n="${n}">★</button>`).join('')}</div>${counter}`;
    const btns = el.querySelectorAll('.vstar');
    btns.forEach((b) => {
      b.onpointerenter = () => btns.forEach((x) => x.classList.toggle('lit', +x.dataset.n <= +b.dataset.n));
      b.onclick = () => { toHost({ t: 'vote', pid, stars: +b.dataset.n }); el.innerHTML = `<div class="hint light">✅ ${t('thanksVote')}</div>`; };
    });
  },
  updateTimer() {
    const el = $('#info-timer'), st = this.state;
    if (!st || st.phase === 'lobby' || st.phase === 'end') { el.textContent = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = Math.max(0, Math.ceil((this.deadlineLocal - Date.now()) / 1000));
    el.textContent = s; el.classList.toggle('low', (st.phase === 'record' || st.phase === 'draw') && s <= 5);
    if (st.phase === 'draw' && this.draw && !this.draw.sent && this.deadlineLocal - Date.now() < 1500) this.sendDrawing();
  },
};
// Malen: Farben, Strich zeichnen, Bild Strich für Strich nachzeichnen
const PALETTE = ['#111111', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a', '#795548', '#90a4ae', '#00bcd4'];
const wordName = (i) => (WORDS[i] ? WORDS[i][lang === 'am' ? 1 : 0] : '?');
function drawStroke(ctx, s, upto) {
  const p = s.p, n = upto == null ? p.length : Math.min(p.length, upto);
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (n <= 2) { ctx.beginPath(); ctx.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < n; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke();
}
function replayStrokes(cv, strokes, ms) {
  const ctx = cv.getContext('2d'); const total = strokes.reduce((a, s) => a + s.p.length, 0) || 1; const t0 = performance.now();
  const frame = () => {
    if (!cv.isConnected) return;
    const f = Math.min(1, (performance.now() - t0) / ms); let budget = Math.ceil(total * f / 2) * 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600);
    for (const s of strokes) { if (budget <= 0) break; drawStroke(ctx, s, budget); budget -= s.p.length; }
    if (f < 1) requestAnimationFrame(frame);
  };
  frame();
}
// Stille vor dem eigentlichen Geräusch abschneiden (der Vorlauf)
function trimStart(d, sr) {
  let peak = 0; for (let i = 0; i < d.length; i += 4) peak = Math.max(peak, Math.abs(d[i]));
  if (peak < 0.005) return d;
  let i = 0; while (i < d.length && Math.abs(d[i]) < peak * 0.08) i++;
  return d.subarray(Math.max(0, i - Math.floor(0.15 * sr)));
}
// Wellenform: blau = Original, pink = eigene Stimme, rot = Laufstrich
function peaks(data, n) {
  const out = new Array(n).fill(0), step = Math.max(1, Math.floor(data.length / n));
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 4) m = Math.max(m, Math.abs(data[j])); out[i] = m; }
  const mx = Math.max(...out, 1e-6); return out.map((v) => Math.sqrt(v / mx));
}
// lead = Anteil des Vorlaufs (0..1): links davon ist noch Stille, der Ton beginnt an der gestrichelten Linie
function drawWave(cv, ref, rec, head, lead) {
  lead = lead || 0;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#1d1440'; c.beginPath(); (c.roundRect ? c.roundRect(0, 0, W, H, 18) : c.rect(0, 0, W, H)); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(8, H / 2 - 1, W - 16, 2);
  const bars = (arr, col, x0, x1) => { const bw = (x1 - x0) / arr.length; c.fillStyle = col; arr.forEach((v, i) => { const h = Math.max(1.5, v * H * 0.42); c.fillRect(x0 + i * bw + 1, H / 2 - h, Math.max(1, bw - 2), h * 2); }); };
  const xs = lead * W;
  if (lead > 0) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, 0, xs, H); c.fillStyle = '#ffe066'; for (let y = 6; y < H - 6; y += 10) c.fillRect(xs - 1, y, 2, 6); }
  if (ref) bars(ref, '#7fe3ff', xs, W);
  if (rec) bars(rec, 'rgba(255,70,170,.9)', 0, W);
  if (head >= 0 && head <= 1.08) { const x = Math.min(1, head) * (W - 8) + 4; c.fillStyle = '#ff2244'; c.fillRect(x - 2.5, 6, 5, H - 12); }
}
function tick(f) { try { const ctx = ac(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = 0.12; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18); o.stop(ctx.currentTime + 0.2); } catch (e) {} }
const MIC_SVG = '<svg viewBox="0 0 40 120" width="34"><rect x="18" y="30" width="4" height="84" fill="#333"/><ellipse cx="20" cy="116" rx="16" ry="4" fill="#333"/><rect x="12" y="4" width="16" height="30" rx="8" fill="#444"/><rect x="14" y="7" width="12" height="18" rx="6" fill="#888"/></svg>';
// Punktekarten oben (wie eine Anzeigetafel)
function scoreCards(st, activeId, withGain) {
  const sorted = [...st.players].sort((a, b) => b.score - a.score);
  return `<div class="cards">${sorted.map((p) => `<div class="scard${p.id === activeId ? ' active' : ''}"><div class="sc-head">${charEl(p.char, 34, false)}</div><div class="sc-name">${esc(p.name)}</div><div class="sc-pts">${p.score}${withGain && st.gains[p.id] ? ` <small>+${st.gains[p.id]}</small>` : ''}</div></div>`).join('')}</div>`;
}
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
  $('#btn-sound').classList.toggle('hidden', !inRoom);
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
$('#btn-start').onclick = () => toHost({ t: 'start', rounds: +$('#set-rounds').value, mode: $('#set-mode').value });
$('#btn-copy').onclick = async () => { try { await navigator.clipboard.writeText(net.code); toast(t('copied')); } catch (e) { toast(net.code); } };
$('#btn-share').onclick = async () => {
  const url = location.origin + location.pathname + '?code=' + net.code;
  if (navigator.share) { try { await navigator.share({ title: 'Echo Party', text: 'Echo Party – Code: ' + net.code, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { toast(url); } }
};
$('#btn-phone').onclick = () => voiceToggle();
$('#btn-sound').onclick = () => { unlockAudio(); tick(660); setTimeout(() => tick(880), 150); toast(t('soundOn')); };
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
