# Handover Cowork → Code: Quidco grava o teto como taxa (22/11/2026)

## O que aconteceu

A rodada das 09:00 de 22/11 (`member-scrape`, run 45005381575) ficou
vermelha na checagem diária da Quidco:

- Argos: o banco tinha 12, a fonte mostrou 4;
- Marks & Spencer: o banco tinha 3, a fonte mostrou 20.

O Cowork abriu as páginas da Quidco. As três lojas têm várias faixas, e o
robô grava o número do cartão da listagem como se valesse para tudo:

| Loja | Gravado | Página da Quidco hoje |
|---|---|---|
| Currys | 15 (sem faixas) | 1% "all other online purchases"; até 15% em TVs Samsung e casa inteligente |
| Argos | 12 | 0,5% clientes antigos; 3% tecnologia; 4% o resto (clientes novos) |
| M&S | 3 | 1% liquidação; 2–7% clientes antigos; 12–20% clientes novos, por valor |

A Currys era a mais perigosa: com 15% fixo e sem faixas, a Quidco passaria
a NX (10%) como "Best option", e esses 15% valem só para alguns produtos.

### Causa

Em `scrapers/quidco.js`, sem enriquecimento (`QD_ENRICH` desligado na
rodada diária), `rate = m.headlineRate`, e `rateBreakdown` fica
`undefined`, então o `upsert` mantém as faixas antigas. Resultado:
- a loja sem faixas (Currys) fica com o teto como taxa única;
- a loja com faixas antigas (Argos, M&S) mostra faixas de meses atrás.

Hoje: 3.597 ofertas ativas, 3.290 com faixas (antigas), 44 com taxa ≥ 10%
sem faixas, 32 com boost e sem faixas.

## O que o Cowork já fez (22/11)

- Currys, Argos e M&S: faixas de hoje gravadas à mão, com
  `conditions = 'Up to'`. A Currys aparece como "1–15%" e é ordenada pela
  faixa de 1%. Cópia: `ops.fix_backup_20261122_quidco_tiers`.
- Na próxima rodada, o robô vai trocar a `rate` de novo pelo número da
  listagem, mas mantém essas faixas.

## Tarefas para o Code (snapgain-scraper, um PR)

1. **Ler as faixas de quem mudou.** Na rodada diária, abrir a página da
   loja (o `fetchMerchantBreakdown` que já existe) só para:
   - lojas cujo número da listagem mudou desde ontem;
   - lojas com boost;
   - lojas sem `rate_breakdown`.

   Devem ser algumas centenas de páginas, não as 3.600. Medir o tempo e,
   se passar de 20 minutos, limitar às de maior taxa e logar quantas
   ficaram para o dia seguinte.
2. **Nunca gravar só o teto.** Quando houver faixas, `rate` = o topo,
   `conditions = 'Up to'` e as faixas do dia (o site já ordena pela menor
   faixa). Sem faixas lidas e com o número da listagem diferente de ontem:
   segurar a oferta (não gravar) e listar no resumo.
3. **Checagem diária:** comparar também a **menor** faixa, não só o
   número do topo. A de hoje usa números diferentes (listagem × página).
4. Teste: uma loja com listagem "15%" e página com faixas de 1% a 15%
   grava `rate` 15, `Up to` e as faixas, e o site mostra "1–15%".

## Pequeno, src

- **Hot deals:** a lista do Avios ainda mostra "#1, #2…". Usar a mesma
  forma da comparação (sem número).

## Conferido pelo Cowork em 22/11 (PRs #184–#187)

- 0047 e 0048 aplicadas; `daily-boost-digest` publicada (v12).
- 21 cartões com taxa, conferida na página de cada banco. Os outros 20
  ficaram vazios: o produto mudou ou acabou, ou a taxa depende de parceiro.
- Currys £100: NX £10,92 com Barclaycard Avios e £11,00 com o Santander
  Edge de 1% (adicionado na conta de teste).
- "8,600+ stores" e a seção do Avios no Hot deals (326 boosts) funcionam.
- Two-factor: TOTP ligado no Supabase; ligado na conta de teste com sucesso.
  O dono testa a entrada com código.
- `source_name` da Currys ainda vazio: a rodada das 09:00 usou o código de
  antes do PR #66. Conferir amanhã.
