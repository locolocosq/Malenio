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

`words/*.txt` enthält **2.851 gut malbare Wörter und Szenen** als Paare (Deutsch | Amharisch) mit Schwierigkeit 1–3.
Jedes Wort hat in beiden Sprachen dieselbe ID, deshalb können deutsche und äthiopische Spieler zusammen spielen.
Nach Änderungen an den Textdateien neu erzeugen:

```bash
node tools/build-words.js
```

> Die amharischen Übersetzungen sollte eine Muttersprachlerin oder ein Muttersprachler einmal durchsehen. Korrekturen trägt man einfach in den `.txt`-Dateien ein.

## Kostenlos und ohne eigenen Server

- Das Gerät, das die Lobby erstellt, ist der **Host**: Es hält den Spielstand. Die Geräte verbinden sich direkt miteinander (WebRTC, Peer-to-Peer).
- Zum ersten „Finden“ der Geräte wird nur der kostenlose öffentliche Vermittlungsdienst von [PeerJS](https://peerjs.com) genutzt.
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
