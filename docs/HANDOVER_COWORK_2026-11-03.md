# Handover para o Cowork — 03/11/2026 (Claude Code)

O dono pediu uma conferência completa antes da divulgação:

- os robôs;
- o código do app;
- o cadastro seguro;
- as políticas de acordo com a lei britânica;
- a busca mostrando primeiro as porcentagens mais altas.

Abaixo está o que o Code conferiu e o resultado. Depois vem o que fica com
o Cowork, em ordem.

## Parte A. O que o Code conferiu (03/11)

### Robôs

| Robô | Fontes | Agendamento (pg_cron) | Situação |
|---|---|---|---|
| 08:00 `scrape-daily` | JamDoughnut, Cheddar, EverUp | `daily-scrape-dispatch` ligado | Picodi saiu da lista em 03/11 (scraper #49, decisão do dono) |
| 09:00 `member-scrape` (Mac) | NX, Quidco, Avios | `member-scrape-dispatch` ligado | verde de 30/10 a 03/11; em 03/11 gravou NX 09:01, Quidco 09:36, Avios 09:55 |
| 12:00 `source-alert` | as fontes acima | `source-stale-alert` ligado | Picodi sai da lista vigiada no src#152 |

- **Airtime:** 43 ofertas, última verificação em 20/05/2026.
  - Não há robô para ela.
  - A regra dos 30 dias já esconde essas ofertas do site.
  - Nada a fazer, a não ser que o dono queira desativá-las de vez.

### App

- `npm run build` passa.
- **Busca:**
  - a busca leva para `/compare?store=…&amount=…`;
  - as ofertas vêm do banco ordenadas por taxa, da maior para a menor (`useCatalog.js`);
  - as rotas são ordenadas por retorno em £, do maior para o menor (`ComparePage.jsx`, `strategies.js`);
  - para o mesmo valor de compra, isso é o mesmo que a porcentagem mais alta primeiro.
- **Ofertas com mais de 30 dias:** ficam escondidas (`hiddenBeforeIso`).
- **Regras de soma:**
  - gift card não soma com NX, com Quidco, nem com o Avios eStore;
  - **gift card + Picodi agora também não soma** (src#152, decisão do dono de 26/10).

### Cadastro e banco

- **Tabelas de clientes:** o RLS só deixa cada usuário ver e alterar as próprias linhas. Foram conferidas:
  - `users`, `user_profiles`, `user_accounts`, `user_preferences`;
  - `user_simulations`, `saved_strategies`, `user_cards`, `user_sessions`;
  - `recent_searches`, `user_favourites`, `user_cashback_platforms`;
  - `user_miles_programs`, `user_notification_prefs`, `signup_attributions`.
- **Admin e Premium não podem ser forjados:**
  - `is_admin()` lê `user_profiles.role`;
  - o cliente só consegue gravar 3 colunas de `user_profiles`: `last_alerts_seen_at`, `onboarding_done` e `updated_at`;
  - plano e assinatura são gravados só pelo servidor (Stripe webhook).
- **Formulários de cadastro, login e "esqueci a senha":** enviam o token do hCaptcha quando a chave do site está configurada.
- **Site em produção:** tem HSTS, CSP (com hCaptcha, Supabase, Sentry UE e GA liberados), `X-Frame-Options: DENY` e `nosniff`.

### Políticas (lei do Reino Unido)

- **Privacidade:**
  - identidade e endereço;
  - número do ICO ZC289967;
  - base legal por finalidade;
  - retenção;
  - transferências internacionais (UE com adequação; empresas dos EUA com IDTA/Addendum);
  - direitos do titular;
  - reclamação primeiro para nós e depois para o ICO.
- **Cookies (PECR):** o GA4 só carrega depois do aceite (`lib/observability.js`). Antes disso só funciona o armazenamento estritamente necessário.
- **Termos e Reembolso:**
  - Consumer Rights Act e Consumer Contracts Regulations;
  - direito de cancelar em 14 dias, com pedido expresso para começar já e reembolso proporcional, numa caixa de seleção no checkout (`PricingPage.jsx`);
  - renovação automática explicada;
  - lei de Inglaterra e País de Gales;
  - sem IVA (empresa não registrada).
- **Afiliados (ASA/CAP):** o aviso de comissão aparece no rodapé, na landing, no FAQ e nas políticas.

## Parte B. O que fica com o Cowork, em ordem

### 1. Depois do merge do src#152

- Publicar a Edge Function **`source-alert`**. Não há migração nem segredo novo.
- Conferir com `?dry_run=1`: a Picodi não aparece na lista.
- O resto do PR é front-end, publicado pela Vercel sozinha.

### 2. Supabase → Authentication (o Code não tem acesso a essas telas)

1. **Attack Protection → Captcha:** confirmar que o hCaptcha está **ligado**, com o segredo novo.
   - Se ainda estiver desligado: primeiro confirmar o passo 3 abaixo, depois ligar.
2. **Leaked password protection:** **ligar**. O aviso de segurança do Supabase em 03/11 diz que está desligado. Ele bloqueia senhas que já vazaram (HaveIBeenPwned).
3. **Tamanho mínimo da senha:** subir para **8**. O padrão do Supabase é 6.

### 3. Vercel

- Confirmar que `VITE_HCAPTCHA_SITE_KEY` está em **Production**, com a chave do site (formato UUID, não a que começa com `ES_`).
  - O Code recebeu 403 ao listar as variáveis.
- Em uma janela anônima, abrir `/auth/signup`, `/auth/login` e `/auth/request-reset`: o quadro do hCaptcha tem que aparecer nas três.

### 4. Teste completo como visitante, antes da divulgação

Esta é a mesma lista do handover de 26/10. Fazer no celular e no computador.

1. Cadastro com e-mail novo, com hCaptcha.
2. O e-mail de confirmação chega (Resend, Irlanda) e o link funciona.
3. O teste grátis começa e aparece no perfil.
4. Busca: "Tesco", £100.
   - A primeira rota é a de maior retorno.
   - Nenhuma rota soma gift card com NX, Quidco, Picodi ou Avios eStore.
5. Checkout:
   - a caixa dos 14 dias é obrigatória;
   - o Stripe cobra o valor mostrado.
6. Portal do Stripe:
   - cancelar;
   - o app mostra "Ends" e "Reactivate".
7. "Esqueci a senha" funciona.
8. Excluir a conta em Configurações apaga os dados.

### 5. Robôs, amanhã (04/11)

- **08:00:** a rodada tem só JamDoughnut, Cheddar e EverUp.
- **09:00:** NX, Quidco e Avios verdes.
- **Quidco:** continua desativando de 60 a 80 ofertas por rodada. É só observar; se passar de 150, avisar o Code.

## Parte C. Decisões que esperam o dono

1. **345 ofertas da Picodi ainda ativas** (última verificação 02–03/11):
   - opção 1: desativar agora;
   - opção 2: deixar que sumam sozinhas pela regra dos 30 dias, por volta de 02/12.

## Parte D. Como o Code e o Cowork se falam

- O Code escreve o PR e diz em "After the merge" o que publicar ou aplicar.
- O Cowork publica e aplica, e responde no PR ou no próximo handover.
- O dono faz o merge.
- Um handover novo em `docs/` a cada rodada de tarefas, com data no nome.
