# Handoff — estado do SnapGain em 17/10/2026 (noite)

Escrito para que outra sessão do Claude (por exemplo, o Claude Cowork) continue
o trabalho sem a conversa anterior. **Este repositório é público:** aqui não há
segredo nenhum, e nenhum segredo, e-mail de cliente ou dado pessoal deve entrar
aqui.

## Regras do dono (valem sempre)

- Nunca colocar chave, token ou senha no chat, no código ou em documentos.
  Nunca pedir que o dono cole uma.
- Não copiar dados de outro site comparador (ex.: Scrimpr) sem licença.
- Não citar plataformas parceiras no texto de marketing público (tabelas de
  comparação e páginas legais podem).
- Confirmar antes de qualquer coisa externa ou difícil de desfazer (publicar,
  transferir, apagar, trocar chaves). "Pode publicar" vale só para o que foi
  pedido.
- Admin é `user_profiles.role = 'admin'`, definido só no servidor. Nunca ler
  admin de `user_metadata`.
- Não construir nada para burlar proteção anti-robô dos sites.
- Não rodar nem agendar `nx-network-sync`.

**Como falar com o dono:** sempre em português. Para qualquer passo que só ele
pode fazer, uma ação por vez: onde clicar, o que ele deve ver e o que fazer se
vir outra coisa. Juntar as perguntas numa mensagem só (ele paga por ida e
volta). Ele gosta de responder perguntas "ao vivo" (caixa de múltipla escolha)
sem que a conversa termine.

## Onde está cada coisa

| Peça | Onde |
|---|---|
| Site (este repo) | GitHub `Denysmelo2/src`, branch `main` → Vercel projeto `snapgainuk` (time `denys-projects-58b82b39`) → **snapgain.uk**. Todo merge em `main` publica sozinho. |
| Robô de coleta | GitHub `Denysmelo2/snapgain-scraper` (privado, GitHub Actions) |
| Loja de e-books | `Denysmelo2/snapgain-shop` → snapgain.shop |
| Banco, login, Edge Functions, cron | Supabase `ffowgyjdbgkphsflxybk` (região eu-west-2, Londres) |
| Pagamentos | Stripe conta "SnapGain" (`acct_1SfK3t9xccsM1Iim`), **modo real**. Preços: £14,99/mês `price_1TWkUQ9xccsM1IimtvrHpqeJ`, £120/ano `price_1TWkWA9xccsM1IimCfIOh98u`. |
| Backup do banco | `snapgain-scraper` → workflow `db-backup` (todo dia 02:30 UTC, guarda 30 dias como artifact privado). Contém e-mails de clientes: tratar como dado pessoal. |

**Limites das ferramentas:** a chave do Stripe ligada ao Claude **só lê**
(criar configuração do portal ou cancelar assinatura dá `Forbidden`). Essas
ações o dono faz no painel do Stripe. Logs de job do GitHub são lidos pela
ferramenta `get_job_logs` do MCP do GitHub. A função `source-probe` foi
arquivada em 16/10.

## Decisões do dono (16 e 17/10/2026)

- **TopCashback e vale-presentes da Quidco saíram do site** (16/10, migrations
  0014 e 0017; nada foi apagado, ver `ops.retired_offers`). O **robô do Mac**
  (`scrape-member.yml`, Chrome da Bárbara via Tailscale) está **desligado de
  propósito** (`member-scrape-dispatch` com `active = false`). Não religar.
  O vale-presente da TopCashback (`tc-giftcards`) está fora de todas as listas.
- **Único disparo automático do robô:** `daily-scrape-dispatch` às **08:00 de
  Londres** (migration 0018: pg_cron às 07:00 e 08:00 UTC, só dispara quando é
  08:00 em Londres). Não existe mais `schedule` no GitHub (PR
  Denysmelo2/snapgain-scraper#38). Lista diária: jamdoughnut, quidco, picodi,
  avios, cheddar, everup. Outros crons que continuam: backup 02:30 UTC,
  `platforms-meta-sync` 04:00 UTC, `daily-boost-digest` 08:00 UTC.
- **Quem vende:** autônomo (sole trader), sem empresa. O site deve dizer
  "SnapGain is a trading name of Denys Ferreira Goncalves de Melo (sole
  trader)", com o endereço que o dono passou (está no PR #123) e
  `support@snapgain.uk`. **Não ligar o SnapGain à Voce Lindx Ltd.** Sem IVA.
- **Reembolso:** proporcional. No checkout o cliente marca que quer começar já;
  se cancelar em 14 dias recebe de volta a parte não usada. Depois de 14 dias,
  cancela quando quiser e usa até o fim do período pago.
- **Teste grátis de 7 dias:** do próprio SnapGain (sem cartão, não vira plano
  pago sozinho). Não usar trial do Stripe.
