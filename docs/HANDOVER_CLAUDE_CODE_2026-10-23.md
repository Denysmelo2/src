# Handover do Cowork para o Claude Code (23/10/2026)

Conferência feita pelo Cowork em 23/10, à tarde: repositório, banco, Vercel,
GitHub Actions e o site no ar. Uma tarefa por vez, uma proposta (PR) por
tarefa, nesta ordem. O merge é sempre do dono.

## Estado conferido

- **Site no ar:** produção em `37a47c7` (PR #133), estado Ready.
- **No ar e conferido:** o `/compare?store=deliveroo&amount=100` não junta
  mais gift card com NX. Mostra "Deliveroo: 10% back with NX" em primeiro
  lugar.
- **Banco:** migrações aplicadas até a 0036.
  - 3 admins, 5 contas, nenhuma assinatura ativa.
  - 1.360 lojas NX, conferidas em 18/10.
- **Robô diário:** o cron 7 dispara às 07:00 e às 08:00. **O workflow
  `daily-scrape` falha todo dia desde 19/10**: "2 scraper(s) failed: quidco
  avios". Jamdoughnut, Picodi, Cheddar e EverUp continuam ok.

## 1. URGENTE: Quidco e Avios parados desde 19/10

Última conferência das duas fontes: 18/10. Pela regra dos 30 dias, **3.572
ofertas do Quidco e 1.705 do Avios somem do site por volta de 17/11**.

Log da rodada de 23/10 (run 39914956222):
- **Quidco:**
  - "session: logged in";
  - as 18 categorias voltam com "0 rows";
  - "discovery found 0 homepage categories";
  - por isso o `sweepStaleOffers` abortou com segurança: "would mark
    3572/3572 … The DB has NOT been modified".
  - O login funciona e a página vem sem linhas. Pode ser mudança no HTML ou
    página de bloqueio.
- **Avios:** "page 0 failed: HTTP 403" em todas as páginas, inclusive
  special-offers e categorias. Isso é bloqueio.
- As duas falhas começaram no dia seguinte ao snapgain-scraper#41, que
  tirou o stealth.

O que fazer:
1. **Diagnosticar o Quidco sem burlar nada.** Salvar o HTML de uma página de
   categoria como artefato da rodada e ver se é mudança de layout (consertar
   o seletor) ou tela de bloqueio (parar).
2. **Avios 403:** não reativar o stealth nem criar outro jeito de escapar da
   detecção (regra do dono). Escrever para o dono, em português simples:
   - as opções legítimas;
   - o prazo de 17/11.
   
   O Cowork vai levar essa decisão ao dono.
3. **Aviso ao dono quando uma fonte falhar 2 dias seguidos.** Hoje a falha só
   aparece no GitHub e ninguém viu por 5 dias. Por exemplo, um e-mail pelo
   Resend ou uma linha em `ops.data_freshness` com estado "parado" no
   `/admin`.

## 2. Robô diário do NX

- Base: `docs/NX_ESTRUTURA_AREA_MEMBRO_2026-10-18.md`, no branch
  `docs/nx-estrutura-2026-10-18`.
- Lista: `/allstores/85081/`, numa página só, com 1.446 lojas.
- A taxa está em `.blocks .block .percent_text`.
- Sinal de deslogado: o domínio vira `www.nxrewards.com`.
- Na primeira semana o robô só lê. Hoje a lista tem 30 lojas acima de 10%.

## 3. Segurança: pequenos consertos no banco

- **`is_admin()` ainda pode ser chamada por visitante** (`anon`, via
  `/rest/v1/rpc/is_admin`); o advisor marca. Fazer `revoke execute … from
  anon`. Antes, conferir que nenhuma política usada por visitante depende
  dela.
- **0020 ainda não entrou.** A política de INSERT de `user_preferences`
  exige `is_admin()`, então um usuário comum não consegue gravar as
  próprias preferências. Aplicar a 0020.
- `ops.nx_key` está sem `search_path` fixo (advisor). Adicionar
  `set search_path = ''`.

## 4. Telas e textos

- `/faq` dá 404: `FAQPage.jsx` e `RealTimePolicyPage.jsx` não têm rota.
  - Propor: rota `/faq` e link no rodapé.
  - O `RealTimePolicyPage` precisa ser revisto antes, porque o site atualiza
    uma vez por dia, não em tempo real.
- O meta description em `App.jsx` (linha 251) diz "in real-time". Trocar por
  algo verdadeiro, por exemplo "updated daily".
- O texto do `/compare` diz "Verified 5 days ago" para Quidco e NX. Está
  certo, mas vai piorar se a tarefa 1 não for resolvida.

## 5. Para conferir (pergunta do Cowork)

- O `/compare` da Deliveroo mostra "Cheddar + Quidco" e "EverUp + Quidco".
- As Special Terms do NX dizem que pagar com gift card não dá cashback.
  **Conferir nas condições do Quidco para a Deliveroo** se o Quidco paga
  quando a compra é paga com gift card.
- Se o Quidco também não pagar, aplicar a mesma regra do NX: nunca somar.

## 6. Depois (dependem do dono ou de terceiros)

- hCaptcha no cadastro, login e "esqueci a senha". Depois, o dono liga o
  Captcha no Supabase.
- Número do ICO na política de privacidade (`PrivacyPolicyPage.jsx`, TODO),
  quando o dono registrar.
- Lei de assinaturas (DMCC, prevista para janeiro de 2027):
  - aviso antes de cada renovação;
  - segundo período de 14 dias depois de renovação anual;
  - cancelamento fácil.

## Regras que continuam valendo

- Nada de anti-robô nem stealth.
- Nunca rodar nem agendar o `nx-network-sync`.
- Confirmar com o dono antes de mudanças grandes no banco.
- Nenhum segredo, e-mail de cliente ou dado pessoal no repositório (ele é
  público).
- O merge é sempre do dono.
- Falar com ele em português, passo a passo.

## 7. Achados dos testes ao vivo com o dono (23/10, noite)

O que já foi resolvido no painel, sem código:
- **O cadastro por e-mail falhava** com "Sign up Failed {}".
  - Causa: o Supabase enviava os e-mails de autenticação pelo SMTP do Office
    365, e o envio passava de 10 segundos. Os registros mostram 3 vezes
    `/signup` com 504 "context deadline exceeded". A conta não era criada.
  - O dono trocou o SMTP do Supabase para o Resend: `smtp.resend.com:465`,
    usuário `resend`, com uma chave nova só de envio. O remetente continua
    `support@snapgain.uk`.
  - Testado às 19:21: o `/signup` respondeu em 1 a 2 segundos, o e-mail
    chegou e a confirmação funcionou.
- O Supabase do dono agora tem verificação em duas etapas.
- As 8 funções antigas foram apagadas pelo dono.
- O dono decidiu **ficar no plano grátis** do Supabase. Por isso a proteção
  contra senhas vazadas fica de fora; ela só existe no plano Pro. A regra de
  senha atual (8 caracteres, com maiúscula, minúscula, número e símbolo)
  continua.

- **O checkout nunca tinha funcionado.**
  - O segredo `STRIPE_SECRET_KEY` guardava o *ID* de uma chave (`mk_…`),
    não a chave. O Stripe respondia "Invalid API key provided … looks like
    the ID of an API key".
  - O dono criou uma chave secreta live nova ("snapgain-uk-supabase") e
    trocou o segredo às 20:53.
  - Testado: o checkout abre com £7,99 por mês e £60 por ano.
  - **Sugestão para o código:** mostrar no front a mensagem de erro do
    Stripe só para admin. E registrar em `ops` quando o
    `create-checkout-session` falhar, para isso não passar 5 meses sem
    ninguém ver.
  - O `STRIPE_WEBHOOK_SECRET` só vai ser conferido no primeiro pagamento
    real.

Para o código, em ordem de prioridade:
1. **PREÇO: o certo é £7,99 por mês e £60 por ano** (decisão do dono,
   23/10).
   - O Stripe e várias páginas estão com £14,99 e £120, o que está errado.
     Settings e `SubscriptionCTA` já mostram £7,99 e £60.
   - **O Cowork cuida do Stripe e dos segredos:**
     - cria os preços novos;
     - troca `STRIPE_PRICE_MONTHLY` e `STRIPE_PRICE_YEARLY` nas Edge
       Functions;
     - ajusta o portal do cliente.
     
     O código das funções não muda. O webhook lê o intervalo do preço, não
     o ID.

     **Feito pelo Cowork em 23/10, às 20h:**
     - preços novos `price_1UTnaD9xccsM1Iimph4JSnTC` (£7,99 por mês) e
       `price_1UTnay9xccsM1Iim820lZyFo` (£60 por ano), os dois como
       default;
     - os de £14,99 e £120 foram arquivados;
     - o portal do cliente oferece só os preços novos;
     - os segredos `STRIPE_PRICE_*` foram trocados pelo dono e conferidos
       pelo digest SHA256.
   - **Para o Claude Code:**
     - criar uma constante única de preço (por exemplo em
       `src/config/pricing.js`: mensal 7.99, anual 60) e usar em todo
       lugar;
     - trocar £14,99 e £120 por £7,99 e £60 em:
       - `PricingPage.jsx` (linhas 134-156 e 300-301). No anual: "£60 every
         year … £35.88 less than 12 monthly payments" e "Pay once a year:
         £60 instead of £95.88";
       - `LandingPage.jsx:944`;
       - `TermsOfServicePage.jsx` (linhas 9, 72, 216-217);
       - `RefundPolicyPage.jsx` (linhas 149-155). Refazer os exemplos:
         - £7,99 × 25/30 = **£6,66**;
         - £60 × 355/365 = **£58,36**.
   - Conferir com `git grep -n "14\.99\|£120"` que não sobrou nada.
     Atenção: `CardsPage`, `BanksPage` e a calculadora Revolut citam
     £14,99 de outros produtos; esses ficam.
   - Os textos legais mudaram de preço, então avisar o dono para levar a
     versão nova ao solicitor.
2. **`/compare`: mudar o valor não atualiza o resultado.**
   - No celular, o dono digitou £100 no Sainsbury's. O campo mostrava £100,
     mas a lista continuava calculada com £50: "NX Rewards £5.00", "NX or
     Avios £5.00" e "800 Avios" como BEST ROUTE.
   - Pela URL `?amount=100` o resultado sai certo: NX £10 em 1º.
   - O resultado deve acompanhar o valor digitado, ou deixar claro com qual
     valor foi calculado.
3. **`/compare`: as linhas do bônus fixo de Avios** ("800 Avios per order",
   "700 Avios per order") mostram só "AVIOS ONLY 800 Avios", sem o valor em
   libras.
   - Mostrar "≈ £7.36" (1 Avios = £0,0092), como nas outras linhas, para o
     cliente conseguir comparar.
   - Conferir se a ordenação usa esse valor em libras.
4. **No celular, o cartão "Sainsbury's: NX or Avios"** (bloco PRO STRATEGY
   dentro do cartão) aperta o título numa coluna estreita, com uma palavra
   por linha. Ajustar o layout para telas estreitas.
5. **Atraso e "quebra" ao trocar de página.** A cada clique no menu
   (Dashboard, Compare, Profile, Settings), a página some e aparece a tela
   cheia do `SplashScreen.jsx` ("Save time. Save money. Every time." com
   três pontinhos) por um instante, antes da página nova.
   - Mostrar o splash só na primeira carga.
   - Na troca de rota, manter a página atual até a nova carregar, ou usar
     um carregamento discreto. Pré-carregar as rotas do menu.
6. **Confirmação de e-mail com link antigo:** quando a pessoa pede o
   cadastro mais de uma vez e clica num e-mail antigo, o Supabase responde
   "Email link is invalid or has expired".
   - Conferir se o site mostra uma mensagem clara, com o botão "reenviar
     e-mail", em vez de uma tela de erro.
7. **Para conferir:** a rota "5% + Avios + Nectar at Sainsbury's (gift card
   route)" junta gift card com o Avios eStore.
   - Conferir nas condições do Avios eStore se ele paga quando a compra é
     paga com gift card.
   - Se não pagar, aplicar a mesma regra do NX.
