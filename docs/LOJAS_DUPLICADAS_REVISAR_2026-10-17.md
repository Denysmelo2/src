# Lojas duplicadas para revisar — 17/10/2026

**Para o Claude Cowork revisar com o dono.** Não é código, então o Cowork
cuida desta parte. O Claude Code junta no banco só os grupos que o dono marcar.

Contexto: a tarefa 1 do handover do Cowork. A migration 0025 já moveu as
ofertas das lojas que tinham sido juntadas em 05/07 (Boots, ASOS, Nike e
outras 290). Os grupos abaixo nunca foram juntados. São lojas ativas, com
ofertas válidas, e com o mesmo nome depois de tirar "UK", "The", ".com",
espaços e pontuação. Medido em 17/10/2026: 74 grupos.

**Como revisar:** para cada linha, o dono responde "juntar" ou "não juntar".
Quase todos parecem a mesma loja. Os que pedem atenção estão marcados com ⚠.

**Como o Code junta:** grava `merged_into` na loja que sai (a sem "UK", ou a
com menos ofertas) e move as ofertas para a que fica, do mesmo jeito da
migration 0025, com cópia guardada antes. Nenhuma loja é apagada.

| Lojas do grupo |
|---|
| AG1 (`ag1`) / AG1 UK (`ag1-uk`) |
| Alibris (`alibris`) / Alibris UK (`alibris-uk`) |
| American Golf (`american-golf`) / American Golf UK (`american-golf-uk`) |
| Best Heating (`best-heating`) / Best Heating (`bestheating`) |
| Brand Corner (`brand-corner`) / Brand Corner (`brandcorner`) |
| ⚠ Braun Household UK (`braun`) / Braun Household (`braun-household`): o endereço `braun` pode ser a marca toda |
| Brooks Brothers (`brooks-brothers`) / Brooks Brothers UK (`brooks-brothers-uk`) |
| Cabin Zero (`cabin-zero`) / Cabin Zero (`cabinzero`) |
| CamperDays (`camperdays`) / CamperDays UK (`camperdays-uk`) |
| Christophe Robin (`christophe-robin`) / Christophe Robin UK (`christophe-robin-uk`) |
| Cotswold Company (`cotswold-company`) / The Cotswold Company (`the-cotswold-company`) |
| Curlsmith (`curlsmith`) / Curlsmith UK (`curlsmith-uk`) |
| Dc Shoes (`dc-shoes`) / DC Shoes UK (`dc-shoes-uk`) |
| Dermalogica (`dermalogica`) / Dermalogica UK (`dermalogica-uk`) |
| Diesel (`diesel`) / Diesel UK (`diesel-uk`) |
| Eventim UK (`eventim`) / Eventim UK (`eventim-uk`) |
| Flora Select (`flora-select`) / Floraselect (`floraselect`) |
| Footpatrol (`footpatrol`) / Footpatrol UK (`footpatrol-uk`) |
| Free People (`free-people`) / Free People UK (`free-people-uk`) |
| Gap (`gap`) / Gap UK (`gap-uk`) |
| Geox (`geox`) / Geox UK (`geox-uk`) |
| Get Your Guide (`get-your-guide`) / Get Your Guide (`getyourguide`) |
| H. Samuel (`h-samuel`) / H.Samuel (`hsamuel`) |
| Hamilton Watch (`hamilton`) / Hamilton Watch (`hamilton-watch`) |
| Harry's (`harrys`) / Harry's UK (`harrys-uk`) |
| Heat Holders (`heat-holders`) / Heat Holders UK (`heat-holders-uk`) |
| Helly Hansen (`helly-hansen`) / Helly Hansen UK (`helly-hansen-uk`) |
| High Street TV (`high-street-tv`) / Highstreet TV (`highstreet-tv`) |
| Hurley (`hurley`) / Hurley UK (`hurley-uk`) |
| Ickle Bubba (`ickle-bubba`) / Icklebubba (`icklebubba`) |
| Indytute (`indytute`) / The Indytute (`the-indytute`) |
| Interflora (`interflora`) / Interflora UK (`interflora-uk`) |
| kate spade new york (`kate-spade-new-york`) / kate spade New York UK (`kate-spade-new-york-uk`) |
| Kipling UK (`kipling`) / Kipling UK (`kipling-uk`) |
| London Theatre Direct (`london-theatre-direct`) / LondonTheatreDirect (`londontheatredirect`) |
| Lounge Pass (`lounge-pass`) / Lounge Pass (`loungepass`) |
| Malmaison Hotels (`malmaison`) / Malmaison Hotels (`malmaison-hotels`) |
| ManoMano Pro (`manomano`) / ManoManoPro (`manomanopro`) |
| MD London (`md-london`) / MD London (`mdlondon`) |
| ⚠ Mission (`mission`) / Mission UK (`mission-uk`): nome genérico, conferir se é a mesma marca |
| My-Picture (`my-picture`) / MYPICTURE (`mypicture`) |
| Nannybag (`nannybag`) / NannyBag UK (`nannybag-uk`) |
| ⚠ National Trust (`national-trust`) / National Trust Online Shop (`national-trust-online-shop`): sócio do National Trust e loja online podem ser ofertas diferentes |
| NETGEAR (`netgear`) / Netgear UK (`netgear-uk`) |
| Never Fully Dressed (`never-fully-dressed`) / Never Fully Dressed UK (`never-fully-dressed-uk`) |
| Olympic Shop (`olympic-shop`) / Olympic Shop UK (`olympic-shop-uk`) |
| Omorovicza Cosmetics (`omorovicza`) / Omorovicza Cosmetics (`omorovicza-cosmetics`) |
| Parfumdreams (`parfumdreams`) / Parfumdreams UK (`parfumdreams-uk`) |
| Paris Saint-Germain (`paris-saint-germain`) / Paris Saint-Germain Store (`paris-saint-germain-store`) |
| ⚠ Perfume UK (`perfume-uk`) / The Perfume Shop (`the-perfume-shop`): parecem empresas diferentes, **provavelmente não juntar** |
| Pharmacy Online (`pharmacy-online`) / Pharmacy Online UK (`pharmacy-online-uk`) |
| Purple CV (`purple-cv`) / PurpleCV (`purplecv`) |
| Quiksilver (`quiksilver`) / Quiksilver UK (`quiksilver-uk`) |
| Regatta.com (`regatta`) / Regatta.com (`regattacom`) |
| Roxy (`roxy`) / ROXY UK (`roxy-uk`) |
| Shiseido (`shiseido`) / Shiseido UK (`shiseido-uk`) |
| Simply LED (`simply-led`) / SimplyLED (`simplyled`) |
| Smart Buy Glasses (`smart-buy-glasses`) / SmartBuyGlasses (`smartbuyglasses`) |
| Sonos (`sonos`) / Sonos UK (`sonos-uk`) |
| Spa Seekers (`spa-seekers`) / SpaSeekers (`spaseekers`) |
| Standout.co.uk (`standout`) / Standout.co.uk (`standoutcouk`) |
| Tatcha (`tatcha`) / Tatcha UK (`tatcha-uk`) |
| TH Baker (`th-baker`) / T H Baker (`thbaker`) |
| The Craft Beer (`the-craft-beer`) / The Craft Beer UK (`the-craft-beer-uk`) |
| The Diamond Store (`the-diamond-store`) / The Diamond Store UK (`the-diamond-store-uk`) |
| Tog 24 (`tog-24`) / Tog 24 (`tog24`) |
| Tonies (`tonies`) / Tonies UK (`tonies-uk`) |
| Travelodge - UK (`travelodge`) / Travelodge - UK (`travelodge-uk`) |
| Turtle Wax (`turtle-wax`) / Turtle Wax UK (`turtle-wax-uk`) |
| Veronica Beard (`veronica-beard`) / Veronica Beard UK (`veronica-beard-uk`) |
| Wahl (`wahl`) / Wahl UK (`wahl-uk`) |
| Wingly (`wingly`) / Wingly UK (`wingly-uk`) |
| YesStyle.co.uk (`yesstyle`) / YesStyle.co.uk (`yesstylecouk`) |
| You Garden (`you-garden`) / YouGarden (`yougarden`) |
