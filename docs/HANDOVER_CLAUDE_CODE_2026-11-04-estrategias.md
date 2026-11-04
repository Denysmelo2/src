# Handover do Cowork para o Claude Code: estratégias (04/11/2026, noite)

Continua valendo tudo o que veio antes: 26/10 Parte A, a regra dos
repositórios separados de 03/11 e as tarefas 1 (EverUp) e 2 (senhas
vazadas) de `HANDOVER_CLAUDE_CODE_2026-11-04.md`. Este documento traz as
tarefas 3 a 6, que saíram do teste do dono como visitante em 04/11.

Ordem: um PR por vez, **depois** das tarefas 1 e 2.

## O que o dono encontrou

1. **Amazon, £100:** o site mostrava £5 (5%). O certo é £1 fixo do
   Rakuten mais 1% do cartão, ou seja £2.
2. **Sainsbury's:** "NX or Avios — which pays more" aparecia em 1º, com
   "Strategy reviewed: 18 Oct 2026", e a rota automática "NX Rewards 10%"
   aparecia logo abaixo com o mesmo £10.
   - É uma duplicação.
   - A 1ª tem que ser a NX 10%, porque o Avios fica em 2º pelas regras.

## O que o Cowork conferiu: a causa

A tabela `curated_strategies` guarda `hero_return_pct` **fixo**,
digitado à mão (a maior parte em 16/09). A `/compare` põe esse número no
mesmo ranking das rotas automáticas, que se atualizam todo dia. Em £100,
em 04/11:

| slug | o site mostrava | real em 04/11 |
|---|---|---|
| `amazon-optimiser` | 5% | £1 + 1% = 2% |
| `nx-one4all-basic` (51 lojas) | 6% | 17 lojas sem nenhum gift card; 7 com menos de 5% |
| `uber-easy-combo` | 6% + 100 Avios | JamDoughnut 2,75%; o melhor é Cheddar 4,5% + 1% |
| `treatwell-easy-stack` | 9% | EverUp 7,45% + 1%; a NX paga 10% |
| `sainsburys-max-stack`, `nx-one4all-airtime-triple`, `deliveroo-triple-stack` | 10%, em 1º | repetem as rotas automáticas; ganham o empate porque entram antes no `combined.sort` (`ComparePage.jsx`, `rankedRoutes`) |

Há mais uma diferença: as curadas somam +1% do cartão no
`hero_return_pct`, e as rotas automáticas (`computeStrategies`) não somam.

### O que o Cowork já mudou no banco (04/11, com a aprovação do dono)

A cópia de antes está em `ops.curated_backup_20261104`.

- `amazon-optimiser`:
  - título "Amazon: £1 per order with Rakuten + 1% on your card";
  - `hero_return_pct = 2`.
- **`playbook_only = true`**, ou seja, fora do ranking e só como guia:
  - `nx-one4all-basic`, `uber-easy-combo`, `treatwell-easy-stack`;
  - `sainsburys-max-stack`, `nx-one4all-airtime-triple`, `deliveroo-triple-stack`.
- Nova: `amazon-currys-everywish`, com `hero_return_pct = 7.5`, fixo por
  enquanto. É a rota do dono:
  1. gift card da Currys com desconto (Cheddar 6,5%, EverUp 5,9% ou JamDoughnut 3%);
  2. pago com um cartão que dá 1%;
  3. na loja física da Currys, comprar um EVERYWISH;
  4. resgatar um gift card da Amazon.
  - O dono confirmou que a Currys aceita o próprio gift card nessa compra
    e que a Amazon aparece na frente do cartão EVERYWISH.

Hoje, na `/compare`, só ficam as duas curadas da Amazon. Todo o resto vem
das rotas automáticas.

## Tarefa 3: regra da NX no robô (snapgain-scraper)

Decisão do dono em 04/11/2026: **a NX garante no mínimo 10% em toda loja.**

- **Taxa lida abaixo de 10%:** é erro grave do robô.
  - Não gravar.
  - Deixar a rodada vermelha, ou com um aviso que chegue ao dono, com as lojas.
- **Queda para 10% ou mais** (por exemplo, 12% → 10%): o robô **aplica
  sozinho**.
  - Isso substitui o "held for the owner" de hoje.
  - Continuar listando no relatório "taxas que caíram", só como informação.
- Subidas, lojas novas e lojas que saem continuam como estão.
- O site já sobe a NX para no mínimo 10% (`CASHBACK_FLOOR_PCT`). Manter.

## Tarefa 4: estratégias curadas calculadas com as taxas do dia (src)

O dono pediu que nenhuma estratégia mostre mais um número fixo.

- **Cálculo do retorno de uma curada:**
  - cada passo com `earn_pct` que seja um gift card ou cashback lê a taxa
    ativa de hoje na tabela, pela plataforma e pela loja do passo;
  - exemplo da Amazon via Currys: o passo 1 usa a melhor taxa de gift card
    **da Currys**, então o passo precisa dizer a loja (por exemplo
    `store_slug: "currys"` no JSON do passo);
  - sem taxa ativa nos últimos 30 dias, a estratégia **não aparece** na
    busca, em vez de mostrar o número velho.
- **Valor fixo por pedido**, como o £1 do Rakuten:
  - uma coluna, por exemplo `hero_flat_gbp`, ou um campo no passo;
  - o retorno em £ fica `flat + pct × valor`.
- `hero_return_pct` fica só como texto de vitrine, ou some.
- **Data na tela:** para estratégias com taxa ao vivo, mostrar a idade da
  taxa mais velha usada (`oldestVerifiedAt`), não "Strategy reviewed".

Depois do merge, o Cowork:
1. tira o `playbook_only` das que voltarem a fazer sentido (Uber, Treatwell);
2. confere cada uma contra o banco.

## Tarefa 5: fim da duplicação e do empate (src)

- **Empate em £** entre uma curada e uma rota automática: vence a
  automática (a mais simples), não a curada.
- **Cartões `live_compare`** (Sainsbury's, Boots, Deliveroo):
  - não entram como rota no ranking, porque já são a comparação das rotas
    automáticas;
  - se ficarem, devem aparecer como um quadro "compare" abaixo da 1ª rota,
    sem um valor em £ próprio.
- **Avios eStore com bônus fixo por pedido** (Sainsbury's: 700/800/100,
  com mínimo de £50): conferir que a rota automática mostra esse bônus.
  Assim o Avios aparece em 2º na Sainsbury's, como o dono espera.

## Tarefa 6: uma regra só para o 1% do cartão (src): **pergunta ao dono**

Hoje as curadas somam +1% do cartão e as automáticas não. Duas opções:

- **(a)** tirar o 1% do ranking de todas e mostrar como linha extra
  ("+ ~£1 if you pay with a 1% card");
- **(b)** somar o 1% em todas as rotas que aceitam pagamento com cartão.
  Não vale para pagamento com gift card na loja nem para NX com gift card.

O Cowork leva a pergunta ao dono. Até ele decidir, a sugestão é (a).

## Teste que deve ficar no repositório

Um script, ou teste, que rode todas as curadas ativas contra o banco e
falhe se o retorno mostrado for diferente do calculado com as taxas do
dia. Assim o erro de 04/11 não volta sem ninguém ver.

---
_Cowork, 04/11/2026._
