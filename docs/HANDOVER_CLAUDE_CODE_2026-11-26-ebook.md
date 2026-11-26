# Handover Cowork → Code: o ebook abre dentro do snapgain.uk (26/11/2026)

## Decisão do dono (26/11, 17:44)

> "Sim, abrir para assinantes."

O ebook **"Stop Losing Money"** passa a ser lido dentro do site, na
`/library`, por quem é assinante. Hoje o botão está desligado ("coming once
SnapGain Shop is live"), e o snapgain.shop não responde.

## O que o Cowork já fez

- **Copiou os 9 capítulos** do projeto Supabase "SnapGain Calculadoras"
  (`auhtwkvwbgvekvwctcaj`, tabela `chapters`) para o banco do site, na
  tabela de passagem **`ops.ebook_chapters_import`** (sem acesso para anon e
  authenticated):

  | n | Título | HTML |
  |---|---|---|
  | 1 | Introduction | 5.927 |
  | 2 | PART I: THE PROBLEM EVERY IMMIGRANT IN THE UK FACES | 8.402 |
  | 3 | PART II: THE DISCOVERY THAT CHANGES EVERYTHING | 11.097 |
  | 4 | PART III: CASHBACK | 54.881 |
  | 5 | PART IV: AIR MILES PROGRAMS | 53.970 |
  | 6 | PART V: TESTED AND APPROVED STRATEGIES | 73.531 |
  | 7 | PART VI: THE SECRET REVEALED | 46.000 |
  | 8 | PART VII: PRACTICAL IMPLEMENTATION | 27.461 |
  | 9 | PART VIII: Valuable Resources | 17.555 |

  Colunas: `id, product_id, locale ('en'), chapter_number, title,
  html_content, created_at`. Todos são do mesmo produto,
  `d88f9512-d0b9-4fb5-9773-72ff4dd86d3b`.
- **As 49 imagens** dos capítulos estão em `https://cdn.gamma.app/...`,
  público. Não há `file://` nem Storage do outro projeto.
- **O CSS do livro** (classes `.sg` e `.sg4`, com modo escuro em
  `[data-theme="dark"]`) estava num arquivo do Project do dono. Agora está
  em **`docs/ebook/ebookDesign_FINAL.css`**.

## Tarefas para o Code (src, um PR)

1. **Migração `0053_ebook_chapters`:**
   - tabela `public.ebook_chapters`, com as mesmas colunas, chave em
     `(product_id, locale, chapter_number)`;
   - copiar de `ops.ebook_chapters_import`;
   - **RLS:** `select` só para quem pode ver conteúdo Pro. Usar a mesma
     regra do `useSubscription`, feita no banco:
     - `subscription_status in ('active','trialing')`;
     - ou `trial_end > now()`;
     - ou `role = 'admin'`, em `user_profiles`;
   - nenhuma escrita por anon ou authenticated;
   - a lista de capítulos (número e título) pode ser pública, numa view ou
     coluna separada, para a página mostrar o sumário com cadeado.
2. **Leitor na `/library`:**
   - página do livro com o sumário dos 9 capítulos e a página de cada
     capítulo, por exemplo `/library/stop-losing-money/1`;
   - renderizar `html_content` com sanitização (DOMPurify ou o que o
     projeto já usa), mantendo as classes `sg*`, as tabelas e as imagens
     do gamma;
   - importar o CSS de `docs/ebook/ebookDesign_FINAL.css`, movendo-o para
     `src/styles/`. Conferir se o CSS não vaza para o resto do site; se
     vazar, prefixar com `.chapter-content`;
   - botões "anterior" e "próximo";
   - no celular, sem rolagem horizontal; as tabelas rolam dentro do
     `.sg4-twrap`.
3. **Quem não é assinante:** vê o sumário e o capítulo 1 (Introduction)
   inteiro. Do 2 em diante, um cartão "Subscribe to read", com o botão de
   assinar que o site já usa.
4. **Botões que hoje não levam ao livro:**
   - `/library`: "Open in SnapGain Shop", hoje desligado, vira "Read the
     ebook";
   - na Playbook, `PlaybookPage.jsx:107`, que hoje leva a `/learn/platforms`
     com o texto "Read the guide": manter o guia como está e acrescentar
     "Read the ebook" para a `/library`;
   - `StrategyPage.jsx:465` ("Open library"): conferir que abre a página
     nova.
5. **Progresso de leitura (opcional, se for simples):** lembrar o último
   capítulo aberto, em `user_profiles.preferences`, que já existe (0048).

## Observação para o dono

O texto do livro é o de antes de 18/10. Ele ainda cita o One4all pelo NX e
a Cheddar, que hoje está desligada no site. O Cowork não mexeu no
conteúdo. Se o dono quiser atualizar, é outra tarefa.

## Depois do merge (Cowork)

- Aplicar a 0053 e conferir as 9 linhas.
- Testar com a conta de teste, que é assinante, e sem login, no PC e no
  celular.
- Apagar `ops.ebook_chapters_import` depois que tudo estiver certo.
