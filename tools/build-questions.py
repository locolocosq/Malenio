#!/usr/bin/env python3
# Baut mimic/questions/questions.js – Schätzfragen (nur Antworten mit Zahlen), Deutsch + Amharisch.
# Format je Frage: [deutsch, amharisch, antwort, einheit_de, einheit_am, art]  (art: 'y' = Jahreszahl, '' = Zahl)
# Aufruf: python3 tools/build-questions.py
import json, os, random

Q = []
def add(de, am, ans, ude='', uam='', kind=''):
    Q.append([de, am, ans, ude, uam, kind])

# ---------------------------------------------------------------- Länder: Fläche (km²) + Einwohner (Mio., ca. 2023)
# name_de | in-Form (de) | name_am | Fläche | Mio. Einwohner (0 = keine Frage)
COUNTRIES = """Deutschland|in Deutschland|ጀርመን|357588|84
Frankreich|in Frankreich|ፈረንሳይ|551695|68
Italien|in Italien|ጣሊያን|302073|59
Spanien|in Spanien|ስፔን|505990|48
Portugal|in Portugal|ፖርቱጋል|92212|10
das Vereinigte Königreich|im Vereinigten Königreich|ዩናይትድ ኪንግደም|243610|67
Irland|in Irland|አየርላንድ|70273|5
die Niederlande|in den Niederlanden|ኔዘርላንድ|41850|18
Belgien|in Belgien|ቤልጂየም|30689|12
die Schweiz|in der Schweiz|ስዊዘርላንድ|41285|9
Österreich|in Österreich|ኦስትሪያ|83879|9
Polen|in Polen|ፖላንድ|312696|37
Tschechien|in Tschechien|ቼክ ሪፐብሊክ|78871|11
Ungarn|in Ungarn|ሀንጋሪ|93030|10
Rumänien|in Rumänien|ሮማኒያ|238397|19
Bulgarien|in Bulgarien|ቡልጋሪያ|110994|6
Griechenland|in Griechenland|ግሪክ|131957|10
die Türkei|in der Türkei|ቱርክ|783562|85
Schweden|in Schweden|ስዊድን|450295|10
Norwegen|in Norwegen|ኖርዌይ|385207|5
Finnland|in Finnland|ፊንላንድ|338455|6
Dänemark|in Dänemark|ዴንማርክ|42933|6
Island|in Island|አይስላንድ|103000|0
Russland|in Russland|ሩሲያ|17098246|146
Kroatien|in Kroatien|ክሮኤሺያ|56594|4
Serbien|in Serbien|ሰርቢያ|77474|7
Luxemburg|in Luxemburg|ሉክሰምበርግ|2586|0
Malta|auf Malta|ማልታ|316|0
die USA|in den USA|አሜሪካ|9833520|335
Kanada|in Kanada|ካናዳ|9984670|40
Mexiko|in Mexiko|ሜክሲኮ|1964375|129
Brasilien|in Brasilien|ብራዚል|8515767|216
Argentinien|in Argentinien|አርጀንቲና|2780400|46
Chile|in Chile|ቺሊ|756102|20
Kolumbien|in Kolumbien|ኮሎምቢያ|1141748|52
Peru|in Peru|ፔሩ|1285216|34
Venezuela|in Venezuela|ቬኔዙዌላ|916445|28
Ecuador|in Ecuador|ኢኳዶር|283561|18
Bolivien|in Bolivien|ቦሊቪያ|1098581|12
Paraguay|in Paraguay|ፓራጓይ|406752|7
Uruguay|in Uruguay|ኡራጓይ|176215|0
Kuba|auf Kuba|ኩባ|109884|11
Jamaika|auf Jamaika|ጃማይካ|10991|3
Haiti|in Haiti|ሄይቲ|27750|12
die Dominikanische Republik|in der Dominikanischen Republik|ዶሚኒካን ሪፐብሊክ|48671|11
Guatemala|in Guatemala|ጓቴማላ|108889|18
Costa Rica|in Costa Rica|ኮስታ ሪካ|51100|5
China|in China|ቻይና|9596961|1410
Indien|in Indien|ሕንድ|3287263|1430
Japan|in Japan|ጃፓን|377975|124
Südkorea|in Südkorea|ደቡብ ኮሪያ|100210|52
Nordkorea|in Nordkorea|ሰሜን ኮሪያ|120540|26
Taiwan|in Taiwan|ታይዋን|36197|23
die Mongolei|in der Mongolei|ሞንጎሊያ|1564110|3
Indonesien|in Indonesien|ኢንዶኔዥያ|1904569|278
die Philippinen|auf den Philippinen|ፊሊፒንስ|300000|117
Vietnam|in Vietnam|ቬትናም|331212|99
Thailand|in Thailand|ታይላንድ|513120|70
Malaysia|in Malaysia|ማሌዢያ|330803|34
Singapur|in Singapur|ሲንጋፖር|734|6
Myanmar|in Myanmar|ምያንማር|676578|54
Kambodscha|in Kambodscha|ካምቦዲያ|181035|17
Pakistan|in Pakistan|ፓኪስታን|881913|240
Bangladesch|in Bangladesch|ባንግላዲሽ|148460|173
Sri Lanka|in Sri Lanka|ስሪ ላንካ|65610|22
Nepal|in Nepal|ኔፓል|147516|30
Afghanistan|in Afghanistan|አፍጋኒስታን|652230|41
der Iran|im Iran|ኢራን|1648195|89
der Irak|im Irak|ኢራቅ|438317|45
Saudi-Arabien|in Saudi-Arabien|ሳዑዲ ዓረቢያ|2149690|37
die Vereinigten Arabischen Emirate|in den Vereinigten Arabischen Emiraten|የተባበሩት ዓረብ ኤምሬትስ|83600|10
Katar|in Katar|ኳታር|11586|3
der Jemen|im Jemen|የመን|527968|34
der Oman|im Oman|ኦማን|309500|5
Jordanien|in Jordanien|ዮርዳኖስ|89342|11
der Libanon|im Libanon|ሊባኖስ|10452|0
Israel|in Israel|እስራኤል|22072|10
Syrien|in Syrien|ሶሪያ|185180|0
Kasachstan|in Kasachstan|ካዛኪስታን|2724900|20
Australien|in Australien|አውስትራሊያ|7692024|26
Neuseeland|in Neuseeland|ኒው ዚላንድ|268021|5
Ägypten|in Ägypten|ግብፅ|1001450|112
Äthiopien|in Äthiopien|ኢትዮጵያ|1104300|126
Eritrea|in Eritrea|ኤርትራ|117600|0
Dschibuti|in Dschibuti|ጅቡቲ|23200|0
Somalia|in Somalia|ሶማሊያ|637657|18
Kenia|in Kenia|ኬንያ|580367|55
der Sudan|im Sudan|ሱዳን|1886068|48
der Südsudan|im Südsudan|ደቡብ ሱዳን|619745|11
Uganda|in Uganda|ዩጋንዳ|241550|48
Tansania|in Tansania|ታንዛኒያ|945087|65
Ruanda|in Ruanda|ሩዋንዳ|26338|14
Nigeria|in Nigeria|ናይጄሪያ|923768|224
Ghana|in Ghana|ጋና|238533|34
die Elfenbeinküste|in der Elfenbeinküste|ኮት ዲቯር|322463|28
Senegal|im Senegal|ሴኔጋል|196722|18
Kamerun|in Kamerun|ካሜሩን|475442|28
Mali|in Mali|ማሊ|1240192|23
der Niger|im Niger|ኒጀር|1267000|27
der Tschad|im Tschad|ቻድ|1284000|18
Südafrika|in Südafrika|ደቡብ አፍሪካ|1221037|60
Marokko|in Marokko|ሞሮኮ|446550|37
Algerien|in Algerien|አልጄሪያ|2381741|45
Tunesien|in Tunesien|ቱኒዚያ|163610|12
Libyen|in Libyen|ሊቢያ|1759540|7
die Demokratische Republik Kongo|in der Demokratischen Republik Kongo|የኮንጎ ዴሞክራቲክ ሪፐብሊክ|2344858|102
Angola|in Angola|አንጎላ|1246700|36
Sambia|in Sambia|ዛምቢያ|752612|20
Simbabwe|in Simbabwe|ዚምባብዌ|390757|16
Mosambik|in Mosambik|ሞዛምቢክ|801590|33
Madagaskar|auf Madagaskar|ማዳጋስካር|587041|30
Namibia|in Namibia|ናሚቢያ|825615|0
Botswana|in Botswana|ቦትስዋና|581730|0
Grönland|auf Grönland|ግሪንላንድ|2166086|0"""
for line in COUNTRIES.split('\n'):
    nde, loc, nam, area, pop = line.split('|')
    nom = nde[0].upper() + nde[1:]
    add(f'Wie groß ist {nde} (Fläche in km²)?', f'የ{nam} የቆዳ ስፋት ስንት ካሬ ኪሎ ሜትር ነው?', int(area), 'km²', 'ካሬ ኪ.ሜ.')
    if int(pop):
        add(f'Wie viele Millionen Menschen leben {loc}?', f'በ{nam} ስንት ሚሊዮን ሰዎች ይኖራሉ?', int(pop), 'Mio.', 'ሚሊዮን')

