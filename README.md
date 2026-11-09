# 🎨 Malenio

Ein kostenloses Online-Mal- und Ratespiel für bis zu 8 Leute (ähnlich wie skribbl.io), auf **Deutsch** und **Amharisch** (🇩🇪 / 🇪🇹), auch gemischt.

## So funktioniert's

1. Sprache wählen (Deutsch oder Amharisch).
2. Namen eingeben und **Lobby erstellen**. Du bekommst einen 5-stelligen Code (nur A–Z und Zahlen, keine amharischen Schriftzeichen).
3. Die anderen geben den Code ein und klicken **Beitreten** (oder öffnen den Teilen-Link).
4. 📞 **Telefon oben rechts** antippen, dann seid ihr im Sprachchat. Nochmal antippen schaltet ihn aus.
5. 🏠 **Haus oben links** bringt dich zurück ins Menü.
6. Wer zeichnet, wählt aus **3 Wörtern** (leicht ★, mittel ★★, schwer ★★★; schwerere Wörter bringen mehr Punkte).
7. Alle sehen live, was gezeichnet wird. Das Wort sieht nur, wer gerade zeichnet; die anderen sehen nur die Anzahl der Buchstaben in ihrer Sprache.
8. Ruft jemand übers Telefon das richtige Wort, drückt der Zeichner **Erraten!** und wählt aus, wer es war. Wer es schreibt, wird im Chat auch automatisch erkannt.
9. Je schneller es erraten wird, desto mehr Punkte bekommen Zeichner und Rater.

Werkzeuge: 24 Farben, 4 Pinselgrößen, Radierer, Füllen, Rückgängig, Alles löschen.

## Wörter

`words/*.txt` enthält **4.089 einfache Alltagswörter (nur einzelne Dinge)** als Paare (Deutsch | Amharisch) mit Schwierigkeit 1–3.
Jedes Wort hat in beiden Sprachen dieselbe ID, deshalb können deutsche und äthiopische Spieler zusammen spielen.
Nach Änderungen an den Textdateien neu erzeugen:

```bash
node tools/build-words.js && node tools/stamp.js
```

`stamp.js` gibt den Dateien eine neue Versions-Kennung, damit alle Handys sofort die neue Version laden.

> Die amharischen Übersetzungen sollte eine Muttersprachlerin oder ein Muttersprachler einmal durchsehen. Korrekturen trägt man einfach in den `.txt`-Dateien ein.

## Kostenlos und ohne eigenen Server

