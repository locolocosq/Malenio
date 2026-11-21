// Daten für die Spiele Detektiv-Foto, Finde den Unterschied, Schneller Sortierer und Wort-Bombe.
// Alles Deutsch + Amharisch. Von Hand gepflegt.
(() => {
// Detektiv-Foto + Finde den Unterschied: [Emoji, Deutsch, Amharisch]
window.X_ITEMS = [
  ['🍎', 'Apfel', 'ፖም'], ['🍌', 'Banane', 'ሙዝ'], ['🍇', 'Trauben', 'ወይን'], ['🍓', 'Erdbeere', 'እንጆሪ'], ['🍉', 'Melone', 'ሐብሐብ'],
  ['🍋', 'Zitrone', 'ሎሚ'], ['🥕', 'Karotte', 'ካሮት'], ['🌽', 'Mais', 'በቆሎ'], ['🍞', 'Brot', 'ዳቦ'], ['🧀', 'Käse', 'አይብ'],
  ['🍕', 'Pizza', 'ፒዛ'], ['🍩', 'Donut', 'ዶናት'], ['🎂', 'Torte', 'ኬክ'], ['☕', 'Kaffee', 'ቡና'], ['🥚', 'Ei', 'እንቁላል'],
  ['🐱', 'Katze', 'ድመት'], ['🐶', 'Hund', 'ውሻ'], ['🐟', 'Fisch', 'ዓሣ'], ['🐦', 'Vogel', 'ወፍ'], ['🐢', 'Schildkröte', 'ኤሊ'],
  ['🐘', 'Elefant', 'ዝሆን'], ['🦁', 'Löwe', 'አንበሳ'], ['🐄', 'Kuh', 'ላም'], ['🐑', 'Schaf', 'በግ'], ['🐓', 'Hahn', 'ዶሮ'],
  ['🦋', 'Schmetterling', 'ቢራቢሮ'], ['🐝', 'Biene', 'ንብ'], ['🌸', 'Blume', 'አበባ'], ['🌳', 'Baum', 'ዛፍ'], ['🌵', 'Kaktus', 'ቁልቋል'],
  ['⭐', 'Stern', 'ኮከብ'], ['🌙', 'Mond', 'ጨረቃ'], ['☀️', 'Sonne', 'ፀሐይ'], ['☁️', 'Wolke', 'ደመና'], ['⚽', 'Ball', 'ኳስ'],
  ['🎈', 'Luftballon', 'ፊኛ'], ['🎁', 'Geschenk', 'ስጦታ'], ['🔑', 'Schlüssel', 'ቁልፍ'], ['✏️', 'Bleistift', 'እርሳስ'], ['📚', 'Bücher', 'መጻሕፍት'],
  ['⏰', 'Wecker', 'የማንቂያ ሰዓት'], ['💡', 'Glühbirne', 'አምፖል'], ['📱', 'Handy', 'ስልክ'], ['🚗', 'Auto', 'መኪና'], ['🚲', 'Fahrrad', 'ብስክሌት'],
  ['✈️', 'Flugzeug', 'አውሮፕላን'], ['🚂', 'Zug', 'ባቡር'], ['⛵', 'Boot', 'ጀልባ'], ['🏠', 'Haus', 'ቤት'], ['👟', 'Schuh', 'ጫማ'],
  ['🎩', 'Hut', 'ባርኔጣ'], ['👓', 'Brille', 'መነጽር'], ['☂️', 'Regenschirm', 'ጃንጥላ'], ['🎸', 'Gitarre', 'ጊታር'], ['🥁', 'Trommel', 'ከበሮ'],
  ['🧸', 'Teddybär', 'የአሻንጉሊት ድብ'], ['🍄', 'Pilz', 'እንጉዳይ'], ['🧦', 'Socke', 'ካልሲ'], ['🦒', 'Giraffe', 'ቀጭኔ'], ['🐸', 'Frosch', 'እንቁራሪት'],
];
// Kärtchen-Farben: [Farbe, Deutsch, Amharisch]
window.X_COLORS = [
  ['#ff6b6b', 'rot', 'ቀይ'], ['#54a0ff', 'blau', 'ሰማያዊ'], ['#1dd1a1', 'grün', 'አረንጓዴ'], ['#feca57', 'gelb', 'ቢጫ'],
  ['#a55eea', 'lila', 'ወይን ጠጅ'], ['#ff9f43', 'orange', 'ብርቱካናማ'], ['#ff9ff3', 'rosa', 'ሮዝ'], ['#c8d6e5', 'grau', 'ግራጫ'],
];
// Schneller Sortierer: [Emoji-Symbol, Deutsch, Amharisch, 'Emojis …'] – kein Emoji kommt in zwei Körben vor
window.X_SORT = [
  ['🍎', 'Obst', 'ፍራፍሬ', '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥝 🫐'],
  ['🥕', 'Gemüse', 'አትክልት', '🥕 🥦 🥬 🥒 🌽 🍆 🥔 🧅 🧄 🫑'],
  ['🐶', 'Landtiere', 'የየብስ እንስሳት', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐘 🦒 🦓 🐪 🐴'],
  ['🐟', 'Wassertiere', 'የውሃ እንስሳት', '🐟 🐠 🐡 🦈 🐙 🦑 🦀 🦞 🐬 🐳 🐋 🦭'],
  ['🐦', 'Vögel', 'ወፎች', '🐦 🐧 🦅 🦆 🦉 🦜 🦩 🐓 🦚 🕊️ 🦢'],
  ['🚗', 'Fahrzeuge', 'ተሽከርካሪዎች', '🚗 🚕 🚌 🚎 🏎️ 🚓 🚑 🚒 🚚 🚜 🛵 🏍️ 🚲 🚂 ✈️ 🚁 ⛵ 🚢'],
  ['👕', 'Kleidung', 'ልብሶች', '👕 👖 👗 🧥 🧣 🧤 🧦 👟 👠 👢 🎩 🧢 👒 👔 🩳'],
  ['⚽', 'Sport', 'ስፖርት', '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🏓 🏸 ⛳ 🏒 🎿 ⛸️'],
  ['🎸', 'Musik', 'ሙዚቃ', '🎸 🎹 🥁 🎺 🎷 🎻 🪕 🪗 🎤 🎧 🎼'],
  ['☀️', 'Wetter & Himmel', 'የአየር ሁኔታ', '☀️ 🌙 ⭐ ☁️ 🌧️ ⛈️ 🌈 ❄️ 🌪️ 🌫️ ⚡'],
  ['🍰', 'Süßes', 'ጣፋጭ', '🍰 🎂 🧁 🍩 🍪 🍫 🍬 🍭 🍮 🍦 🍨'],
  ['🔨', 'Werkzeug', 'መሣሪያዎች', '🔨 🪛 🔧 🪚 🧰 🧲 🪜 🔩 ⚙️'],
  ['🛋️', 'Möbel & Haus', 'የቤት ዕቃ', '🛋️ 🛏️ 🪑 🚪 🪟 🛁 🚿 🚽 🪞 🕯️'],
  ['✏️', 'Schule', 'ትምህርት ቤት', '✏️ 📚 📏 🖍️ 🎒 📓 📒 🖊️ 📎 ✂️ 📐'],
  ['🌳', 'Pflanzen', 'ተክሎች', '🌳 🌲 🌴 🌵 🌷 🌸 🌹 🌻 🌼 🍀 🌿 🍁'],
  ['🥛', 'Getränke', 'መጠጦች', '🥛 ☕ 🍵 🥤 🧃 🧋 🫖 💧'],
  ['🍕', 'Herzhaftes Essen', 'ምግብ', '🍕 🍔 🌭 🍟 🥪 🌮 🌯 🍝 🍜 🍲 🍛 🥗 🍞 🥨'],
];
// Wort-Bombe: Themen [Deutsch, Amharisch]
window.X_THEMES = [
  ['Obst', 'ፍራፍሬ'], ['Gemüse', 'አትክልት'], ['Tiere', 'እንስሳት'], ['Haustiere', 'የቤት እንስሳት'], ['Vögel', 'ወፎች'],
  ['Tiere im Wasser', 'በውሃ ውስጥ የሚኖሩ እንስሳት'], ['Insekten', 'ነፍሳት'], ['Länder', 'አገሮች'], ['Länder in Afrika', 'የአፍሪካ አገሮች'], ['Länder in Europa', 'የአውሮፓ አገሮች'],
  ['Hauptstädte', 'ዋና ከተሞች'], ['Städte in Äthiopien', 'የኢትዮጵያ ከተሞች'], ['Städte in Deutschland', 'የጀርመን ከተሞች'], ['Farben', 'ቀለሞች'], ['Berufe', 'ሙያዎች'],
  ['Sportarten', 'የስፖርት ዓይነቶች'], ['Dinge in der Küche', 'በኩሽና ውስጥ ያሉ ነገሮች'], ['Dinge im Badezimmer', 'በመታጠቢያ ቤት ውስጥ ያሉ ነገሮች'], ['Dinge im Schlafzimmer', 'በመኝታ ክፍል ውስጥ ያሉ ነገሮች'], ['Dinge in der Schule', 'በትምህርት ቤት ያሉ ነገሮች'],
  ['Kleidung', 'ልብሶች'], ['Fahrzeuge', 'ተሽከርካሪዎች'], ['Automarken', 'የመኪና ብራንዶች'], ['Musikinstrumente', 'የሙዚቃ መሣሪያዎች'], ['Getränke', 'መጠጦች'],
  ['Süßigkeiten', 'ጣፋጮች'], ['Äthiopische Gerichte', 'የኢትዮጵያ ምግቦች'], ['Gerichte aus aller Welt', 'የዓለም ምግቦች'], ['Gewürze', 'ቅመሞች'], ['Frühstück', 'ቁርስ'],
  ['Vornamen', 'የሰው ስሞች'], ['Jungennamen', 'የወንድ ስሞች'], ['Mädchennamen', 'የሴት ስሞች'], ['Fußballvereine', 'የእግር ኳስ ክለቦች'], ['Fußballspieler', 'የእግር ኳስ ተጫዋቾች'],
  ['Sänger und Bands', 'ዘፋኞችና ባንዶች'], ['Filme', 'ፊልሞች'], ['Zeichentrickfiguren', 'የካርቱን ገጸ ባሕሪያት'], ['Apps', 'መተግበሪያዎች'], ['Marken', 'ብራንዶች'],
  ['Dinge, die fliegen', 'የሚበሩ ነገሮች'], ['Dinge, die rund sind', 'ክብ የሆኑ ነገሮች'], ['Dinge, die rot sind', 'ቀይ የሆኑ ነገሮች'], ['Dinge, die grün sind', 'አረንጓዴ የሆኑ ነገሮች'], ['Dinge, die gelb sind', 'ቢጫ የሆኑ ነገሮች'],
  ['Dinge, die weiß sind', 'ነጭ የሆኑ ነገሮች'], ['Dinge, die süß schmecken', 'ጣፋጭ የሆኑ ነገሮች'], ['Dinge, die kalt sind', 'ቀዝቃዛ የሆኑ ነገሮች'], ['Dinge, die heiß sind', 'ሞቃት የሆኑ ነገሮች'], ['Dinge, die man im Kühlschrank findet', 'በማቀዝቀዣ ውስጥ የሚገኙ ነገሮች'],
  ['Dinge mit Rädern', 'ጎማ ያላቸው ነገሮች'], ['Dinge mit Knöpfen', 'ቁልፍ ያላቸው ነገሮች'], ['Dinge aus Holz', 'ከእንጨት የተሠሩ ነገሮች'], ['Dinge aus Glas', 'ከብርጭቆ የተሠሩ ነገሮች'], ['Dinge aus Papier', 'ከወረቀት የተሠሩ ነገሮች'],
  ['Dinge, die Strom brauchen', 'ኤሌክትሪክ የሚፈልጉ ነገሮች'], ['Dinge in einer Tasche', 'በቦርሳ ውስጥ ያሉ ነገሮች'], ['Dinge am Strand', 'በባሕር ዳርቻ ያሉ ነገሮች'], ['Dinge im Garten', 'በግቢ ውስጥ ያሉ ነገሮች'], ['Dinge im Supermarkt', 'በሱፐርማርኬት ያሉ ነገሮች'],
  ['Dinge in der Stadt', 'በከተማ ውስጥ ያሉ ነገሮች'], ['Dinge auf dem Bauernhof', 'በእርሻ ቦታ ያሉ ነገሮች'], ['Dinge im Weltall', 'በጠፈር ውስጥ ያሉ ነገሮች'], ['Dinge im Meer', 'በባሕር ውስጥ ያሉ ነገሮች'], ['Dinge im Wald', 'በጫካ ውስጥ ያሉ ነገሮች'],
  ['Spielzeug', 'መጫወቻዎች'], ['Spiele', 'ጨዋታዎች'], ['Brettspiele und Kartenspiele', 'የሰሌዳና የካርታ ጨዋታዎች'], ['Videospiele', 'የቪዲዮ ጨዋታዎች'], ['Hobbys', 'የትርፍ ጊዜ ማሳለፊያዎች'],
  ['Wetter', 'የአየር ሁኔታ'], ['Jahreszeiten und Feste', 'ወቅቶችና በዓላት'], ['Feiertage', 'በዓላት'], ['Dinge auf einer Hochzeit', 'በሠርግ ላይ ያሉ ነገሮች'], ['Dinge auf einer Party', 'በድግስ ላይ ያሉ ነገሮች'],
  ['Körperteile', 'የአካል ክፍሎች'], ['Dinge im Gesicht', 'በፊት ላይ ያሉ ነገሮች'], ['Familienmitglieder', 'የቤተሰብ አባላት'], ['Gefühle', 'ስሜቶች'], ['Eigenschaften', 'ባሕርያት'],
  ['Verben (Tätigkeiten)', 'ግሶች (ድርጊቶች)'], ['Dinge, die man trinken kann', 'የሚጠጡ ነገሮች'], ['Dinge, die man essen kann', 'የሚበሉ ነገሮች'], ['Dinge, die man anziehen kann', 'የሚለበሱ ነገሮች'], ['Dinge, die man lesen kann', 'የሚነበቡ ነገሮች'],
  ['Dinge, die Geräusche machen', 'ድምፅ የሚያሰሙ ነገሮች'], ['Dinge, die man im Urlaub braucht', 'ለእረፍት የሚያስፈልጉ ነገሮች'], ['Dinge, die man verlieren kann', 'ሊጠፉ የሚችሉ ነገሮች'], ['Dinge, die kaputt gehen können', 'ሊሰበሩ የሚችሉ ነገሮች'], ['Dinge, die man teilen kann', 'ሊካፈሉ የሚችሉ ነገሮች'],
  ['Dinge mit Flügeln', 'ክንፍ ያላቸው ነገሮች'], ['Dinge mit Beinen', 'እግር ያላቸው ነገሮች'], ['Dinge mit Löchern', 'ቀዳዳ ያላቸው ነገሮች'], ['Dinge, die leuchten', 'የሚያበሩ ነገሮች'], ['Dinge, die man aufmachen kann', 'የሚከፈቱ ነገሮች'],
  ['Flüsse und Seen', 'ወንዞችና ሐይቆች'], ['Berge', 'ተራሮች'], ['Sehenswürdigkeiten', 'የሚጎበኙ ቦታዎች'], ['Sprachen', 'ቋንቋዎች'], ['Kontinente und Meere', 'አህጉራትና ውቅያኖሶች'],
  ['Tiere in Afrika', 'የአፍሪካ እንስሳት'], ['Tiere mit vier Beinen', 'አራት እግር ያላቸው እንስሳት'], ['Große Tiere', 'ትልልቅ እንስሳት'], ['Kleine Tiere', 'ትናንሽ እንስሳት'], ['Tiere, die man im Zoo sieht', 'በእንስሳት ማቆያ የሚታዩ እንስሳት'],
  ['Blumen und Pflanzen', 'አበቦችና ተክሎች'], ['Bäume', 'ዛፎች'], ['Brot und Gebäck', 'ዳቦና ኬኮች'], ['Pizza-Beläge', 'የፒዛ ላይ የሚጨመሩ ነገሮች'], ['Eissorten', 'የአይስክሬም ዓይነቶች'],
  ['Dinge zum Frühstück in Äthiopien', 'በኢትዮጵያ ለቁርስ የሚበሉ ነገሮች'], ['Dinge bei der Kaffeezeremonie', 'በቡና ሥነ ሥርዓት ላይ ያሉ ነገሮች'], ['Dinge auf dem Markt (Merkato)', 'በመርካቶ ያሉ ነገሮች'], ['Äthiopische Sänger', 'የኢትዮጵያ ዘፋኞች'], ['Äthiopische Läufer', 'የኢትዮጵያ ሯጮች'],
  ['Dinge im Auto', 'በመኪና ውስጥ ያሉ ነገሮች'], ['Dinge am Flughafen', 'በኤርፖርት ያሉ ነገሮች'], ['Dinge im Zug', 'በባቡር ውስጥ ያሉ ነገሮች'], ['Dinge im Büro', 'በቢሮ ያሉ ነገሮች'], ['Dinge auf dem Spielplatz', 'በመጫወቻ ሜዳ ያሉ ነገሮች'],
  ['Dinge im Kino', 'በሲኒማ ቤት ያሉ ነገሮች'], ['Dinge im Restaurant', 'በምግብ ቤት ያሉ ነገሮች'], ['Dinge in einem Koffer', 'በሻንጣ ውስጥ ያሉ ነገሮች'], ['Dinge auf dem Schreibtisch', 'በጠረጴዛ ላይ ያሉ ነገሮች'], ['Dinge an der Wand', 'በግድግዳ ላይ ያሉ ነገሮች'],
  ['Wörter mit A am Anfang', 'በ„አ“ የሚጀምሩ ቃላት'], ['Wörter mit B am Anfang', 'በ„በ“ የሚጀምሩ ቃላት'], ['Wörter mit M am Anfang', 'በ„መ“ የሚጀምሩ ቃላት'], ['Wörter mit S am Anfang', 'በ„ሰ“ የሚጀምሩ ቃላት'], ['Wörter mit K am Anfang', 'በ„ከ“ የሚጀምሩ ቃላት'],
  ['Dinge, die man im Sommer macht', 'በበጋ የሚደረጉ ነገሮች'], ['Dinge, die man am Wochenende macht', 'በሳምንቱ መጨረሻ የሚደረጉ ነገሮች'], ['Dinge, die man morgens macht', 'ጠዋት የሚደረጉ ነገሮች'], ['Dinge, die Kinder mögen', 'ልጆች የሚወዷቸው ነገሮች'], ['Dinge, die glücklich machen', 'የሚያስደስቱ ነገሮች'],
  ['Superhelden und Märchenfiguren', 'የጀግና እና የተረት ገጸ ባሕሪያት'], ['Fernsehsender und Serien', 'የቴሌቪዥን ጣቢያዎችና ተከታታዮች'], ['Social Media', 'ማኅበራዊ ሚዲያ'], ['Dinge am Handy', 'በስልክ ላይ ያሉ ነገሮች'], ['Computer-Sachen', 'የኮምፒውተር ነገሮች'],
  ['Zahlen (als Wort)', 'ቁጥሮች (በቃል)'], ['Formen', 'ቅርጾች'], ['Materialien', 'ቁሳቁሶች'], ['Edelsteine und Metalle', 'የከበሩ ድንጋዮችና ብረቶች'], ['Planeten und Sterne', 'ፕላኔቶችና ኮከቦች'],
  ['Getreide und Körner', 'እህሎች'], ['Nüsse und Samen', 'ለውዝና ፍሬዎች'], ['Milchprodukte', 'የወተት ተዋጽኦዎች'], ['Fleisch und Fisch', 'ሥጋና ዓሣ'], ['Soßen und Dips', 'ወጦችና መረቆች'],
];
})();