- **Administradores:** ficam três contas: a do dono, a da Bárbara
  (`babiferreir@…`) e a segunda conta do dono (`denysferreir@…`). As outras
  são rebaixadas (migration 0023 do pacote B; os UUIDs estão lá).
- **App de doces da Bárbara** (hoje no mesmo banco): o dono decidiu (17/10)
  que **não faz parte do SnapGain** e deve ser separado, sem apagar nada. Não
  aplicar `supabase/held-migrations/0021` nem mexer nas tabelas `doces_*` sem
  falar com o dono. Ainda falta descobrir onde o app de doces está publicado.
- **Apagar conta:** permitido mesmo com assinatura ativa. A função
  `delete-account` cancela a assinatura e apaga o cliente no Stripe, depois
  apaga o usuário. Reembolso proporcional nos 14 dias continua manual.
- **Uma conta por pessoa** (sem plano família).
- **BA/Avios** no marketing: trocar por termos genéricos.
- **Registro no ICO e no HMRC:** o dono só vai fazer quando o site estiver 100%
  pronto para vender. Não cobrar antes disso, só lembrar no fim.

## Estado dos três pacotes de conserto (auditoria de 11/10)

### Pacote A — Pagamentos: FEITO
- PR Denysmelo2/src#121 mesclado e no ar (17/10).
- Edge Functions publicadas: `create-checkout-session` (verify_jwt true),
  `stripe-webhook` (verify_jwt false; confere a assinatura do Stripe),
  `create-portal-session` (verify_jwt true).
- Corrigido: cancelamento/renovação não chegavam ao banco (formato novo da API
  do Stripe); troca de plano criava segunda assinatura; caixa de consentimento
  dos 14 dias obrigatória (gravada nos metadados do Stripe).
- Não havia avisos do Stripe com falha para reenviar (conferido em 17/10).

**Falta no A (passos do dono no painel do Stripe):**
1. Criar o **portal do cliente**: Settings → Billing → Customer portal. Ligar
   cancelar no fim do período, atualizar cartão, trocar entre mensal e anual
   (os dois preços acima), histórico de faturas; links de privacidade e termos
   do site. Sem isso, "Manage subscription" mostra erro.
2. **Cancelar a assinatura anual criada à mão** (`sub_1TaH9F…`, sem cartão, não
   ligada a nenhuma conta). Depois disso, corrigir no banco o perfil que foi
   marcado "active" à mão (o único com `subscription_status = 'active'` e sem
   `stripe_customer_id`): `subscription_status = null`. Confirmar com o dono.
3. Teste real: o dono assina pelo site, confere que vira premium, cancela pelo
   portal e confere que o banco mostra `canceled` no fim do período. Roteiro em
   `SETUP_STRIPE.md` §6.

### Pacote B — Segurança: FEITO (PR Denysmelo2/src#122, mesclado 17/10)
- Aplicadas no banco: 0019 (visitante só lê o catálogo), 0022 (FK do revisor
  com SET NULL), 0023 (admins: só as três contas), 0024 (e-mail diário só para
  quem ligou). **0020 (política de INSERT de `user_preferences`) ainda não
  entrou:** o `apply_migration` deu tempo esgotado três vezes sem erro e sem
  aplicar. Nada no site grava essa tabela hoje. Tentar de novo.
- 0021 (doces) fica em `supabase/held-migrations/` e não deve ser aplicada.
- `delete-account` publicada (verify_jwt true). O caminho do Stripe
  (`customers.del`) ainda não foi testado de verdade.
- Funções antigas ainda no Supabase (não estão no repo; a ferramenta MCP não
  apaga função, então o dono apaga no painel se quiser): user-registration,
  subscription-handler, auth-callback, platform-comparison, topcashback-uk,
  jamdoughnut-uk, amazon-uk, simulate. Todas com verify_jwt true.
- **Passos do dono no painel do Supabase:** ligar "leaked password
  protection" e MFA para admins. Ligar Captcha só depois que o widget do
  hCaptcha estiver no formulário (ainda não está).

### Pacote C — Textos legais e telas: FEITO (PR Denysmelo2/src#123, mesclado 17/10)
- Textos legais, banner de cookies, aceite dos termos, aviso de afiliado,
  identidade do vendedor e canal de reclamação no ar. Prazos de reclamação
  confirmados pelo dono: 2 dias úteis para confirmar, 14 dias para responder,
  registros por 3 anos.
- `daily-boost-digest` publicada de novo (versão opt-in).
- O texto legal final precisa da revisão de um solicitor do Reino Unido.

