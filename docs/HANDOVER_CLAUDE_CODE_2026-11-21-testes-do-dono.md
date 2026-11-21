# Handover Cowork → Code: testes do dono no site (21/11/2026, noite)

O dono testou o site no celular e no PC e mandou a lista abaixo. O Cowork
conferiu cada item no site (conta de teste, Chrome) e no código, e achou a
causa de todos. O que é dado e cron, o Cowork já fez. O resto é tela e
código, e fica com o Code.

## O que o Cowork já fez (21/11)

1. **Currys Partmaster unida na Currys** (decisão do dono, 21/11): "currys
   partmaster é igual currys, que vai pegar o valor mais alto". O "não ligar
   Currys Partsmaster à Currys" do handover "taxas erradas" (tarefa 3.4)
   **deixa de valer**.
   - `currys-partmaster` agora tem `merged_into` = Currys; a oferta NX 10%
     foi para a Currys; o Avios 5 da Partmaster ficou inativo.
   - `ops.nx_aliases`: "Currys Partsmaster" → `currys`.
   - Cópias: `ops.fix_backup_20261121_currys_pm_*`.
   - No site, a Currys mostra NX 10% como #1, depois Avios 6, EverUp 5,1%,
     Quidco 4% e JamDoughnut 3,5%.
   - Na rodada do Avios, "Currys" (6) e "Currys Partmaster" (5) caem na
     mesma loja. A regra de colisão escolhe "Currys" (nome igual ao da loja),
     que também é a maior. Nada a mudar no robô.
2. **NX mínimo 10%:** nenhuma das 1.911 ofertas ativas da NX está abaixo de
   10%. 160 lojas com oferta NX estavam sem `in_nx_network`; o Cowork marcou
   todas.
3. **E-mail de boost:** o cron `daily-boost-digest` passou de 08:00 para
   **11:00** (UTC). Às 08:00 ele rodava antes da rodada das 09:00 (NX,
   Quidco, Avios), e os boosts do dia só iam no e-mail do dia seguinte.

## Tarefas para o Code (src)

Agrupei em 4 PRs. A ordem é a prioridade.

### PR A. Comparação: números e estratégia certos

**A1. Gift card + NX na Currys (exceção testada pelo dono).** Hoje
`computeStrategies` nunca junta gift card com NX, por causa dos Special
Terms da NX (Deliveroo e Boots, 18/10). O dono testou na Currys em 21/11:
comprou o gift card da Currys, entrou na NX, buscou Currys (aparece como
"Partmaster.co.uk"), foi para a Currys, pagou com o gift card e a NX
registrou os 10%.
- Migração: `stores.nx_gift_card_ok boolean not null default false`.
- Em `strategies.js`, a pilha gift card × NX entra **só** quando
  `store.nx_gift_card_ok`. Quidco e Picodi continuam fora.
- Passos da pilha: 1) comprar o gift card na plataforma de maior % (nome e
  %); 2) entrar na NX e buscar a loja pelo nome que a NX usa (A3);
  3) comprar e pagar com o gift card.
- Aviso no card: "Tested by SnapGain on Currys. NX may still decline it
  later." O Cowork liga a Currys depois do merge.
- Teste: Currys £100 com EverUp 5,1% e NX 10% → pilha £15,10 em #1; Boots
  (sem a marca) continua sem a pilha.

**A2. Ganho do cartão dentro do total.** Hoje aparece só a linha "+ ~£1.00
if you pay with a 1% card", fixa em 1% e fora do total. O dono quer que o
cartão do usuário entre no resultado.
- Migração: em `platform` (linhas `type = 'card'`), colunas
  `card_earn_rate numeric` e `card_earn_unit text` (`pct`, `avios` ou
  `points`). O Cowork preenche os valores depois de conferir com cada banco.
- Usar o **melhor cartão salvo** do usuário (`user_cards.card_provider` →
  `platform.code`). Sem cartão salvo, nada muda: fica a linha de hoje, fora
  do total.
- O cartão ganha sobre o dinheiro que sai do cartão: o valor cheio na
  cashback; o preço do gift card na rota de gift card; o valor pago depois do
  código na rota de estudante.