# ---------------------------------------------------------------- Berge (Höhe in m)
MOUNTAINS = """der Mount Everest|ኤቨረስት ተራራ|8849
der K2|ኬ2 ተራራ|8611
der Kangchendzönga|ካንግቼንጁንጋ ተራራ|8586
der Lhotse|ሎትሴ ተራራ|8516
der Makalu|ማካሉ ተራራ|8485
der Cho Oyu|ቾ ኦዩ ተራራ|8188
der Nanga Parbat|ናንጋ ፓርባት ተራራ|8126
die Annapurna|አናፑርና ተራራ|8091
der Aconcagua|አኮንካጓ ተራራ|6961
der Huascarán|ሁዋስካራን ተራራ|6768
der Chimborazo|ቺምቦራዞ ተራራ|6263
der Denali|ዴናሊ ተራራ|6190
der Kilimandscharo|ኪሊማንጃሮ ተራራ|5895
der Elbrus|ኤልብሩስ ተራራ|5642
der Pico de Orizaba|ፒኮ ዴ ኦሪዛባ ተራራ|5636
der Mount Kenya|የኬንያ ተራራ|5199
der Ararat|አራራት ተራራ|5137
der Mount Stanley (Ruwenzori)|ስታንሊ ተራራ (ሩዌንዞሪ)|5109
der Mont Blanc|ሞን ብላን ተራራ|4806
die Dufourspitze|ዱፉርሽፒትዘ ተራራ|4634
der Ras Daschen|ራስ ዳሽን ተራራ|4550
das Matterhorn|ማተርሆርን ተራራ|4478
der Mount Rainier|ሬኒየር ተራራ|4392
der Mount Elgon|ኤልጎን ተራራ|4321
der Mauna Kea|ማውና ኬአ ተራራ|4207
der Toubkal|ቱብካል ተራራ|4167
der Kinabalu|ኪናባሉ ተራራ|4095
der Großglockner|ግሮስግሎክነር ተራራ|3798
der Fuji|ፉጂ ተራራ|3776
der Mount Cook|ኩክ ተራራ|3724
die Zugspitze|ዙግሽፒትዘ ተራራ|2962
der Olymp|ኦሊምፐስ ተራራ|2918
der Watzmann|ዋትስማን ተራራ|2713
der Berg Sinai|የሲና ተራራ|2285
der Mount Kosciuszko|ኮሽቹሽኮ ተራራ|2228
der Feldberg (Schwarzwald)|ፌልድበርግ ተራራ|1493
der Ben Nevis|ቤን ኔቪስ ተራራ|1345
der Vesuv|ቬሱቪየስ ተራራ|1281
der Brocken|ብሮከን ተራራ|1141
der Tafelberg (Kapstadt)|የጠረጴዛ ተራራ (ኬፕ ታውን)|1085
der Entoto|እንጦጦ ተራራ|3200"""
for line in MOUNTAINS.split('\n'):
    de, am, h = line.split('|')
    add(f'Wie hoch ist {de} (in Metern)?', f'{am} ቁመቱ ስንት ሜትር ነው?', int(h), 'm', 'ሜትር')

# ---------------------------------------------------------------- Flüsse (Länge in km)
RIVERS = """der Nil|የዓባይ (ናይል) ወንዝ|6650
der Amazonas|የአማዞን ወንዝ|6400
der Jangtsekiang|የያንግትዜ ወንዝ|6300
der Gelbe Fluss|ቢጫው ወንዝ|5464
der Kongo|የኮንጎ ወንዝ|4700
der Mekong|የሜኮንግ ወንዝ|4350
der Niger|የኒጀር ወንዝ|4180
die Wolga|የቮልጋ ወንዝ|3530
der Indus|የኢንደስ ወንዝ|3180
der Rio Grande|የሪዮ ግራንዴ ወንዝ|3051
die Donau|የዳኑብ ወንዝ|2850
der Euphrat|የኤፍራጥስ ወንዝ|2800
der Sambesi|የዛምቤዚ ወንዝ|2574
der Ganges|የጋንጀስ ወንዝ|2525
der Murray|የመሬይ ወንዝ|2508
der Colorado|የኮሎራዶ ወንዝ|2330
der Dnepr|የዲኒፐር ወንዝ|2201
der Orinoco|የኦሪኖኮ ወንዝ|2140
der Tigris|የጤግሮስ ወንዝ|1850
der Limpopo|የሊምፖፖ ወንዝ|1750
der Blaue Nil|የዓባይ (ጥቁር ዓባይ) ወንዝ|1450
der Rhein|የራይን ወንዝ|1233
der Awash|የአዋሽ ወንዝ|1200
die Elbe|የኤልቤ ወንዝ|1094
der Senegal|የሴኔጋል ወንዝ|1086
die Loire|የሎዋር ወንዝ|1006
die Oder|የኦደር ወንዝ|866
die Seine|የሴን ወንዝ|777
der Omo|የኦሞ ወንዝ|760
der Po|የፖ ወንዝ|652
die Mosel|የሞዘል ወንዝ|544
der Main|የማይን ወንዝ|527
der Tiber|የቲበር ወንዝ|405
die Themse|የቴምዝ ወንዝ|346
der Jordan|የዮርዳኖስ ወንዝ|251"""
for line in RIVERS.split('\n'):
    de, am, l = line.split('|')
    add(f'Wie lang ist {de} (in km)?', f'{am} ርዝመቱ ስንት ኪሎ ሜትር ነው?', int(l), 'km', 'ኪ.ሜ.')

# ---------------------------------------------------------------- Seen (Fläche km²)
LAKES = """das Kaspische Meer|የካስፒያን ባሕር|371000
der Obere See (Lake Superior)|ሱፔሪየር ሐይቅ|82100
der Victoriasee|ቪክቶሪያ ሐይቅ|68800
der Tanganjikasee|ታንጋኒካ ሐይቅ|32900
der Baikalsee|ባይካል ሐይቅ|31500
der Malawisee|ማላዊ ሐይቅ|29600
der Ladogasee|ላዶጋ ሐይቅ|17700
der Titicacasee|ቲቲካካ ሐይቅ|8372
der Turkana-See|ቱርካና ሐይቅ|6405
der Tanasee|ጣና ሐይቅ|3000
der Abaya-See|አባያ ሐይቅ|1162
der Bodensee|ቦደን ሐይቅ|536
der Genfersee|የጄኔቫ ሐይቅ|580"""
for line in LAKES.split('\n'):
    de, am, a = line.split('|')
    add(f'Wie groß ist {de} (Fläche in km²)?', f'{am} ስፋቱ ስንት ካሬ ኪሎ ሜትር ነው?', int(a), 'km²', 'ካሬ ኪ.ሜ.')

