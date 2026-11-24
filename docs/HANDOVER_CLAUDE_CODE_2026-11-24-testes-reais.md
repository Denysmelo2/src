# Handover Cowork → Code: testes reais do dono (24/11/2026)

O dono testou o site no iPad e no PC e mandou 5 prints. O Cowork conferiu
cada item no código, no banco e nos links.

## O que o Cowork já fez (24/11)

- **JamDoughnut e EverUp voltaram a gravar** (scraper#72). Desde 22/11, as
  linhas `listingRate`/`terms` estavam na gravação de gift card e quebravam
  todas as gravações. Foram movidas para a gravação de cashback, o que
  também destrava o `listing_rate` da Quidco.
- **Ribbon:** o passo 1 da estratégia `ribbon-rent-cashback` agora traz o
  código **DENYD11D** e o bônus de **£25** depois do primeiro aluguel pago
  pelo Ribbon. O código é digitado no app; o link não leva o código.
- **Estratégia `nx-one4all-basic`:** saiu a Cheddar, que está desligada, e o
  Revolut Metal foi corrigido para 1 RevPoint a cada £2 (era 1 por £1).
- **Cartões:** 4 estratégias novas em "Banking & cards" (`amex-gold-avios`,
  `ba-amex-avios`, `barclaycard-avios`, `amex-cashback-everyday`), com as
  taxas conferidas nos sites dos bancos em 22/11.

## Tarefas para o Code (src)

### 1. Hot deals: ver todas as ofertas com boost (print 1)

Embaixo da lista de cada plataforma aparece só "+ 188 more jamdoughnut
boosters not shown.", sem nada para clicar.
- Trocar por um botão **"Show all 192 JamDoughnut boosts"**, que abre a
  lista inteira daquela plataforma na mesma página. Pode carregar de 24 em
  24 com "Show more".
- Trocar `jamdoughnut` pelo nome da plataforma (`platformLabel`), nunca o
  código.

### 2. Códigos de indicação: um lugar só, sempre à vista

**Problema:** os links de indicação ficam em dois lugares que não batem:
`src/lib/affiliateLinks.js` e `platform.affiliate_url`. A EverUp tem
`r2phpwig` no arquivo e `vg866wd3` no banco; a Airtime tem `B3GxIXjhbYb` no
arquivo e `XlgKV6ABNWb` no banco. Além disso, vários apps só dão o bônus se
a pessoa **digitar o código** no cadastro, e o site não mostra código
nenhum. Por isso o dono clica e "não aparece nada de referência".

O que o Cowork testou em 24/11:

| Plataforma | Link | Situação |
|---|---|---|
| Ribbon | `ribbonrewards.io/?ref=DENYD11D` | Abre, mas a página não leva o código. Mostrar **DENYD11D**: £25 depois do primeiro aluguel. |
| NX Rewards | nenhum | Mostrar o código **REFXYH9R**, com o link `https://www.nxrewards.com/`. |
| Curve | `curve.com/join#NVOGMMLD` | O site descarta o que vem depois do `#`. Mostrar o código **NVOGMMLD**. |
| EverUp | onelink | No PC vai direto para a App Store, sem código. O dono manda o código dele. |
| Rakuten | `rakuten.co.uk/r/denysf20` | **Quebrado:** redireciona para rakuten.com (EUA). O dono manda o link do Reino Unido. |
| Avios | mention-me | Ok: "you and Denys each get 500 Avios". |
| JamDoughnut | onelink, `UFDN` | Ok (código UFDN). |
| Quidco, Cheddar, Airtime, Monzo | — | Abrem. |

O que fazer:
- Migração: `platform.referral_code text`, `platform.referral_reward text`
  (o que a pessoa ganha, em inglês) e `platform.referral_note text` (onde
  digitar o código). O Cowork preenche.
- Uma função só, por exemplo `getReferral(platform)`, que lê o banco e usa
  `affiliateLinks.js` só quando o banco estiver vazio. Apagar os links
  duplicados que discordam.
- Em todo botão "Open X" (passos das estratégias, Platform guide, card da
  rota na comparação), quando houver código, mostrar logo abaixo: "Use code
  **DENYD11D** when you sign up — you get £25 after your first rent
  payment", com um botão **Copy code**.
- No Platform guide, cada plataforma mostra o código e o que a pessoa ganha.

### 3. Avios: "Bought through Avios before?" não se entende (print 3)

Na estratégia "Sainsbury's: NX or Avios", o campo "Bought through Avios
before? Yes/No" muda a oferta do Avios: a Sainsbury's paga mais Avios a
quem nunca comprou nela pelo Avios eStore. A pergunta não explica isso.
- Novo texto: **"First Sainsbury's order through the Avios eStore?"**
  ("Yes, first order" / "No, I've ordered before").
- Embaixo, em letra pequena: "Avios pays new eStore customers more. Pick 'No'
  if you have bought Sainsbury's through the Avios eStore before."
- Começar com "No", que é o caso mais comum, e não com "Yes".

### 4. Ebook: o botão não abre o livro (print 2)

- O dono clicou para ler o ebook e caiu no Platform guide. Na Playbook, o
  "Read the guide" leva a `/learn/platforms`, que é o guia das plataformas,
  e não o livro.
- A `/library` tem "Open in SnapGain Shop" **desligado** ("coming once
  SnapGain Shop is live"). O snapgain.shop não responde em 24/11.
- Os 9 capítulos estão no projeto Supabase "SnapGain Calculadoras"
  (`auhtwkvwbgvekvwctcaj`, tabela `chapters`, cerca de 300 KB de HTML), não
  no do site.
- **Espera a decisão do dono** (o Cowork pergunta): trazer o leitor para
  dentro do snapgain.uk (`/library`) e copiar os capítulos para o banco
  principal. O Cowork copia; o Code traz o `ChapterReader` com o
  `cleanEbookHTML()`. Enquanto isso, na Playbook, o botão diz "Platform
  guide" e não "Read".

### 5. Platform guide desatualizado (print 2)

- "Start here" diz "sign up for these 4-5 platforms first", mas mostra só
  3: JamDoughnut, Quidco e Avios. Incluir a **NX Rewards**, que é a
  principal do SnapGain, com o mínimo de 10%.
- Rever os textos de cada plataforma contra o banco. A EverUp, por exemplo,
  diz "Smaller network than NX / JamDoughnut", mas hoje tem 337 marcas
  contra 282 da JamDoughnut. A Cheddar não aparece enquanto estiver
  desligada.

## Depois do merge (Cowork)

- Aplicar a migração e preencher `referral_code`, `referral_reward` e
  `referral_note` com o que estiver confirmado.
- Testar cada botão "Open X" no PC e no iPad.
- Conferir o Hot deals com "Show all".
