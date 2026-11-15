# Handover Cowork → Code: JamDoughnut "Pump Up" (15/11/2026)

## O que o dono viu

No painel, "Top gift cards" mostrava **Fabyouless 30%**. No app da
JamDoughnut, a mesma oferta estava em **33%**. Hoje (15/11) o robô das 08:00
gravou 30%.

## Causa (conferida pelo Cowork)

O robô (`snapgain-scraper/scrapers/jamdoughnut.js`) lê só `brand.discount`
no feed `https://backend.jamdoughnut.com/api/web/searches`. Esse campo é a
taxa **básica**. O mesmo item traz um bloco `pumped_up`, que o robô ignora:

```json
"discount": 30.0,
"pumped_up": {
  "original_discount": 30.0,
  "card_discount": 32.0,
  "banked_discount": 33.0,
  "points_discount": 30.0,
  "pumped_up_difference": 3.0,
  "ends_at": 1794787140
}
```

- `card_discount`: pagando com cartão.
- `banked_discount`: pagando por transferência bancária (é a maior).
- `points_discount`: pagando com pontos da JamDoughnut.
- `ends_at`: fim do aumento (epoch, segundos). Hoje é 15/11 às 23:59 UTC.

Em 15/11, **265 das 280 marcas** tinham `pumped_up`. Exemplos: Fabyouless
30 → 33, Buyagift 15 → 20, Swarovski 14 → 15,5, Tesco 2,25 → 3,5. Em várias
marcas o `card_discount` é **menor** que o `discount` (por exemplo,
Morrisons: 2 básica, 1,25 cartão, 2,25 banco).

O robô também já marca `is_boosted` pelo nome do grupo ("Pumped Up"), mas
não muda a taxa.

## Decisão do dono (15/11)

**O SnapGain mostra sempre a taxa mais alta que a JamDoughnut oferece no
momento**, com a forma de pagamento e o fim do aumento escritos na oferta.
Hoje isso é a taxa por transferência bancária.

## O que o Cowork já fez hoje

- Cópia de antes: `ops.jd_pumpup_backup_20261115`.
- Em 264 das 266 ofertas ativas da JamDoughnut:
  - `discount_pct` = `banked_discount`;
  - `is_boosted = true`;
  - `valid_to = 2026-11-15 23:59+00`;
  - em `conditions`, acrescentado: "· Pump Up until 15/11 23:59: 33%
    paying by bank transfer (32% by card, 30% standard)".
- Ficaram sem mudança: National Trust (sem aumento) e Disney Store (o nome
  no feed é "Disney+", não confirmei que é a mesma loja).
- Amanhã às 08:00 o robô atual volta tudo para a taxa básica. Por isso a
  tarefa 1 precisa estar no ar antes disso, ou o mais cedo possível.

## Tarefas, em ordem

### 1. Robô da JamDoughnut grava a taxa mais alta (snapgain-scraper)

Em `scrapers/jamdoughnut.js`, para cada marca:

1. Se existir `pumped_up` **e** `ends_at` estiver no futuro:
   - taxa = **maior** entre `discount`, `card_discount`, `banked_discount`
     e `points_discount`;
   - guardar qual forma de pagamento deu a maior (bank transfer, card ou
     JamDoughnut points);
   - `is_boosted = true`;
   - `valid_to = ends_at`;
   - `conditions` = o `redemption_methods` de hoje +
     "· Pump Up until <dd/mm HH:MM>: <maior>% paying by <forma>
     (<cartão>% by card, <básica>% standard)".
2. Sem `pumped_up`, ou com `ends_at` no passado:
   - taxa = `discount`;
   - `is_boosted = false`;
   - `valid_to = null`;
   - `conditions` = só o `redemption_methods`, sem texto de Pump Up antigo.
3. Guardar também a taxa básica (tarefa 2), para o site poder voltar a ela
   quando o aumento acabar.
4. Log no fim: quantas marcas com aumento, a maior diferença e 3 exemplos.
5. **Teste:** um JSON de exemplo com o caso da Fabyouless acima deve gravar
   33, `is_boosted = true`, `valid_to` igual ao `ends_at` e o texto certo.
   Morrisons deve gravar 2,25, não 1,25. Um item sem `pumped_up` grava o
   `discount`.

### 2. O aumento termina sozinho na hora certa (src, migração)

Hoje o aumento acaba às 23:59, mas o robô só roda às 08:00. Das 00:00 às
08:00 o site mostraria uma taxa que já não existe.

- Migração: coluna `standard_discount_pct numeric` em
  `public.gift_card_offers` (nula quando não há aumento).
- Job no pg_cron, a cada 15 minutos:
  ```sql
  update public.gift_card_offers
     set discount_pct = standard_discount_pct,
         is_boosted = false,
         valid_to = null,
         conditions = split_part(conditions, ' · Pump Up', 1)
   where valid_to is not null and valid_to < now()
     and standard_discount_pct is not null;
  ```
- O robô (tarefa 1) grava `standard_discount_pct = discount` quando há
  aumento, e `null` quando não há.
- Cowork aplica a migração depois do merge, e confere no dia seguinte, às
  00:15, se as ofertas voltaram.

### 3. Pegar aumentos que começam depois das 08:00 (snapgain-scraper)

A JamDoughnut liga e desliga Pump Ups ao longo do dia. Com uma leitura só,
às 08:00, um aumento que começa às 10:00 só aparece no dia seguinte, ou
nunca aparece.

- A leitura da JamDoughnut é uma chamada HTTP só, sem navegador, e leva
  segundos.
- Criar um workflow só da JamDoughnut, que rode **a cada 2 horas, das 08:00
  às 22:00** (horário do Reino Unido). As 08:00 continuam com todos os
  robôs do `daily-scrape`.
- O `sweepStaleOffers` dessa rodada deve continuar igual ao de hoje (só
  desliga o que sumiu do feed).

### 4. O site mostra a forma de pagamento (src)

Onde aparece uma taxa da JamDoughnut com aumento (Top gift cards no
painel, `/deals/gift-cards`, Hot Deals e as rotas do `/compare`):

- selo "Pump Up";
- uma linha curta: "33% paying by bank transfer · until 23:59 today".
  Vem do `conditions` ou de campos próprios, como você preferir;
- no `/compare`, a rota usa a taxa mais alta. Pagando por banco não entra
  o +1% do cartão: nessa rota a linha do 1% não aparece.

### 5. Cheddar e EverUp: conferir se escondem o mesmo tipo de aumento

- **EverUp:** o robô lê `cashback_perc`. Conferir no payload das páginas de
  marca se existe algum campo de aumento ou de promoção com prazo (boost,
  promo, `ends_at`, `original` e parecidos). Se existir, aplicar a mesma
  regra: maior taxa em dinheiro, com prazo. As moedas
  (`total_rewards_perc`) continuam de fora.
- **Cheddar:** o robô lê "up to N%" da página pública. Conferir se a página
  da marca mostra uma taxa maior ou com prazo.
- Escrever no PR o que achou nas duas, mesmo que não mude nada.

## Depois do merge (Cowork)

1. Aplicar a migração da tarefa 2 e conferir o job no `cron.job`.
2. Rodar a JamDoughnut à mão e comparar 10 marcas com o feed.
3. Conferir às 00:15 se as ofertas com prazo vencido voltaram para a taxa
   básica.
