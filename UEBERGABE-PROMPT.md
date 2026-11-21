# Übergabe-Prompt für die nächste KI

> **So benutzen:** Diesen ganzen Text der neuen KI geben (oder sagen: „Lies `UEBERGABE-PROMPT.md` im Repo und mach dort weiter“).
> Stand: 18.11.2026, letzter Commit auf `main`: `3836a47` („Malen repariert …“). Vorher immer `git pull` machen – es haben schon mehrere KI-Sitzungen parallel an diesem Repo gearbeitet.

---

## 1. Wer ist der Nutzer, wie arbeitet man mit ihm

- Schreibt **Deutsch**, oft per Spracheingabe → viele Tippfehler („erraten“ = „ersten“, „Strichmännchen“ usw.). Gemeint ist meist klar, sonst kurz nachfragen.
- Antworte **auf Deutsch, einfach und kurz**, ohne Fachchinesisch. Er ist kein Programmierer.
- Er testet auf dem **iPhone (Safari)**, spielt mit Freunden über das Internet (verschiedene Netze), teils auf **Amharisch** (Äthiopien).
- Er will Änderungen **sofort online** haben (Link zum Testen) und dass vorher **getestet** wird. Nach jeder Änderung: testen → committen → auf `main` pushen → prüfen, dass es online ist → kurz erklären, was neu ist.
- Wichtige Wünsche/Regeln, die er im Laufe der Zeit gesagt hat:
  - **Kostenlos, ohne Konto, ohne Server/Datenbank** (kein Firebase). Alles über das Gerät des Hosts.
  - Beide Sprachen immer: **Deutsch + Amharisch** (alle Texte in `T.de` und `T.am`).
  - Wörter/Inhalte: **keine Gewalt, keine Waffen, keine Geister/Monster, keine Gesundheit/Krankheit, keine Schlangen**, keine Sätze bei Malwörtern, nur einfache Dinge.
  - Keine urheberrechtlich geschützten Sachen (keine Memes, keine bekannten Songs). Töne sind CC0, Logos aus Simple Icons (CC0).
  - Eigene Spiele, keine Kopie eines bestimmten existierenden Spiels (Name/Grafik).
- **Keine Pull-Requests** erstellen, außer er fragt danach. Direkt auf `main` arbeiten ist hier üblich.
- E-Mail o. ä. des Nutzers nie irgendwo eintragen.

## 2. Was ist das Projekt

Repo `locolocosq/malenio` (GitHub), online über **GitHub Pages**:

| Spiel | Ordner | Online |
|---|---|---|
| ~~Malenio~~ – ist jetzt in Echo Party aufgegangen (Modus „Malen & Raten“). `index.html` in der Wurzel leitet nur noch nach `mimic/` weiter; `words.js` (Wortliste) und `sw.js` bleiben. | Repo-Wurzel | https://locolocosq.github.io/Malenio/ → leitet weiter |
| **Echo Party** – Party-Spiel mit vielen Modi (Hauptarbeit zuletzt) | `mimic/` | https://locolocosq.github.io/Malenio/mimic/ |

Reines HTML/CSS/JavaScript, **kein Build-System, kein Framework**. `README.md` beschreibt beide Spiele für den Nutzer.

### Veröffentlichen
- Einfach auf **`main` pushen**. Die GitHub Action `.github/workflows/pages-neu-bauen.yml` kopiert `main` nach `gh-pages` und stößt den Pages-Neubau an (dauert 1–3 Minuten).
- **Vorher immer** `node tools/stamp.js` ausführen: hängt `?v=<hash>` an alle eingebundenen Dateien in den `index.html`, damit iPhones keine alten Dateien aus dem Cache nehmen. Neue Dateien, die per `<script>`/`<meta>` eingebunden werden, in die Liste `PAGES` in `tools/stamp.js` eintragen.
- Prüfen ob online: `curl -s "https://locolocosq.github.io/Malenio/mimic/?x=$RANDOM" | grep -o 'game.js?v=[0-9a-f]*'` muss denselben Hash zeigen wie `mimic/index.html` lokal.

## 3. Technik von Echo Party (`mimic/`)