# ---------------------------------------------------------------- Bauwerke (Höhe in m)
BUILDINGS = """der Burj Khalifa (Dubai)|ቡርጅ ካሊፋ (ዱባይ)|828
das Merdeka 118 (Kuala Lumpur)|መርደካ 118 (ኳላ ላምፑር)|679
der Tokyo Skytree|ቶኪዮ ስካይትሪ|634
der Shanghai Tower|ሻንጋይ ታወር|632
der Lotte World Tower (Seoul)|ሎቴ ወርልድ ታወር (ሴኡል)|555
der CN Tower (Toronto)|ሲኤን ታወር (ቶሮንቶ)|553
das One World Trade Center (New York)|ዋን ወርልድ ትሬድ ሴንተር (ኒው ዮርክ)|541
der Taipei 101|ታይፔ 101|508
die Petronas Towers (Kuala Lumpur)|ፔትሮናስ ታወርስ|452
das Empire State Building (mit Antenne)|ኤምፓየር ስቴት ሕንፃ (ከአንቴናው ጋር)|443
der Berliner Fernsehturm|የበርሊን የቴሌቪዥን ማማ|368
der Eiffelturm|ኤፍል ታወር|330
die Space Needle (Seattle)|ስፔስ ኒድል (ሲያትል)|184
das Ulmer Münster|የኡልም ካቴድራል|162
der Kölner Dom|የኮሎኝ ካቴድራል|157
die Cheops-Pyramide (heute)|የኩፉ ፒራሚድ (ዛሬ)|139
der Big Ben (Elizabeth Tower)|ቢግ ቤን|96
die Freiheitsstatue (mit Sockel)|የነፃነት ሐውልት (ከመሠረቱ ጋር)|93
der Schiefe Turm von Pisa|የፒሳ ዘንበል ያለ ማማ|56
das Kolosseum in Rom|በሮም የሚገኘው ኮሎሲየም|48
die Christusstatue in Rio (ohne Sockel)|በሪዮ የሚገኘው የክርስቶስ ሐውልት (ያለ መሠረቱ)|30"""
for line in BUILDINGS.split('\n'):
    de, am, h = line.split('|')
    add(f'Wie hoch ist {de} (in Metern)?', f'{am} ቁመቱ ስንት ሜትር ነው?', int(h), 'm', 'ሜትር')

# ---------------------------------------------------------------- Jahreszahlen: Ereignisse
EVENTS = """die erste Mondlandung|የመጀመሪያው የሰው ልጅ ጨረቃ ላይ ማረፍ|1969
der Fall der Berliner Mauer|የበርሊን ግንብ መፍረስ|1989
die Deutsche Wiedervereinigung|የጀርመን ውሕደት|1990
der Bau der Berliner Mauer|የበርሊን ግንብ መገንባት|1961
der Sieg von Adwa|የዓድዋ ድል|1896
die Gründung von Addis Abeba|የአዲስ አበባ መቆርቆር|1886
die Krönung von Kaiser Haile Selassie|የአፄ ኃይለ ሥላሴ ንግሥ|1930
der erste Motorflug der Brüder Wright|የራይት ወንድማማቾች የመጀመሪያ በረራ|1903
die Ankunft von Kolumbus in Amerika|ኮሎምበስ አሜሪካ የደረሰበት|1492
der erste Mensch im Weltall (Juri Gagarin)|የመጀመሪያው ሰው ወደ ጠፈር መሄድ (ዩሪ ጋጋሪን)|1961
die Erstbesteigung des Mount Everest|የኤቨረስት ተራራ የመጀመሪያ መውጣት|1953
die erste Fußball-Weltmeisterschaft|የመጀመሪያው የዓለም ዋንጫ|1930
die ersten Olympischen Spiele der Neuzeit|የመጀመሪያው ዘመናዊ ኦሊምፒክ|1896
Abebe Bikilas barfüßiger Olympiasieg im Marathon in Rom|አበበ ቢቂላ በሮም በባዶ እግሩ የማራቶን ድል|1960
die Einführung des Euro als Bargeld|ዩሮ እንደ ጥሬ ገንዘብ መጀመሩ|2002
die Gründung der Vereinten Nationen (UNO)|የተባበሩት መንግሥታት ድርጅት መመሥረት|1945
die Gründung der Organisation für Afrikanische Einheit in Addis Abeba|በአዲስ አበባ የአፍሪካ አንድነት ድርጅት መመሥረት|1963
die Gründung der Afrikanischen Union|የአፍሪካ ኅብረት መመሥረት|2002
die Freilassung von Nelson Mandela|የኔልሰን ማንዴላ ከእስር መፈታት|1990
Nelson Mandelas Wahl zum Präsidenten|ኔልሰን ማንዴላ ፕሬዚዳንት የሆኑበት|1994
die Unabhängigkeit Ghanas|የጋና ነፃነት|1957
der Fund des Skeletts „Lucy“ in Äthiopien|በኢትዮጵያ የ„ሉሲ“ (ድንቅነሽ) አፅም መገኘት|1974
die Fertigstellung des Eiffelturms|የኤፍል ታወር ግንባታ መጠናቀቅ|1889
die Einweihung der Freiheitsstatue|የነፃነት ሐውልት ምረቃ|1886
die Eröffnung des Suezkanals|የስዊዝ ቦይ መከፈት|1869
die Eröffnung des Panamakanals|የፓናማ ቦይ መከፈት|1914
die Eröffnung der Golden Gate Bridge|የጎልደን ጌት ድልድይ መከፈት|1937
die Eröffnung des Burj Khalifa|የቡርጅ ካሊፋ መከፈት|2010
der Baubeginn des Grand Ethiopian Renaissance Dam|የታላቁ የኢትዮጵያ ሕዳሴ ግድብ ግንባታ መጀመር|2011
das Ende des Zweiten Weltkriegs|የሁለተኛው የዓለም ጦርነት ማብቂያ|1945
die erste Herztransplantation|የመጀመሪያው የልብ ንቅለ ተከላ|1967
die Geburt des Klonschafs Dolly|የተቀዳችው በግ ዶሊ መወለድ|1996
die erste Briefmarke (Penny Black)|የመጀመሪያው ቴምብር (ፔኒ ብላክ)|1840
der Start des ersten iPhones|የመጀመሪያው አይፎን መውጣት|2007
die erste SMS|የመጀመሪያው አጭር የጽሑፍ መልእክት (SMS)|1992
der Start von Bitcoin|የቢትኮይን መጀመር|2009
die Veröffentlichung von ChatGPT|የChatGPT መለቀቅ|2022
das erste Harry-Potter-Buch|የመጀመሪያው የሃሪ ፖተር መጽሐፍ|1997
der erste Star-Wars-Film|የመጀመሪያው የስታር ዋርስ ፊልም|1977
der erste Mickey-Mouse-Film (Steamboat Willie)|የመጀመሪያው የሚኪ ማውስ ፊልም|1928
der Verkaufsstart des Game Boy|የጌም ቦይ ሽያጭ መጀመር|1989
der Verkaufsstart der ersten PlayStation|የመጀመሪያው ፕሌይስቴሽን ሽያጭ መጀመር|1994
das erste Tetris-Spiel|የመጀመሪያው የቴትሪስ ጨዋታ|1984
das erste Super-Mario-Bros.-Spiel|የመጀመሪያው ሱፐር ማሪዮ ብሮስ ጨዋታ|1985
das erste Pokémon-Spiel|የመጀመሪያው የፖኬሞን ጨዋታ|1996
die Äthiopische Millenniumsfeier (Jahr 2000 im äthiopischen Kalender)|የኢትዮጵያ ሚሊኒየም በዓል (በኢትዮጵያ አቆጣጠር 2000)|2007
der erste Flug von Ethiopian Airlines|የኢትዮጵያ አየር መንገድ የመጀመሪያ በረራ|1946
die Gründung der Universität Addis Abeba|የአዲስ አበባ ዩኒቨርሲቲ መመሥረት|1950
die erste Fußball-WM in Afrika (Südafrika)|በአፍሪካ የመጀመሪያው የዓለም ዋንጫ (ደቡብ አፍሪካ)|2010
der erste Afrika-Cup (Äthiopien war dabei)|የመጀመሪያው የአፍሪካ ዋንጫ (ኢትዮጵያ ተሳትፋለች)|1957
Äthiopiens Sieg beim Afrika-Cup|ኢትዮጵያ የአፍሪካ ዋንጫን ያሸነፈችበት|1962
die Gründung der Europäischen Union (Vertrag von Maastricht)|የአውሮፓ ኅብረት መመሥረት (የማስትሪክት ስምምነት)|1993
die Entdeckung des Penicillins|የፔኒሲሊን መገኘት|1928"""
for line in EVENTS.split('\n'):
    de, am, y = line.split('|')
    add(f'In welchem Jahr war {de}?', f'{am} በየትኛው ዓመት ነበር? (በአውሮፓውያን አቆጣጠር)', int(y), '', '', 'y')

