# Decisão do dono: valor de 1 ponto por programa (18/10/2026)

Tarefa 2, parte não-código. Pesquisado pelo Claude Cowork só em fontes
oficiais, sem copiar de site comparador. Aprovado pelo dono em 18/10/2026. O
Claude Code aplica com uma migration em `miles_programs`. **Não apagar nenhuma
linha.**

## 1. Valores aprovados (`conversion_rate` = £ por 1 ponto)

| slug | Programa | Hoje | **Aprovado** | Fonte oficial |
|---|---|---|---|---|
| `tesco-clubcard` | Tesco Clubcard | 1.00 | **0.01** | tesco.com, "How Clubcard vouchers work": "150 points gives you £1.50 in Clubcard vouchers" (até 2x com Reward Partners; o dono escolheu o valor base) |
| `nectar` | Nectar | 0.005 | **0.005** (sem mudança) | nectar.com, Rewards Conditions: "Every 500 points = £2.50" |
| `morrisons-more` | Morrisons More | 0.10 | **0.001** | morrisons.com, More Points & Fivers: "You need to earn 5000 More Points to earn a £5 voucher" |
| `ba-avios` | British Airways Avios | 0.0092 | **0.0092** (decidido em 18/10, migration 0027) | e-book da Bárbara |
| `qatar-avios` | Qatar Privilege Club (Avios) | 0.0092 | **0.0092** (idem) | idem |
| `lufthansa-miles-more` | Lufthansa Miles & More | 1.10 | **0.0092** | Sem valor oficial publicado (o Cash & Miles só mostra o valor no checkout). Régua do Avios, como estimativa. |
| `tap-miles-go` | TAP Miles & Go | 1.00 | **0.0092** | Sem valor oficial (o Cash&Miles só mostra no checkout). Régua do Avios. |
| `emirates-skywards` | Emirates Skywards | 0.015 | **0.0092** | Sem valor oficial encontrado. Régua do Avios. |
| `flying-blue` | Flying Blue | 0.012 | **0.0092** | A loja Flying Blue diz que as milhas "have no cash surrender value". Régua do Avios. |
| `etihad-guest` | Etihad Guest | 0.010 | **0.0092** | Sem valor oficial ("Mile values are subject to change"). Régua do Avios. |
| `virgin-points` | Virgin Points | 0.010 | **0.0092** | Virgin Red: "Virgin Points do not have a monetary value". Régua do Avios. |
| `amex-mr` | Amex Membership Rewards | 0.010 | **0.0092** | A Amex UK só mostra o valor no checkout do Pay with Points. Régua do Avios. |

Decisão do dono: os programas aéreos e de cartão usam a **mesma régua do
Avios (0,92p)**, sempre tratada como estimativa. A regra de julho continua
valendo: pontos aparecem só em pontos, sem libras, para o cliente.

## 2. Programas a desativar (`is_active = false`, sem apagar)

| slug | Motivo (fonte oficial) |
|---|---|
| `ms-sparks` | Desde 15/04/2026 o Sparks é "pounds, not points": o cliente recebe dinheiro na carteira digital, sem pontos (comunicado oficial da M&S). |
| `waitrose` | O My Waitrose só tem ofertas e vouchers, sem pontos (waitrose.com, "My Waitrose benefits & offers"). |
| `coop-membership` | O Co-op Group acabou com os 2p por £1 em 24/01/2024 e trocou por preços de membro. Fonte: The News Co-op, um site de notícias, não a página oficial da Co-op; vale conferir no site da Co-op antes de aplicar. |
| `lidl-plus` | Desde 05/2026 o Lidl Plus dá 1 ponto por £1, mas o "preço" de cada recompensa muda toda semana e não há valor fixo (lidl.co.uk, "Lidl Plus Points"). |

**Atenção antes de desativar:** contar quantos usuários têm esses programas
em `user_miles_programs` e conferir se a Carteira ou a página de Milhas
quebram quando o programa está inativo. Se alguém tiver o programa salvo,
mostrar como "programa encerrado" em vez de sumir sem aviso.

## 3. Conferência no site (parte 1 da tarefa 2), 18/10/2026

Conferido no Chrome, logado como administrador (vê o mesmo que um premium).
Não testei sem login, para não deslogar a sessão do dono.

**Bateu:**
- Boots, ASOS, Nike, Gap, Sonos e Travelodge mostram Avios e cashback na mesma
  loja (a Nike não tem cashback na fonte, só gift cards e Avios).
- Cada oferta mostra "Verified today/yesterday" ou "Last verified 17/18 Oct
  2026".
- No `/compare` com £100 aparecem a linha "≈ N Avios via Avios Booster" e o
  veredito "Beats the Avios eStore" ou "Avios eStore wins". A conta a 0,92p
  bate: Gap £3,20 ≈ 348 Avios; Boots £10 ≈ 1.087 Avios; Travelodge £1,60 ≈
  174 Avios.

**Não bateu (para o Claude Code):**

1. **O `/compare` não mostra as combinações que a página da loja mostra.**
   - Nike: na página da loja o 1º lugar é "cheddar + British Airways Avios,
     £6 + 700 Avios". No `/compare` o 1º lugar é só "British Airways Avios,
     700 Avios", e a combinação não aparece.
   - ASOS: "cheddar + quidco £11,80" aparece na loja e não aparece no
     `/compare`.
   - Esperado: as duas telas mostram as mesmas opções na mesma ordem, ou o
     `/compare` explica que mostra só opções simples.
2. **Boots no `/compare`: o 1º lugar é a estratégia "Up to 15% at Boots &
   Argos: Airtime + NX or gift card" (£15).**
   - Ela depende do NX Rewards a 10%, e as ofertas do NX estão escondidas
     desde junho (tarefa 3).
   - O cartão não tem data de conferência.
   - Esperado: não ficar em 1º enquanto o NX não for conferido, ou mostrar um
     aviso.
3. **"Up to X%" ordena pelo maior valor da faixa.**
   - Boots no Quidco: 10% vale só para GHD; o resto é 3% a 6%. Mesmo assim o
     site mostra £10 e combinações de £14,50 em £100.
   - Esperado: ordenar pelo valor mais comum, ou mostrar "£3 a £10".
4. **Nomes de plataforma em minúsculas nos cartões:** quidco, cheddar, everup,
   jamdoughnut, picodi. Esperado: Quidco, Cheddar, EverUp, JamDoughnut,
   Picodi.
5. **Detalhes menores:**
   - A loja `travelodge` se chama "Travelodge - UK".
   - Em "Browse the retailers" no `/compare` aparecem lojas em categorias
     estranhas: adidas Shop, Argos e Currys em "Food & Drink"; Currys em
     "Utilities".
