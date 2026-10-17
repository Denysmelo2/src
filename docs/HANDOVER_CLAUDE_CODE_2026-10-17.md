# Handover do Claude Cowork para o Claude Code — 17/10/2026

Escrito pelo Claude Cowork depois de configurar o Stripe e analisar o banco em
17/10/2026. Complementa o `docs/HANDOFF.md` (leia os dois). **Repositório
público:** nada de segredo, e-mail de cliente ou dado pessoal aqui.

## Regras do dono (valem sempre)

- Falar com o dono **em português**. Para qualquer clique dele: um passo por vez,
  o que ele deve ver na tela e o que fazer se vir outra coisa.
- **Uma tarefa por vez.** Só passar para a próxima quando a atual estiver
  publicada e conferida.
- Nunca pôr chave, token ou senha no chat, no código ou em documentos. Nunca
  pedir que o dono cole uma.
- Confirmar com o dono antes de qualquer coisa externa ou difícil de desfazer:
  publicar, apagar, trocar chaves, mudar dados em massa no banco.
- Não construir nada para burlar proteção anti-robô. Não rodar nem agendar a
  função `nx-network-sync`.
- Admin é só `user_profiles.role = 'admin'`.
- Não citar plataformas parceiras no texto de marketing público (tabelas de
  comparação e páginas legais podem).
- O merge é sempre clicado pelo dono.

## O que o Cowork já fez em 17/10 (não refazer)

- **Portal do cliente do Stripe** configurado e ativo (`bpc_1URdZY…`, padrão):
  - cancelar no fim do período, com motivo;
  - trocar entre `price_1TWkUQ…` (£14,99/mês) e `price_1TWkWA…` (£120/ano),
    com cobrança proporcional;
  - atualizar cartão, dados de cobrança e histórico de faturas;
  - retorno padrão `https://snapgain.uk/settings`.
- **Links legais da conta Stripe:** Termos → `https://snapgain.uk/terms-of-service`
  e Privacidade → `https://snapgain.uk/privacy-policy`. Valem também para o
  recibo do e-book, porque a conta é a mesma.
- **Assinatura criada à mão** `sub_1TaH9F…` cancelada (nunca foi cobrada). O
  perfil que estava "active" sem `stripe_customer_id` ficou com
  `subscription_status = null` e `plan = null`. É a conta da Bárbara, que
  continua admin.
- **Mapa e guia** atualizados no Mac do dono (não estão neste repositório).

## Tarefas de código, em ordem

### 1. Lojas duplicadas: a comparação não junta as ofertas (prioridade máxima)

**Sintoma:** o dono diz que o Avios não aparece na comparação. O mesmo
problema afeta parte dos gift cards.

**Causa (conferida no banco em 17/10):** a mesma loja existe em vários
registros de `stores`, e cada fonte grava as ofertas num registro diferente.
`useStoreOffers(storeId)` (`src/hooks/useCatalog.js`) lê só um `store_id`, então
o cliente vê só um pedaço das ofertas. Exemplos:

| Loja que o cliente busca | Cashback e gift cards | Avios (`point_offers`) | Outros registros |
|---|---|---|---|
| `boots` "Boots" | picodi, quidco, cheddar, everup | **não** | `bootscom` "Boots.com" (só Avios), `boots-online` (só JamDoughnut) |
| `asos` "ASOS" | picodi, quidco, 3 gift cards | **não** | `asos-uk` "ASOS UK" (só Avios) |
| `nike` "Nike" | 3 gift cards | **não** | `nike-uk` "Nike UK" (só Avios) |
| `argos` "Argos.co.uk" | quidco, 3 gift cards | sim | — |

Hoje há 11.765 lojas. As 1.707 ofertas do Avios estão frescas (lidas em
17/10).

**O que fazer:**
1. Medir antes de mudar: uma consulta que agrupe as lojas por nome
   normalizado ou domínio e conte quantos grupos têm ofertas espalhadas.
   Mostrar o resultado ao dono.
2. Propor a solução e esperar o "ok" do dono antes de mexer em dados. Por
   exemplo:
   - uma coluna `canonical_store_id`, ou uma tabela `store_aliases`;
   - `useStoreOffers` e a busca leem as ofertas de todos os registros do grupo;
   - o robô (`snapgain-scraper`, `lib/upsert.js`) passa a gravar no registro
     canônico.
   - Não apagar lojas.
3. Critério de pronto: na comparação de Boots, ASOS e Nike aparecem cashback,
   gift cards e Avios juntos, cada um com a data da última conferência.

### 2. Avios contra cashback: o cliente precisa ver o que vale mais

- Depois da tarefa 1, conferir se o Avios aparece no `/compare` e na página da
  loja.
