// Baut mimic/logos/logos.js aus tools/brands.txt + dem npm-Paket "simple-icons" (CC0).
// Aufruf:  npm i simple-icons  &&  node tools/build-logos.js
const fs = require('fs'), path = require('path');
const si = require('simple-icons');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+]/g, '');
// zu unbekannt / zu speziell / doppelt -> nicht als Logo verwenden
const SKIP = new Set(['Lion Air','Aeroflot','LADA','Tile','Ring','LINE','Wise','DS Automobiles','Monzo','Napster','Trustpilot','Stripe','Indeed','Headspace','Elgato','Denon','Audio-Technica','Republic of Gamers','Opera GX','Valve','Ethereum','Figma','Transport for London','9GAG','Husqvarna','MG','Instacart','Postmates','Cash App','Goldman Sachs','Wells Fargo','Bank of America','Barclays','Pegasus Airlines','Southwest Airlines','JetBlue','Air India','AirAsia','General Motors','John Deere','Fiverr','Wix','Unreal Engine','Unity','Shopify','Stack Overflow','Jameson','Burton','Peloton','Qualcomm','Mozilla','Medium','Patreon','Udemy','Kickstarter','Imgur','Konami','Square Enix','Supercell','Monster','MAN','IVECO','DAF','Craftsman','Scania','3M','Ericsson','Fujitsu','Kingston Technology','Seagate','Synology','NETGEAR','Linksys','Blackmagic Design','Pioneer DJ','Yamaha Corporation','Ferrari N.V.','Piaggio Group','Anta','Li-Ning','Rimac Automobili','MoneyGram','Bitdefender','Ko-fi','Badoo','Chase','AccuWeather','Clubhouse','Fairphone','MailChimp','MEGA','Quizlet','Rakuten','Vauxhall','Wacom','Bilibili','Baidu','Swiggy','Zomato','iFood','Gojek','Grab','Shopee','Taobao','Allegro','Żabka','Albert Heijn','Picnic','Monoprix','Fnac','Darty','E.Leclerc','Intermarche','Auchan','ASDA','Morrisons','Iceland','Co-op','Boots',"Sam's Club",'Klook','Gumtree','Society6','Zazzle','Redbubble','Akasa Air','IndiGo','TAROM','Air Serbia','Copa Airlines','Aeroméxico','Saudia','China Eastern Airlines','China Southern Airlines','Air China','ANA','LOT Polish Airlines','avianca','nextbike','National Rail','Starship','Hitachi','HBO','Hilton Hotels & Resorts','Beats by Dre','Firefox Browser','Carlsberg Group','StockX','FARFETCH','AMG','NZXT','Cooler Master','ExpressVPN','Trip.com','GoDaddy','Macy\'s','Google Gemini','Google Meet','Google Home','Apple Arcade','iMessage','YouTube Kids','Sparkasse']);
const RENAME = { 'ŠKODA':'Škoda', 'SEAT':'Seat', 'INFINITI':'Infiniti', 'smart':'Smart', 'sharp':'Sharp', 'Steelseries':'SteelSeries', 'trivago':'Trivago', 'ARAL':'Aral', 'REWE':'Rewe', 'EDEKA':'Edeka', 'MasterCard':'Mastercard', 'FOX':'Fox', 'OPPO':'Oppo', 'vivo':'Vivo', 'NVIDIA':'Nvidia', 'ASUS':'Asus', 'Hermes':'Hermes', 'Müller':'Müller', 'Google Chrome':'Chrome', 'Jordan':'Air Jordan', 'F1':'Formel 1', 'Das Erste':'Das Erste (ARD)', 'VLC media player':'VLC', 'Yamaha Motor Corporation':'Yamaha', 'New York Times':'New York Times', 'Alibaba.com':'Alibaba', 'Etihad Airways':'Etihad', 'Deutsche Telekom':'Telekom', 'Aldi Nord':'Aldi Nord', 'PAYBACK':'Payback', 'EA':'EA (Electronic Arts)' };
const byTitle = new Map(); for (const ic of Object.values(si)) if (ic && ic.title) byTitle.set(norm(ic.title), ic);
const ALIAS = { psg: 'parissaintgermain' };
const lines = fs.readFileSync(path.join(__dirname, 'brands.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
const all = [...new Set(lines.flatMap((l) => l.split(',').map((x) => x.trim())).filter(Boolean))];
const logos = [], seenSlug = new Set(), seenPath = new Set();
for (const n of all) {
  const ic = byTitle.get(norm(n)) || byTitle.get(ALIAS[norm(n)] || '-');
  if (!ic || SKIP.has(ic.title) || seenSlug.has(ic.slug) || seenPath.has(ic.path)) continue;
  seenSlug.add(ic.slug); seenPath.add(ic.path);
  logos.push([RENAME[ic.title] || ic.title, ic.hex, ic.path]);
}
// Namensliste für die Vorschläge: alle Logos + alle bekannten Marken ohne Logo (macht es schwerer)
const names = new Set(logos.map((l) => l[0]));
for (const n of all) if (!byTitle.get(norm(n)) || !SKIP.has(byTitle.get(norm(n)).title)) { const ic = byTitle.get(norm(n)); names.add(ic ? (RENAME[ic.title] || ic.title) : n); }
const out = '// Generiert von tools/build-logos.js – Logos aus Simple Icons (CC0, simpleicons.org).\n// Alle Marken gehören ihren jeweiligen Inhabern; Nutzung hier nur zum Erkennen im Spiel.\n'
  + 'window.LOGOS=' + JSON.stringify(logos) + ';\nwindow.BRAND_NAMES=' + JSON.stringify([...names].sort((a, b) => a.localeCompare(b, 'de'))) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'mimic', 'logos', 'logos.js'), out);
console.log('Logos:', logos.length, ' Namen:', names.size, ' KB:', (out.length / 1024).toFixed(0));
console.log(logos.map((l) => l[0]).join(', '));
