# Para o Claude Cowork: tarefa 2 (Avios contra cashback), 18/10/2026

Escrito pelo Claude Code. São as partes da tarefa 2 que não são código: uma
conferência no navegador e uma pesquisa com o dono. Quando terminar, grave a
decisão do dono num arquivo `docs/DECISAO_...md` (como na tarefa 1). O Claude
Code aplica no banco.

## O que já está decidido e feito (não refazer)

- O dono decidiu em 18/10:
  - um Avios vale **0,92p** em todo o site (valor do e-book da Bárbara);
  - o Avios continua aparecendo **só em pontos**, sem libras (regra da
    Bárbara de julho).
- Migration 0027 (aplicada): British Airways Avios e Qatar Privilege Club
  (Avios) passaram de 1p para 0,92p no banco. Agora o comparador e a ordem das
  opções usam o mesmo número.
- Tarefa 1 (lojas duplicadas): 326 + 126 ofertas foram para a loja principal.
  Boots, ASOS, Nike, Gap, Sonos e Travelodge têm Avios e cashback na mesma loja
  no banco.

## 1. Conferir no site (Chrome, sem login e com login premium)

Para cada loja: **Boots, ASOS, Nike, Gap, Sonos, Travelodge**.

1. Abrir a página da loja em `https://snapgain.uk` (buscar pelo nome).
   - Deve aparecer o cartão "Points & Miles" com o Avios (ex.: Gap 4 pts/£).
   - Deve aparecer o cashback (ex.: Gap Quidco 3,2%).
   - Cada oferta deve mostrar a data da última conferência.
2. Abrir `/compare`, escolher a loja, pôr £100 e comparar.
   - Deve aparecer uma opção com o Avios.
   - Nas opções de cashback deve aparecer a linha "≈ N Avios via Avios
     Booster" e, quando der, "Beats the Avios eStore" ou "Avios eStore wins".
3. Anotar para o Claude Code o que **não** bateu, com print: loja, tela, o que
   apareceu e o que era esperado.

## 2. Valor em libras dos outros programas de pontos (pesquisa com o dono)

A coluna `miles_programs.conversion_rate` é "quanto vale 1 ponto, em libras".
Ela é usada na ordem das opções e no total da Carteira e da página de Milhas.
Vários valores parecem errados. A Lufthansa, por exemplo, está a £1,10 por
milha: 10.000 milhas apareceriam valendo £11.000.

Valores de hoje (1 ponto = £):

| Programa | Hoje | Suspeita |
|---|---|---|
| Lufthansa Miles & More | 1.10 | muito alto (provavelmente ~0.01) |
| TAP Miles & Go | 1.00 | muito alto |
| Tesco Clubcard | 1.00 | muito alto (1 ponto costuma valer 1p = 0.01) |
| M&S Sparks | 0.50 | conferir |
| My Waitrose | 0.50 | conferir |
| Lidl Plus | 0.10 | conferir |
| Morrisons More | 0.10 | conferir |
| Co-op Membership | 0.02 | conferir |
| Emirates Skywards | 0.015 | conferir |
| Flying Blue (Air France/KLM) | 0.012 | conferir |
| Amex Membership Rewards | 0.010 | conferir |
| Etihad Guest | 0.010 | conferir |
| Virgin Points | 0.010 | conferir |
| Nectar | 0.005 | conferir |
| British Airways Avios / Qatar (Avios) | 0.0092 | decidido em 18/10 |

O que fazer:

1. Para cada programa, achar o valor de 1 ponto em libras na **fonte
   oficial** (página do próprio programa: quanto vale um ponto ao trocar por
   desconto ou voucher). **Não** copiar valores de outro site comparador
   (regra do dono).
2. Mostrar a tabela ao dono com a fonte de cada número. Ele aprova ou corrige.
3. Gravar a decisão em `docs/DECISAO_VALOR_PONTOS_2026-10-18.md`, com o
   programa, o valor aprovado e a fonte. O Claude Code aplica com uma migration.
