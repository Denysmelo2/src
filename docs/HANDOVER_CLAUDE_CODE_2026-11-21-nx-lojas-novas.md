# Handover Cowork → Code: lojas novas da NX entram sozinhas (21/11/2026)

## Decisão do dono (21/11, 17:04)

> "Você deve adicionar as lojas novas que vão entrando. Quando o NX adicionar
> novas lojas, você deve adicionar no SnapGain."

Até hoje, uma loja da NX sem par no banco ficava fora do site (`unmatched` no
relatório) até alguém criar a loja à mão. A partir de agora, o robô da NX cria
a loja sozinho.

## O que o Cowork já fez (21/11)

- Criou 55 lojas, todas com o nome exato da NX. A lista está em
  `ops.nx_created_stores_20261121`.
- Criou 8 apelidos em `ops.nx_aliases` para nomes da NX que já eram uma loja
  do SnapGain:

  | Nome na NX | Loja do SnapGain |
  |---|---|
  | Currys Partsmaster | Currys Partmaster |
  | AEG Parts and Accessories | AEG Spare Parts & Accessories |
  | Bosch Home & Garden | Bosch Power Tools Home & Garden |
  | EE Mobile | EE |
  | Everton | Everton Direct |
  | Crystal Ski - National Express | Crystal Ski |
  | Tui - National Express | TUI |
  | Tesco MP | Tesco Marketplace (loja nova) |

- Rodou a NX com `nx_max_adds = 70`: 63 ofertas novas gravadas, e sobrou
  **1 loja sem par**, a KiwiCo. Ela tem `excluded_at` (alguém a excluiu antes),
  e por isso ficou de fora.

## Tarefa para o Code (snapgain-scraper, um PR)

No robô da NX (`scrapers/nx.js` e `lib/nx.js`):

1. **Criar a loja sozinho.** Uma linha da NX que continuar sem par, mesmo
   depois dos apelidos, da normalização e dos nomes fundidos, vira uma loja
   nova:
   - `name` = o nome da NX, sem mudar nada;
   - `slug` pela mesma regra dos outros robôs, sem repetir um slug que já existe;
   - `category = {other}`, a não ser que a NX mande uma categoria;
   - `is_active = true`;
   - em seguida, a oferta da NX é gravada nessa loja, na mesma rodada.
2. **Nunca recriar uma loja excluída.** Se o nome bater com uma loja que tem
   `excluded_at` (hoje, a KiwiCo), não cria nada e só lista a loja no resumo.
3. **Nunca criar loja para um nome ambíguo** (duas ou mais candidatas). Só
   listar no resumo, para o Cowork decidir.
4. **Trava contra lista quebrada.** Com mais de 25 lojas novas num dia, o
   robô não cria nenhuma, deixa todas seguradas e a rodada fica amarela,
   como já faz hoje com `nx_max_adds`. O Cowork confere e roda de novo com
   um limite maior.
5. **Resumo do job:** uma tabela "Lojas novas criadas hoje" com nome, slug e
   taxa, para o Cowork ajustar a categoria e conferir se não é uma loja já
   existente com outro nome.
6. **Teste:** uma lista com um nome sem par cria a loja e grava a oferta. Com
   um nome que bate com uma loja excluída, nada é criado. Com 26 nomes sem
   par, nada é criado e todos ficam segurados.

## Depois do merge (Cowork)

- Conferir no resumo das próximas rodadas as lojas criadas e acertar a
  categoria.
- Quando uma loja criada for, na verdade, uma loja que já existia com outro
  nome: juntar as duas (`merged_into`) e incluir o apelido em `ops.nx_aliases`.
