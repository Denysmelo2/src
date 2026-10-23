# NX Rewards: estrutura da área de membro (observada em 23/10/2026)

Escrito pelo Claude Cowork em resposta a `docs/PARA_COWORK_NX_ROBO_2026-10-18.md`.
É a base para o robô diário do NX (tarefa 5 de
`docs/HANDOVER_CLAUDE_CODE_NX_2026-10-18.md`).

Como foi feito:
- No Chrome do Mac da Bárbara, com a **conta extra** dela. A própria
  Bárbara fez o login; o Cowork não digitou e-mail nem senha.
- Só leitura. Nenhum clique em loja, em "Shop now" ou em compra.
- Nenhum dado da conta foi copiado (nome, e-mail, saldo, histórico, número
  de membro).
- Os trechos de HTML abaixo foram **reescritos de forma estrutural**: tag,
  `class`, `data-*`, `href` e `src` sem query string, e o texto visível.
  - `<svg/>` marca um ícone que foi omitido.
  - `{eq}` substitui o `=` dentro do `href` (por exemplo
    `afsrc{eq}1` = `afsrc=1`).
  - Atributos com token ou sessão foram retirados.

## Resumo para o robô

| O quê | Resultado |
|---|---|
| Página com todas as parceiras | `https://cashback.nxrewards.com/allstores/85081/` (título "All merchants") |
| Paginação | **Não tem.** Uma página só, com as 1.446 lojas |
| Total mostrado | Texto "1446 retailers" na própria página (23/10/2026) |
| Onde está a taxa | **Na lista**, em cada loja ("10% Cashback", "12% Cashback"…). Também na página da loja |
| Página da loja | `https://cashback.nxrewards.com/info/85081/<merchantId>/<slug>/afsrc=1` (Boots = `6648`) |
| Busca | Funciona, com login: `/moreinfo/pgsearchm?type=merchant&keywords=boots` |
| Montagem da página | O HTML do servidor é uma casca vazia (cerca de 2,6 KB). A lista é montada por JavaScript depois de carregar. **O robô precisa esperar a página renderizar** |
| Sinal de deslogado | Qualquer endereço de `cashback.nxrewards.com` vai para `https://www.nxrewards.com/`, com o botão "SIGN IN" e o formulário `../User/Login/` |
| Captcha | Nenhum apareceu, nem logado nem deslogado |

### Números de 23/10/2026

- **1.446 lojas** na lista, todas no formato "N% Cashback". Nenhuma usa
  "Up to", "£" ou outro formato.
- **30 lojas acima de 10%**: 12%, 15% e 20%. As demais estão em 10%.
- Em 18/10 o Cowork contou 1.548 nomes, mas aquela contagem incluía itens
  "eGift" e foi feita por outro caminho (com a conta do dono).

## 1. Lista de lojas parceiras

**Endereço:** `https://cashback.nxrewards.com/allstores/85081/`

- Achado no menu da área de membro: o botão "Shop now" do bloco "CASHBACK"
  aponta para esse endereço.
- O `85081` aparece em todos os endereços da área de membro, inclusive nas
  categorias (por exemplo `/category/fashion/85081/76/`). Parece ser o
  código do programa NX, não da conta.
  - **Sugestão:** o robô lê esse número do link "Shop now" em vez de deixar
    fixo no código.
- O endereço antigo `/Home/AllRetailers/<número>` não serve mais:
  - em 18/10, deslogado, voltava para a home;
  - em 23/10, deslogado, vai para `https://www.nxrewards.com/Errors/Error404`.

**Paginação:** não tem.
- A página traz as 1.446 lojas de uma vez. Não há `?page=`, nem botão
  "mais", nem rolagem infinita.
- Existem 1.446 elementos `.blocks .block`.
- Cada loja aparece **3 vezes** no DOM, uma em cada layout (grade, linhas e
  versão de celular). São 4.338 links `/info/`, mas só 1.446 diferentes.
- **Para contar, use um layout só** (sugestão: `.blocks .block`) ou tire as
  repetições pelo `merchantId`.

**Título:** "All Retailers". O texto "1446 retailers" aparece na página.

**Taxa:** está **na lista**.
- No layout de grade: `.percent_text[data-search-rebate]`, por exemplo
  "10% Cashback".
