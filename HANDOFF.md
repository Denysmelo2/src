# SnapGain — Session Handoff

> **Para Claude em sessão nova:** leia este arquivo inteiro antes de qualquer ação.
> Não releia arquivos do repo a menos que precise editá-los — isso enche o contexto.
> Use Grep/Glob pra localizar. Read só quando for editar.

Última atualização: **2026-07-05 (session 7.0)** — SITE LIVE em snapgain.uk. GDPR compliance, mobile refactor, dashboard + compare unificados. Veja seção 7.17 (e 7.14–7.16 pras anteriores).

---

## 1. Repos & arquitetura

| Repo | Caminho | Propósito |
|---|---|---|
| **App React** | `C:\Users\babif\OneDrive\Principais estrutura SnapGain - SRC\src-1\` | Frontend Vite + Tailwind + Supabase |
| **Scraper Node** | `C:\Users\babif\snapgain-scraper\` | Playwright + stealth. Roda local hoje; vai pra GitHub Actions cron do Denys depois |

**Supabase project:** `ffowgyjdbgkphsflxybk` (URL `https://ffowgyjdbgkphsflxybk.supabase.co`)

**API keys (novo formato Supabase, legacy desativado):**
- App usa `sb_publishable_*` em `src/lib/customSupabaseClient.js`
- Scraper usa `sb_secret_*` (service_role) em `.env` local

## 2. Founder / Tom

Bárbara — direta, ágil, PT/EN alternado. Quando aprova conceito, executar. Não ficar perguntando.

## 3. Modelo de negócio

- £7.99/mo ou £60/yr — premium only (desde 23/10/2026; `src/config/pricing.js`)
- Trial 7 dias sem cartão. Uma estratégia desbloqueada (One4all + NX). Outras 8 só pagantes.
- Sempre pago: Strategy Library completa, Household, Saved, Alerts

## 4. Estado dos DADOS em produção (2026-05-18)

### Tabelas com conteúdo legítimo

| Tabela | Rows | Origem |
|---|---|---|
| `stores` | 10.218 | Catálogo original + scrapers |
| `stores.in_nx_network = true` | 1.530 | **Manual de Bárbara** (preservado, não tocar sem permissão) |
| `cashback_offers` | 1.530 | **NX Rewards** — re-inserido 2026-05-18 a partir do código da Edge Function `nx-sync` (rates premium 100/40/30/etc. pra ~43 lojas, default 10% pras outras) |
| `point_offers` (airline `British Airways Avios`) | 2.022 | Scraper Avios — rate per £, URL `https://www.avios.com/en-GB/collect-avios/shopping/retailers/<slug>/` |
| `gift_card_offers` (`jamdoughnut`) | 217 | Scraper JamDoughnut |
| `gift_card_offers` (`everup`) | 273 | Scraper Everup |
| `gift_card_offers` (`cheddar`) | 0 | Scraper pronto, **não rodado ainda** |
| `miles_programs` | 2 ativos | `British Airways Avios` (0.01), `Qatar Privilege Club (Avios)` (0.01) |

### Tabelas vazias (intencional, depois de cleanup)

| Tabela | Por quê |
|---|---|
| `cashback_offers` (qualquer plataforma fora `NX Rewards`) | scrimpr-sync alimentava 13.477 rows de TopCashback/Quidco/Rakuten/etc., **tudo deletado 2026-05-18** porque ela queria substituir por dados nossos. Voltam quando construirmos esses scrapers. |
| `point_offers` (airline ≠ Avios) | scrimpr também escrevia "British Airways Avios" no airline com rates diferentes dos nossos. Limpo. |

### Tabelas legacy (não usar)

- `cashback_rates` (17 rows de mock de Agosto/2025)
- `offers`, `reward_options`, `rate_history` (vazias)
- `promotions` (3 rows "Welcome Offer")
- `users` (não confundir com `auth.users` + `user_profiles`)

## 5. Edge Functions em Supabase

| Slug | Status | Propósito |
|---|---|---|
| `nx-sync` | ⚠️ **DEIXAR EXISTIR** mas não invocar — tem código com seed manual (PREMIUM_RATES + NX_SEED) que JÁ usamos pra recuperar. Não rodar sem combinar com Bárbara, pois reseta `in_nx_network` |
| `scrimpr-sync` | 🟡 **DELETAR no Dashboard** (Bárbara ainda não confirmou se deletou) — senão volta às 04:00 UTC e quebra tudo de novo |
| `jamdoughnut-sync`, `cj-sync`, `topcashback-uk`, `jamdoughnut-uk`, `amazon-uk` | Edge functions antigas inativas. Provavelmente lixo, mas não cheguei a olhar. |
| `create-checkout-session`, `stripe-webhook`, `create-portal-session` | ✅ Stripe — não tocar |
| `auth-callback`, `user-registration` | ✅ Auth — não tocar |
| `simulate`, `platform-comparison`, `subscription-handler` | App functions — não tocar |

## 6. Scrapers (estado)

Repo `C:\Users\babif\snapgain-scraper\`. Comandos:
```powershell
cd C:\Users\babif\snapgain-scraper
node index.js jamdoughnut   # ou cheddar | everup | avios
$env:HEADED="1"; node index.js <name>   # debug visual
```

| Scraper | Status | Notas técnicas |
|---|---|---|
| `jamdoughnut` | ✅ Produção (217 brands) | API direta `https://backend.jamdoughnut.com/api/web/searches` (sem browser) |
| `cheddar` | 🟡 Pronto, ~26 brands esperados | Framer site, parse via Playwright |
| `everup` | ✅ Produção (273 brands) | Tailwind cards, Playwright |
| `avios` | ✅ Produção (2.022 offers) | API paginada `https://www.avios.com/collect-avios/shopping/api/partners/?page=N`. Cloudflare passa com stealth. AIRLINE = `'British Airways Avios'` (canônico) |
| `topcashback` | ✅ Produção LOGADO (1063 active, 271 com breakdown — TC_ENRICH_ONLY_MISSING rodando em bg na hora do compact) | **REQUER LOGIN.** Sessão em `tmp/topcashback-session.json` via `topcashback-login`. 14 painéis em /offers/ + 145 categorias (2 markups: `li.gecko-offertext` em /offers/, `a.category-panel` em /category/<slug>/`?page=N`). **Pager timing fix:** `waitForTimeout(1500)` necessário senão pager renderiza após screenshot. Enrich visita /<slug>/ e parseia `.merch-rate-card` (sub-cat → tag → rate). |
| `tc-giftcards` | ✅ Produção (131 produtos) | Subdomínio `top-giftcards.topcashback.co.uk` (Vue/Inertia/Tillo). Sessão TC reusada (cookies cross-subdomain `.topcashback.co.uk`). Parse de `<div id="app" data-page=...>` JSON — todos os produtos numa única request. Tabela: `gift_card_offers` com `platform='topcashback-giftcards'`. |
| `topcashback-login` | ✅ Comando one-shot | Abre Chromium HEADED, espera signal `tmp/LOGIN_READY` pra salvar cookies. **Conta de teste:** `barbaraaymeemelo@gmail.com`. |
| `quidco` | ✅ Produção LOGADO (3759 merchants, **3758 com breakdown — 99.97%**) | **REQUER LOGIN.** Sessão em `tmp/quidco-session.json` via `quidco-login` (signal `tmp/QD_LOGIN_READY`). **Listing via JSON embeddado** — `<section data-component="MerchantListComponent">` tem todos os merchants. **`?page=N` é IGNORADO** — usar GraphQL POST `/graphql` `loadMoreMerchants` query (variáveis: `categoryName` é o **title** ex "Fashion" not slug, `page` é string, `sortBy: "popularity"`). DOM page 1 = 40 merchants, GraphQL pages 2+ = 20 merchants. **CUIDADO:** DOM retorna `urlName="/merchant/slug/"`, GraphQL retorna bare `urlName="slug"` — slugFromUrl precisa aceitar ambos. **Cap:** usar GraphQL `totalPages` (~2x do DOM porque perPage difere). Pick rate `userType=6` (Premium). Enrich opcional via `/merchant/<slug>/` `MerchantPageCashback` JSON. |
| `quidco-giftcards` | ✅ Produção (158 produtos) | Subdomínio `giftcards.quidco.com` (mesmo padrão Vue/Inertia/Tillo do TC giftcards). |
| `quidco-login`, `quidco-detail` | ✅ Helpers | Mesma estrutura do TC. Conta teste: `barbaraaymeemelo@gmail.com`. |
| **`rakuten`** | ✅ Produção (476 brands, ~100s) | Rates inline em `/f/all-brands` (504 cards), sem login. Auto-scroll convergente. Skipa 28 flat-£ Amazon-style. **100% parse rate.** |
| **`picodi`** | ✅ Produção (~600 brands, ~30min) | Discovery `/uk/retailers` → visita `/uk/<slug>`. **WAF 403 a cada 50 reqs/sessão** — solução: throttle 2.5s + `recycle browser context a cada 30 merchants` + consecutive-403 detection com 30s back-off. Parser usa proximidade `cashback ±30 chars` + mode-picker entre candidatos pra eliminar banner de outro merchant. |
| Swagbucks, Snoop, Shopmium | 🔴 Não construído. |
| UNiDAYS | 🟡 Skipped — gated atrás de student-verification login + modelo de discount-code (não cashback). Reavaliação se quisermos modelar codes como offer-type separado. |
| Avios collect-on-card | 🔴 Não construído. In-store Avios. |
| NX Rewards | 🔴 Não tem scraper. Requer login. Dados atuais vieram do `nx-sync` edge function (código com seed manual). |

### lib/upsert.js — helpers compartilhados

- `slugify(name)` — **strips apostrophes + periods** antes da regex (`"Sainsbury's"` → `"sainsburys"`, casa com seed)
- `upsertStore({name, logoUrl, ...})` — preserva fields existentes, não sobrescreve
- `upsertCashbackOffer({storeId, platform, rate, rateBreakdown?, ...})` — `rateBreakdown` opcional, `undefined` = não toca, `null` = limpa, array = substitui
- `upsertGiftCardOffer({storeId, platform, discountPct, ...})`
- `upsertPointOffer({storeId, airline, earnRate, affiliateLink, ...})`
- `sweepStaleOffers(table, keyValue, scrapeStartTime, keyColumn?)` — usa `last_verified_at < cutoff` (não lista de IDs, escala pra qualquer tamanho)

### lib/supabase.js
- **`NODE_TLS_REJECT_UNAUTHORIZED=0` ativado por padrão** — workaround pro antivirus Gen Digital (Norton/Avast) que faz MITM HTTPS e quebra verificação de cert Cloudflare. Setar `STRICT_TLS=1` pra ativar verificação. Hosts file estava destruído com milhares de linhas duplicadas `Copyright (c) 1993-2009 Microsoft Corp.` — sintoma do mesmo software.

### lib/browser.js
- `launchStealth({userAgent?})` — Playwright + stealth plugin
- `autoScroll(page, {step, delay, stableTicks})` — pra páginas com lazy load

### lib/topcashback-session.js
- `ensureLoggedIn(context, page)` — carrega sessão salva OU faz login auto com `.env`
- `isLoggedIn(page)` — verifica navegando em `/yourcashback/` (membros only — anon é redirected pra `/login/`). **NÃO usar `a[href*="/account/"]`** como sinal — aparece mesmo deslogado.
- `saveSession(context)` / `loadSession(context)` — JSON em `tmp/topcashback-session.json`
- `performLogin(page, email, password)` — preenche form com delays humanos

### lib/quidco-session.js
- Estrutura idêntica à TC. `isLoggedIn` verifica `/your-account/`. Sessão em `tmp/quidco-session.json`.
- Credenciais em `.env`: `QD_LOGIN_EMAIL`, `QD_LOGIN_PASSWORD`.

