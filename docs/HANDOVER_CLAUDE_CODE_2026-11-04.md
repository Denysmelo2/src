# Handover do Cowork para o Claude Code (04/11/2026)

Os handovers de 26/10 (Parte A) e 03/11 (repositórios separados) continuam
valendo. Este só traz a tarefa nova que apareceu na conferência dos robôs de
04/11.

## O que o Cowork fez depois do merge de src#152 e src#153 (03–04/11)

- `source-alert` publicado (v5, sem a Picodi). `?dry_run=1` respondeu
  `200`, `stale: []`.
- hCaptcha: ligado no Supabase (o dono conferiu). O quadro do hCaptcha
  carrega em `/auth/signup`, `/auth/login` e `/auth/request-reset` em
  produção.
- Robô das 09:00 em 04/11: verde.
  - NX gravou 1.330 datas, 3 lojas novas e 5 taxas seguradas para o dono.
  - Quidco desativou 84 (abaixo de 150).
  - Avios rodou normal.
- Tesco £100, com os dados reais: NX 10% primeiro, depois Cheddar,
  EverUp e JamDoughnut. Nenhuma rota soma gift card com NX.

## Tarefa: EverUp lê a lista de marcas pelo sitemap (snapgain-scraper)

### O problema

- O robô das 08:00 falhou em **03/11 e 04/11**, nos dois casos na EverUp:
  - `[everup] /brands lists 24 brands`; em 02/11 eram 355;
  - `sweepStaleOffers gift_card_offers/everup ABORTED — would mark 306/326 (93.9%)`.
- A trava funcionou e o banco **não** foi alterado. Mas as 306 ofertas
  da EverUp estão sem verificação desde 02/11. Elas somem do site pela
  regra dos 30 dias, por volta de 02/12, se nada mudar.
- **Causa**, conferida pelo Cowork em 04/11:
  - `https://www.everup.com/brands` agora **redireciona** para `/cashback`;
  - essa página tem um ItemList com só 24 marcas em destaque (`numberOfItems: 24`);
  - as páginas de marca continuam no ar, e o formato delas não mudou:
    - `/brands/argos` responde 200 com `cashback_perc_label`;
    - testadas também `asos`, `currys`, `boots`, `john-lewis`, `nike` e `tesco`;
  - `https://www.everup.com/sitemap.xml` lista **357** URLs
    `/brands/<id>` (por exemplo `argos-cashback-uk` e `tesco`). É o mesmo
    formato de id que `parseBrandIds` já entende.

### O que mudar (`scrapers/everup.js`)

- Ler os ids de `sitemap.xml` em vez de `/brands`. Ainda é HTTP simples,
  sem navegador.
- `parseBrandIds` já casa `everup.com/brands/<id>`, então pode servir para
  o sitemap. Conferir que só entram URLs de `/brands/<id>`.
- Se o sitemap vier vazio ou com bem menos marcas que antes, **parar com
  erro** antes de tocar no banco, como já faz hoje. Não usar `SWEEP_FORCE`.
- `MIN_PARSED_RATIO` e a trava de 50% do `sweepStaleOffers` ficam como
  estão.
- Atualizar o comentário do topo: a lista muda de `/brands` para
  `sitemap.xml` em 04/11/2026.
- Teste:
  1. `EVERUP_LIMIT=20` rodando local;
  2. depois uma rodada completa sem gravar (se houver modo de leitura);
  3. no PR, mostrar o número de marcas lidas e quantas ofertas o sweep
     desativaria.

### Depois do merge

- O Cowork dispara o `daily-scrape` à mão uma vez e confere:
  - EverUp verde;
  - cerca de 330 marcas;
  - o sweep desativa poucas.

## Para o Code pensar (não é para fazer sem combinar)

- O `source-alert` não avisou dessa falha. Ele olha a última verificação
  **mais nova** de cada fonte, e as 20 marcas lidas em 04/11 deixaram a
  EverUp com cara de "fresca".
- Uma ideia é avisar também quando o número de ofertas verificadas nas
  últimas 48 h cai muito em relação ao total ativo (por exemplo, menos da
  metade).
- Se o Code achar que vale, propõe no PR seguinte. O dono decide.

---
_Cowork, 04/11/2026._