INVENTIONS = """das Telefon|ስልክ|1876
die Glühbirne (Edison)|አምፖል (ኤዲሰን)|1879
das Auto (Carl Benz)|መኪና (ካርል ቤንዝ)|1886
das Laufrad (Vorläufer des Fahrrads)|የብስክሌት ቀዳሚ (ላውፍራድ)|1817
der Buchdruck mit beweglichen Lettern (Gutenberg)|የጉተንበርግ ማተሚያ|1450
der erste Computer Z3 (Konrad Zuse)|የመጀመሪያው ኮምፒውተር Z3 (ኮንራድ ዙዘ)|1941
das World Wide Web|ዓለም አቀፍ ድር (World Wide Web)|1989
die E-Mail|ኢሜይል|1971
die Jeans (Levi Strauss)|ጂንስ (ሌቪ ስትራውስ)|1873
Coca-Cola|ኮካ ኮላ|1886
die Dampfmaschine von James Watt|የጄምስ ዋት የእንፋሎት ሞተር|1769
das Fernglas? |መነጽር|0
die Nähmaschine (Singer)|የስፌት መኪና (ሲንገር)|1851
der Reißverschluss (moderne Form)|ዚፕ (ዘመናዊው)|1913
der Klettverschluss|ክሊፕ (ቬልክሮ)|1948
das Post-it|ፖስት-ኢት|1980
der Rubik’s Cube (Zauberwürfel)|የሩቢክ ኪዩብ|1974
das Fahrrad mit Kettenantrieb|በሰንሰለት የሚሄድ ብስክሌት|1885
der Hubschrauber (erster praxistauglicher)|ሄሊኮፕተር (የመጀመሪያው ተግባራዊ)|1936
das Dynamit? |ዳይናማይት|0
die Spülmaschine|የእቃ ማጠቢያ ማሽን|1886
das Smartphone-App-Store-Prinzip (App Store)|አፕ ስቶር|2008
die Schallplatte (Grammophon)|ግራሞፎን|1887
die erste Digitalkamera|የመጀመሪያው ዲጂታል ካሜራ|1975
der Mikrowellenherd|ማይክሮዌቭ ምድጃ|1945
das Internet-Protokoll TCP/IP (offizieller Start des Internets)|የኢንተርኔት ይፋዊ መጀመሪያ (TCP/IP)|1983"""
for line in INVENTIONS.split('\n'):
    de, am, y = line.split('|')
    if int(y) == 0: continue
    add(f'In welchem Jahr wurde {de.strip()} erfunden?', f'{am} የተፈለሰፈው በየትኛው ዓመት ነው? (በአውሮፓውያን አቆጣጠር)', int(y), '', '', 'y')

# ---------------------------------------------------------------- Gründungsjahre von Marken
BRANDS = """Coca-Cola|1886
Pepsi|1893
Adidas|1949
Puma|1948
Apple|1976
Microsoft|1975
Google|1998
Amazon|1994
Samsung|1938
Sony|1946
Nintendo|1889
IKEA|1943
Lego|1932
BMW|1916
Mercedes-Benz|1926
Volkswagen|1937
Porsche|1931
Toyota|1937
Ford|1903
Tesla|2003
Audi|1909
Burger King|1954
KFC|1952
Starbucks|1971
Netflix|1997
Spotify|2006
Disney|1923
Ethiopian Airlines|1945
Haribo|1920
Nokia|1865
Siemens|1847
Bosch|1886
Levi’s|1853
H&M|1947
Zara|1975
Rolex|1905
Michelin|1889
Heineken|1864
Facebook|2004
YouTube|2005
WhatsApp|2009
Instagram|2010
Twitter|2006
TikTok|2016
Airbnb|2008
Uber|2009
PayPal|1998
eBay|1995
Wikipedia|2001
Huawei|1987
Xiaomi|2010
Intel|1968
Nvidia|1993
Canon|1937
Nikon|1917
Nestlé|1866
Lindt|1845
Toblerone|1908
Nutella|1964"""
for line in BRANDS.split('\n'):
    b, y = line.split('|')
    add(f'In welchem Jahr wurde {b} gegründet bzw. erfunden?', f'{b} የተመሠረተው በየትኛው ዓመት ነው? (በአውሮፓውያን አቆጣጠር)', int(y), '', '', 'y')

# ---------------------------------------------------------------- Geburtsjahre
PEOPLE = """Albert Einstein|አልበርት አንስታይን|1879
Isaac Newton|አይዛክ ኒውተን|1643
Wolfgang Amadeus Mozart|ቮልፍጋንግ አማዴየስ ሞዛርት|1756
Ludwig van Beethoven|ሉድቪግ ቫን ቤትሆቨን|1770
Johann Sebastian Bach|ዮሐን ሴባስቲያን ባኽ|1685
Johann Wolfgang von Goethe|ዮሐን ቮልፍጋንግ ቮን ጎተ|1749
William Shakespeare|ዊሊያም ሼክስፒር|1564
Leonardo da Vinci|ሌዮናርዶ ዳ ቪንቺ|1452
Michelangelo|ማይክል አንጄሎ|1475
Marie Curie|ማሪ ኩሪ|1867
Charles Darwin|ቻርለስ ዳርዊን|1809
Napoleon Bonaparte|ናፖሊዮን ቦናፓርት|1769
Abraham Lincoln|አብርሃም ሊንከን|1809
Martin Luther King|ማርቲን ሉተር ኪንግ|1929
Nelson Mandela|ኔልሰን ማንዴላ|1918
Mahatma Gandhi|ማሃትማ ጋንዲ|1869
Kaiser Haile Selassie|አፄ ኃይለ ሥላሴ|1892
Kaiser Menelik II.|አፄ ምኒልክ ዳግማዊ|1844
Kaiserin Taytu Betul|እቴጌ ጣይቱ ብጡል|1851
Abebe Bikila|አበበ ቢቂላ|1932
Mamo Wolde|ማሞ ወልዴ|1932
Haile Gebrselassie|ኃይሌ ገብረ ሥላሴ|1973
Derartu Tulu|ደራርቱ ቱሉ|1972
Kenenisa Bekele|ቀነኒሳ በቀለ|1982
Tirunesh Dibaba|ጥሩነሽ ዲባባ|1985
Almaz Ayana|አልማዝ አያና|1991
Letesenbet Gidey|ለተሰንበት ግደይ|1998
Teddy Afro|ቴዲ አፍሮ|1976
Tilahun Gessesse|ጥላሁን ገሠሠ|1940
Mulatu Astatke|ሙላቱ አስታጥቄ|1943
Afewerk Tekle|አፈወርቅ ተክሌ|1932
Eliud Kipchoge|ኤሊውድ ኪፕቾጌ|1984
Lionel Messi|ሊዮኔል ሜሲ|1987
Cristiano Ronaldo|ክሪስቲያኖ ሮናልዶ|1985
Pelé|ፔሌ|1940
Diego Maradona|ዲዬጎ ማራዶና|1960
Zinedine Zidane|ዚነዲን ዚዳን|1972
Kylian Mbappé|ኪሊያን ምባፔ|1998
Erling Haaland|ኤርሊንግ ሃላንድ|2000
Mohamed Salah|መሐመድ ሳላህ|1992
Michael Jordan|ማይክል ጆርዳን|1963
Usain Bolt|ዩሴን ቦልት|1986
Serena Williams|ሴሬና ዊሊያምስ|1981
Roger Federer|ሮጀር ፌዴረር|1981
Muhammad Ali|መሐመድ አሊ|1942
Michael Schumacher|ሚካኤል ሹማከር|1969
Lewis Hamilton|ሉዊስ ሃሚልተን|1985
Jesse Owens|ጄሲ ኦውንስ|1913
Michael Jackson|ማይክል ጃክሰን|1958
Elvis Presley|ኤልቪስ ፕሬስሊ|1935
Bob Marley|ቦብ ማርሊ|1945
Freddie Mercury|ፍሬዲ ሜርኩሪ|1946
Beyoncé|ቢዮንሴ|1981
Taylor Swift|ቴይለር ስዊፍት|1989
Rihanna|ሪሃና|1988
Steve Jobs|ስቲቭ ጆብስ|1955
Bill Gates|ቢል ጌትስ|1955
Mark Zuckerberg|ማርክ ዙከርበርግ|1984
Elon Musk|ኢሎን ማስክ|1971
Walt Disney|ዋልት ዲዝኒ|1901
Charlie Chaplin|ቻርሊ ቻፕሊን|1889
Barack Obama|ባራክ ኦባማ|1961
Angela Merkel|አንጌላ ሜርክል|1954
Königin Elisabeth II.|ንግሥት ኤልሳቤጥ ዳግማዊት|1926
Thomas Edison|ቶማስ ኤዲሰን|1847
Nikola Tesla|ኒኮላ ቴስላ|1856
Galileo Galilei|ጋሊሊዮ ጋሊሊ|1564
Christoph Kolumbus|ክሪስቶፈር ኮሎምበስ|1451
Vincent van Gogh|ቪንሰንት ቫን ጎ|1853
Pablo Picasso|ፓብሎ ፒካሶ|1881
Frida Kahlo|ፍሪዳ ካህሎ|1907
Anne Frank|አን ፍራንክ|1929
Neil Armstrong|ኒል አርምስትሮንግ|1930
Juri Gagarin|ዩሪ ጋጋሪን|1934
Stephen Hawking|ስቲቨን ሆኪንግ|1942
J. K. Rowling|ጄ. ኬ. ሮውሊንግ|1965
Leo Tolstoi|ሊዮ ቶልስቶይ|1828"""
for line in PEOPLE.split('\n'):
    de, am, y = line.split('|')
    add(f'In welchem Jahr wurde {de} geboren?', f'{am} የተወለዱት በየትኛው ዓመት ነው? (በአውሮፓውያን አቆጣጠር)', int(y), '', '', 'y')