### Workflow de DNS + TLS issue (Gen Digital antivirus)
- Hosts file da Bárbara estava corrompido com milhares de linhas duplicadas `Copyright (c) 1993-2009 Microsoft Corp.`
- DNS de `crl3.digicert.com` sequestrado pelo "gen digital helper server" (Norton/Avast/AVG MITM HTTPS)
- Erro: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `CRYPT_E_NO_REVOCATION_CHECK` em conexões Supabase
- **Workaround em `lib/supabase.js`:** `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` por padrão (opt-out via `STRICT_TLS=1`). OK pra dev tool local; nunca usar em frontend.

## 6.5. Estado dos dados em produção (2026-05-18 fim do dia)

### `cashback_offers` (total ativos: 6,352)
| Platform | Active | With breakdown | Notes |
|---|---|---|---|
| quidco | 3,759 | **3,758 (99.97%)** | Full enrichment terminado, breakdown JSON via MerchantPageCashback |
| NX Rewards | 1,530 | 0 (não aplicável) | Manual flag `in_nx_network` da Bárbara |
| topcashback | 1,063 | 271 (25%) | TC enrich-only-missing rodando em bg; vai subir pra ~95%+ |

### `gift_card_offers` (total ativos: 805)
| Platform | Active | Notes |
|---|---|---|
| everup | 273 | Tailwind cards, parsed via Playwright |
| jamdoughnut | 217 | API direta, sem browser |
| quidco-giftcards | 158 | Inertia.js JSON, single page load |
| topcashback-giftcards | 131 | Inertia.js JSON, single page load |
| cheddar | 26 | Framer site, Playwright |

### `point_offers` (total ativos: 2,022)
| Airline | Count |
|---|---|
| British Airways Avios | 2,022 |

### Lojas duplicadas mergeadas hoje
- **SHEIN** + **SHEIN UK** → ficou **SHEIN** (preservou NX 10%, Avios 25pts, adicionou TC 16.8%, slug `shein`)
- **One4all Gift Card** + **One4all Gift Cards** → ficou **One4all Gift Card** (preservou NX 10% + Quidco 4%, slug `one4all-gift-card`)

### Estratégia One4all (Bárbara mencionou no chat 2026-05-18 — NÃO IMPLEMENTADA AINDA)
```
Sainsbury's:
  - Buy One4All gift card from NX Reward with 20% discount
  - Go to Curry's instore buy YouChoose gift card pay with One4All
  - Convert to Sainsbury's via YouChoose
  + Login to Avios and search Sainsbury's store
  + Pay with Sainsbury's gift card
Total Earn: 20% cashback + points credit/debit + Avios + Nectar points
```
Requer modelo de `curated_strategies` (ver Pendências). Engine atual só faz stacks single-store. O motor precisa eventualmente sugerir a MELHOR estratégia mesmo que envolva múltiplas lojas/plataformas.

## 7. Mudanças no App React (hoje)

### Hooks (`src/hooks/`)
- **`useStoreSearch(query, {limit})`** novo — ILIKE server-side. **Use isso, não `useStores()`** (esse é capado em 1000 rows pelo PostgREST). Categoria é `text[]`, ILIKE não funciona — busco só por `name`.
- `useCatalog.js` → `useStoreOffers` agora seleciona `affiliate_link` de `point_offers` também + **`rate_breakdown`** de `cashback_offers`
- `useSubscription.js` → trial days com `Math.ceil` (era floor — undercount de 1 dia)

### Lib (`src/lib/`)
- `strategies.js`:
  - `withSyntheticNxOffer(cashbackOffers, store)` exportado (extraído da computeStrategies)
  - **`NX_SYNTHETIC_ENABLED = false`** — pausado porque agora temos rows reais em `cashback_offers`
  - `pointsLayer` agora retorna `affiliateLink` (faltava — só `cashbackLayer` tinha)
  - `cashbackLayer` agora retorna `rateBreakdown`, `conditions`, `isUpTo` (auto-derived de `o.rate_breakdown` ou `o.conditions === 'Up to'` ou breakdown.length>1)
  - Cashback strategy subtitle: `"Up to X% cashback"` quando `isUpTo`, senão `"X% cashback"`
  - Strategy output top-level também expõe `rateBreakdown`, `isUpTo`, `conditions` (pra evitar drill em `layers[0]` nos UIs)
  - Display de pontos: **só pontos, sem £ equivalente** (`"500 Avios"` em vez de `"£5.00 (500 Avios)"`)
  - Stack gift_card×points: `"£5.00 + 200 Avios"` (em vez de parens)
  - Match `milesPrograms.name` × `point_offer.airline` agora é case-insensitive
- `customSupabaseClient.js` → publishable key novo formato

### Pages (`src/pages/`)
- `ComparePage.jsx`:
  - Removido toggle "Showing only my wallet" (default sempre = show all). Opt-in vive em Settings → Comparison agora.
  - Usa `useStoreSearch` em vez de `useStores`
  - **Cada route card mostra `<RateBreakdown compact />`** abaixo do row de info quando há breakdown
  - **Banner "Showing only routes from your wallet"** quando walletOnly ON (com link pra Settings)
  - **Filter chips por tipo (cashback/points/gift_card/stack)** — só renderiza se >3 routes e >1 tipo
  - **Slider min rate (0-20%)** — pula points (sem %) na filtragem
  - **Botão "Clear filters"** quando há filter aplicado
- `StoreDetailPage.jsx`:
  - Aba Cashback agora aplica `withSyntheticNxOffer` (consistência com strategies engine)
  - Cada `CashbackOfferCard` usa `<RateBreakdown />` (do offer.rate_breakdown direto) + label "Up to" quando `conditions==='Up to'`
  - Wallet filter wired via `useUserWallet()` + `useWalletOnlyPref()` + `buildWalletFilter()`
- `StrategyPage.jsx`:
  - **Highlighted route mostra `<RateBreakdown defaultOpen />`** abaixo dos botões Save/Open
  - Cada alternative route card mostra `<RateBreakdown compact />`
  - Helper `breakdownFor(strategy)` retorna breakdown de `s.rateBreakdown` ou de `s.layers.find(kind==='cashback').rateBreakdown`
  - Wallet filter wired
- `SettingsPage.jsx`:
  - **Nova seção "Comparison"** com toggle `walletOnly` (default false)
  - Seção Reading-friendly themes: botão "↺ Use standard colours" no header quando theme atual é Cream/Yellow/Peach
  - Seção Calm Mode: mesmo botão quando theme é 'calm'
  - Standard themes section já tinha "Reset to default" quando theme !== 'light'
  - Chama `notifyPrefsChanged()` após save pra atualizar Compare/Strategy/StoreDetail em tempo real

### Components (`src/components/`)
- **`RateBreakdown.jsx`** — collapsible table mostrando per-sub-category rates. Props: `breakdown`, `defaultOpen?`, `compact?`. Auto-expande quando há variância >1 row. Single-row sem variância → null (não renderiza nada).
- **`FilterChip.jsx`** — pill button compartilhado (Compare + HotDeals). Props: label, active, onClick.

### Hooks (`src/hooks/`)
- **`useUserPrefs.js`** novo — `useUserPrefs()` + `useWalletOnlyPref()` + `notifyPrefsChanged()`. Listen pra evento `snapgain:prefs-updated` pra refresh reativo.

### Lib (`src/lib/`)
- **`walletFilter.js`** novo — `buildWalletFilter({walletOnly, wallet})` retorna `{cashbackPlatformNames, milesProgramNames}` Set ou null. Null = mostra tudo (safety: se wallet vazio, mostra tudo).

### Components (`src/components/`)
- **`RateBreakdown.jsx`** novo — collapsible table mostrando per-sub-category rates. Props: `breakdown`, `defaultOpen?`, `compact?`. Auto-expande quando há variância >1 row. Single-row sem variância → null (não renderiza nada). Mostra range "X% – Y%" no header + disclaimer "Actual rate depends on which product/category you buy."

## 7.7. Session 3 (2026-05-19) — UX rewrite, dedup massivo, Avios golden rule

### Bugs críticos corrigidos
- **Revolut Ultra misinfo**: eu tinha INVENTADO £12/mo. Real é £55/mo (introductory). Bárbara corrigiu — strategy reativada com framing certo: 1 RevPoint = 1 Avios em débito, value prop pra quem não tem cartão de crédito UK. Veja seção 8.5 (regra dura).
- **Monzo + PayPoint + Amex**: eu tinha desativado achando que era misinfo. Bárbara confirmou: funciona em PayPoint de Co-op/ASDA (não-oficial mas amplamente usado). Reativada com disclaimer de risco no step.
- **Apóstrofo duplicado** nos JSONB steps (já era da sessão 2 — mantido fix).
- **ComparePage scroll bug** — scroll fire ANTES dos dados carregarem → caía na seção Browse Categories. Fix: `useEffect` + duplo `requestAnimationFrame` aguarda `offersLoading` flipar pra false.
- **Profile search só até letra B** — `useStores()` tinha `.range(0,19999)` mas PostgREST tem cap server-side de 1000. Refeito com **paginação real em loop** (chunks de 1000 até drenar).
- **Mercado page quebrada** — query usava `.eq('category','grocery')` em campo `text[]` com string errada (singular vs plural). Trocado pra `category.cs.{groceries}` + sinônimo `supermarket` + cap em Top 10.
- **Vite zumbi** — 2 processos node antigos em 5173/5174 fizeram a página ficar hung. Sempre `taskkill /F /IM node.exe` se duvida.

### Data cleanup massivo
- **1,811 store duplicates merged** — scrapers diferentes geravam slug variants (`qatar-airways` vs `qatar-airways-uk`, `bookingcom` vs `booking-com`, `mazumamobile` vs `mazuma-mobile`). Migration `merge_duplicate_stores` (em supabase migrations) usa `canonical slug` (strip suffixes + remove hifens). Pra cada grupo: pega row com mais offers como target, move offers (skipa conflitos via NOT EXISTS), merge categories, deleta source.
- **Supermarket false positives limpos** — backfill por substring tinha tagged "Asda Pet Insurance", "Tesco Bank Credit Cards", etc. como `groceries`. 31 reclassificados pra categoria certa (pets+finance, finance, telco, etc.).
- **Quidco + TC re-scrape category-only** — adicionei `QD_CATEGORY_ONLY=1` e `TC_CATEGORY_ONLY=1` env flags. Quidco mapeia 22 categorias source → nossos canonicos via `QUIDCO_CATEGORY_MAP`. TC tem 145 categorias com slugs descritivos — usa `TC_CATEGORY_RULES` regex (substring-based, 17 patterns). Rodaram. **Resultado:** 280 → **4,520 lojas categorizadas** (+1,514%).
- **Boots dedup manual** — 3 variantes (`boots-online`, `bootscom`, `boots-gift-card-cashback...`) merged em `boots` com `category=['beauty','health']` + 5 cashback + 5 gift card + 1 Avios.
- **TC One4all** — scraper original não pescou. Adicionei manualmente (verificado via topcashback.co.uk/one4all-gift-card/): **5.25% Up to**.
- **Categorias completas no Browse**: agora Compare page mostra 10 categorias com contagens REAIS — Supermarkets 79, Food & drink 314, Home & DIY 843, Fashion 1083, Beauty 619 (+health 604), Electronics 521, Travel 595, Utilities 139, Gaming 115, Sport 493.

### lib/upsert.js — agora merge categorias
`upsertStore` aceita `category` como array e faz **set union** com existente em vez de skipar. Re-runs acumulam categorias sem perder curadoria manual.

### Avios "Regra de Ouro" — NEW
`src/lib/aviosMath.js`:
- `GBP_PER_AVIOS = 0.0092`
- `gbpToAviosBooster(£)` → Avios
- `compareCashbackVsAvios({cashbackGbp, directAvios})` → `{winner, deltaAvios, note}`