- Nome: `.merchant_name[data-search-name]`. O elemento tem a classe
  `hidden`, mas o texto está lá.
- ID da loja: `data-merchantid` no link de favorito, e o 4º pedaço do `href`
  `/info/85081/<id>/…`.

### HTML de uma loja na lista (Boots, layout de grade, `.blocks .block`)

```html
<div class:"col-md-3 block has_voucher">
  <div class:"new" data-is_new:"false">
    <div class:"icon new-icon img-icon_shar_5"><svg/></div>
  </div>
  <div class:"new" data-is_bonus:"false">
    <div class:"icon new-icon img-icon_shar_10"><svg/></div>
  </div>
  <div class:"fav">
    <a class:"fav_cta" href:"#" data-fav-target:"" data-merchantid:"6648">
      <div class:"img_favourite icon img-icon_shar_4"><svg/></div>
    </a>
  </div>
  <a href:"/info/85081/6648/boots/afsrc{eq}1">
    <div class:"block_container">
      <div class:"merchant_name hidden" data-action:"edit-text" data-search-name:"">
        Boots
      </div>
      <div class:"logo" data-action:"edit-image">
        <img src:"https://d262o8ek72aza.cloudfront.net/mimg/boots_234x60_7.gif"></img>
      </div>
      <div class:"percent">
        <div class:"wrapper">
          <div class:"percent_text" data-action:"edit-text" data-search-rebate:"">
            10% Cashback
          </div>
        </div>
      </div>
      <div class:"bottom_icons">
        <div class:"box otb" data-otb:"0"> … </div>
        <div class:"box mmb" data-mmb:"0"> … </div>
        <div class:"box vouchers" data-vouchers:"0"> … </div>
        <div class:"box offer" data-offer:"0"> … </div>
        <div class:"cta" data-action:"edit-button"> … </div>
      </div>
    </div>
  </a>
  …
</div>
```

### A mesma loja no layout de linhas (`.voucher_row`)

```html
<div class:"col-md-12 voucher_row row-even has_icon">
  <div class:"voucher_row_inner">
    <div class:"cell">
      <div class:"icon fav_cta img-icon_desk_25" data-merchantid:"6648"><svg/></div>
    </div>
    <div class:"cell">
      <div class:"logo"><img src:"https://d262o8ek72aza.cloudfront.net/mimg/boots_234x60_7.gif"></img></div>
    </div>
    <div class:"cell">
      <div class:"desc" data-search-name:"">Boots</div>
    </div>
    <div class:"cell">
      <div class:"cashback">
        <span class:"percent" data-search-rebate:"">10%</span>
        <span class:"percent">Cashback</span>
      </div>
    </div>
    …
  </div>
</div>
```

### A mesma loja no layout de celular (`.block-wrapper`)

```html
<div class:"block-wrapper">
  <a class:"col-xs-12 block" href:"/info/85081/6648/boots/afsrc{eq}1">
    <div class:"inner-block">
      <div class:"logo"><img src:"https://d262o8ek72aza.cloudfront.net/mimg/boots_88x31_20.gif"></img></div>
      <div class:"content">
        <div class:"name" data-search-name:"">Boots</div>
        <div class:"rebate" data-search-rebate:"">10% Cashback</div>
        …
      </div>
    </div>
  </a>
</div>
```

### De onde vêm os dados (só para informação)

A página chama, depois de carregar:
- `https://v1-prod.incentivenetworks.com/v0/auth/wl`
- `https://v1-prod.incentivenetworks.com/v0/merchants`, que traz a lista.

O Cowork **não** abriu essas chamadas nem copiou cabeçalhos ou tokens.
- **Recomendação:** o robô lê a página renderizada no Chrome logado, como uma
  pessoa veria, e não chama essa API por fora.
- Se o Claude Code quiser usar a API, isso é decisão do dono, e precisa
  respeitar os termos do NX.

## 2. Página de uma loja (Boots)

**Endereço:** `https://cashback.nxrewards.com/info/85081/6648/boots/afsrc=1`
- Título da aba: "Merchant".
- A página também é montada por JavaScript. Ela mostra um ícone de
  "carregando" por 1 a 3 segundos.
- Chama `…/v0/merchants/6648`, `…/v0/merchants/6648/coupons` e
  `…/v0/merchants/6648/category/top`.

