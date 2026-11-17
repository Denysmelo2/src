# Handover Cowork → Code: descontos de estudante (17/11/2026)

## O que o dono quer

Uma opção **"Sou estudante"** no perfil. Quem marca passa a ver, na busca e
no `/compare`, o desconto de estudante de cada loja na **Student Beans** e
na **UNiDAYS**. Quem não marca não vê nada disso.

### Decisões do dono (17/11)

1. **Só o percentual e o nome da plataforma.** Exemplo: "15% student
   discount on Student Beans". **Nenhum link** para a Student Beans ou para
   a UNiDAYS e nenhum código. O estudante pega o código no app da
   plataforma, depois de verificar que é estudante.
2. **O desconto de estudante soma com o cashback.** O dono testou em 17/11:
   - NX Rewards, Charlotte Tilbury, 10% de cashback pelo link da NX;
   - código de estudante da Student Beans, 15% off, colado no checkout da
     loja;
   - pagamento com Amex (1 ponto por £1).

   A NX registrou o cashback. Total: 15% off + 10% de cashback + pontos do
   cartão.
3. A opção aparece no cadastro e em Settings.

## O que o Cowork conferiu (17/11)

- **Student Beans:** as páginas de marca abrem sem login, por HTTP simples.
  Exemplo: `https://www.studentbeans.com/student-discount/uk/asos`, que
  mostra "10% Student Discount". Tem `sitemap.xml` (18 MB), e o
  `robots.txt` só bloqueia `/accounts`, `/verification`, `*query*` e áreas
  do usuário. As páginas de marca são liberadas.
- **UNiDAYS:** as páginas de marca abrem sem login. Exemplo:
  `https://www.myunidays.com/GB/en-GB/partners/asos/view`, com "10% Off
  Full Price & Sale", "20% Off" e "15% Off for New Customers". Tem
  `sitemap.xml` → `sitemap-partners.xml`, e o `robots.txt` só bloqueia um
  robô de terceiros.
- As duas páginas misturam vários tipos de oferta: a de estudante, eventos
  de liquidação ("50% off EVERYTHING + extra 12%"), "new customers only" e
  "sale items". **O robô tem que gravar o desconto de estudante geral, não
  o maior número da página.** Na ASOS, isso dá 10% na Student Beans; o 50%
  é a liquidação, e o desconto de estudante ali é o "extra 12%".

## Tarefas, em ordem (um PR por tarefa)

### 1. Banco (src, migração)

- `user_profiles.is_student boolean not null default false`.
  - O próprio usuário pode alterar: grant de UPDATE **só nessa coluna**
    para `authenticated`. A política de update de hoje já restringe a
    `auth.uid() = user_id`.
  - Conferir que o grant não reabre a coluna `role`, nem nenhuma de
    assinatura.
- Tabela nova `public.student_offers`:
  - `id`, `store_id` (fk `stores`), `platform` (`'studentbeans'` ou
    `'unidays'`), `discount_pct numeric`, `title text` (o texto da oferta,
    por exemplo "15% Student Discount"), `channel text` (`'online'`,
    `'instore'` ou `'both'`), `is_active`, `last_verified_at`,
    `created_at`, `updated_at`;
  - único em `(store_id, platform)`.
  - RLS: SELECT para `anon` e `authenticated`, igual às outras tabelas de
    oferta (o percentual não é segredo; quem esconde é o site). Escrita só
    pelo service role.
- Incluir `student_offers` em `public.source_freshness()`, para o
  `/admin` e o alerta de 48h. Acrescentar `studentbeans` e `unidays` ao
  `WATCHED` da `source-alert`.

### 2. Robôs (snapgain-scraper)

Dois robôs novos, `scrapers/studentbeans.js` e `scrapers/unidays.js`, na
rodada das 08:00 (`scrape-daily`), por HTTP simples, sem navegador e sem o
Mac.

