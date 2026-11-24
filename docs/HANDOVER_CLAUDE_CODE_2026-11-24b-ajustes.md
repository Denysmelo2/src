# Handover Cowork → Code: depois do PR #195 (24/11/2026, tarde)

## O que o Cowork fez

- **Migração 0051 aplicada.** Cópia do guia em
  `ops.fix_backup_20261124_platforms_explained`.
- **Códigos na tabela `platform`:**
  - NX Rewards `REFXYH9R`;
  - Curve e Curve Rewards `NVOGMMLD`: "1% back on your Curve card for 30
    days (up to £15, after 5 payments of £2 or more)", conforme os termos da
    Curve, válidos até 31/12/2026;
  - JamDoughnut `UFDN`: "£3 after your first gift card".
  EverUp e Rakuten esperam o dono. Cópia em
  `ops.fix_backup_20261124_referrals_platform`.
- **Ribbon:** nova linha em `platform` (`ribbon-rewards`, tipo
  `bank_offer`, ativa), com o link e o código **DENYD11D**. Sem essa linha,
  o "Copy code" não aparecia na estratégia, porque a leitura pública só
  mostra linhas ativas (`platform_public_read`). Com o tipo `bank_offer`,
  ela não entra nas listas de cashback, cartão e gift card do perfil, da
  carteira e do onboarding. Aparece só em `/apps`, em "Bank offers".
- **Estratégias:**
  - A Cheddar saiu de todas as estratégias ativas: passos, descrição e tags.
  - A Rakuten da Amazon deixou de usar o link `/r/` quebrado e foi para
    `rakuten.co.uk`.
  - Ribbon: a taxa ficou em 1 ponto por £1 (era 1,5%), como diz o site do
    Ribbon hoje.
  Cópia em `ops.fix_backup_20261124b_curated`.
- **NX no Platform guide:**
  - descrição, prós e contras sem One4all e sem gift card;
  - categoria `cashback`;
  - "Up to 30 days" para receber.

## Conferido no site (PC, conta de teste)

- O "Start here" diz "these 4 platforms": NX, JamDoughnut, Quidco e Avios.
- O "Copy code" aparece na Playbook (NX, JamDoughnut e Ribbon), no Platform
  guide e na página de estratégia da Currys. O botão troca para "Copied".
- A pergunta da Sainsbury's começa em "No, I've ordered before" e tem a
  explicação embaixo.
- O "Show all" do Hot deals funciona, com "Show more (N left)" e "Show
  fewer".
- iPad: não deu para testar logado. A janela do Chrome não muda de tamanho,
  e o site bloqueia iframe. No Playwright com iPad, as páginas pedem login.
  O `ReferralCode` usa `flex-wrap`. O dono confere no iPad.

## Tarefas para o Code (src, pequenas)

1. **Hot deals corta a Quidco em 200.** O banco tem 321 boosts da Quidco
   ativos e verificados, mas o botão diz "Show all 200 Quidco boosts". O
   `.limit(200)` de `cashback_offers` e de `gift_card_offers` em
   `HotDealsPage.jsx` precisa ir para 1000, como o de `booster_events`, ou a
   contagem precisa vir de um `count`.
2. **O selo "+X% via …" dos passos das estratégias é fixo**
   (`step.earn_pct`) e não bate com a caixa ao vivo:
   - Amazon via Currys mostra "+6.5% via JamDoughnut", e o ao vivo diz 5,1%
     (EverUp);
   - Uber mostra "+5% via JamDoughnut", e o ao vivo diz 2,75%.
   Para os passos ao vivo (`liveStepKind` diferente de null), mostrar no selo
   a taxa de hoje, ou esconder o selo.
