# Acordos do dono: estratégias do NX Rewards (18/10/2026, versão da tarde)

**Esta versão substitui a das 11h**, e também as "regras do NX para a tarefa
3" anotadas no `docs/HANDOFF.md` (seção "Estratégias do NX (18/10)"). O
dono corrigiu o rumo em 18/10, à tarde. Onde a versão antiga dizia
"esconder" ou "deixar desligada", vale o que está aqui.

## 1. Regra principal

1. **As estratégias do NX não são retiradas: são ajustadas.**
2. **O One4all pelo NX nunca aparece**, porque não existe mais. O NX não
   vende gift cards desde setembro de 2026.
3. O NX oferece **no mínimo 10% de cashback** comprando pela plataforma NX,
   em qualquer loja parceira. A home oficial (nxrewards.com, 18/10/2026)
   diz: "Earn a minimum 10% Cashback every time you shop online with NX
   Rewards". Isso deve estar **disponível no app como sugestão para o
   cliente**.
4. Toda estratégia com NX passa a ser uma **comparação**. Para a loja e o
   valor que o cliente digitar, o card mostra:
   - as opções que existem naquele dia: NX, Avios eStore, sites de cashback
     e desconto de gift card;
   - **a conta de cada uma**, em libras e em Avios quando houver;
   - **a melhor opção em destaque**: "Melhor para você: …".
5. **Régua:**
   - 1 Avios = £0,0092, como estimativa (decisão de 18/10);
   - NX = 10% do valor (ou a taxa real, quando for maior e estiver
     conferida);
   - a ordem segue o maior ganho em libras.
6. **Mostrar que o NX é por assinatura:** tem mensalidade e um teste de 30
   dias. Está na home oficial e o cliente precisa saber.

## 2. Como fica cada estratégia (ajustar, não apagar)

### Deliveroo (`deliveroo-triple-stack`, `deliveroo-easy-combo`, `deliveroo-advanced-avios`)

- **O Avios não tem Deliveroo.** Confirmado pelo dono em 18/10. A página da
  Deliveroo no avios.com diz "This page isn't available for British
  Airways". A oferta de Avios da Deliveroo no banco já está desligada desde
  18/05.
- **A estratégia passa a ser: NX 10%.** Título sugerido: "Deliveroo: 10% de
  volta com o NX".
  - Comparar com o cashback do Quidco (hoje 5%) e com o desconto do gift card
    (Cheddar 4,5%, EverUp 4,15%, JamDoughnut 3%).
  - Mostrar a conta. Exemplo para £100: NX £10, Quidco £5, gift card £4,50.
    Melhor: NX.
- **Gift card + NX na mesma compra NÃO vale.** O Cowork conferiu na área de
  membro do NX em 18/10, nas "Special Terms" da Deliveroo e da Boots: "Cashback
  is not due on purchases of gift cards or paying for a purchase using gift
  cards or e-gift cards/codes". O gift card aparece só como alternativa.
- `deliveroo-triple-stack` (21%) e `deliveroo-easy-combo` (16%): as duas
  somavam gift card com NX, o que o NX não paga. Reescrever como **uma só**
  estratégia, a de cima. Os números 21% e 16% não aparecem mais.
- **`deliveroo-advanced-avios` ("6% + 700 Avios on Deliveroo"):** prometia
  Avios que não existem. O Cowork desligou em 18/10 (`is_active = false`, nada
  apagado). Não religar.

### Sainsbury's (`sainsburys-max-stack`)

Comparação entre NX e Avios eStore. Dados conferidos no avios.com, página
"Sainsbury's Grocery", em 18/10/2026:

| Opção | Ganho |
|---|---|
| NX | 10% do pedido. Pagar com cartão, nunca com gift card (o NX não paga no Sainsbury's com gift card). |
| Avios eStore, **cliente novo pelo site** | 700 Avios (≈ £6,44), pedido mínimo de £50 |
| Avios eStore, **cliente novo pelo app** | 800 Avios (≈ £7,36), pedido mínimo de £50 |
| Avios eStore, **cliente antigo** | 100 Avios (≈ £0,92), pedido mínimo de £50 |
| Nectar | Sempre, nas duas rotas |

Exemplos que o card deve conseguir mostrar:
- **£50, cliente novo:** Avios pelo app 800 (≈ £7,36) contra NX £5. Melhor:
  Avios pelo app.
- **£100, cliente novo:** NX £10 contra Avios 800 (≈ £7,36). Melhor: NX.
- **£50 ou mais, cliente antigo:** NX (£5 ou mais) contra Avios 100
  (≈ £0,92). Melhor: NX.
- **Abaixo de £50:** o Avios não paga. Melhor: NX.

O card pergunta (ou deixa escolher) "Já comprou no Sainsbury's pelo Avios
antes?" e "Vai comprar pelo site ou pelo app?".

**Para o código:** essa oferta é um **bônus fixo por pedido**, não "Avios por
£". A tabela `point_offers` só tem `earn_rate` (por £). Criar um jeito de
guardar bônus fixo: valor, tipo de cliente, canal (site ou app) e pedido
mínimo. O robô do Avios precisa ler a página "Sainsbury's Grocery" e ligá-la
à loja `sainsburys`. Hoje o Sainsbury's não tem nenhuma oferta de Avios no
banco.

### Boots (`nx-one4all-airtime-triple`)

- O slug tem um nome antigo, mas o conteúdo não usa One4all.
- Reescrever como comparação: NX 10% online, Avios 6 por £ (≈ 5,5%), Quidco
  (3% a 10%, conforme o produto) e desconto de gift card (Cheddar 4,5%).
  Mostrar a conta e a melhor opção.
- **Sem Argos**, que não está na rede NX.
- **O Airtime não soma com o NX.** O Airtime vale na loja física e o NX
  online. Fica como dica à parte: "comprando na loja física: Airtime".

## 3. Biblioteca, Playbook e Home

- **Biblioteca do e-book** (`src/pages/StrategyLibraryPage.jsx`):
  - voltar `NX_ROUTES_LIVE = true`;
  - reescrever as 3 rotas NX com as regras acima (NX + Airtime vira "Boots:
    compare"; Sainsbury's rota A com NX; Deliveroo com NX);
  - nada de One4all, de "21%" nem de soma do Airtime com o NX.
- **Playbook e Home:** devem voltar a citar as estratégias do NX, já
  ajustadas. Sem "21% Deliveroo" nem "11% Sainsbury's" como números fixos.
  Por exemplo: "NX: mínimo 10% em mais de 1.000 lojas parceiras" e
  "Sainsbury's: NX ou Avios — o app calcula o que vale mais".

## 4. Atualização dos dados: diária, não mensal

- **O dono decidiu:** a conferência é **diária** para todas as plataformas,
  NX inclusive. O app compara "em tempo real"; o mais perto disso é conferir
  uma vez por dia. **Não fazer robô mensal.**
- **Achado de 18/10:** a lista de lojas do NX **não é mais pública**. O
  endereço `/Home/AllRetailers/1173670` volta para a home quando não há
  login. Para ler a lista e as taxas, o robô diário precisa entrar com a
  conta do dono, como o robô já faz com o Quidco:
  - o dono cria os segredos do login do NX no GitHub, com guia do Cowork;
  - o robô entra uma vez por dia, lê a lista e as taxas, e **para se aparecer
    captcha ou bloqueio** (regra: nada de burlar proteção anti-robô);
  - grava `last_verified_at` = hora da leitura e `conditions` = "Minimum 10%"
    ou a taxa real lida.
- **Até o robô diário existir:** o Cowork atualiza a lista e as taxas com o
  dono logado no NX pelo Chrome.
- **Decisão do dono (18/10):** mostrar o NX **já**, com a data da lista
  ("Lista de parceiras NX conferida em …"). A regra dos 30 dias continua
  valendo para as taxas; o mínimo de 10% é regra do próprio NX.

## 5. O que muda no HANDOFF

Trocar o bloco "Estratégias do NX (18/10) — regras para a tarefa 3" por um
resumo deste arquivo. Em especial, **retirar**:
- "robô mensal" → passa a ser **diário**;
- "a estratégia só volta se a oferta NX tiver sido conferida nos últimos 30
  dias" → o NX aparece já, com a data da lista, e o Cowork atualiza com o
  dono logado;
- "a de 16% fica desligada" → as duas do Deliveroo viram **uma**, ajustada;
- "esconder as rotas NX da biblioteca" → **voltar com elas ajustadas**.

## 6. Feito pelo Cowork em 18/10, com o dono logado no NX

- **Lista de parceiras lida na área de membro:** 1.548 nomes, 1.477 sem
  contar os eGift. Os nomes estão em `ops.nx_partners`, com a data. Nenhum
  dado da conta do dono foi guardado.
- **Cruzamento com `stores`:** pela função `ops.nx_key(nome)`, mais apelidos
  em `ops.nx_aliases` (Sainsbury's, ASDA e Tesco, que no NX se chamam
  "… Groceries").
- **Banco atualizado, com aprovação do dono:**
  - 1.360 lojas com `in_nx_network = true`: 245 novas, e 204 que saíram da
    lista ficaram como `false`.
  - 1.360 ofertas `NX Rewards` ativas, uma por loja, com `rate = 10`,
    `conditions = 'Minimum 10% (NX partner list checked 18/10/2026)'` e
    `last_verified_at` de 18/10.
  - As ofertas NX das lojas que saíram e as repetidas ficaram inativas.
  - As 50 taxas acima de 10% que vinham de maio (ex.: Lebara 100%) voltaram
    para 10% até nova conferência. Os valores antigos estão em
    `ops.nx_backup_20261018_offers` e `ops.nx_backup_20261018_stores`.
- **Conferido no site depois:** o `/compare` da Deliveroo já mostra "NX
  Rewards £10.00" com a data de 18/10.
- **Erro encontrado no site (para o Claude Code corrigir primeiro):** o
  `/compare` monta combinações "Cheddar + NX Rewards £14.50", "EverUp + NX",
  "JamDoughnut + NX". **O NX não paga quando se paga com gift card.** O código
  das combinações (`src/lib/strategies.js`) nunca pode juntar gift card com
  NX.
- **Outras regras das Special Terms** (Boots, 18/10), que o card do NX deve
  mostrar:
  - compras pelo app da loja não pagam;
  - alguns produtos não pagam (na Boots: Dyson, Apple, Chanel, Dior, leite
    infantil e outros);
  - o cashback é sobre o valor líquido, sem entrega.
- **Achado:** a lista do NX de 18/10 ainda mostra itens "eGift", inclusive
  "One4all eGift". A regra do dono continua: **nenhuma estratégia com
  One4all**. Os eGift foram deixados de fora do cruzamento.
