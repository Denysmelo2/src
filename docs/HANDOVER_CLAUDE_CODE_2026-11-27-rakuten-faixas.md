# Handover Cowork → Code: Rakuten, ler as faixas da página da loja (27/11/2026)

## Onde estamos

- A Rakuten está **fora** da rodada desde 23/11. O cron
  `member-scrape-dispatch` manda `scrapers=nx,quidco,avios`.
- **Dry run 2 (23/11):** leu 478 das 495 marcas logadas, mas
  `parseShopPage` (`lib/rakuten.js:89`) **não leu nenhuma faixa**.
- O dono já está logado na Rakuten no Chrome do robô, no Mac.
- O link de indicação mudou em 24/11 para
  `https://www.rakuten.co.uk/r/DENYSG19?eeid=44749`, em `platform.affiliate_url`
  da `rakuten-uk`. O robô não usa esse link.

## Por que não leu (conferido no código de hoje)

A página `/shop/<slug>` mostra, nesta ordem:

```
Terms & Exclusions
… (linhas dos termos) …
Here’s how much Cashback you’ll earn
0.82% Cashback
New customers
0.82% Cashback
New customers (Tech Purchases)
0.37% Cashback
Existing customers
…
```

1. `TIERS_HEAD` (`lib/rakuten.js:78`) não reconhece **"Here’s how much
   Cashback you’ll earn"**, nem com o apóstrofo curvo (’) que a Rakuten usa.
   Por isso o modo continua `terms`, e as linhas das faixas vão parar nos
   termos.
2. A faixa vem em **duas linhas**: primeiro "X% Cashback", depois o nome.
   `TIER_LINE_A` e `TIER_LINE_B` esperam taxa e nome **na mesma linha**.

Exemplos vistos em 23/11:
- **Argos:** 0.82% New customers / 0.82% New customers (Tech Purchases) /
  0.37% Existing customers…
- **ASOS:** 5% New customers / 0.75% Existing customers.

## Tarefas para o Code (snapgain-scraper, um PR)

1. **Cabeçalho das faixas:** `TIERS_HEAD` passa a aceitar "Here’s how much
   Cashback you’ll earn". Comparar sem diferenciar `’` e `'`, por exemplo
   trocando o `’` por `'` antes de testar.
2. **Faixa em duas linhas:** no modo `tiers`, uma linha só com "X% Cashback"
   (ou "Up to X% Cashback", ou "£X Cashback") guarda a taxa, e a **próxima
   linha** que não for taxa vira o nome da faixa.
   - Faixa em £: contar e pular, igual à lista (o banco só guarda %).
   - O modo `tiers` termina no próximo cabeçalho conhecido (`STOP_HEAD`) ou
     em "Terms & Exclusions".
3. **Termos:** guardar só as linhas entre "Terms & Exclusions" e o
   cabeçalho das faixas.
4. **Regra de gravação:** igual à Quidco e ao handover de 23/11.
   - `rate` = maior faixa e `conditions = 'Up to'` quando houver mais de uma
     faixa.
   - `rate_breakdown` com as faixas; o site ordena pela menor.
   - Lojas com "New customers" e "Existing customers": o site deve mostrar a
     de **clientes antigos** como valor garantido, como na Quidco da Argos.
5. **Nunca abrir os links `-xfas`.** Abrir só `/shop/<slug>`. Uma loja que
   aparece duas vezes na lista (Argos) é lida uma vez só.
6. **Testes** com o texto das páginas da Argos e da ASOS acima:
   - Argos: 3 faixas, `rate` 0,82, menor 0,37;
   - ASOS: 2 faixas, 5 e 0,75;
   - os termos não trazem nenhuma linha "X% Cashback".
7. **Tempo:** a rodada das 03:00 hoje leva cerca de 2h26, com a Quidco
   inteira (3.581 páginas em 129 minutos). A Rakuten entra depois da Avios,
   com o próprio limite de **20 minutos**, e o resumo diz quantas páginas
   ficaram para o dia seguinte. A janela do Mac vai até 08:00, e o
   `daily-scrape` precisa terminar antes disso.

## Depois do merge (Cowork)

1. Dry run 3: `scrapers=rakuten`, `rakuten_dry_run=1`. Conferir as faixas da
   Argos, ASOS, Currys, Boots e AliExpress contra a página.
2. Se estiver certo, rodar com `rakuten_dry_run=0` e comparar 10 lojas no
   site, incluindo a Currys (aviso, "See terms" e nada de gift card com
   Rakuten).
3. Voltar a Rakuten à rodada das 03:00, com `scrapers=nx,quidco,avios,rakuten`
   no cron, e publicar a `source-alert` com a Rakuten em `WATCHED`.
