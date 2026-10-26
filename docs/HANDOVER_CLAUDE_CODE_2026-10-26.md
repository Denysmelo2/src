# Handover do Cowork para o Claude Code (26/10/2026)

Substitui a lista de tarefas do handover de 25/10. As regras daquele e dos
anteriores continuam valendo. Este repositório é público: aqui não há
segredo, e-mail de cliente nem dado pessoal.

## Parte A. Como Cowork e Code trabalham juntos (vale sempre)

Objetivo: cada um faz a sua parte com qualidade, sem um estragar o resultado
do outro.

### Quem faz o quê

| | Claude Code | Claude Cowork | Dono (Denys) |
|---|---|---|---|
| Código (site, robôs, funções, migrações) | escreve e abre o PR | revisa o PR | faz o merge |
| Banco de produção (aplicar migração, mudar dados) | **não** | aplica, depois do merge | aprova mudanças grandes |
| Edge Functions do Supabase | **não** publica | publica, depois do merge | — |
| Vercel (ligar/desligar repositório) | **não** | só com aprovação do dono | aprova |
| Segredos e chaves | **nunca** | só confere por digest | cola no painel |
| Disparar robôs à mão, painéis (Stripe, Supabase, Vercel) | não | sim | clica quando precisa |
| Mac do robô (Chrome, Tailscale, logins) | não | guia o dono | faz |

### Fonte da verdade

- O que fazer: o handover mais novo em `docs/` (este). Os antigos ficam
  como histórico.
- `HANDOFF.md` na raiz é de julho/2026 e está **obsoleto**: fala em stealth
  e em caminhos do Windows. Não seguir (ver tarefa 7).
- O que foi feito: os PRs com merge e a seção "Depois do merge" de cada um.

### Combinado de entrega

1. **Um PR por vez.** O próximo só começa depois do merge do anterior,
   salvo quando este handover diz que dois podem andar juntos.
2. **Todo PR termina com a seção "Depois do merge (dono/Cowork)".** Ela diz,
   em ordem, o que aplicar, publicar e conferir. O Code já faz isso; manter.
3. **Antes de agir, o Cowork lê os PRs com merge desde a última conferência**
   e a seção "Depois do merge". Em 26/10 o Cowork propôs tirar a Picodi da
   rodada sem ter visto que o #45 já tinha entrado. Não repetir.
4. **Ordem quando há duas peças:**
   - migração antes da função que usa a coluna;
   - site novo antes da política que fecha o acesso antigo;
   - front enviando o token antes de ligar o Captcha no Supabase.

   O PR diz a ordem; o Cowork segue.
5. **Dúvida de regra de negócio** vai como pergunta no PR ou no handover. O
   Cowork leva ao dono. Não decidir sozinho.

## Parte B. Estado em 26/10/2026, 10:30

- **Tarefa 1 de 25/10 (Picodi, 30% falso):** PR #45 entrou às 09:57. O
  Cowork desligou 377 ofertas falsas e guardou cópia em
  `ops.picodi_fake30_backup_20261026`. A Temu fica, porque os 30% dela são
  reais. O primeiro teste real é a rodada das 08:00 de 27/10, que o Cowork
  confere.
- **Tarefa 2 (Ends / Reactivate):** PR #147 com merge. Migração 0041
  aplicada. `stripe-webhook` v21 publicado depois da migração. Site no ar.
- **Tarefa 3 (Mac):** PR #46 revisado pelo Cowork. Está bom e espera o
  merge do dono.
- **Robô das 09:00 em 26/10:**
  - NX e Avios leram normalmente.
  - O Quidco mostrou uma página de checagem do Cloudflare, e o robô parou
    sem tocar no banco, como manda a regra.
  - Correção é do dono no Chrome do Mac. **Nada para o Code.**
- **Decisões do dono em 26/10:**
  - Gift card + Picodi: **nunca somar**.
  - A conta da Bárbara **continua admin**.
  - A tabela dos Doces **fecha já**, com login real da Bárbara no `/admin`
    dos Doces.

## Parte C. Sequência até a divulgação (Code)

Em ordem. Um PR por vez.

### 1. Gift card nunca soma com a Picodi (src, pequeno)