- **Lista de marcas:** pelo sitemap de cada uma (Student Beans: as URLs
  `/student-discount/uk/<marca>`; UNiDAYS: `sitemap-partners.xml`, as URLs
  `/GB/en-GB/partners/<marca>/view`).
- **Ritmo:** no máximo 2 páginas por segundo, com o mesmo User-Agent dos
  outros robôs.
- **Qual número gravar:**
  - ler os dados estruturados da página (JSON do Next.js ou
    equivalente), não um regex no texto;
  - gravar o **desconto de estudante geral** da marca;
  - não gravar: liquidações gerais, ofertas "new customers only", "sale
    items only", "app only", nem valores fixos em £;
  - se a marca tiver online e loja física com percentuais diferentes,
    gravar o maior e marcar o `channel`;
  - se a página não tiver nenhum desconto de estudante em %, não gravar.
- **Lojas:** `upsertStore` como os outros robôs (slug → nome → domínio →
  `merged_into`).
- **Varredura:** igual à dos outros robôs, com a trava de não desligar
  mais que a fração habitual de uma vez.
- **Teste:** um HTML ou JSON de exemplo da ASOS em cada plataforma deve
  gravar 10% e ignorar o 50% e o "15% for new customers".
- Log no fim: marcas lidas, ofertas gravadas e 5 exemplos com o
  percentual.
- Não grave `affiliate_link` (o dono não quer links).

### 3. Site (src)

**Cadastro e Settings**
- Checkbox "I'm a student (see Student Beans and UNiDAYS discounts)" no
  cadastro, desmarcado por padrão.
- O mesmo controle em Settings, gravando `user_profiles.is_student`.

**Busca e loja** (só para `is_student = true`)
- Na lista e na página da loja: selo "Student −15%".
- Quem não é estudante não vê selo nenhum, e a ordem da busca não muda.

**`/compare`** (só para `is_student = true`)
- Rota "Student discount + cashback". Com desconto de estudante `d` e a
  melhor taxa de cashback ou de pontos em libras `c` da mesma loja (NX,
  Quidco, Avios eStore), sobre um valor `A`:
  - paga `A × (1 − d)`;
  - o cashback é calculado **sobre o valor já com desconto**:
    `A × (1 − d) × c`;
  - ganho total = `A × d + A × (1 − d) × c`.
  - Exemplo do dono, £100: 15% off = £15, NX 10% de £85 = £8,50,
    total **£23,50**.
- Passos da rota:
  1. "Get your 15% student code on Student Beans (student verification
     needed)" — sem link;
  2. "Open <store> through NX Rewards";
  3. "Enter the code at checkout";
  4. a linha do cartão de 1% ou 1 ponto por £1, como hoje (sobre o valor
     pago).
- **Gift card + desconto de estudante:** o código reduz o total e o gift
  card paga o resto. Ganho = `A × d + A × (1 − d) × g`. Mantém a regra:
  **NX nunca com gift card**.
- Se houver as duas plataformas, usar a maior e citar só essa.
- Aviso curto em toda rota de estudante: "Some stores don't pay cashback
  when a discount code is used — check the store's terms on the cashback
  site."

### 4. Testes de aceite (Cowork, depois do merge)

1. Usuário comum: busca ASOS, nenhum selo de estudante; `/compare` igual
   a hoje.
2. Marcar "I'm a student" em Settings: ASOS mostra "Student −10%", e o
   `/compare` mostra a rota de estudante com a conta acima.
3. Charlotte Tilbury £100, se a loja estiver na Student Beans com 15% e
   na NX com 10%: £23,50.
4. Desmarcar: tudo volta ao que era.
5. `user_profiles`: o usuário consegue mudar `is_student`, mas não
   `role` nem nenhuma coluna de assinatura.

## Depois do merge (Cowork)

- Aplicar a migração e conferir grants e RLS.
- Rodar os dois robôs à mão e comparar 10 marcas com as páginas.
- Fazer os testes da seção 4 com a conta de teste.