**Atenção:** os botões "Shop Now" da página apontam para
`/click/85081/6648/boots/afsrc=1`. **É o link de rastreio de compra. O robô
nunca deve abrir `/click/`.**

### HTML da taxa (`.offer-frame`)

```html
<div class:"col-md-6 offer-frame normal">
  <div class:"ribbon">
    <div class:"text dow">Deal of the day</div>
    <div class:"text otb">+ <b>Welcome Reward</b> *</div>
    <div class:"text mmb">+ <b>Monthly Bonus</b> *</div>
    …
  </div>
  <div class:"wrapper">
    <div class:"inner_wrapper">
      <div class:"cashback">
        <div class:"old-cashback" data-action:"edit-text"></div>
        <div class:"new-cashback" data-action:"edit-text">
          10%
        </div>
      </div>
      <div class:"cashback-text" data-action:"edit-text">
        Cashback
      </div>
      <div class:"dow-timer"> … (contador de "Deal of the day", vazio) … </div>
      …
    </div>
  </div>
</div>
```

- A taxa está em `.offer-frame .cashback .new-cashback`.
- Quando há promoção, `.old-cashback` provavelmente traz a taxa antiga. Na
  Boots estava vazio.

### HTML das "Special Terms"

As abas ficam em `.tabs_content`: "How it Works", "Special Terms**" e
"Description". A aba aberta tem a classe `active`, e o texto fica em
`.tabs_content > .block_container.active`.

```html
<div class:"col-md-12 tabs_content">
  <div class:"col-md-4 tab">How it Works</div>
  <div class:"col-md-4 tab active">Special Terms**</div>
  <div class:"col-md-4 tab">Description</div>
  …
  <div class:"col-md-12 block_container active">
    <div data-action:"edit-text">
      <ul>
        <li>Cashback is not due for the following products: Baby Milk, Fenty, Boots Travel Insurance, Dyson, fitbit, Chanel, Dior, Apple and Jo Malone. Cashback is not due when the purchase is made via the app. Select items not due for cashback.</li>
        <li>The Cashback payment date is approximate and subject to change.</li>
        <li>Cashback on purchases where a voucher or discount code is used, will only be valid if such voucher or code was available on our website at the time of purchase.</li>
        <li>Cashback will be applied to the net value of the basket, which is the total basket value excluding any taxes (including import taxes), delivery, credit card fees, purchase and/or redemption of gift cards, returns, exchanges and gift wrapping. Cashback is not due on purchases of gift cards or paying for a purchase using gift cards or e-gift cards/codes.</li>
        <li>For travel-related bookings, cashback will only be issued once the booking has been paid in full and the stay has been completed.</li>
        <li>If your Cashback is not automatically tracked within 5 days, please allow this period to expire before submitting a ''Missing Cashback'' claim within 90 days of the transaction, (…) <a href:"https://www.nxrewards.com/frequently-asked-questions">…</a></li>
        <li>The amount of cashback we award you is subject to adjustments for returns, cancellations, and other events.</li>
      </ul>
    </div>
  </div>
</div>
```

