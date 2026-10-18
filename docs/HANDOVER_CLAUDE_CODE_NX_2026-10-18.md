# Handover do Cowork para o Claude Code: NX Rewards (18/10/2026, tarde)

Leia antes `docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md`, versão da tarde. Ela
**substitui** a versão das 11h e as "regras do NX para a tarefa 3" que estão
no `docs/HANDOFF.md`.

## O que mudou e por quê

- O dono corrigiu o rumo: as estratégias do NX **não são retiradas, são
  ajustadas**.
  - O NX dá **no mínimo 10%** comprando pela plataforma NX, e isso tem que
    aparecer no app como sugestão.
  - Cada estratégia com NX vira uma **comparação com a conta à mostra** (NX,
    Avios eStore, cashback, gift card) e destaca a melhor opção.
  - O One4all nunca aparece.
- A versão das 11h mandava esconder as rotas NX e manter as 4 estratégias
  desligadas. Isso estava errado e foi o que você aplicou (0032 e
  `NX_ROUTES_LIVE = false`). Não é culpa sua: o Cowork registrou errado.
  Agora é para desfazer, ajustando.

## Já feito pelo Cowork (não refazer)

- A lista de parceiras foi lida na conta do dono: 1.548 nomes, em
  `ops.nx_partners`.
- O banco foi atualizado com aprovação do dono:
  - 1.360 lojas com `in_nx_network = true`;
  - uma oferta `NX Rewards` ativa por loja, a 10% ("Minimum 10% (NX partner
    list checked 18/10/2026)"), com data de 18/10;
  - cópia em `ops.nx_backup_20261018_*`.
- `deliveroo-advanced-avios` desligada: o Avios não tem Deliveroo.
- Conferido nas Special Terms do NX (Deliveroo e Boots): **"Cashback is not
  due on purchases of gift cards or paying for a purchase using gift cards or
  e-gift cards/codes."**

## Tarefas, em ordem (uma proposta por tarefa)

1. **Urgente:** `src/lib/strategies.js` não pode montar combinação de
   **gift card + NX**.
   - Hoje o `/compare` da Deliveroo mostra "Cheddar + NX Rewards £14.50" em
     1º lugar, e isso não paga.
   - Gift card continua podendo somar com Avios eStore e com outros sites de
     cashback, se for o caso. Com o NX, nunca.
2. **Estratégias do NX como comparação**, seção 2 da decisão:
   - **Deliveroo:** NX 10% contra Quidco e contra o gift card, sem soma. Junta
     `deliveroo-triple-stack` e `deliveroo-easy-combo` numa só, sem os números
     21% e 16%.
   - **Sainsbury's:** NX 10% (pagar com cartão) contra o bônus fixo do Avios
     eStore:
     - 700 Avios para cliente novo pelo site;
     - 800 Avios para cliente novo pelo app;
     - 100 Avios para cliente antigo;
     - pedido mínimo de £50.
     
     O card pergunta se o cliente é novo e se vai comprar pelo site ou pelo
     app, e mostra a conta e a melhor opção.
   - **Boots** (`nx-one4all-airtime-triple`): comparação NX, Avios, Quidco e
     gift card. Sem Argos. Airtime só como dica para a loja física.
   - Mostrar no card do NX:
     - que é por assinatura (mensalidade, 30 dias de teste);
     - as regras gerais: não vale com gift card, nem pelo app da loja, nem em
       alguns produtos.
   - Religar as estratégias só depois de reescritas. O dono quer elas no ar.
3. **Bônus fixo de Avios** no banco: um tipo de oferta para "N Avios por
   pedido", com tipo de cliente, canal e pedido mínimo.
   - O robô do Avios lê a página "Sainsbury's Grocery" do avios.com e liga à
     loja `sainsburys`.
   - Hoje o Sainsbury's não tem nenhuma oferta de Avios no banco.
4. **Biblioteca, Playbook e Home:**
   - `NX_ROUTES_LIVE = true`, com as 3 rotas reescritas pela regra nova;
   - Playbook e Home voltam a citar o NX ("mínimo 10% em mais de 1.000
     lojas"), sem 21% nem 11% fixos.
5. **Robô diário do NX**, não mensal (decisão do dono):
   - A lista de parceiras **exige login** desde 18/10. O endereço
     `/Home/AllRetailers/1173670` deslogado volta para a home. A área de
     membro fica em `cashback.nxrewards.com`, e a busca é
     `/moreinfo/pgsearchm?type=merchant&keywords=…`.
   - O robô entra com a conta do dono, igual ao Quidco. O dono cria os
     segredos no GitHub com guia do Cowork. **Nunca pedir a senha no chat.**
   - Uma vez por dia, ler a lista e as taxas e gravar com a data. **Parar se
     aparecer captcha ou bloqueio.**
   - Não rebaixar taxa real já conferida.
   - Reaproveitar `ops.nx_partners`, `ops.nx_key()` e `ops.nx_aliases`.
6. **HANDOFF:** trocar o bloco "Estratégias do NX (18/10) — regras para a
   tarefa 3" por um resumo da decisão da tarde.

## Regras que continuam valendo

- Nada de anti-robô.
- Confirmar com o dono antes de mudanças grandes no banco.
- O merge é sempre do dono.
- Falar com ele em português, passo a passo.