# ---------------------------------------------------------------- Tiere
# name_de (mit Artikel ein/eine) | am | Gewicht kg | Lebensjahre | km/h | Bewegung (l=laufen, s=schwimmen, f=fliegen)
ANIMALS = """ein Afrikanischer Elefant|የአፍሪካ ዝሆን|6000|65|40|l
eine Giraffe|ቀጭኔ|1200|25|60|l
ein Löwe|አንበሳ|190|14|80|l
ein Gepard|አቦሸማኔ|50|12|110|l
ein Nilpferd|ጉማሬ|1500|45|30|l
ein Nashorn|አውራሪስ|2300|45|50|l
ein Zebra|የሜዳ አህያ|380|25|65|l
ein Strauß|ሰጎን|120|40|70|l
ein Blauwal|ሰማያዊ ዓሣ ነባሪ|150000|90|0|s
ein Pferd|ፈረስ|500|28|70|l
eine Kuh|ላም|700|20|0|l
ein Schaf|በግ|70|12|0|l
eine Ziege|ፍየል|60|15|0|l
ein Esel|አህያ|250|30|0|l
ein Kamel|ግመል|500|45|65|l
ein Hund (Schäferhund)|ውሻ (የጀርመን እረኛ)|35|12|48|l
eine Hauskatze|የቤት ድመት|4|15|48|l
ein Kaninchen|ጥንቸል|2|9|0|l
ein Eisbär|የዋልታ ድብ|500|25|40|l
ein Braunbär|ቡናማ ድብ|300|25|50|l
ein Gorilla|ጎሪላ|160|40|0|l
ein Schimpanse|ቺምፓንዚ|50|40|0|l
ein Känguru|ካንጋሮ|85|20|70|l
ein Nilkrokodil|የዓባይ አዞ|500|70|0|l
eine Riesenschildkröte|ግዙፍ ኤሊ|250|150|0|l
ein Huhn|ዶሮ|2|8|0|l
ein Kaiserpinguin|ንጉሣዊ ፔንጉዊን|30|20|0|l
ein Delfin|ዶልፊን|200|40|50|s
ein Weißer Hai|ነጭ ሻርክ|1000|70|40|s
ein Wolf|ተኩላ|40|13|60|l
eine Tüpfelhyäne|ጅብ|60|20|60|l
ein Gelada-Pavian (Männchen)|ጭላዳ ዝንጀሮ (ወንድ)|18|20|0|l
ein Äthiopischer Wolf|የኢትዮጵያ ቀበሮ (ቀይ ቀበሮ)|15|10|0|l
ein Walia-Steinbock|ዋልያ|100|15|0|l
ein Grizzlybär|ግሪዝሊ ድብ|300|25|55|l
ein Tiger|ነብር (ታይገር)|220|15|65|l
ein Leopard|ነብር|60|15|58|l
ein Gnu|ጉሬዛ? |0|0|0|l
ein Adler (Steinadler)|ንስር|5|25|0|f
ein Papagei (Graupapagei)|በቀቀን|0|50|0|f
eine Hausmaus|የቤት አይጥ|0|2|0|l
ein Elch|ኤልክ|500|20|55|l"""
for line in ANIMALS.split('\n'):
    de, am, w, life, sp, mv = line.split('|')
    if am.endswith('? '): continue
    w, life, sp = float(w), int(life), int(sp)
    if w: add(f'Wie viel wiegt {de} ungefähr (in kg)?', f'አንድ {am} በግምት ስንት ኪሎ ግራም ይመዝናል?', int(w) if w >= 1 else w, 'kg', 'ኪ.ግ.')
    if life: add(f'Wie viele Jahre wird {de} ungefähr alt?', f'{am} በአማካይ ስንት ዓመት ይኖራል?', life, 'Jahre', 'ዓመት')
    if sp:
        vd = {'l': 'laufen', 's': 'schwimmen', 'f': 'fliegen'}[mv]; va = {'l': 'ይሮጣል', 's': 'ይዋኛል', 'f': 'ይበራል'}[mv]
        add(f'Wie schnell kann {de} höchstens {vd} (in km/h)?', f'{am} በሰዓት ቢበዛ ስንት ኪሎ ሜትር {va}?', sp, 'km/h', 'ኪ.ሜ./ሰዓት')