Em ComparePage: `bestDirectAvios` calculado por loja (point_offers BA Avios × amount). Cada RouteBox recebe e mostra no header:
- `≈ 1,391 Avios via Avios Booster`
- `· beats eStore by 720` (verde) OU `· eStore wins (1,500 Avios direct)` (amber)

### Hot Deals fix
Removido o fallback "Top 10 cashback rates" (era misleading — rates altos genéricos não são boosters). Agora:
- **Block A**: admin-curated `hot_deals` (badge BOOSTED)
- **Block B**: TOP 10 com `is_boosted=true` (campo NOVO em `cashback_offers`, popula quando scrapers detectarem booster badges — pendente)

### ComparePage redesign completo
- **Removido**: filter chips Type + Min rate slider + Compare Cards tab + premium banner inline
- **Hero card** com input store + amount + Compare button (bg-light-pink/30 + border-primary/40 + shadow-lg)
- **Autocomplete** com `startsWith=true` (sain → Sainsbury's, NÃO All Saints)
- **Botão "Browse all"** ao lado do input → modal full-screen com 11K stores
- **TOP 5 routes**, todas collapsed por default, "Best route" no topo
- **Browse the retailers** embaixo com 10 categorias (ícones + counts + "See all" → /search?cat=)
- **OR divider** entre form e Browse quando ainda não buscou

### StrategyPage steps com Open buttons
`buildStrategySteps()` em `lib/strategies.js` agora retorna `{title, detail, actionUrl, actionLabel}`. URLs vêm de `resolveOpenUrl({rowUrl: layer.affiliateLink, platform: layer.platform, fallback: '/store/:slug'})`. StrategyPage renderiza botão Open por step (externos = nova aba, internos = navigation).

### SearchPage suporta `?cat=`
Filtra client-side via `s.category.some(c => c.toLowerCase() === initialCat)`. Banner mostra "Showing stores in category: fashion · Clear category". Título vira "Fashion stores".

### Reading themes coerentes
Cream/Yellow/Peach agora overrideam `--primary/--secondary/--accent` pra paleta harmoniosa (terracotta+sage+rose / navy+teal+coral / coral+olive+plum). Antes só Calm fazia isso.

### Profile search bug
`s.category` é `text[]` mas PillMultiSelect chamava `.toLowerCase()` direto → crash silencioso. Fix: join array em string `"beauty · health"` antes de passar.

## 7.8. Session 3.5 (2026-05-19 tarde/noite) — Compare UX polish + dedup #2 + platforms fix

### ComparePage redesign (final layout)
- **RouteBox 2-coluna**: esquerda = `#rank` + título + subtítulo; direita = badge `EASY/STACK+AVIOS` + chevron + `£ value` + Avios calc + verdict. Removeu "on £100" redundante.
- **X button no autocomplete** (clear) + botão **"Search another store"** acima dos resultados. Pode buscar lojas em sequência infinita sem F5.
- **Bootstrap-once flag** (`bootstrappedRef`) — `?store=tesco` na URL hidrata `selected` UMA vez. Sem isso, clicar X re-injetava a loja da URL.
- **`onClear` callback** do autocomplete → `handleNewSearch` no parent (limpa input + selected + URL + submitted).
- **Browse all modal**: usa `useStores()` (catálogo inteiro paginado) em vez de `useStoreSearch` que só dava featured. **Filtro `startsWith`** (não `includes`) — "sai" só mostra Sainsbury's, igual autocomplete.
- **Pagina Load more 200x200** — render inicial leve mesmo com 10K stores.

### ALL-IN-AVIOS conversion (Bárbara's golden rule extension)
Para rotas mistas (£ + Avios, ex: "everup + BA Avios" → £400 + 35,000 Avios), mostra:
```
£400.00 + 35 000 Avios
(£400.00 → 43,478 Avios via Booster)
+ 35,000 direct = 78,478 Avios total
✓ Beats the Avios eStore by 23,478 Avios
```
Conversão usa `gbpToAviosBooster(£) = £/0.0092` (Booster rate verificado). Verdict compara o total contra `bestDirectAvios` (point_offers BA × amount) → emerald/amber/sky pra winner.

Implementado em:
- `ComparePage` RouteBox (coluna direita)
- `StrategyPage` Estimated Return section

Detecção do "mixed route":
- Auto: `layers.some(l.kind === 'points')` E `layers.some(l.kind !== 'points')`
- Curated: `bonus_points > 0` E `hero_return_pct > 0`

### SearchPage refactor (drill-down de categoria)
- **Botão ← Back to Compare** no topo (ou Home se sem `?cat=`)
- **Campo `Purchase amount (£)`** carregado via `?amount=X` da Compare → cards levam a `/compare?store=X&amount=Y` (continua o fluxo)
- **Removidos 3 filter chips** (Cashback/Points/Gift Cards) — nunca foram wired
- ComparePage agora passa `&amount=X` no link "See all" das categorias

### Data cleanup massivo (parte 2)
- **1,165 duplicates merged** (migration `merge_duplicate_stores_canonical_v2`)
  - Stores: 11,282 → 10,117
  - Canonical strip de sufixos `' UK'/' Ltd'/' Limited'/' Online'/' Shop'/' Store'/' Website'/' USA'` + alnum-only
  - Target picking: `in_nx_network DESC, offer_count DESC, slug LIKE '%-%' DESC, length(slug) ASC, id ASC`
  - 279 cb_offers + 16 pt_offers + 7 gc_offers migradas (NOT EXISTS guards em (store, platform/airline))
  - 0 user data tocada (saved/favs/sims)
- **NX flag count: 1,530 → 1,363** — não é perda, é consolidação OR-merge (grupos com >1 NX colapsaram)
- **Drift pré-existente:** 19 stores têm offer NX mas `in_nx_network=false` (M&S, Holland & Barrett, Fortnum & Mason, Lenovo, etc.). NÃO foi essa migration. Bárbara decide se restaura flags.

### platforms_explained verification (regra 8.5 aplicada)
Cross-check ebook + sites oficiais (verificados 2026-05-19):

**NX Rewards (correção crítica):**
- `signup_url` `nationalexpress.com/en` ❌ → `nxrewards.com` ✅ (era o site da empresa de ônibus!)
- `payout_method` "Gift card (One4all)" ❌ → "Bank transfer (auto)" ✅
- `min_payout` £10 ❌ → £5 ✅
- `typical_rate_label` reformulado: "10% online · 2% in-store · 20% off gift cards (One4all)"
- **Mecânica do £18/mo (Bárbara confirmou em chat):** é REEMBOLSÁVEL todo mês — comprar via site NX → enviar recibo com o NOME DO TITULAR → £18 de volta. Só paga em mês sem nenhuma compra. Effectively free pra usuário ativo. Isso entra no `one_liner` ("effectively free when you shop monthly") + `pricing_tiers[Member].note`.
- Sources: nxrewards.com FAQ + ebook linha 428 + Bárbara (chat 2026-05-19)

**Revolut + Monzo:**
- Nova coluna `pricing_tiers jsonb` em `platforms_explained`
- Revolut: 4 tiers seedadas (Standard £0, Premium £7.99, Metal £14.99, Ultra £55/£540) — Plus skipado por falta de verificação
- Monzo: 4 tiers (Free, Extra £3, Perks £7, Max £17+) — refletindo refresh de 2026 (descontinuação Plus/Premium)
- Frontend `PlatformsLearnPage` renderiza tier pills com hover-tooltip do `note`
- Sources: revolut.com/our-pricing-plans + monzo.com/current-account/plans

### Bugs corrigidos pequenos
- `aviosCompare` no RouteBox skipa quando rota já tem layer points (antes mostrava "≈ X Avios via Booster" pra rota que já era Avios)

---

## 7.6. Session 2 (2026-05-18 noite) — scrapers, expansão One4all, platform explainers

### Scrapers novos
- **`scrapers/picodi.js`** — discovery em `/uk/retailers` (~639 slugs), depois visita `/uk/<slug>` com throttle 2.5s + **recycle do browser context a cada 30 merchants** (Picodi WAF rate-limita ~50 reqs/sessão com HTTP 403). Parser usa proximidade a "cashback" (≤30 chars) com bridge `[^\d%]{0,30}` pra evitar swallowing greedy de dígitos. Mode-picker entre candidatos elimina o banner do topo (que é de outro merchant). Detecta consecutive-403 e auto-recycles + 30s back-off.
- **`scrapers/rakuten.js`** — rates inline no `/f/all-brands` (504 brand cards num único scroll). Sem necessidade de visitar páginas individuais. Auto-scroll com convergência (stable_ticks=3). Skipa entries com flat-£ (Amazon style — não modelado como %). 100% parse rate.

### Resultados
| Platform | Active | Run time | Notes |
|---|---|---|---|
| topcashback | 1,160 | n/a (já existia) | Subiu pra 81.6% breakdown via enrich-only-missing |
| quidco | 3,759 | n/a | 99.97% breakdown (cobertura anterior) |
| NX Rewards | 1,530 | n/a (manual) | Bárbara mantém via `in_nx_network` flag |
| **rakuten (NEW)** | 476 | ~100s | 504 harvested, 28 flat-£ skipped, 0 failed |
| **picodi (NEW)** | ~600 (rodando bg `by87k1ph1`) | ~30min | 99.3% success com browser recycling |
| **TOTAL** | **~7,000** | | (vs 6,449 antes) |

### Tabela `platforms_explained`
- Schema: `slug`, `name`, `category`, `one_liner`, `description`, `typical_rate_label`, `difficulty`, `pros[]`, `cons[]`, `signup_url`, `homepage_url`, `brand_color`, `payout_method`, `min_payout`, `approval_window`, `tags[]`, `is_featured`, `display_order`
- RLS read-only; trigger `updated_at` auto-managed
- Seeded 13 plataformas: nx_rewards, jamdoughnut, topcashback, quidco, everup, cheddar, airtime_rewards, rakuten, picodi, avios, ribbon, revolut, monzo
- Featured (pinned no top): NX Rewards, JamDoughnut, TopCashback, Quidco, Avios, Ribbon

### Frontend
- **`/learn/platforms`** — nova página com cards por categoria (gift-card → cashback → airline → bank → rent), filter chips, "Start here" banner com featured platforms, pros/cons + payout details + sign-up CTA
- **PlaybookPage** — adicionado banner verde linkando pra `/learn/platforms` ("New to UK cashback? Read the guide")
- Hook novo `usePlatformsExplained()` em `useCatalog.js`
- Rota nova em `App.jsx`: `/learn/platforms` (não-premium)

### Curated strategies — expansão de cobertura
- `nx-one4all-basic` (trial-FREE 20%): 10 → **51 lojas** (Tesco, M&S, John Lewis, Currys, Boots, Argos, Halfords, Wickes, B&Q, Homebase, Dunelm, TK Maxx, Primark, Superdrug, Holland & Barrett, Clarks, Cineworld, ODEON, JD Sports, Sports Direct, Decathlon, Pizza Express, Pizza Hut, Nandos, Caffè Nero, Costa, Virgin Experience Days, Red Letter Days, Pets at Home, Waterstones, etc.)
- `nx-one4all-airtime-triple` (25%): 3 → **30 lojas** (subset com Airtime partners)

## 7.5. Motor de estratégias curadas (NOVO — 2026-05-18)

**Tabela:** `public.curated_strategies` (RLS read-only). Schema:
- Identity: `slug`, `title`, `description`, `hero_return_pct`, `hero_return_label`, `bonus_points`, `bonus_points_program`
- Meta: `difficulty` ('easy'|'medium'|'expert'), `category`, `tags[]`
- Targeting: `target_store_id` (loja principal), `applicable_store_ids[]` (extras), `applicable_categories[]`
- `steps jsonb` — array `[{step,title,detail,platform,platform_slug,store_slug,action_label,action_url,earn_pct,earn_points,earn_points_program,icon,is_online}]`
- Flags: `is_premium`, `is_active`, `playbook_only`, `display_order`

**17 estratégias seedadas** (slugs):
- Acionáveis por loja (10): `nx-one4all-basic` (trial-FREE), `sainsburys-max-stack`, `sainsburys-easy-stack`, `deliveroo-triple-stack`, `deliveroo-advanced-avios`, `deliveroo-easy-combo`, `uber-eats-advanced-avios`, `uber-easy-combo`, `nx-one4all-airtime-triple`, `treatwell-advanced-avios`, `treatwell-easy-stack`, `amazon-optimiser`, `double-cashback-trick`
- Lifestyle / playbook only (4): `fuel-bp-esso-avios`, `ribbon-rent-cashback`, `revolut-ultra-avios`, `monzo-paypoint-amex-avios`

**Hooks:** `useCuratedStrategies(storeId, categoryArr)` (filtra por playbook_only=false) + `useCuratedPlaybook()` (todas, pro `/playbook`).

**UI:**
- `src/components/CuratedStrategyCard.jsx` — renderer principal. Props: `strategy, defaultOpen, compact, onOpenStep, locked, onLockedClick`. Cada step tem ícone, badge de ganho (+X% ou +N Avios), bot Open/In-store. Lifestyle steps (`is_online=false`) abrem store locator do varejista.
- `StoreDetailPage`: nova aba **"★ Pro Strategies"** que vira DEFAULT quando há curated (mostra todas com a primeira expanded). Tabs viram dinâmicas via `useMemo`.
- `StrategyPage`: top curated renderiza como banner ABOVE a highlighted route (que vira "Single-platform alternative" quando há curated).
- `/playbook` — nova rota (App.jsx). Lista todas as estratégias agrupadas por categoria, com FilterChip por categoria.
- HomePage: terceiro card no row "Compare" linkando pra `/playbook` (grid agora md:grid-cols-3).

**Como expandir:**
- Mais estratégias → `INSERT INTO curated_strategies` (ver pattern em `seed_curated_strategies_part*` migrations no Supabase)
- One4all aceita 180+ lojas, listei só 10 IDs no `applicable_store_ids` da `nx-one4all-basic` (Tesco Groceries, M&S, John Lewis, Next, H&M, Currys, Boots, Domino's, Pizza Hut + Marks & Spencer). Adicionar mais conforme catalogamos.
- Lifestyle strategies (Ribbon, Revolut, Monzo, BP) vivem em `/playbook` apenas; não aparecem em StoreDetailPage porque `playbook_only=true`.

## 8. Pendências (em ordem de prioridade)

## 7.15. Session 6.0 (2026-06-02) — TopCashback fix + massive category coverage

Sessão grande focada em (1) consertar o TopCashback que quebrou no login, (2) atacar a lista de 8 pendências da Session 5, (3) levar categorização de 67% pra 94%+ via LLM-classify + scraper-side fixes.

### Sequência 1-8 (lista da Bárbara, manhã 02/06)

1. **TopCashback** — TC tinha redesenhado a página de login; selectors antigos (`#LoginEmail`, `#LoginPassword`) deixaram de existir. Novos: `#txtEmail`, `#loginPasswordInput`, `#ctl00_GeckoOneColPrimary_Login_CaptchaSubmit`. **PR #5 mergeado**. Test confirmou: 1.405 merchants escrapeados em 20 min.
2. **Backfill `other`** — keyword heuristics (5329 → 3262) + LLM-classify de 17 agentes paralelos (3262 → 608). **94.3% das lojas agora categorizadas**.
3. **`MAINTENANCE_MODE`** — Bárbara decidiu manter `true` em main até tudo estar 100%. Sem flip.
4. **Pump up / Tops do dia** — investigado. Pump funciona perfeitamente (559 boost events 7d, 221 cashback + 2 giftcard boosted). `hot_deals` admin-curado tá vazio mas não é blocker (página exibe os boosters automáticos).
5. **Stripe webhook** — infra OK (responde 400 correto sem signature), integration end-to-end pendia teste real. Bárbara confirmou Stripe Dashboard + Supabase Secrets feitos.
6. **Consolidar Supabase clients** — `lib/supabase.js` agora é fonte única; `lib/customSupabaseClient.js` re-exporta. Mesma session storage, bug do JWT não pode mais ocorrer. **PR snapgain/src merged**.
7. **DEPLOY-PRODUCAO.md** — **AVG era o culpado** (não OneDrive!). AVG flagged como `MD:HttpRequest-inf [Susp]` por ter muitas URLs HTTP no markdown. Falso positivo. Conteúdo preservado em git (`git show 955785b:DEPLOY-PRODUCAO.md`). Bárbara adicionou exceção do AVG pra pasta inteira do projeto.
8. **Avios + Quidco** — reativados em `platforms_explained`. Revolut continua off (Bárbara: "banco não muda taxa toda hora").

### Bônus achados

- **Daily cron fallback estava desalinhado**: o step "Determine scrapers" tinha fallback hardcoded com 6 plataformas (sem cheddar/everup) — quando cron rodava sem inputs, esses 2 eram silenciosamente pulados. **PR Denysmelo2/#6** alinhou os dois caminhos pra 8 plataformas.

### Scraper-side category fix (3 fases)

**Fase 1** — Gift card scrapers (PR Denysmelo2/#7):
- JamDoughnut: tagga `'gift-card'` + mapeia `_groups` (Food, Fashion, Beauty...) → nosso enum
- EverUp: tagga `'gift-card'`
- Cheddar: tagga `'gift-card'`

**Fase 2 (mesma sessão)** — Picodi + Rakuten (PR Denysmelo2/#8):
- **Picodi**: novo `harvestCategoryMap()` que itera `/uk/categories` → `/uk/category/<slug>` × ~30 pages, extrai `/uk/<store>` links. Substring normalizer mapeia slugs Picodi (cosmetics, eyewear, beverages, airline, ecommerce-platform, etc.) → nosso enum.
- **Rakuten**: itera 5 top-level paths (`/fashion`, `/health-beauty`, `/home-garden`, `/electricals`, `/department-stores`), extrai `/shop/<slug>` links, tagga union.

**Avios — deferido**: API não filtra por categoria (testado `?category=Fashion` → mesmos 241 resultados; param ignorado). Site é Next.js SPA. Precisaria Playwright + research mais profundo. Próxima sessão.

### Banco — operações da Session 6.0

- **Migration `dedupe_stores_pass2_2026_06_01`** + várias passadas de cleanup (650 dupes iniciais + 3 residuais surgindo do scraper)
- **Migration `normalize_store_categories_2026_06_01`** — consolidou variantes (food→food-and-drink, crafts→craft, supermarket→groceries, etc.) e marcou 5316 stores sem cat como `['other']`
- **Migration `backfill_categories_keyword_pass_2026_06_01`** — keyword regex sobre name+domain (1912 stores classificados)
- **Migration `backfill_categories_pass2_2026_06_02`** — segunda passada com keywords adicionais
- **7 migrations `llm_classify_chunk_*_2026_06_02`** — aplicaram resultados do workflow LLM (2654 stores classificados via 17 agentes paralelos, 534k tokens, 100% sucesso)
- **`platforms_explained.is_active`** — avios + quidco reativados; airtime/everup/monzo/nx_rewards/revolut/ribbon permanecem off no `platforms-meta-sync`

### Code fixes do React app (PRs snapgain/src)

- **#71** — Resolveu merge conflict residual em `ComparisonTool.jsx` (impedia o build de parsear!)
- **#72** — Removeu PII de console.log do AuthContext (email, payload, etc.)
- **#73** — Async fix em `EdgeFunctionsService.getRequestConfig` — `getSession()` Promise era usado sem await, Authorization header NUNCA anexava
- **chore/disable-bank-card-mocks** — stub dos handlers de "Conectar banco/cartão" (URLs mock que não existiam) → mensagem "Coming soon"
- **fix/sanitize-signup-console** — scrub PII do SignupPage
- **refactor/consolidate-supabase-client** — bug-fix tech debt (#6 acima)
- **chore/commit-deploy-doc-deletion** — DEPLOY-PRODUCAO.md (#7 acima)

### Estado final do catálogo (fim Session 6.0)

| Métrica | Início Session 6 | Fim Session 6 |
|---|---|---|
| Lojas ativas | 10.325 | **10.734** |
| Categorizadas (não-other) | 7.095 (67%) | **9.839 (94.3%)** |
| Em `other` | 3.262 | **608** |
| Scrapers que passam category | 3 de 8 (TC, Quidco, TC-giftcards) | **7 de 8** (+ JD, EverUp, Cheddar, Picodi, Rakuten) |
| Daily cron coverage | 6 plataformas | 8 plataformas |

### Pendências pra próxima sessão (superseded — veja seção 7.16)

## 7.17. Session 7.0 (2026-06-29 → 2026-07-05) — LIVE launch + GDPR + mobile refactor

Sessão MUITO grande. Site foi ao ar em snapgain.uk. Depois do launch, várias iterações de UX no mobile, unificação do fluxo de busca no dashboard + compare, e um audit legal completo. **26 PRs merged** (snapgain/src #81 até #104 e Denysmelo2/snapgain-scraper #10 e #11).

### Launch (2026-06-29)

Pre-launch punch list executado + site live:
- **PR #81** — Hardening pass 1: robots.txt, sitemap.xml, OG/Twitter tags, NotFoundPage, TOS/Privacy checkbox no signup, scrub PII do console.log, remoção do StripePayment.jsx orphan (tinha `pk_test_*` hardcoded)
- **PR #82** — Observability: Sentry + GA4 gated em CookieConsentBanner. Env vars `VITE_SENTRY_DSN`, `VITE_GA4_MEASUREMENT_ID`, `VITE_APP_ENV` (documentados no `.env.example`). Vercel dashboard tem os values.
- **PR #83** — Boost digest email pipeline: tabela `user_notification_prefs` (opt-out default true) + `boost_digest_log` + edge function `daily-boost-digest` (via Resend, dry-run mode disponível) + pg_cron schedule desativado até Bárbara configurar Resend (ver `docs/SETUP_RESEND.md`) + toggle no Settings
- **PR #84** — MAINTENANCE_MODE flipped false (site foi live)
- **PR #85** — Legal rewrite: Privacy Policy + Terms of Service reescritos completos pra UK/EU GDPR compliance (data controller = Voce Lindx Ltd, Companies House **14321565**, endereço NW10 6FH). Cookie Policy ganhou tabela por cookie + revocation flow. Refund Policy mantido (já era compliant).

### Bugs críticos descobertos + fixados no launch

- **Vercel GitHub App desinstalada** da org `snapgain` — 6 semanas sem auto-deploy. Reinstalação manual (Bárbara) + push vazio pra re-triggar webhook (PR "chore: trigger Vercel webhook"). Depois: `vercel.json` tinha `_comment_anon_key` que Vercel valida como env var inválida → removido.
- **Legacy Supabase anon JWT** disabled em produção — o valor no Vercel dashboard sobrescrevia o publishable key do `vercel.json`. Bárbara trocou pra `sb_publishable_fG0AhiV3dznAp7DcHm5jPA_jepTG5-W` no dashboard.

### Scraper: Session 6.2 in-flight work

- **Denysmelo2/snapgain-scraper#11** — Fix AVIOS_CATEGORY_PATHS scope bug no `page.$$eval` callback (browser context não tinha acesso a const Node scope, resultava em 0 categorias taggeadas em ~2 semanas de runs). Também: Picodi sweep threshold bumped 0.5 → 0.65 (Picodi legitimamente skipa ~50% de merchants com rates flat-£, defaultguard estava marcando run como falha 7 dias seguidos)

### Mobile UX refactor (2026-07-05)

Bárbara testou o site logada no celular e mandou uma sequência de fixes:

- **PR #86** — Hot Deals refactor: boosters agrupados por plataforma (era grid único misturado + round-robin por categoria). Cada plataforma tem sua seção. Countdown chip (`formatExpiryCountdown`) preparado — hidden até `valid_to` estar populado.
- **PR #87** — Hot Deals mostra `rate_breakdown` (Peacocks 6.4%/3.2%, GAME 8%/0.8%/3.2%, Hostinger 70%/20%/40%) — 115 boosters se beneficiam
- **PR #88, #89** — Landing page redirect: logged-in visita `/` → `<Navigate to="/home" replace />` (não useEffect). Footer logo aponta `/home` quando `useAuth().user` presente.
- **PR #90** — Mobile nav sai do `<BottomTabBar>` e vira sticky header. Grid `[auto_1fr_auto]` mobile / `grid-cols-3` desktop. BottomTabBar removido do Layout (arquivo permanece pra reuso futuro).
- **PR #91** — Labels sempre visíveis no header mobile (icon + label vertical). Sign in/up viram icon-only no mobile pra caber o menu marketing.
- **PR #92, #94** — Fix da nav de anchors (Travel/FAQ/etc). Handler simplificado + retry no ScrollToTopOnNav (sem fallback pra top). `scroll-mt-20` nas 4 sections.
- **PR #93, #95, #96** — Footer mobile refactor: brand block esquerda (logo h-12 + tagline em 3 linhas), 3 colunas de links à direita com `grid-cols-[auto_1fr_1fr_1fr]`. Labels legais encurtados (Privacy Policy → Privacy).
- **PR #97, #98** — Marketing nav: `Travel` removido (orphan — `<TravelAngle />` foi removido da LandingPage em 2026-05-14, mas o item do menu ficou apontando pra `#travel` que não existia mais). `Calculate` adicionado apontando pra `#calculator` (secção existente que ganhou `scroll-mt-20`).
- **PR #99** — Header text bump: mobile 10→11px (stacked tabs), 12→13px (marketing), desktop text-sm → text-base (16px).

### Dashboard unificado (2026-07-05)

- **PR #100** — HomePage ganhou seção "Start to compare" (card destacado com bg-gradient `primary/5 → secondary/5`, border-primary/20) contendo o SearchAutocomplete + 4 quick actions embaixo ("Or jump into…"). Ordem do funil: search primeiro, shortcuts depois.
- **PR #101, #102** — Amount input inline dentro do SearchAutocomplete (novo prop `onAmountChange`). Layout `flex-row` em todos os sizes: `[Store][£ Amount][Search]`. Botão Search vira icon-only no mobile.
- **PR #103** — Novo "pick mode" no SearchAutocomplete: gated em `onAmountChange` presente. Click no dropdown NÃO navega — só preenche input + move foco pro £. Submit navega. Non-pick-mode callers (SearchPage) unchanged.
- **PR #104** — `/compare` migrado pra usar SearchAutocomplete inline (mesmo componente do dashboard). Nova prop `onPick(store | null)` transfere ownership da seleção pra parent. Botão "Browse all" preservado. Vinculado a `handleCompare` da própria ComparePage.

### Estado de banco / dados atualizado

- **215 stale is_boosted flags resetados** via migration `reset_stale_boosts_2026_07_05` — BloomingBargs hub do TC expirou; scrapers redistribuem organicamente no próximo run.
- Fresh scrape run disparado via `gh workflow run scrape-daily.yml` (TC + Quidco). Task #4 "Trigger fresh scrape" ainda in_progress.

### Pendências reais (pra próxima sessão)

- **Task #3** — Scraper: detect TC hubs ativas + aplicar `valid_to` global (countdown chip ativa automaticamente)
- **Task #4** — Verificar próximo run do TC/Quidco populou `is_boosted` de volta
- **Resend setup** — Bárbara configurar (`docs/SETUP_RESEND.md`) + ativar pg_cron pro boost digest
- **Stripe end-to-end test** com transação real
- **Postgres upgrade + HaveIBeenPwned** — Bárbara confirmou feitos no Supabase dashboard mas re-verificar advisors
- **`Login "Legacy API keys disabled"`** — resolvido no launch mas monitorar

### Regras que continuam valendo

- **8.5** — Nunca seedar rates em `platforms_explained` sem source + URL + data + aprovação Bárbara
- **9** — Não tocar `stores.in_nx_network`

### Detalhes do launch

- Domain: **snapgain.uk** (Vercel project `snapgainuk`, prj_yxwqvcJcze3oFH7mVB9G66TcTvK2)
- Legal entity: **Voce Lindx Ltd** (Companies House 14321565)
- Suporte / privacy contact: `support@snapgain.uk`
- Env vars em produção: `VITE_SUPABASE_ANON_KEY=sb_publishable_fG0AhiV3dznAp7DcHm5jPA_jepTG5-W`, `VITE_APP_URL=https://snapgain.uk`, `VITE_APP_ENV=production`, `VITE_SENTRY_DSN`, `VITE_GA4_MEASUREMENT_ID`
- Sentry: `snapgain` project (Bárbara owns account)
- GA4: `G-…` id em Vercel env
- Supabase: HaveIBeenPwned password check ligado; Postgres upgraded (task #29 done)

## 7.16. Session 6.1 (2026-06-02 tarde) — Avios categories + 96.6% coverage + silent-failure guards

Continuação da Session 6.0. Sequência: Avios scraper-side category → cleanup 608 residuais → silent-failure guards.

### Avios scraper-side category (PR Denysmelo2/#9)

API não tem filtro de categoria (testado 3 nomes de param). Solução: visitar 15 páginas `/retailers/?c=<slug>#browse-all` em Playwright, harvest dos slugs visíveis, montar `Map<slug, categories[]>`. Mapping derivado do RSC stream da landing:
- `clothes-and-fashion` → fashion
- `health-and-beauty` → health + beauty (Avios junta)
- `home-and-garden` → home + garden
- `food-and-drink` → food-and-drink
- `sport-and-fitness` → sports
- `travel` → travel-and-leisure
- `entertainment-and-leisure` → entertainment
- `gifts-and-flowers` → gifts
- `children-and-family` → baby
- `toys-and-games` → toys
- `department-stores` → department-stores
- `luxury` → luxury
- `office-and-business` → office
- `electricals` → electronics
- `banking-and-insurance` → finance

Failure isolation: se `harvestCategoryMap` quebrar, scrape segue sem categoria (rates preservadas). +1-2min no daily run. **Resultado: 8 de 8 scrapers agora passam category.**

### Cleanup 608 residuais → 345 (cobertura 94.3% → 96.6%)

3 passes em ordem:
1. **Migration `backfill_categories_keyword_pass3_2026_06_02`** — tightened keyword regex aplicado a 'other'-only **E** empty-category buckets (passes anteriores só pegavam 'other'-only, deixando 287 stores empty intocados — eram brands Avios sem o fix #9). Classificou +78.
2. **Workflow LLM-classify residual** — 9 agentes paralelos, 817 stores, 100s, 279k tokens. 456 com categoria real, 361 permaneceram 'other' (genuinamente sem sinal).
3. **3 migrations `llm_classify_residual_chunk_{1,2,3}_2026_06_02`** — aplicaram chunks de 152 rows cada.

**Estado final do catálogo (fim Session 6.1):**

| Métrica | Fim Session 6.0 | Fim Session 6.1 |
|---|---|---|
| Categorizadas (não-other) | 9.839 (94.3%) | **10.373 (96.6%)** |
| Em `other` | 608 | **345** |
| Empty category | 287 | **16** |
| Scrapers que passam category | 7 de 8 | **8 de 8** ✓ |

### Silent-failure guards (PR Denysmelo2/#10)

Dois defenses independentes pro padrão "scrape silenciosamente quebra mas reporta verde":

1. **`lib/upsert.js` sweep sanity guard** — antes de marcar offers como stale, pre-counta quantos seriam desativados vs total ativo da plataforma. Aborta (throws) se ratio > `SWEEP_MAX_STALE_RATIO` (default 0.5). Plataformas pequenas (<20 active) bypassam o check (ratios noisy). Override: `SWEEP_MAX_STALE_RATIO=0.8` ou `SWEEP_FORCE=1`.
2. **`.github/workflows/scrape-daily.yml` exit code** — `|| echo "failed"` substituído por pattern que coleta failures e exits non-zero no fim. Outros scrapers continuam rodando (não cascade-block), mas CI badge fica vermelho corretamente.

Origin: session 7.15 TC regression. Com esses guards, se TC quebra de novo silenciosamente, (1) sweep não vai apagar o catálogo, (2) CI fica vermelho.

### Pendências pra próxima sessão (atualizadas)

- **Stripe end-to-end test** com transação real (Bárbara faz quando estiver pronta)
- **`MAINTENANCE_MODE` flip** quando estiver tudo verificado pra ir live
- **`hot_deals` curadoria** — Bárbara pode adicionar entries via `/admin/hot-deals` pra destacar deals especiais
- **345 stores em `other`** — residual irredutível (brand names sem hint nem domain). LLM passou e categorizou só onde tinha sinal. Vai diminuir naturalmente conforme os scrapers redescobrem com categoria.

## 7.14. Session 5.0 (2026-06-01) — Mac migration debug + pre-launch hardening

Continuação dos consertos pós-migração + sessão grande de pre-launch autônomo enquanto Bárbara estava no trabalho.

### Infra fixada (PR-by-PR)

Repo `snapgain/src`:
- **PR #68** — `.gitattributes` LF eol (parou o ruído fantasma de "235 modificados" do OneDrive sync)
- **PR #69** — Migração da chave Supabase legacy JWT (revogada há 15d) → `sb_publishable_*`. Sem isso, todo cliente browser→Supabase 401a
- **PR #70** — Remover Apple sign-in (não vamos pagar $99/yr no Apple Developer Program agora)
- **PR #71** — Resolver merge conflict residual em `ComparisonTool.jsx` (estava impedindo o build de parsear)
- **PR #72** — Scrub PII de `console.log` em AuthContext (email, payload, etc.) — DEV-only agora
- **PR #73** — Async fix em `EdgeFunctionsService.getRequestConfig` — `await getSession()` faltando, Authorization header NUNCA estava sendo anexado, todas as chamadas authed 401-avam
- **PR — chore/disable-bank-card-mocks** — Stub dos handlers de "Conectar banco/cartão" que chamavam `https://api.mockbank.com` (não existe) → mensagem "Coming soon"

Repo `Denysmelo2/snapgain-scraper`:
- **PR #1** — Bump Node 20 → 22 nos workflows. **Todos os 6 scrapers diários estavam crashando silenciosamente** com `Node.js 20 detected without native WebSocket support` desde a bump do supabase-js. O `|| echo "❌ failed"` no run-step engolia o crash e reportava "success" sem escrever nada.
- **PR #2** — Adicionar `cheddar` ao default do daily-scrape (existia em `scrapers/cheddar.js` mas não rodava)
- **PR #3** — Adicionar `everup` ao default
- **PR — fix/upsertstore-canonical-lookup** — Conserto definitivo do **root cause** das 650 lojas duplicadas: `upsertStore` buscava só por slug; agora cai pra busca por nome (case-insensitive exact) e domain antes de inserir

### Banco — operações executadas

- **Vault**: secret `service_role_key` adicionado (formato novo `sb_secret_*`)
- **Edge function `platforms-meta-sync` v3** — desativado `verify_jwt` no gateway (gateway novo não aceita `sb_secret_*` como Bearer), auth movido pra dentro do código. Funciona via cron + via "Run sync now" da UI
- **SQL function `invoke_platforms_meta_sync()`** — corrigido tipo de retorno `uuid → bigint` (pg_net mudou de retorno)
- **pg_cron `nx-sync-daily` removido** — Bárbara decidiu fazer NX manual
- **Dedup massivo 2026-06-01** — **650 grupos de lojas duplicadas** mergeados num passe único. Estratégia: canônica = linha mais antiga c/ domain; ofertas (cashback/giftcard/point/etc.) repointadas; favs e simulações migradas; duplicatas marcadas `is_active=false` (não deletadas, p/ preservar `in_nx_network` per Rule 9). Migration: `dedupe_duplicate_stores_2026_06_01` + `_pass2_2026_06_01`
- **Categorias normalizadas** — Consolidação de variantes (`food`→`food-and-drink`, `crafts`→`craft`, `supermarket`→`groceries`, etc.). 5329 stores sem categoria foram marcadas `['other']` p/ pelo menos aparecerem em alguma busca. Migration: `normalize_store_categories_2026_06_01`
- **Pending changes da Session 4.0 rejeitados em massa** (13 rows) — todos eram ruído de extração do scraper homepage-only

### Plataformas que rodam diário (decisão da Bárbara 2026-06-01)

Só 8: **TopCashback, Quidco, Avios, Picodi, Cheddar, Rakuten, JamDoughnut, EverUp**. As outras (Airtime, Monzo, NX Rewards, Revolut, Ribbon) ficaram com `is_active = false` na `platforms_explained` — taxa atual fica como última versão até alteração manual. Bárbara faz NX manualmente quando muda algo.

### Pendências que ficaram (pra próxima)

- **5329 lojas em categoria `other`** — backfill com heuristics de domain ou LLM-classify
- **Backfill homepage_url** das plataformas inativas se decidir reativá-las (`avios`, `quidco`, `revolut` falhavam por Cloudflare)
- **Investigar "pump up e tops do dia"** — Bárbara mencionou; verificar tabelas + queries
- **Stripe webhook + flow de subscription** — não testado nesta sessão
- **`MAINTENANCE_MODE` flag** — atual em `true` em main; precisa flipar pra `false` qd subir live (não commitar como false!)
- **Tech debt: dois clientes Supabase** (`lib/supabase` vs `lib/customSupabaseClient`) — consolidar pra evitar bug idêntico ao da Session 4

## 7.13. Session 4.0 (2026-05-23) — Platform rate audit + auto-detection + admin UI + access fix

Bárbara voltou pra atualizar todas as plataformas no app + automatizar. Também subiu a infra de revisão de rates, fixou acesso da própria conta, e começou migração Windows → MacBook.

### Rate audit (13 platforms in `platforms_explained`)
WebFetch nos 13 sites oficiais (2026-05-23). Aprovado por Bárbara:
- **NX Rewards** → One4all reduzido `20% → 6%` (confirmado direto por ela)
- **Rakuten** → `1-15%` → `1-60% (£1 flat on Amazon · TEMU up to 60%)`
- **Ribbon** → `1.0-1.5%` → `1% on any UK rent · 3% on partner properties (coming soon)`
- **Cheddar** → enriquecido com breakdown por categoria
- **Quidco** → notes documentam Premium = £1/mês só nos meses que compra
- **5 não verificadas** (Avios eStore, Revolut, EverUp, Airtime per-brand, JD per-brand) → `source = needs-manual-review-2026-05-23` — bloqueadas por Cloudflare/SPA
- Migration: `platforms_explained_verification_2026_05_23`

### Auto-detection stack
- **Tabela `platforms_meta_changes`** (queue) — id, platform_slug, field_name, current_value, detected_value, source_url, fetched_at, status (pending/approved/rejected/superseded), reviewed_by, reviewer_note, diff_score, raw_extract. RLS admin-only. Unique partial index em pending por (slug, field).
- **Edge function `platforms-meta-sync` v2** (ATIVA) — loop nos 13 sites, regex extract (%, Avios/£, £/mo), filtro de ruído (cookies/copyright/anos), diff_score heurístico, enfileira se ≥0.34. Skip lógica: 3+ failures consecutivas → dorme. UA rotation entre 3 user agents. Jitter 400-1200ms entre fetches.
- **pg_cron `platforms-meta-sync-daily`** — todo dia 04:00 UTC. Função `public.invoke_platforms_meta_sync()` lê service_role key do `vault.secrets` (Bárbara precisa rodar 1× INSERT pra popular o vault, ver setup pendente abaixo).
- **Coluna `platforms_explained.fetch_failures_in_a_row`** + `last_fetch_at` + `last_fetch_status` pra log.
- **`/admin/platform-changes`** (`AdminPlatformChangesPage.jsx`) — filter (pending/approved/rejected/superseded/all), botão "Run sync now", botão Approve & apply (escreve em platforms_explained + marca queue approved), Reject com note. Raw extract collapsable, source URL clicável, diff_score visível.
- Rule 8.5 respeitada: edge function **nunca** auto-aplica em platforms_explained — só enfileira.

### Access fix — Bárbara não conseguia usar o app
- **Bug 1 — dados malformados**: `user_profiles` dela tinha `subscription_status='true'` (literal string), `stripe_subscription_id='si_UZPz5gYfvXbczt'` (prefix wrong — Stripe usa `sub_`), `plan=NULL`, `stripe_customer_id=NULL`. Set manualmente em algum momento, não pelo webhook.
- **Bug 2 — ProtectedRoute ignorava admin role**: gates `requirePremium` e `requirePremiumStrict` não tinham bypass pra admins.
- **Fix código** (`src/components/auth/ProtectedRoute.jsx`): adicionado `const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin'`. Ambos gates agora têm `&& !isAdmin`.
- **Fix dados**: `UPDATE user_profiles SET subscription_status='active', plan='yearly', stripe_subscription_id=NULL, trial_end=NULL WHERE email='babiferreir@gmail.com'`. `stripe_subscription_id` ficou NULL pra webhook real popular quando ela completar checkout legit (ela paga com cupom 100% off de qualquer jeito).

### Role sync trigger
- **`sync_role_on_auth_update` + `sync_role_on_auth_insert`** triggers em `auth.users` propagam `raw_user_meta_data.role` → `public.user_profiles.role`. Resolve o desencontro entre 2 sources of truth (JWT vs RLS table).
- Migration: `sync_user_role_metadata_to_profile`. Função `sync_user_role_to_profile()` SECURITY DEFINER.

### MacBook migration
- Bárbara mudando de Windows → MacBook (Claude já instalado no Mac novo).
- **`src-1/SETUP_MACBOOK.md`** criado — guia self-contained com 11 passos: OneDrive sync, brew install node/git/gh, gh auth login, npm install, npm run dev, verify checklist, common issues table, "give Claude this context on fresh Mac" snippet.
- OneDrive sync recomendado excluir `**/node_modules` pra evitar thrash.

### Pendente — Bárbara precisa
1. **Vault setup (uma vez)** pra cron platforms-meta-sync funcionar autônomo:
   ```sql
   INSERT INTO vault.secrets (name, secret)
   VALUES ('service_role_key', '<paste service_role_key>');
   ```
   Sem isso, cron domingo falha mas botão "Run sync now" na UI funciona (usa JWT do admin).
2. **MacBook setup** — seguir `SETUP_MACBOOK.md` no novo Mac.
3. **Snapgainuk Vercel** ainda pausado (de §7.12 — não resolvido).
4. **Verificações manuais** das 5 plataformas que regex bloqueado: Avios eStore, Revolut, EverUp, Airtime per-brand, JD per-brand. Quando ela logar em cada, me passa os valores ou print.

### Arquivos novos/alterados (não commitados ainda)
- `src/pages/AdminPlatformChangesPage.jsx` (NOVO, ~290 linhas)
- `src/components/auth/ProtectedRoute.jsx` (admin bypass)
- `src/App.jsx` (route + import) + `MAINTENANCE_MODE = false` local (NÃO commitar)
- `SETUP_MACBOOK.md` (NOVO, raiz de src-1/)
- Supabase: 5 migrations aplicadas (platforms_explained_verification_2026_05_23, create_platforms_meta_changes_queue_v2, schedule_platforms_meta_sync_weekly, platforms_meta_sync_daily, sync_user_role_metadata_to_profile) + 1 edge function deploy (platforms-meta-sync v2)

---

## 7.12. Session 3.9 (2026-05-21 madrugada) — Ship + marketing infra

Bárbara liberou modo autônomo: "vamos colocar pra rodar". Tudo deployado, marketing folder completa, lead capture vivo.

### Deploys
- **snapgain-shop** ✅ deployado (foi necessário fixar vercel.json: removido `installCommand="npm install --strict-ssl=false"` que quebrava CI). Deploy `dpl_3jnyTqJPnHynrVVfCoeyyV5DAoPT` READY.
- **snapgainuk (main app)** ⚠️ push feito (commit `acc14a0`) mas **Vercel project está PAUSADO** (`live: false`). Bárbara precisa re-enable no Vercel dashboard pra deploy disparar. Quando re-enable, vai pegar TODO o trabalho das sessões 3-3.8.
- Convention: `MAINTENANCE_MODE = true` ficou commitado (regra da Bárbara). Pra ir live, flip pra `false` em commit separado depois do re-enable.

### Lead capture funnel
- Nova tabela `email_signups` (RLS public-insert via anon, service-only read)
- View `email_capture_funnel_v` pra dashboard
- snapgain.shop CalculatorLandingPage agora tem **form inline pós-calc** que captura email + UTMs + metadata (calc result) direto pro Supabase
- Success state mostra CTA pro trial com UTM `utm_content=post-calc-capture`

### Marketing folder completa
`C:\Users\babif\OneDrive\SnapGain\Marketing\`:
- `_shared/STRATEGY.md` — north star + audiência
- `_shared/AUTOMATION_RESEARCH.md` — Buffer vs Later vs IG/TikTok APIs
- `_shared/AI_INFLUENCER_SETUP.md` — guia completo da persona IA (HeyGen + ElevenLabs + brand rules)
- `_shared/LEAD_MAGNET_CALCULATOR_PRO_PACK.md` — 10-page PDF content pronto pra Canva
- `Instagram/` — CAPTIONS (30 bilingual posts) + REELS_SCRIPTS (12 Reels) + HASHTAG_KIT
- `TikTok/` — SCRIPTS (20 TikToks) + HOOKS_LIBRARY (35+ tested templates)
- `Email/` — DRIP_30_DAYS (15 emails: welcome → drip → trial → conversion → re-engagement)

### Pending — Bárbara precisa
1. **Re-enable snapgainuk no Vercel** (vercel.com/denys-projects-58b82b39/snapgainuk/settings)
2. Quando deploy passar, flip MAINTENANCE_MODE=false + push pra ir live
3. Influencer IA quando estiver pronta — seguir guia em `_shared/AI_INFLUENCER_SETUP.md`
4. Lead magnet PDF — design no Canva (~3h) usando content em `_shared/LEAD_MAGNET_CALCULATOR_PRO_PACK.md`
5. Adicionar 6 secrets no GH Actions Settings (lista em `snapgain-scraper/.github/SETUP.md`)

---

## 7.11. Session 3.8 (2026-05-20 tarde) — automation + booster alerts

### GitHub Actions cron criado
`snapgain-scraper/.github/workflows/`:
- `scrape-daily.yml` — 04:00 UTC nightly, runs TC → JD → Quidco → Picodi → Rakuten → Avios (~60min total)
- `enrich-weekly.yml` — Sundays 02:00 UTC, TC rate_breakdown enrichment (~3h, only-missing mode)
- Sessions cached em GH Actions cache pra evitar re-login (Cloudflare hates fresh sessions)
- Setup docs em `snapgain-scraper/.github/SETUP.md` (lista de secrets, troubleshooting)
- Bárbara precisa: push do repo + adicionar 6 secrets no GitHub

### Booster change tracking
- Nova tabela `booster_events` (id, store_id, platform, offer_table, event, old_rate, new_rate, detected_at)
- Triggers em `cashback_offers` + `gift_card_offers` capturam: `entered_boost`, `left_boost`, `rate_up`, `rate_down`
- Migration `create_booster_events_tracking` aplicada
- RLS read-only pra clientes
- Frontend: HotDealsPage agora tem section "Recently boosted (X)" com `RecentBoostCard` mostrando ↑ delta + tempo desde activação

### Hot Deals "Show only in wallet" toggle
- `useUserPrefs.useWalletOnlyPref()` ganhou `setWalletOnly(value)` setter
- HotDealsPage tem checkbox no filtros card — flipa toggle, persiste em `user_preferences`
- Filtra Block B (Top 12 boosters) + Recently boosted via `walletFilter`
- Warning visual se wallet está vazio + link pra `/wallet`

### Vercel configs prontos
- `src-1/vercel.json`: ANON KEY atualizada (era legacy disabled, agora `sb_publishable_*`)
- `snapgain-shop/vercel.json`: install com `--strict-ssl=false`, redirects 301 das rotas antigas pra `snapgain.uk`, sem env Supabase (shop é marketing-only)

### Antivirus docs
`OneDrive/SnapGain/ANTIVIRUS_FIX.md` com 3 opções (desabilitar HTTPS scan / exceções por domínio / NODE_TLS_REJECT bypass) + cleanup do hosts file corrompido.

---

## 7.10. Session 3.7 (2026-05-20 manhã) — integration + Airtime seed

### Calculator integrated into main app
Bárbara decidiu: snapgain.shop só shipava calculator, e calculator vira parte do Premium subscription. Mais simples, mais ROI por cliente. Trabalho feito:

- Novo folder `src/components/calculators/` com 4 micro-tools (adaptados do snapgain-shop):
  - `CashbackVsAviosCalculator.jsx` — usa `gbpToAviosBooster` (não duplica constante)
  - `NectarVsAviosCalculator.jsx` — earning side comparison
  - `NectarToAviosConverter.jsx` — slider de "value per Avios" (£0.005-0.03), break-even em £0.008
  - `RevolutVsAviosCalculator.jsx` — Plus/Premium/Metal/Ultra divisors verificados 2026-05-19
- `CalculatorPage` (`/calculator`) agora tem:
  - Spend Estimator (existente, sliders rent/groceries/wallet) +
  - "🧰 Quick decision tools" section com 4 micro-calcs em grid 2×2
- Tudo usa tokens do main app (`--primary`, `--secondary`) — sem cor `snapgain-*` hardcoded

### snapgain.shop → marketing landing (Bárbara decidiu)
Domain pago até 09/09/2026, vira landing de capture/lead pro snapgain.uk Premium. Trabalho pendente (não feito nesta sessão).

### Outros scrapers — análise de viabilidade
Bárbara pediu "faça todos os scrapers". Investigação 2026-05-20 das opções restantes:
- **Snoop** — defer. App-first, bank-linked, ofertas personalizadas por usuário. Sem catalog público. Static seed teria rates inventados (qualidade ruim).
- **Shopmium** — skip. Cashback é product-level (£1 off Monster Energy can) não store-level. Schema atual de `cashback_offers` não fit.
- **Swagbucks** — skip. Rates 1-5% (Nike 2%, Boots 2%, Argos 1%) — TC/Quidco já mostram 10-15% pras mesmas lojas. Lower-quality, no incremental.
- **UNiDAYS** — skip. Discount codes (não cashback %), auth student-verified only. Modelo de dados não bate.
- **Avios collect-on-card (in-store)** — skip. Já coberto pelo `point_offers` table (scraper Avios.com já rodou, 2,022 offers).

Decisão registrada: não vale o esforço de scraping vs valor incremental. Lista de pendências oficialmente "scrapers all done".

### Airtime Rewards — seed manual (scraping inviável)
- Investigação: Airtime é **app-only**, sem catalog público, sem web login. API B2B existe mas só pra retailers. Per-user personalization.
- **Decisão:** seed estático de ~42 brands a rate típico do ebook (4% baseline, 5-6% pra Boots/coffee/food, 3% luxury).
- Migration `seed_airtime_partners_static` aplicada (idempotente — só insere se não existir).
- `conditions = 'Typical (Airtime app-only — shown rate varies per user)'` deixa claro pro usuário que é estimativa.
- `affiliateLinks.js` ganhou key `airtime` (canonical) + corrigiu NX URL `nationalexpress.com` → `nxrewards.com`.

### Stripe duplicate cleanup já feita ontem
Confirmado: `(Copy)` ebook £0.30 ainda arquivado ✅.

---

## 7.9. Session 3.6 (2026-05-19 madrugada) — autonomous work

Bárbara disse "faça tudo, vou dormir, 100% permissão". Trabalho noturno:

### Stripe
- Arquivado o `(Copy) The Complete Guide` (`prod_Tcbv2STfM0USCZ`) — era teste/duplicata £0.30
- Produtos ativos confirmados: SnapGain Yearly £120, SnapGain Monthly £14.99, Premium Calculator Tool £5.97, Complete Guide £49.97
- 0 subscriptions ativos (esperado, MAINTENANCE_MODE=true)

### snapgain-shop (calculator + ebook reader)
- Repo descoberto: `github.com/snapgain/snapgain-shop` (clonado em `C:\Users\babif\OneDrive\snapgain-shop`)
- npm install precisou `--strict-ssl=false` (Gen Digital MITM, mesmo bug do scraper)
- `.env` criado apontando pro mesmo Supabase project
- Dev server rodando em `http://localhost:3000`
- **Health check completo** via Playwright/Claude Preview — relatório em `C:\Users\babif\OneDrive\snapgain-shop\HEALTH_CHECK_2026_05_19.md`
- Achados:
  - Públicas OK: `/`, `/landing`, `/login`, `/about`, `/terms`, `/refund`
  - Protected OK (redirect to login): `/library`, `/reader/...`, `/account`, `/calculator`
  - **7 páginas órfãs** (existem mas sem Route no App.jsx): PricingPage (signup form!), PaymentPage, SuccessPage, HomePage, WalletPage, AviosComparatorPage (duplicata de CalculatorPage), One4allPage
  - Console: `No routes matched "/pricing"` — bug refletindo a órfã
- **Bárbara decidiu shop ship só Calculator** (ebook descopado). Mudanças aplicadas:
  - Novo arquivo `src/pages/CalculatorLandingPage.jsx` (£5.97 productSlug=`premium-calculator`)
  - `App.jsx` rotas reescritas: `/` → CalculatorLandingPage, rotas ebook (library/reader/ebook/admin/landing) comentadas (não deletadas — preservadas pra futuro toggle)
  - `EbookLoginPage` redireciona pra `/calculator` em vez de `/library`, subtitle agora "Sign in to access your Premium Calculator"
  - `Header.jsx`: links/logo apontam pra `/calculator`, label "Library" virou "Calculator"
  - `.gitignore` criado (não existia — protege .env, node_modules, .claude/)

### TC hub-scraping — RESOLVIDO ✅
Saga + resolução final:
- Selectors `a.nav-bar-premium-tenancy` + `.nav-bar-standard-tenancy__logo` corretos
- **Bug raiz: Cloudflare bot challenge.** Quando o scraper navegava ao hub APÓS /offers/ + 145 categorias, a página vinha como `title="Human Verification"` (0 tiles).
- **Fix:** mover hub-visit pra **antes** de /offers/ — sessão fresca pós-login, sem histórico de navegação acumulado pra Cloudflare flaggar.
- Recipe final: `domcontentloaded` + `waitForTimeout(8000)`, run order: login → hubs → /offers/ → categories → upsert
- Resultado: `60 tile hrefs (premium=12 logos=48 title="Blooming Deals Hub")` ✅
- `TC_BOOST_HUBS` env override permite adicionar Black Friday/Christmas/etc no futuro

**Stripe verificações verificadas via web (regra 8.5):**
- nxrewards.com/frequently-asked-questions (NX é Webloyalty, £18/mo + 30-day trial, min £5)
- revolut.com/our-pricing-plans (Plus £3.99, Premium £7.99, Metal £14.99, Ultra £55/mo)
- monzo.com/current-account/plans (Free, Extra £3, Perks £7, Max £17+)
- quidco.com/premium (£1/active-month, novo modelo 2026)
- topcashback.co.uk/classic-or-plus (£5/year)

### Sessão 3.5 — final runs (boosters em produção)
| Plataforma | Active | **Boosted** | Notes |
|---|---|---|---|
| Quidco | 3,748 | **254** | `bestRates.isIncreased` (mais limpo) |
| TopCashback | 1,477 | **187** | Text-regex via `detectBoost(el, text)` |
| JamDoughnut | 216 | **4** | "Pumped Up" category membership |
| Picodi | 309 | 0 | Coupon site, sem boost mechanic |
| NX Rewards | 1,382 | 0 | Flat 10%, sem boost |
| **TOTAL** | **7,608** | **445** | Hot Deals Block B populado |

### Pendência menor (próxima sessão)
- **TC `/hubs/bloomingbargs/`** — Bárbara apontou esse hub como a verdadeira fonte das boostadas TC (Iceland 17%, Toner Giant 40%, Aliexpress 20%, etc.). Código pra scrapear hubs adicionado em `topcashback.js` linhas ~315-340, mas retornou 0 tiles — o markup do hub é diferente de `li.gecko-offertext` / `a.category-panel`. Próxima sessão: inspecionar HTML rendered com DevTools, achar selector certo, ajustar `extractTilesFromPage` ou criar função dedicada. Quando consertar, TC vai dobrar pra ~350 boosters. Env override: `TC_BOOST_HUBS=a,b,c`.

### Pendências sessão 3.5 → 4 (próxima)
1. ✅ ~~Booster flag em TC + Quidco + JD scrapers~~ — código + runs sessão 3.5:
   - `lib/upsert.js` ambos `upsertCashbackOffer` e `upsertGiftCardOffer` aceitam `isBoosted`
   - `scrapers/quidco.js` extrai `bestRates.isIncreased` direto do JSON GraphQL
   - `scrapers/topcashback.js` detecção via `detectBoost(el, text)` — texto "Boosted/Boost/Increased/Higher Cashback" + class containing "boost/increase" + emoji "↑🔥"
   - `scrapers/jamdoughnut.js` detecta brand membership em grupo "Pumped Up"/Pumped/Featured/Hot/🚀/🔥 (regex `/pump|boost|featured|hot/i`)
   - Coluna nova `gift_card_offers.is_boosted boolean default false` + index parcial
   - **Runs executados sessão 3.5:**
     - Quidco full ✅ (3,749 merchants, popular `is_boosted` via isIncreased)
     - JD ✅ (4 pumped: Laithwaite's Wine 10%, Kids Pass 10%, Clarks 5%, The Entertainer 3%)
     - TC full (rodando em bg, ~3h)
     - Picodi full re-scrape (rodando em bg, ~25min)
   - **Hot Deals Block B** agora renderiza ambos cashback + gift card boosts merged por store (highest rate wins), com label "cashback" vs "off gift card"
2. ✅ ~~Visual review da ComparePage~~ — feito sessão 3.5
3. ✅ ~~Verificar `/learn/platforms`~~ — feito sessão 3.5
4. ✅ ~~Re-rodar Picodi~~ — rodando sessão 3.5
5. ✅ ~~19 stores sem flag NX~~ — RESTAURADAS sessão 3.5 (offer = source of truth, todas têm rate=10% canonical). 1,363 → 1,382 flagged.
6. **214 TC offers sem rate_breakdown** — análise: 160 são flat-rate (esperado, OK), 54 são "Up to" multi-cat onde parser falhou (real bug, baixa prio).
7. ✅ ~~Outras plataformas pricing_tiers~~ — feito sessão 3.5

### Outras prioridades

1. **TC enrich-only-missing** — rodando em background quando compact aconteceu. Subir TC de 25% → ~99% breakdown coverage.
2. **Construir outras plataformas:**
   - **Rakuten** (~480, login provável — Cloudflare)
   - **Picodi** (~300, sem login, easy)
   - **UNiDAYS** (~900, sem login, easy)
   - **Snoop, Airtime Rewards, Shopmium** — investigar
   - **Swagbucks** (~320)
   - **Avios collect-on-card** (in-store via Avios)
3. **GitHub setup** — Denys cria repo `snapgain-scraper`, secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TC_LOGIN_EMAIL`/`TC_LOGIN_PASSWORD`, `QD_LOGIN_EMAIL`/`QD_LOGIN_PASSWORD`. Ativar cron diário em `.github/workflows/scrape.yml`. **Sessões TC+QD do CI vão precisar re-login periódico (~30 dias)** — talvez automatizar via `performLogin` (já implementado para TC).
4. **Hot Deals + Compare filters** — Compare ganhou type chip + min-rate slider (2026-05-18). Pode adicionar "Show only in-wallet" no Hot Deals.
5. **Investigar Gen Digital antivirus** — quebrando HTTPS no PC da Bárbara. Desabilitar HTTPS scanning OU adicionar exceções pra `*.supabase.co` / `*.cloudflare.com`. Hosts file precisa ser limpo das milhares de linhas duplicadas. Por enquanto `NODE_TLS_REJECT_UNAUTHORIZED=0` no scraper.
6. **2FA, MAINTENANCE_MODE=false em prod, etc.** — finalização

## 8.5. ⚠️ REGRA DURA — CONTEÚDO FINANCEIRO

**Antes de seedar QUALQUER strategy ou platform description** com valores numéricos (preço de plano, % cashback, Avios per £, taxas, mensalidades, etc.), OBRIGATÓRIO:

1. **Ler o EBOOK COMPLETO PRIMEIRO** (`tmp/ebook.txt` — está extraído). A Bárbara escreveu o ebook em 2025 com info verificada por ela mesma. Não presumir, não inventar — citar o que o ebook diz.
2. **Cross-check no SITE OFICIAL** da plataforma quando for pricing exato (ex: Revolut tem 5 tiers, é fácil confundir Metal £14.99 com Ultra £55).
3. **Citar URL + data** da verificação na mensagem pra Bárbara.
4. **Pedir aprovação explícita** antes do INSERT/UPDATE.
5. **NÃO presumir que algo "não funciona mais"** sem checar com a Bárbara — o ebook é de 2025 e mecânicas pouco-documentadas (ex: PayPoint Amex em supermarket terminals) podem funcionar na prática mesmo sem suporte oficial.

### Casos passados — lições caras
- **Revolut Ultra**: inventei £12/mo (chute meu, NÃO estava no ebook). Real é £55/mo (introductory). Strategy corrigida com value prop real (1 RevPoint = 1 Avios em débito, ideal pra quem não tem cartão de crédito UK).
- **Monzo + PayPoint + Amex**: desativei achando que oficialmente não funcionava. Errado — Bárbara confirmou que funciona em PayPoint de **Co-op e ASDA** na prática. Strategy reativada com disclaimer de risco.
- **Apóstrofo duplo** nos JSONB steps por escape errado de SQL string literals dentro de `$json$...$json$`.

### Como agir quando suspeitar de misinfo
1. NUNCA desativar uma strategy sem antes:
   - Confirmar que NÃO está no ebook
   - OU confirmar com Bárbara que a mecânica não funciona mais
2. Se mesmo assim desativar: marcar `is_active=false`, adicionar `[INACTIVE — <razão verificada>]` em description, notificar a Bárbara imediatamente, e auditar strategies relacionadas.

### Onde está o ebook
`C:\Users\babif\snapgain-scraper\tmp\ebook.txt` — extraído do PDF via `pdftotext -layout`. 2154 linhas. Texto fragmentado em alguns lugares (OCR layout-aware) mas pesquisável via grep.

## 9. Regras invioláveis (não quebrar)

- **Não tocar `stores.in_nx_network`** — flag manual de Bárbara (1.530 lojas)
- **Não invocar `nx-sync` Edge Function** sem permissão — reseta in_nx_network e perde flags
- **Não reabilitar `NX_SYNTHETIC_ENABLED` em strategies.js** — agora temos rows reais
- **`Avios` em `point_offers.airline` DEVE ser `'British Airways Avios'`** (case + spaces) — bate com `miles_programs.name` pra conversão funcionar
- **Slugify SEMPRE strip apóstrofo** — senão cria duplicata sainsbury-s vs sainsburys
- **Categoria em `stores` é `text[]`** — não dá pra ILIKE; só usar em filtros futuros via `ANY()` operator
- **Não fazer DELETE em massa** sem fazer SELECT preview antes
- **Não regenerar `service_role` key** sem atualizar `.env` do scraper E manter quem tem acesso ciente
- **Não scrapear TopCashback ANÔNIMO** — rates anônimos inflados ~25% vs logados. Sempre `ensureLoggedIn`. Conta principal da Bárbara está com Denys, scraper usa `barbaraaymeemelo@gmail.com` (descartável).
- **Não scrapear Quidco ANÔNIMO** — mesmo problema (Premium tier reais vs Basic). Sempre logado.
- **`?page=N` no Quidco é NO-OP** — usar GraphQL POST `loadMoreMerchants`. URL query string ignorada.
- **DOM totalPages != GraphQL totalPages** no Quidco — usar GraphQL (DOM diz 27 pra Fashion, real são 53 porque perPage difere)
- **`urlName` do Quidco vem em DOIS formatos:** `/merchant/slug/` (DOM page 1) vs `slug` (GraphQL pages 2+). `slugFromUrl` precisa aceitar ambos.
- **Não commitar `tmp/`** — tem cookies de sessão TC + Quidco + dumps de discovery. Já está no `.gitignore`.
- **TC pager timing crítico:** `waitForTimeout(1500)` após nav. 1000ms é insuficiente sob carga sequencial; vai detectar `totalPages=1` falso pra maioria das categorias.

## 10. Outras anotações úteis

- **Math do trial:** `signup + 7 dias = trial_end`. `days_left = ceil((trial_end - now) / 1 day)`. Denys signed up 17/05 15:47 → trial até 24/05 15:47.
- **Slug de Tesco supermercado** = `tescogrocerie` (mashed). Slug `tesco` é Tesco Travel Insurance (legado).
- **affiliateLinks.js** tem ~25 links da Bárbara (TopCashback, Quidco, Avios mention-me, Curve, Revolut, etc.)
- **Pages novas** `/deals/supermarket` (Highest Supermarket) e `/deals/gift-cards` (Top Gift Cards) — dão fetch direto Supabase
- **HomePage Quick Actions:** Hot Deals, Highest Supermarket, Top Gift Cards, Calculator + Compare Banks/Cards section

## 11. Como continuar

### ⭐ Próxima sessão (Bárbara vai compactar e anexar ebook)

Primeira mensagem da Bárbara provavelmente:
> leia HANDOFF.md, depois leia o ebook anexo completo (~10 estratégias multi-step), e vamos construir o motor de estratégias curadas + cada step com link de ação direto

**O que fazer:**
1. **Ler HANDOFF inteiro primeiro** (contexto de dados, schema, scrapers, bugs conhecidos)
2. **Ler o ebook 100%** — cada estratégia é provavelmente composta de 3-7 passos cross-store. Identificar:
   - Lojas alvo (onde usuário quer comprar)
   - Lojas intermediárias (Currys, etc.)
   - Plataformas envolvidas (NX, TC, Quidco, Avios, YouChoose, One4all, Love2Shop, Nectar, card rewards)
   - Return estimado (% sobre purchase)
   - Difficulty (easy/medium/expert)
3. **Propor schema** de `curated_strategies` table com steps JSONB:
   ```json
   {
     "store_id": "<sainsburys_id>",
     "title": "20%+ via One4all + YouChoose chain",
     "estimated_return_pct": 20,
     "difficulty": "medium",
     "steps": [
       {"step":1, "title":"Buy One4all on NX", "detail":"...", "platform":"NX Rewards", "action_url":"<nx-affiliate>"},
       {"step":2, "title":"Go to Currys instore", "detail":"Buy YouChoose gift card, pay with One4all", "action_url":null},
       {"step":3, "title":"Convert YouChoose → Sainsbury's gift", "platform":"YouChoose", "action_url":"<youchoose-link>"},
       {"step":4, "title":"Login to Avios partner portal", "platform":"Avios", "action_url":"<avios-sainsbury-link>"},
       {"step":5, "title":"Pay with Sainsbury's gift card", "detail":"Earn Nectar points + card rewards", "action_url":null}
     ]
   }
   ```
4. **Implementar:**
   - Migration: criar `curated_strategies` table
   - Engine: prioritize curated > auto-generated
   - Frontend: nova aba "Pro Strategies" na StoreDetailPage com step-by-step + action button por step
   - Seed: inserir as 10 estratégias do ebook (provavelmente via SQL ou UI admin)

### Comandos úteis dos scrapers

```powershell
cd C:\Users\babif\snapgain-scraper

# ━━━ TC ━━━
$env:HEADED="1"; node index.js topcashback-login            # login one-time
# (em outro shell: ni tmp/LOGIN_READY pra sinalizar)
node index.js topcashback                                    # full ~3h
$env:TC_SKIP_CATEGORIES="1"; node index.js topcashback       # só /offers/ ~30s
$env:TC_ENRICH="1"; $env:TC_ENRICH_ONLY_MISSING="1"; node index.js topcashback  # enrich faltantes
$env:TC_DETAIL_SLUG="hostinger"; node index.js topcashback-detail  # parser test
node index.js tc-giftcards                                   # giftcards (~30s)

# ━━━ Quidco ━━━
$env:HEADED="1"; node index.js quidco-login                  # login one-time
# (em outro shell: ni tmp/QD_LOGIN_READY)
node index.js quidco                                         # full ~10min listing
$env:QD_ENRICH="1"; $env:QD_ENRICH_ONLY_MISSING="1"; node index.js quidco  # enrich ~2-3h
$env:QD_ONLY_CATEGORY="fashion"; node index.js quidco        # 1 cat só
$env:QD_DETAIL_SLUG="deliveroo"; node index.js quidco-detail  # parser test
node index.js quidco-giftcards                               # giftcards (~30s)

# ━━━ Outros (já existiam) ━━━
node index.js jamdoughnut    # 217 giftcards
node index.js everup         # 273 giftcards
node index.js cheddar        # 26 giftcards
node index.js avios          # 2022 point_offers
```

### Comandos úteis dos scrapers

```powershell
cd C:\Users\babif\snapgain-scraper

# ━━━ TC ━━━
$env:HEADED="1"; node index.js topcashback-login            # login one-time
# (em outro shell: ni tmp/LOGIN_READY pra sinalizar)
node index.js topcashback                                    # full ~3h
$env:TC_SKIP_CATEGORIES="1"; node index.js topcashback       # só /offers/ ~30s
$env:TC_ENRICH="1"; $env:TC_ENRICH_ONLY_MISSING="1"; node index.js topcashback  # enrich faltantes
$env:TC_DETAIL_SLUG="hostinger"; node index.js topcashback-detail  # parser test
node index.js tc-giftcards                                   # giftcards (~30s)

# ━━━ Quidco ━━━
$env:HEADED="1"; node index.js quidco-login                  # login one-time
# (em outro shell: ni tmp/QD_LOGIN_READY)
node index.js quidco                                         # full ~10min listing
$env:QD_ENRICH="1"; $env:QD_ENRICH_ONLY_MISSING="1"; node index.js quidco  # enrich ~2-3h
$env:QD_ONLY_CATEGORY="fashion"; node index.js quidco        # 1 cat só
$env:QD_DETAIL_SLUG="deliveroo"; node index.js quidco-detail  # parser test
node index.js quidco-giftcards                               # giftcards (~30s)

# ━━━ Outros (já existiam) ━━━
node index.js jamdoughnut    # 217 giftcards
node index.js everup         # 273 giftcards
node index.js cheddar        # 26 giftcards
node index.js avios          # 2022 point_offers
```
