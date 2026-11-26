# Handover Cowork → Code: a Quidco inteira, todos os dias (25/11/2026)

## Decisão do dono (25/11, 22:10)

> "Como está rodando pelo Mac, o robô deve rodar por completo a Quidco
> todos os dias."

Agora os robôs rodam no Mac (PR scraper#74) e não gastam minutos do GitHub.
O limite de 40 minutos para as páginas de loja da Quidco existia para
economizar esses minutos e não serve mais.

## Números de 25/11 (rodada das 04:00 pelo Mac)

- **Quidco:**
  - 23 categorias lidas e 3.479 ofertas ativas;
  - páginas de loja: 1.072 lidas em 40 minutos (cerca de 27 por minuto), de
    2.712 planejadas; ficaram 1.640 para o dia seguinte;
  - as páginas de **todas** as lojas, cerca de 3.500, levariam uns 130
    minutos.
- **member-scrape:** 04:00 → 04:55.
- **daily-scrape:** 04:55 → 06:08, sendo 59 minutos só da Student Beans.

Com a Quidco inteira, o `member-scrape` passa a levar umas 2h45. Começando
às 04:00, o `daily-scrape` só terminaria por volta das 08:00, depois da
janela do Mac, que acaba às 07:30.

## Tarefas para o Code (snapgain-scraper, um PR)

1. **Quidco completa.** Na rodada diária, abrir a página de **toda** loja
   ativa da Quidco, e não só as escolhidas pelo `pickDetailPages` (as que
   mudaram, as com boost e as sem faixas).
   - Ordem: primeiro as que o `pickDetailPages` escolheria, depois as outras,
     da maior taxa para a menor. Se o tempo acabar, o que ficar de fora é o
     menos importante.
   - Limite novo: **170 minutos**. Pode vir da variável
     `QD_DETAIL_BUDGET_MIN`, que hoje vale 40 no repositório; o Cowork troca
     para 170 depois do merge.
   - O resumo continua mostrando "N read, N failed, of N planned, in N min".
2. **Educação com a Quidco.** São cerca de 3.500 páginas por dia, logadas
   na conta do dono. Manter as pausas entre páginas (ou pôr uma de 300 a
   600 ms, se não houver).
   - Se aparecer captcha, "Access denied", "429" ou a página de login,
     **parar as páginas na hora**, gravar o que já foi lido e escrever no
     resumo "Quidco: páginas paradas (bloqueio ou login)".
   - Nada de stealth nem de contornar.
3. **Horário, para caber na janela do Mac:**
   - `member-scrape` passa para as **03:00**. O Cowork muda o cron
     `member-scrape-dispatch` para a hora 3 de Londres.
   - `daily-scrape` continua às 04:30 e espera na fila do runner.
   - `keep-awake.sh`: `WINDOW_START` 02:30 e `WINDOW_END` 08:00.
   - Textos do `install-login-agent.sh` e do README do Mac: o Mac acorda às
     **02:50** (`sudo pmset repeat wakeorpoweron MTWRFSU 02:50:00`, que o
     dono roda) e fica acordado de 02:30 a 08:00.
   - `queue-wait`: o `member-scrape` desiste se esperou mais de 150 minutos
     (depois de 05:30). O `daily-scrape` passa de 180 para **210** minutos,
     até 08:00, porque agora espera uma rodada maior.
   - `timeout-minutes` do `member-scrape`: de 180 para **240**.
4. **Teste:** uma lista com lojas que não mudaram também entra nas páginas;
   e a ordem é "escolhidas primeiro, depois as demais por taxa".

## Depois do merge (Cowork e dono)

- **Cowork:**
  - variável `QD_DETAIL_BUDGET_MIN` = 170;
  - cron `member-scrape-dispatch` na hora 3 de Londres;
  - copiar os arquivos novos do Mac.
- **Dono, no Terminal do Mac:**
  - `sudo pmset repeat wakeorpoweron MTWRFSU 02:50:00`;
  - `bash install-login-agent.sh` na pasta do robô.
- **Cowork, no dia seguinte:** conferir as duas rodadas: páginas lidas,
  horário de término e se a Quidco bloqueou alguma coisa.