- **Netz:** WebRTC über **PeerJS 1.5.4** (unpkg, kostenloser PeerJS-Cloud-Server nur zum Finden). **Stern-Topologie:** der Host ist der Server. Host-Peer-ID = `'echoparty-v1-' + CODE` (5 Zeichen, nur A–Z ohne I/O + 2–9). Bis 8 Spieler.
- **TURN-Relay** von Metered (kostenlos) für Verbindungen zwischen verschiedenen Netzen; Zugangsdaten stehen als `TURN_USER`/`TURN_PASS` oben in `mimic/game.js` (vom Nutzer so gewollt).
- **Ablauf:** Host-Objekt `host` (in `game.js`) hält den kompletten Spielzustand, schickt per `pushState()` alle paar Sekunden und bei jeder Änderung `state` an alle; `stateFor(p, s)` passt den Zustand pro Spieler an (z. B. Wort nur für den Malenden). Clients schicken Aktionen mit `toHost({t:'…'})`, der Host verarbeitet sie in `host.receive()` (großes `switch`). Anzeige im Objekt `view`; `view.onState()` rendert neu, wenn sich der Schlüssel (`key`) ändert, sonst nur kleine Updates.
- Wiederverbinden: Client-ID `cid` in `sessionStorage`, bis 4 Versuche, Ping alle 3 s.
- **Audio:** WebAudio, `recordFor()` mit ScriptProcessor (1024), WAV 16 kHz über den Datenkanal, Bewertung in `mimic/score.js` (Lautstärke, Tonhöhe per Autokorrelation, DTW). Wiedergabe auf der Audio-Uhr mit Ausgleich der Lautsprecher-Latenz. **Kein `navigator.audioSession` benutzen** – das hat auf dem iPhone das Mikrofon kaputt gemacht.
- **Sprachchat** (📞-Knopf): eigene PeerJS-Calls, während Zuhören/Aufnehmen/Vorspielen stumm (`applyVoiceMute`). „Telefon-Figuren“ (`#voice-heads`, `levelOf()`) zeigen, wer spricht – messen in den Phasen listen/record/show bewusst **nicht**.
- **Figuren:** `OPTS` + `charSVG()` (SVG), Editor `renderCreator()`, auch aus der Lobby erreichbar.
- **Host-Rechte:** Spieler entfernen (✖ in der Lobby, `t:'kick'`), ⏹-Knopf im Spiel: Runde überspringen (`t:'skip'`) oder Spiel abbrechen (`t:'lobby'`).
- **Emojis** werfen (`t:'emo'`) bei Bühne/Bewerten/Ergebnissen.
- Debug: Seite mit `?debug` öffnen → `window.__echo = { net, host, view, … }`.

### Spielmodi (Lobby-Auswahl `#set-mode`, Konstanten `GAME_MODES`/`MODE_KEY` in `game.js`)
`sound` 🎤 Töne nachmachen · `draw` 🎨 Malen & bewerten · `guess` ✏️ Malen & Raten · `logo` 🏷️ Logo-Quiz · `timer` ⏱️ Stoppuhr · `hang` 🪢 Galgenmännchen · `estimate` 🔢 Schätzen · `react` ⚡ Reaktion · `simon` 🟢 Farbfolge · `memory` 🧠 Sequenz-Memory · `cups` 🥤 Hütchenspiel · `emoji` 😀 Emoji-Rätsel · `halve` 🔪 Halbieren · `balance` ⚖️ Wippe · `color` 🎨 Farbe treffen · `circle` ⭕ Perfekter Kreis · `stack` 🗼 Turm stapeln · `bluff` 🤥 Bluff · `blind` ⏱️ Blind-Stopp · `dish` 🍝 Koch-Auktion · `mix` 🎲 Mix (alle bzw. ausgewählte Spiele nacheinander, Auswahl `#mix-pick`).
Details zu den ersten 8 Modi stehen in `README.md`. Die Modi ab `react` hat eine andere KI-Sitzung gebaut (Commits ab 10.11.2026) – deren genaue Regeln im Code nachlesen.

### Daten-Dateien in `mimic/` (teils erst bei Bedarf geladen, über `<meta id="…-src">` in `index.html`)
- `sounds/` 103 CC0-Töne + `credits.json` → `sounds/sounds.js` (`node tools/build-sounds.js`)
- `logos/logos.js` ~360 Marken (Simple Icons, CC0) ← `tools/brands.txt` + `tools/build-logos.js` (braucht `npm i simple-icons`)
- `questions/questions.js` 1057 Schätzfragen de/am ← `tools/build-questions.py`
- `bluff/bluff.js` (Bluff-Fragen), `dish/dishes.js` (Gerichte), `emoji/emoji.js`, `emoji/halve.js`
- `../words.js` = Malenio-Wortliste (4089 Wörter `[deutsch, amharisch, schwierigkeit 1–3]`) ← `words/*.txt` + `tools/build-words.js`

### Neue Spiele als Plug-ins (XG) – so baut man weitere
Seit 21.11. gibt es in `mimic/game.js` den Block „Neue Spiele als Plug-ins (XG)“. Ein Spiel ist ein Objekt `XG.<modus>` mit
`phases`, `start(h)`, `msg(h, from, msg)`, `done(h, id)`, `pub(h)` (Zustand für alle), `priv(h, p)` (nur für diesen Spieler, kommt als `st.xp` an),
`left(h, id)`, `render(v, st, stage)`, `update(v, st)`, `results(v, st, stage)`, `hideTimer`. Der Host-Zustand liegt in `h.xs`, beim Client in `st.xs`.
Aktionen schickt der Client mit `xSend('aktion', {…})` (= `{t:'x', a, r: Runde}`). Helfer: `srng(seed)` (gleicher Zufall auf allen Handys), `xFinish(h, punkte)`,
`xRank(einträge, kleinerIstBesser)`, `xList(st, zeilen)`, `xRun(v, st, init)` (Zustand pro Runde auf dem Handy), `xCountdown`.
Texte über `Object.assign(T.de, {…})` / `T.am`. Danach eintragen: `GAME_MODES`, `MODE_KEY`, `ROUND_OPTS`, `<option>` in `mimic/index.html`. So gebaut:
hunt, uniq, photo, diff, sort, geo, bomb, treasure, letters, wyr, group, balloon, noise, oneword, slf, story. Daten: `mimic/xgames/xtext.js` (Würdest du lieber, Gruppe, Stadt-Land-Fluss, Geschichten), `mimic/xgames/xdata.js` (Dinge, Farben, Sortier-Körbe, Bomben-Themen), `mimic/geo/geo.js` (Karte + 250 Orte).

