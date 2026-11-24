# Handover Cowork → Code: os robôs passam a rodar no Mac (24/11/2026, noite)

## Por que

Em 24/11, às 19:09, o GitHub bloqueou o Actions da conta Denysmelo2:
- o orçamento de Actions é **$0**, e o dono não vai pagar;
- os minutos incluídos do mês acabaram.

O `snapgain-scraper` é privado e gasta cerca de 1.360 minutos por semana,
o que dá uns 5.900 por mês, contra uns 3.000 incluídos:

| Workflow | Minutos/semana |
|---|---|
| `daily-scrape` | ~640 |
| `member-scrape` | ~575 |
| `scrape-jamdoughnut` | ~135 |
| `db-backup` | ~12 |

Um runner self-hosted não gasta minutos (GitHub Docs: os self-hosted
"remain free"). O Mac do dono já acorda às 03:50 e fica acordado de 03:30
às 06:30. O Chrome do robô roda nele.

## O que o Cowork já fez

- Desligou o cron `jamdoughnut-dispatch` (jobid 14) até 1/12, quando os
  minutos voltam. Nesse período a JamDoughnut atualiza só na rodada das
  04:30. Há um lembrete marcado para religar em 1/12.
- O dono vai instalar o runner no Mac com o rótulo **`snapgain-mac`**
  (passo a passo do Cowork, pelas telas do GitHub). Vai ser **um runner
  só**, então os jobs rodam um de cada vez.

## Tarefas para o Code (snapgain-scraper, um PR)

1. **`scrape-member.yml` e `scrape-daily.yml`:** `runs-on: [self-hosted,
   macOS, snapgain-mac]`.
2. **`scrape-member.yml` no Mac:**
   - sem o passo do Tailscale;
   - o Chrome do robô está na mesma máquina, então o CDP vai por
     `http://127.0.0.1:9222`, ou pela porta que o `tools/mac/launch-chrome.sh`
     usa (conferir no script);
   - manter o `CDP_ENDPOINT` como alternativa, se fizer sentido;
   - a checagem "o Chrome do Mac responde" continua.
3. **`scrape-daily.yml` no macOS:**
   - `npx playwright install chromium`, sem `--with-deps`, que é só para
     Linux e usa apt;
   - conferir qualquer comando GNU (`stat -c`, `sed -i`, `date -d`) e
     trocar pela forma que funciona nos dois sistemas.
4. **Ordem e tempo:** com um runner só, a rodada das 04:30 espera a das
   04:00 terminar.
   - Pôr `concurrency` para que uma rodada nunca cancele a outra.
   - Passar o `keep-awake.sh` (`tools/mac/`) para `WINDOW_END` 07:30, porque
     as duas rodadas somadas passam de 2 horas.
   - O Cowork copia o arquivo novo para o Mac depois do merge.
5. **Ficam no GitHub, sem mudar:**
   - `scrape-jamdoughnut.yml`, porque durante o dia o Mac pode estar
     dormindo: uns 600 minutos por mês, dentro do plano, a partir de 1/12;
   - `db-backup.yml`, porque o `supabase db dump` usa Docker, que o Mac não
     tem.
   Os dois ficam parados até 1/12.
6. **Se o runner não estiver online** na hora da rodada, o job fica na
   fila. Isso não pode virar duas rodadas juntas no dia seguinte:
   `timeout-minutes` curto na espera, ou um passo que desiste depois de
   06:30.
7. **README de `tools/mac/`:** acrescentar "Runner do GitHub" com o
   rótulo, a pasta `~/actions-runner` e o `./svc.sh status`.

## Depois do merge (Cowork)

- Rodar o `member-scrape` à mão pelo Mac, com o dono acordado, e conferir o
  resumo e a checagem diária.
- Conferir as rodadas das 04:00 e das 04:30 do dia seguinte.