# ---------------------------------------------------------------- Allerlei (von Hand)
MISC = """Wie viele Knochen hat ein erwachsener Mensch?|አንድ አዋቂ ሰው ስንት አጥንቶች አሉት?|206||
Wie viele Zähne hat ein Erwachsener (mit Weisheitszähnen)?|አንድ አዋቂ ሰው (የመጨረሻ መንጋጋዎችን ጨምሮ) ስንት ጥርሶች አሉት?|32||
Wie oft schlägt das Herz eines Erwachsenen in Ruhe pro Minute (ungefähr)?|የአዋቂ ሰው ልብ በእረፍት ጊዜ በደቂቃ ስንት ጊዜ ይመታል (በግምት)?|70|Schläge|ጊዜ
Wie viele Liter Blut hat ein erwachsener Mensch ungefähr?|አንድ አዋቂ ሰው በግምት ስንት ሊትር ደም አለው?|5|Liter|ሊትር
Wie hoch ist die normale Körpertemperatur des Menschen (°C)?|የሰው ልጅ መደበኛ የሰውነት ሙቀት ስንት ዲግሪ ሴልሺየስ ነው?|37|°C|°C
Wie viele Muskeln hat der Mensch ungefähr?|የሰው ልጅ በግምት ስንት ጡንቻዎች አሉት?|650||
Wie viel Prozent des menschlichen Körpers bestehen aus Wasser (ungefähr)?|የሰው ልጅ አካል ስንት በመቶው ውሃ ነው (በግምት)?|60|%|%
Wie viele Wochen dauert eine Schwangerschaft beim Menschen ungefähr?|የሰው ልጅ እርግዝና በግምት ስንት ሳምንት ይቆያል?|40|Wochen|ሳምንት
Wie viele Monate dauert die Schwangerschaft eines Elefanten?|የዝሆን እርግዝና ስንት ወር ይቆያል?|22|Monate|ወር
Wie viele Tasten hat ein Klavier?|ፒያኖ ስንት ቁልፎች አሉት?|88||
Wie viele Felder hat ein Schachbrett?|የቼዝ ሰሌዳ ስንት ካሬዎች አሉት?|64||
Wie viele Figuren hat ein Spieler beim Schach zu Beginn?|በቼዝ ጨዋታ መጀመሪያ ላይ አንድ ተጫዋች ስንት ጠጠሮች አሉት?|16||
Wie viele Karten hat ein normales Kartenspiel (ohne Joker)?|አንድ መደበኛ የካርታ ጨዋታ (ያለ ጆከር) ስንት ካርታዎች አሉት?|52||
Wie viele Augen hat ein normaler Würfel zusammen?|አንድ መደበኛ ዳይስ በአጠቃላይ ስንት ነጥቦች አሉት?|21||
Wie viele Spieler einer Fußballmannschaft stehen gleichzeitig auf dem Feld?|የአንድ የእግር ኳስ ቡድን ስንት ተጫዋቾች በአንድ ጊዜ ሜዳ ላይ ይሆናሉ?|11||
Wie viele Spieler einer Basketballmannschaft stehen gleichzeitig auf dem Feld?|የአንድ የቅርጫት ኳስ ቡድን ስንት ተጫዋቾች በአንድ ጊዜ ሜዳ ላይ ይሆናሉ?|5||
Wie viele Spieler einer Volleyballmannschaft stehen gleichzeitig auf dem Feld?|የአንድ የመረብ ኳስ ቡድን ስንት ተጫዋቾች በአንድ ጊዜ ሜዳ ላይ ይሆናሉ?|6||
Wie viele Spieler hat eine Rugby-Mannschaft (Rugby Union) auf dem Feld?|የራግቢ ቡድን ስንት ተጫዋቾች ሜዳ ላይ ይሆናሉ?|15||
Wie viele Kilometer ist ein Marathon lang?|ማራቶን ስንት ኪሎ ሜትር ነው?|42.195|km|ኪ.ሜ.
Wie viele Minuten dauert ein Fußballspiel ohne Pause und Nachspielzeit?|የእግር ኳስ ጨዋታ ያለ እረፍትና ተጨማሪ ሰዓት ስንት ደቂቃ ይቆያል?|90|Minuten|ደቂቃ
Wie viele Minuten dauert ein NBA-Basketballspiel (reine Spielzeit)?|የNBA የቅርጫት ኳስ ጨዋታ (ንጹህ የጨዋታ ጊዜ) ስንት ደቂቃ ነው?|48|Minuten|ደቂቃ
Wie viele Ringe sind auf der Olympischen Flagge?|በኦሊምፒክ ባንዲራ ላይ ስንት ቀለበቶች አሉ?|5||
Was ist der Weltrekord im 100-m-Lauf der Männer (in Sekunden)?|የወንዶች 100 ሜትር የዓለም ክብረ ወሰን ስንት ሰከንድ ነው?|9.58|s|ሰከንድ
Wie hoch hängt ein Basketballkorb (in cm)?|የቅርጫት ኳስ ቅርጫት ከመሬት ስንት ሴንቲ ሜትር ከፍ ብሎ ይሰቀላል?|305|cm|ሴ.ሜ.
Wie viele Löcher hat ein normaler Golfplatz?|አንድ መደበኛ የጎልፍ ሜዳ ስንት ጉድጓዶች አሉት?|18||
Wie lang ist ein olympisches Schwimmbecken (in Metern)?|የኦሊምፒክ መዋኛ ገንዳ ርዝመት ስንት ሜትር ነው?|50|m|ሜትር
Wie viele WM-Titel hat Brasilien im Fußball gewonnen?|ብራዚል በእግር ኳስ ስንት የዓለም ዋንጫዎችን አሸንፋለች?|5||
Wie viele Tore schoss Deutschland 2014 im WM-Halbfinale gegen Brasilien?|ጀርመን በ2014 የዓለም ዋንጫ ግማሽ ፍፃሜ በብራዚል ላይ ስንት ጎሎች አስቆጠረች?|7||
Wie viele Mannschaften spielen bei der Fußball-WM 2026 mit?|በ2026 የዓለም ዋንጫ ስንት ቡድኖች ይሳተፋሉ?|48||
Wie viele olympische Goldmedaillen hat Usain Bolt gewonnen?|ዩሴን ቦልት ስንት የኦሊምፒክ የወርቅ ሜዳሊያዎች አሸንፏል?|8||
Wie viele Länder gibt es in Afrika?|በአፍሪካ ስንት አገሮች አሉ?|54||
Wie viele Länder sind Mitglied der Vereinten Nationen?|የተባበሩት መንግሥታት ስንት አባል አገሮች አሉት?|193||
Wie viele Länder gehören zur Europäischen Union?|የአውሮፓ ኅብረት ስንት አባል አገሮች አሉት?|27||
Wie viele Bundesländer hat Deutschland?|ጀርመን ስንት ፌዴራል ክፍለ ግዛቶች አሏት?|16||
Wie viele Bundesstaaten haben die USA?|አሜሪካ ስንት ክፍለ ግዛቶች አሏት?|50||
Wie viele Kontinente gibt es?|ስንት አህጉራት አሉ?|7||
Wie viele Ozeane gibt es?|ስንት ውቅያኖሶች አሉ?|5||
Wie viele Zeitzonen hat Russland?|ሩሲያ ስንት የሰዓት ዞኖች አሏት?|11||
Wie viele Sterne hat die Flagge der USA?|የአሜሪካ ባንዲራ ስንት ኮከቦች አሉት?|50||
Wie viele Streifen hat die Flagge der USA?|የአሜሪካ ባንዲራ ስንት መስመሮች አሉት?|13||
Wie viele Monate hat das Jahr im äthiopischen Kalender?|በኢትዮጵያ አቆጣጠር አንድ ዓመት ስንት ወሮች አሉት?|13||
Wie viele Tage hat der äthiopische Monat Pagume in einem normalen Jahr?|ጳጉሜን በተራ ዓመት ስንት ቀናት አሏት?|5||
Wie viele Tage hat ein Monat im äthiopischen Kalender (außer Pagume)?|በኢትዮጵያ አቆጣጠር አንድ ወር (ከጳጉሜን በስተቀር) ስንት ቀናት አሉት?|30||
Wie viele Jahre liegt der äthiopische Kalender ungefähr hinter dem europäischen?|የኢትዮጵያ አቆጣጠር ከአውሮፓውያኑ በግምት ስንት ዓመት ወደ ኋላ ነው?|7|Jahre|ዓመት
Auf welcher Höhe liegt Addis Abeba ungefähr (in Metern)?|አዲስ አበባ ከባሕር ጠለል በላይ በግምት ስንት ሜትር ላይ ትገኛለች?|2355|m|ሜትር
Wie viele Meter unter dem Meeresspiegel liegt die Danakil-Senke an ihrer tiefsten Stelle?|የዳናኪል ዝቅተኛ ቦታ በጥልቅ ቦታው ከባሕር ጠለል በታች ስንት ሜትር ነው?|125|m|ሜትር
Wie viele Buchstaben hat das deutsche Alphabet (ohne Ä, Ö, Ü, ß)?|የጀርመንኛ ፊደል (ያለ Ä, Ö, Ü, ß) ስንት ፊደላት አሉት?|26||
Wie viele Grundzeichen (Fidel-Reihen) hat das amharische Alphabet ungefähr?|የአማርኛ ፊደል በግምት ስንት መሠረታዊ ፊደላት (ረድፎች) አሉት?|33||
Wie viele Formen hat jedes Grundzeichen im amharischen Fidel (z. B. ለ ሉ ሊ …)?|በአማርኛ ፊደል እያንዳንዱ መሠረታዊ ፊደል ስንት ቅርጾች አሉት (ለ ሉ ሊ …)?|7||
Wie viele Sprachen gibt es ungefähr auf der Welt?|በዓለም ላይ በግምት ስንት ቋንቋዎች አሉ?|7000||
Wie viele Milliarden Menschen leben ungefähr auf der Erde?|በምድር ላይ በግምት ስንት ቢሊዮን ሰዎች ይኖራሉ?|8|Mrd.|ቢሊዮን
Wie viele Planeten hat unser Sonnensystem?|የእኛ ሥርዓተ ፀሐይ ስንት ፕላኔቶች አሉት?|8||
Wie viele Monde hat der Mars?|ማርስ ስንት ጨረቃዎች አሏት?|2||
Wie viele Tage braucht der Mars für eine Runde um die Sonne?|ማርስ ፀሐይን አንድ ጊዜ ለመዞር ስንት ቀናት ይፈጃል?|687|Tage|ቀን
Wie weit ist der Mond von der Erde entfernt (in km)?|ጨረቃ ከምድር በስንት ኪሎ ሜትር ትርቃለች?|384400|km|ኪ.ሜ.
Wie viele Millionen Kilometer ist die Sonne von der Erde entfernt?|ፀሐይ ከምድር ስንት ሚሊዮን ኪሎ ሜትር ትርቃለች?|150|Mio. km|ሚሊዮን ኪ.ሜ.
Wie viele Minuten braucht das Sonnenlicht bis zur Erde?|የፀሐይ ብርሃን ምድር ለመድረስ ስንት ደቂቃ ይፈጃል?|8|Minuten|ደቂቃ
Wie groß ist der Durchmesser der Erde (in km)?|የምድር ዲያሜትር ስንት ኪሎ ሜትር ነው?|12742|km|ኪ.ሜ.
Wie lang ist der Erdumfang am Äquator (in km)?|የምድር ዙሪያ በምድር ወገብ ላይ ስንት ኪሎ ሜትር ነው?|40075|km|ኪ.ሜ.
Wie viele Kilometer legt das Licht in einer Sekunde zurück (ungefähr)?|ብርሃን በአንድ ሰከንድ በግምት ስንት ኪሎ ሜትር ይጓዛል?|300000|km|ኪ.ሜ.
Wie heiß ist die Oberfläche der Sonne ungefähr (in °C)?|የፀሐይ ገጽ በግምት ስንት ዲግሪ ሴልሺየስ ይሞቃል?|5500|°C|°C
Wie viel Prozent der Erdoberfläche sind mit Wasser bedeckt?|የምድር ገጽ ስንት በመቶው በውሃ የተሸፈነ ነው?|71|%|%
Wie tief ist der Marianengraben an seiner tiefsten Stelle (in Metern)?|የማሪያና ቦይ በጥልቅ ቦታው ስንት ሜትር ጥልቀት አለው?|10994|m|ሜትር
Wie tief ist der Baikalsee an seiner tiefsten Stelle (in Metern)?|ባይካል ሐይቅ በጥልቅ ቦታው ስንት ሜትር ጥልቀት አለው?|1642|m|ሜትር
Wie hoch ist der höchste Wasserfall der Welt, der Salto Ángel (in Metern)?|የዓለም ከፍተኛው ፏፏቴ ሳልቶ አንሔል ስንት ሜትር ከፍታ አለው?|979|m|ሜትር
Wie hoch sind die Wasserfälle des Blauen Nils (Tis Abay) ungefähr (in Metern)?|የጢስ ዓባይ ፏፏቴ በግምት ስንት ሜትር ከፍታ አለው?|45|m|ሜትር
Wie viele Stufen hat der Eiffelturm bis ganz oben?|ኤፍል ታወር እስከ ላይኛው ጫፍ ስንት ደረጃዎች አሉት?|1665||
Wie viele Ecken hat ein Würfel?|አንድ ኪዩብ ስንት ማዕዘኖች አሉት?|8||
Wie viele Kanten hat ein Würfel?|አንድ ኪዩብ ስንት ጠርዞች አሉት?|12||
Wie viele Beine hat eine Spinne?|ሸረሪት ስንት እግሮች አሏት?|8||
Wie viele Beine hat ein Insekt?|አንድ ነፍሳት ስንት እግሮች አሉት?|6||
Wie viele Herzen hat ein Oktopus?|ኦክቶፐስ ስንት ልቦች አሉት?|3||
Wie viele Arme hat ein Seestern normalerweise?|የባሕር ኮከብ በተለምዶ ስንት እጆች አሉት?|5||
Wie viele Mägen (Magenkammern) hat eine Kuh?|ላም ስንት የሆድ ክፍሎች አሏት?|4||
Wie viele Eier legt ein Huhn ungefähr pro Jahr?|አንዲት ዶሮ በዓመት በግምት ስንት እንቁላሎች ትጥላለች?|300||
Wie viele Stunden schläft ein Koala ungefähr am Tag?|ኮዋላ በቀን በግምት ስንት ሰዓት ይተኛል?|20|Stunden|ሰዓት
Wie lang wird ein Blauwal ungefähr (in Metern)?|ሰማያዊ ዓሣ ነባሪ በግምት ስንት ሜትር ይረዝማል?|30|m|ሜትር
Wie groß wird eine Giraffe ungefähr (in Metern)?|ቀጭኔ በግምት ስንት ሜትር ይረዝማል?|5.5|m|ሜትር
Wie schnell ist ein Wanderfalke im Sturzflug (in km/h)?|ጭልፊት (ፔሬግሪን) ወደ ታች ሲወርድ በሰዓት ስንት ኪሎ ሜትር ይበራል?|390|km/h|ኪ.ሜ./ሰዓት
Wie schnell fliegt ein Verkehrsflugzeug ungefähr (in km/h)?|የመንገደኞች አውሮፕላን በግምት በሰዓት ስንት ኪሎ ሜትር ይበራል?|900|km/h|ኪ.ሜ./ሰዓት
Wie schnell fährt ein Formel-1-Auto höchstens ungefähr (in km/h)?|የፎርሙላ 1 መኪና ቢበዛ በግምት በሰዓት ስንት ኪሎ ሜትር ይሄዳል?|370|km/h|ኪ.ሜ./ሰዓት
Wie viele Kilometer ist ein Halbmarathon lang (gerundet auf eine Stelle)?|ግማሽ ማራቶን ስንት ኪሎ ሜትር ነው?|21.1|km|ኪ.ሜ.
Wie viele Kalorien hat eine mittelgroße Banane ungefähr?|መካከለኛ ሙዝ በግምት ስንት ካሎሪ አለው?|100|kcal|ካሎሪ
Wie viele Gramm wiegt eine 1-Euro-Münze?|የ1 ዩሮ ሳንቲም ስንት ግራም ይመዝናል?|7.5|g|ግራም
Wie viele Harry-Potter-Bücher gibt es (Hauptreihe)?|ስንት የሃሪ ፖተር መጻሕፍት አሉ (ዋናው ተከታታይ)?|7||
Wie viele Zwerge gibt es bei Schneewittchen?|በበረዶ ነጯ ታሪክ ውስጥ ስንት ድንክዬዎች አሉ?|7||
Wie viele Farben hat der Regenbogen (klassisch gezählt)?|ቀስተ ደመና (በተለምዶ ሲቆጠር) ስንት ቀለማት አሉት?|7||
Wie viele Saiten hat eine normale Gitarre?|መደበኛ ጊታር ስንት ክሮች አሉት?|6||
Wie viele Spieler können bei Echo Party höchstens mitspielen?|በEcho Party ቢበዛ ስንት ተጫዋቾች መጫወት ይችላሉ?|8||
Wie viele Sekunden hat ein Jahr (365 Tage)?|አንድ ዓመት (365 ቀናት) ስንት ሰከንዶች አሉት?|31536000|s|ሰከንድ
Wie viele Gramm Zucker sind ungefähr in einer 0,33-l-Dose Cola?|በ0.33 ሊትር የኮላ ጣሳ ውስጥ በግምት ስንት ግራም ስኳር አለ?|35|g|ግራም
Wie viele Tassen Kaffee kann man ungefähr aus 1 kg Kaffeebohnen machen?|ከ1 ኪሎ የቡና ፍሬ በግምት ስንት ስኒ ቡና ማፍላት ይቻላል?|120||
Wie viele Einwohner hat Addis Abeba ungefähr (in Millionen)?|አዲስ አበባ በግምት ስንት ሚሊዮን ነዋሪዎች አሏት?|5|Mio.|ሚሊዮን
Wie viele Einwohner hat Berlin ungefähr (in Millionen)?|በርሊን በግምት ስንት ሚሊዮን ነዋሪዎች አሏት?|3.8|Mio.|ሚሊዮን
Wie viele Einwohner hat Tokio (Großraum) ungefähr (in Millionen)?|ቶኪዮ (ታላቁ ክልል) በግምት ስንት ሚሊዮን ነዋሪዎች አሏት?|37|Mio.|ሚሊዮን
Wie viele Einwohner hat Lagos ungefähr (in Millionen)?|ሌጎስ በግምት ስንት ሚሊዮን ነዋሪዎች አሏት?|15|Mio.|ሚሊዮን
Wie viele Kilometer sind es ungefähr mit dem Auto von Addis Abeba nach Bahir Dar?|ከአዲስ አበባ እስከ ባሕር ዳር በመኪና በግምት ስንት ኪሎ ሜትር ነው?|560|km|ኪ.ሜ.
Wie viele Kilometer sind es ungefähr von Addis Abeba nach Dschibuti (Bahnstrecke)?|ከአዲስ አበባ እስከ ጅቡቲ (በባቡር መስመር) በግምት ስንት ኪሎ ሜትር ነው?|756|km|ኪ.ሜ.
Wie viele Kilometer sind es ungefähr mit dem Auto von Berlin nach München?|ከበርሊን እስከ ሙኒክ በመኪና በግምት ስንት ኪሎ ሜትር ነው?|585|km|ኪ.ሜ.
Wie viele Stunden dauert ein Flug von Frankfurt nach Addis Abeba ungefähr?|ከፍራንክፈርት ወደ አዲስ አበባ የሚደረግ በረራ በግምት ስንት ሰዓት ይፈጃል?|7|Stunden|ሰዓት
Wie viele Länder grenzen an Äthiopien?|ከኢትዮጵያ ጋር ስንት አገሮች ይዋሰናሉ?|6||
Wie viele Länder grenzen an Deutschland?|ከጀርመን ጋር ስንት አገሮች ይዋሰናሉ?|9||
Wie viele Inseln hat Indonesien ungefähr?|ኢንዶኔዥያ በግምት ስንት ደሴቶች አሏት?|17000||
Wie viele Kilometer lang ist die Chinesische Mauer ungefähr (alle Teile)?|የቻይና ታላቁ ግንብ (ሁሉም ክፍሎች) በግምት ስንት ኪሎ ሜትር ይረዝማል?|21000|km|ኪ.ሜ.
Wie viele Tage dauerte die erste Weltumsegelung von Magellans Flotte ungefähr?|የማጄላን መርከቦች የመጀመሪያ የዓለም ዙሪያ ጉዞ በግምት ስንት ቀናት ፈጀ?|1080|Tage|ቀን
Wie viele Felder hat ein Sudoku?|ሱዶኩ ስንት ሳጥኖች አሉት?|81||
Wie viele Steine hat ein Domino-Spiel (Doppel-Sechs)?|የዶሚኖ ጨዋታ (ድርብ ስድስት) ስንት ጠጠሮች አሉት?|28||
Wie viele Spielfelder hat ein Monopoly-Brett?|የሞኖፖሊ ሰሌዳ ስንት ሳጥኖች አሉት?|40||
Wie viele Emoji-Reaktionen kann man bei Echo Party werfen?|በEcho Party ስንት የኢሞጂ ምላሾችን መወርወር ይቻላል?|8||"""
for line in MISC.split('\n'):
    de, am, a, ude, uam = line.split('|')
    a = float(a); a = int(a) if a == int(a) else a
    add(de, am, a, ude, uam)