## 4. Testen (wichtig, der Nutzer will getestete Änderungen)

- Lokaler Server im Repo-Ordner: `python3 -m http.server 8123` → `http://localhost:8123/mimic/?debug`
- Playwright + Chromium sind in der Cloud-Umgebung vorinstalliert (`require('playwright')`). Mehrere Handys = mehrere Browser-Kontexte mit `devices['iPhone 13']`. Mikrofon: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`.
- Fertige Tests in **`tools/tests/`** (nutzen den PeerJS-Cloud-Server, brauchen also Internet; manchmal schlägt das Verbinden fehl → einfach nochmal starten):
  - `node tools/tests/sound-und-malen.test.js` – Töne aufnehmen + Malen & bewerten (3 Spieler)
  - `node tools/tests/raten.test.js` – Malen & Raten (Tipp im Chat, Zug endet beim ersten Richtigen)
  - `node tools/tests/finger-malen.test.js` – echtes Finger-Malen mit Touch-Events
  - `node tools/tests/neue-spiele.test.js [spiel …]` – alle Plug-in-Spiele mit 3 Handys (prüft auch Punkte)
  - `node tools/tests/mix-alle.test.js` – Mix mit allen Spielen, jedes startet einmal
  - `node tools/tests/wer-wuerde.test.js` – Wer würde am ehesten
  - Mit `URL=https://locolocosq.github.io/Malenio/mimic/?debug node …` gegen die Online-Version testen.
- Safari-Motor testen: WebKit ist nicht vorinstalliert; geht mit `PLAYWRIGHT_BROWSERS_PATH=<ordner> node /opt/node-tools/node_modules/playwright/cli.js install webkit` und `install-deps webkit` (in einen eigenen Ordner, die vorinstallierte Chromium-Version nicht anfassen). WebKit↔WebKit verbindet in der Cloud nicht, darum Host in Chromium und Spieler in WebKit (oder umgekehrt) mischen.
- Nach Änderungen auf **doppelte Namen** prüfen (siehe Abschnitt 5): `grep -n "^function " mimic/game.js | sed 's/.*function \([A-Za-z0-9_]*\).*/\1/' | sort | uniq -d` muss leer sein.

## 5. Was zuletzt passiert ist / Stand

- 16.11.: Nutzer meldete „Malen geht nicht mehr, Aufnehmen geht nicht mehr“. Ursache beim Malen: eine spätere Sitzung hatte für „Perfekter Kreis“ eine **zweite Funktion `drawStroke`** angelegt, die die Mal-Funktion überschrieb (JavaScript nimmt still die letzte). Umbenannt in `drawPath` → beide Mal-Modi gehen wieder (Commit `3836a47`, online).
- Aufnehmen lief in allen Tests (Chromium, WebKit, mit Telefon an/aus). Vorsorglich misst die Telefon-Figuren-Anzeige beim Aufnehmen nicht mehr das Mikrofon. **Offen:** Rückmeldung des Nutzers, ob das Aufnehmen auf seinem iPhone wieder geht. Falls nicht: genau fragen, was er sieht (erscheint der 🎙️-Start-Knopf? bewegt sich die pinke Welle? hat er 📞 an?) und auf echten iPhone-Eigenheiten suchen (AudioContext suspended, Mikrofon-Freigabe, zweite Nutzung des Mikrofons).
- Echtes Spielen mit mehreren iPhones über verschiedene Netze (TURN) wurde in der Cloud nie getestet – nur vom Nutzer selbst.

## 6. Ideen, die der Nutzer schon mal hatte (noch nicht gebaut)
- **Karaoke** mit Liedern: nur mit **gemeinfreien** Liedern (Volks-, Kinder-, Weihnachtslieder, Klassik), Musik selbst im Browser nachgespielt, Text läuft mit, Bewertung ob man die Töne trifft. Bekannte Songs gehen rechtlich nicht. Nutzer hat sich noch nicht entschieden.

## 7. Arbeitsweise in Kürze
1. `git pull` · lokalen Server starten · Problem nachstellen (Test schreiben/benutzen).
2. Ändern – Texte immer Deutsch **und** Amharisch, Stil des bestehenden Codes beibehalten (kompakte Funktionen, deutsche Kommentare).
3. Testen (siehe 4), auch auf Handy-Größe (iPhone 13) per Screenshot anschauen.
4. `node tools/stamp.js` → commit → `git push origin main` → warten bis online → dem Nutzer kurz und einfach auf Deutsch erklären, was neu ist, und den Link geben.