- `src/lib/strategies.js`, bloco "Stack: gift_card × cashback": incluir a
  Picodi no filtro, igual ao NX e ao Quidco (#144).
- No comentário: decisão do dono em 26/10/2026, até confirmar as regras da
  Picodi.
- Teste: Tesco com £100 não mostra nenhuma rota "gift card + Picodi".
- Hoje, sem NX, Quidco e Picodi, quase nenhuma plataforma de cashback sobra
  para somar. Conferir que a tela continua bem quando não há nenhum stack.

### 2. hCaptcha no cadastro, login e "esqueci a senha" (src)

- O `HCaptchaForm.jsx` existe, mas as telas reais não usam.
- Passar `captchaToken` em `signUp`, `signInWithPassword` e
  `resetPasswordForEmail`.
- A chave do site é pública (`VITE_HCAPTCHA_SITE_KEY`). O segredo do
  hCaptcha só vai no painel do Supabase, pelo dono.
- Login com Google não leva captcha.
- **Ordem no "Depois do merge":**
  1. site no ar;
  2. o Cowork testa cadastro e login com o captcha aparecendo;
  3. só então o dono liga o Captcha no Supabase.

  Ao contrário, todo login quebra.

### 3. NX começa a gravar (scraper + src) — merge a partir de 01/11, antes de 17/11

- A semana só de leitura termina em 01/11. Se não houver gravação, as 1.360
  ofertas NX somem do site por volta de 17/11 (regra dos 30 dias).
- Mesmas regras de sempre:
  - nunca baixar uma taxa sem conferir;
  - nunca somar com gift card;
  - lojas repetidas pelo mapa já decidido;
  - parar e avisar em login, captcha ou bloqueio.
- Em 25/10 e 26/10 o relatório mostrou 26 taxas que sobem, 2 lojas novas e
  28 lojas que sairiam. Para as 28, decidir no PR: desligar já ou só depois
  de dois dias seguidos fora da lista. Perguntar ao dono pelo Cowork.
- No src, `supabase/functions/source-alert/index.ts`: incluir
  `'nx rewards'` em `WATCHED`. O Cowork publica depois do merge.
- Pode ser preparado agora; o PR diz "merge a partir de 01/11".

### 4. Doces: login real no `/admin` e tabela fechada (doces-barbara + src)

- Hoje o `/admin` dos Doces compara a senha com `VITE_ADMIN_PASSWORD`, que
  vai dentro do JavaScript público. Qualquer pessoa consegue lê-la. Depois
  da senha, o site grava e apaga em `doces_barbara_availability_blocks` como
  visitante, porque as políticas de INSERT e DELETE são `true` para
  `public`.
- **PR 1, repo `doces-barbara`:**
  - o `/admin` passa a usar `supabase.auth.signInWithPassword`, com a conta
    da Bárbara, que já existe e é admin;
  - remover o uso de `VITE_ADMIN_PASSWORD`;
  - leitura pública do calendário continua.
- **PR 2, repo `src`, migração:**
  - INSERT e DELETE da tabela só para `authenticated` com `is_admin()`;
  - SELECT continua público;
  - conferir também o bucket de inspiração de bolo (migração de 02/07).
- **Ordem no "Depois do merge":**
  1. site dos Doces no ar com o login;
  2. a Bárbara testa;
  3. o Cowork aplica a migração;
  4. o dono apaga `VITE_ADMIN_PASSWORD` na Vercel do projeto `doces-barbara`.
- Não ligar, desligar nem trocar repositório na Vercel.

### 5. Política de privacidade: fatos que faltam (src) — espera o Cowork

- O Cowork levanta com o dono e passa os fatos:
  - região do Sentry: o código aceita `ingest.sentry.io` (EUA) e
    `ingest.de.sentry.io` (UE);
  - região do Resend;
  - retenção do Google Analytics.
- Número do ICO: quando o dono registrar.
- O Code só troca os TODOs pelo texto final e atualiza `LAST_UPDATED`.
- Não começar antes de o Cowork mandar os fatos.

### 6. Limpeza (src, baixa prioridade)

- Marcar `HANDOFF.md` da raiz como obsoleto (aviso no topo apontando para
  `docs/`), ou mover para `docs/historico/`.
- Os arquivos de status antigos da raiz (`*_STATUS*.md`, `*_FIX*.md`, `.ps1`)
  e o `snapgain-readonly-2025-08-15.zip` podem ir para `docs/historico/` ou
  sair. Perguntar ao dono no PR.
- Ofertas `airtime` paradas desde maio (já escondidas pela regra dos 30
  dias): propor no PR se desligam.

## Parte D. O que corre em paralelo e não é do Code

- **Dono:**
  - merge do #46 e instalação no Mac (`tools/mac/README.md`), com o Cowork
    guiando;
  - abrir o Quidco no Chrome do SnapGain e conferir que está logado;
  - registro no ICO;
  - conferir o plano do Resend (o grátis é de 100 e-mails por dia);
  - fechar os PRs #112, #113 e #114.
- **Cowork:**
  - conferir a rodada da Picodi de 27/10 às 08:00: só a Temu a 30% e
    nenhum aviso de "held rate";
  - acompanhar o alerta de fonte parada;
  - publicar e aplicar o que cada merge pedir;
  - antes da divulgação, fazer o teste completo como visitante: cadastro,
    e-mail, teste grátis, bloqueio após o teste, checkout, cancelamento,
    celular.

## Regras que continuam valendo

- Nada de anti-robô nem stealth. Parar e avisar em captcha, bloqueio ou
  login.
- Nunca rodar nem agendar o `nx-network-sync`.
- Nenhum segredo, e-mail de cliente ou dado pessoal no repositório.
- Não citar plataformas parceiras no texto público de marketing.
- Admin é só `user_profiles.role = 'admin'`.
- O merge é sempre do dono. Falar com ele em português, passo a passo.