# ---------------------------------------------------------------- Einheiten umrechnen (erzeugt)
UNITS = [  # (Ziel-de, Ziel-am, Quelle-de Sg, Quelle-de Pl, Quelle-am, Faktor, Zahlen)
    ('Sekunden', 'ሰከንድ', 'Minute', 'Minuten', 'ደቂቃ', 60, [3, 7, 12, 25, 45, 90]),
    ('Minuten', 'ደቂቃ', 'Stunde', 'Stunden', 'ሰዓት', 60, [2, 5, 8, 13, 24, 36, 72]),
    ('Sekunden', 'ሰከንድ', 'Stunde', 'Stunden', 'ሰዓት', 3600, [1, 2, 5, 10, 24]),
    ('Stunden', 'ሰዓት', 'Tag', 'Tage', 'ቀን', 24, [2, 3, 7, 10, 14, 30, 100, 365]),
    ('Minuten', 'ደቂቃ', 'Tag', 'Tage', 'ቀን', 1440, [1, 2, 7, 30]),
    ('Tage', 'ቀን', 'Woche', 'Wochen', 'ሳምንት', 7, [3, 6, 9, 12, 26, 52, 100]),
    ('Stunden', 'ሰዓት', 'Woche', 'Wochen', 'ሳምንት', 168, [1, 2, 4, 52]),
    ('Tage', 'ቀን', 'Jahr', 'Jahre', 'ዓመት', 365, [2, 3, 10, 20, 50]),
    ('Meter', 'ሜትር', 'Kilometer', 'Kilometer', 'ኪሎ ሜትር', 1000, [3, 7, 21, 42, 150]),
    ('Zentimeter', 'ሴንቲ ሜትር', 'Meter', 'Meter', 'ሜትር', 100, [2, 8, 15, 33, 125]),
    ('Gramm', 'ግራም', 'Kilogramm', 'Kilogramm', 'ኪሎ ግራም', 1000, [2, 4, 9, 25, 75]),
    ('Milliliter', 'ሚሊ ሊትር', 'Liter', 'Liter', 'ሊትር', 1000, [2, 5, 12, 40]),
    ('Monate', 'ወር', 'Jahr', 'Jahre', 'ዓመት', 12, [5, 8, 18, 25, 40]),
    ('Wochen', 'ሳምንት', 'Jahr', 'Jahre', 'ዓመት', 52, [2, 5, 10]),
    ('Millimeter', 'ሚሊ ሜትር', 'Meter', 'Meter', 'ሜትር', 1000, [3, 12]),
]
for tde, tam, sg, pl, sam, f, ns in UNITS:
    for n in ns:
        add(f'Wie viele {tde} sind {n} {sg if n == 1 else pl}?', f'{n} {sam} ስንት {tam} ነው?', n * f, tde, tam)

# ---------------------------------------------------------------- Kopfrechnen schätzen (erzeugt, immer gleich)
rng = random.Random(4711)
seen = set()
while len([q for q in Q if q[0].startswith('Wie viel ist')]) < 230:
    k = rng.random()
    if k < 0.5: a, b = rng.randint(12, 99), rng.randint(12, 99)
    elif k < 0.8: a, b = rng.randint(101, 999), rng.randint(3, 9)
    else: a, b = rng.randint(11, 49), rng.randint(101, 499)
    if (a, b) in seen: continue
    seen.add((a, b))
    add(f'Wie viel ist {a} × {b}? (schnell schätzen!)', f'{a} × {b} ስንት ነው? (በፍጥነት ይገምቱ!)', a * b)

# Prüfen + schreiben
for q in Q:
    assert q[0] and q[1] and isinstance(q[2], (int, float)) and q[2] > 0, q
out = os.path.join(os.path.dirname(__file__), '..', 'mimic', 'questions', 'questions.js')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('// Generiert von tools/build-questions.py – Schätzfragen [de, am, Antwort, Einheit de, Einheit am, "y"=Jahreszahl]\n')
    fh.write('window.QUESTIONS=' + json.dumps(Q, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(Q), 'Fragen')
