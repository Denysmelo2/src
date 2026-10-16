// ARCHIVED 16/10/2026 — copy of the deployed Edge Function `nx-sync`
// (version 11), deleted from Supabase on the owner's approval. It was
// never in the repository. NX Rewards offers are inactive on the site
// (last read 01/06/2026); kept here only for the hand-mapped premium
// rates and the seed list. Not deployed; not built.
//
// nx-sync v3 — flag NX network stores AND insert real cashback_offers
// rows with actual rates (10% default, premium rates for the 61 stores
// we mapped manually by walking nxrewards.com).
//
// Output goal: every store in the NX network has a corresponding
// cashback_offers row with platform='NX Rewards'. This replaces the
// synthetic-offer logic that used to live in strategies.js.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Manually mapped premium rates from nxrewards.com (115 pages walked
// 2026-05). Default rate is 10% — only override when NX actually
// publishes a higher rate. Match keys are normalised (lowercase, no
// punctuation, see normalise()).
const PREMIUM_RATES: Record<string, number> = {
  // Tier 1 — jackpot (100% / 40%)
  'lebaramobile': 100, 'lebara': 100,
  'audialswindowssoftware': 40, 'audials': 40,
  'cyberghostvpn': 40,
  'nordvpn': 40,
  'surfshark': 40,
  // Tier 2 (30–35.5%)
  'xshred': 35.5,
  'riverford': 35,
  'ccleaner': 30,
  'mcafee': 30,
  'magzter': 30,
  'pandasecurity': 30, 'panda': 30, 'pandawatchguard': 30,
  'secretflightclub': 30,
  'secretstays': 30, 'secretstayscouk': 30,
  // Tier 3 (15–20%)
  'britishnewspaperarchive': 20, 'thebritishnewspaperarchive': 20,
  'breezeesimuk': 20, 'breeze': 20,
  'moveprework': 20, 'movepreworkout': 20,
  'norton': 20,
  'travelinsurancesaver': 20,
  'tousains': 17,
  'spotahome': 16,
  'yazio': 16,
  'emergencyassist': 15, 'emergencyassistltd': 15,
  'enjoythewood': 15,
  'gatortape': 15,
  'greenchef': 15, 'greenchefuk': 15,
  'harpercollins': 15,
  'hellofresh': 15,
  'hiccup': 15,
  'magix': 15, 'magixwindowssoftware': 15,
  'pawddrinks': 15, 'pawd': 15,
  'trueimage': 15,
  // Tier 4 (12–13%)
  'newbalance': 13,
  'skinners': 13, 'skinnerscc': 13,
  'nationalexpress': 12.5,
  'appliancesdirect': 12,
  'auroraskin': 12,
  'avis': 12,
  'blingkinglondon': 12,
  'calvinklein': 12,
  'charlestyrwhitt': 12,
  'dontbuyherflowers': 12,
  'edreams': 12,
  'emirates': 12,
  'epd': 12,
  'thefashionsquare': 12, 'fashionsquareuk': 12,
  'hotelscom': 12,
  'lastminutecom': 12,
  'lego': 12,
  'leathercompany': 12,
  'opodo': 12, 'opodouk': 12,
  'prungo': 12,
  'selfridges': 12,
  'thenaturalafrica': 12,
  'temu': 12,
  'tescomarketplace': 12, 'tescomp': 12,
  'tui': 12,
  'virginatlantic': 12, 'virginatlanticairways': 12,
  'whogivesacrap': 12,
};

const DEFAULT_NX_RATE = 10;

const NX_URL = 'https://www.nxrewards.com/Home/AllRetailers/1173670';

