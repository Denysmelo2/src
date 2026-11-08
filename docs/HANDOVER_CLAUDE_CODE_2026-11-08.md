# Handover do Cowork para o Claude Code (08/11/2026)

Continuam valendo todos os handovers anteriores. Este documento traz uma
tarefa nova e urgente, e lembra o que ainda está aberto.

## Estado dos robôs de 06/11 a 08/11

| dia | 08:00 (daily) | 09:00 (member, pelo Mac) |
|---|---|---|
| 06/11 | verde | **vermelho**: `connectOverCDP: Timeout 30000ms` nos três. Rodado de novo às 11:13: verde, Quidco 23/23 categorias, 116 desligadas |
| 07/11 | verde | **vermelho**: "After 30 minutes the Mac does not answer on the tailnet" (Mac dormindo ou offline) |
| 08/11 | verde | verde: NX 1.337, Quidco 23/23 com 106 desligadas, Avios 1.738 |

Em 08/11 às 11:40, todas as fontes estavam com a data de hoje.

## Tarefa A (urgente, snapgain-scraper): o robô só pode usar o Chrome do SnapGain

### O que o dono viu

O dono viu o robô **usando o Chrome pessoal dele, não o Chrome do
SnapGain**, e sem conseguir abrir a NX.

### Por que isso pode acontecer (`tools/mac/launch-chrome.sh`)

- O script só pergunta se **alguém** responde em `127.0.0.1:9222`
  (`curl /json/version`). Se responder, ele diz "O Chrome do SnapGain já
  está aberto" e não abre o Chrome com `--user-data-dir=~/SnapGainChrome`.
- Qualquer outro Chrome que esteja ocupando a porta 9222 vira "o Chrome do
  SnapGain". Isso inclui o Chrome normal do dono com a depuração remota
  ligada (em `chrome://inspect/#remote-debugging` ou por outra ferramenta).
  O LaunchAgent (`com.snapgain.chrome`) também confia nessa mesma checagem.
- O passo "Check the Mac's Chrome answers" do workflow também só confere
  `/json/version`. É coerente com o que aconteceu em 06/11: a porta
  respondeu, mas `connectOverCDP` não conseguiu entrar.

### O que mudar

1. **`launch-chrome.sh`: conferir de quem é a porta.**
   - Descobrir qual processo escuta na porta:
     `lsof -nP -iTCP:$PORT -sTCP:LISTEN -t`.
   - Exigir que a linha de comando desse processo (`ps -o command= -p <pid>`)
     tenha `--user-data-dir=$HOME/SnapGainChrome`.
   - Se for outro Chrome, parar com uma mensagem clara em português.
     Exemplo: "a porta X está com outro Chrome (o seu Chrome normal?). Feche
     a depuração remota dele ou feche esse Chrome e rode de novo."
2. **Porta própria:** trocar a 9222 por uma porta que ferramentas comuns
   não usam (por exemplo, 9333) no script, no `tailscale serve` e no
   README.
   - O dono vai ter que colar o novo `CDP_ENDPOINT` no GitHub. Dizer isso
     no "Depois do merge", passo a passo.
3. **No robô, antes de ler qualquer site:**
   - depois do `connectOverCDP`, abrir `chrome://version` numa aba nova;
   - ler o "Profile Path" e exigir que contenha `SnapGainChrome`;
   - se não contiver, **parar sem tocar no banco**, com a rodada vermelha e
     um erro claro ("conectado a um Chrome que não é o do SnapGain").
   - Vale para NX, Quidco e Avios.
4. Atualizar `tools/mac/README.md` com o que fazer quando aparecer esse
   erro.

### Depois do merge

1. O dono roda o novo `launch-chrome.sh` no Mac.
2. O dono cola o novo endereço em `CDP_ENDPOINT`.
3. O Cowork dispara o `member-scrape` à mão e confere no log a linha do
   perfil SnapGainChrome.

## Ainda aberto

- **Tarefa do Quidco** (`HANDOVER_CLAUDE_CODE_2026-11-05-quidco.md`, src
  #161 com merge): nenhum PR ainda.
  - Em 06/11 e 08/11 as 23 categorias foram lidas, e o sweep ficou abaixo
    de 150 (116 e 106).
  - O defeito continua no código: uma categoria que falha é engolida em
    silêncio e o sweep roda mesmo assim.
  - Ordem: depois da Tarefa A.
- **Tabela dos Doces** (tarefa 4 de 26/10, PR 2, migração em `src`): ainda
  aberta. `doces_barbara_availability_blocks` continua com INSERT e DELETE
  `true` para `public`.
  - **Não fazer ainda:** a tela `/admin` dos Doces ainda usa a senha antiga
    (o lado do `doces-barbara` é do Cowork e ainda não foi aplicado).
  - Fechar a tabela antes disso quebra o `/admin` da Bárbara.
  - O Cowork avisa quando o login real estiver no ar.

---
_Cowork, 08/11/2026._
