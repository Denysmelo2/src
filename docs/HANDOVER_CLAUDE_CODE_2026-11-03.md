# Handover do Cowork para o Claude Code (03/11/2026)

O handover de 26/10/2026 continua valendo, Parte A inteira. Este documento só
acrescenta uma regra nova (abaixo) e corrige um pedaço da tarefa 4 daquele
handover, que foi o que causou o problema de hoje.

## Regra nova: cada repositório é um projeto, e só um (vale sempre)

Hoje o Code abriu a PR #1 no repositório `Denysmelo2/doces-barbara`, pelo
ramo `claude/robo-diario-snapgain-ich7l2` — o mesmo nome de ramo usado nos
repositórios do SnapGain. O dono fechou a PR sem avisar o motivo: os Doces
da Bárbara são um negócio à parte, com o próprio repositório, e não querem
ver um ramo com "snapgain" no nome nem um PR aberto sem combinar antes.

A partir de agora:

- **O Code só escreve código e abre PR em `Denysmelo2/src` e
  `Denysmelo2/snapgain-scraper`.** Nenhum outro repositório, mesmo que uma
  tarefa do handover peça uma mudança nele.
- Se uma tarefa precisa de uma mudança em outro repositório (como
  `doces-barbara`), o Code **não abre PR lá**. Em vez disso, descreve a
  mudança necessária (arquivo, o que muda, por quê) dentro do seu próprio
  PR ou do handover, e o Cowork aplica no repositório certo — o Cowork já
  tem o `doces-barbara` na própria sessão.
- Nome de ramo: usar um nome que descreva a tarefa daquele repositório
  (ex.: `fix/admin-login`), nunca reaproveitar o nome de ramo de outro
  repositório ou que cite "snapgain" fora dos repositórios do SnapGain.
- Compartilhar banco (o `doces-barbara` usa o mesmo Supabase do SnapGain)
  não é motivo para compartilhar repositório: migração que afeta as duas
  coisas é uma migração em `src`, lida com cuidado nas duas pontas.

### Correção na tarefa 4 do handover de 26/10 ("Doces: login real e tabela fechada")

O texto antigo pedia "PR 1, repositório `doces-barbara`" ao Code. Isso está
cancelado por causa da regra acima. A partir de agora:

- O Code **não** mexe no `doces-barbara`.
- O que o Code já escreveu hoje (login com `supabase.auth.signInWithPassword`
  em `AdminPage.jsx`, captcha em `captcha.jsx`, retirada de
  `VITE_ADMIN_PASSWORD`) está descrito na PR #1 fechada, como referência.
  O Cowork aplica essa mudança direto no `doces-barbara`, pela própria
  sessão, com o mesmo cuidado (login real da Bárbara, não senha solta).
- A migração em `src` que fecha `doces_barbara_availability_blocks` para
  quem não é admin (tarefa 4, PR 2) continua com o Code, normalmente — essa
  parte é no repositório certo.

## O resto

A conferência completa que o Code fez hoje (robôs, app, cadastro, políticas)
está em `docs/HANDOVER_COWORK_2026-11-03.md`, na PR #152. O Cowork segue a
Parte B de lá depois do merge.

---
_Cowork, 03/11/2026._
