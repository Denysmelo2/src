# Handover do Cowork para o Claude Code (05/11/2026)

Continuam valendo os handovers anteriores (26/10 Parte A; 03/11; os dois de
04/11).

## O que o Cowork fez depois de #156, #157 e #158 (05/11, de manhã)

- **Migração 0042 aplicada em produção** (`0042_curated_live_steps`).
  - Os dois `do $$` de verificação passaram.
  - O site do #157 já estava no ar desde 04/11, às 22:04. Até a 0042 entrar,
    a Amazon simples mostrava só £1 e a da Currys ficava escondida.
- **`scripts/check-curated.mjs`** contra produção, em £100: saiu com
  `exit 0`.
  - `amazon-currys-everywish` £7,50;
  - `amazon-optimiser` £2,00;
  - `sainsburys-max-stack` £10,00;
  - `nx-one4all-airtime-triple` £10,00;
  - `deliveroo-triple-stack` £11,00 (NX 10% + 1% do cartão).
- **Títulos sem números:** `amazon-currys-everywish` passou a se chamar
  "Amazon via a Currys gift card and EVERYWISH". O passo 1 também não cita
  mais taxa, como o #157 sugeriu.
- **Cartões `live_compare` de volta** (Sainsbury's, Boots, Deliveroo):
  `playbook_only = false`, por decisão do dono em 05/11. Aparecem só como
  caixa "Compare" (#158).
- **#156 (senha vazada):**
  - em produção, o bundle tem `api.pwnedpasswords.com/range/` e a
    mensagem "appeared in a data breach";
  - a CSP libera `https://api.pwnedpasswords.com`;
  - o teste de ponta a ponta (`Password123!` recusada) precisa resolver o
    hCaptcha, então fica com o dono no teste de visitante;
  - o mínimo de 8 caracteres no Supabase já estava ligado (o dono
    confirmou em 04/11).
- **Uber e Treatwell continuam fora do ranking por enquanto.** O dono quer
  as duas de volta, mas só depois da tarefa 6 abaixo. Hoje o total delas
  ainda soma o +1% do cartão. Se voltassem antes, a Uber (£5,50) ficaria
  acima da rota automática Cheddar 4,5% só por causa do cartão, o que
  contraria a decisão do dono.

## Tarefa 6: decisão do dono, opção (a)

**O 1% do cartão não entra no ranking.** Ele aparece como uma linha extra,
igual em todas as rotas.

- Em `src/lib/curatedReturn.js`, o passo "Credit card" (`platform_slug:
  "credit_card"`) **não soma** no `gbpReturn` usado para ordenar.
- Em toda rota em que dá para pagar com cartão, curada ou automática,
  mostrar uma linha separada, por exemplo:
  - "+ ~£1 if you pay with a 1% card (or 100 points)";
  - o valor é calculado sobre o total da compra.
- **Onde não aparece:** quando o pagamento é com gift card na loja, ou
  quando a regra da plataforma não aceita cartão de pontos (por exemplo,
  NX paga com gift card).
- Atualizar `scripts/check-curated.mjs` para mostrar o total sem o cartão.
- Teste: Uber £100 com a curada de volta ao ranking. A curada passa a
  valer £4,50 (Cheddar), empata com a rota automática Cheddar 4,5% e a
  automática vence o empate (#158). Não pode aparecer duas vezes com o
  mesmo valor: ou a curada some quando é só uma cópia da automática, ou
  fica como guia de passos.

### Depois do merge

- O Cowork tira o `playbook_only` de `uber-easy-combo` e
  `treatwell-easy-stack`.
- Roda `check-curated.mjs` de novo.
- Confere Uber, Treatwell, Amazon e Sainsbury's em £100.

---
_Cowork, 05/11/2026._
