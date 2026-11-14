# Handover Cowork → Code — 14/11/2026 (testes antes da divulgação)

O dono pediu "todos os testes necessários antes da divulgação". Cowork testou
dados, ranking, banco, Edge Functions, Stripe e as páginas públicas. O resultado
geral é bom: nenhuma taxa absurda, NX nunca abaixo de 10%, robôs rodaram hoje
(08:00, 09:00 e backup), Stripe live com £7.99/mês e £60/ano e webhook ativo,
RLS fechando todas as tabelas de usuários para visitantes.

Ficaram as tarefas abaixo, em ordem de prioridade. As tarefas A2 e B do
handover de 08/11 (robô no Chromium; `.env.local` fora do repo) continuam
abertas e vêm antes destas.

## Tarefa C — duas Edge Functions aceitam a chave pública (segurança, antes da divulgação)

`nx-network-sync` e `cj-sync` estão com `verify_jwt=true`, mas isso só exige
um JWT válido, e a chave publishable do site serve. Teste de hoje, como
visitante anônimo:

```
POST /functions/v1/nx-network-sync  (apikey + Bearer = chave publishable)  → 200, "wrote": true, floorRefreshed 1705
POST /functions/v1/cj-sync          (mesma chave)                           → 200, offersUpserted 1
```

Qualquer pessoa que abra o site pode disparar as duas, quantas vezes quiser,
e cada chamada escreve no banco. `dryRun` no corpo foi ignorado pelo
`nx-network-sync` (o relatório voltou com `"dryRun": false`).

Pedido:
1. Nas duas, exigir `X-Internal-Key` (INTERNAL_SYNC_KEY) ou o service role no
   Authorization, igual ao `isAuthorized` de `source-alert`. Recusar com 401
   qualquer outra coisa.
2. Conferir que nenhum agendamento ou workflow chama essas funções com a
   chave pública (pg_cron hoje não chama nenhuma das duas).
3. `nx-network-sync`: ler `dryRun` também quando vier no corpo como
   `{"dry_run": true}` ou na query `?dry_run=1`, ou documentar qual forma vale.
4. `cj-sync`: cada chamada criou uma oferta nova com `rate = null` e o link de
   um produto (Coffee Friend), em vez de atualizar a mesma linha. Duas
   chamadas = duas linhas. Cowork desativou as duas (`is_active=false`, nota
   em `conditions`). A função precisa de chave única por loja+plataforma, e
   não deve gravar oferta sem taxa.

Depois do merge, Cowork faz o deploy das duas e repete o teste anônimo
(esperado: 401).

## Tarefa D — Sainsbury's mostra duas rotas Avios iguais no topo

Em £100 o /compare mostra:

```
1. British Airways Avios — £22.08  2,400 Avios per order (new customers · app · min £50)
2. British Airways Avios — £19.87  2,160 Avios per order (new customers · website · min £50)
3. NX Rewards — £10.00
```

São a mesma oferta (cliente novo) em dois canais. Mostrar só a melhor por
`customer_type`, com o outro canal numa linha de detalhe. E deixar claro no
cartão que é só para cliente novo; o cliente existente ganha 288 Avios
(~£2.65), não £22. O boost acaba quando a Sainsbury's tirar; o robô avisa e
Cowork volta para 800/700/100.

## Tarefa E — busca mostra lojas sem nenhuma oferta (antes da divulgação, se der)

2.418 das 7.144 lojas ativas não têm nenhuma oferta válida nos últimos 14
dias. A busca devolve essas lojas no mesmo nível das outras. Exemplos:

- "John Lewis" → aparece `john-lewis` (vazia) ao lado de `john-lewis-and-partners` (NX, Cheddar, Avios).
- "Booking" → `bookingcom` e `bookingcom-uk`, as duas vazias desde que o Picodi saiu.
- Next e Zara: vazias desde o Picodi (04/11).

A página da loja já tem o estado vazio ("No offers tracked for … yet"), então
nada quebra. Pedido: na busca, ordenar primeiro as lojas com oferta viva, e
marcar as outras ("no offers yet") ou escondê-las. Sem mudança de dados:
Cowork não desativa lojas em massa.

## Tarefa F — pequenas

- Página que não existe responde HTTP 200 (SPA). Para SEO, a rota 404 deveria
  devolver `<meta name="robots" content="noindex">`, já que o Vercel não manda 404.
- `sitemap.xml` lista páginas que exigem login e caminhos `/auth/*`, que o
  `robots.txt` bloqueia. Tirar do sitemap.

## O que Cowork já conferiu (sem ação)

- Ranking em £100 para 30 lojas populares: valores coerentes; `check-curated.mjs` sai 0.
- Taxas > 25% de cashback são de VPN, antivírus, estacionamento de aeroporto
  (Quidco paga isso mesmo). Gift card > 20%: só Fabyouless 30% (JamDoughnut).
- `user_profiles.role` não pode ser escrito pelo usuário (só SELECT/DELETE em
  coluna); `is_admin()` lê só `user_profiles`.
- Visitante anônimo: 401 em checkout, portal, delete-account, rate-entry;
  `stripe-webhook` exige assinatura; `source-alert` e `daily-boost-digest` 401.
- Advisor de segurança: só avisos já conhecidos (GraphQL visível, extensões em
  public, proteção de senha vazada que exige plano Pro). Pendente separado:
  `doces_barbara_availability_blocks` com INSERT/DELETE público, que espera o
  login da Doces no ar.