- Mostrar a parte do cartão em separado no card ("incl. £1.00 from your
  Amex"), para o total não parecer mágica.
- Teste: um usuário com cartão 1%, Currys £100, NX → £11,00 no total.

**A3. Nome da loja na NX nos passos.** O passo "Search for Currys" erra
quando a NX usa outro nome ("Currys Partsmaster"). Guardar o nome da fonte
na oferta (ex.: `cashback_offers.source_name`, escrito pelo robô da NX) e
mostrar "On NX, search for 'Currys Partsmaster'" quando for diferente do nome
da loja. Isso é um PR no snapgain-scraper mais a leitura no src.

**A4. Número de lojas.** O "12,000+ stores" está escrito à mão em
`ComparePage.jsx:1095`. No banco: 13.148 linhas, 8.621 ativas e 4.840 com
oferta viva. O "Browse all" mostra 7.144. Usar **um** número, da mesma
consulta que o "Browse all" usa, arredondado para baixo na centena
("7,100+ stores"), nos três lugares. Conferir também por que o "Browse all"
dá 7.144 e não 8.621, e escrever a regra no comentário.

**A5. Hot deals só mostra Quidco e JamDoughnut.**
- `HotDealsPage.jsx` só lê `cashback_offers` e `gift_card_offers`. Os 324
  boosts do Avios (`point_offers.booster_available`) nunca aparecem. Incluir
  o Avios, com "was X, now Y".
- Não existe gatilho em `point_offers`, então boost do Avios não vira
  `booster_events`, e por isso também não vai no e-mail. Criar
  `track_points_booster_change()` igual aos de cashback e gift card.
- EverUp e NX: 0 ofertas com `is_boosted`. Ver nos robôs se a fonte mostra
  "was/now" e, se mostrar, gravar. Se não mostrar, escrever isso no README
  do robô e parar por aí.

### PR B. Página da estratégia e layout

**B1. "See full" repete tudo.** A página `/strategy` mostra outra vez as
rotas alternativas que o usuário acabou de ver na comparação. Mostrar só a
rota escolhida e os passos, com um link "Compare all routes" de volta.

**B2. Voltar.** `StrategyPage.jsx:217` e `:249` levam para "Back to
{store}" (`/store/:slug`). Quem veio da comparação tem que voltar para
`/compare?store=…&amount=…`, com a mesma loja e o mesmo valor. Se a página
foi aberta direto (sem histórico), usar a comparação da loja.

**B3. Textos crus na página da estratégia.** Aparecem "GIFT_CARD",
"CASHBACK" e "POINTS" como etiqueta. Usar os mesmos rótulos da comparação
("Gift card", "Cashback", "Avios"). O aviso "Some retailers exclude gift
card purchases" aparece numa rota só de NX, sem gift card: mostrar só quando
a rota usa gift card.

**B4. Celular: letra desproporcional** (print do dono, Boots, 18:20).
`CuratedStrategyCard.jsx`: o bloco à direita tem `max-w-[7.5rem]` e escreve
"Compare" em `text-3xl`. A palavra corta ("Compar") e o título fica com
duas palavras por linha. No celular (abaixo de `sm`): tirar esse bloco do
lado e pôr embaixo do título, em uma linha, com a letra no tamanho do
corpo. Rever as outras páginas no celular com a mesma regra: nada de texto
gigante em coluna estreita. Testar em 390 px (iPhone) e 360 px.

**B5. Melhor opção em destaque no PC.** Hoje a #1 tem só um fundo rosa bem
claro e a borda roxa, e no PC o dono a vê "cinza como as outras". Dar
destaque claro: faixa "Best route" com cor cheia, borda mais grossa e
fundo de cor. As outras ficam neutras.

**B6. "#1, #2…" feio.** Trocar os números pela forma do resto do app: a
primeira com o selo "Best route", as outras sem número (a ordem já diz) ou
com um selo discreto "2nd best". Vale também para os `#tag` dos cards
curados: tirar o "#".

**B7. Botão dos passos.** Hoje só fica verde ao passar o mouse, e não
parece um botão. Botão visível o tempo todo: "See steps", com ícone,
contorno na cor do app. No celular, a área de toque inteira do card abre os
passos (já é assim), e o botão continua visível.

**B8. Imagem quebrada no carregamento.** Ao abrir `/profile`, a tela de
"Save time. Save money. Every time." mostra o ícone de imagem quebrada no
lugar do logo. Corrigir o caminho do logo.

### PR C. Profile e Dashboard

**C1. Preferências só no navegador.** `lib/userPrefs.js` tenta gravar em
`user_profiles.preferences`, mas **essa coluna não existe**, então tudo
(nome de preferência, telefone, local, idioma, notificações, acessibilidade)
fica só no `localStorage` daquele navegador. O dono preenche no celular e não
vê no PC.
- Migração: `user_profiles.preferences jsonb not null default '{}'`, com o
  usuário podendo gravar só a própria linha (mesma política do `is_student`,
  0045).
- Ao carregar, se houver `localStorage` e a coluna estiver vazia, subir o
  `localStorage` uma vez (o código já prevê isso).

**C2. Nome de preferência no Dashboard.** `HomePage.jsx:148` usa só
`user_metadata.name`. Ordem: `preferredName` → primeiro nome →
e-mail. O mesmo no cabeçalho ("dede m") e no avatar.

**C3. Botão Salvar à vista.** Hoje o Save fica no canto do card, e no
celular sai da tela quando o usuário desce para editar. Assim que algo mudar,
mostrar uma barra fixa no pé da tela com "Save changes" e "Discard", até
salvar. Ao sair da página com mudança não salva, perguntar.

**C4. Adicionar e remover sem "Edit".** Nas listas (bancos, cartões,
programas, lojas favoritas), adicionar ou remover um item já grava na hora,
com um toast "Removed. Undo" por alguns segundos. O "Edit" fica só para os
campos de texto (nome, telefone, local).

**C5. Buscas recentes vazias.** `useRecentSearches().push` só é chamado em
`SearchPage.jsx:46`. Buscar pela comparação, que é o caminho de quase todo
mundo, não grava. O Cowork buscou Currys e Boots na comparação e a lista
continuou vazia. Chamar o `push` quando a comparação abre uma loja
(`/compare?store=…`), com o nome da loja e o valor.

**C6. "NX 10% at 1,000+ stores"** no Dashboard: hoje são ~1.900. Usar o
número do banco, arredondado, ou "nearly 2,000".

### PR D. Settings

**D1. Two-factor não faz nada.** É só um `twoFactorEnabled` no
`localStorage`. Fazer de verdade com o MFA do Supabase Auth (TOTP):
`mfa.enroll` (QR code e código de 6 dígitos), `mfa.challenge` e
`mfa.verify` no login quando o usuário tiver fator (AAL2), e desligar com
`mfa.unenroll` depois de pedir o código. Enquanto não estiver pronto,
**tirar o botão**: um interruptor que não protege nada é pior do que nenhum.

**D2. Notificações.** Os 4 botões "Email notifications", "Push",
"Weekly reports" e "Deal alerts" são só `localStorage` e não ligam nenhum
envio (o próprio código diz isso). O único que funciona é "Daily boost
email", gravado em `user_notification_prefs`; o envio de hoje às 08:00 foi
mandado. Decisão do dono: alertas de boost **só das lojas favoritas**, o
que o `daily-boost-digest` já faz. Então:
- tirar os 4 botões que não fazem nada (ou deixar com "Coming soon",
  desligados);
- deixar o "Boost email for your favourite stores" no topo, com o texto
  "sent around 11am UK time" (o Cowork mudou o horário);
- no Profile, perto das lojas favoritas, um link "Get an email when these
  get a boost" que leva a esse botão.

## Depois do merge (Cowork)

- Aplicar as migrações (`nx_gift_card_ok`, `card_earn_*`, `preferences`,
  gatilho de pontos), ligar `nx_gift_card_ok` na Currys e preencher as
  taxas dos cartões, conferidas com cada banco.
- Testar de novo cada item no site com a conta de teste, no PC e em 390 px.
- Conferir no dia seguinte o e-mail de boost das 11:00 e o Hot deals com o
  Avios.