// Seed list (used as fallback if live scrape gives < half).
// Reusing v2 list — covers ~830 of NX's 1,372 stores.
const NX_SEED: string[] = ["123-reg.co.uk","24|7 Appliance Cover","24|7 Boiler Cover","24|7 Breakdown Cover","24|7 Home Rescue","2bTanned","3D Prima UK","3Retro Football","883 Police","AA UK Breakdown","Above & Below Jewellery","Ace Airport Parking","Acer","Active Era","Active Favourites Gift Card","Activity Superstore","adidas","Advanced MP3 Player","AEG","AEG.co.uk","AEG Home Appliance","AEG Parts and Accessories","Aerolite","Agent Provocateur","Air India","Airbnb eGift","Airparks","Airport Parking Luton (UK)","AKKO","Aku Woodpanel UK","Alamo","Alfa Travel Ltd.","Alibaba","AliExpress UK","allbeauty","Allpowers","AllSaints","Amazon Music","Ancestry UK","Angel and Rocket","Animal","Anine Bing","AnkerSOLIX","Ann Summers","Annoushka","Anthropologie","Antler","Antonioli","anyvan","AO.com","Aosom","APH - Airport Parking & Hotels","Appleyard Flowers","Appleyard London","Appliance City","Appliances Direct","Aqua Spirit","Arabian Adventures","Archiproducts","Arena Flowers","Arena Hotels","Argento","Argos Giftcard","Argus Car hire","Ariat","Arlo Security UK","Armani Beauty UK","Arran - Sense of Scotland","Arsenal Direct","Arsenal FC eGift","ARTAH","Artfinder","ASDA eGift","ASDA Groceries","Ask Italian","ASOS","Aspinal of London","Aspire Furniture LTD","Aston Villa Store","Astrid & Miyu","ASUS","ATG Tickets","Atkin & Thyme","AttractionTickets.com","Audials Windows Software","Auras Insurance","Aurora Skin","Austens Jewellers","Autodesk Store UK","Autodoc","AutoEurope","Avant Skincare","Avanti Travel Insurance","Aveda","Avis","Away Resorts","B&M eGift","B&Q eGift","BabyBjorn","Baker Ross","Bakerdays UK","Balsam Hill","Banggood.com","Barc London","Barcelo","Barker & Stonehouse","Beauty & Spa Favourites Gift Card","Beauty Flash","Beauty The Shop","Beauty Works","Beaverbrooks","Bedding Envy","Beelivery","Beer52","Beerhunter","Begg Shoes","Beko","Belkin","Bella & Duke","Belle Lingerie","Belleek UK","Belstaff","Bemz UK","Ben Sherman","Benefit","Berghaus","Bern Helmets","Best Direct UK","Best Gym Equipment","Better Bathrooms","Beyond Nine","Big Bus Tours","BiGDUG","BigGreenSmile","Billionaire Boys Club","BioGaia","Bio-Synergy","Biovea UK","Blacks","Blake Mill","Blinds Direct Online","Bling King London","Bloch UK Ltd","Bloom & Wild","Bloom Cabin","Bloomingdale's","Blossoming Flowers and Gifts","Blue Elephant","Blue Tomato","Bluebella","Bluecrest","Bluefin SUP","Boden","Bodybuilding Warehouse","Bodykind","Bodywel ebike","Bogner","Bonmarche","Boody","BooHoo.com","boohooMan.com","Boots","Boots eGift","Boots Kitchen Appliances","Boots Photo","Boutique Camping","Boux Avenue","Bower Collective","Bows Boutiques","BrandAlley","Brands Deluxe","Brasserie Blanc","Breeze eSim UK","Brewers","Brisks Outdoors","British & Irish Lions","British Newspaper Archive","Britt's Superfoods","Broadway Travel","Brora","Browns eGift","Browns Fashion","Buff Skincare","Bugaboo","Building Materials","bulk","BullyBillows","Bunches.co.uk","Burgess Pet Care","Burleigh","Burton","Butterworth's","Buture","Buy Sheds Direct","Buyagift","Buyagift eGift","Buybestgear","Buycarparts","Cabin Zero","Cadbury Gifts Direct","Cadense UK","Cafe Rouge","Caffe Nero eGift","Caledonian Travel","Calendar Club","Calvin Klein","Cambridge Audio","Cambridge Mask","Camera Deals","Camera World","Camilla","Camper","Canadian Affair","Candy Kittens","Canon","Canterbury","Car Parts 4 Less","cardfactory","Careline365","Carl Scarpa","Carrentals.co.uk","Cartridge Monkey","Casa Bella Furniture","Case Luggage","Casio","Cass Art","Cast in Style","Castore","Cazaar","CCL","CCleaner","Ceiling Tiles","Certas Energy","CEWE","Champions Travel","Chapelle","Chargrilled t-shirts","Charity Shop eGift","Charles & Keith","Charles Clinkard","Charles Tyrwhitt","Charlotte Tilbury","Chelsea Florals","Chelsea Megastore","Chelsea Peers","Cherry Lane Garden Centres","Chesca Direct","Chicco","Chicme UK","Childrensalon","ChildrensFootball.com","Childsplay Clothing","Chillblast","CHO Fashion & Lifestyle","Choc on Choc","Chocolate Trading Company","Christies Direct","Christmas Tree World","Christow","Christy","Chunk of Devon","CIARRA UK","Circle Fashion","City Cruises","City Plumbing","Clarins","Click Basin","Click4Gap","Clifton Cameras","Clinique","Clogau","Club L London","Club Med","Coast","Cocunat","Coffee Friend","Columbia Sportswear","Conrad Electronic","ContactLenses.co.uk","Contiki","Co-op Food","Coopers of Stortford","Corendon Airlines","Corsair","Cos UK","Cosi Home","Cosmetify","Cosori UK","Cost Cutters UK","Costway UK","Cosyfeet","Cotswold Outdoor","Cotton On","Cotton Traders","Cottsbury","Counter Culture Store","CovingandMouldings","Coway UK","Cox and Cox","Craftiosity","Crampton and Moore","Crazy Kangaroo","Create","Crew Clothing","Cricut","Crocs","Crystal Ski","Cult Beauty","Cupshe UK","Curious Egg","Currys Benefits eGift","Currys Partsmaster","Custom Controllers","Cutter and Squidge","CyberGhost VPN","Damart","DAME","Dare2b","Darlings of Chelsea","Dartington Crystal","Dash Water","Daylesford Organic","DB Journey","Debenhams","Decathlon eGift","Decathlon UK","Decorative Aggregates","Decree","Deesse Pro","Delilah Cosmetics","Deliveroo","Deliveroo eGift","Dell","Dell Outlet","Dell Refurbished","Delonghi","Denby","Dents Gloves","Dermatica","Design My World","Designer Wear","Desktronic","DFB-Fanshop","DFDS Seaways","Direct 365","Direct Blinds","Direct Cosmetics","Direct Ferries","Direct Fireplaces","Direct Heating Spares","Direct Stoves","Direct-Running UK","Discount Experts","Discount Golf Store","Discounted Sunglasses","Discover Cars","Disney Store","Dobell","Domino's","Don't buy her flowers","Door Superstore","Dorothy Perkins","Dorset Hideaways","Doulton","Dower & Hall","Downtown Stores","Drainage Superstore","Drench","drinkstuff.com","DrinkWell","Drivalia","dryrobe UK","Dulux","Dune London","Dunelm","Dusk Lights","DYU Ebike","e.l.f. Cosmetics","Early Learning Centre","Earths Secrets","easyHotel","Easylife","EasySim","Easyspace","Eastpak","Ebuyer","ECatering","Echelon Fit UK","Ecovacs","Edmunds Cocktails","eDreams","EE Tech & Gaming","Efectiv Nutrition","eFlorist UK","EGO","EKO Home","Ekster","Eleano's Gallery","Electrical Discount UK","Electrical World","Electricshop","Electrolux","Elegant Showers UK","Elemis","Eleonora Bonucci","ELGATO","Elizabeth Arden","Ellesse","Emergency Assist","Emergency Assist Warranty","Emirates","Emma","Emma Bridgewater","Emma Hardie","Emmy London","EMP","END. Clothing","Endgame Gear","England FA Shop","England Rugby Store","English Heritage","English Heritage Membership","English Heritage Shop","Enjoy the Wood","Enjoy Travel","Enterprise Rent-A-Car","EPD","Equi London","Ernest Jones","Ernest Jones eGift","ESE Direct","ESET UK","ESPA Skincare","Estee Lauder","Ethical Superstore","Ethiopian Airlines","Etihad Airways","Etihad Holidays","Eufy","EufyMake","Euro Car Parts","Europcar","Evan Evans Tours","Event Decor Shop","Eventim","Everton","Evri","Evri International","Explorer Travel Insurance","Express Trainers","F.Hinds Jewellers","F1 Autocentres","F1 Store","Faace","Fab Homes","FabFinds","Fabrique","Face the Future","Facetheory UK","Faith Jewellers","Fanatics","Farah","FARFETCH","Farm Rio UK","Farmfoods E-Card","Farnell","Fashion Addict","Fashion Eyewear","The Fashion Square","Fawkes Cycles","Feather & Black (UK)","Feel Good Contacts","Fenty Beauty","Fever","Fibrely","Find Me A Gift","findmypast","Fine Food Specialist","Fiorucci","First Choice","Firsty","FitFlop","Fitimins","Fitness Options","Fitville UK","Flanerie","Flannels","FlexiSpot","Flixbus","Flooring Revolution","Flower Station Ltd","flowerbx","Flowers & Plants Co","Flying Flowers","FOCO","FOLD Reformer","Foot Locker eGift","Foot Locker UK","Footshop","Foreo","Formula 1 Arcade","Formulae Prescott","Forth With Life","Forthglade","Fortnum and Mason","Fossil","Foxy Locks","FragranceX.com","Framed Works","Fraser Hart","Frasers","Free Soul","Freedom Of Movement","French Bedroom","French Connection","Frenchic Paint","Frenzy Clothings","Freshlick","Funky Pigeon","Furniture Direct Online","Furniture in Fashion","Furniture Village","Furniture123","Furocity","FutureLearn Limited","GAME","Gamers Favourites Gift Card","Gamola Golf","Ganni","Garden by Waitrose & Partners","Garden Furniture Centre","Gardenesque","Gardening Direct","Gardenstone","GatorTape","Gatwick Holiday Parking","GB Posters","Geepas","George at ASDA","Get The Label","GetYourGuide","Ghost","Ghost Bikes","Give Me Cosmetics","Glasses Direct","Glenmuir","GSF Car Parts","Glow.co.uk","Go Ape","Go Ape eGift","Go Groopie","Go Outdoors","Goddiva","Goldsmiths","Golf Gear Direct","Gorgeous Shop","GoVivid Breakdown Cover","Graham and Green","Great Little Breaks","Great Little Trading Company","GreatBeanBags.com","Green & Blacks","Green Chef UK","Green People","Grenade","Groomers","Groupon UK","G-SHOCK","Gtech","H Samuel eGift","H&M","H&M eGift","H&T Jewellery","H. Samuel","Habitat Escapes Ltd","Habitat UK","Hair Burst Limited","Halfords","Hamleys","Happy Beds","Happy Homeware","Happyology","Harfi","Harper Collins","Harts Of Stur","Harvester eGift","Harvey Nichols","Harvey Nichols eGift","Haven Holidays","Hawes & Curtis","Haws","Heal's","Health and Her","Healthspan UK Elite","Hedges Direct","Heist Studios","Hello Fresh","HelloFresh","Hello of Mayfair Furniture","Herman Miller","Herring Shoes","Hexclad","HEYDUDE","HiCCUP","Hiro Worldwide Ltd","HiSmile","Hive Books","Hobbs","Hobbycraft eGift","Hoka One One","Holiday Autos","Holiday Extras","HolidayTaxis","Holidu UK","Holland and Barrett","Home Fitness Code","Homes & Villas by Marriott Bonvoy","Homescapes","Honor UK","Hoover","Host and Stay","Hot Diamonds","Hot Golf UK","Hotels.com","Hothair","Hotpoint UK Appliances","HP","Huawei","Hughes","Hunkemoller UK","Husqvarna","Hyperice UK","I Want One Of Those","Iberia","iCandy","Iceland","Iceland eGift","Ickle Bubba Ltd","Iconic London","Iglu Ski","iHerb","IKEA eGift","InfinityXinfinity","Inov-8","Inspire Staycation eGift","Insulation Superstore","Insure & Go","Interparcel","InterRose","iRobot","iS Clinical","Isango","iStore","IT Luggage","Jacamo","Jack Wolfskin UK","Jackery","Jam Golf","Jane Plan","Japspeed","Java Whiskers","JBL UK","JD Sports","JD Sports eGift","JD Williams","Jennah Organics","Jetpac","Jigsaw","JigsawPuzzle","Jimmy Choo","Joe Browns","John Greed Jewellery","Joseph","Joseph Joseph","JOY","Jules B","Julian Charles","Just Eat","Just Geek","Just Sheepskin","JustWears","JustYou","justyouroutfit","Karcher","Karen Millen","Karl Lagerfeld","Kaspersky","Kaytea","Kendamil","Kenwood","Kerastase","Kettler Furniture","Kickers","Kiddies Kingdom","Kids Favourites Gift Card","Kiehl's","Kiko","KinKind","Kipling UK","Kitbox","Kiwi.com","KiwiCo","Klass","Klook","Knickerbox","Koo-di","KRCS Apple Premium Reseller","K-Swiss","Kwik Fit","KWM wines","La Redoute","La Roche Posay","Lacoste","L'AGENCE","Laithwaites","Lampandlight UK","Lancome","Land of Rugs","Lands' End UK","Landscaping Superstore","Laptops Direct","L'Artisan Parfumeur","lastminute.com","Latest In Beauty","Lavazza","Lavish Alice Retail Ltd","Lavish Spa eGift","LazyPanda","Le Col UK","Le Specs","Leader Online","Leather Company","Lebara Mobile","Lee","Leekes","LEGO","Legology","Leisure Lakes Bikes","Lemonade Dolls","Lenovo UK","Lenstore UK Contact Lenses","Levi's","LG","Libernovo","Liberty London","Liforme","Lights.co.uk","Lights4Fun","Lily Charmed","Lindt","Lindy Electronics","Lite Stone","Little Helper","Little Lies","Living and Home","Living DNA","Liz Earle","L'Occitane","Logitech","Logitech G","London Graphic Centre","London Sock Company","London Theatre Direct","London Zoo","Long Tall Sally","LOOKFANTASTIC","Looking Glass","Looking4Parking","Loop Earplugs","Loop Mobile","L'OR","Lord Of The Beards","Louche","Lovat Parks","Love the Sales","Love To Dream","loveholidays UK","Lovehoney","Lovell Sports","LOVEtheatre","Loving Foods","LSA International","Lucky2Go","Luff Sleep","Luke Roper","Lulu Guinness","lululemon","Lush eGift","Luxurious Look","Luxury Cottages","Lyca Mobile","Lyle & Scott","Macback","MacFinder","Macy's","Magazines Direct","Magee 1866","Magic Madhouse","MagicBreaks","MAGIX","MagsDirect","Magzter","Mahabis","Mainline","Majestic Wine","Make My Blinds","Malaysia Airlines","Mamas & Papas","Mammotion","Manchester United","ManoMano","Maplin","Mappin & Webb","Marks and Spencer","Marks Electricals","Masdings","Mastershoe","Matalan","Materials Market","Mattress Online","Mattressnextday","Max Photo","Maxi-Cosi","MaxiNutrition","McAfee","Mcqueens Dairies","MD London","Medela","Medino","Mejuri","Memory Foam Warehouse","Merit Beauty","Merlin Entertainment","Merrell","Merry People","Metalshop.com","Michael Kors","Miele","Millets","Miraclesuit","MissPap","Mitre","MLB","Moda in Pelle","Moda Operandi","Modmo","Mojo","Molton Brown","Momcozy","Moonpig","Morphy Richards","Morrisons","Morrisons eGift","Morrisons Grocery","Motorsport Tickets","Mountain Warehouse","Move Pre-Workout","MPB.com","Muc-Off","Mugler","Munbyn UK","Murad","Musement","Music Magpie","Mustard London","Musto","My 1st Years","My Babiie","My Motor World","My Nintendo Store","My Tool Shed","MyFlowers","MyHeritage","Mylee","MyMemory","MyNextBike","MyTheresa","mytyres.co.uk","myvitamins","Myzone","MZ Skin","Nadula","Nails Inc","Naked Wines eGift","Nars Cosmetics","NastyGal UK","National Express","National Shower Spares","National Tyres and Autocare","Native Places","Natural Collection","Nature's Best","Nature's Fix","NBA Store","Neal & Wolf","Nearly Naked Veg","Nere","Nespresso","New Balance","New Era Cap","New Look","Newbridge Silverware","Newmarket Holidays","NFL Shop","NHL Shop","Niche Jewellery","Nike eGift","Nikura","Nintendo eShop","Nip & Fab","Nisbets","Nkuku","NO GUNK","no7 Beauty","Noble Panacea UK","Nobody's Child","Noobru","NordVPN","Norfolk Hideaways","Norton","Nothing Fishy","Notino","notonthehighstreet.com","Numan","Nutricircle","NutriQuarter","Oak&More","Oakley","Oasis","Ocado","Ocean Bottle","ODEON","Office Furniture Online","Office Monster","Office Shoes","Office Stationery","OKA","Oliver Sweeney Trading Limited","Olivia & Pearl","Olivia Burton","OLPRO","OMNES","On That Ass","On The Beach","One4all eGift","onefinestay","OnePlus","Online Home Shop","Opodo UK","OptiBac Probiotics","OptimallyMe","Optimum Nutrition","Oral B","Original BTC","Original Penguin","Oscar & Hooch","Otterbox","OTTY Sleep","Overclockers UK","Oxfam Online Shop","Oxford Online Pharmacy","Pagazii","Panasonic","Panda Security","Pandora","Parcel2go","Paria","Parkdean Resorts","ParkVia","PartyLite","Passenger","PatPat UK","Paul Smith","PAWD DRINKS","Paying Too Much","Peace Out Skincare","Peachaus Lounge","Peacocks","Peeko","Penelope Chilvers","Penhaligon's UK","Percy and Reed","Peregrine Clothing","Perfect Pet","Perfume Click","PerriconeMD","Pet Drugs Online","Petlibro","Pets at Home","Pets Villa","Peugeot Saveurs","PGL Travel","PHARMACY 2U","Pharmacy First","Pharmacy2U","Phase Eight","Philip Kingsley","Philips","Philips Hue UK","Photobox","Picniq","Pizza Express eGift","Pizza Hut","PLAUD UK","PlayPress Toys","Plumbing Superstore","Plumbworld","Pod Point","Polar UK","Polarn O Pyret","Polished London","Pond5","Pondkeeper","Pong Cheese","Pooch and Mutt","POPSTORE","Postmymeds","Posturite","PoundFun","Power Tools Direct","PRC Direct","Premier Inn at Home","Prep Kitchen","Prescription Doctor","Prestige","PrettyLittleThing","Prezzo eGift","Price Crash Furniture","Primark","Printerinks","PrinterPix UK","Printrendy","Priority Pass","Pro Breeze","Pro Tyre","ProCook","Professional Building Supplies","Prop Options","Protein Works","Proviz","Prungo","Public Desire","Pull & Bear","Puma","Pure Beauty","Pure Leisure Group","Purely Pets","Purina UK","Purple Parking","Qatar Airways","Q-Park","Qskinz","QVC","Rabbie's Tours","Radley","Railcard","RAJAPACK UK","Ralph Lauren","Ram Golf","Ramsdens Jewellery","Rangers FC Store","Rapid","Rascal Clothing","RattanTree","Raw Denim","Ray Ban","Readly UK","Real Food Hub","Red Funnel","Red Letter Days","Redbubble","Reef Sandals","Regal Fish","Regatta","Reiss","Reliant","Rem-Fit","Renogy","ReservAway","Restaurant Favourites Gift Card","Reverse Life","RevitaLash","Revive Active","Riverford","Rituals eGift","River Island UK","Riviera Travel","Robert Dyas","Roblox eGift","Roborock UK","Rockahula Kids","Rohan","Roksanda","Roofing Superstore","Roseland Furniture","Rosetta Stone","Routledge","Rox","Royal Doulton","Royalbathrooms","RS Components","RSPB","Rugs Direct","Runners Need","Ryman","Ryobi","Saily","Sainsbury's eGift Card","Sainsburys Groceries Online","Saltrock","SamBoat UK","Samsung","Samuel Johnston","Sans Matin","Saucony","Savers","Savile Row Company","SC Nutra","Scandiborn","Scholastic","Schuh","Scott Direct","Scottish Fine Soaps UK","Scottsdale Golf","Screwfix eGift","Scribbler","Sealions","Sealskinz","Secret Flight Club","Secret Sales","SecretStays.co.uk","See Tickets","Sekonda","Selections","Selfridges","Selfridges eGift","Sensilab","Sephora","Serena Bute","Serenata Flowers","Servers Direct","SGS Engineering","SHEIN","Sigma Sports","SikSilk","Simba Sleep","Simon Jersey","Simple Clothing","Simplisafe","Simply Be","Simply Business UK","Simply Cook","Simply Meds","Simply Supplements","Sir Gordon Bennett","Siren Craft Brew","Skechers","Ski France","Skin Deep UK","Skinners.cc","Skinnydip","SkyParkSecure","Slam Jam","Slaters","Sleep Hubs","Slimming World Kitchen","Slurp","Small Batch Coffee Roasters","SmartBuyGlasses","Smol","Snapfish","Snaptrip","Snow + Rock","Snow Rental","Snuz","Soak and Sleep","Sock Shop","Sofa Club","Sony","Sorel","Soundcore","SpaBreaks","Space NK","Spartan","Spartoo.co.uk","SpaSeekers","Sport and Leisure UK","Sports Ball Shop","Sports Direct","Spotahome","Spotlight Oral Care","Standout","Stanley 1913","Stansted Airport Parking","startriteshoes.com","Startselect","Stock Must Go","StockX","Stolt","Stonehouse eGift","StrawberryNET","Stress Free Car Rental","Stretch It Body Jewellery","Stuart Trevor","Stuart Weitzman","Stuarts London","StubHub","Stylevana","Suit Direct","Sunglass Hut","Sunshine.co.uk","Sunspel","Superdrug","Superdry","Supplement Hub","Surfshark","Suttons","Swallow","Sway Hair Extensions","Sweatband","Sweaty Betty","Swoon London","tabletennis365","Tado","Tails.com","Tap Warehouse","TASCHEN","Tassimo","TBCo","Tech Trade","Temple Spa","Tempur","TEMU","Tena","TENZING","Terravision","Terry's Fabrics","Tesco F&F","Tesco Groceries","Tesco Marketplace","Tessabit Stores","Teva","TFNC","TGJones","The Big Phone Store","The Body Shop","The British Hamper Company","The Book of Mormon","The Cake Decorating Company","The DoubleF","The Entertainer","The Fast 800","The Fine Bedding Company","The Fragrance Counter","The Fragrance Shop","The Game Collection","The Gift Experience","The Gym Group","The Gym King Ltd","The Happy Puzzle Company","The Highland Soap Co. Limited","The Independent Pharmacy","The Inn Collection Group","The IT Bay","The Jewellery Channel","The Knitting Network","The Minifigure Store","The Natural Africa","The North Face","The Nursery Store","The Oodie UK","The Organic Pharmacy","The Outnet","The Paint Shed","The Perfume Shop","The Posh Shed Company","The Radiator Warehouse","The Range","The Real Greek","The Safe Shop","The Scotch Malt Whisky Society","The Somerset Toiletry Co","The Spark Company","The Sports Edit","The Towel Shop","The Underfloor Heating Store","The View from The Shard","The Wellness Card eGift","Theatre Tickets Direct","Thompson & Morgan","Thorntons","Thortful","Threadbare","Tickadoo","Ticketmaster","Ticketmaster eGift","Ticketmaster Theatre","Timberland","Tiqets","Titleist","TLC Sport","Toby Carvery eGift","Toby Tiger","Together Health","Tokyo Laundry","Tommy Hilfiger","Toolstation UK","Topshop Topman","Torres Novas","TORRO","Tory Burch","Totes Isotoner","Tough Mudder","Tousains","Tower London UK","Townhouse Blankets","TP Toys","Trade Price Flues","Trafalgar","Trail","Trainline","TrainPal","TransPennine Express","Transport For Wales","Travel Insurance 4 Medical","Travel Insurance Saver","Travelcard eGift","Travelodge","Travelpro","TravelSupermarket","Travis Perkins","Treatwell","Tredz","Tree2mydoor","Trek-Expert","Trilogy Stores","Trimming Shop","Trollbeads","True Image","Tru-Diamonds","TUI","Turtle Bay eGift","TV Cables","Twinings Teashop","Two Face Aesthetics","TYMO Beauty","Typo","Tyre Shopper","Tyres UK","Uber eGift","UGG","UK Breakaways","UK Office Direct Limited","Ukmeetandgreet.com","Ulike UK","Under Armour","unineed","UNNDR","UNOde50","UPERFECT","ur","Urban eGift","Urban Outfitters","Vakole","Venchi","Vertbaudet","Very","viagogo","Viator a Tripadvisor company","Viking","Vintage Inns eGift","Vinyl Castle","VioVet","Virgin Atlantic","Virgin Atlantic Holidays","Virgin Balloon Flights","Virgin Experience Days","Virgin Experience Days eGift","Virgin Holidays","Virtual College","Vision Express","VisitBritain","VisitBritain eGift","VistaPrint","VitaBright","VIVE","Vivo Life","VIVOMED","VO","Vocalzone","VOLLYC","Vrbo","Wallis","Walt Disney Travel Company","Warehouse","Warehouse Wines","Warrior","Waterdropfilter","Waterford","Wedgwood","wegottickets.com","WeightWorld UK","Weird Fish","Welding & Welder","Westminster Stone","Whistles","Who Gives A Crap","Wholesale Domestic","WHSmith","Wickes","Wickes eGift","Wide Fit Shoes","Wild & Stone","Wild Cosmetics","WildBounds","William May","William Wood","Winstons Beds","Wish","Wood Finishes Direct UK","Woodyatt Curtains","World of Books","Wowcher","Wrangler UK","WWE Shop","Wynsors","Xiaomi","XSHRED","xTool","XY London","Yazio","Yo Sushi","Yotel","YouGarden","YourParkingSpace","Yours Clothing UK","YourSurprise","YourZooki","YSL Beauty UK","YuMOVE","Zanussi","Zavvi","Zebra Golf","Zen Hotels","Zest Car Rental","Zooplus","Zwilling UK"];

