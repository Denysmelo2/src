# Handover do Cowork para o Claude Code (08/11/2026, tarde)

Continua valendo tudo o que veio antes. Os PRs #52 a #55 do
`snapgain-scraper` e o #163 do `src` estão com merge. Aqui vão o que o
Cowork fez no Mac e duas tarefas novas.

## O que o Cowork fez no Mac em 08/11

- **O Mac não tinha a pasta `snapgain-scraper`.**
  - Não havia `git pull` para rodar.
  - O Cowork copiou `tools/mac/*` para `~/Documents/snapgain-mac/`.
  - O dono rodou `install-login-agent.sh` e `launch-chrome.sh` de lá.
  - O Chrome do SnapGain está na porta **9333**, em `http://100.88.0.13:9333`.
- **`CDP_ENDPOINT`:** o valor novo foi preenchido no GitHub. O dono
  confirma com passkey.

### Causa real do "robô no meu Chrome"

- O dono navegava, logado na conta pessoal, **dentro do Chrome do
  SnapGain** (`~/SnapGainChrome`).
- O Chrome do SnapGain abre primeiro, pelo LaunchAgent. Os dois Chromes
  são o **mesmo aplicativo** (Google Chrome).
- Por isso o macOS manda para o Chrome do SnapGain:
  - os cliques no ícone do Dock;
  - todos os links (o PR #163 abriu nele).
- Hoje `~/SnapGainChrome` tem dois perfis:
  - `Default`: uso pessoal misturado com o do robô;
  - `Profile 1`: "Barbara e Denys Melo", o perfil do negócio, logado em
    NX, Quidco e Avios.
- O `launch-chrome.sh` não escolhe o perfil, e o Chrome abre o último
  usado.

## Tarefa A2 (snapgain-scraper): o robô usa **Chromium**, um app separado

Decisão do dono em 08/11: separar de vez o navegador do robô do Chrome
pessoal.

1. **`launch-chrome.sh`: Chromium em vez do Google Chrome.**
   - Usar um navegador que seja **outro aplicativo** do macOS (outro
     bundle id), para que links e o Dock nunca caiam nele.
   - Pode ser o Chromium (instalado em `/Applications/Chromium.app`) ou o
     "Google Chrome for Testing" (`npx @puppeteer/browsers install
     chrome@stable`). Escolha o mais simples de manter e explique no PR.
   - Instalação passo a passo para o dono, sem Homebrew se der: o dono não
     programa.
2. **Perfil fixo:** passar `--profile-directory=` com o perfil do negócio,
   para nunca abrir outro.
3. **Pasta de dados nova** (por exemplo `~/SnapGainChromium`):
   - não reaproveitar `~/SnapGainChrome`, que tem dados pessoais;
   - o dono faz login uma vez em NX, Quidco e Avios no Chromium (os logins
     do Chrome não passam para ele);
   - o README diz isso passo a passo.
4. A checagem do #52 (perfil em `chrome://version`) passa a exigir a pasta
   nova.
5. O LaunchAgent abre o Chromium, não o Google Chrome.
6. **Um passo de limpeza no README** (o dono faz depois que o Chromium
   estiver funcionando):
   - tirar o LaunchAgent velho;
   - o dono decide o que fazer com `~/SnapGainChrome`. **Nunca apagar
     sozinho**: tem favoritos pessoais.
7. **Sem `git pull` no "Depois do merge":**
   - o Mac não tem a pasta do repositório; o Cowork copia `tools/mac`
     para `~/Documents/snapgain-mac/`;
   - se o Code preferir que o Mac tenha o repositório, escreva os passos
     do clone para o dono (com GitHub Desktop ou HTTPS) e diga isso no PR.

## Tarefa B (src): `.env.local` está dentro do repositório

- O `.env.local` foi commitado com `VITE_SITE_URL=http://localhost:5173`,
  `VITE_APP_URL` e `VITE_SUPABASE_REDIRECT_URL` em localhost, e
  `VITE_APP_ENV=development`.
- O Vite lê esse arquivo no build da Vercel. Por isso o link de troca de
  senha saía com `redirect_to=http://localhost:5173/reset-password`; o
  Supabase recusava e mandava para a página inicial, já logado. O e-mail
  de confirmação (`ResendConfirmationEmail.jsx`) usa a mesma variável.
- **Paliativo aplicado pelo Cowork:** variável `VITE_SITE_URL=https://snapgain.uk`
  em Production na Vercel. Ela tem prioridade sobre o `.env.local`, e o
  redeploy foi feito.
- **O que fazer:**
  1. tirar o `.env.local` do repositório (`git rm --cached`) e pôr no
     `.gitignore`;
  2. conferir que o build de produção não depende de nada que só estava
     nele (os outros valores são públicos e já estão na Vercel);
  3. mais seguro: em `RequestReset.jsx` e `ResendConfirmationEmail.jsx`,
     ignorar `VITE_SITE_URL` quando apontar para localhost em produção;
  4. ao chegar logado por um link de recuperação (evento
     `PASSWORD_RECOVERY`), levar a pessoa para `/reset-password`, mesmo que
     o `redirect_to` caia na página inicial.

## Doces

- A PR #2 do `doces-barbara` (login real no `/admin`) está com merge, mas
  **não está no ar**. A Vercel dos Doces aponta para o repositório antigo
  `snapgain/doces-barbara`, que não existe mais, e não faz deploy desde
  03/07.
- O dono vai religar a Vercel ao `Denysmelo2/doces-barbara`.
- A migração da tabela continua esperando o aviso do Cowork.

---
_Cowork, 08/11/2026._