**Sugestão:** o robô não precisa abrir a página de cada loja todo dia,
porque a taxa já está na lista. As Special Terms podem ser lidas só das
lojas usadas nas estratégias (Deliveroo, Sainsbury's, Boots), por exemplo
uma vez por semana.

## 3. Busca

`https://cashback.nxrewards.com/moreinfo/pgsearchm?type=merchant&keywords=boots`

- **Funciona com login.** Título da aba: "Search Results".
- Mostra "10 retailers | see all". Para "boots", os 10 resultados foram:
  - Boots (`6648`)
  - Boots Kitchen Appliances (`31616`)
  - Boots Photo (`30988`)
  - Blue Tomato, Just Sheepskin, Merry People, Timberland, UGG, Wide Fit
    Shoes e XY London, todas lojas que vendem botas.
  
  Todas estavam em 10%.
- Abaixo dos resultados aparece um bloco de "top merchants" (Superdrug, DJI,
  P&O Cruises…). **Não é resultado da busca.**
- A página chama `…/v0/partnerSearch`.
- **Atenção:** nos resultados, o `href` vem com `undefined` no lugar do
  slug: `/info/85081/6648/undefined/afsrc=1`. Use o ID, não o slug.
- O HTML de cada resultado é igual ao da lista (`.col-md-3 block`, com
  `.merchant_name` e `.percent_text`).

```html
<div class:"col-md-3 block has_voucher">
  …
  <a class:"fav_cta" href:"#" data-merchantid:"6648"> … </a>
  …
  <a href:"/info/85081/6648/undefined/afsrc{eq}1">
    <div class:"block_container">
      <div class:"merchant_name hidden" data-search-name:"">Boots</div>
      <div class:"logo"><img src:"https://d262o8ek72aza.cloudfront.net/mimg/boots_234x60_7.gif"></img></div>
      <div class:"percent">
        <div class:"wrapper">
          <div class:"percent_text" data-search-rebate:"">10% Cashback</div>
        </div>
      </div>
      …
    </div>
  </a>
</div>
```

**Sugestão:** para o robô diário, a lista completa (seção 1) basta. A busca
serve para conferir uma loja específica.

## 4. Como saber que não está logado

Testado no mesmo Chrome antes de a Bárbara fazer o login. Equivale à janela
anônima: sem sessão do NX.

| Endereço aberto | O que aconteceu |
|---|---|
| `https://cashback.nxrewards.com/` | Vai para `https://www.nxrewards.com/` |
| `…/moreinfo/pgsearchm?type=merchant&keywords=boots` | Vai para `https://www.nxrewards.com/` |
| `…/Home/AllRetailers/<número>` (antigo) | Vai para `https://www.nxrewards.com/Errors/Error404` |

O que reconhecer:
- **O domínio muda** de `cashback.nxrewards.com` para `www.nxrewards.com`.
  É o sinal mais simples.
- Título da aba: "NX Rewards - Get Cashback when you shop with us".
- Botão no topo: `<a class="go-to sign-in-button menu-toggle" href="#">SIGN IN</a>`.
- Formulário de login (aparece duas vezes, desktop e celular), dentro de
  `div.login-wrapper`:
  - `action="../User/Login/"`
  - campos: `UserName` (type email, placeholder "Email"), `Password`,
    `RememberMe` (checkbox), `ReturnUrl` (hidden),
    `__RequestVerificationToken` (hidden)
  - botão `button.submit` "sign in"
- Texto grande da home: "Earn a minimum 10% Cashback every time you shop
  online with NX Rewards".

Logado, aparecem:
- o link "SIGN OUT" (`https://www.nxrewards.com/User/Logout`);
- o menu "Dashboard / Favourites / Benefits / Account / Help";
- o campo "Search Retailer".

**Regra para o robô:** depois de abrir `/allstores/85081/`, confirmar que
`location.host === 'cashback.nxrewards.com'` e que existe pelo menos um
`.blocks .block`.
- Se cair em `www.nxrewards.com`, ou se aparecer `form[action*="User/Login"]`,
  **parar** e avisar que precisa de login. Não tentar logar sozinho.

**Como o login funciona:** depois de entrar em `www.nxrewards.com`, o site
manda para `https://cashback.nxrewards.com/shop/Token=<XXX>&IV=<XXX>` e só
então abre a área de cashback. O token muda a cada login.
- O robô **não** deve guardar nem reutilizar esse endereço.
- Ele usa a sessão que já está no Chrome da Bárbara.

## 5. Captcha

- **Nenhum captcha ou "verify you are human" apareceu** em 23/10.
  - Testado na home, no login (feito pela Bárbara), na lista, na página da
    Boots e na busca.
- Não há script de reCAPTCHA, hCaptcha ou Turnstile nessas páginas.
- Mesmo assim, o robô deve **parar** se:
  - a página tiver texto como "captcha", "verify you are human",
    "unusual traffic" ou "access denied";
  - o status for 403 ou 429;
  - `.blocks .block` vier com zero itens.

## O que o Claude Code ainda precisa decidir com o dono

1. **O que fazer com as 30 lojas acima de 10%** (12%, 15% e 20%).
   - Em 18/10 o Cowork voltou para 10% as 50 taxas antigas acima de 10%,
     porque eram de maio.
   - Agora a lista logada mostra 30 lojas acima de 10%, com data de hoje.
   - Na primeira semana o robô só lê. Depois, gravar a taxa real lida.
2. **Itens "eGift".** Em 23/10 não foi feita uma contagem separada de eGift
   na lista. A regra do dono continua: nenhuma estratégia com One4all.