const NOISE_SUFFIXES = [
  'egift','gift','card','giftcard',
  'uk','ie','com','co.uk','net','org',
  'ltd','limited','llc','inc','plc',
  'shop','store','online',
];

function baseNormalise(s: string): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function keysFor(name: string): string[] {
  const out = new Set<string>();
  let s = baseNormalise(name);
  if (!s) return [];
  out.add(s.replace(/[^a-z0-9]/g, ''));
  let changed = true;
  while (changed) {
    changed = false;
    const m1 = s.match(/\s*\d+\s*gbp\s*$/i);
    if (m1) { s = s.slice(0, m1.index).trim(); changed = true; }
    for (const suf of NOISE_SUFFIXES) {
      const re = new RegExp('([\\s\\.\\-]|^)' + suf.replace(/\./g, '\\.') + '\\s*$', 'i');
      if (re.test(s)) { s = s.replace(re, '').trim(); changed = true; }
    }
    if (s) out.add(s.replace(/[^a-z0-9]/g, ''));
  }
  return [...out].filter(k => k.length >= 2);
}

function extractFromHtml(html: string): string[] {
  const out = new Set<string>();
  const re = /<a[^>]*>([^<]{2,80})<\/a>/g;
  let m;
  const blacklist = /^(home|login|about|contact|sign in|sign out|terms|privacy|all retailers|register|search|menu|back|next|previous|faq|help|news|blog|cookie|policy)$/i;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].trim();
    if (!t || blacklist.test(t)) continue;
    if (t.length < 2 || t.length > 80) continue;
    if (/^https?:\/\//i.test(t)) continue;
    out.add(t);
  }
  return [...out];
}

