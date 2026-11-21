#!/usr/bin/env node
// Baut mimic/geo/geo.js für „Wo liegt das?“: Weltkarte (Natural Earth 1:110m, gemeinfrei, über das
// npm-Paket world-atlas) + Orte mit Koordinaten. Aufruf:
//   npm i world-atlas@2 topojson-client@3   (in einem beliebigen Ordner, dann NODE_PATH setzen)
//   node tools/build-geo.js
// Projektion: einfach (equirectangular), 1 Grad = 4 Einheiten → x = (Länge+180)·4, y = (90−Breite)·4
const fs = require('fs'), path = require('path');
const topo = require('topojson-client');
const atlas = path.dirname(require.resolve('world-atlas/package.json'));
const K = 4, P = ([lon, lat]) => [(lon + 180) * K, (90 - lat) * K];
function pathOf(geom, minD, closed) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  let d = '';
  for (const poly of polys) for (const ring of poly) {
    const pts = []; let last = null;
    for (const c of ring) { const p = P(c); if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minD) { pts.push(p); last = p; } }
    if (pts.length < (closed ? 3 : 2)) continue;
    // Linien, die über die Datumsgrenze springen (z. B. Fidschi, Ostsibirien), nicht quer über die Karte ziehen
    const jump = pts.some((p, i) => i && Math.abs(p[0] - pts[i - 1][0]) > 400);
    if (jump) { let seg = []; const flush = () => { if (seg.length >= 2) d += 'M' + seg.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'); seg = []; };
      pts.forEach((p, i) => { if (i && Math.abs(p[0] - pts[i - 1][0]) > 400) flush(); seg.push(p); }); flush(); continue; }
    d += 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + (closed ? 'Z' : '');
  }
  return d.replace(/\.0(?=[ LMZ]|$)/g, '');
}
const land = JSON.parse(fs.readFileSync(path.join(atlas, 'land-110m.json')));
const cty = JSON.parse(fs.readFileSync(path.join(atlas, 'countries-110m.json')));
const landD = pathOf(topo.merge(land, land.objects.land.geometries), 0.3, true);
const bordersD = pathOf(topo.mesh(cty, cty.objects.countries, (a, b) => a !== b), 0.3, false);

