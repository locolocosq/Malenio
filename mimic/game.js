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
const CHOOSE_TIME = 12;     // Malen & Raten: Zeit, ein Wort auszuwählen
const GUESS_TIME = 80;      // Malen & Raten: Zeit zum Malen/Raten
const LOGO_TIME = 40;       // Logo-Quiz: so lange dauert es, bis das Logo ganz zu sehen ist
const LOGO_GRID = 10;       // Logo-Quiz: 10×10 Kärtchen decken das Logo zu
const HANG_TURN = 15;       // Strichmännchen: Zeit pro Buchstabe
const HANG_MAX = 10;        // Galgenmännchen: so viele Fehler, dann ist es fertig
const EST_TIME = 30;        // Schätzen: Zeit für den Tipp
const REACT_WINDOW = 5;     // Reaktion: so lange (s) nach dem Grün darf man noch tippen
const SIMON_TIME = 75;      // Farbfolge: Zeit für alle Level
const SIMON_LEN = 40;       // Farbfolge: längste Folge
const SEQ_MODES = ['simon', 'memory', 'cups', 'stack']; // Hütchenspiel nutzt dieselben Level-Regeln // Farbfolge (4 Farben) und Sequenz-Memory (9 Felder) laufen gleich ab
const seqPads = (mode) => (mode === 'memory' ? 9 : 4);
const seqStart = (mode) => (mode === 'memory' ? 2 : 3);
const EMOJI_TIME = 45;      // Emoji-Rätsel: Zeit zum Raten
const HALVE_TIME = 30;      // Halbieren: Zeit für den Schnitt
const BAL_TIME = 25;        // Wippe: Zeit zum Hinstellen
const COL_SHOW = 3;         // Farbe treffen: so lange (s) wird die Farbe gezeigt
const COL_TIME = 25;        // Farbe treffen: Zeit zum Nachmischen
const CIRC_TIME = 25;       // Perfekter Kreis: Zeit für alle Versuche
const CIRC_TRIES = 3;       // Perfekter Kreis: Versuche, der beste zählt
// Farbe: HSL -> RGB -> Lab; Abstand im Lab-Raum ≈ wie unterschiedlich das Auge die Farben sieht
function hslRgb(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); }
function rgbLab([r, g, b]) {
  const lin = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = f(R * 0.2126 + G * 0.7152 + B * 0.0722), z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function colMatch(a, b) { // 0–100 % Treffer
  const A = rgbLab(hslRgb(a.h, a.s, a.l)), B = rgbLab(hslRgb(b.h, b.s, b.l));
  const dE = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
  return Math.max(0, Math.round((100 - dE * 2) * 10) / 10);
}
const hslCss = (c) => `hsl(${Math.round(c.h)} ${Math.round(c.s)}% ${Math.round(c.l)}%)`;
// Kreis: wie rund? (Punkte gleichmäßig verteilen, Mittelpunkt, Abweichung vom mittleren Radius, Lücke zwischen Anfang und Ende)
function circleScore(raw) {
  if (raw.length < 8) return { ok: false };
  const pts = [raw[0]]; let len = 0;
  for (let i = 1; i < raw.length; i++) len += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
  const N = 120, step = len / N; let acc = 0;
  for (let i = 1; i < raw.length && pts.length < N; i++) {
    let [px, py] = raw[i - 1]; const [qx, qy] = raw[i]; let d = Math.hypot(qx - px, qy - py);
    while (acc + d >= step && pts.length < N) { const t = (step - acc) / d; px += (qx - px) * t; py += (qy - py) * t; pts.push([px, py]); d = Math.hypot(qx - px, qy - py); acc = 0; }
    acc += d;
  }
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const rs = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)), r = rs.reduce((a, v) => a + v, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((a, v) => a + (v - r) ** 2, 0) / rs.length);
  let turn = 0; for (let i = 1; i < pts.length; i++) { let d = Math.atan2(pts[i][1] - cy, pts[i][0] - cx) - Math.atan2(pts[i - 1][1] - cy, pts[i - 1][0] - cx); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; turn += d; }
  const gap = Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]);
  if (r < 0.12) return { ok: false, why: 'circSmall' };
  if (Math.abs(turn) < Math.PI * 2 * 0.88) return { ok: false, why: 'circOpen' };
  const pct = Math.max(0, 100 * (1 - 3 * sd / r) - Math.min(15, gap / r * 15));
  return { ok: true, pct: Math.round(pct * 10) / 10, cx, cy, r };
}
const BAL_HOLD = 8;         // Wippe: so lange (s) muss sie halten – perfekt = hält die ganze Zeit
const BAL_PERFECT = 0.03;   // Wippe: bis 3 % Abweichung beim Drehmoment gilt als perfekt
// Wippe: Gegenstände [Emoji, kg]; 'DB' = Hantel (eigenes Bild)
const BAL_OBJ = [['DB', 2], ['DB', 5], ['DB', 8], ['DB', 10], ['🍉', 4], ['🎃', 3], ['🐈', 4], ['🐕', 8], ['🧱', 2.5], ['🎳', 6], ['🥁', 3],
  ['🎸', 3.5], ['💻', 2], ['📺', 7], ['🛹', 2], ['🚲', 12], ['🛴', 5], ['🍍', 1.5], ['🥥', 1], ['🎒', 3], ['🧳', 15], ['🧯', 6], ['🔨', 1],
  ['🎂', 2], ['🧀', 1.5], ['🥛', 1], ['🍾', 1.5], ['🧺', 2], ['🌵', 3], ['🦃', 7], ['🐓', 2.5], ['🐇', 2], ['🐢', 5], ['👶', 4], ['🏆', 3],
  ['📚', 2], ['⚓', 10], ['🔔', 5], ['📦', 4], ['💼', 2], ['🎁', 1.5], ['🎷', 2.5], ['🔭', 3], ['🍗', 1], ['🥔', 0.5], ['🍕', 0.8], ['☎️', 1.5]];
