# Para o Claude Cowork: categorias certas de 95 lojas, 18/10/2026

Escrito pelo Claude Code. É o item 5 da seção 3 de
`docs/DECISAO_VALOR_PONTOS_2026-10-18.md` (lojas em categorias estranhas no
"Browse the retailers"). Não é código: é escolher, loja por loja, onde ela
deve aparecer, e levar a lista para o dono aprovar.

## O que aconteceu

- O robô da Quidco somava toda categoria em que via a loja e nunca tirava
  nenhuma. Por isso as 95 lojas abaixo estão em 17 a 22 categorias cada.
  Exemplo: a adidas aparece em "Food & Drink".
- O robô já foi corrigido (PR Denysmelo2/snapgain-scraper#40). Loja que já
  tem categoria não ganha outras.
- O dono decidiu em 18/10: o Cowork escolhe de 1 a 3 categorias certas para
  cada loja, o dono aprova e o Claude Code aplica com uma migration.

## Como fazer

1. Para cada loja da tabela, escolher **de 1 a 3** categorias. Use o que a
   loja vende de fato, olhando o **site da própria loja**. Não copiar a
   classificação de outro site comparador (regra do dono).
2. Use só estas chaves, escritas exatamente assim. O número é quantas lojas
   já usam cada uma:
   - Principais:
     - fashion (1897)
     - home (1170)
     - travel-and-leisure (1029)
     - beauty (1023)
     - health (925)
     - sports (837)
     - electronics (832)
     - toys (675)
     - food-and-drink (578)
     - entertainment (450)
     - baby (303)
     - office (273)
     - finance (265)
     - luxury (262)
     - cars (228)
     - telco (169)
     - things-to-do (163)
     - gifts (157)
     - pets (150)
     - gaming (142)
     - department-stores (137)
     - garden (124)
     - jewellery (97)
   - Menos usadas:
     - ethical
     - craft
     - groceries
     - books
     - music
     - charity
     - supermarket
     - cycling
     - education
     - tv-and-movies
     - energy
3. **gift-card** não conta nas 3. Ela só marca que alguma plataforma vende o
   vale-presente da loja. O Claude Code mantém essa marca onde ela já está.
4. As 12 lojas "Town & City Gift Card" (Brighton, Bristol etc.) são
   vale-presente de cidade. Sugestão: só `gifts`.
5. Lojas de departamento (Argos, John Lewis, Selfridges, Harrods, Liberty,
   Very, TK Maxx, The Range, Harvey Nichols, FRASERS) podem levar
   `department-stores` mais as 1 ou 2 áreas mais fortes.
6. Preencher a última coluna, mostrar ao dono e gravar a versão aprovada em
   `docs/DECISAO_CATEGORIAS_...md`, com a mesma tabela. O Claude Code aplica.

## As 95 lojas

| slug | Nome | Site | Categorias hoje | Categorias certas (1 a 3) |
|---|---|---|---|---|
| adidas | adidas Shop | adidas.co.uk | 18 | |
| aeg-uk | AEG UK | | 17 | |
| allsaints | AllSaints | allsaints.com | 17 | |
| antler-luggage | Antler Luggage | | 17 | |
| aocom | AO.com | | 19 | |
| aph-airport-parking-and-hotels | APH Airport Parking & Hotels | | 17 | |
| apple | Apple | apple.com | 18 | |
| appliances-direct | Appliances Direct | | 17 | |
| argos | Argos | argos.co.uk | 22 | |
| aspinal-of-london | Aspinal of London | | 19 | |
| austen-and-blake | Austen & Blake | | 17 | |
| avios-hotels-powered-by-expedia | Avios Hotels (Powered by Expedia) | | 17 | |
| avios-insurance | Avios Insurance | | 17 | |
| b-and-q | B&Q | diy.com | 18 | |
| barker-and-stonehouse | Barker & Stonehouse | barker-and-stonehouse.co.uk | 17 | |
| bensons-for-beds | Bensons for Beds | | 17 | |
| bookingcom-uk | Booking.com UK | | 17 | |
| bosch | Bosch | | 17 | |
| brighton-gift-card-town-and-city-gift-cards | Brighton Gift Card - Town & City Gift Cards | | 20 | |
| bristol-gift-card-town-and-city-gift-cards | Bristol Gift Card - Town & City Gift Cards | | 20 | |
| burberry-uk | Burberry UK | | 17 | |
| butlins | Butlin's | butlins.co.uk | 18 | |
| cambridge-gift-card-town-and-city-gift-cards | Cambridge Gift Card - Town & City Gift Cards | | 20 | |
| canterbury-gift-card-town-and-city-gift-cards | Canterbury Gift Card - Town & City Gift Cards | | 20 | |
| chester-gift-card-town-and-city-gift-cards | Chester Gift Card - Town & City Gift Cards | | 20 | |
| cos | COS | | 17 | |
| cotswold-company | Cotswold Company | | 17 | |
| cult-beauty | Cult Beauty | cultbeauty.co.uk | 17 | |
| currys | Currys | currys.co.uk | 20 | |
| dreams | Dreams | dreams.co.uk | 17 | |
| edinburgh-gift-card-town-and-city-gift-cards | Edinburgh Gift Card - Town & City Gift Cards | | 20 | |
| emma-sleep | Emma Sleep | emma-sleep.co.uk | 17 | |
| flannels | Flannels | | 17 | |
| frasers | FRASERS | | 17 | |
| getyourguide | Get Your Guide | getyourguide.co.uk | 17 | |
| glasgow-gift-card-town-and-city-gift-cards | Glasgow Gift Card - Town & City Gift Cards | | 20 | |
| goldsmiths | Goldsmiths | goldsmiths.co.uk | 17 | |
| google-store | Google Store | | 18 | |
| habitat | Habitat UK | habitat.co.uk | 18 | |
| harrods | Harrods | harrods.com | 17 | |
| harvey-nichols | Harvey Nichols | | 18 | |
| hobbs | Hobbs | hobbs.co.uk | 17 | |
| holiday-extras | Holiday Extras | holiday-extras.co.uk | 17 | |
| holland-and-barrett | Holland & Barrett | hollandandbarrett.com | 17 | |
| hotelscom | Hotels.com | hotels-ie.co.uk | 18 | |
| ihg-hotels-and-resorts | IHG Hotels & Resorts | | 17 | |
| it-luggage | it Luggage | | 17 | |
| john-lewis-and-partners | John Lewis & Partners | | 20 | |
| karcher-uk | Kärcher UK | | 17 | |
| liberty-london | Liberty London | libertylondon.com | 20 | |
| london-city-gift-card-town-and-city-gift-cards | London City Gift Card - Town & City Gift Cards | | 20 | |
| lookfantastic | LOOKFANTASTIC Beauty Box | lookfantastic.com | 17 | |
| lululemon | lululemon | lululemon-ie.co.uk | 17 | |
| malmaison | Malmaison Hotels | malmaison.co.uk | 17 | |
| mango-uk | MANGO UK | | 17 | |
| marks-and-spencer | Marks & Spencer | | 17 | |
| marriott-bonvoy | Marriott Bonvoy | | 17 | |
| meta | Meta | | 18 | |
| molton-brown | Molton Brown | | 18 | |
| moneysupermarket-travel-insurance | MoneySuperMarket Travel Insurance | | 17 | |
| nespresso-coffee | Nespresso Coffee | | 17 | |
| net-a-porter | NET-A-PORTER | | 17 | |
| new-look | New Look | newlook.com | 18 | |
| noble-panacea | Noble Panacea | noble-panacea.co.uk | 17 | |
| panda | Panda London | | 17 | |
| pandora | PANDORA Jewellery | pandora.co.uk | 18 | |
| passenger | Passenger | | 17 | |
| paul-smith | Paul Smith | | 18 | |
| pets-at-home | Pets at Home | petsathome.com | 18 | |
| phase-eight | Phase Eight | | 17 | |
| radisson-hotels | Radisson Hotels | radisson-hotels.co.uk | 17 | |
| randox-health | Randox Health | | 17 | |
| ray-ban-uk | Ray-Ban UK | | 17 | |
| river-island | River Island | riverisland.com | 18 | |
| rohan | Rohan | rohan.co.uk | 17 | |
| schuh | schuh | schuh.co.uk | 18 | |
| selfridges | Selfridges | selfridges.com | 19 | |
| sephora | Sephora UK | sephora.co.uk | 18 | |
| sharkninja | SharkNinja | | 17 | |
| soho-home | Soho Home | | 17 | |
| space-nk | Space NK | spacenk.com | 17 | |
| sweaty-betty | Sweaty Betty | sweaty-betty-ie.co.uk | 17 | |
| swift-direct-blinds | Swift Direct Blinds | | 17 | |
| the-range | The Range | therange.co.uk | 17 | |
| the-royal-mint | The Royal Mint | | 17 | |
| tk-maxx | TK Maxx | | 18 | |
| town-and-city-gift-card | Town & City Gift Card | | 20 | |
| trainpal | TrainPal | | 17 | |
| tu-clothing | Tu Clothing | | 18 | |
| uniqlo | UNIQLO | uniqlo.com | 17 | |
| very | Very.co.uk | very.co.uk | 20 | |
| viator-uk | Viator UK | | 17 | |
| whistles | Whistles | | 17 | |
| wickes | Wickes | wickes.co.uk | 18 | |
| york-gift-card-town-and-city-gift-cards | York Gift Card - Town & City Gift Cards | | 20 | |

## Anotar também, se notar

- Nomes que parecem título de página, e não o nome da marca (como era
  "Travelodge - UK"). Exemplos: "adidas Shop", "Very.co.uk", "MANGO UK".
  O dono decide se troca.
- Lojas repetidas que ainda estão ativas: `alpinetrek` / `alpinetrekcouk`,
  `ligo` / `ligocouk`, `tyndrumwhisky` / `tyndrumwhiskycom`, `yoursurprise` /
  `yoursurprisecouk`.
