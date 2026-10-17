# Handoff — estado do SnapGain em 17/10/2026

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
- **Administradores:** ficam só o dono e a Bárbara.
- **App de doces da Bárbara** (mesmo banco): fechar as permissões (público só
  lê, só admin grava). Ver o aviso no pacote B: isso quebra o app de doces
  hoje.
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

### Pacote B — Segurança: PR Denysmelo2/src#122 (rascunho, aguardando o dono)
- Migrations 0019–0024 (permissões do `anon`, política de `user_preferences`,
  doces, FK `reviewed_by`, rebaixar admins, digest desligado por padrão no
  banco), função nova `delete-account` (apagar conta e baixar dados), remoção
  de funções antigas, cabeçalhos de segurança (CSP etc.) no `vercel.json`,
  remoção dos scripts "Horizons" do `vite.config.js`.
- **Antes de aplicar:**
  - 0023 tem um marcador para o UUID da conta da Bárbara e não roda sem ele.
    Perguntar ao dono qual conta é a dela (a lista com e-mails foi mostrada só
    no chat, não está no repo; refazer com SELECT em `auth.users`).
  - **Segurar a 0021 (doces):** o app de doces grava sem login e aceita upload
    de foto de cliente sem login. Aplicar a 0021 quebra os dois. Precisa de
    decisão do dono (login de admin de verdade no app de doces e outra forma
    de upload).
- **Depois do merge:** aplicar 0019, 0020, 0022, 0023, 0024 (nessa ordem);
  publicar `delete-account` (verify_jwt true); apagar no Supabase as funções
  antigas: user-registration, subscription-handler, auth-callback,
  platform-comparison, topcashback-uk, jamdoughnut-uk, amazon-uk, simulate.
- **Passos do dono no painel do Supabase:** ligar "leaked password
  protection" e MFA para admins. Ligar Captcha só depois que o widget do
  hCaptcha estiver no formulário (ainda não está; passos no corpo do PR #122).

### Pacote C — Textos legais e telas: PR Denysmelo2/src#123 (rascunho)
- Reescreve Privacidade, Termos, Reembolso e Cookies (lei do Reino Unido em
  10/2026: UK GDPR + DUAA 2025, PECR, CCR 2013, CRA 2015, CAP Code), banner de
  cookies com opção de recusar e "Cookie settings" no rodapé, aceite dos termos
  no cadastro, telefone opcional, "Forgot password?", aviso de comissão de
  afiliado, frases de marketing corrigidas, BA/Avios genéricos, identidade do
  vendedor no rodapé, canal de reclamação, digest opt-in.
- Estava em conflito com o A em `PricingPage.jsx`; foi pedido ao ajudante
  para mesclar `main` e resolver. Conferir antes de publicar.
- Depois do merge: publicar de novo a Edge Function `daily-boost-digest`.
- O texto legal final precisa da revisão de um solicitor do Reino Unido.

## Outros PRs abertos

- Denysmelo2/snapgain-scraper#38: tira o `schedule` do GitHub (só fica o
  disparo das 08:00) e o `tc-giftcards` da lista. Pronto para publicar.
- Denysmelo2/src#120: migration 0018 (já aplicada) + este documento.

## O que ainda falta para "100% pronto para vender"

1. Portal do Stripe, cancelar a assinatura manual e o teste real (pacote A).
2. Aprovar e publicar B (com a conta da Bárbara e a decisão dos doces) e C.
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
   retenção do Sentry, Resend e GA.

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