// Wie lange hält die Wippe? (gleiche Rechnung auf dem Host und auf jedem Handy)
function balHold(L, obj, x) {
  const want = L.kg * L.d, have = obj[1] * x, err = Math.abs(have - want) / want;
  if (err <= BAL_PERFECT) return { t: BAL_HOLD, perfect: true, dir: 0, err };
  return { t: Math.min(BAL_HOLD - 0.5, Math.round(1 / Math.sqrt(err) * 10) / 10), perfect: false, dir: have > want ? 1 : -1, err };
}
const LOGO_POINTS = [100, 80, 65, 50, 40, 30, 25, 20];
const EMOJIS = ['😆', '😂', '😍', '🔥', '👍', '😳', '😢', '👎'];
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
    codeNote: 'Der Code besteht nur aus lateinischen Buchstaben (A–Z) und Zahlen.', credits: 'Quellen der Töne', roundsPer: 'Runden pro Spiel', mixGames: 'Diese Spiele im Mix:', mixAll: 'alle / keins', mixSum: '{g} Spiele × {r} Runden = {n} Runden, gleiche Spiele direkt hintereinander', mixMin: 'Mindestens ein Spiel auswählen', reload: '🔄 Neu laden (neue Spiele holen)', newVer: '✨ Neue Version – wird geladen…', version: 'Version',
    makeChar: 'Deine Figur', random: '🎲 Zufall', done: 'Fertig', color: 'Farbe', eyes: 'Augen', mouth: 'Mund', hat: 'Kopf', extra: 'Extra', dance: 'Tanz',
    code: 'Party-Code', copy: 'Kopieren', copied: 'Kopiert!', share: 'Teilen', players: 'Spieler', rounds: 'Anzahl Runden',
    start: 'Party starten', needTwo: 'Mindestens 2 Spieler nötig', waitHost: 'Warte, bis der Host startet…',
    hostTip: 'Lass diese Seite offen – dein Gerät ist der Spiel-Server.', micTip: '🎤 Du brauchst ein Mikrofon. Am besten mit Kopfhörern spielen.',
    round: 'Runde {a}/{b}', listen: 'Hör gut zu!', yourTurn: 'Jetzt du! Mach den Ton nach.', tapRec: 'Aufnehmen', stop: 'Stopp',
    again: '🔁 Nochmal anhören', retry: '🎙️ Neu aufnehmen', playMine: '▶️ Meine Aufnahme', send: '✅ Abschicken', sent: 'Abgeschickt! Warte auf die anderen…',
    showTime: 'Wie gut war es?', noRec: 'Keine Aufnahme 😶', points: 'Punkte', results: 'Ergebnis', gameOver: 'Party vorbei!', playAgain: 'Nochmal spielen',
    leave: 'Party verlassen und zum Menü?', yes: 'Ja', no: 'Nein', hostLeft: 'Der Host hat die Party verlassen.', notFound: 'Party nicht gefunden. Code prüfen!',
    full: 'Die Party ist voll (max. 8).', connecting: 'Verbinde…', creating: 'Party wird erstellt…', netError: 'Verbindungsfehler – bitte nochmal versuchen.',
    enterName: 'Bitte gib einen Namen ein.', enterCode: 'Bitte gib den 5-stelligen Code ein.', micDenied: 'Kein Zugriff aufs Mikrofon – bitte erlauben.', micBlocked: 'Mikrofon ist blockiert. iPhone: „aA“ in der Adressleiste → Website-Einstellungen → Mikrofon → Erlauben, dann Seite neu laden.',
    voiceOn: 'Telefon an – ihr könnt reden', voiceOff: 'Telefon aus', joined: '{name} ist da!', left: '{name} ist gegangen', reconnecting: 'Verbindung weg – verbinde neu…',
    notEnough: 'Zu wenige Spieler – zurück zur Lobby.', you: 'du', creditsTitle: 'Quellen der Töne (Wikimedia Commons, freie Lizenzen)', close: 'Schließen',
    tooQuiet: 'Zu leise – nochmal lauter!', loading: 'Lade Ton…', category: 'Mach es nach!', listenHint: 'Hör gut zu – gleich seid ihr alle dran!', oneShot: 'Alle gleichzeitig – nur ein Versuch!', go: 'LOS!', recording: 'Jetzt nachmachen!', micBtn: '🎤 Mikrofon erlauben', wins: 'gewinnt!', startRec: 'Start', waitLine: 'Gleich… los, wenn der Strich die gelbe Linie erreicht!', soundBtn: '🔊 Ton aktivieren', soundOn: 'Ton ist an 🔊', autoIn: 'Startet automatisch in {n} s', mode: 'Spielmodus', modeSound: '🎤 Töne nachmachen', modeDraw: '🎨 Malen & bewerten', drawThis: 'Male:', drawDone: 'Fertig', drawSent: 'Abgeschickt! Warte auf die anderen…', eraser: 'Radierer', undo: 'Rückgängig', clear: 'Alles löschen', rateIt: 'Wie gut ist das Bild? Gib Sterne:', thanksVote: 'Danke für deine Bewertung!', othersRate: 'Die anderen bewerten gerade dein Bild…', votedCount: 'haben bewertet',
    modeGuess: '✏️ Malen & Raten', modeLogo: '🏷️ Logo-Quiz', chooseWord: 'Wähle ein Wort zum Malen:', choosing: '{name} wählt ein Wort…', drawsNow: '{name} malt – rate!', youDraw: 'Du malst:',
    guessPh: 'Dein Tipp…', guessedIt: '{name} hat es erraten! 🎉', youGuessed: 'Richtig! 🎉', almost: 'Fast! 🤏', guessedBtn: '✅ Erraten!', whoGuessed: 'Wer hat es erraten?', nobodyLeft: 'Alle haben es schon.', wordWas: 'Das Wort war:',
    logoQ: 'Welche Marke ist das?', logoPh: 'Tippe die ersten Buchstaben…', youPicked: 'Deine Wahl:', logoWas: 'Das war:', noPick: 'nichts gewählt', lobbyMode: 'Spielmodus:', loadingLogos: 'Lade Logos…',
    modeTimer: '⏱️ Stoppuhr', timerGoal: 'Stoppe genau bei', seconds: 'Sekunden', timerHint: 'Drück START und zähle im Kopf – danach siehst du nur noch den STOPP-Knopf!', startBtn: 'START', stopBtn: 'STOPP', stopped: 'Gestoppt! Warte auf die anderen…', target: 'Ziel', perfect: 'Perfekt!', notStopped: 'nicht gestoppt',
    modeHang: '🪢 Galgenmännchen', chooseHang: 'Wähle ein Wort zum Erraten:',
    modeEst: '🔢 Schätzen', modeMix: '🎲 Mix (Spiele aussuchen)', estPh: 'Deine Schätzung', estSend: 'Tipp abgeben', yourEst: 'Dein Tipp:', answer: 'Richtige Antwort', bullseye: 'Volltreffer!', noEst: 'kein Tipp', badNum: 'Bitte eine Zahl eingeben.', loadingQ: 'Lade Fragen…',
    nextGame: 'Nächstes Spiel', game: 'Spiel {a}/{b}', kickQ: '{name} aus der Party entfernen?', kicked: 'Du wurdest vom Host aus der Party entfernt. Du kannst wieder beitreten.', kickedOut: '{name} wurde entfernt',
    abortTitle: 'Was möchtest du tun?', skipRound: '⏭ Diese Runde abbrechen', endGame: '⏹ Spiel abbrechen (zur Lobby)', cancel: 'Abbrechen', pattern: 'Muster', feet: 'Schuhe', ownWord: 'oder eigenes Wort:', ownPh: 'Dein Wort…', badWord: 'Nur Buchstaben, 2–24 Zeichen.', hangChose: '{name} hat ein Wort ausgesucht', yourWord: 'Dein Wort:', yourLetter: 'Du bist dran – wähle einen Buchstaben!', letterTurn: '{name} wählt einen Buchstaben…', misses: 'Fehler', solved: 'Erraten! 🎉', notSolved: 'Nicht erraten – {name} gewinnt!', lettersFound: 'Buchstaben',
    modeReact: '⚡ Reaktion', reactWait: 'Warte auf Grün…', reactHint: 'Tippe so schnell du kannst, sobald es grün wird – aber nicht zu früh!', reactNow: 'JETZT!', tooEarly: 'Zu früh! 😅', yourTime: 'Deine Zeit:', noReact: 'nicht getippt', fast: 'Blitzschnell!',
    modeSimon: '🟢 Farbfolge', simonWatch: 'Merk dir die Folge!', simonYour: 'Jetzt du – tippe nach!', simonOut: 'Falsch! Du hast Level {n} geschafft. Schau zu, wer am längsten durchhält!', simonGood: 'Richtig! 🎉', level: 'Level', simonMax: 'Alles geschafft! 🏆', simonReady: 'Gleich geht’s los…', simonHint: 'Jedes Level wird die Folge länger. Ein Fehler – dann ist Schluss.', modeStack: '🗼 Turm stapeln', stackHint: 'Tippe, um den Block fallen zu lassen. Was übersteht, fällt ab – der Turm wird schmaler. Ganz daneben = raus!', stackOut: 'Daneben! {n} Blöcke geschafft. Schau zu, wer am höchsten baut!', stackPerfect: 'Perfekt! ✨', modeColor: '🎨 Farbe treffen', colMemo: 'Merk dir diese Farbe!', colMix: 'Misch die Farbe nach!', colH: 'Farbton', colS: 'Sättigung', colL: 'Helligkeit', colGo: '✅ Fertig', colDone: 'Abgegeben! Warte auf die anderen…', colWas: 'Die Farbe war:', colNone: 'nicht abgegeben', match: 'Treffer', modeCircle: '⭕ Perfekter Kreis', circHint: 'Mal einen Kreis in einem Zug – so rund wie möglich! {n} Versuche, der beste zählt.', circRound: '{p} % rund', circLeft: 'Noch {n} Versuche', circBest: 'Bester: {p} %', circSmall: 'Zu klein – mal größer!', circOpen: 'Nicht geschlossen – einmal ganz rum!', circNone: 'kein Kreis', modeBal: '⚖️ Wippe', balHint: 'Schieb den Gegenstand auf der rechten Seite so hin, dass die Wippe im Gleichgewicht bleibt – dann loslassen!', balGo: '✋ Loslassen!', balHolds: 'Hält: {s} s', balPerfect: 'Perfekt im Gleichgewicht! 🎯', balFell: 'Umgekippt nach {s} s', balNone: 'nicht losgelassen', balRight: 'richtige Stelle', modeHalve: '🔪 Halbieren', halveHint: 'Zieh einen geraden Schnitt durch – so genau wie möglich in zwei gleich große Hälften! Du kannst neu ziehen, bis du auf Schneiden tippst.', halveCut: '🔪 Schneiden!', halveMiss: 'Der Schnitt muss ganz durch gehen', halveDone: 'Geschnitten! Warte auf die anderen…', halveNone: 'nicht geschnitten', perfect: 'Perfekt!', modeCups: '🥤 Hütchenspiel', cupsWatch: 'Wo ist der Ball? Gut aufpassen!', cupsPick: 'Wo ist der Ball? Tippe auf einen Becher!', cupsRight: 'Richtig! 🎉 Jetzt wird’s schwerer…', cupsWrong: 'Daneben! Du hast Level {n} geschafft. Schau zu, wer am längsten durchhält!', cupsHint: 'Jedes Level: schneller, mehr Tauschen – und später mehr Becher.', hangGot: 'schon erraten', hangPend: 'noch offen', modeMemory: '🧠 Sequenz-Memory', memHint: 'Die Felder leuchten nacheinander auf – drück sie in derselben Reihenfolge. Jedes Level eins mehr!',
    modeEmoji: '😀 Emoji-Rätsel', emojiQ: 'Welches Wort ist das?', emojiPh: 'Dein Tipp…', guessBtn: 'Raten', nope: 'Leider falsch', letters: '{n} Zeichen', emojiWas: 'Die Lösung:', notGuessed: 'nicht erraten', youGotIt: 'Richtig! Warte auf die anderen…', emojiHint: 'Deutsch oder Amharisch – beides zählt!',
  },
  am: {
    namePh: 'ስምዎ', create: 'ፓርቲ ፍጠር', or: 'ወይም', join: 'ተቀላቀል', editChar: '🎨 ገጸ ባሕሪ ሥራ',
    codeNote: 'ኮዱ የላቲን ፊደላት (A–Z) እና ቁጥሮች ብቻ ነው።', credits: 'የድምፆቹ ምንጮች', roundsPer: 'ዙሮች በአንድ ጨዋታ', mixGames: 'በድብልቁ ውስጥ ያሉ ጨዋታዎች፦', mixAll: 'ሁሉም / አንድም', mixSum: '{g} ጨዋታዎች × {r} ዙሮች = {n} ዙሮች፣ ተመሳሳይ ጨዋታዎች በተከታታይ', mixMin: 'ቢያንስ አንድ ጨዋታ ይምረጡ', reload: '🔄 እንደገና ጫን (አዳዲስ ጨዋታዎች)', newVer: '✨ አዲስ ስሪት – በመጫን ላይ…', version: 'ስሪት',
    makeChar: 'የእርስዎ ገጸ ባሕሪ', random: '🎲 በዘፈቀደ', done: 'ጨርስ', color: 'ቀለም', eyes: 'ዓይኖች', mouth: 'አፍ', hat: 'ራስ', extra: 'ተጨማሪ', dance: 'ዳንስ',
    code: 'የፓርቲ ኮድ', copy: 'ቅዳ', copied: 'ተቀድቷል!', share: 'አጋራ', players: 'ተጫዋቾች', rounds: 'የዙሮች ብዛት',
    start: 'ፓርቲ ጀምር', needTwo: 'ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ', waitHost: 'አስተናጋጁ እስኪጀምር ይጠብቁ…',
    hostTip: 'ይህን ገጽ ክፍት ይተዉት – መሣሪያዎ የጨዋታው አገልጋይ ነው።', micTip: '🎤 ማይክሮፎን ያስፈልጋል። በጆሮ ማዳመጫ ቢጫወቱ ይሻላል።',
    round: 'ዙር {a}/{b}', listen: 'በደንብ ያዳምጡ!', yourTurn: 'አሁን እርስዎ! ድምፁን ይድገሙ።', tapRec: 'ቅዳ', stop: 'አቁም',
    again: '🔁 እንደገና ያዳምጡ', retry: '🎙️ እንደገና ቅዳ', playMine: '▶️ የእኔ ቅጂ', send: '✅ ላክ', sent: 'ተልኳል! ሌሎችን ይጠብቁ…',
    showTime: 'ምን ያህል ጥሩ ነበር?', noRec: 'ቅጂ የለም 😶', points: 'ነጥብ', results: 'ውጤት', gameOver: 'ፓርቲው አበቃ!', playAgain: 'እንደገና ተጫወት',
    leave: 'ፓርቲውን ትተው ወደ ዋና ማውጫ ይመለሱ?', yes: 'አዎ', no: 'አይ', hostLeft: 'አስተናጋጁ ፓርቲውን ለቋል።', notFound: 'ፓርቲው አልተገኘም። ኮዱን ያረጋግጡ!',
    full: 'ፓርቲው ሞልቷል (ከፍተኛ 8)።', connecting: 'በማገናኘት ላይ…', creating: 'ፓርቲ በመፍጠር ላይ…', netError: 'የግንኙነት ስህተት – እንደገና ይሞክሩ።',
    enterName: 'እባክዎ ስም ያስገቡ።', enterCode: 'እባክዎ ባለ 5 ፊደል ኮዱን ያስገቡ።', micDenied: 'ማይክሮፎን አልተፈቀደም – እባክዎ ይፍቀዱ።', micBlocked: 'ማይክሮፎኑ ታግዷል። iPhone፦ በአድራሻ መስመሩ „aA“ → የድር ጣቢያ ቅንብሮች → ማይክሮፎን → ፍቀድ፣ ከዚያ ገጹን እንደገና ይጫኑ።',
    voiceOn: 'ስልኩ በርቷል – መነጋገር ትችላላችሁ', voiceOff: 'ስልኩ ጠፍቷል', joined: '{name} መጣ!', left: '{name} ወጣ', reconnecting: 'ግንኙነቱ ተቋርጧል – እንደገና በማገናኘት ላይ…',
    notEnough: 'ተጫዋቾች በቂ አይደሉም – ወደ ሎቢ።', you: 'እርስዎ', creditsTitle: 'የድምፆቹ ምንጮች (Wikimedia Commons፣ ነፃ ፈቃድ)', close: 'ዝጋ',
    tooQuiet: 'በጣም ዝቅ ያለ ነው – እንደገና ጮክ ብለው!', loading: 'ድምፁ እየተጫነ ነው…', category: 'ይድገሙት!', listenHint: 'በደንብ ያዳምጡ – በቅርቡ ሁላችሁም ተራ ይደርሳችኋል!', oneShot: 'ሁሉም በአንድ ጊዜ – አንድ ሙከራ ብቻ!', go: 'ጀምር!', recording: 'አሁን ይድገሙ!', micBtn: '🎤 ማይክሮፎን ይፍቀዱ', wins: 'አሸነፈ!', startRec: 'ጀምር', waitLine: 'ቆይ… መስመሩ ቢጫውን መስመር ሲደርስ ይጀምሩ!', soundBtn: '🔊 ድምፅ አብራ', soundOn: 'ድምፁ በርቷል 🔊', autoIn: 'በ{n} ሰከንድ ውስጥ በራሱ ይጀምራል', mode: 'የጨዋታ ዓይነት', modeSound: '🎤 ድምፅ መድገም', modeDraw: '🎨 መሳልና መገምገም', drawThis: 'ይሳሉ፦', drawDone: 'ጨርሻለሁ', drawSent: 'ተልኳል! ሌሎችን ይጠብቁ…', eraser: 'ማጥፊያ', undo: 'መልስ', clear: 'ሁሉንም አጥፋ', rateIt: 'ሥዕሉ ምን ያህል ጥሩ ነው? ኮከብ ይስጡ፦', thanksVote: 'ስለ ግምገማዎ እናመሰግናለን!', othersRate: 'ሌሎች ሥዕልዎን እየገመገሙ ነው…', votedCount: 'ገምግመዋል',
    modeGuess: '✏️ መሳልና መገመት', modeLogo: '🏷️ የአርማ ጥያቄ', chooseWord: 'የሚስሉትን ቃል ይምረጡ፦', choosing: '{name} ቃል እየመረጠ ነው…', drawsNow: '{name} እየሳለ ነው – ይገምቱ!', youDraw: 'እርስዎ ይሳሉ፦',
    guessPh: 'ግምትዎ…', guessedIt: '{name} ገመተው! 🎉', youGuessed: 'ትክክል! 🎉', almost: 'ተቃርበዋል! 🤏', guessedBtn: '✅ ተገመተ!', whoGuessed: 'ማን ገመተው?', nobodyLeft: 'ሁሉም ገምተዋል።', wordWas: 'ቃሉ፦',
    logoQ: 'ይህ የየትኛው ብራንድ ነው?', logoPh: 'የመጀመሪያ ፊደላትን ይጻፉ…', youPicked: 'ምርጫዎ፦', logoWas: 'ይህ ነበር፦', noPick: 'ምንም አልተመረጠም', lobbyMode: 'የጨዋታ ዓይነት፦', loadingLogos: 'አርማዎች እየተጫኑ ነው…',
    modeTimer: '⏱️ የሰዓት ቆጣሪ', timerGoal: 'በትክክል ያቁሙ በ', seconds: 'ሰከንድ', timerHint: 'ጀምርን ይጫኑና በአእምሮዎ ይቁጠሩ – ከዚያ የማቆሚያ ቁልፉን ብቻ ያያሉ!', startBtn: 'ጀምር', stopBtn: 'አቁም', stopped: 'ቆሟል! ሌሎችን ይጠብቁ…', target: 'ዒላማ', perfect: 'ፍጹም!', notStopped: 'አላቆመም',
    modeHang: '🪢 የገመድ ሰው', chooseHang: 'የሚገመት ቃል ይምረጡ፦',
    modeEst: '🔢 ግምት', modeMix: '🎲 ድብልቅ (ጨዋታዎችን ይምረጡ)', estPh: 'ግምትዎ', estSend: 'ግምት ላክ', yourEst: 'ግምትዎ፦', answer: 'ትክክለኛው መልስ', bullseye: 'በትክክል!', noEst: 'ግምት የለም', badNum: 'እባክዎ ቁጥር ያስገቡ።', loadingQ: 'ጥያቄዎች እየተጫኑ ነው…',
    nextGame: 'ቀጣዩ ጨዋታ', game: 'ጨዋታ {a}/{b}', kickQ: '{name}ን ከፓርቲው ይወገድ?', kicked: 'አስተናጋጁ ከፓርቲው አስወጥቶዎታል። እንደገና መቀላቀል ይችላሉ።', kickedOut: '{name} ተወግዷል',
    abortTitle: 'ምን ማድረግ ይፈልጋሉ?', skipRound: '⏭ ይህን ዙር አቋርጥ', endGame: '⏹ ጨዋታውን አቋርጥ (ወደ ሎቢ)', cancel: 'ሰርዝ', pattern: 'ንድፍ', feet: 'ጫማ', ownWord: 'ወይም የራስዎ ቃል፦', ownPh: 'ቃልዎ…', badWord: 'ፊደላት ብቻ፣ 2–24።', hangChose: '{name} ቃል መርጧል', yourWord: 'ቃልዎ፦', yourLetter: 'ተራዎ ነው – ፊደል ይምረጡ!', letterTurn: '{name} ፊደል እየመረጠ ነው…', misses: 'ስህተት', solved: 'ተገመተ! 🎉', notSolved: 'አልተገመተም – {name} አሸነፈ!', lettersFound: 'ፊደላት',
    modeReact: '⚡ የምላሽ ፍጥነት', reactWait: 'አረንጓዴ እስኪሆን ይጠብቁ…', reactHint: 'አረንጓዴ ሲሆን በተቻለ ፍጥነት ይንኩ – ግን ቀድመው አይንኩ!', reactNow: 'አሁን!', tooEarly: 'በጣም ቀደሙ! 😅', yourTime: 'ጊዜዎ፦', noReact: 'አልነኩም', fast: 'በጣም ፈጣን!',
    modeSimon: '🟢 የቀለም ቅደም ተከተል', simonWatch: 'ቅደም ተከተሉን ያስታውሱ!', simonYour: 'አሁን እርስዎ – ይድገሙት!', simonOut: 'ተሳስተዋል! ደረጃ {n} ደርሰዋል። ማን በረጅሙ እንደሚቆይ ይመልከቱ!', simonGood: 'ትክክል! 🎉', level: 'ደረጃ', simonMax: 'ሁሉንም ጨረሱ! 🏆', simonReady: 'በቅርቡ ይጀምራል…', simonHint: 'በእያንዳንዱ ደረጃ ቅደም ተከተሉ ይረዝማል። አንድ ስህተት – ያበቃል።', modeStack: '🗼 ማማ መደርደር', stackHint: 'ብሎኩን ለመጣል ይንኩ። የተረፈው ይወድቃል – ማማው ይጠብባል። ሙሉ በሙሉ ካመለጠ = ውጭ!', stackOut: 'አመለጠ! {n} ብሎኮች ደርሰዋል። ማን ከፍ እንደሚገነባ ይመልከቱ!', stackPerfect: 'ፍጹም! ✨', modeColor: '🎨 ቀለም ማግኘት', colMemo: 'ይህን ቀለም ያስታውሱ!', colMix: 'ቀለሙን ቀላቅለው ይስሩ!', colH: 'የቀለም ዓይነት', colS: 'ጥልቀት', colL: 'ብርሃን', colGo: '✅ ጨርስ', colDone: 'ተልኳል! ሌሎችን ይጠብቁ…', colWas: 'ቀለሙ ይህ ነበር፦', colNone: 'አልላኩም', match: 'ተመሳሳይነት', modeCircle: '⭕ ፍጹም ክብ', circHint: 'በአንድ ጊዜ ክብ ይሳሉ – በተቻለ መጠን ክብ! {n} ሙከራዎች፣ ምርጡ ይቆጠራል።', circRound: '{p} % ክብ', circLeft: 'ገና {n} ሙከራዎች', circBest: 'ምርጥ፦ {p} %', circSmall: 'በጣም ትንሽ – ትልቅ ይሳሉ!', circOpen: 'አልተዘጋም – ሙሉ ዙር ይሳሉ!', circNone: 'ክብ የለም', modeBal: '⚖️ ሚዛን', balHint: 'ሚዛኑ እንዲጠበቅ ዕቃውን በቀኝ በኩል ያንቀሳቅሱ – ከዚያ ይልቀቁ!', balGo: '✋ ልቀቅ!', balHolds: 'ቆይቷል፦ {s} ሰ', balPerfect: 'ፍጹም ሚዛን! 🎯', balFell: 'ከ{s} ሰ በኋላ ወደቀ', balNone: 'አልለቀቁም', balRight: 'ትክክለኛው ቦታ', modeHalve: '🔪 ለሁለት መክፈል', halveHint: 'ቀጥ ያለ መስመር ይሳሉ – በተቻለ መጠን በሁለት እኩል ግማሽ! ቁረጥ እስኪነኩ ድረስ እንደገና መሳል ይችላሉ።', halveCut: '🔪 ቁረጥ!', halveMiss: 'መስመሩ ሙሉ በሙሉ ማቋረጥ አለበት', halveDone: 'ተቆርጧል! ሌሎችን ይጠብቁ…', halveNone: 'አልቆረጡም', perfect: 'ፍጹም!', modeCups: '🥤 የኩባያ ጨዋታ', cupsWatch: 'ኳሱ የት ነው? በደንብ ይከታተሉ!', cupsPick: 'ኳሱ የት ነው? አንድ ኩባያ ይንኩ!', cupsRight: 'ትክክል! 🎉 አሁን ይከብዳል…', cupsWrong: 'ተሳስተዋል! ደረጃ {n} ደርሰዋል። ማን በረጅሙ እንደሚቆይ ይመልከቱ!', cupsHint: 'በየደረጃው፦ ፍጥነቱ እና መለዋወጡ ይጨምራሉ – በኋላም ኩባያዎቹ ይበዛሉ።', hangGot: 'ተገምቷል', hangPend: 'ገና አልተገመተም', modeMemory: '🧠 የቅደም ተከተል ማስታወሻ', memHint: 'ሳጥኖቹ አንድ በአንድ ይበራሉ – በዚያው ቅደም ተከተል ይጫኑ። በየደረጃው አንድ ይጨመራል!',
    modeEmoji: '😀 የኢሞጂ እንቆቅልሽ', emojiQ: 'ይህ የትኛው ቃል ነው?', emojiPh: 'ግምትዎ…', guessBtn: 'ገምት', nope: 'አልሆነም', letters: '{n} ፊደላት', emojiWas: 'መልሱ፦', notGuessed: 'አልገመቱም', youGotIt: 'ትክክል! ሌሎችን ይጠብቁ…', emojiHint: 'በአማርኛም በጀርመንኛም መመለስ ይቻላል!',
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
  color: ['#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#54a0ff', '#5f27cd', '#ff9ff3', '#c8d6e5', '#8d6e63', '#576574', '#10ac84', '#e84393', '#00cec9', '#fdcb6e', '#6c5ce7', '#b33939', '#218c74', '#f5f6fa', '#2d3436'],
  eyes: ['rund', 'froh', 'muede', 'stern', 'brille', 'herz', 'zwinkern', 'gross', 'schlaf', 'alien', 'schielen'],
  mouth: ['laecheln', 'grinsen', 'oh', 'zunge', 'zaehne', 'kuss', 'schnurrbart', 'bart', 'schief'],
  hat: ['keiner', 'kappe', 'krone', 'zylinder', 'blume', 'muetze', 'kopfhoerer', 'haare', 'cowboy', 'party', 'hase', 'katze', 'einhorn', 'zopf', 'koch', 'heiligenschein', 'antenne', 'afro'],
  extra: ['keins', 'fliege', 'schal', 'kette', 'krawatte', 'umhang', 'rucksack', 'funkeln', 'herzchen'],
  pattern: ['keins', 'punkte', 'streifen', 'bauch', 'sterne', 'flecken'],
  feet: ['dunkel', 'rot', 'weiss', 'gold', 'blau'],
  dance: ['huepfen', 'wackeln', 'drehen', 'roboter', 'disco', 'jubeln', 'schaukeln', 'kreisel', 'zappeln'],
};
const OPT_ICON = {
  eyes: { rund: '👀', froh: '😊', muede: '😪', stern: '🤩', brille: '😎', herz: '😍', zwinkern: '😉', gross: '🥺', schlaf: '😴', alien: '👁️', schielen: '🤪' },
  mouth: { laecheln: '🙂', grinsen: '😁', oh: '😮', zunge: '😛', zaehne: '😬', kuss: '😗', schnurrbart: '🥸', bart: '🧔', schief: '😏' },
  hat: { keiner: '—', kappe: '🧢', krone: '👑', zylinder: '🎩', blume: '🌸', muetze: '🧶', kopfhoerer: '🎧', haare: '💇', cowboy: '🤠', party: '🥳', hase: '🐰', katze: '🐱', einhorn: '🦄', zopf: '👧', koch: '👨‍🍳', heiligenschein: '😇', antenne: '👽', afro: '🧑🏾‍🦱' },
  extra: { keins: '—', fliege: '🎀', schal: '🧣', kette: '📿', krawatte: '👔', umhang: '🦸', rucksack: '🎒', funkeln: '✨', herzchen: '💕' },
  pattern: { keins: '—', punkte: '⚪', streifen: '🦓', bauch: '🥚', sterne: '⭐', flecken: '🐄' },
  feet: { dunkel: '⚫', rot: '🔴', weiss: '⚪', gold: '🟡', blau: '🔵' },
  dance: { huepfen: '🦘', wackeln: '〰️', drehen: '🌀', roboter: '🤖', disco: '🕺', jubeln: '🙌', schaukeln: '🌊', kreisel: '🌪️', zappeln: '⚡' },
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
    zwinkern: '<circle cx="47" cy="72" r="7" fill="#fff"/><circle cx="48" cy="73" r="3.5" fill="#222"/><path d="M66 74 q7 -7 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    gross: '<circle cx="46" cy="70" r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><circle cx="74" cy="70" r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><circle cx="47" cy="72" r="6" fill="#222"/><circle cx="75" cy="72" r="6" fill="#222"/><circle cx="49" cy="69" r="2" fill="#fff"/><circle cx="77" cy="69" r="2" fill="#fff"/>',
    schlaf: '<path d="M40 71 q7 7 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M66 71 q7 7 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/><text x="84" y="56" font-size="13" font-weight="900" fill="#222" font-family="sans-serif">z</text><text x="92" y="46" font-size="10" font-weight="900" fill="#222" font-family="sans-serif">z</text>',
    alien: '<circle cx="60" cy="70" r="14" fill="#fff" stroke="#222" stroke-width="2"/><circle cx="61" cy="72" r="7" fill="#222"/><circle cx="64" cy="68" r="2.5" fill="#fff"/>',
    schielen: '<circle cx="47" cy="72" r="8" fill="#fff"/><circle cx="73" cy="72" r="8" fill="#fff"/><circle cx="51" cy="73" r="3.5" fill="#222"/><circle cx="69" cy="73" r="3.5" fill="#222"/>',
  }[c.eyes];
  const mouth = {
    laecheln: '<path d="M50 92 q10 10 20 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    grinsen: '<path d="M46 90 q14 16 28 0 z" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/><path d="M50 91 h20" stroke="#fff" stroke-width="3"/>',
    oh: '<ellipse cx="60" cy="96" rx="6" ry="8" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/>',
    zunge: '<path d="M48 91 q12 12 24 0 z" fill="#5a1a1a" stroke="#222" stroke-width="2.5"/><path d="M56 97 q4 9 8 0 z" fill="#ff7aa2"/>',
    zaehne: '<rect x="47" y="89" width="26" height="12" rx="5" fill="#fff" stroke="#222" stroke-width="2.5"/><path d="M53.5 89 v12 M60 89 v12 M66.5 89 v12 M47 95 h26" stroke="#222" stroke-width="1.3"/>',
    kuss: '<path d="M60 99 l-6 -5 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4z" fill="#e84393" stroke="#222" stroke-width="1.5"/>',
    schnurrbart: '<path d="M50 95 q10 8 20 0" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M60 88 q-8 -7 -19 1 q9 4 19 0 q10 4 19 0 q-11 -8 -19 -1z" fill="#3e2723"/>',
    bart: '<path d="M34 90 q26 46 52 0 q-8 8 -26 8 q-18 0 -26 -8z" fill="#5d4037"/><path d="M52 92 q8 6 16 0" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>',
    schief: '<path d="M49 97 q12 3 22 -7" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
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
    cowboy: '<path d="M40 44 q2 -26 20 -24 q18 -2 20 24z" fill="#a0693a"/><rect x="40" y="37" width="40" height="5" fill="#5d3a1a"/><path d="M18 42 q42 14 84 0 q-4 10 -42 11 q-38 -1 -42 -11z" fill="#8d5a2b"/>',
    party: '<path d="M47 40 l13 -36 l13 36z" fill="#ff6b6b"/><path d="M52 30 h16 M50 36 h20 M55 22 h10" stroke="#feca57" stroke-width="3"/><circle cx="60" cy="4" r="5" fill="#48dbfb"/>',
    hase: '<ellipse cx="46" cy="14" rx="8" ry="20" fill="#fff" stroke="#ddd" stroke-width="2"/><ellipse cx="46" cy="16" rx="4" ry="13" fill="#ffb6c9"/><ellipse cx="74" cy="14" rx="8" ry="20" fill="#fff" stroke="#ddd" stroke-width="2"/><ellipse cx="74" cy="16" rx="4" ry="13" fill="#ffb6c9"/>',
    katze: `<path d="M30 50 l6 -30 l18 16z" fill="${col}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/><path d="M90 50 l-6 -30 l-18 16z" fill="${col}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/><path d="M36 42 l3 -14 l8 8z M84 42 l-3 -14 l-8 8z" fill="#ffb6c9"/>`,
    einhorn: '<path d="M53 36 l7 -34 l7 34z" fill="#ffd6f5" stroke="#d980c4" stroke-width="2" stroke-linejoin="round"/><path d="M55 28 l10 -3 M56.5 19 l7 -2 M58 11 l4 -1" stroke="#d980c4" stroke-width="2"/>',
    zopf: '<path d="M90 42 q24 12 12 44 q-4 -18 -16 -30z" fill="#f4a261"/><path d="M27 58 q2 -32 33 -32 q31 0 33 32 q-14 -18 -33 -18 q-19 0 -33 18z" fill="#f4a261"/><circle cx="92" cy="42" r="5" fill="#e63946"/>',
    koch: '<circle cx="46" cy="20" r="11" fill="#fff" stroke="#ddd" stroke-width="2"/><circle cx="74" cy="20" r="11" fill="#fff" stroke="#ddd" stroke-width="2"/><circle cx="60" cy="13" r="13" fill="#fff" stroke="#ddd" stroke-width="2"/><rect x="42" y="24" width="36" height="16" rx="2" fill="#fff" stroke="#ddd" stroke-width="2"/>',
    heiligenschein: '<ellipse cx="60" cy="16" rx="22" ry="6" fill="none" stroke="#ffd600" stroke-width="5"/>',
    antenne: '<path d="M50 34 q-4 -14 -12 -22 M70 34 q4 -14 12 -22" stroke="#222" stroke-width="3" fill="none"/><circle cx="38" cy="12" r="5" fill="#1dd1a1"/><circle cx="82" cy="12" r="5" fill="#1dd1a1"/>',
    afro: '<g fill="#2d1b10"><circle cx="38" cy="40" r="16"/><circle cx="60" cy="28" r="19"/><circle cx="82" cy="40" r="16"/><circle cx="28" cy="56" r="10"/><circle cx="92" cy="56" r="10"/></g>',
  }[c.hat];
  const extra = {
    keins: '',
    fliege: '<path d="M60 116 l-12 -7 v14 z M60 116 l12 -7 v14 z" fill="#e53935"/><circle cx="60" cy="116" r="3.5" fill="#b71c1c"/>',
    schal: '<path d="M30 110 q30 12 60 0 v9 q-30 12 -60 0 z" fill="#1dd1a1"/><rect x="70" y="114" width="10" height="22" rx="3" fill="#10ac84"/>',
    kette: '<path d="M34 108 q26 20 52 0" stroke="#ffd600" stroke-width="3" fill="none"/><circle cx="60" cy="118" r="5" fill="#ffd600" stroke="#c79a00"/>',
    krawatte: '<path d="M55 108 h10 l-2.5 5 l5 22 l-7.5 8 l-7.5 -8 l5 -22z" fill="#2e86de" stroke="#1b4f8a" stroke-width="1.5"/>',
    umhang: '<path d="M36 104 q24 10 48 0" stroke="#b71c1c" stroke-width="5" fill="none" stroke-linecap="round"/>',
    rucksack: '<path d="M38 94 q-2 22 4 42 M82 94 q2 22 -4 42" stroke="#6d4c41" stroke-width="5" fill="none" stroke-linecap="round"/>',
    funkeln: '<g fill="#ffd600"><path d="M12 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path d="M106 28 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/><path d="M108 74 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"/></g>',
    herzchen: '<path d="M102 42 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4z" fill="#ff2e63"/><path d="M16 56 l-5 -5 a3 3 0 0 1 5 -3.5 a3 3 0 0 1 5 3.5z" fill="#ff7aa2"/><path d="M110 64 l-4 -4 a2.5 2.5 0 0 1 4 -3 a2.5 2.5 0 0 1 4 3z" fill="#ff7aa2"/>',
  }[c.extra];
  const back = { umhang: '<path d="M30 90 q-16 42 -8 60 q38 6 76 0 q8 -18 -8 -60z" fill="#e53935"/>', rucksack: '<rect x="84" y="86" width="24" height="44" rx="8" fill="#8d6e63" stroke="#5d4037" stroke-width="2"/>' }[c.extra] || '';
  const pattern = {
    keins: '', punkte: '<g fill="#fff" opacity=".38"><circle cx="40" cy="110" r="6"/><circle cx="62" cy="122" r="5"/><circle cx="80" cy="104" r="6"/><circle cx="50" cy="134" r="4"/><circle cx="76" cy="132" r="4"/><circle cx="34" cy="96" r="3"/></g>',
    streifen: `<g fill="${dark}" opacity=".4"><rect x="25" y="103" width="70" height="7" rx="3"/><rect x="29" y="117" width="62" height="7" rx="3"/><rect x="38" y="131" width="44" height="6" rx="3"/></g>`,
    bauch: '<ellipse cx="60" cy="120" rx="22" ry="19" fill="#fff" opacity=".45"/>',
    sterne: '<g fill="#fff" opacity=".55"><path d="M42 106 l2 4.5 5 .7 -3.6 3.4 .9 5 -4.3 -2.4 -4.3 2.4 .9 -5 -3.6 -3.4 5 -.7z"/><path d="M72 122 l2 4.5 5 .7 -3.6 3.4 .9 5 -4.3 -2.4 -4.3 2.4 .9 -5 -3.6 -3.4 5 -.7z"/><path d="M80 98 l1.5 3.5 4 .5 -3 2.6 .7 4 -3.2 -1.9 -3.2 1.9 .7 -4 -3 -2.6 4 -.5z"/></g>',
    flecken: `<g fill="${dark}" opacity=".45"><ellipse cx="40" cy="110" rx="9" ry="6"/><ellipse cx="74" cy="124" rx="10" ry="7"/><ellipse cx="55" cy="137" rx="6" ry="4"/><ellipse cx="82" cy="100" rx="5" ry="4"/></g>`,
  }[c.pattern];
  const foot = { dunkel: dark, rot: '#e53935', weiss: '#f5f5f5', gold: '#ffc107', blau: '#1e88e5' }[c.feet];
  return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="154" rx="34" ry="5" fill="rgba(0,0,0,.15)"/>
    ${back}<ellipse cx="45" cy="146" rx="13" ry="7" fill="${foot}" stroke="${shade(foot, 0.7)}" stroke-width="1.5"/><ellipse cx="75" cy="146" rx="13" ry="7" fill="${foot}" stroke="${shade(foot, 0.7)}" stroke-width="1.5"/>
    <g class="arm-l"><path d="M32 86 q-16 10 -18 26" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="14" cy="113" r="6" fill="${col}"/></g>
    <g class="arm-r"><path d="M88 86 q16 10 18 26" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="106" cy="113" r="6" fill="${col}"/></g>
    <path d="M60 32 C 94 32 100 70 98 100 C 96 132 82 146 60 146 C 38 146 24 132 22 100 C 20 70 26 32 60 32 Z" fill="${col}" stroke="${dark}" stroke-width="3"/>
    ${pattern}<ellipse cx="44" cy="52" rx="9" ry="6" fill="#fff" opacity=".35"/>
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
// Ton sicher einschalten: AudioContext fortsetzen und einen stillen Ton abspielen (schaltet die Wiedergabe frei).
// Wichtig: KEIN Umschalten der iPhone-Audio-Sitzung – das würde das Mikrofon blockieren.
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAAGQAACuoAGhoaIyMjIy0tLS02NjY2QEBAQEpKSkpTU1NTXV1dXWZmZmZwcHBweXl5eYODg4ONjY2NlpaWlqCgoKCpqamps7Ozs729vb3GxsbG0NDQ0NnZ2dnj4+Pj7Ozs7Pb29vb/////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCUgAAAAAAAArqJwTg6QAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
let unlockEl = null;
function unlockAudio() {
  const ctx = ac();
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); } catch (e) {}
  try { if (!unlockEl) { unlockEl = new Audio(SILENT_MP3); unlockEl.loop = false; unlockEl.volume = 0.01; unlockEl.setAttribute('playsinline', ''); } unlockEl.play().catch(() => {}); } catch (e) {}
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
function playBuffer(buf, onLevel, when) {
  stopPlay();
  return new Promise((resolve) => {
    const ctx = ac(), src = ctx.createBufferSource(), an = ctx.createAnalyser();
    an.fftSize = 512; src.buffer = buf; src.connect(an); an.connect(ctx.destination);
    const data = new Uint8Array(an.fftSize); let raf = 0, finished = false;
    const loop = () => { an.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128)); onLevel && onLevel(m / 128); raf = requestAnimationFrame(loop); };
    const done = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); onLevel && onLevel(0); resolve(); };
    playing = { src, done };
    src.onended = () => { if (playing && playing.src === src) playing = null; done(); };
    src.start(when || 0); if (onLevel) loop();
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
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
  } catch (e) {
    if (e && e.name === 'NotAllowedError') { toast(t('micBlocked')); throw e; }
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); // zweiter Versuch mit einfachen Einstellungen
  }
  return micStream;
}
// Aufnahme mit Pegelanzeige; liefert Float32-Daten in ctx.sampleRate
function recordFor(maxSec, onLevel) {
  let stopFn;
  const promise = (async () => {
    const stream = await getMic(), ctx = ac();
    const srcNode = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(1024, 1, 1), mute = ctx.createGain();
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
        let m = 0; for (let i = 0; i < c.length; i += 8) m = Math.max(m, Math.abs(c[i])); onLevel && onLevel(m, len / ctx.sampleRate, c.length / ctx.sampleRate);
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
  view.reset(); renderVoiceHeads(null);
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
    if (msg.t === 'kicked') { gone('kicked'); return; }
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
  drawer: null, turn: 0, turnOrder: [], turnIdx: 0, choices: [], live: [], livePts: 0, guessed: new Map(), logoIdx: -1, picks: new Map(), target: 0, stops: new Map(), ests: new Map(), qIdx: -1, usedQ: new Set(), mix: false, baseMode: 'sound', mixList: [], mixIdx: -1, mixDrawn: {}, hWord: '', hLang: 'de', hGuessed: new Set(), hMiss: 0, hOrder: [], hIdx: 0, hCount: {}, hSolved: false,
  reacts: new Map(), reactWait: 0, reactGoAt: 0, simonSeq: [], simon: new Map(), emojiIdx: -1, eWord: -1, egot: new Map(), eStart: 0, usedE: new Set(), eHint: 0, eTimers: [], cols: new Map(), colT: null, circs: new Map(), bals: new Map(), balL: null, balObj: null, usedB: new Set(), cuts: new Map(), halveIdx: 0, halveRot: 0, usedH: new Set(),
  init(me) { this.players = []; this.phase = 'lobby'; this.departed = new Map(); this.add(me.id, me, CLIENT_ID); this.pushState(); },
  stop() { clearTimeout(this.timer); this.timer = null; this.eTimers.forEach(clearTimeout); this.eTimers = []; },
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
      case 'start':
        if (p.host && this.phase === 'lobby' && this.players.length >= 2) {
          this.rounds = clamp(+msg.rounds || 5, 1, 30); this.baseMode = this.mode = MODES.includes(msg.mode) ? msg.mode : 'sound';
          this.mixGames = Array.isArray(msg.games) ? GAME_MODES.filter((m) => msg.games.includes(m)) : [...GAME_MODES];
          if (!this.mixGames.length) this.mixGames = [...GAME_MODES];
          const need = [];
          const mixHas = (m) => this.mode === 'mix' && this.mixGames.includes(m);
          if (this.mode === 'logo' || mixHas('logo')) need.push(ensureLogos());
          if (this.mode === 'estimate' || mixHas('estimate')) need.push(ensureQuestions());
          Promise.all(need).then(() => { if (this.phase === 'lobby') this.startGame(); }).catch(() => toast(t('netError')));
        } return;
      case 'mode': if (p.host && this.phase === 'lobby' && MODES.includes(msg.mode)) { this.baseMode = this.mode = msg.mode; this.pushState(); } return;
      case 'skip': if (p.host) this.skip(); return;
      case 'kick': {
        const v = this.get(msg.pid); if (!p.host || !v || v.host) return;
        sendTo(v.id, { t: 'kicked' }); const c = net.conns.get(v.id);
        this.removePlayer(v.id); setTimeout(() => { try { c && c.close(); } catch (e) {} }, 500);
        return;
      }
      case 'est': {
        if (this.phase !== 'estimate' || msg.round !== this.round || this.ests.has(from)) return;
        const v = +msg.v; if (!isFinite(v) || v < 0) return;
        this.ests.set(from, Math.min(v, 1e13)); this.pushState();
        if (this.players.every((x) => this.ests.has(x.id))) this.endEstimate();
        return;
      }
      case 'emo': {
        const now = Date.now(); if (now - (p.lastEmo || 0) < 180) return; p.lastEmo = now;
        if (EMOJIS[msg.e | 0]) broadcast({ t: 'emo', e: msg.e | 0, pid: from }); return;
      }
      case 'choose':
        if (this.phase !== 'choose' || from !== this.drawer) return;
        if (this.mode === 'hang' && msg.own) { const w = cleanHangWord(msg.own, p.lang); if (w) this.startHang(w, p.lang); return; }
        if (this.choices.includes(msg.w)) this.chooseWord(msg.w); return;
      case 'letter': {
        if (this.phase !== 'hang' || from !== this.hCur()) return;
        const k = String(msg.k || ''); if (this.hGuessed.has(k) || !(this.hLang === 'am' ? KEYS_AM : KEYS_DE).includes(k)) return;
        this.hGuessed.add(k);
        const hits = [...this.hWord].filter((c) => hangKey(c) === k).length;
        if (hits) this.hCount[from] = (this.hCount[from] || 0) + hits; else this.hMiss++;
        if ([...this.hWord].every((c) => !hangKey(c) || this.hGuessed.has(hangKey(c)))) { this.endHang(true); return; }
        if (this.hMiss >= HANG_MAX) { this.endHang(false); return; }
        this.hNext(); return;
      }
      case 'ops': {
        if (this.phase !== 'guess' || from !== this.drawer || msg.turn !== this.turn || !Array.isArray(msg.ops)) return;
        const ops = msg.ops.slice(0, 200).map(cleanOp).filter(Boolean);
        for (const o of ops) { this.livePts += o.p ? o.p.length : 0; if (this.livePts > 60000) return; applyOp(this.live, o); }
        broadcast({ t: 'ops', turn: this.turn, ops }, from); return;
      }
      case 'guess': {
        if (this.phase !== 'guess' || from === this.drawer || this.guessed.has(from)) return;
        const text = String(msg.text || '').trim().slice(0, 40); if (!text) return;
        const res = checkGuess(text, this.wordIdx);
        if (res === 2) { this.award(from); return; }
        broadcast({ t: 'chat', pid: from, name: p.name, text });
        if (res === 1) sendTo(from, { t: 'sys', key: 'almost' });
        return;
      }
      case 'mark': if (this.phase === 'guess' && from === this.drawer && msg.pid !== from && this.get(msg.pid) && !this.guessed.has(msg.pid)) this.award(msg.pid); return;
      case 'stop': {
        if (this.phase !== 'timer' || msg.round !== this.round || this.stops.has(from)) return;
        this.stops.set(from, clamp(Math.round(+msg.ms || 0), 0, 120000)); this.pushState();
        if (this.players.every((x) => this.stops.has(x.id))) this.endTimer();
        return;
      }
      case 'pick': {
        if (this.phase !== 'logo' || msg.round !== this.round || this.picks.has(from) || !window.LOGOS) return;
        const name = String(msg.name || '').slice(0, 60);
        this.picks.set(from, { name, ok: normB(name) === normB(LOGOS[this.logoIdx][0]), at: Date.now() });
        this.pushState();
        if (this.players.every((x) => this.picks.has(x.id))) this.endLogo();
        return;
      }
      case 'react': {
        if (this.phase !== 'react' || msg.round !== this.round || this.reacts.has(from)) return;
        let ms = Math.round(+msg.ms);
        if (!isFinite(ms) || ms < 100) ms = -1;           // zu früh (unter 0,1 s kann niemand reagieren)
        this.reacts.set(from, Math.min(ms, REACT_WINDOW * 1000)); this.pushState();
        if (this.players.every((x) => this.reacts.has(x.id))) this.endReact();
        return;
      }
      case 'simon': {
        if (this.phase !== 'simon' || msg.round !== this.round) return;
        const e = this.simon.get(from) || { lv: 0, at: Date.now(), done: false }; if (e.done) return;
        if (msg.lv != null && (msg.lv | 0) === e.lv + 1 && e.lv < SIMON_LEN - 2) {
          e.lv++; e.at = Date.now();
          const pts = this.mode === 'stack' ? 5 + 2 * (e.lv - 1) : 10 + 5 * (e.lv - 1); // jedes Level gibt Punkte, schwerere mehr
          p.score += pts; this.gains[from] = (this.gains[from] || 0) + pts;
        }
        e.seen = Date.now();
        if (msg.done || e.lv >= SIMON_LEN - 2) e.done = true;
        this.simon.set(from, e); this.pushState();
        if (this.players.every((x) => (this.simon.get(x.id) || {}).done)) this.endSimon();
        return;
      }
      case 'eguess': {
        if (this.phase !== 'emoji' || msg.round !== this.round || this.egot.has(from)) return;
        const now = Date.now(); if (now - (p.lastGuess || 0) < 350) return; p.lastGuess = now;
        const text = String(msg.text || '').trim().slice(0, 40); if (!text) return;
        const res = checkGuess(text, this.eWord);
        if (res === 2) {
          this.egot.set(from, now); broadcast({ t: 'sys', key: 'guessedIt', name: p.name }, from); sendTo(from, { t: 'sys', key: 'youGuessed' });
          this.pushState();
          if (this.players.every((x) => this.egot.has(x.id))) this.endEmoji();
        } else sendTo(from, { t: 'sys', key: res === 1 ? 'almost' : 'nope' });
        return;
      }
      case 'col': {
        if (this.phase !== 'color' || msg.round !== this.round || this.cols.has(from)) return;
        const c = { h: clamp(+msg.h || 0, 0, 360), s: clamp(+msg.s || 0, 0, 100), l: clamp(+msg.l || 0, 0, 100) };
        this.cols.set(from, Object.assign(c, { m: colMatch(this.colT, c) })); this.pushState();
        if (this.players.every((x) => this.cols.has(x.id))) this.endColor();
        return;
      }
      case 'circ': {
        if (this.phase !== 'circle' || msg.round !== this.round) return;
        const e = this.circs.get(from) || { tries: 0, pct: -1, pts: [] }; if (e.tries >= CIRC_TRIES) return;
        const pct = +msg.pct; if (!isFinite(pct) || pct < 0 || pct > 100) return;
        e.tries++;
        if (pct > e.pct) { e.pct = Math.round(pct * 10) / 10; e.pts = (Array.isArray(msg.pts) ? msg.pts.slice(0, 160) : []).map((v) => Math.round(clamp(+v || 0, 0, 1) * 1000) / 1000); }
        this.circs.set(from, e); this.pushState();
        if (this.players.every((x) => (this.circs.get(x.id) || {}).tries >= CIRC_TRIES)) this.endCircle();
        return;
      }
      case 'bal': {
        if (this.phase !== 'balance' || msg.round !== this.round || this.bals.has(from)) return;
        const x = +msg.x; if (!isFinite(x) || x < 0 || x > 1.05) return;
        const h = balHold(this.balL, this.balObj, x);
        this.bals.set(from, { x: Math.round(x * 1000) / 1000, t: h.t, perfect: h.perfect, at: Date.now() }); this.pushState();
        if (this.players.every((y) => this.bals.has(y.id))) this.endBalance();
        return;
      }
      case 'cut': {
        if (this.phase !== 'halve' || msg.round !== this.round || this.cuts.has(from)) return;
        const pct = +msg.pct, ln = Array.isArray(msg.line) ? msg.line.slice(0, 4).map(Number) : [];
        if (!isFinite(pct) || pct <= 0 || pct > 50 || ln.length !== 4 || ln.some((v) => !isFinite(v))) return;
        this.cuts.set(from, { pct: Math.round(pct * 10) / 10, line: ln.map((v) => Math.round(v * 1000) / 1000) }); this.pushState();
        if (this.players.every((x) => this.cuts.has(x.id))) this.endHalve();
        return;
      }
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
    if (this.phase === 'guess' && from !== this.drawer) sendTo(from, { t: 'sync', turn: this.turn, strokes: this.live });
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
    if ((this.phase === 'choose' || this.phase === 'guess' || this.phase === 'hang') && id === this.drawer) { this.endTurn(); return; }
    if (this.phase === 'hang') { const cur = this.hOrder[this.hIdx % this.hOrder.length]; this.hOrder = this.hOrder.filter((x) => x !== id); if (cur === id) { this.hIdx--; this.hNext(); return; } this.hIdx = Math.max(0, this.hOrder.indexOf(cur)); }
    if (this.phase === 'guess' && this.allGuessed()) { this.endTurn(); return; }
    if (this.phase === 'logo' && this.players.every((x) => this.picks.has(x.id))) { this.endLogo(); return; }
    if (this.phase === 'timer' && this.players.every((x) => this.stops.has(x.id))) { this.endTimer(); return; }
    if (this.phase === 'estimate' && this.players.every((x) => this.ests.has(x.id))) { this.endEstimate(); return; }
    if (this.phase === 'react' && this.players.every((x) => this.reacts.has(x.id))) { this.endReact(); return; }
    if (this.phase === 'simon' && this.players.every((x) => (this.simon.get(x.id) || {}).done)) { this.endSimon(); return; }
    if (this.phase === 'emoji' && this.players.every((x) => this.egot.has(x.id))) { this.endEmoji(); return; }
    if (this.phase === 'halve' && this.players.every((x) => this.cuts.has(x.id))) { this.endHalve(); return; }
    if (this.phase === 'balance' && this.players.every((x) => this.bals.has(x.id))) { this.endBalance(); return; }
    if (this.phase === 'color' && this.players.every((x) => this.cols.has(x.id))) { this.endColor(); return; }
    if (this.phase === 'circle' && this.players.every((x) => (this.circs.get(x.id) || {}).tries >= CIRC_TRIES)) { this.endCircle(); return; }
    this.pushState();
  },
  sweep() {
    const now = Date.now(); for (const p of [...this.players]) if (!p.host && now - p.seen > 20000) this.removePlayer(p.id);
    if (this.phase === 'simon') {
      let changed = false;
      for (const p of this.players) {
        const e = this.simon.get(p.id) || { lv: 0, at: this.simonStart, done: false };
        if (e.done) continue;
        if (now - (e.seen || e.at || this.simonStart) > 45000 + e.lv * 2500) { e.done = true; this.simon.set(p.id, e); changed = true; }
      }
      if (changed) { if (this.players.every((x) => (this.simon.get(x.id) || {}).done)) this.endSimon(); else this.pushState(); }
    }
  },
  state() {
    return {
      t: 'state', phase: this.phase, round: this.round, rounds: this.rounds, soundIdx: this.soundIdx,
      remaining: Math.max(0, this.deadline - Date.now()), showPid: this.showOrder[this.showIdx] || null, showIdx: this.showIdx, showCount: this.showOrder.length,
      players: this.players.map((p) => ({ id: p.id, name: p.name, char: p.char, score: p.score, voice: p.voice, host: p.host, lang: p.lang,
        done: this.doneOf(p.id) })),
      drawer: this.drawer, turn: this.turn, logoIdx: this.logoIdx, target: this.target, mix: !!this.mix, qIdx: this.qIdx,
      ests: this.mode === 'estimate' && this.phase === 'results' ? Object.fromEntries(this.ests) : null,
      colT: this.mode === 'color' && (this.phase === 'colorshow' || this.phase === 'results') ? this.colT : null,
      cols: this.mode === 'color' && this.phase === 'results' ? Object.fromEntries(this.cols) : null,
      circ: this.mode === 'circle' ? Object.fromEntries([...this.circs].map(([k, v]) => [k, this.phase === 'results' ? v : { tries: v.tries, pct: v.pct }])) : null,
      balL: this.mode === 'balance' ? this.balL : null, balObj: this.mode === 'balance' ? this.balObj : null,
      bals: this.mode === 'balance' && this.phase === 'results' ? Object.fromEntries(this.bals) : null,
      halveObj: this.mode === 'halve' ? (window.HALVE_OBJ || ['🍌'])[this.halveIdx] : '', halveRot: this.halveRot,
      cuts: this.mode === 'halve' && this.phase === 'results' ? Object.fromEntries(this.cuts) : null,
      goIn: this.phase === 'react' ? Math.max(0, this.reactGoAt - Date.now()) : 0,
      reacts: this.mode === 'react' && this.phase === 'results' ? Object.fromEntries(this.reacts) : null,
      simonSeq: this.phase === 'simon' ? this.simonSeq : null,
      simonLv: SEQ_MODES.includes(this.mode) && (this.phase === 'simon' || this.phase === 'results') ? Object.fromEntries([...this.simon].map(([k, v]) => [k, v.lv])) : null,
      eClue: this.mode === 'emoji' && (this.phase === 'emoji' || this.phase === 'results') && EMOJI_LIST[this.emojiIdx] ? EMOJI_LIST[this.emojiIdx][0] : '',
      egot: this.mode === 'emoji' && this.phase === 'results' ? Object.fromEntries([...this.egot].map(([k, v]) => [k, Math.round((v - this.eStart) / 100) / 10])) : null,
      stops: this.mode === 'timer' && this.phase === 'results' ? Object.fromEntries(this.stops) : null,
      picks: this.mode === 'logo' && this.phase === 'results' ? Object.fromEntries([...this.picks].map(([k, v]) => [k, { name: v.name, ok: v.ok }])) : null,
      roundScores: Object.fromEntries([...this.recs].map(([k, v]) => [k, v.score])), gains: this.gains,
      mode: this.mode, wordIdx: this.wordIdx,
      present: this.phase === 'present' ? (() => { const r = this.recs.get(this.showOrder[this.showIdx]) || { votes: new Map() };
        return { revealed: this.revealed, voters: [...r.votes.keys()], votes: this.revealed ? Object.fromEntries(r.votes) : null, avg: this.revealed ? r.avg : 0, score: this.revealed ? r.score : 0 }; })() : null,
    };
  },
  pushState() { const s = this.state(); for (const p of this.players) sendTo(p.id, this.stateFor(p, s)); },
  doneOf(id) {
    switch (this.mode) {
      case 'estimate': return this.ests.has(id);
      case 'timer': return this.stops.has(id);
      case 'logo': return this.picks.has(id);
      case 'guess': return this.guessed.has(id);
      case 'react': return this.reacts.has(id);
      case 'simon': case 'memory': case 'cups': case 'stack': return !!(this.simon.get(id) || {}).done;
      case 'emoji': return this.egot.has(id);
      case 'halve': return this.cuts.has(id);
      case 'balance': return this.bals.has(id);
      case 'color': return this.cols.has(id);
      case 'circle': return (this.circs.get(id) || {}).tries >= CIRC_TRIES;
      default: return this.recs.has(id);
    }
  },
  // Malen & Raten: das Wort sieht nur, wer malt oder es schon erraten hat – alle anderen nur die Striche
  stateFor(p, s) {
    if (this.mode === 'emoji' && (s.phase === 'emoji' || s.phase === 'results')) {
      // Lösung nur für wer sie schon hat (oder am Ende); sonst nur Länge bzw. erster Buchstabe als Tipp
      const w = this.eWord, word = WORDS[w] ? [...WORDS[w][p.lang === 'am' ? 1 : 0]] : [];
      const knows = s.phase === 'results' || this.egot.has(p.id);
      const hint = this.eHint ? word.map((c, i) => (c === ' ' || c === '-' ? c : (this.eHint >= 2 && i === 0 ? c : '_'))).join('') : '';
      return Object.assign({}, s, { eWord: knows ? w : -1, eHint: knows ? '' : hint, eLen: this.eHint ? word.filter((c) => c !== ' ' && c !== '-').length : 0 });
    }
    if (this.mode === 'hang') {
      if (s.phase === 'choose') return Object.assign({}, s, { choices: p.id === this.drawer ? this.choices : null });
      if (s.phase === 'hang' || s.phase === 'results') return Object.assign({}, s, { hang: this.hangView(p.id === this.drawer || s.phase === 'results') });
      return s;
    }
    if (this.mode !== 'guess' || (s.phase !== 'choose' && s.phase !== 'guess' && s.phase !== 'results')) return s;
    const w = this.wordIdx, knows = p.id === this.drawer || this.guessed.has(p.id) || s.phase === 'results';
    const word = WORDS[w] ? WORDS[w][p.lang === 'am' ? 1 : 0] : '';
    return Object.assign({}, s, { word: knows ? w : -1, hint: w >= 0 ? [...word].map((c) => (c === ' ' || c === '-' ? c : '_')).join('') : '',
      choices: s.phase === 'choose' && p.id === this.drawer ? this.choices : null });
  },
  setPhase(phase, sec, next) {
    this.stop(); this.phase = phase; this.deadline = Date.now() + sec * 1000; this.pushState();
    if (next) this.timer = setTimeout(next, sec * 1000);
  },
  startGame() {
    this.players.forEach((p) => p.score = 0); this.round = 0; this.used = new Set(); this.usedQ = new Set(); this.usedE = new Set(); this.usedH = new Set(); this.usedB = new Set(); this.departed = new Map();
    this.mix = this.baseMode === 'mix';
    if (this.mix) { // die ausgewählten Spiele in zufälliger Reihenfolge, jedes „Runden“-mal direkt hintereinander
      this.mixList = []; for (const m of shuffle([...(this.mixGames || GAME_MODES)])) for (let r = 0; r < this.rounds; r++) this.mixList.push(m);
      this.mixIdx = -1; this.mixDrawn = {}; this.mixNext(); return;
    }
    if (this.mode === 'guess' || this.mode === 'hang') { this.turnOrder = []; this.turnIdx = 0; this.nextTurn(); return; }
    this.nextRound();
  },
  toLobby() { this.stop(); if (this.mix) { this.mix = false; this.mode = this.baseMode || 'mix'; } this.phase = 'lobby'; this.recs = new Map(); this.gains = {}; this.drawer = null; this.picks = new Map(); this.guessed = new Map(); this.pushState(); },
  mixNext() {
    this.mixIdx++;
    if (this.mixIdx >= this.mixList.length) { this.drawer = null; this.setPhase('end', 0); return; }
    const same = this.mixIdx > 0 && this.mixList[this.mixIdx - 1] === this.mixList[this.mixIdx];
    this.mode = this.mixList[this.mixIdx]; this.round = this.mixIdx + 1; this.rounds = this.mixList.length;
    this.drawer = null; this.gains = {};
    this.setPhase('intro', same ? 2 : 4, () => { // kurze Ansage; beim gleichen Spiel nochmal nur kurz
      if (this.mode === 'guess' || this.mode === 'hang') {
        const ids = shuffle(this.players.map((p) => p.id)).sort((a, b) => (this.mixDrawn[a] || 0) - (this.mixDrawn[b] || 0));
        this.drawer = ids[0]; this.mixDrawn[this.drawer] = (this.mixDrawn[this.drawer] || 0) + 1;
        this.playTurn();
      } else this.playRound();
    });
  },
  // Runde abbrechen: ohne Punkte direkt weiter
  skip() {
    if (this.phase === 'lobby' || this.phase === 'end') return;
    this.stop(); this.gains = {};
    if (this.mix) this.mixNext(); else if (this.mode === 'guess' || this.mode === 'hang') this.nextTurn(); else this.nextRound();
  },
  nextRound() {
    if (this.mix) { this.mixNext(); return; }
    this.round++;
    if (this.round > this.rounds) { this.setPhase('end', 0); return; }
    this.playRound();
  },
  playRound() {
    if (this.mode === 'color') {
      this.colT = { h: rnd(360), s: 35 + rnd(60), l: 30 + rnd(46) }; this.cols = new Map(); this.gains = {};
      this.setPhase('colorshow', COL_SHOW, () => this.setPhase('color', COL_TIME, () => this.endColor()));
      return;
    }
    if (this.mode === 'circle') {
      this.circs = new Map(); this.gains = {};
      this.setPhase('circle', CIRC_TIME, () => this.endCircle());
      return;
    }
    if (this.mode === 'balance') {
      // links ein festes Gewicht, rechts ein Gegenstand; die richtige Stelle muss gut erreichbar sein
      let L, oi, x;
      for (let k = 0; k < 400; k++) {
        L = { kg: [1, 1.5, 2, 2.5, 3, 4, 5][rnd(7)], d: (3 + rnd(7)) / 10 }; oi = rnd(BAL_OBJ.length);
        x = L.kg * L.d / BAL_OBJ[oi][1];
        if (x >= 0.15 && x <= 0.95 && (k > 300 || !this.usedB.has(oi))) break;
      }
      this.usedB.add(oi); this.balL = L; this.balObj = BAL_OBJ[oi]; this.bals = new Map(); this.gains = {};
      this.setPhase('balance', BAL_TIME, () => this.endBalance());
      return;
    }
    if (this.mode === 'halve') {
      const n = (window.HALVE_OBJ || ['🍌']).length; let i = rnd(n); for (let k = 0; k < 300 && this.usedH.has(i); k++) i = rnd(n);
      this.usedH.add(i); this.halveIdx = i; this.halveRot = rnd(71) - 35; this.cuts = new Map(); this.gains = {};
      this.setPhase('halve', HALVE_TIME, () => this.endHalve());
      return;
    }
    if (this.mode === 'react') {
      this.reactWait = 2000 + rnd(4500); this.reacts = new Map(); this.gains = {};
      this.reactGoAt = Date.now() + this.reactWait;
      this.setPhase('react', this.reactWait / 1000 + REACT_WINDOW + 1, () => this.endReact());
      return;
    }
    if (SEQ_MODES.includes(this.mode)) {
      const n = seqPads(this.mode); this.simonSeq = [];
      for (let i = 0; i < SIMON_LEN; i++) { let v = rnd(n); if (n > 4) while (i && v === this.simonSeq[i - 1]) v = rnd(n); this.simonSeq.push(v); }
      this.simon = new Map(); this.gains = {};
      this.simonStart = Date.now();
      this.setPhase('simon', 20 * 60, () => this.endSimon()); // Notbremse nach 20 Min.; sonst endet es, wenn alle raus sind
      return;
    }
    if (this.mode === 'emoji') {
      const n = EMOJI_LIST.length; let i = rnd(n); for (let k = 0; k < 300 && this.usedE.has(i); k++) i = rnd(n);
      this.usedE.add(i); this.emojiIdx = i; this.eWord = EMOJI_LIST[i][1]; this.egot = new Map(); this.gains = {}; this.eHint = 0; this.eStart = Date.now();
      this.setPhase('emoji', EMOJI_TIME, () => this.endEmoji());
      const r = this.round, hint = (lv) => () => { if (this.phase === 'emoji' && this.round === r) { this.eHint = lv; this.pushState(); } };
      this.eTimers.push(setTimeout(hint(1), EMOJI_TIME * 400), setTimeout(hint(2), EMOJI_TIME * 700));
      return;
    }
    if (this.mode === 'estimate') {
      const n = QUESTIONS.length; let i = rnd(n); for (let k = 0; k < 300 && this.usedQ.has(i); k++) i = rnd(n);
      this.usedQ.add(i); this.qIdx = i; this.ests = new Map(); this.gains = {};
      this.setPhase('estimate', EST_TIME, () => this.endEstimate());
      return;
    }
    if (this.mode === 'timer') {
      this.target = TIMER_TARGETS[rnd(TIMER_TARGETS.length)] * 1000; this.stops = new Map(); this.gains = {};
      this.setPhase('timer', 25 + this.target / 1000 * 2, () => this.endTimer());
      return;
    }
    if (this.mode === 'logo') {
      const n = LOGOS.length; let i = rnd(n); for (let k = 0; k < 200 && this.used.has(i); k++) i = rnd(n);
      this.used.add(i); this.logoIdx = i; this.picks = new Map(); this.gains = {};
      this.setPhase('logo', LOGO_TIME, () => this.endLogo());
      return;
    }
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
  // ---- Schätzen: wer am nächsten dran ist, bekommt am meisten
  endEstimate() {
    if (this.phase !== 'estimate') return;
    this.stop(); this.gains = {};
    const q = QUESTIONS[this.qIdx], ans = q[2], diff = (v) => Math.abs(v - ans);
    for (const p of this.players) {
      let g = 0;
      if (this.ests.has(p.id)) {
        const d = diff(this.ests.get(p.id)), rank = [...this.ests.values()].filter((v) => diff(v) < d).length; // gleich nah = gleich viele Punkte
        g = LOGO_POINTS[Math.min(rank, LOGO_POINTS.length - 1)];
        if (q[5] === 'y' ? d === 0 : d <= ans * 0.01) g += 50;
      }
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME + 2, () => this.nextRound());
  },
  // ---- Stoppuhr: wer am nächsten an der Zielzeit stoppt, gewinnt
  endTimer() {
    if (this.phase !== 'timer') return;
    this.stop(); this.gains = {};
    const ranked = [...this.stops].sort((a, b) => Math.abs(a[1] - this.target) - Math.abs(b[1] - this.target));
    for (const p of this.players) {
      const rank = ranked.findIndex(([id]) => id === p.id);
      let g = rank < 0 ? 0 : LOGO_POINTS[Math.min(rank, LOGO_POINTS.length - 1)];
      if (rank >= 0 && Math.abs(this.stops.get(p.id) - this.target) <= 50) g += 50; // fast genau: Bonus
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME + 2, () => this.nextRound());
  },
  // ---- Farbe treffen: Punkte = Treffer in %, die Beste +20
  endColor() {
    if (this.phase !== 'color' && this.phase !== 'colorshow') return;
    this.stop(); this.gains = {};
    const best = Math.max(-1, ...[...this.cols.values()].map((c) => c.m));
    for (const p of this.players) { const c = this.cols.get(p.id); const g = c ? Math.round(c.m) + (c.m === best && this.cols.size > 1 ? 20 : 0) : 0; p.score += g; this.gains[p.id] = g; }
    this.setPhase('results', RESULT_TIME + 1, () => this.nextRound());
  },
  // ---- Perfekter Kreis: Punkte = Rundheit in % (bester Versuch), der Rundeste +20
  endCircle() {
    if (this.phase !== 'circle') return;
    this.stop(); this.gains = {};
    const best = Math.max(-1, ...[...this.circs.values()].map((c) => c.pct));
    for (const p of this.players) { const c = this.circs.get(p.id); const g = c && c.pct >= 0 ? Math.round(c.pct) + (c.pct === best && this.circs.size > 1 ? 20 : 0) : 0; p.score += g; this.gains[p.id] = g; }
    this.setPhase('results', RESULT_TIME + 1, () => this.nextRound());
  },
  // ---- Wippe: je länger sie hält, desto mehr Punkte; perfekt = volle Punkte
  endBalance() {
    if (this.phase !== 'balance') return;
    // erst warten, bis die letzte Wippe fertig gewackelt hat bzw. umgekippt ist
    const now = Date.now(), until = Math.max(0, ...[...this.bals.values()].map((b) => b.at + b.t * 1000 + 900));
    if (until > now + 150) { clearTimeout(this.timer); this.timer = setTimeout(() => this.endBalance(), until - now); return; }
    this.stop(); this.gains = {};
    for (const p of this.players) {
      const b = this.bals.get(p.id);
      const g = !b ? 0 : b.perfect ? 100 : Math.round(b.t / BAL_HOLD * 80);
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME + 2, () => this.nextRound());
  },
  // ---- Halbieren: je näher an 50 : 50, desto mehr Punkte; der Genaueste bekommt Bonus
  endHalve() {
    if (this.phase !== 'halve') return;
    this.stop(); this.gains = {};
    const best = Math.max(0, ...[...this.cuts.values()].map((c) => c.pct));
    for (const p of this.players) {
      const c = this.cuts.get(p.id);
      let g = c ? Math.max(0, Math.round(100 - (50 - c.pct) * 6)) : 0; // 1 % daneben = 94, 5 % = 70, ab 16,7 % = 0
      if (c && c.pct === best && this.cuts.size > 1) g += 25;
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME + 2, () => this.nextRound());
  },
  // ---- Reaktion: wer am schnellsten tippt, gewinnt; zu früh = 0 Punkte
  endReact() {
    if (this.phase !== 'react') return;
    this.stop(); this.gains = {};
    const ranked = [...this.reacts].filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1]);
    for (const p of this.players) {
      const rank = ranked.findIndex(([id]) => id === p.id);
      let g = rank < 0 ? 0 : LOGO_POINTS[Math.min(rank, LOGO_POINTS.length - 1)];
      if (rank >= 0 && this.reacts.get(p.id) < 250) g += 30; // blitzschnell: Bonus
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME, () => this.nextRound());
  },
  // ---- Farbfolge: wer das höchste Level schafft (bei Gleichstand: wer es zuerst hatte)
  endSimon() {
    if (this.phase !== 'simon') return;
    this.stop(); // Level-Punkte gab es schon unterwegs; jetzt noch Bonus für die Besten
    const ranked = [...this.simon].filter(([, v]) => v.lv > 0).sort((a, b) => b[1].lv - a[1].lv || a[1].at - b[1].at);
    for (const p of this.players) {
      const rank = ranked.findIndex(([id]) => id === p.id);
      const g = rank < 0 ? 0 : [50, 25, 10][rank] || 0;
      p.score += g; this.gains[p.id] = (this.gains[p.id] || 0) + g;
    }
    this.setPhase('results', RESULT_TIME + 1, () => this.nextRound());
  },
  // ---- Emoji-Rätsel: wer zuerst richtig rät, bekommt am meisten
  endEmoji() {
    if (this.phase !== 'emoji') return;
    this.stop(); this.gains = {};
    const right = [...this.egot].sort((a, b) => a[1] - b[1]);
    for (const p of this.players) {
      const rank = right.findIndex(([id]) => id === p.id);
      const g = rank < 0 ? 0 : LOGO_POINTS[Math.min(rank, LOGO_POINTS.length - 1)];
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME + 1, () => this.nextRound());
  },
  // ---- Logo-Quiz: wer zuerst richtig tippt, bekommt am meisten
  endLogo() {
    if (this.phase !== 'logo') return;
    this.stop(); this.gains = {};
    const right = [...this.picks].filter(([, v]) => v.ok).sort((a, b) => a[1].at - b[1].at);
    for (const p of this.players) {
      const rank = right.findIndex(([id]) => id === p.id);
      const g = rank < 0 ? 0 : LOGO_POINTS[Math.min(rank, LOGO_POINTS.length - 1)];
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', RESULT_TIME, () => this.nextRound());
  },
  // ---- Malen & Raten: einer malt, alle anderen raten
  pickWord(diff) {
    let w = rnd(WORDS.length);
    for (let k = 0; k < 400 && (this.used.has(w) || !WORDS[w] || WORDS[w][2] !== diff); k++) w = rnd(WORDS.length);
    return w;
  },
  nextTurn() {
    if (this.mix) { this.mixNext(); return; }
    for (;;) {
      if (this.turnIdx >= this.turnOrder.length) {
        this.round++;
        if (this.round > this.rounds) { this.drawer = null; this.setPhase('end', 0); return; }
        this.turnOrder = this.players.map((p) => p.id); this.turnIdx = 0;
      }
      const id = this.turnOrder[this.turnIdx++];
      if (this.get(id)) { this.drawer = id; break; }
    }
    this.playTurn();
  },
  playTurn() {
    this.turn++; this.wordIdx = -1; this.live = []; this.livePts = 0; this.guessed = new Map(); this.gains = {};
    this.choices = [1, 2, 3].map((d) => this.pickWord(d));
    this.setPhase('choose', this.mode === 'hang' ? 25 : CHOOSE_TIME, () => this.chooseWord(this.choices[rnd(3)]));
  },
  chooseWord(w) {
    if (this.phase !== 'choose') return;
    if (this.mode === 'hang') { const d = this.get(this.drawer), lg = d && d.lang === 'am' ? 'am' : 'de'; this.used.add(w); this.startHang(cleanHangWord(WORDS[w][lg === 'am' ? 1 : 0], lg) || 'MALENIO', lg); return; }
    this.wordIdx = w; this.used.add(w);
    this.setPhase('guess', GUESS_TIME, () => this.endTurn());
  },
  allGuessed() { return this.players.filter((x) => x.id !== this.drawer).every((x) => this.guessed.has(x.id)); },
  award(pid) {
    const p = this.get(pid); if (!p) return;
    const f = clamp((this.deadline - Date.now()) / (GUESS_TIME * 1000), 0, 1);
    const mult = [1, 1.25, 1.5][((WORDS[this.wordIdx] || [])[2] || 1) - 1];
    const pts = Math.round((40 + 80 * f) * mult) + Math.max(0, 20 - 5 * this.guessed.size);
    this.guessed.set(pid, pts);
    broadcast({ t: 'chat', sys: 'guessedIt', name: p.name, pid });
    this.endTurn(); // wie im alten Spiel: sobald einer es hat, ist der Zug vorbei
  },
  // ---- Strichmännchen: einer wählt ein Wort, die anderen wählen reihum Buchstaben
  startHang(word, lg) {
    this.hWord = word; this.hLang = lg; this.hGuessed = new Set(); this.hMiss = 0; this.hCount = {}; this.hSolved = false;
    this.hOrder = this.players.filter((x) => x.id !== this.drawer).map((x) => x.id); this.hIdx = -1;
    this.hNext();
  },
  hCur() { return this.hOrder.length ? this.hOrder[this.hIdx % this.hOrder.length] : null; },
  hNext() {
    this.hOrder = this.hOrder.filter((id) => this.get(id));
    if (!this.hOrder.length) { this.endHang(false); return; }
    this.hIdx = (this.hIdx + 1) % this.hOrder.length;
    this.setPhase('hang', HANG_TURN, () => this.hNext()); // wer nicht wählt, wird übersprungen
  },
  hangView(full) {
    return { mask: [...this.hWord].map((c) => (!hangKey(c) || this.hGuessed.has(hangKey(c)) || full ? c : '_')), guessed: [...this.hGuessed],
      open: [...this.hWord].map((c) => !hangKey(c) || this.hGuessed.has(hangKey(c))),
      wrong: [...this.hGuessed].filter((k) => ![...this.hWord].some((c) => hangKey(c) === k)), misses: this.hMiss, cur: this.hCur(), counts: this.hCount,
      lang: this.hLang, full: !!full, solved: this.hSolved };
  },
  endHang(solved) {
    this.stop(); this.gains = {}; this.hSolved = solved;
    const best = Math.max(0, ...Object.values(this.hCount));
    for (const p of this.players) {
      let g = 0;
      if (p.id === this.drawer) g = solved ? this.hMiss * 10 : 150;
      else if (solved) g = 30 + 20 * (this.hCount[p.id] || 0) + (best > 0 && this.hCount[p.id] === best ? 40 : 0);
      p.score += g; this.gains[p.id] = g;
    }
    this.setPhase('results', 7, () => this.nextTurn());
  },
  endTurn() {
    if (this.mode === 'hang') { if (this.phase === 'choose' || this.phase === 'hang') { this.stop(); this.gains = {}; this.hWord = ''; this.setPhase('results', 4, () => this.nextTurn()); } return; }
    if (this.phase !== 'choose' && this.phase !== 'guess') return;
    this.stop(); this.gains = {};
    const mult = [1, 1.25, 1.5][((WORDS[this.wordIdx] || [])[2] || 1) - 1];
    for (const p of this.players) {
      let g = this.guessed.get(p.id) || 0;
      if (p.id === this.drawer) g = Math.round([...this.guessed.values()].reduce((a, b) => a + b, 0) * 0.6);
      p.score += g; this.gains[p.id] = g;
    }
    if (this.wordIdx < 0) this.wordIdx = this.choices[0];
    this.setPhase('results', 6, () => this.nextTurn());
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
  live: [], liveTurn: -1, chat: [], chatTurn: -1, opQ: [], opTimer: null, myPick: null, chooseSent: -1,
  reset() { this.timerRun = null; this.modeTouched = false; clearInterval(this.opTimer); this.live = []; this.chat = []; this.myPick = null; this.inRoom = false; this.state = null; this.recs = new Map(); this.myRec = null; this.recRoundStarted = -1; this.listenRound = -1; this.drawRoundStarted = -1; this.drawings = new Map(); this.draw = null; this.presentKey = ''; this.lastKey = ''; clearInterval(this.tick); stopPlay(); if (this.recorder) this.recorder.stop(); },
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
      case 'emo': flyEmoji(msg.e, msg.pid); break;
      case 'chat': this.addChat(msg); break;
      case 'ops': this.applyLive(msg.turn, msg.ops); break;
      case 'sync': this.live = []; this.liveTurn = msg.turn; for (const o of msg.strokes || []) this.live.push({ c: o.c, w: o.w, p: o.p.slice() }); this.redrawLive(); break;
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
    voiceSync(st); applyVoiceMute(st.phase); renderVoiceHeads(st);
    if (st.mode === 'logo' || st.mode === 'mix' || st.mix) ensureLogos().catch(() => {});
    if (st.mode === 'estimate' || st.mode === 'mix' || st.mix) ensureQuestions().catch(() => {});
    $('#btn-stop').classList.toggle('hidden', !(net.isHost && st.phase !== 'lobby' && st.phase !== 'end'));
    // Figur wird gerade gestaltet: in der Lobby nicht stören; startet das Spiel, geht es automatisch weiter
    if (!$('#screen-creator').classList.contains('hidden')) { if (st.phase === 'lobby') return; toHost({ t: 'char', char: myChar }); }
    if (st.phase === 'lobby') { this.colRun = null; this.circRun = null; this.balRun = null; this.halveRun = null; this.timerRun = null; this.myPick = null; this.myEst = null; this.reactRun = null; this.simonRun = null; showScreen('lobby'); this.renderLobby(); this.lastKey = ''; this.toggleEmo(false); return; }
    showScreen('game');
    this.renderStrip();
    const key = [st.phase, st.round, st.showIdx, (st.phase === 'record' || st.phase === 'draw') ? st.players.map((p) => p.done ? 1 : 0).join('') : '', st.present ? st.present.revealed : '', lang, st.turn, st.drawer].join('|');
    if (key !== this.lastKey) { this.lastKey = key; this.renderStage(prev); }
    else if (st.phase === 'present') this.updateVoteArea();
    else if (st.phase === 'logo' || st.phase === 'timer' || st.phase === 'estimate') this.updateDone();
    else if (st.phase === 'guess') this.updateGuessInfo();
    else if (st.phase === 'choose') this.updateChoose();
    else if (st.phase === 'hang') this.updateHang();
    else if (['react', 'halve', 'balance', 'color', 'circle'].includes(st.phase)) this.updateDone();
    else if (st.phase === 'simon') this.updateSimon();
    else if (st.phase === 'emoji') this.updateEmoji();
    this.toggleEmo(['show', 'present', 'results', 'end'].includes(st.phase));
    this.updateTimer();
  },
  renderLobby() {
    const st = this.state;
    $('#lobby-count').textContent = `(${st.players.length}/${MAX_PLAYERS})`;
    $('#lobby-players').innerHTML = st.players.map((p) => `<div class="kick-wrap">${pcard(p, 86, true)}${net.isHost && !p.host ? `<button class="kick" data-id="${esc(p.id)}" aria-label="x">✖</button>` : ''}</div>`).join('');
    $('#lobby-players').querySelectorAll('.kick').forEach((b) => b.onclick = async () => {
      const p = this.state.players.find((x) => x.id === b.dataset.id); if (!p) return;
      if (await confirmBox(t('kickQ', { name: p.name }))) { toHost({ t: 'kick', pid: p.id }); toast(t('kickedOut', { name: p.name })); }
    });
    $('#host-settings').classList.toggle('hidden', !net.isHost);
    $('#lobby-wait').classList.toggle('hidden', net.isHost);
    const b = $('#btn-start'); b.disabled = st.players.length < 2; b.textContent = st.players.length < 2 ? t('needTwo') : t('start');
    const lm = $('#lobby-mode'); lm.classList.toggle('hidden', net.isHost);
    lm.textContent = t('lobbyMode') + ' ' + t(MODE_KEY[st.mode] || 'modeSound');
    if (net.isHost && $('#set-mode').value !== st.mode && !this.modeTouched) { $('#set-mode').value = st.mode; setRoundOpts(st.mode); }
    if (net.isHost) renderMixPick();
  },
  renderStrip() {
    const st = this.state, dance = st.phase === 'results' || st.phase === 'end';
    const sorted = [...st.players].sort((a, b) => b.score - a.score);
    const tag = (p) => (['react', 'simon', 'emoji', 'halve', 'balance', 'color', 'circle'].includes(st.phase) && p.done) || (st.phase === 'record' && p.done) || (st.phase === 'guess' && p.done) || (st.phase === 'timer' && p.done) || (st.phase === 'estimate' && p.done) ? '✅' : (st.phase === 'logo' && p.done ? '🔒' : ((st.phase === 'guess' || st.phase === 'choose' || st.phase === 'hang') && p.id === st.drawer ? '✏️' : (st.phase === 'hang' && st.hang && st.hang.cur === p.id ? '👉' : '')));
    $('#game-players').innerHTML = sorted.map((p) => pcard(p, 56, dance, tag(p))).join('');
  },
  async renderStage(prev) {
    const st = this.state, stage = $('#stage');
    $('#info-round').textContent = st.phase === 'end' ? '' : t(st.mix ? 'game' : 'round', { a: Math.min(st.round, st.rounds), b: st.rounds });
    const onStage = st.phase === 'show' || st.phase === 'present' || st.phase === 'results' || st.phase === 'end';
    stage.classList.toggle('on-stage', onStage);
    if (st.phase !== 'guess') { clearInterval(this.opTimer); this.opTimer = null; }
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
    } else if (st.phase === 'choose') {
      this.renderChoose();
    } else if (st.phase === 'guess') {
      this.renderGuess();
    } else if (st.phase === 'logo') {
      this.renderLogo();
    } else if (st.phase === 'timer') {
      this.renderTimer();
    } else if (st.phase === 'hang') {
      this.renderHang();
    } else if (st.phase === 'intro') {
      stage.innerHTML = `<div class="cat">${t('nextGame')}</div><div class="intro-title">${esc(t(MODE_KEY[st.mode]))}</div>
        <div class="crowd-row">${st.players.map((p) => charEl(p.char, 64, true)).join('')}</div>`;
      tick(660); setTimeout(() => tick(990), 160);
    } else if (st.phase === 'estimate') {
      this.renderEstimate();
    } else if (st.phase === 'colorshow') {
      stage.innerHTML = `<div class="cat">${t('modeColor')}</div><div class="col-big" style="background:${hslCss(st.colT)}"></div><div class="meme-title">${t('colMemo')}</div>`;
    } else if (st.phase === 'color') {
      this.renderColor();
    } else if (st.phase === 'circle') {
      this.renderCircle();
    } else if (st.phase === 'balance') {
      this.renderBalance();
    } else if (st.phase === 'halve') {
      this.renderHalve();
    } else if (st.phase === 'react') {
      this.renderReact();
    } else if (st.phase === 'simon') {
      if (st.mode === 'cups') this.renderCups(); else if (st.mode === 'stack') this.renderStack(); else this.renderSimon();
    } else if (st.phase === 'emoji') {
      this.renderEmoji();
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
    } else if (st.phase === 'results' && st.mode === 'estimate') {
      try { await ensureQuestions(); } catch (e) { return; }
      if (this.state !== st) return;
      const q = QUESTIONS[st.qIdx], ev = st.ests || {}, diff = (id) => (ev[id] == null ? 1e18 : Math.abs(ev[id] - q[2])), unit = lang === 'am' ? q[4] : q[3];
      const shown = (v) => (q[5] === 'y' ? String(v) : fmtNum(v)) + (unit ? ' ' + unit : '');
      stage.innerHTML = scoreCards(st, null, true) + `<div class="est-q light">${esc(q[lang === 'am' ? 1 : 0])}</div><div class="cat light">${t('answer')}</div><div class="timer-big light">${esc(shown(q[2]))}</div>
        <div class="vlist">${[...st.players].sort((a, b) => diff(a.id) - diff(b.id)).map((x, i) => { const v = ev[x.id]; const hit = v != null && (q[5] === 'y' ? v === q[2] : Math.abs(v - q[2]) <= q[2] * 0.01);
          return `<div class="vline${i === 0 && v != null ? ' best' : ''}">${charEl(x.char, 26, false)}<span class="vn">${i === 0 && v != null ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp">${v == null ? '⏳ ' + t('noEst') : `<b>${esc(shown(v))}</b>${hit ? ' 🎯 ' + t('bullseye') : ''}`}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'color') {
      const cs = st.cols || {}, order = [...st.players].sort((a, b) => (cs[b.id] ? cs[b.id].m : -1) - (cs[a.id] ? cs[a.id].m : -1));
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('colWas')}</div><div class="col-big small" style="background:${hslCss(st.colT)}"></div>
        <div class="vlist">${order.map((x, i) => { const c = cs[x.id];
          return `<div class="vline${i === 0 && c ? ' best' : ''}"><i class="col-sw" style="background:${c ? hslCss(c) : 'transparent'}"></i>${charEl(x.char, 26, false)}<span class="vn">${i === 0 && c ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp">${c ? `${t('match')} <b>${fmtNum(c.m)} %</b>` : '⏳ ' + t('colNone')}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'circle') {
      const cs = st.circ || {}, val = (id) => (cs[id] ? cs[id].pct : -1), order = [...st.players].sort((a, b) => val(b.id) - val(a.id));
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('modeCircle')}</div><canvas class="halve-cv small" id="c-cv" width="320" height="320"></canvas>
        <div class="vlist">${order.map((x, i) => { const c = cs[x.id], ok = c && c.pct >= 0;
          return `<div class="vline${i === 0 && ok ? ' best' : ''}"><i class="h-dot" style="background:${esc(x.char.color)}"></i>${charEl(x.char, 26, false)}<span class="vn">${i === 0 && ok ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp">${ok ? `<b>${t('circRound', { p: fmtNum(c.pct) })}</b>` : '⏳ ' + t('circNone')}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
      const g = $('#c-cv').getContext('2d');
      for (const x of [...order].reverse()) { const c = cs[x.id]; if (!c || !c.pts || c.pts.length < 4) continue;
        const P = []; for (let i = 0; i + 1 < c.pts.length; i += 2) P.push([c.pts[i] * 320, c.pts[i + 1] * 320]);
        drawStroke(g, P, 'rgba(0,0,0,.45)', 9); drawStroke(g, P, x.char.color, 5); }
    } else if (st.phase === 'results' && st.mode === 'balance') {
      const bs = st.bals || {}, val = (id) => (!bs[id] ? -1 : bs[id].perfect ? 99 : bs[id].t);
      const order = [...st.players].sort((a, b) => val(b.id) - val(a.id));
      const right = st.balL.kg * st.balL.d / st.balObj[1];
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('modeBal')}</div>
        <div class="bal-wrap small">${balSvg(st.balL, st.balObj, null, 0, { right, marks: order.filter((x) => bs[x.id]).map((x) => ({ x: bs[x.id].x, color: x.char.color })) })}</div>
        <div class="vlist">${order.map((x, i) => { const b = bs[x.id];
          return `<div class="vline${i === 0 && b ? ' best' : ''}"><i class="h-dot" style="background:${esc(x.char.color)}"></i>${charEl(x.char, 26, false)}<span class="vn">${i === 0 && b ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp ${b && b.perfect ? 'ok' : ''}">${!b ? '⏳ ' + t('balNone') : b.perfect ? '🎯 ' + t('perfect') : `<b>${fmtNum(b.t)} s</b>`}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'halve') {
      const cuts = st.cuts || {}, dev = (id) => (cuts[id] ? 50 - cuts[id].pct : 99);
      const order = [...st.players].sort((a, b) => dev(a.id) - dev(b.id));
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('modeHalve')}</div><canvas class="halve-cv small" id="h-cv" width="${HALVE_PX}" height="${HALVE_PX}"></canvas>
        <div class="vlist">${order.map((x, i) => { const c = cuts[x.id];
          return `<div class="vline${i === 0 && c ? ' best' : ''}"><i class="h-dot" style="background:${esc(x.char.color)}"></i>${charEl(x.char, 26, false)}<span class="vn">${i === 0 && c ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp">${c ? `<b>${fmtNum(c.pct)} : ${fmtNum(Math.round((100 - c.pct) * 10) / 10)}</b>${c.pct >= 49.5 ? ' 🎯 ' + t('perfect') : ''}` : '⏳ ' + t('halveNone')}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
      const sh = halveShape(st.halveObj, st.halveRot), cv = $('#h-cv');
      const mine = cuts[net.myId];
      drawHalve(cv, sh, mine ? mine.line : null, order.filter((x) => cuts[x.id]).map((x) => ({ line: cuts[x.id].line, color: x.char.color })));
    } else if (st.phase === 'results' && st.mode === 'react') {
      const rv = st.reacts || {}, val = (id) => (rv[id] > 0 ? rv[id] : 1e9);
      const best = [...st.players].sort((a, b) => val(a.id) - val(b.id));
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('modeReact')}</div>
        <div class="vlist">${best.map((x, i) => { const ms = rv[x.id];
          return `<div class="vline${i === 0 && ms > 0 ? ' best' : ''}">${charEl(x.char, 26, false)}<span class="vn">${i === 0 && ms > 0 ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp ${ms === -1 ? 'bad' : ''}">${ms == null ? '⏳ ' + t('noReact') : ms === -1 ? t('tooEarly') : `<b>${ms} ms</b>${ms < 250 ? ' ⚡ ' + t('fast') : ''}`}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
    } else if (st.phase === 'results' && SEQ_MODES.includes(st.mode)) {
      const lv = st.simonLv || {};
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t(MODE_KEY[st.mode])}</div>
        <div class="vlist">${[...st.players].sort((a, b) => (st.gains[b.id] || 0) - (st.gains[a.id] || 0)).map((x, i) => `<div class="vline${i === 0 && lv[x.id] ? ' best' : ''}">${charEl(x.char, 26, false)}<span class="vn">${i === 0 && lv[x.id] ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp"><b>${st.mode === 'stack' ? `${lv[x.id] || 0} 🧱` : `${t('level')} ${lv[x.id] || 0}`}</b></span><b class="vg">+${st.gains[x.id] || 0}</b></div>`).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'emoji') {
      const eg = st.egot || {}, tm = (id) => (eg[id] == null ? 1e9 : eg[id]);
      stage.innerHTML = scoreCards(st, null, true) + `<div class="emo-clue small">${esc(st.eClue)}</div><div class="cat light">${t('emojiWas')}</div>
        <div class="meme-title light">${esc(WORDS[st.eWord] ? WORDS[st.eWord][lang === 'am' ? 1 : 0] : '?')}</div><div class="hint light">${esc(WORDS[st.eWord] ? WORDS[st.eWord][lang === 'am' ? 0 : 1] : '')}</div>
        <div class="vlist">${[...st.players].sort((a, b) => tm(a.id) - tm(b.id)).map((x, i) => `<div class="vline${i === 0 && eg[x.id] != null ? ' best' : ''}">${charEl(x.char, 26, false)}<span class="vn">${i === 0 && eg[x.id] != null ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp ${eg[x.id] != null ? 'ok' : ''}">${eg[x.id] != null ? `✅ <b>${fmtNum(eg[x.id])} s</b>` : '⏳ ' + t('notGuessed')}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'timer') {
      const sv = st.stops || {}, diff = (id) => (sv[id] == null ? 1e9 : Math.abs(sv[id] - st.target));
      stage.innerHTML = scoreCards(st, null, true) + `<div class="cat light">${t('target')}</div><div class="timer-big light">${fmtSec(st.target)} s</div>
        <div class="vlist">${[...st.players].sort((a, b) => diff(a.id) - diff(b.id)).map((x, i) => { const ms = sv[x.id];
          const d = ms == null ? '' : (ms >= st.target ? '+' : '−') + fmtSec(Math.abs(ms - st.target));
          return `<div class="vline${i === 0 && ms != null ? ' best' : ''}">${charEl(x.char, 26, false)}<span class="vn">${i === 0 && ms != null ? '🏆 ' : ''}${esc(x.name)}</span><span class="vp">${ms == null ? '⏳ ' + t('notStopped') : `<b>${fmtSec(ms)} s</b> <small>${d}${Math.abs(ms - st.target) <= 50 ? ' 🎯 ' + t('perfect') : ''}</small>`}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
    } else if (st.phase === 'results' && st.mode === 'logo') {
      stage.innerHTML = scoreCards(st, null, true) + `<div class="logo-res"><div class="logo-box small"><canvas id="lcv" width="240" height="240"></canvas></div>
        <div><div class="cat light">${t('logoWas')}</div><div class="logo-name" id="logo-name"></div></div></div>
        <div class="vlist">${[...st.players].sort((a, b) => (st.gains[b.id] || 0) - (st.gains[a.id] || 0)).map((x) => { const pk = st.picks && st.picks[x.id];
          return `<div class="vline">${charEl(x.char, 26, false)}<span class="vn">${esc(x.name)}</span><span class="vp ${pk ? (pk.ok ? 'ok' : 'bad') : ''}">${pk ? (pk.ok ? '✅ ' : '❌ ') + esc(pk.name) : '⏳ ' + t('noPick')}</span><b class="vg">+${st.gains[x.id] || 0}</b></div>`; }).join('')}</div>`;
      try { await ensureLogos(); } catch (e) { return; }
      const cv = $('#lcv'); if (cv && this.state.phase === 'results') { drawLogo(cv, st.logoIdx, 1, 0); $('#logo-name').textContent = LOGOS[st.logoIdx][0]; }
    } else if (st.phase === 'results') {
      const sorted = [...st.players].sort((a, b) => b.score - a.score);
      stage.innerHTML = scoreCards(st, null, true) + `<div class="floor"><div class="speaker-box left">🔊</div><div class="speaker-box right">🔊</div>
        <div class="crowd">${sorted.map((p) => `<div class="crowd-p">${charEl(p.char, 70, true)}<div class="gain">+${st.gains[p.id] || 0}</div></div>`).join('')}</div></div>
        ${st.mode === 'hang' && st.hang ? `<div class="hang-res">${stickSVG(st.hang.misses, !st.hang.solved)}<div><div class="cat light">${st.hang.solved ? t('solved') : esc(t('notSolved', { name: (st.players.find((x) => x.id === st.drawer) || {}).name || '?' }))}</div><div class="meme-title light">${esc(st.hang.mask.join(''))}</div></div></div>` :
          st.mode === 'guess' && st.word >= 0 ? `<div class="cat light">${t('wordWas')}</div><div class="meme-title light">${esc(wordName(st.word))}</div>` : `<h2>${t('results')}</h2>`}`;
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
    const ctx = ac(), start = ctx.currentTime + 0.08;           // Zeitpunkt, an dem der Zeiger links startet
    const lat = ctx.outputLatency || ctx.baseLatency || 0;      // Verzögerung bis der Ton aus dem Lautsprecher kommt
    let raf = 0;
    const loop = () => { const cv = getCanvas(); if (cv) drawWave(cv, refPk, recPk, Math.max(0, ctx.currentTime - start - lat) / total, lf); raf = requestAnimationFrame(loop); };
    loop();
    return playBuffer(buf, onLevel, start + lead).then(() => { cancelAnimationFrame(raf); const cv = getCanvas(); if (cv) drawWave(cv, refPk, recPk, -1, lf); });
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
    tick(520);
    if (!micOk) { const h2 = $('#rec-hint'); if (h2) h2.textContent = t('micDenied'); toHost({ t: 'rec', round, score: 0, wav: null, sec: 0 }); return; }
    const sec = ref.buf.duration, total = LEAD + sec, N = 120, recPk = new Array(N).fill(0);
    // Alles läuft nach der Aufnahme-Uhr: Zeiger, LOS! und pinke Welle sind deckungsgleich
    let lastI = 0, recNow = 0, lastPerf = performance.now(), losShown = false;
    const showLos = () => {
      losShown = true; tick(880);
      const cd = $('#wave-cd'); if (cd) { cd.textContent = t('go'); cd.classList.add('go'); setTimeout(() => { cd.textContent = ''; cd.classList.remove('go'); }, 700); }
      const h1 = $('#rec-hint'); if (h1) h1.textContent = '🎙️ ' + t('recording');
    };
    const rec = recordFor(total + 0.6, (lv, recSec, chunkSec) => {
      recNow = recSec; lastPerf = performance.now();
      if (!losShown && recSec >= LEAD) showLos();
      const el = recSec - chunkSec / 2; // Mitte des gerade aufgenommenen Stücks
      if (el < LEAD) return; // im Vorlauf noch nichts zeichnen – erst ab der gelben Linie
      const i = Math.min(N - 1, Math.floor(el / total * N));
      if (lastI === 0) lastI = Math.floor(LEAD / total * N);
      for (let k = lastI; k <= i; k++) recPk[k] = Math.max(recPk[k], Math.min(1, lv * 1.8)); // Lücken füllen
      lastI = i + 1;
    });
    this.recorder = rec;
    let raf = 0; const loop = () => { const c = $('#wave'); if (c) drawWave(c, ref.peaks, recPk, (recNow + Math.min(0.05, (performance.now() - lastPerf) / 1000)) / total, lf); if (this.recorder === rec) raf = requestAnimationFrame(loop); };
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
      ${paletteHTML()}
      <button class="btn green" id="d-done">✅ ${t('drawDone')}</button><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const d = { strokes: [], color: PALETTE[0], size: 12, eraser: false, cur: null, sent: false, round };
    this.draw = d;
    bindPainter(stage, $('#dcv'), d, null);
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
  toggleEmo(on) {
    const bar = $('#emo-bar'); if (!bar) return;
    if (on && !bar.childElementCount) {
      bar.innerHTML = EMOJIS.map((e, i) => `<button data-e="${i}">${e}</button>`).join('');
      bar.querySelectorAll('button').forEach((b) => b.onclick = () => { const now = Date.now(); if (now - (this.lastEmo || 0) < 250) return; this.lastEmo = now; toHost({ t: 'emo', e: +b.dataset.e }); });
    }
    bar.classList.toggle('hidden', !on); document.body.classList.toggle('emo-on', on);
  },
  // ---------------- Malen & Raten ----------------
  renderChoose() {
    const st = this.state, stage = $('#stage'), dr = st.players.find((x) => x.id === st.drawer);
    if (st.drawer === net.myId) {
      stage.innerHTML = `<div class="cat">${t(st.mode === 'hang' ? 'chooseHang' : 'chooseWord')}</div><div class="choices" id="choices"></div>` + (st.mode === 'hang' ? `<div class="cat">${t('ownWord')}</div>
        <form class="g-form" id="own-f"><input id="own-w" maxlength="24" autocomplete="off" spellcheck="false" placeholder="${t('ownPh')}"><button class="btn small primary">OK</button></form>` : '');
      const of = $('#own-f'); if (of) of.onsubmit = (e) => { e.preventDefault(); const w = cleanHangWord($('#own-w').value, lang); if (!w) { toast(t('badWord')); return; } if (this.chooseSent === st.turn) return; this.chooseSent = st.turn; toHost({ t: 'choose', own: w }); of.querySelector('button').disabled = true; };
      this.updateChoose();
    } else {
      stage.innerHTML = `<div class="choose-wait">${dr ? charEl(dr.char, 120, true) : ''}<h2>${esc(t('choosing', { name: dr ? dr.name : '?' }))}</h2></div>`;
    }
  },
  updateChoose() {
    const st = this.state, el = $('#choices'); if (!el || el.childElementCount || !st.choices) return;
    el.innerHTML = st.choices.map((w) => `<button class="btn choice" data-w="${w}"><span>${esc(wordName(w))}</span><small>${'★'.repeat((WORDS[w] || [0, 0, 1])[2])}</small></button>`).join('');
    el.querySelectorAll('.choice').forEach((b) => b.onclick = () => { if (this.chooseSent === st.turn) return; this.chooseSent = st.turn; el.querySelectorAll('.choice').forEach((x) => x.disabled = x !== b); toHost({ t: 'choose', w: +b.dataset.w }); });
  },
  renderGuess() {
    const st = this.state, stage = $('#stage'), me = st.drawer === net.myId, dr = st.players.find((x) => x.id === st.drawer);
    if (this.liveTurn !== st.turn) { this.live = []; this.liveTurn = st.turn; }
    if (this.chatTurn !== st.turn) { this.chat = []; this.chatTurn = st.turn; }
    stage.innerHTML = `<div class="g-head"><span class="g-who">${me ? t('youDraw') : esc(t('drawsNow', { name: dr ? dr.name : '?' }))}</span><span class="g-word" id="g-word"></span></div>
      <div class="draw-wrap"><canvas id="gcv" width="800" height="600"></canvas></div>
      ${me ? paletteHTML() + `<button class="btn green" id="g-mark">${t('guessedBtn')}</button><div class="g-chat small" id="g-chat"></div>` :
        `<div class="g-chat" id="g-chat"></div><form class="g-form" id="g-form"><input id="g-in" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('guessPh')}"><button class="btn small primary">➤</button></form>`}`;
    if (me) {
      const d = { strokes: [], color: PALETTE[0], size: 12, eraser: false, cur: null, sent: false };
      this.draw = null; this.opQ = [];
      bindPainter(stage, $('#gcv'), d, (op) => { const last = this.opQ[this.opQ.length - 1]; if (op.o === 'p' && last && last.o === 'p' && last.p.length < 380) last.p.push(...op.p); else this.opQ.push(op); });
      clearInterval(this.opTimer);
      const turn = st.turn;
      this.opTimer = setInterval(() => { if (!this.opQ.length) return; const ops = this.opQ; this.opQ = []; toHost({ t: 'ops', turn, ops }); }, 80);
      $('#g-mark').onclick = () => this.markDialog();
      this.renderChat();
    } else {
      this.redrawLive(); this.renderChat();
      $('#g-form').onsubmit = (e) => { e.preventDefault(); const i = $('#g-in'); const v = i.value.trim(); if (!v) return; toHost({ t: 'guess', text: v }); i.value = ''; };
    }
    this.updateGuessInfo();
  },
  updateGuessInfo() {
    const st = this.state, el = $('#g-word'); if (!el) return;
    el.textContent = st.word >= 0 ? wordName(st.word) : (st.hint || '');
    el.classList.toggle('known', st.word >= 0);
    const mine = st.players.find((x) => x.id === net.myId);
    const f = $('#g-form'); if (f && mine && mine.done && !f.classList.contains('done')) { f.classList.add('done'); f.innerHTML = `<div class="g-ok">${t('youGuessed')}</div>`; }
  },
  markDialog() {
    const st = this.state; if (!st || st.phase !== 'guess') return;
    const left = st.players.filter((x) => x.id !== net.myId && !x.done);
    const b = modal(`<h3>${t('whoGuessed')}</h3>${left.length ? `<div class="mark-list">${left.map((x) => `<button class="btn mark" data-id="${esc(x.id)}">${charEl(x.char, 30, false)}<span>${esc(x.name)}</span></button>`).join('')}</div>` : `<p>${t('nobodyLeft')}</p>`}<button class="btn" id="cl">${t('close')}</button>`);
    b.querySelectorAll('.mark').forEach((x) => x.onclick = () => { toHost({ t: 'mark', pid: x.dataset.id }); closeModal(); });
    b.querySelector('#cl').onclick = closeModal;
  },
  applyLive(turn, ops) {
    if (!Array.isArray(ops)) return;
    if (turn !== this.liveTurn) { this.live = []; this.liveTurn = turn; }
    const cv = $('#gcv'), ctx = cv && this.state && this.state.drawer !== net.myId ? cv.getContext('2d') : null;
    for (const raw of ops) {
      const o = cleanOp(raw); if (!o) continue;
      const last = this.live[this.live.length - 1], from = last ? last.p.length : 0;
      applyOp(this.live, o);
      if (!ctx) continue;
      if (o.o === 'u' || o.o === 'x') { this.redrawLive(); continue; }
      const s = this.live[this.live.length - 1]; if (!s) continue;
      if (o.o === 's') drawStroke(ctx, s);
      else { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(s.p[from - 2], s.p[from - 1]); for (let i = from; i < s.p.length; i += 2) ctx.lineTo(s.p[i], s.p[i + 1]); ctx.stroke(); }
    }
  },
  redrawLive() {
    const cv = $('#gcv'); if (!cv || (this.state && this.state.drawer === net.myId)) return;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600); for (const s of this.live) drawStroke(ctx, s);
  },
  addChat(m) {
    if (this.state && this.chatTurn !== this.state.turn) { this.chat = []; this.chatTurn = this.state.turn; }
    this.chat.push(m.sys ? { sys: true, text: t(m.sys, { name: m.name }) } : { name: m.name, text: m.text });
    if (this.chat.length > 40) this.chat.shift();
    this.renderChat();
    if (m.sys === 'guessedIt') tick(990);
  },
  renderChat() {
    const el = $('#g-chat'); if (!el) return;
    el.innerHTML = this.chat.map((c) => c.sys ? `<div class="sys">${esc(c.text)}</div>` : `<div><b>${esc(c.name)}:</b> ${esc(c.text)}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  },
  // ---------------- Schätzen ----------------
  async renderEstimate() {
    const st = this.state, stage = $('#stage'), round = st.round;
    stage.innerHTML = `<div class="hint">${t('loadingQ')}</div>`;
    try { await ensureQuestions(); } catch (e) { toast(t('netError')); return; }
    if (!this.state || this.state.phase !== 'estimate' || this.state.round !== round) return;
    const q = QUESTIONS[st.qIdx], unit = lang === 'am' ? q[4] : q[3];
    stage.innerHTML = `<div class="cat">${t('modeEst')}</div><div class="est-q">${esc(q[lang === 'am' ? 1 : 0])}</div><div class="logo-pick" id="est-box"></div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const box = $('#est-box');
    const locked = () => { box.innerHTML = `<div class="picked">${t('yourEst')} <b>${esc(q[5] === 'y' ? String(this.myEst.v) : fmtNum(this.myEst.v))}${unit ? ' ' + esc(unit) : ''}</b> 🔒</div>`; };
    if (this.myEst && this.myEst.round === round && this.myEst.mix === st.mix && this.myEst.q === st.qIdx) { locked(); return; }
    box.innerHTML = `<form class="g-form" id="est-f"><input id="est-in" inputmode="decimal" autocomplete="off" placeholder="${t('estPh')}"><span class="unit">${esc(unit)}</span></form><button class="btn primary" id="est-send">${t('estSend')}</button>`;
    const send = (e) => { if (e) e.preventDefault(); const v = parseNum($('#est-in').value); if (v == null) { toast(t('badNum')); return; }
      this.myEst = { round, v: q[5] === 'y' ? Math.round(v) : v, mix: st.mix, q: st.qIdx }; toHost({ t: 'est', round, v: this.myEst.v }); locked(); };
    $('#est-f').onsubmit = send; $('#est-send').onclick = send;
  },
  // ---------------- Galgenmännchen ----------------
  renderHang() {
    const st = this.state, stage = $('#stage'), me = st.drawer === net.myId, dr = st.players.find((x) => x.id === st.drawer), h = st.hang; if (!h) return;
    const keys = h.lang === 'am' ? KEYS_AM : KEYS_DE;
    stage.innerHTML = `<div class="g-who">${me ? t('yourWord') : esc(t('hangChose', { name: dr ? dr.name : '?' }))}</div>
      <div class="hang-top"><div id="h-stick"></div><div class="h-miss" id="h-miss"></div></div>
      <div class="h-word" id="h-word"></div>${me ? `<div class="note h-legend"><b class="lg-got">A</b> ${t('hangGot')} · <b class="lg-pend">A</b> ${t('hangPend')}</div>` : ''}<div class="hint" id="h-turn"></div>
      <div class="keyb${h.lang === 'am' ? ' am' : ''}" id="keyb">${keys.map((k) => `<button class="key" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="done-list" id="h-counts"></div>`;
    stage.querySelectorAll('.key').forEach((b) => b.onclick = () => { const s2 = this.state; if (!s2.hang || s2.hang.cur !== net.myId || b.disabled) return; stage.querySelectorAll('.key').forEach((x) => x.disabled = true); toHost({ t: 'letter', k: b.dataset.k }); });
    this.hangMiss = -1; this.updateHang();
  },
  updateHang() {
    const st = this.state, h = st.hang; if (!h || !$('#h-word')) return;
    if (h.misses !== this.hangMiss) { $('#h-stick').innerHTML = stickSVG(h.misses, false); if (this.hangMiss >= 0 && h.misses > this.hangMiss) tick(220); this.hangMiss = h.misses; }
    $('#h-miss').textContent = `${t('misses')} ${h.misses}/${HANG_MAX}`;
    // Wörter nicht mitten drin umbrechen; wer das Wort ausgesucht hat (full), sieht erratene Buchstaben grün, offene blass
    const groups = [[]]; h.mask.forEach((c, i) => { if (c === ' ') groups.push([]); else groups[groups.length - 1].push(i); });
    const longest = Math.max(...groups.map((g) => g.length));
    const el = $('#h-word'); el.style.setProperty('--n', Math.max(8, longest)); el.classList.toggle('owner', !!h.full);
    const cls = (i) => (!h.full || !h.open ? '' : h.open[i] ? 'got' : 'pend');
    el.innerHTML = groups.map((g) => `<div class="hw">${g.map((i) => `<span class="${cls(i)}">${h.mask[i] === '_' ? '' : esc(h.mask[i])}</span>`).join('')}</div>`).join('');
    const cur = st.players.find((x) => x.id === h.cur), myTurn = h.cur === net.myId;
    const tu = $('#h-turn'); tu.textContent = myTurn ? t('yourLetter') : (cur ? t('letterTurn', { name: cur.name }) : ''); tu.classList.toggle('myturn', myTurn);
    if (myTurn && this.hangTurnTick !== st.remaining) { this.hangTurnTick = st.remaining; }
    document.querySelectorAll('#keyb .key').forEach((b) => { const k = b.dataset.k, used = h.guessed.includes(k);
      b.classList.toggle('hit', used && !h.wrong.includes(k)); b.classList.toggle('miss', h.wrong.includes(k)); b.disabled = used || !myTurn; });
    $('#h-counts').innerHTML = st.players.filter((x) => x.id !== st.drawer).map((x) => `<span class="${x.id === h.cur ? 'ok' : ''}">${x.id === h.cur ? '👉 ' : ''}${esc(x.name)}: ${h.counts[x.id] || 0}</span>`).join('');
  },
  // ---------------- Farbe treffen ----------------
  renderColor() {
    const st = this.state, stage = $('#stage'), round = st.round;
    let run = this.colRun;
    if (!run || run.round !== round || run.mix !== st.mix) run = this.colRun = { round, mix: st.mix, h: rnd(360), s: 50, l: 50, sent: false };
    stage.innerHTML = `<div class="cat">${t('colMix')}</div><div class="col-big" id="c-sw"></div>
      <div class="col-sl" id="c-sl">${[['h', 'colH', 360], ['s', 'colS', 100], ['l', 'colL', 100]].map(([k, lab, max]) => `<label>${t(lab)}<input type="range" id="c-${k}" min="0" max="${max}" step="1" value="${run[k]}"></label>`).join('')}</div>
      <div id="c-box"><button class="btn primary" id="c-go">${t('colGo')}</button></div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const paint = () => {
      $('#c-sw').style.background = hslCss(run);
      $('#c-h').style.background = `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${run.s}% ${run.l}%)`).join(',')})`;
      $('#c-s').style.background = `linear-gradient(90deg, hsl(${run.h} 0% ${run.l}%), hsl(${run.h} 100% ${run.l}%))`;
      $('#c-l').style.background = `linear-gradient(90deg, #000, hsl(${run.h} ${run.s}% 50%), #fff)`;
    };
    const lock = () => { $('#c-box').innerHTML = `<div class="picked">✅ ${t('colDone')}</div>`; stage.querySelectorAll('#c-sl input').forEach((i) => i.disabled = true); };
    ['h', 's', 'l'].forEach((k) => { $('#c-' + k).oninput = (e) => { if (run.sent) return; run[k] = +e.target.value; paint(); }; });
    paint(); if (run.sent) { lock(); return; }
    $('#c-go').onclick = () => { if (run.sent || !this.state || this.state.phase !== 'color') return; run.sent = true; toHost({ t: 'col', round, h: run.h, s: run.s, l: run.l }); tick(880); lock(); };
  },
  // ---------------- Perfekter Kreis ----------------
  renderCircle() {
    const st = this.state, stage = $('#stage'), round = st.round;
    let run = this.circRun;
    if (!run || run.round !== round || run.mix !== st.mix) run = this.circRun = { round, mix: st.mix, tries: 0, best: -1, last: null };
    stage.innerHTML = `<div class="cat">${t('modeCircle')}</div><canvas class="halve-cv" id="c-cv" width="320" height="320"></canvas>
      <div class="bal-info" id="c-res"></div><div class="hint" id="c-msg">${t('circHint', { n: CIRC_TRIES })}</div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const cv = $('#c-cv'), g = cv.getContext('2d');
    const info = () => {
      const left = CIRC_TRIES - run.tries;
      $('#c-res').innerHTML = run.last ? `<b class="${run.last.pct >= 90 ? 'ok' : ''}">${t('circRound', { p: fmtNum(run.last.pct) })}</b>` : '';
      $('#c-msg').textContent = left <= 0 ? `${t('circBest', { p: fmtNum(run.best) })} – ${t('colDone')}` : run.tries ? `${t('circLeft', { n: left })} · ${t('circBest', { p: fmtNum(run.best) })}` : t('circHint', { n: CIRC_TRIES });
    };
    const showLast = () => { g.clearRect(0, 0, 320, 320); if (!run.last) return;
      const { P, cx, cy, r } = run.last; g.setLineDash([6, 6]); g.strokeStyle = '#22b35e'; g.lineWidth = 2; g.beginPath(); g.arc(cx * 320, cy * 320, r * 320, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      drawStroke(g, P.map(([x, y]) => [x * 320, y * 320]), '#7b2ff7', 6); };
    showLast(); info();
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    let cur = null;
    const alive = () => this.circRun === run && this.state && this.state.phase === 'circle' && this.state.round === round;
    cv.onpointerdown = (e) => { if (run.tries >= CIRC_TRIES || !alive()) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [pos(e)]; g.clearRect(0, 0, 320, 320); $('#c-res').innerHTML = ''; };
    cv.onpointermove = (e) => { if (!cur) return; const p = pos(e); cur.push(p); const n = cur.length; if (n > 1) drawStroke(g, [cur[n - 2], p].map(([x, y]) => [x * 320, y * 320]), '#7b2ff7', 6); };
    cv.onpointerup = cv.onpointercancel = () => {
      if (!cur) return; const raw = cur; cur = null;
      const sc = circleScore(raw);
      if (!sc.ok) { $('#c-msg').textContent = t(sc.why || 'circOpen'); tick(180); setTimeout(() => { if (alive()) { showLast(); info(); } }, 1400); return; }
      run.tries++; run.last = Object.assign(sc, { P: raw }); run.best = Math.max(run.best, sc.pct);
      const step = Math.max(1, Math.ceil(raw.length / 80)), pts = []; for (let i = 0; i < raw.length; i += step) pts.push(raw[i][0], raw[i][1]);
      toHost({ t: 'circ', round, pct: sc.pct, pts }); tick(sc.pct >= 90 ? 1175 : 660);
      showLast(); info();
    };
  },
  // ---------------- Wippe ----------------
  renderBalance() {
    const st = this.state, stage = $('#stage'), round = st.round, L = st.balL, obj = st.balObj;
    let run = this.balRun;
    if (!run || run.round !== round || run.mix !== st.mix) run = this.balRun = { round, mix: st.mix, x: 1, sent: null };
    stage.innerHTML = `<div class="cat">${t('modeBal')}</div><div class="bal-wrap" id="b-wrap"></div>
      <div class="bal-info" id="b-info"></div><div class="hint" id="b-msg">${t('balHint')}</div>
      <div id="b-box"><button class="btn primary big-btn" id="b-go">${t('balGo')}</button></div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const draw = (ang, held) => { const w = $('#b-wrap'); if (w) w.innerHTML = balSvg(L, obj, run.x, ang, { held }); };
    const alive = () => this.balRun === run && this.state && this.state.phase === 'balance' && this.state.round === round;
    const play = () => {
      const h = balHold(L, obj, run.x), maxA = 13, t0 = performance.now() - (Date.now() - run.sent.at);
      $('#b-box').innerHTML = ''; $('#b-msg').textContent = '';
      const step = (now) => {
        if (!alive() || !$('#b-wrap')) return;
        const tt = Math.min((now - t0) / 1000, BAL_HOLD);
        let ang;
        if (h.perfect) ang = Math.sin(tt * 5) * 1.2 * Math.exp(-tt * 0.6);
        else ang = h.dir * maxA * Math.min(1, (tt / h.t) ** 2);
        draw(ang, false);
        const info = $('#b-info');
        if (h.perfect) info.innerHTML = tt >= BAL_HOLD ? `<b class="ok">${t('balPerfect')}</b>` : t('balHolds', { s: fmtNum(Math.floor(tt * 10) / 10) });
        else if (tt < h.t) info.textContent = t('balHolds', { s: fmtNum(Math.floor(tt * 10) / 10) });
        else { if (!run.bumped) { run.bumped = true; tick(130); } info.innerHTML = `<b class="bad">${t('balFell', { s: fmtNum(h.t) })}</b>`; return; }
        if (tt >= BAL_HOLD) { if (!run.won) { run.won = true; tick(1046); setTimeout(() => tick(1318), 130); } return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    draw(0, true);
    $('#b-info').innerHTML = `<b>${fmtNum(L.kg)} kg</b> ⟷ <b>${obj[0] === 'DB' ? '🏋️' : obj[0]} ${fmtNum(obj[1])} kg</b>`;
    if (run.sent) { play(); return; }
    // Gegenstand mit dem Finger auf dem rechten Arm verschieben
    const wrap = $('#b-wrap'); let dragging = false;
    const setX = (e) => { const sv = wrap.querySelector('svg'), r = sv.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * 360;
      run.x = Math.max(0.05, Math.min(1, (px - 180) / 150)); draw(0, true); };
    wrap.onpointerdown = (e) => { if (run.sent) return; e.preventDefault(); dragging = true; wrap.setPointerCapture(e.pointerId); setX(e); };
    wrap.onpointermove = (e) => { if (dragging && !run.sent) setX(e); };
    wrap.onpointerup = wrap.onpointercancel = () => { dragging = false; };
    $('#b-go').onclick = () => {
      if (run.sent || !alive()) return;
      run.sent = { x: run.x, at: Date.now() }; toHost({ t: 'bal', round, x: run.x }); tick(660); play();
    };
  },
  // ---------------- Halbieren ----------------
  renderHalve() {
    const st = this.state, stage = $('#stage'), round = st.round;
    stage.innerHTML = `<div class="cat">${t('modeHalve')}</div><canvas class="halve-cv" id="h-cv" width="${HALVE_PX}" height="${HALVE_PX}"></canvas>
      <div class="hint" id="h-msg">${t('halveHint')}</div><div id="h-box"><button class="btn primary big-btn" id="h-go" disabled>${t('halveCut')}</button></div>
      <div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const cv = $('#h-cv'), sh = halveShape(st.halveObj, st.halveRot);
    let run = this.halveRun;
    if (!run || run.round !== round || run.mix !== st.mix) run = this.halveRun = { round, mix: st.mix, line: null, sent: null };
    const show = () => {
      if (run.sent) { drawHalve(cv, sh, run.sent.line, []); $('#h-box').innerHTML = `<div class="picked">✅ ${t('halveDone')}</div>`; $('#h-msg').textContent = ''; return; }
      drawHalve(cv, sh, null, run.line ? [{ line: run.line, color: '#222' }] : []);
      $('#h-go').disabled = !run.line;
    };
    show(); if (run.sent) return;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    let a = null;
    cv.onpointerdown = (e) => { if (run.sent) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); a = pos(e); };
    cv.onpointermove = (e) => { if (!a || run.sent) return; const b = pos(e); if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.04) { run.line = [...a, ...b]; show(); } };
    cv.onpointerup = cv.onpointercancel = () => { a = null; };
    $('#h-go').onclick = () => {
      if (!run.line || run.sent || !this.state || this.state.phase !== 'halve') return;
      const pct = halveSplit(sh, run.line);
      if (pct <= 0.5) { $('#h-msg').textContent = t('halveMiss'); tick(180); return; }
      run.sent = { line: run.line, pct }; toHost({ t: 'cut', round, pct, line: run.line }); tick(1046); show();
    };
  },
  // ---------------- Reaktion ----------------
  renderReact() {
    const st = this.state, stage = $('#stage'), round = st.round;
    let run = this.reactRun;
    if (!run || run.round !== round || run.mix !== st.mix) run = this.reactRun = { round, mix: st.mix, goLocal: Date.now() + st.goIn, greenAt: 0, ms: null, tm: 0 };
    stage.innerHTML = `<div class="cat">${t('modeReact')}</div><div class="react-pad wait" id="r-pad"><span id="r-txt">${t('reactWait')}</span></div>
      <div class="hint" id="r-hint">${t('reactHint')}</div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    const pad = $('#r-pad'), txt = $('#r-txt');
    const alive = () => this.state && this.state.phase === 'react' && this.state.round === round && pad.isConnected;
    const finish = (ms) => {
      run.ms = ms; clearTimeout(run.tm); toHost({ t: 'react', round, ms });
      pad.className = 'react-pad ' + (ms < 0 ? 'early' : 'done');
      txt.innerHTML = ms < 0 ? t('tooEarly') : `${t('yourTime')}<br><b>${ms} ms</b>`;
      tick(ms < 0 ? 180 : 880);
    };
    if (run.ms != null) { pad.className = 'react-pad ' + (run.ms < 0 ? 'early' : 'done'); txt.innerHTML = run.ms === -2 ? '⌛ ' + t('noReact') : run.ms < 0 ? t('tooEarly') : `${t('yourTime')}<br><b>${run.ms} ms</b>`; return; }
    if (run.greenAt) { pad.className = 'react-pad go'; txt.textContent = t('reactNow'); }
    const goGreen = () => {
      if (!alive() || run.ms != null) return;
      pad.className = 'react-pad go'; txt.textContent = t('reactNow');
      requestAnimationFrame((ts) => { run.greenAt = ts; });     // ab dem Moment, in dem Grün zu sehen ist
      run.tm = setTimeout(() => { if (alive() && run.ms == null) { run.ms = -2; pad.className = 'react-pad early'; txt.textContent = '⌛ ' + t('noReact'); } }, (REACT_WINDOW - 0.5) * 1000);
    };
    pad.onpointerdown = (e) => {
      e.preventDefault(); if (run.ms != null || !alive()) return;
      if (!run.greenAt) { if (pad.classList.contains('go')) return; finish(-1); return; }
      finish(Math.max(1, Math.round(e.timeStamp && e.timeStamp > run.greenAt ? e.timeStamp - run.greenAt : performance.now() - run.greenAt)));
    };
    clearTimeout(run.tm);
    run.tm = setTimeout(goGreen, Math.max(0, run.goLocal - Date.now()));
  },
  // ---------------- Farbfolge ----------------
  renderSimon() {
    const st = this.state, stage = $('#stage'), round = st.round;
    const mode = st.mode, nPads = seqPads(mode), start = seqStart(mode), nine = nPads === 9;
    stage.innerHTML = `<div class="cat">${t(MODE_KEY[mode])} · <span id="s-lv"></span></div><div class="hint" id="s-msg">${t('simonReady')}</div>
      <div class="simon${nine ? ' nine' : ''}" id="simon">${[...Array(nPads).keys()].map((i) => `<button class="sp ${nine ? 'm' : 'c' + i}" data-i="${i}" disabled></button>`).join('')}</div>
      <div class="note">${t(nine ? 'memHint' : 'simonHint')}</div><div class="done-list" id="done-list"></div>`;
    const run0 = this.simonRun;
    if (run0 && run0.round === round && run0.mix === st.mix && run0.mode === mode) { // läuft schon (nur neu gezeichnet)
      if (!run0.busy && !run0.over) document.querySelectorAll('#simon .sp').forEach((b) => b.disabled = false);
      this.updateSimon(); return;
    }
    const run = this.simonRun = { round, mix: st.mix, mode, seq: st.simonSeq || [], lv: 0, input: [], busy: true, over: false };
    const alive = () => this.simonRun === run && this.state && this.state.phase === 'simon' && this.state.round === round;
    const FREQ = nine ? [262, 294, 330, 349, 392, 440, 494, 523, 587] : [392, 523, 659, 784];
    const pads = () => [...document.querySelectorAll('#simon .sp')];
    const msg = (k, v) => { const m = $('#s-msg'); if (m) m.textContent = t(k, v); };
    const flash = async (i, ms) => { const b = pads()[i]; if (b) b.classList.add('lit'); tick(FREQ[i]); await sleep(ms); const b2 = pads()[i]; if (b2) b2.classList.remove('lit'); };
    const show = async () => {
      run.busy = true; run.input = []; pads().forEach((b) => b.disabled = true);
      msg('simonWatch'); this.updateSimon();
      await sleep(700);
      const len = run.lv + start, on = nine ? Math.max(300, 520 - run.lv * 20) : Math.max(260, 560 - run.lv * 25);
      for (let k = 0; k < len; k++) { if (!alive()) return; await flash(run.seq[k], on); await sleep(140); }
      if (!alive()) return;
      run.busy = false; pads().forEach((b) => b.disabled = false); msg('simonYour');
    };
    stage.onpointerdown = async (e) => {
      const b = e.target.closest && e.target.closest('.sp'); if (!b || b.disabled || run.busy || run.over || !alive()) return;
      e.preventDefault();
      const i = +b.dataset.i, k = run.input.length; run.input.push(i);
      if (run.seq[k] !== i) {
        run.over = true; pads().forEach((x) => x.disabled = true); tick(150); setTimeout(() => tick(110), 160);
        b.classList.add('wrong'); msg('simonOut', { n: run.lv }); toHost({ t: 'simon', round, done: true }); return;
      }
      flash(i, 180);
      if (run.input.length === run.lv + start) {
        run.lv++; toHost({ t: 'simon', round, lv: run.lv });
        if (run.lv + start > run.seq.length) { run.over = true; msg('simonMax'); toHost({ t: 'simon', round, done: true }); return; }
        run.busy = true; pads().forEach((x) => x.disabled = true); msg('simonGood'); await sleep(500); if (alive()) show();
      }
    };
    show();
  },
  // ---------------- Turm stapeln ----------------
  // Für alle gleich: gleiche Breite am Start, gleiche Geschwindigkeit pro Level, abwechselnd von links/rechts
  renderStack() {
    const st = this.state, stage = $('#stage'), round = st.round, run0 = this.simonRun;
    const same = run0 && run0.round === round && run0.mix === st.mix && run0.mode === 'stack';
    if (same && $('#st-cv')) { this.updateSimon(); return; }
    stage.innerHTML = `<div class="cat">${t('modeStack')} · <span id="s-lv"></span></div><canvas id="st-cv" class="stack-cv" width="320" height="440"></canvas>
      <div class="hint" id="s-msg">${t('stackHint')}</div><div class="done-list" id="done-list"></div>`;
    if (same) { this.updateSimon(); return; } // Spiel läuft weiter und malt in die neue Fläche
    const run = this.simonRun = { round, mix: st.mix, mode: 'stack', lv: 0, over: false };
    const W = 320, H = 440, BH = 24, cap = SIMON_LEN - 2;
    const alive = () => this.simonRun === run && this.state && this.state.phase === 'simon' && this.state.round === round;
    const msg = (k, v) => { const m = $('#s-msg'); if (m) m.textContent = t(k, v); };
    const blocks = [{ x: 60, w: 200 }], bits = [];
    let cur = null, cam = 0, flash = 0, last = performance.now();
    const color = (i) => `hsl(${(i * 24 + 190) % 360} 75% 58%)`;
    const spawn = () => { const top = blocks[blocks.length - 1], left = blocks.length % 2 === 1;
      cur = { x: left ? -30 : W - top.w + 30, w: top.w, dir: left ? 1 : -1, v: 150 + run.lv * 18 }; };
    const yOf = (i) => H - 16 - (i + 1) * BH + cam;
    const frame = (now) => {
      if (!alive()) return;
      const dt = Math.min(50, now - last) / 1000; last = now;
      if (cur) { cur.x += cur.dir * cur.v * dt; const lo = -30, hi = W - cur.w + 30;
        if (cur.x < lo) { cur.x = lo; cur.dir = 1; } if (cur.x > hi) { cur.x = hi; cur.dir = -1; } }
      cam += (Math.max(0, (blocks.length + 1) * BH - (H - 150)) - cam) * Math.min(1, dt * 6);
      for (const b of bits) { b.vy += 900 * dt; b.y += b.vy * dt; b.x += b.vx * dt; }
      const cv = $('#st-cv'); if (cv) {
        const g = cv.getContext('2d'); g.clearRect(0, 0, W, H);
        g.fillStyle = '#ece6f7'; g.fillRect(0, H - 16 + cam, W, 16 + 999);
        const box = (x, y, w, c, i) => { g.fillStyle = c; g.fillRect(x, y, w, BH - 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, w, 5); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x, y + BH - 7, w, 5); };
        blocks.forEach((b, i) => { const y = yOf(i); if (y > -BH && y < H) box(b.x, y, b.w, i ? color(i) : '#5d566b', i); });
        for (const b of bits) box(b.x, b.y + cam, b.w, b.c);
        if (cur) box(cur.x, yOf(blocks.length), cur.w, color(blocks.length));
        if (flash > 0) { flash -= dt; const tp = blocks[blocks.length - 1]; g.strokeStyle = `rgba(255,255,255,${flash * 2})`; g.lineWidth = 4; g.strokeRect(tp.x - 3, yOf(blocks.length - 1) - 3, tp.w + 6, BH + 4); }
        g.fillStyle = '#2b2250'; g.font = '900 28px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(String(run.lv), W / 2, 40);
      }
      for (let i = bits.length - 1; i >= 0; i--) if (bits[i].y > H + 200) bits.splice(i, 1);
      if (!run.over || bits.length) requestAnimationFrame(frame);
    };
    const drop = (e) => {
      if (!cur || run.over || !alive()) return; if (e) e.preventDefault();
      const top = blocks[blocks.length - 1], c = cur, l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w), ov = r - l, y = yOf(blocks.length) - cam;
      cur = null;
      if (ov <= 2) { // ganz daneben: raus
        bits.push({ x: c.x, y, w: c.w, c: color(blocks.length), vy: 0, vx: c.dir * 60 });
        run.over = true; tick(150); setTimeout(() => tick(110), 160); msg('stackOut', { n: run.lv }); toHost({ t: 'simon', round, done: true }); return;
      }
      if (Math.abs(c.x - top.x) <= 4) { blocks.push({ x: top.x, w: top.w }); flash = 0.5; tick(1318); msg('stackPerfect'); }
      else {
        blocks.push({ x: l, w: ov }); tick(520 + Math.min(600, run.lv * 25));
        const piece = c.x < top.x ? { x: c.x, w: top.x - c.x } : { x: r, w: c.x + c.w - r };
        bits.push(Object.assign(piece, { y, c: color(blocks.length - 1), vy: 0, vx: c.x < top.x ? -40 : 40 }));
        msg('stackHint');
      }
      run.lv++; toHost({ t: 'simon', round, lv: run.lv }); this.updateSimon();
      if (run.lv >= cap) { run.over = true; msg('simonMax'); toHost({ t: 'simon', round, done: true }); return; }
      setTimeout(() => { if (alive() && !run.over) spawn(); }, 220);
    };
    stage.onpointerdown = (e) => { if (e.target.closest && e.target.closest('#st-cv, #s-msg, .cat')) drop(e); };
    spawn(); requestAnimationFrame(frame); this.updateSimon();
  },
  // ---------------- Hütchenspiel ----------------
  // Alle bekommen pro Level dieselben Tausch-Züge (aus der Folge vom Host berechnet) – fair für alle.
  renderCups() {
    const st = this.state, stage = $('#stage'), round = st.round;
    const run0 = this.simonRun;
    if (run0 && run0.round === round && run0.mix === st.mix && run0.mode === 'cups' && $('#cups')) { this.updateSimon(); return; }
    stage.innerHTML = `<div class="cat">${t('modeCups')} · <span id="s-lv"></span></div><div class="hint" id="s-msg">${t('simonReady')}</div>
      <div class="cups" id="cups"></div><div class="note">${t('cupsHint')}</div><div class="done-list" id="done-list"></div>`;
    if (run0 && run0.round === round && run0.mix === st.mix && run0.mode === 'cups') { run0.redraw && run0.redraw(); this.updateSimon(); return; }
    const run = this.simonRun = { round, mix: st.mix, mode: 'cups', seq: st.simonSeq || [], lv: 0, busy: true, over: false };
    const alive = () => this.simonRun === run && this.state && this.state.phase === 'simon' && this.state.round === round;
    const msg = (k, v) => { const m = $('#s-msg'); if (m) m.textContent = t(k, v); };
    let n = 3, slotOf = [], ball = 0, picking = false;
    const step = () => { const a = $('#cups'); return a ? a.clientWidth / n : 100; };
    const place = (id, y, sc) => { const w = document.querySelector(`#cups .cupw[data-c="${id}"]`); if (w) w.style.transform = `translate(${slotOf[id] * step()}px, ${y || 0}px) scale(${sc || 1})`; };
    const draw = () => {
      const a = $('#cups'); if (!a) return;
      a.style.setProperty('--n', n);
      a.innerHTML = [...Array(n).keys()].map((id) => `<div class="cupw" data-c="${id}">${id === ball ? '<div class="ball"></div>' : ''}<div class="cup"></div></div>`).join('');
      for (let id = 0; id < n; id++) place(id);
    };
    run.redraw = draw;
    const lift = (id, up) => { const c = document.querySelector(`#cups .cupw[data-c="${id}"] .cup`); if (c) c.classList.toggle('up', up); };
    const speed = (ms) => document.querySelectorAll('#cups .cupw').forEach((w) => w.style.transitionDuration = ms + 'ms');
    const level = async () => {
      run.busy = true; picking = false; this.updateSimon();
      const lv = run.lv;
      // Zufall für dieses Level: für alle gleich
      let x = ((run.seq[lv % run.seq.length] + 1) * 7919 + lv * 104729 + round * 31) >>> 0;
      const r = (k) => { x = (x * 1664525 + 1013904223) >>> 0; return Math.floor(x / 4294967296 * k); };
      n = lv < 3 ? 3 : lv < 7 ? 4 : 5;
      const swaps = 3 + lv * 2, dur = Math.max(170, 620 - lv * 55);
      slotOf = [...Array(n).keys()]; ball = r(n);
      draw(); msg('cupsWatch');
      await sleep(400); if (!alive()) return;
      lift(ball, true); tick(660); await sleep(1100); if (!alive()) return;
      lift(ball, false); await sleep(450);
      for (let k = 0; k < swaps; k++) {
        if (!alive()) return;
        const a = r(n); let b = r(n - 1); if (b >= a) b++;
        const ia = a, ib = b, sa = slotOf[a], sb = slotOf[b]; // zwei Becher (IDs) tauschen ihre Plätze
        // halber Weg: einer vorne, einer hinten – dann tauschen
        speed(dur / 2); const mid = (sa + sb) / 2;
        const wa = document.querySelector(`#cups .cupw[data-c="${ia}"]`), wb = document.querySelector(`#cups .cupw[data-c="${ib}"]`);
        if (wa) { wa.style.zIndex = 3; wa.style.transform = `translate(${mid * step()}px, 14px) scale(1.06)`; }
        if (wb) { wb.style.zIndex = 1; wb.style.transform = `translate(${mid * step()}px, -14px) scale(.9)`; }
        await sleep(dur / 2);
        slotOf[ia] = sb; slotOf[ib] = sa; place(ia); place(ib);
        await sleep(dur / 2 + 30);
      }
      if (!alive()) return;
      speed(250); run.busy = false; picking = true; msg('cupsPick');
    };
    $('#stage').onpointerdown = async (e) => {
      const w = e.target.closest && e.target.closest('#cups .cupw'); if (!w || !picking || run.over || !alive()) return;
      e.preventDefault(); picking = false;
      const id = +w.dataset.c; lift(id, true);
      if (id === ball) {
        tick(880); setTimeout(() => tick(1175), 120); w.classList.add('right');
        run.lv++; toHost({ t: 'simon', round, lv: run.lv }); msg('cupsRight');
        await sleep(1100); if (alive()) level();
      } else {
        tick(150); setTimeout(() => tick(110), 160); w.classList.add('wrong');
        await sleep(350); lift(ball, true);
        run.over = true; msg('cupsWrong', { n: run.lv }); toHost({ t: 'simon', round, done: true });
      }
    };
    level();
  },
  updateSimon() {
    const st = this.state, el = $('#done-list'); if (!st || !el) return;
    const lv = st.simonLv || {}, run = this.simonRun;
    el.innerHTML = [...st.players].sort((a, b) => (lv[b.id] || 0) - (lv[a.id] || 0)).map((p) => `<span class="${p.done ? 'ok' : ''}">${p.done ? '🏁' : '🎮'} ${esc(p.name)}: ${lv[p.id] || 0}</span>`).join('');
    const l = $('#s-lv'); if (l && run) l.textContent = `${t('level')} ${run.lv + 1}`;
  },
  // ---------------- Emoji-Rätsel ----------------
  renderEmoji() {
    const st = this.state, stage = $('#stage'), round = st.round;
    stage.innerHTML = `<div class="cat">${t('emojiQ')}</div><div class="emo-clue">${esc(st.eClue)}</div><div class="e-hint" id="e-hint"></div>
      <div class="logo-pick" id="e-box"><form class="g-form" id="e-f"><input id="e-in" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('emojiPh')}"><button class="btn primary">${t('guessBtn')}</button></form></div>
      <div class="note">${t('emojiHint')}</div><div class="done-list" id="done-list"></div>`;
    $('#e-f').onsubmit = (e) => { e.preventDefault(); const inp = $('#e-in'), v = inp.value.trim(); if (!v || !this.state || this.state.phase !== 'emoji') return; toHost({ t: 'eguess', round, text: v }); inp.value = ''; inp.focus(); };
    this.updateEmoji();
  },
  updateEmoji() {
    const st = this.state; if (!st || !$('#e-box')) return;
    const me = this.me();
    if (me && me.done && st.eWord >= 0 && !$('#e-got')) $('#e-box').innerHTML = `<div class="picked" id="e-got">✅ ${t('youGotIt')}<br><b>${esc(wordName(st.eWord))}</b></div>`;
    const h = $('#e-hint'); if (h) h.innerHTML = st.eHint ? `<span class="e-mask">${esc(st.eHint)}</span> <small>(${t('letters', { n: st.eLen })})</small>` : '';
    const el = $('#done-list'); if (el) el.innerHTML = st.players.map((p) => `<span class="${p.done ? 'ok' : ''}">${p.done ? '✅' : '🤔'} ${esc(p.name)}</span>`).join('');
  },
  // ---------------- Stoppuhr ----------------
  renderTimer() {
    const st = this.state, stage = $('#stage'), round = st.round;
    const run = this.timerRun && this.timerRun.round === round ? this.timerRun : null;
    if (run && run.ms != null) { stage.innerHTML = `<div class="timer-wait">✅ ${t('stopped')}</div><div class="done-list" id="done-list"></div>`; this.updateDone(); return; }
    if (run) { // läuft: nur der Stopp-Knopf
      stage.innerHTML = `<button class="big-btn stop" id="t-stop">${t('stopBtn')}</button>`;
      $('#t-stop').onpointerdown = (e) => { e.preventDefault(); if (run.ms != null) return; run.ms = performance.now() - run.t0; toHost({ t: 'stop', round, ms: run.ms }); tick(660); this.renderTimer(); };
      return;
    }
    stage.innerHTML = `<div class="cat">${t('timerGoal')}</div><div class="timer-big">${fmtSec(st.target)}</div><div class="cat">${t('seconds')}</div>
      <button class="big-btn go" id="t-start">${t('startBtn')}</button><div class="hint">${t('timerHint')}</div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    $('#t-start').onpointerdown = (e) => { e.preventDefault(); this.timerRun = { round, t0: performance.now(), ms: null }; tick(880); this.renderTimer(); };
  },
  // ---------------- Logo-Quiz ----------------
  async renderLogo() {
    const st = this.state, stage = $('#stage'), round = st.round;
    stage.innerHTML = `<div class="cat">${t('logoQ')}</div><div class="logo-box"><canvas id="lcv" width="300" height="300"></canvas><div class="logo-load" id="logo-load">${t('loadingLogos')}</div></div>
      <div class="logo-pick" id="logo-pick"></div><div class="done-list" id="done-list"></div>`;
    this.updateDone();
    try { await ensureLogos(); } catch (e) { toast(t('netError')); return; }
    const alive = () => this.state && this.state.phase === 'logo' && this.state.round === round;
    if (!alive()) return;
    const ld = $('#logo-load'); if (ld) ld.remove();
    const cv = $('#lcv'), idx = st.logoIdx;
    const loop = () => { if (!alive() || !cv.isConnected) return; drawLogo(cv, idx, 1 - (this.deadlineLocal - Date.now()) / (LOGO_TIME * 1000), idx * 31 + round); requestAnimationFrame(loop); };
    loop();
    const pick = $('#logo-pick');
    const showPicked = () => { pick.innerHTML = `<div class="picked">${t('youPicked')} <b>${esc(this.myPick.name)}</b> 🔒</div>`; };
    if (this.myPick && this.myPick.round === round) { showPicked(); return; }
    pick.innerHTML = `<input id="logo-in" maxlength="30" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('logoPh')}"><div class="sug" id="logo-sug"></div>`;
    const inp = $('#logo-in'), sug = $('#logo-sug');
    inp.oninput = () => {
      sug.innerHTML = brandMatches(inp.value).map((n) => `<button class="btn small sug-b">${esc(n)}</button>`).join('');
      sug.querySelectorAll('.sug-b').forEach((b) => b.onclick = () => {
        if (!alive() || (this.myPick && this.myPick.round === round)) return;
        this.myPick = { round, name: b.textContent }; toHost({ t: 'pick', round, name: b.textContent }); showPicked();
      });
    };
  },
  updateTimer() {
    const el = $('#info-timer'), st = this.state;
    if (!st || st.phase === 'lobby' || st.phase === 'end' || st.phase === 'timer' || st.phase === 'react' || st.phase === 'simon') { el.textContent = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = Math.max(0, Math.ceil((this.deadlineLocal - Date.now()) / 1000));
    el.textContent = s; el.classList.toggle('low', ['record', 'draw', 'guess', 'logo', 'hang', 'estimate', 'simon', 'emoji', 'halve', 'balance', 'color', 'circle'].includes(st.phase) && s <= 5);
    if (st.phase === 'draw' && this.draw && !this.draw.sent && this.deadlineLocal - Date.now() < 1500) this.sendDrawing();
  },
};
// ---- Spielmodi, Logos, Raten
const GAME_MODES = ['sound', 'draw', 'guess', 'logo', 'timer', 'hang', 'estimate', 'react', 'simon', 'memory', 'cups', 'emoji', 'halve', 'balance', 'color', 'circle', 'stack'];
const MODES = [...GAME_MODES, 'mix'];
// Emoji-Rätsel: [Emojis, Wort-ID]; das Wort wird über den deutschen Namen in der Wortliste gefunden
const EMOJI_LIST = (() => { const ids = new Map(WORDS.map((w, i) => [w[0].toLowerCase(), i]));
  return (window.EMOJI_Q || []).map(([e, w]) => [e, ids.get(String(w).toLowerCase())]).filter((x) => x[1] != null); })();
const MODE_KEY = { sound: 'modeSound', draw: 'modeDraw', guess: 'modeGuess', logo: 'modeLogo', timer: 'modeTimer', hang: 'modeHang', estimate: 'modeEst', react: 'modeReact', simon: 'modeSimon', memory: 'modeMemory', cups: 'modeCups', halve: 'modeHalve', balance: 'modeBal', color: 'modeColor', circle: 'modeCircle', stack: 'modeStack', emoji: 'modeEmoji', mix: 'modeMix' };
// Strichmännchen: Buchstaben. Amharisch: man wählt die Grundform (z. B. ለ) – dann erscheinen alle Formen (ሉ ሊ ላ ሌ ል ሎ)
const KEYS_DE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ä', 'Ö', 'Ü', 'ß'];
const KEYS_AM = [0x1200, 0x1208, 0x1210, 0x1218, 0x1220, 0x1228, 0x1230, 0x1238, 0x1240, 0x1260, 0x1268, 0x1270, 0x1278, 0x1280, 0x1290, 0x1298, 0x12A0, 0x12A8, 0x12B8, 0x12C8, 0x12D0, 0x12D8, 0x12E0, 0x12E8, 0x12F0, 0x1300, 0x1308, 0x1320, 0x1328, 0x1330, 0x1338, 0x1340, 0x1348, 0x1350].map((c) => String.fromCharCode(c));
const AM_EXTRA = { 0x1248: 0x1240, 0x1288: 0x1280, 0x12B0: 0x12A8, 0x1310: 0x1308 };
function hangKey(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0x1200 && c <= 0x135A) { let base = 0x1200 + Math.floor((c - 0x1200) / 8) * 8; base = AM_EXTRA[base] || base; return KEYS_AM.includes(String.fromCharCode(base)) ? String.fromCharCode(base) : null; }
  if (ch === 'ß') return 'ß';
  const u = ch.toUpperCase(); return KEYS_DE.includes(u) ? u : null;
}
function cleanHangWord(w, lng) {
  let x = String(w || '').trim().replace(/\s+/g, ' ');
  x = lng === 'am' ? x.replace(/[^\u1200-\u137f \-]/g, '') : [...x].map((c) => (c === 'ß' ? c : c.toUpperCase())).join('').replace(/[^A-ZÄÖÜß \-]/g, '');
  x = x.trim(); const letters = [...x].filter((c) => hangKey(c)).length;
  return letters >= 2 && [...x].length <= 24 ? x : '';
}
function stickSVG(n, lost) {
  const face = lost ? '<path d="M81 44l5 5M86 44l-5 5M94 44l5 5M99 44l-5 5" stroke-width="3"/><path d="M83 60q7-5 14 0" stroke-width="3"/>'
    : '<circle cx="84" cy="47" r="2" fill="currentColor" stroke="none"/><circle cx="96" cy="47" r="2" fill="currentColor" stroke="none"/><path d="M84 59q6-5 12 0" stroke-width="3"/>';
  const parts = [
    '<line x1="10" y1="144" x2="62" y2="144"/>', '<line x1="26" y1="144" x2="26" y2="8"/>', '<line x1="24" y1="8" x2="92" y2="8"/><line x1="26" y1="30" x2="48" y2="8"/>', '<line x1="90" y1="8" x2="90" y2="32"/>',
    `<circle cx="90" cy="49" r="17"/>${face}`, '<line x1="90" y1="66" x2="90" y2="106"/>', '<line x1="90" y1="76" x2="72" y2="96"/>', '<line x1="90" y1="76" x2="108" y2="96"/>',
    '<line x1="90" y1="106" x2="76" y2="136"/>', '<line x1="90" y1="106" x2="104" y2="136"/>'];
  return `<svg viewBox="0 0 120 150" class="stick">${parts.map((p, i) => `<g class="${i < n ? 'on' + (i === n - 1 ? ' new' : '') : 'off'}">${p}</g>`).join('')}</svg>`;
}
const TIMER_TARGETS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 2.5, 4.5, 6.5, 7.5];
const fmtSec = (ms) => (ms / 1000).toFixed(2).replace('.', lang === 'am' ? '.' : ',');
const ROUND_OPTS = { sound: [[3, 5, 8, 10, 15], 5], draw: [[3, 5, 8, 10, 15], 5], guess: [[1, 2, 3, 4, 5], 2], logo: [[5, 10, 15, 20, 30], 10], timer: [[3, 5, 8, 10, 15], 5], hang: [[1, 2, 3, 4, 5], 1], estimate: [[5, 10, 15, 20, 30], 10], react: [[3, 5, 8, 10, 15], 5], simon: [[1, 2, 3, 5], 2], memory: [[1, 2, 3, 5], 2], cups: [[1, 2, 3, 5], 2], halve: [[5, 8, 10, 15, 20], 8], balance: [[5, 8, 10, 15, 20], 8], color: [[3, 5, 8, 10, 15], 5], circle: [[2, 3, 5, 8], 3], stack: [[1, 2, 3, 5], 2], emoji: [[5, 10, 15, 20, 30], 10], mix: [[1, 2, 3, 4, 5], 1] };
let logosP = null;
function ensureLogos() {
  if (window.LOGOS) return Promise.resolve();
  if (!logosP) logosP = new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = $('#logos-src').content;
    el.onload = res; el.onerror = () => { logosP = null; rej(new Error('logos')); }; document.head.appendChild(el);
  });
  return logosP;
}
let questionsP = null;
function ensureQuestions() {
  if (window.QUESTIONS) return Promise.resolve();
  if (!questionsP) questionsP = new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = $('#questions-src').content;
    el.onload = res; el.onerror = () => { questionsP = null; rej(new Error('questions')); }; document.head.appendChild(el);
  });
  return questionsP;
}
const fmtNum = (v) => Number(v).toLocaleString(lang === 'am' ? 'en-US' : 'de-DE', { maximumFractionDigits: 3 });
function parseNum(str) {
  let x = String(str).replace(/\s/g, '');
  x = lang === 'am' ? x.replace(/,/g, '') : x.replace(/\./g, '').replace(',', '.');
  const v = parseFloat(x); return isFinite(v) && v >= 0 ? Math.min(v, 1e13) : null;
}
// Markennamen vergleichen: Groß/klein, Akzente und Zeichen egal
const normB = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+]/g, '');
// Wörter vergleichen (Deutsch + Amharisch): ä=ae=a usw.
function wordForms(s) {
  const b = String(s).toLowerCase().replace(/ß/g, 'ss').replace(/[^a-zäöüé\u1200-\u137f0-9]/g, '');
  return new Set([b, b.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue'), b.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/é/g, 'e')]);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[b.length];
}
// 2 = richtig, 1 = knapp daneben, 0 = falsch
function checkGuess(text, w) {
  if (!WORDS[w]) return 0;
  const g = wordForms(text); let near = false;
  for (const target of [WORDS[w][0], WORDS[w][1]]) for (const a of wordForms(target)) for (const b of g) {
    if (a && a === b) return 2;
    if (a.length >= 4 && lev(a, b) === 1) near = true;
  }
  return near ? 1 : 0;
}
// Live-Malen: Befehle s=neuer Strich, p=Punkte anhängen, u=rückgängig, x=alles löschen
function cleanOp(o) {
  if (!o || typeof o !== 'object') return null;
  const pts = (a) => Array.isArray(a) ? a.slice(0, 400).map((v) => clamp(Math.round(+v || 0), 0, 800)) : [];
  if (o.o === 's') return { o: 's', c: /^#[0-9a-f]{6}$/i.test(o.c) ? o.c : '#111111', w: clamp(+o.w || 12, 1, 60), p: pts(o.p).slice(0, 2) };
  if (o.o === 'p') return { o: 'p', p: pts(o.p) };
  if (o.o === 'u' || o.o === 'x') return { o: o.o };
  return null;
}
function applyOp(strokes, o) {
  if (o.o === 's') strokes.push({ c: o.c, w: o.w, p: o.p.slice() });
  else if (o.o === 'p') { const s = strokes[strokes.length - 1]; if (s) s.p.push(...o.p); }
  else if (o.o === 'u') strokes.pop();
  else if (o.o === 'x') strokes.length = 0;
}
// Logo zeichnen: f = 0 (ganz grob verpixelt) … 1 (ganz scharf)
function drawLogo(cv, idx, f, seed) {
  const L = window.LOGOS && LOGOS[idx]; if (!L) return;
  const W = cv.width, ctx = cv.getContext('2d');
  if (cv._idx !== idx) {
    const b = document.createElement('canvas'); b.width = b.height = W; const c = b.getContext('2d');
    const n = parseInt(L[1], 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    c.fillStyle = lum > 0.8 ? '#2b2250' : '#ffffff'; c.fillRect(0, 0, W, W);
    const pad = W * 0.16, sc = (W - 2 * pad) / 24; c.translate(pad, pad); c.scale(sc, sc);
    c.fillStyle = '#' + L[1]; try { c.fill(new Path2D(L[2])); } catch (e) {}
    cv._base = b; cv._idx = idx;
  }
  // Kärtchen öffnen sich nacheinander in zufälliger (auf allen Handys gleicher) Reihenfolge
  if (cv._seed !== seed) {
    let x = (seed * 2654435761) >>> 0; const r = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
    const ord = [...Array(LOGO_GRID * LOGO_GRID).keys()];
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    cv._ord = ord; cv._seed = seed;
  }
  ctx.drawImage(cv._base, 0, 0);
  const N = LOGO_GRID * LOGO_GRID, open = clamp(f, 0, 1) * N, ts = W / LOGO_GRID;
  ctx.font = `900 ${Math.round(ts * 0.5)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  cv._ord.forEach((cell, k) => {
    const a = clamp(1 - (open - k), 0, 1); if (a <= 0) return;   // jedes Kärtchen blendet kurz aus
    const cx = (cell % LOGO_GRID) * ts, cy = Math.floor(cell / LOGO_GRID) * ts;
    ctx.globalAlpha = a; ctx.fillStyle = (cell + Math.floor(cell / LOGO_GRID)) % 2 ? '#6c3ff0' : '#7f55f5';
    ctx.fillRect(cx, cy, ts + 0.5, ts + 0.5);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillText('?', cx + ts / 2, cy + ts / 2 + 1);
  });
  ctx.globalAlpha = 1;
}
function brandMatches(q) {
  const n = normB(q); if (!n) return [];
  const names = window.BRAND_NAMES || [], a = [], b = [];
  for (const x of names) { if (normB(x).startsWith(n)) a.push(x); else if (x.split(/[\s\-&.]+/).some((w) => w.length > 1 && normB(w).startsWith(n))) b.push(x); }
  return a.concat(b).slice(0, 8);
}
// Emojis fliegen über die Bühne
function flyEmoji(e, pid) {
  const layer = $('#emo-layer'); if (!layer || !EMOJIS[e]) return;
  const p = view.state && view.state.players.find((x) => x.id === pid);
  const el = document.createElement('div'); el.className = 'emo-fly';
  el.style.left = (8 + Math.random() * 78) + '%';
  el.innerHTML = `<span>${EMOJIS[e]}</span>${p ? `<small>${esc(p.name)}</small>` : ''}`;
  layer.appendChild(el); setTimeout(() => el.remove(), 2600);
  while (layer.children.length > 30) layer.firstChild.remove();
}
function paletteHTML() {
  return `<div class="palette">${PALETTE.map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
    <div class="dtools"><button class="tl sz" data-s="5">•</button><button class="tl sz on" data-s="12">●</button><button class="tl sz" data-s="28">⬤</button>
    <button class="tl" id="t-er" title="${t('eraser')}">🧽</button><button class="tl" id="t-undo" title="${t('undo')}">↩️</button><button class="tl" id="t-clear" title="${t('clear')}">🗑️</button></div>`;
}
// Malfläche mit Werkzeugen verbinden; emit (optional) schickt jeden Schritt live an die anderen
function bindPainter(stage, cv, d, emit) {
  const ctx = cv.getContext('2d');
  const redraw = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600); for (const s of d.strokes) drawStroke(ctx, s); };
  redraw();
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [clamp(Math.round((e.clientX - r.left) / r.width * 800), 0, 800), clamp(Math.round((e.clientY - r.top) / r.height * 600), 0, 600)]; };
  cv.addEventListener('pointerdown', (e) => {
    if (d.sent) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e); d.cur = { c: d.eraser ? '#ffffff' : d.color, w: d.eraser ? Math.max(24, d.size) : d.size, p: [x, y] };
    d.strokes.push(d.cur); drawStroke(ctx, d.cur);
    if (emit) emit({ o: 's', c: d.cur.c, w: d.cur.w, p: [x, y] });
  });
  cv.addEventListener('pointermove', (e) => {
    if (!d.cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) { const [x, y] = pos(ev); const p = d.cur.p, lx = p[p.length - 2], ly = p[p.length - 1];
      if (Math.abs(x - lx) + Math.abs(y - ly) < 3) continue;
      ctx.strokeStyle = d.cur.c; ctx.lineWidth = d.cur.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); p.push(x, y);
      if (emit) emit({ o: 'p', p: [x, y] }); }
  });
  const end = () => { d.cur = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  stage.querySelectorAll('.sw').forEach((b) => b.onclick = () => { d.color = b.dataset.c; d.eraser = false; stage.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b)); $('#t-er').classList.remove('on'); });
  stage.querySelectorAll('.sz').forEach((b) => b.onclick = () => { d.size = +b.dataset.s; stage.querySelectorAll('.sz').forEach((x) => x.classList.toggle('on', x === b)); });
  $('#t-er').onclick = () => { d.eraser = !d.eraser; $('#t-er').classList.toggle('on', d.eraser); };
  $('#t-undo').onclick = () => { if (!d.sent && d.strokes.length) { d.strokes.pop(); redraw(); if (emit) emit({ o: 'u' }); } };
  $('#t-clear').onclick = () => { if (!d.sent) { d.strokes = []; redraw(); if (emit) emit({ o: 'x' }); } };
}
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
function drawStroke(g, P, color, w) {
  if (P.length < 2) return; g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
}
// ---- Wippe zeichnen (viewBox 360×230, Drehpunkt in der Mitte; Arm = 150 Einheiten)
function balSvg(L, obj, x, ang, o = {}) {
  const cx = 180, py = 170, arm = 150, ticks = [];
  for (let i = 1; i <= 10; i++) ticks.push(`<line x1="${cx - i * 15}" y1="${py - 4}" x2="${cx - i * 15}" y2="${py + 4}"/><line x1="${cx + i * 15}" y1="${py - 4}" x2="${cx + i * 15}" y2="${py + 4}"/>`);
  const lx = cx - L.d * arm, kg = (v) => fmtNum(v) + ' kg';
  const weight = `<g transform="translate(${lx},${py - 6})"><path d="M-17 0 L-12 -30 L12 -30 L17 0 Z" fill="#3d3a4b"/><rect x="-6" y="-38" width="12" height="9" rx="4" fill="none" stroke="#3d3a4b" stroke-width="4"/>
    <text y="-11" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${kg(L.kg)}</text></g>`;
  const thing = (xx, ghost) => {
    const X = cx + xx * arm, op = ghost ? ' opacity=".9"' : '';
    const pic = obj[0] === 'DB'
      ? `<g transform="translate(0,-14)"><rect x="-20" y="-3" width="40" height="6" rx="3" fill="#8a8f98"/><rect x="-24" y="-13" width="9" height="26" rx="3" fill="#2b2d33"/><rect x="15" y="-13" width="9" height="26" rx="3" fill="#2b2d33"/><rect x="-29" y="-9" width="6" height="18" rx="2" fill="#44474f"/><rect x="23" y="-9" width="6" height="18" rx="2" fill="#44474f"/></g>`
      : `<text y="-4" text-anchor="middle" font-size="38">${obj[0]}</text>`;
    return `<g transform="translate(${X},${py - 6})"${op}>${pic}<g transform="translate(0,-44)"><rect x="-22" y="-9" width="44" height="16" rx="8" fill="#fff" stroke="#7b2ff7" stroke-width="2"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="900" fill="#7b2ff7">${kg(obj[1])}</text></g></g>`;
  };
  const marks = (o.marks || []).map((m) => `<circle cx="${cx + m.x * arm}" cy="${py}" r="5.5" fill="${esc(m.color)}" stroke="#111" stroke-width="1.5"/>`).join('');
  const right = o.right != null ? `<g transform="translate(${cx + o.right * arm},${py})"><path d="M0 -2 L-7 -16 L7 -16 Z" fill="#22b35e"/><text y="-20" text-anchor="middle" font-size="9" font-weight="900" fill="#22b35e">${t('balRight')}</text></g>` : '';
  const supports = o.held ? `<rect x="${cx - arm - 12}" y="${py + 5}" width="20" height="${222 - py - 5}" fill="#c9a26b" rx="3"/><rect x="${cx + arm - 8}" y="${py + 5}" width="20" height="${222 - py - 5}" fill="#c9a26b" rx="3"/>` : '';
  return `<svg viewBox="0 0 360 230" class="bal-svg"><rect x="0" y="222" width="360" height="8" rx="4" fill="#d9d2e9"/>${supports}
    <path d="M${cx} ${py + 2} L${cx - 26} 222 L${cx + 26} 222 Z" fill="#7b2ff7"/>
    <g transform="rotate(${ang || 0} ${cx} ${py})"><rect x="${cx - arm - 12}" y="${py - 6}" width="${2 * arm + 24}" height="11" rx="5" fill="#ff9f43" stroke="#c26d12" stroke-width="2"/>
      <g stroke="#c26d12" stroke-width="2">${ticks.join('')}</g>${weight}${marks}${right}${x != null ? thing(x) : ''}</g>
    <circle cx="${cx}" cy="${py}" r="5" fill="#fff" stroke="#7b2ff7" stroke-width="3"/></svg>`;
}
// ---- Halbieren: die Form ist das Emoji-Bild; gezählt werden die sichtbaren Pixel auf jeder Seite des Schnitts
const HALVE_PX = 320, HALVE_GRID = 160;
let halveCache = null;
function halveShape(ch, rot) {
  const key = ch + '|' + rot; if (halveCache && halveCache.key === key) return halveCache;
  const BIG = HALVE_PX * 2, cv = document.createElement('canvas'); cv.width = cv.height = BIG;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const paint = (size) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BIG, BIG);
    g.translate(BIG / 2, BIG / 2); g.rotate(rot * Math.PI / 180);
    g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 0, size * 0.04);
  };
  // erst zeichnen, dann so vergrößern/verschieben, dass das Objekt die Fläche gut ausfüllt
  paint(420);
  let d = g.getImageData(0, 0, BIG, BIG).data, x0 = BIG, y0 = BIG, x1 = 0, y1 = 0;
  for (let y = 0; y < BIG; y++) for (let x = 0; x < BIG; x++) if (d[(y * BIG + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const img = document.createElement('canvas'); img.width = img.height = HALVE_PX;
  const gi = img.getContext('2d', { willReadFrequently: true });
  if (x1 > x0) { gi.imageSmoothingQuality = 'high'; const sc = Math.min(1.5, (HALVE_PX * 0.86) / Math.max(x1 - x0, y1 - y0)), w = (x1 - x0) * sc, h = (y1 - y0) * sc;
    gi.drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (HALVE_PX - w) / 2, (HALVE_PX - h) / 2, w, h); }
  d = gi.getImageData(0, 0, HALVE_PX, HALVE_PX).data;
  const pts = [], step = HALVE_PX / HALVE_GRID;
  for (let gy = 0; gy < HALVE_GRID; gy++) for (let gx = 0; gx < HALVE_GRID; gx++) {
    const px = Math.floor((gx + 0.5) * step), py = Math.floor((gy + 0.5) * step);
    if (d[(py * HALVE_PX + px) * 4 + 3] > 100) pts.push((gx + 0.5) / HALVE_GRID, (gy + 0.5) / HALVE_GRID);
  }
  return (halveCache = { key, img, pts });
}
// Anteil der kleineren Hälfte in Prozent (0–50)
function halveSplit(sh, l) {
  const [ax, ay, bx, by] = l, dx = bx - ax, dy = by - ay; let left = 0; const n = sh.pts.length / 2; if (!n) return 0;
  for (let i = 0; i < sh.pts.length; i += 2) if (dx * (sh.pts[i + 1] - ay) - dy * (sh.pts[i] - ax) > 0) left++;
  return Math.min(left, n - left) / n * 100;
}
// Schnitt als Gerade über die ganze Fläche verlängern
function lineEnds(l) {
  const [ax, ay, bx, by] = l, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  return [ax - dx / len * 2, ay - dy / len * 2, ax + dx / len * 2, ay + dy / len * 2];
}
function drawHalve(cv, sh, split, lines) {
  const g = cv.getContext('2d'), W = cv.width; g.clearRect(0, 0, W, W);
  if (split) { // eigene Hälften einfärben
    const [x0, y0, x1, y1] = lineEnds(split).map((v) => v * W);
    const half = (sign, col) => {
      g.save(); g.beginPath(); const nx = -(y1 - y0), ny = x1 - x0, k = 4 * sign;
      g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + nx * k, y1 + ny * k); g.lineTo(x0 + nx * k, y0 + ny * k); g.closePath(); g.clip();
      g.drawImage(sh.img, 0, 0, W, W); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, W, W); g.restore();
    };
    g.drawImage(sh.img, 0, 0, W, W); half(1, 'rgba(30,120,255,.6)'); half(-1, 'rgba(255,50,80,.55)');
  } else g.drawImage(sh.img, 0, 0, W, W);
  const labels = [];
  if (split) { // Prozent auf jede Hälfte schreiben (in deren Mitte)
    const [ax, ay, bx, by] = split, dx = bx - ax, dy = by - ay, c = [[0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < sh.pts.length; i += 2) { const k = dx * (sh.pts[i + 1] - ay) - dy * (sh.pts[i] - ax) > 0 ? 0 : 1; c[k][0] += sh.pts[i]; c[k][1] += sh.pts[i + 1]; c[k][2]++; }
    const n = c[0][2] + c[1][2];
    const len = Math.hypot(dx, dy) || 1, ox = -dy / len * W * 0.1, oy = dx / len * W * 0.1; // von der Linie weg auf die eigene Seite
    if (n) c.forEach(([sx, sy, m], k) => { if (m) labels.push([sx / m * W + (k ? -ox : ox), sy / m * W + (k ? -oy : oy), fmtNum(Math.round(m / n * 1000) / 10) + ' %']); });
  }
  for (const { line, color } of (split ? [{ line: split, color: '#111' }] : []).concat(lines)) {
    const [x0, y0, x1, y1] = lineEnds(line).map((v) => v * W);
    g.lineCap = 'round'; g.setLineDash([]);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.font = `900 ${Math.round(W / 11)}px Nunito, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const [x, y, txt] of labels) { g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(txt, x, y); g.fillStyle = '#fff'; g.fillText(txt, x, y); }
}
// Wer im Telefonat ist, hüpft als kleine Figur am Telefon-Knopf; wer gerade spricht, hüpft schneller
let voiceHeadsKey = '';
function renderVoiceHeads(st) {
  const box = $('#voice-heads'); if (!box) return;
  const on = st ? st.players.filter((p) => p.voice) : [];
  const key = on.map((p) => p.id + JSON.stringify(p.char)).join('|');
  if (key === voiceHeadsKey) return; voiceHeadsKey = key;
  box.innerHTML = on.map((p, i) => `<div class="vh" data-id="${esc(p.id)}" style="animation-delay:${-i * 0.23}s" title="${esc(p.name)}">${charEl(p.char, 30, false)}</div>`).join('');
}
const meters = new Map(); // Stream -> Analyser (Lautstärke fürs Sprechen)
function levelOf(stream) {
  if (!stream) return 0;
  let m = meters.get(stream);
  if (!m) { try { const a = ac().createAnalyser(); a.fftSize = 256; ac().createMediaStreamSource(stream).connect(a); m = { a, buf: new Uint8Array(a.fftSize) }; meters.set(stream, m); } catch (e) { return 0; } }
  m.a.getByteTimeDomainData(m.buf); let s = 0; for (const v of m.buf) s += (v - 128) * (v - 128);
  return Math.sqrt(s / m.buf.length) / 128;
}
setInterval(() => {
  const box = $('#voice-heads'); if (!box || !box.children.length) return;
  for (const el of box.children) {
    const id = el.dataset.id; let lv = 0;
    if (voice.on) lv = id === net.myId ? (voice.track && voice.track.enabled ? levelOf(voice.stream) : 0) : levelOf((voice.audios.get(id) || {}).srcObject);
    el.classList.toggle('talk', lv > 0.04);
  }
  for (const s of [...meters.keys()]) if (!s.active) meters.delete(s);
}, 150);
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
  if (s !== 'game') $('#btn-stop').classList.add('hidden');
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
$('#btn-start').onclick = () => toHost({ t: 'start', rounds: +$('#set-rounds').value, mode: $('#set-mode').value, games: mixPicked() });
// Mix: welche Spiele sollen dabei sein? (wird auf dem Gerät gemerkt)
function mixPicked() { try { const v = JSON.parse(localStorage.getItem('echo-mix') || 'null'); if (Array.isArray(v)) { const ok = GAME_MODES.filter((m) => v.includes(m)); if (ok.length) return ok; } } catch (e) {} return [...GAME_MODES]; }
function renderMixPick() {
  const box = $('#mix-pick'), mix = $('#set-mode').value === 'mix'; if (!box) return;
  box.classList.toggle('hidden', !mix); $('#lbl-rounds').textContent = t(mix ? 'roundsPer' : 'rounds');
  if (!mix) return;
  const on = mixPicked();
  box.innerHTML = `<div class="mp-head"><b>${t('mixGames')}</b> <button class="linkbtn" id="mp-all">${t('mixAll')}</button></div><div class="mp-list">${GAME_MODES.map((m) => `<button class="mp${on.includes(m) ? ' on' : ''}" data-m="${m}">${t(MODE_KEY[m])}</button>`).join('')}</div>
    <p class="note">${t('mixSum', { g: on.length, r: $('#set-rounds').value, n: on.length * +$('#set-rounds').value })}</p>`;
  box.querySelectorAll('.mp').forEach((b) => b.onclick = () => {
    let cur = mixPicked(); const m = b.dataset.m;
    cur = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
    if (!cur.length) { toast(t('mixMin')); return; }
    try { localStorage.setItem('echo-mix', JSON.stringify(cur)); } catch (e) {}
    renderMixPick();
  });
  $('#mp-all').onclick = () => { const all = mixPicked().length === GAME_MODES.length; try { localStorage.setItem('echo-mix', JSON.stringify(all ? [GAME_MODES[0]] : GAME_MODES)); } catch (e) {} renderMixPick(); };
}
$('#set-rounds').addEventListener('change', renderMixPick);
function setRoundOpts(mode) {
  const [opts, def] = ROUND_OPTS[mode] || ROUND_OPTS.sound, sel = $('#set-rounds');
  sel.innerHTML = opts.map((n) => `<option${n === def ? ' selected' : ''}>${n}</option>`).join('');
}
$('#set-mode').onchange = () => { view.modeTouched = true; const m = $('#set-mode').value; setRoundOpts(m); renderMixPick(); toHost({ t: 'mode', mode: m }); };
$('#btn-copy').onclick = async () => { try { await navigator.clipboard.writeText(net.code); toast(t('copied')); } catch (e) { toast(net.code); } };
$('#btn-share').onclick = async () => {
  const url = location.origin + location.pathname + '?code=' + net.code;
  if (navigator.share) { try { await navigator.share({ title: 'Echo Party', text: 'Echo Party – Code: ' + net.code, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { toast(url); } }
};
$('#btn-phone').onclick = () => voiceToggle();
$('#btn-lobby-char').onclick = () => { renderCreator(); showScreen('creator'); };
$('#btn-stop').onclick = () => {
  const b = modal(`<h3>${t('abortTitle')}</h3><button class="btn primary" id="ab-skip">${t('skipRound')}</button><button class="btn" id="ab-end">${t('endGame')}</button><button class="btn" id="ab-no">${t('cancel')}</button>`);
  b.querySelector('#ab-skip').onclick = () => { closeModal(); toHost({ t: 'skip' }); };
  b.querySelector('#ab-end').onclick = () => { closeModal(); toHost({ t: 'lobby' }); };
  b.querySelector('#ab-no').onclick = closeModal;
};
$('#btn-sound').onclick = () => { unlockAudio(); tick(660); setTimeout(() => tick(880), 150); toast(t('soundOn')); };
$('#btn-home').onclick = async () => {
  if (view.inRoom) { if (!(await confirmBox(t('leave')))) return; joinSession++; sayBye(); await sleep(200); destroyNet(); history.replaceState(null, '', location.pathname); showScreen('menu'); return; }
  showScreen($('#screen-menu').classList.contains('hidden') ? 'menu' : 'lang');
};
// ---- Neu laden: holt die neueste Version (wichtig, wenn die Seite als App auf dem Startbildschirm liegt)
const MY_VER = ((document.querySelector('script[src*="game.js"]') || {}).getAttribute?.('src') || '').match(/v=([0-9a-f]+)/)?.[1] || '';
async function hardReload() {
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.update().catch(() => {}); } catch (e) {}
  const u = new URL(location.href); u.searchParams.set('v', Date.now().toString(36)); location.replace(u.toString());
}
$('#btn-reload').onclick = hardReload;
$('#ver').textContent = MY_VER ? `${t('version')} ${MY_VER.slice(0, 6)}` : '';
// Gibt es eine neuere Version? Dann (nur im Startmenü, nicht mitten im Spiel) einmal automatisch neu laden
async function checkUpdate() {
  try {
    if (!MY_VER || view.inRoom) return;
    const html = await (await fetch(location.pathname + '?check=' + Date.now(), { cache: 'no-store' })).text();
    const v = (html.match(/game\.js\?v=([0-9a-f]+)/) || [])[1];
    if (v && v !== MY_VER && sessionStorage.getItem('echo-upd') !== v) { sessionStorage.setItem('echo-upd', v); setStatus(t('newVer')); setTimeout(hardReload, 600); }
  } catch (e) {}
}
setTimeout(checkUpdate, 1500);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
$('#btn-credits').onclick = () => {
  const b = modal(`<h3>${t('creditsTitle')}</h3><div class="credits">${SOUNDS.map((s) => `<div>${esc(s[lang === 'am' ? 'am' : 'de'])} – ${esc(s.author)} – <a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(s.license)}</a></div>`).join('')}</div><button class="btn" id="cl">${t('close')}</button>`);
  b.querySelector('#cl').onclick = closeModal;
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
window.addEventListener('pagehide', sayBye);
if (new URLSearchParams(location.search).has('debug')) window.__echo = { net, host, view, EchoScore, SOUNDS, hangKey };

const urlCode = cleanCode(new URLSearchParams(location.search).get('code') || '');
if (urlCode) $('#in-code').value = urlCode;
applyLang(); showScreen(lang ? 'menu' : 'lang');
if (!window.Peer) setStatus('PeerJS konnte nicht geladen werden (Internet?)');
})();