O PR do robô (Denysmelo2/snapgain-scraper#38) também foi mesclado: o único
disparo automático é o das 08:00 de Londres.

### Lojas duplicadas (tarefa 1 do handover do Cowork, 17/10)
- Causa: a busca do robô pelo endereço curto da loja não lia `merged_into`.
  As lojas juntadas em 05/07 (`bootscom`, `asos-uk`, `nike-uk`…) continuavam
  recebendo ofertas que o site não mostra. Correção no robô:
  Denysmelo2/snapgain-scraper#39.
- Migration 0025 (aplicada): 326 ofertas válidas foram para a loja principal.
  Cópia em `ops.store_merge_fix_20261017` e `…_stores`. Boots, ASOS e Nike
  mostram Avios de novo.
- KiwiCo e KiwiCo UK estavam juntadas por engano com Kiwi.com. O dono decidiu
  (17/10) que KiwiCo **não faz parte do SnapGain**: ficaram inativas, com a
  coluna nova `stores.excluded_at`, e o robô não as reativa.
- 74 grupos de lojas com o mesmo nome revisados pelo dono com o Cowork
  (`docs/DECISAO_LOJAS_REPETIDAS_2026-10-17.md`, branch
  `docs/handover-cowork-2026-10-17`). Migration 0026 (aplicada em 18/10):
  69 pares juntados, com as ofertas movidas e cópia em
  `ops.store_merge_fix_20261018` e `…_stores`. Os 5 pares mantidos separados
  (braun, manomano, mission, national-trust, perfume) não foram tocados.
  `manomano` foi renomeada para "ManoMano". Gap, Sonos e Travelodge mostram
  cashback e Avios juntos.
- O robô não recria as lojas repetidas: toda busca dele segue `merged_into`
  desde a correção snapgain-scraper#39.

### Avios contra cashback (tarefa 2, 18/10)
- Decisão do dono: 1 Avios = **0,92p** em todo o site; o Avios continua
  mostrado **só em pontos**. Migration 0027 (aplicada) pôs 0,92p nos dois
  programas Avios do banco. A tela não muda.
- Com o Cowork (`docs/PARA_COWORK_TAREFA2_2026-10-18.md`): conferir no site o
  Avios de Boots, ASOS, Nike, Gap, Sonos e Travelodge, e pesquisar com o dono o
  valor certo dos outros programas de pontos. A Lufthansa está a £1,10 por
  milha, a TAP e a Tesco a £1,00 por ponto.

## O que ainda falta para "100% pronto para vender"

1. Stripe (dono, no painel): terminar o portal do cliente (trocar de plano com
   os dois preços, faturas, cartão, links de privacidade e termos, Save) e
   cancelar a assinatura anual criada à mão. Depois: corrigir no banco o
   perfil marcado "active" à mão (`subscription_status = null`, confirmar com
   o dono) e o teste real de assinar e cancelar (`SETUP_STRIPE.md` §6).
2. Aplicar a 0020. Separar o app de doces do SnapGain.
3. hCaptcha no cadastro, login e "esqueci a senha"; depois ligar Captcha no
   Supabase.
4. Revisão do texto legal por um solicitor.
5. Registro no ICO (taxa anual de cerca de £52, como sole trader) e no HMRC
   (Self Assessment), e pôr o número do ICO na política de privacidade (há um
   TODO no código).
6. Preparar para a lei de assinaturas (DMCC Act, prevista para janeiro de
   2027): aviso antes de cada renovação, segundo período de 14 dias depois de
   renovação anual, cancelamento online fácil.
7. Pequenos: texto "real-time" no meta de `App.jsx`; confirmar regiões e
   retenção do Sentry, Resend e GA; o registro de UTM no cadastro
   (`signup_attributions`) falha quando o e-mail ainda não foi confirmado,
   porque o visitante não grava mais nessa tabela (as UTMs ficam no
   `user_metadata`).

## Como conferir as coisas

- Disparos do cron: `select jobid, jobname, schedule, active from cron.job;`
  e `select * from cron.job_run_details order by start_time desc limit 10;`
- Resposta dos disparos ao GitHub: `select id, status_code, created from
  net._http_response order by id desc limit 10;` (204 = ok).
- Rodadas do robô: GitHub Actions do `snapgain-scraper`, workflow
  `daily-scrape`.
- Deploy do site: Vercel, projeto `snapgainuk`; o alias `snapgain.uk` aponta
  para o último deploy de produção de `main`.

## Histórico anterior (10–11/10/2026, resumido)

- Robô diário consertado (EverUp lido por HTTP, Picodi mais rápido), ofertas
  com mais de 30 dias escondidas (`hiddenBeforeIso` em
  `src/lib/dataFreshness.js`; `/admin/rates` ainda mostra).
- Disparo pelo pg_cron com token do GitHub no Vault (`github_dispatch_token`,
  só "Actions: read and write" no snapgain-scraper).
- Rotação da chave legada `service_role` ainda pendente; depois de qualquer
  rotação, atualizar o segredo `service_role_key` do Vault.
- EverUp e Airtime: sem dados públicos; o dono pediu feed às empresas. Até lá,
  taxas mantidas à mão em `/admin/rates`.