- Hoje o Avios é mostrado só em pontos, sem libras (comentário em
  `src/lib/strategies.js`). Já existe `compareCashbackVsAvios` em
  `src/lib/aviosMath.js`, usado no `ComparePage.jsx`.
- O dono quer ver claramente qual opção rende mais.
- Valor de referência: `miles_programs.conversion_rate` do BA Avios = £0,01.
  Confirmar com o dono antes de usar e mostrar como estimativa ("≈ £X,
  estimado a 1p por Avios").
- Achado colateral: `Lufthansa Miles & More` está com `conversion_rate = 1.10`,
  que parece errado (seria £1,10 por milha). Avisar o dono.

### 3. NX Rewards de volta (plano aprovado pelo dono em 17/10)

**Estado:** 1.325 ofertas `cashback_offers.platform = 'NX Rewards'` (10% a
100%) e 1.504 lojas com `stores.in_nx_network = true`. A última conferência foi
em 01/06/2026, por isso o filtro de 30 dias (`hiddenBeforeIso`) esconde todas.

**Plano aprovado:**
1. Um job **mensal** no `snapgain-scraper` lê a lista pública de lojas:
   - Endereço: `https://www.nxrewards.com/Home/AllRetailers/1173670`. Não
     precisa de login. Ler de forma educada, uma vez por mês, sem tentar
     contornar bloqueios.
   - Marca `in_nx_network`.
   - Para cada loja da lista, grava ou atualiza `cashback_offers`: NX Rewards
     com taxa = maior entre 10 e a taxa conhecida, `conditions` = "Minimum 10%",
     `last_verified_at` = agora.
   - Desativa as lojas que saíram da lista.
   - Reaproveitar a normalização de nomes e a tabela de taxas de
     `supabase/functions-archive/nx-sync/index.ts`.
   - Disparo pelo pg_cron, no mesmo padrão da migration 0018 (token no Vault).
2. Na tela, mostrar "mín. 10%" para as ofertas NX que vierem só da lista.
   Já existe `NX_FLOOR_PCT` e o piso em `src/lib/strategies.js`.
3. As taxas reais por loja parecem ficar na área de membro. Quem lê é o
   **Cowork**, quando o dono estiver logado no NX pelo Chrome. Ele grava pelo
   banco com `conditions` = "Checked in member area".
   - O job mensal **não pode rebaixar** essas taxas para 10%.
   - Sugestão: só sobrescrever quando a taxa nova for maior ou quando a
     `conditions` for "Minimum 10%".
4. Pronto quando: as lojas da rede NX aparecem na comparação com o NX, e o job
   mensal roda verde.

### 4. Segurança pendente do pacote B

- **0020** (`user_preferences`): a política atual de INSERT exige
  `... AND is_admin()`, então usuário comum não consegue gravar. O certo é
  `(uid = user_id) OR is_admin()`. O `apply_migration` deu tempo esgotado três
  vezes; tentar de novo e conferir com
  `select polname, pg_get_expr(polwithcheck, polrelid) from pg_policy where polrelid='public.user_preferences'::regclass;`.
- `public.is_admin()` é SECURITY DEFINER e o `anon` pode executar (aviso do
  Supabase). Avaliar se o visitante precisa disso (políticas de leitura
  pública?). Se não precisar, revogar o EXECUTE do `anon`.
- **hCaptcha** no cadastro, login e "esqueci a senha".
  - O `AuthForm` atual não tem o widget. `HCaptchaForm.jsx` e
    `HCaptchaTestPage.jsx` são de 2025 e servem só de referência.
  - A site key é pública e vai na env `VITE_HCAPTCHA_SITE_KEY` da Vercel.
  - A secret key o dono põe direto no painel do Supabase (Auth → Captcha). O
    Cowork guia esse passo.
  - Ligar o Captcha no Supabase só **depois** do widget no ar.

### 5. Arrumação do site

- `FAQPage.jsx` e `RealTimePolicyPage.jsx` existem, mas não têm rota no
  `App.jsx` (/faq dá 404). Perguntar ao dono se ganham rota e link no rodapé.
- Texto "real-time" no meta de `App.jsx`. O robô roda uma vez por dia; corrigir.
- Número do ICO na política de privacidade (há um TODO). Só quando o dono
  tiver o número.

## Como entregar

- Uma proposta (PR) por tarefa, com o que mudou e como conferir.
- Avisar o dono quando estiver pronto para o merge.
- Depois do merge, conferir o deploy na Vercel (projeto `snapgainuk`) e testar
  no snapgain.uk.
- Atualizar o `docs/HANDOFF.md` no fim de cada tarefa, para o Cowork atualizar
  o mapa.