- Das Gerät, das die Lobby erstellt, ist der **Host**: Es hält den Spielstand und die Regeln.
- Die Spieldaten (Zeichnung, Punkte, Chat) laufen über einen **kostenlosen öffentlichen MQTT-Server** (z. B. `broker.emqx.io`, mit zwei Ersatz-Servern). Das funktioniert **in jedem Netz**, also WLAN, mobile Daten, verschiedene Länder. Eine Anmeldung ist nicht nötig.
- Der **Sprachchat (📞)** verbindet die Geräte direkt (WebRTC über [PeerJS](https://peerjs.com)). In manchen Mobilfunknetzen kommt diese Direktverbindung nicht zustande. Dafür ist ein kostenloser Relay-Server von [Metered Open Relay](https://www.metered.ca/tools/openrelay/) (20 GB/Monat gratis) eingetragen (`TURN_USER`/`TURN_PASS` in `app.js`).
- Die Website selbst besteht nur aus statischen Dateien und läuft kostenlos auf **GitHub Pages**.

### Online stellen (GitHub Pages)

1. Im GitHub-Repo: **Settings → Pages**.
2. Unter „Build and deployment“: **Deploy from a branch**, Branch auswählen, Ordner `/ (root)`, **Save**.
3. Nach ca. 1 Minute ist das Spiel unter `https://<benutzername>.github.io/<repo>/` erreichbar. Diesen Link schickst du deinen Freunden.

HTTPS ist dort automatisch an. Das braucht man fürs Mikrofon.

### Auf dem Handy spielen

- Einfach den Link im Handy-Browser öffnen (Chrome auf Android, Safari auf dem iPhone). Das Spiel läuft hochkant und quer.
- **Als App installieren:** Android: Menü ⋮ → „Zum Startbildschirm hinzufügen“ / „App installieren“. iPhone: Teilen-Symbol → „Zum Home-Bildschirm“. Danach startet Malenio im Vollbild wie eine App.
- Solange man in einer Lobby ist, bleibt der Bildschirm an.
- Bricht die Verbindung kurz ab (z. B. Funkloch), verbindet sich das Handy automatisch neu. Punkte und Telefon bleiben erhalten.

### Wichtig zu wissen

- Der **Host muss die Seite offen lassen**. Schließt er sie oder wechselt er länger in eine andere App (z. B. WhatsApp), kann das Spiel für alle enden. Das Handy des Hosts am besten am Ladekabel lassen.
- Es wird kein kostenpflichtiger TURN-Server benutzt. In seltenen Netzen (manche Firmen-WLANs, einige Mobilfunknetze) kommt deshalb keine direkte Verbindung zustande. Dann hilft meist ein anderes WLAN.
- Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.

---

# 🎤 Echo Party (Ordner `mimic/`)

Ein zweites Spiel im selben Repo: Alle hören einen kurzen Ton (Tierstimme, Lachen, Ansage, Melodie …) – mit Wellenform und mitlaufendem Strich. Dann Countdown 3-2-1-LOS: alle machen ihn **gleichzeitig mit nur einem Versuch** nach, die eigene Stimme erscheint live als pinke Welle. Danach kommt jeder nacheinander auf die **Bühne ans Mikrofon**, seine Aufnahme wird vorgespielt und er bekommt Punkte; oben zeigen Punktekarten den Stand. Wer am Ende die meisten Punkte hat, gewinnt. Das Spiel vergleicht die Aufnahme automatisch mit dem Original (Tonhöhen-Verlauf, Lautstärke, Klangfarbe, Länge) und vergibt 0–100 Punkte, plus Bonus für Platz 1 und 2. Danach werden alle Aufnahmen vorgespielt, die Figur des Spielers tanzt und bewegt den Mund dazu.

- **Sechs Spielmodi** (in der Lobby wählbar):
  - 🎤 **Töne nachmachen:** zuhören, dann selbst auf **Start** drücken (nach 10 Sekunden startet die Aufnahme automatisch), ein Versuch. Bewertet werden Lautstärke-Verlauf, Tonhöhe/Tonlage, Länge und Klangfarbe; zu leise gibt Abzug.
  - 🎨 **Malen & bewerten:** alle bekommen dasselbe Wort (aus der Malenio-Wortliste, Deutsch/Amharisch) und malen 60 Sekunden. Danach stellt jeder sein Bild auf der Bühne vor (es wird Strich für Strich nachgezeichnet), die anderen geben 1–5 Sterne. Ø Sterne × 20 = Punkte.
  - ✏️ **Malen & Raten:** wie Malenio – einer wählt eins von 3 Wörtern (leicht/mittel/schwer) und malt live, die anderen tippen ihren Tipp (Deutsch oder Amharisch wird erkannt, „Fast!“ bei einem Tippfehler). Der Malende kann auch auf **Erraten!** drücken und auswählen, wer es erraten hat. Wie im alten Spiel ist der Zug vorbei, sobald einer es erraten hat. Punkte nach Zeit und Schwierigkeit; „Runden“ = wie oft jeder malt.
  - 🏷️ **Logo-Quiz:** Ein Marken-Logo wird in 40 Sekunden Kärtchen für Kärtchen (10×10, zufällige Reihenfolge) aufgedeckt. Man tippt die ersten Buchstaben (z. B. „NI“ → Nike, Nikon …) und wählt **einmal** aus. Wer zuerst richtig liegt, bekommt am meisten (100, 80, 65 …), falsch oder nichts gewählt = 0 Punkte.
  - ⏱️ **Stoppuhr:** Eine Zielzeit wird angezeigt (z. B. 7,50 Sekunden). Jeder drückt selbst **START** – dann sieht man nur noch den **STOPP**-Knopf und muss im Kopf zählen. Wenn alle gestoppt haben, sieht man die Zeiten: wer am nächsten dran ist, gewinnt (100, 80, 65 …), bis 0,05 s daneben gibt es +50 Bonus („Perfekt!“). Die Zeit wird direkt auf dem eigenen Handy gemessen, Internet-Verzögerung spielt keine Rolle.
  - 🧍 **Strichmännchen:** Einer sucht ein Wort aus (3 Vorschläge oder ein eigenes Wort), die anderen wählen **reihum** je einen Buchstaben (15 s pro Zug). Jeder falsche Buchstabe malt einen Strich am Strichmännchen, nach 8 Fehlern ist es vorbei. Erraten: jeder Errater bekommt 30 + 20 pro gefundenem Buchstaben, wer die meisten Buchstaben gefunden hat +40. Nicht erraten: der Wort-Aussucher bekommt 150. Amharisch: man wählt die Grundform (z. B. ለ), dann erscheinen alle Formen (ሉ ሊ ላ …).
- **Emojis werfen** 😆😂😍🔥👍😳😢👎: bei den Auftritten auf der Bühne, beim Bewerten der Bilder und bei den Ergebnissen fliegen sie über alle Bildschirme.
- **Logos:** rund 360 bekannte Marken (Autos, Essen & Trinken, Mode, Technik, Apps, Läden, Airlines, Sport) aus [Simple Icons](https://simpleicons.org) (CC0). Die Marken gehören ihren Inhabern und dienen hier nur zum Erraten. Liste: `tools/brands.txt`, neu bauen mit `npm i simple-icons && node tools/build-logos.js`.
- Online: `https://locolocosq.github.io/Malenio/mimic/`
- Bis 8 Spieler, Party-Code, Deutsch/Amharisch, 📞 Sprachchat, 🏠 zurück zum Menü.
- Jeder gestaltet seine eigene Figur (Farbe, Augen, Mund, Kopf, Extra, Tanz).
- **Ohne Konto, ohne Datenbank:** Alles läuft über das Gerät des Hosts (WebRTC, Peer-to-Peer). PeerJS wird nur zum ersten Finden genutzt, ein kostenloser TURN-Relay (Metered) sorgt für Verbindungen zwischen verschiedenen Netzen.
- **Töne:** 103 kurze Töne unter **CC0** (gemeinfrei) von OpenGameArt.org, Quellen im Spiel unter „Quellen der Töne“ und in `mimic/sounds/credits.json`.
- Bewertung: `mimic/score.js`. Neue Töne: MP3 + Eintrag in `credits.json`, dann `node tools/build-sounds.js && node tools/stamp.js`.