function rateForStore(storeName: string): number {
  // Check every variant key against PREMIUM_RATES, return highest match.
  let best = DEFAULT_NX_RATE;
  for (const k of keysFor(storeName)) {
    if (PREMIUM_RATES[k] && PREMIUM_RATES[k] > best) best = PREMIUM_RATES[k];
  }
  return best;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const summary = {
    source: 'seed' as 'live' | 'seed',
    nx_retailer_count: 0,
    stores_flagged: 0,
    stores_unflagged: 0,
    offers_inserted: 0,
    premium_offers: 0,
    errors: [] as string[],
  };

  try {
    let retailerNames: string[] = NX_SEED;
    try {
      const r = await fetch(NX_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnapGain/1.0)' } });
      if (r.ok) {
        const html = await r.text();
        const live = extractFromHtml(html);
        if (live.length >= NX_SEED.length / 2) {
          retailerNames = live;
          summary.source = 'live';
        }
      }
    } catch (e) {
      summary.errors.push(`live fetch: ${String(e)}`);
    }

    summary.nx_retailer_count = retailerNames.length;

    const nxKeys = new Set<string>();
    for (const name of retailerNames) {
      for (const k of keysFor(name)) nxKeys.add(k);
    }

    // Walk stores, find NX matches.
    const CHUNK = 1000;
    const matches: { id: string; name: string; rate: number }[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .range(offset, offset + CHUNK - 1);
      if (error) { summary.errors.push(`stores fetch ${offset}: ${error.message}`); break; }
      if (!data || data.length === 0) break;
      for (const s of data) {
        const keys = keysFor(s.name);
        let inNetwork = false;
        for (const k of keys) {
          if (nxKeys.has(k)) { inNetwork = true; break; }
        }
        if (inNetwork) {
          const rate = rateForStore(s.name);
          if (rate > DEFAULT_NX_RATE) summary.premium_offers++;
          matches.push({ id: s.id, name: s.name, rate });
        }
      }
      if (data.length < CHUNK) break;
      offset += CHUNK;
    }

    // Reset flags then mark matches.
    const { error: clearErr, count: cleared } = await supabase
      .from('stores')
      .update({ in_nx_network: false }, { count: 'exact' })
      .eq('in_nx_network', true);
    if (clearErr) summary.errors.push(`clear: ${clearErr.message}`);
    summary.stores_unflagged = cleared || 0;

    const matchIds = matches.map(m => m.id);
    for (let i = 0; i < matchIds.length; i += 500) {
      const chunk = matchIds.slice(i, i + 500);
      const { error, count } = await supabase
        .from('stores')
        .update({ in_nx_network: true }, { count: 'exact' })
        .in('id', chunk);
      if (error) summary.errors.push(`flag ${i}: ${error.message}`);
      else summary.stores_flagged += count || 0;
    }

    // Wipe old NX Rewards offers, then re-insert fresh ones.
    const { error: delErr } = await supabase
      .from('cashback_offers')
      .delete()
      .eq('platform', 'NX Rewards');
    if (delErr) summary.errors.push(`delete NX offers: ${delErr.message}`);

    // Insert real cashback_offers for every NX-flagged store.
    const now = new Date().toISOString();
    const offerRows = matches.map(m => ({
      store_id: m.id,
      platform: 'NX Rewards',
      rate: m.rate,
      is_active: true,
      last_verified_at: now,
    }));

    for (let i = 0; i < offerRows.length; i += 500) {
      const chunk = offerRows.slice(i, i + 500);
      const { error, count } = await supabase
        .from('cashback_offers')
        .insert(chunk, { count: 'exact' });
      if (error) summary.errors.push(`offers ${i}: ${error.message}`);
      else summary.offers_inserted += count || 0;
    }

    return new Response(JSON.stringify({ ok: true, summary }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err), summary }, null, 2),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
