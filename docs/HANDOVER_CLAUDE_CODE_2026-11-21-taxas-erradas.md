# Handover Cowork → Code: taxas erradas no site (21/11/2026)

## O que o dono viu

Em 21/11, o dono buscou **Currys** no SnapGain e comparou com os apps:

| Plataforma | SnapGain mostrava | App de verdade |
|---|---|---|
| Cheddar | 6,5% (rota #1) | **4%** |
| EverUp | 5,1% | 5,1% ✅ |
| Avios eStore | 5 Avios/£1 | **até 6 Avios/£1** (antes: até 2) |
| NX Rewards | não aparecia | o dono viu 10% (ver item 3) |

O Cowork achou três defeitos diferentes. Os três afetam outras lojas além
da Currys.

## O que o Cowork já fez (21/11)

Antes de cada mudança, o Cowork guardou cópia em `ops.fix_backup_20261121_*`.

1. **Cheddar desligada.** As 24 ofertas ativas foram para `is_active = false`
   (cópia em `ops.fix_backup_20261121_cheddar`). O cron `daily-scrape-dispatch`
   (job 7) passou a mandar `inputs.scrapers = "jamdoughnut,everup,studentbeans,unidays"`,
   então a rodada das 08:00 não roda mais a Cheddar. Para voltar: tirar o
   `inputs` do body com `cron.alter_job`.
2. **Currys no Avios:** a taxa foi para 6, com "Up to" e `booster_available`.
   A loja "Currys Partmaster" saiu do `merged_into` da Currys.
3. **Lojas do Reino Unido fundidas em lojas da Irlanda.** Em 15 lojas, a
   versão UK apontava `merged_into` para a versão IE: Tommy Hilfiger → Tommy
   Hilfiger Ie, French Connection → French Connection Ie, Lenovo, Nintendo,
   On the Beach, Wowcher, Zooplus, Dare2b, Footjoy, Lyca, Q Park, Go Groopie
   e Baker Ross. O site mostrava a loja irlandesa a um público do Reino Unido.
   - As 15 voltaram a ser lojas próprias (cópia em `ops.fix_backup_20261121_ie_merges`).
   - "Dare2b UK" agora aponta para "Dare2b", e "Tommy Hilfiger UK" para
     "Tommy Hilfiger".
   - Os robôs reativam essas lojas na próxima vez que escreverem nelas.

## Tarefas para o Code (um PR por tarefa)

### 1. Dois nomes da fonte caindo na mesma loja: o último sobrescreve (todos os robôs)

**Causa da Currys no Avios.** A API do Avios lista três lojas:
- "Currys": `Up to 6 Avios / £1`, era até 2;
- "Currys Business": até 2;
- "Currys Partmaster": `5 Avios / £1`.

"Currys Partmaster" estava fundida na Currys, então o `upsertStore` seguia o
`merged_into` e as duas linhas da fonte caíam na mesma loja. A última a ser
gravada vencia: 5 por cima de 6.

O mesmo acontece em qualquer robô (Avios, Quidco, JamDoughnut, EverUp, NX)
sempre que a fonte lista dois nomes que viram a mesma loja. Hoje existem
772 lojas fundidas, e em 390 delas o nome é diferente do da loja principal.

O que fazer, em `lib/upsert.js` ou numa camada comum que todos os robôs usem:
- Numa rodada, guardar `storeId → a linha da fonte escolhida`.
- Quando uma segunda linha da fonte cair na mesma loja:
  1. ganha a linha cujo nome normalizado é **igual ao nome da própria loja**
     (e não ao nome de uma loja fundida nela);
  2. se nenhuma das duas for igual, ou se as duas forem, ganha a **maior taxa**;
  3. nunca vale "a última escrita ganha".
- No fim da rodada, publicar a lista de colisões no resumo do job (nomes da
  fonte, loja, taxas e quem ganhou), para o Cowork desfazer as fusões erradas.
- Teste: uma lista com "Currys" (Up to 6) e "Currys Partmaster" (5), as duas
  apontando para a Currys, grava 6 com "Up to", em qualquer ordem.

### 2. Cheddar: o robô lê o "até X%" do site de marketing

`scrapers/cheddar.js` lê `https://cheddar.me/gift-cards`. Essa página mostra
24 marcas, todas como **"up to N%"** (Currys "up to 6.5%"). A página da marca
(`/gift-cards/currys`) também só diz "up to 6.5%" e manda ver a taxa no app.
No app, o dono vê **4%**. O robô grava o teto do marketing como se fosse a
taxa do dia.

O que fazer:
1. Tirar `cheddar` da lista padrão do `scrape-daily.yml`, para uma rodada
   manual não reativar as ofertas. Tirar `cheddar` do `WATCHED` da
   `source-alert`; o Cowork publica a função depois do merge.
2. Investigar se existe uma fonte com a taxa real, como o app da Cheddar ou
   uma API usada pelo app, talvez pelo Chrome do Mac já logado, como na NX.
   Regras:
   - nada de quebrar login nem captcha;
   - mandar ao Cowork um relatório só de leitura com 10 marcas e as taxas,
     **antes** de gravar qualquer coisa.
3. Enquanto não houver fonte real, a Cheddar fica desligada. Nunca gravar um
   valor "up to" de marketing como taxa.

### 3. NX: 163 lojas da NX sem par no banco, e por isso fora do site

No relatório da NX de 21/11 (`nx-report-2026-11-21.json`):
- 1.457 lojas lidas;
- 1.346 confirmadas;
- **163 sem par** (`unmatched`);
- 56 ambíguas.

As lojas sem par não ganham oferta. Exemplos: Holland and Barrett, French
Connection, Hoka, Canon, Debenhams, JBL UK, EE Mobile, Fortnum and Mason,
Hoover, allbeauty, Dare2b e Laithwaites.

Causas, em `lib/nx.js` (`nxKey` e `buildStoreIndex`):
- **"and" contra "&":** "Holland and Barrett" vira `hollandandbarrett`, e a
  loja "Holland & Barrett" vira `hollandbarrett`.
- **Nomes de lojas fundidas não entram no índice.** "French Connection"
  estava fundida (já corrigido pelo Cowork), "Hoka" tem a loja "Hoka One One",
  e "Canon" tem a loja "Canon Store".
- **"The" no começo e sufixos como "Store" ou "Shop"** atrapalham a comparação.

O que fazer:
1. **Normalização:** `&` vira `and`; tirar "the" do começo. Comparar também
   sem os sufixos "store", "shop", "official", "direct" e "outlet", **mas
   só se der um único par**.
2. **Índice:** incluir os nomes das lojas fundidas, apontando para a loja
   principal. Incluir também o slug.
3. **Aliases:** ler os apelidos de `ops.nx_aliases`, e não do objeto
   `NX_ALIASES` fixo no código.
   - O Cowork completa a tabela com as lojas que continuarem sem par.
   - Não criar lojas novas sem o dono.
4. **Não ligar "Currys Partsmaster" (NX) à Currys.** É outra loja, de peças e
   acessórios.
5. **Teste** com o relatório de 21/11: sem par cai bem abaixo de 50, e
   nenhuma loja hoje confirmada muda de par.

### 4. Checagem diária automática contra a fonte (todos os robôs)

Para o dono não precisar achar erro na mão:
- No fim de cada robô, escolher 5 lojas grandes da lista lida. Exemplos:
  Currys, ASOS, Boots, Apple, John Lewis e Argos.
- Comparar o que foi **gravado no banco** com o que a fonte mostra **na mesma
  rodada**.
- Se for diferente, a rodada fica vermelha e o resumo mostra as lojas.

Isso teria pegado a Currys no Avios no mesmo dia.

## Depois do merge (Cowork)

- Rodar o Avios à mão. Conferir:
  - Currys com 6 e "Up to";
  - a lista de colisões no resumo;
  - desfazer as fusões erradas que aparecerem.
- Rodar a NX à mão. Conferir a queda dos "sem par" e completar
  `ops.nx_aliases`.
- Publicar a `source-alert` sem a Cheddar.
- Rever a Currys no site com o dono.