// Ausschnitte der Karte (viewBox) je Gebiet
const VIEWS = {
  w: '0 40 1440 552',     // ganze Welt (ohne Antarktis)
  eu: '672 72 216 152',   // Europa
  af: '640 208 300 296',  // Afrika
  as: '840 110 500 300',  // Asien (mit Nahost)
  am: '190 110 420 480',  // Amerika
  de: '738 134 48 40',    // Deutschland
  et: '846 296 72 54',    // Äthiopien
};
// Name DE | Name AM | Breite | Länge | Gebiet
const PLACES = `
Addis Abeba|አዲስ አበባ|9.03|38.74|et
Bahir Dar|ባሕር ዳር|11.59|37.39|et
Gondar|ጎንደር|12.6|37.47|et
Lalibela|ላሊበላ|12.03|39.04|et
Aksum|አክሱም|14.12|38.72|et
Mekele|መቀሌ|13.5|39.47|et
Dire Dawa|ድሬ ዳዋ|9.6|41.85|et
Harar|ሐረር|9.31|42.12|et
Hawassa|ሀዋሳ|7.06|38.48|et
Jimma|ጅማ|7.67|36.83|et
Dessie|ደሴ|11.13|39.63|et
Adama (Nazret)|አዳማ (ናዝሬት)|8.54|39.27|et
Arba Minch|አርባ ምንጭ|6.03|37.55|et
Debre Markos|ደብረ ማርቆስ|10.33|37.72|et
Debre Birhan|ደብረ ብርሃን|9.68|39.53|et
Gambela|ጋምቤላ|8.25|34.59|et
Jijiga|ጅጅጋ|9.35|42.8|et
Asosa|አሶሳ|10.07|34.53|et
Nekemte|ነቀምት|9.09|36.55|et
Shashamane|ሻሸመኔ|7.2|38.6|et
Bishoftu (Debre Zeit)|ቢሾፍቱ (ደብረ ዘይት)|8.75|38.98|et
Woldia|ወልዲያ|11.83|39.6|et
Hosaena|ሆሳዕና|7.55|37.85|et
Dilla|ዲላ|6.41|38.31|et
Moyale|ሞያሌ|3.52|39.06|et
Semera|ሰመራ|11.79|41.01|et
Adigrat|ዓዲግራት|14.28|39.46|et
Tanasee|ጣና ሐይቅ|12.0|37.3|et
Ras Daschen|ራስ ዳሽን|13.24|38.37|et
Danakil-Senke|የዳናኪል ዝቅተኛ ቦታ|14.2|40.3|et
Berlin|በርሊን|52.52|13.4|de
Hamburg|ሃምቡርግ|53.55|9.99|de
München|ሙኒክ|48.14|11.58|de
Köln|ኮሎኝ|50.94|6.96|de
Frankfurt am Main|ፍራንክፈርት|50.11|8.68|de
Stuttgart|ሽቱትጋርት|48.78|9.18|de
Düsseldorf|ዱሰልዶርፍ|51.23|6.78|de
Leipzig|ላይፕዚግ|51.34|12.37|de
Dresden|ድሬስደን|51.05|13.74|de
Hannover|ሃኖቨር|52.37|9.73|de
Nürnberg|ኑረምበርግ|49.45|11.08|de
Bremen|ብሬመን|53.08|8.8|de
Dortmund|ዶርትሙንድ|51.51|7.47|de
Essen|ኤሰን|51.46|7.01|de
Kiel|ኪል|54.32|10.13|de
Rostock|ሮስቶክ|54.09|12.1|de
Freiburg|ፍራይቡርግ|47.99|7.85|de
Münster|ሙንስተር|51.96|7.63|de
Erfurt|ኤርፉርት|50.98|11.03|de
Magdeburg|ማግደቡርግ|52.12|11.63|de
Mainz|ማይንዝ|49.99|8.25|de
Saarbrücken|ዛርብሩከን|49.23|7.0|de
Regensburg|ሬገንስቡርግ|49.01|12.1|de
Augsburg|አውግስቡርግ|48.37|10.9|de
Würzburg|ቩርዝቡርግ|49.79|9.95|de
Kassel|ካሰል|51.31|9.48|de
Potsdam|ፖትስዳም|52.39|13.06|de
Heidelberg|ሃይደልበርግ|49.4|8.67|de
Flensburg|ፍሌንስቡርግ|54.78|9.44|de
Zugspitze|ዙግሽፒትዘ|47.42|10.99|de
Bodensee|ቦደን ሐይቅ|47.6|9.4|de
Insel Rügen|የሩገን ደሴት|54.4|13.4|de
Paris|ፓሪስ|48.86|2.35|eu
London|ለንደን|51.51|-0.13|eu
Madrid|ማድሪድ|40.42|-3.7|eu
Barcelona|ባርሴሎና|41.39|2.17|eu
Lissabon|ሊዝበን|38.72|-9.14|eu
Rom|ሮም|41.9|12.5|eu
Mailand|ሚላን|45.46|9.19|eu
Venedig|ቬኒስ|45.44|12.33|eu
Neapel|ኔፕልስ|40.85|14.27|eu
Athen|አቴንስ|37.98|23.73|eu
Wien|ቪየና|48.21|16.37|eu
Zürich|ዙሪክ|47.38|8.54|eu
Genf|ጄኔቫ|46.2|6.14|eu
Amsterdam|አምስተርዳም|52.37|4.9|eu
Brüssel|ብራስልስ|50.85|4.35|eu
Kopenhagen|ኮፐንሃገን|55.68|12.57|eu
Stockholm|ስቶክሆልም|59.33|18.07|eu
Oslo|ኦስሎ|59.91|10.75|eu
Helsinki|ሄልሲንኪ|60.17|24.94|eu
Warschau|ዋርሶ|52.23|21.01|eu
Prag|ፕራግ|50.08|14.44|eu
Budapest|ቡዳፔስት|47.5|19.04|eu
Bukarest|ቡካሬስት|44.43|26.1|eu
Sofia|ሶፊያ|42.7|23.32|eu
Belgrad|ቤልግሬድ|44.79|20.45|eu
Zagreb|ዛግሬብ|45.81|15.98|eu
Dublin|ደብሊን|53.35|-6.26|eu
Edinburgh|ኤደንበራ|55.95|-3.19|eu
Reykjavík|ሬይኪያቪክ|64.15|-21.94|w
Istanbul|ኢስታንቡል|41.01|28.98|eu
Kiew|ኪየቭ|50.45|30.52|eu
Moskau|ሞስኮ|55.76|37.62|eu
Sankt Petersburg|ሴንት ፒተርስበርግ|59.93|30.34|eu
Riga|ሪጋ|56.95|24.11|eu
Vilnius|ቪልኒየስ|54.69|25.28|eu
Tallinn|ታሊን|59.44|24.75|eu
Marseille|ማርሴይ|43.3|5.37|eu
Lyon|ሊዮን|45.76|4.84|eu
Porto|ፖርቶ|41.15|-8.61|eu
Sevilla|ሴቪያ|37.39|-5.98|eu
Palermo|ፓሌርሞ|38.12|13.36|eu
Malta (Valletta)|ማልታ (ቫሌታ)|35.9|14.51|eu
Mallorca (Palma)|ማሎርካ (ፓልማ)|39.57|2.65|eu
Kreta (Heraklion)|ክሬታ (ሄራክሊዮን)|35.34|25.13|eu
Monaco|ሞናኮ|43.74|7.42|eu
Luxemburg|ሉክሰምበርግ|49.61|6.13|eu
Krakau|ክራኮው|50.06|19.94|eu
Minsk|ሚንስክ|53.9|27.57|eu
Kairo|ካይሮ|30.04|31.24|af
Nairobi|ናይሮቢ|-1.29|36.82|af
Lagos|ሌጎስ|6.52|3.38|af
Abuja|አቡጃ|9.08|7.4|af
Accra|አክራ|5.6|-0.19|af
Dakar|ዳካር|14.72|-17.47|af
Kapstadt|ኬፕ ታውን|-33.92|18.42|af
Johannesburg|ጆሃንስበርግ|-26.2|28.05|af
Kinshasa|ኪንሻሳ|-4.44|15.27|af
Luanda|ሉዋንዳ|-8.84|13.23|af
Daressalam|ዳሬ ሰላም|-6.79|39.21|af
Kampala|ካምፓላ|0.35|32.58|af
Kigali|ኪጋሊ|-1.95|30.06|af
Khartum|ካርቱም|15.5|32.56|af
Dschuba|ጁባ|4.85|31.58|af
Mogadischu|ሞቃዲሾ|2.05|45.32|af
Dschibuti (Stadt)|ጅቡቲ (ከተማ)|11.59|43.15|af
Asmara|አሥመራ|15.32|38.93|af
Casablanca|ካዛብላንካ|33.57|-7.59|af
Marrakesch|ማራኬሽ|31.63|-8.0|af
Algier|አልጀርስ|36.75|3.06|af
Tunis|ቱኒስ|36.81|10.18|af
Tripolis|ትሪፖሊ|32.89|13.19|af
Abidjan|አቢጃን|5.36|-4.01|af
Bamako|ባማኮ|12.64|-8.0|af
Timbuktu|ቲምቡክቱ|16.77|-3.0|af
Niamey|ኒያሜ|13.51|2.13|af
N’Djamena|ንጃሜና|12.13|15.06|af
Yaoundé|ያውንዴ|3.85|11.5|af
Antananarivo|አንታናናሪቮ|-18.88|47.51|af
Maputo|ማፑቶ|-25.97|32.57|af
Harare|ሐራሬ|-17.83|31.05|af
Lusaka|ሉሳካ|-15.39|28.32|af
Windhuk|ዊንድሆክ|-22.56|17.08|af
Gaborone|ጋቦሮኒ|-24.65|25.91|af
Sansibar|ዛንዚባር|-6.16|39.2|af
Kilimandscharo|ኪሊማንጃሮ|-3.07|37.35|af
Victoriafälle|የቪክቶሪያ ፏፏቴ|-17.92|25.86|af
Victoriasee|ቪክቶሪያ ሐይቅ|-1.0|33.0|af
Mombasa|ሞምባሳ|-4.04|39.67|af
Luxor|ሉክሶር|25.69|32.64|af
Alexandria|እስክንድርያ|31.2|29.92|af
Tokio|ቶኪዮ|35.68|139.69|as
Peking|ቤጂንግ|39.9|116.41|as
Shanghai|ሻንጋይ|31.23|121.47|as
Hongkong|ሆንግ ኮንግ|22.32|114.17|as
Seoul|ሴኡል|37.57|126.98|as
Bangkok|ባንኮክ|13.76|100.5|as
Singapur|ሲንጋፖር|1.35|103.82|as
Jakarta|ጃካርታ|-6.21|106.85|as
Manila|ማኒላ|14.6|120.98|as
Hanoi|ሃኖይ|21.03|105.85|as
Kuala Lumpur|ኳላ ላምፑር|3.14|101.69|as
Delhi|ዴሊ|28.61|77.21|as
Mumbai|ሙምባይ|19.08|72.88|as
Kalkutta|ኮልካታ|22.57|88.36|as
Karatschi|ካራቺ|24.86|67.01|as
Kathmandu|ካትማንዱ|27.72|85.32|as
Dhaka|ዳካ|23.81|90.41|as
Colombo|ኮሎምቦ|6.93|79.86|as
Dubai|ዱባይ|25.2|55.27|as
Riad|ሪያድ|24.71|46.68|as
Mekka|መካ|21.39|39.86|as
Jerusalem|እየሩሳሌም|31.77|35.21|as
Bagdad|ባግዳድ|33.31|44.37|as
Teheran|ቴህራን|35.69|51.39|as
Kabul|ካቡል|34.56|69.21|as
Taschkent|ታሽከንት|41.3|69.24|as
Almaty|አልማቲ|43.24|76.89|as
Ulaanbaatar|ኡላን ባቶር|47.89|106.91|as
Taipeh|ታይፔ|25.03|121.57|as
Osaka|ኦሳካ|34.69|135.5|as
Mount Everest|ኤቨረስት ተራራ|27.99|86.93|as
Bali|ባሊ|-8.34|115.09|as
Sanaa|ሰንዓ|15.37|44.19|as
Doha|ዶሃ|25.29|51.53|as
New York|ኒው ዮርክ|40.71|-74.01|am
Los Angeles|ሎስ አንጀለስ|34.05|-118.24|am
Chicago|ቺካጎ|41.88|-87.63|am
Washington|ዋሽንግተን|38.9|-77.04|am
Miami|ማያሚ|25.76|-80.19|am
San Francisco|ሳን ፍራንሲስኮ|37.77|-122.42|am
Seattle|ሲያትል|47.61|-122.33|am
Las Vegas|ላስ ቬጋስ|36.17|-115.14|am
Houston|ሂዩስተን|29.76|-95.37|am
Toronto|ቶሮንቶ|43.65|-79.38|am
Vancouver|ቫንኩቨር|49.28|-123.12|am
Montreal|ሞንትሪያል|45.5|-73.57|am
Mexiko-Stadt|ሜክሲኮ ሲቲ|19.43|-99.13|am
Havanna|ሃቫና|23.11|-82.37|am
Panama-Stadt|ፓናማ ሲቲ|8.98|-79.52|am
Bogotá|ቦጎታ|4.71|-74.07|am
Lima|ሊማ|-12.05|-77.04|am
Quito|ኪቶ|-0.18|-78.47|am
Caracas|ካራካስ|10.48|-66.9|am
Rio de Janeiro|ሪዮ ዴ ጄኔሮ|-22.91|-43.17|am
São Paulo|ሳኦ ፓውሎ|-23.55|-46.63|am
Brasília|ብራዚሊያ|-15.79|-47.88|am
Buenos Aires|ቦነስ አይረስ|-34.6|-58.38|am
Santiago de Chile|ሳንቲያጎ|-33.45|-70.67|am
La Paz|ላ ፓዝ|-16.5|-68.15|am
Montevideo|ሞንቴቪዴዮ|-34.9|-56.16|am
Machu Picchu|ማቹ ፒቹ|-13.16|-72.55|am
Kingston (Jamaika)|ኪንግስተን (ጃማይካ)|17.97|-76.79|am
Anchorage (Alaska)|አንኮሬጅ (አላስካ)|61.22|-149.9|w
Niagarafälle|የናያግራ ፏፏቴ|43.08|-79.07|am
Grand Canyon|ግራንድ ካንየን|36.1|-112.11|am
Feuerland (Ushuaia)|ኡሹዋያ|-54.8|-68.3|am
Sydney|ሲድኒ|-33.87|151.21|w
Melbourne|ሜልበርን|-37.81|144.96|w
Perth|ፐርት|-31.95|115.86|w
Auckland|ኦክላንድ|-36.85|174.76|w
Honolulu (Hawaii)|ሆኖሉሉ (ሃዋይ)|21.31|-157.86|w
Nordpol-Nähe: Spitzbergen|ስቫልባርድ|78.22|15.65|w
Grönland (Nuuk)|ግሪንላንድ (ኑክ)|64.18|-51.72|w
Madagaskar (Mitte)|ማዳጋስካር (መሐል)|-19.0|46.9|w
Island (Mitte)|አይስላንድ (መሐል)|64.9|-18.6|w
Tahiti|ታሂቲ|-17.65|-149.43|w
Kapverden (Praia)|ኬፕ ቨርዴ (ፕራያ)|14.93|-23.51|w
Fidschi (Suva)|ፊጂ (ሱቫ)|-18.14|178.44|w
Malediven (Malé)|ማልዲቭስ (ማሌ)|4.18|73.51|w
Galápagos-Inseln|የጋላፓጎስ ደሴቶች|-0.95|-90.97|w
Osterinsel|የፋሲካ ደሴት|-27.11|-109.35|w
Mauritius|ሞሪሸስ|-20.16|57.5|w
Addis Abeba (auf der Weltkarte)|አዲስ አበባ (በዓለም ካርታ ላይ)|9.03|38.74|w
Berlin (auf der Weltkarte)|በርሊን (በዓለም ካርታ ላይ)|52.52|13.4|w
Tokio (auf der Weltkarte)|ቶኪዮ (በዓለም ካርታ ላይ)|35.68|139.69|w
New York (auf der Weltkarte)|ኒው ዮርክ (በዓለም ካርታ ላይ)|40.71|-74.01|w
Rio de Janeiro (auf der Weltkarte)|ሪዮ ዴ ጄኔሮ (በዓለም ካርታ ላይ)|-22.91|-43.17|w
Kapstadt (auf der Weltkarte)|ኬፕ ታውን (በዓለም ካርታ ላይ)|-33.92|18.42|w
Moskau (auf der Weltkarte)|ሞስኮ (በዓለም ካርታ ላይ)|55.76|37.62|w
Mumbai (auf der Weltkarte)|ሙምባይ (በዓለም ካርታ ላይ)|19.08|72.88|w
Mexiko-Stadt (auf der Weltkarte)|ሜክሲኮ ሲቲ (በዓለም ካርታ ላይ)|19.43|-99.13|w
Peking (auf der Weltkarte)|ቤጂንግ (በዓለም ካርታ ላይ)|39.9|116.41|w
Kairo (auf der Weltkarte)|ካይሮ (በዓለም ካርታ ላይ)|30.04|31.24|w
Dubai (auf der Weltkarte)|ዱባይ (በዓለም ካርታ ላይ)|25.2|55.27|w
Buenos Aires (auf der Weltkarte)|ቦነስ አይረስ (በዓለም ካርታ ላይ)|-34.6|-58.38|w
Los Angeles (auf der Weltkarte)|ሎስ አንጀለስ (በዓለም ካርታ ላይ)|34.05|-118.24|w
Singapur (auf der Weltkarte)|ሲንጋፖር (በዓለም ካርታ ላይ)|1.35|103.82|w
London (auf der Weltkarte)|ለንደን (በዓለም ካርታ ላይ)|51.51|-0.13|w
`.trim().split('\n').map((l) => { const [de, am, la, lo, r] = l.split('|'); if (!VIEWS[r] || isNaN(+la) || isNaN(+lo)) throw new Error('Zeile kaputt: ' + l); return [de, am, +la, +lo, r]; });
// jeder Ort muss im Ausschnitt seines Gebiets liegen
for (const [de, , la, lo, r] of PLACES) {
  const [x0, y0, w, h] = VIEWS[r].split(' ').map(Number), [x, y] = P([lo, la]);
  if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) throw new Error(`${de} liegt nicht im Ausschnitt ${r}`);
}
const out = path.join(__dirname, '..', 'mimic', 'geo', 'geo.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '// Generiert von tools/build-geo.js – Karte: Natural Earth (gemeinfrei) über world-atlas\n'
  + 'window.GEO=' + JSON.stringify({ land: landD, borders: bordersD, views: VIEWS, places: PLACES }) + ';\n');
console.log('Orte:', PLACES.length, '| KB:', (fs.statSync(out).size / 1024).toFixed(0));
