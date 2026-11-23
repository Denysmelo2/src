# Handover Cowork → Code: Rakuten volta ao SnapGain (23/11/2026)

## Decisão do dono (23/11, 23:34)

> "Quero que entrem essas duas plataformas. Começamos com Rakuten, e quando
> já estiver rodando tudo perfeitamente a gente inclui o TOTUM."

- **Agora: Rakuten** (cashback), lida com a conta do dono logada no Chrome
  do Mac, igual à Quidco.
- **Depois: TOTUM** (descontos de estudante). Fica para um handover próprio,
  quando a Rakuten estiver estável. Ver o fim deste documento.

## O que o Cowork conferiu em 23/11 (Chrome, sem login)

- `https://www.rakuten.co.uk/f/all-brands` mostra mais de 500 marcas, cada
  uma com a taxa na própria lista: "Adidas 11% Cashback", "AliExpress 6.5%
  Cashback", "Accessorize Up to 1.5% Cashback", "Amazon Music Up to £8
  Cashback".
- Na página carregada, só 7 links `a[href*="/shop/"]` sem rolar. O
  `scrapers/rakuten.js` atual (parado desde maio) depende desses links.
  Conferir o HTML de hoje e a rolagem até carregar a lista toda.
- Página da loja: `/shop/currys-pc-world` mostra "Currys 0.75% Cashback" e
  um bloco "Terms & Exclusions", por exemplo:
  - "Cashback is not available on gift cards or adjustments."
  - "Cashback is not available when using vouchers or discount codes that
    are not from Rakuten UK."
  - "Users with promotional rates: Maximum Cashback awarded per order will
    be £40."
- Termos gerais (`/help/article/terms-conditions`): "Purchases with gift
  cards may not qualify for Cashback if excluded in the terms of offer by an
  Affiliate Brand."
- No banco: 476 ofertas `rakuten`, todas inativas desde maio/junho.

## Tarefa para o Code (snapgain-scraper; um PR, mais um pequeno no src)

1. **Ler pela conta do dono.** A Rakuten entra na rodada pelo Mac
   (`scrape-member.yml`), depois do Avios, usando o Chrome do Mac logado,
   como a Quidco.
   - Se a página mostrar que não está logado, ou mostrar captcha ou bloqueio,
     parar sem tocar no banco e escrever no resumo: "Rakuten: entrar na conta
     no Chrome do Mac".
   - Nada de stealth nem de contornar o login.
2. **Lista completa.** Rolar `/f/all-brands` até não aparecer marca nova.
   Contar as marcas no resumo. Se vierem menos de 300, não desativar nada
   (mesma trava do `sweepStaleOffers`).
3. **"Up to": ler a página da loja**, do mesmo jeito que a Quidco
   (`lib/quidcoTiers.js`; vale extrair uma parte comum):
   - abrir só as lojas com "Up to", as que mudaram desde a última leitura
     (guardar `listing_rate`, como na 0049) e as que não têm faixas;
   - com faixas: `rate` = topo, `conditions = 'Up to'`, `rate_breakdown` com
     as faixas;
   - sem página lida: segurar e mostrar a menor taxa entre listagem e banco;
   - limite de tempo próprio, de 15 minutos, porque a janela do Mac vai até
     06:30.
4. **Valor fixo em £** ("Up to £8 Cashback"): o banco só guarda %. Não
   gravar; contar no resumo quantas foram puladas.
5. **Termos da loja:** guardar o texto de "Terms & Exclusions" na oferta.
   Pode ser `conditions` ou uma coluna nova; se for coluna nova, o Code
   escreve a migração e o Cowork aplica. O site mostra esse texto em "See
   terms" no card da Rakuten.
6. **Lojas:** usar a regra de colisão e os apelidos de sempre. "Currys PC
   World" (Rakuten) = Currys. Listar no resumo as marcas sem par. Não criar
   loja nova sem o dono, por enquanto.
7. **Checagem diária:** 5 lojas grandes (Currys, Argos, ASOS, Boots,
   AliExpress), banco contra página, igual às outras.
8. **src:**
   - `source-alert`: incluir `rakuten` em `WATCHED`, com "04:00 run through
     the Mac". O Cowork publica a função depois.
   - **Gift card × Rakuten: nunca somar.** Fica igual à NX, à Quidco e à
     Picodi. As páginas de loja que o Cowork viu excluem gift card. Se o dono
     quiser liberar por loja no futuro, vira outra tarefa.
   - O card da Rakuten mostra as exclusões ("No cashback on gift cards or
     non-Rakuten codes").
9. **Teste:**
   - uma lista com "Adidas 11% Cashback" grava 11;
   - "Up to 1.5%" sem página lida fica segurada;
   - "Up to £8" é pulada;
   - "Currys PC World" cai na Currys.

## Depois do merge

**Dono:** abrir o Chrome do robô no Mac e entrar na conta da Rakuten (o
Cowork manda o passo a passo).

**Cowork:**
- rodar a Rakuten à mão e conferir o resumo: marcas lidas, seguradas,
  puladas em £ e sem par;
- comparar 10 lojas com a página da Rakuten;
- publicar a `source-alert`;
- conferir a Currys no site.

## Fase 2 (depois que a Rakuten estiver estável): TOTUM

Notas do dono, 23/11:
- é para estudantes que se cadastram e têm o ID de estudante da TOTUM;
- online: códigos de desconto para membros;
- na loja: o estudante mostra o ID da TOTUM no app;
- `https://totum.com/discounts` lista mais de 500 marcas, sem login.

Vai para `student_offers`, como Student Beans e UNiDAYS, com a conta do
dono logada se a página de membro mostrar mais. Escrever o handover quando
chegar a hora.
