# Acordos do dono: estratégias do NX Rewards (18/10/2026)

Combinado com o dono em 18/10/2026, para não haver erro na tarefa 3 (robô
mensal do NX) nem depois dela. O Claude Code segue estas regras e **não
religa nada fora delas**.

## Regra principal

- O NX Rewards **não vende mais gift cards**: acabou o One4all, em setembro
  de 2026.
- Toda estratégia com NX tem que usar o NX só como **cashback de no mínimo
  10% ao comprar numa loja parceira**.
- Nenhuma estratégia pode ter um passo "comprar gift card / One4all no NX".

## As 4 estratégias pausadas pela 0029

Nenhuma delas usa mais o One4all; esse passo saiu na migration 0004.
Só o slug `nx-one4all-airtime-triple` ainda tem esse nome antigo.

| slug | Decisão |
|---|---|
| `sainsburys-max-stack` | Volta **como está** (NX 10% + cartão de pontos + Nectar; pagar com cartão, nunca com gift card). |
| `deliveroo-triple-stack` (21%) | Só volta **depois que o Cowork confirmar, com o dono logado no NX, que o NX paga cashback no Deliveroo quando o pedido é pago com gift card**. Ao voltar, usar as taxas reais do dia: JamDoughnut e NX. |
| `nx-one4all-airtime-triple` | **Reescrever antes de voltar.** Novo título: "11% online na Boots: NX + cartão de pontos" (NX 10% + cartão 1%). Tirar a Argos, que não está na rede NX. Tirar a soma com o Airtime: o Airtime vale na loja física e o NX online, então não se somam na mesma compra. Se quiser, o Airtime fica como dica à parte, "na loja física". O slug pode ficar igual. |
| `deliveroo-easy-combo` (16%) | **Fica desligada.** É a mesma rota da 21% com números diferentes. |

**Condição para qualquer uma voltar:** a oferta NX da loja tem que ter sido
conferida nos **últimos 30 dias** (`last_verified_at`), pelo robô mensal ou
pelo Cowork com o dono logado. Sem isso, a estratégia continua desligada.

## O que fazer agora (antes do robô do NX existir)

1. **"6% + 700 Avios on Deliveroo" (`deliveroo-advanced-avios`, ativa):**
   tirar a frase "Prefer cash? The 21% triple stack uses NX instead." da
   descrição. Ela volta só quando a 21% for religada.
2. **Biblioteca do e-book (`src/pages/StrategyLibraryPage.jsx`):** esconder
   as 3 rotas com NX:
   - `nx-airtime`;
   - a rota A, com NX, do Sainsbury's (a rota B, gift card + Avios eStore,
     continua);
   - o passo NX do Deliveroo.
   Elas voltam junto com as estratégias, quando o NX for conferido, e já
   seguindo as regras acima: Boots sem Argos e sem somar o Airtime.
3. Não religar nenhuma das 4 estratégias pausadas até a tarefa 3 terminar e
   a condição dos 30 dias valer.

## Tarefa 3 (lembrete do plano aprovado em 17/10)

- **Robô mensal:**
  - lê a lista pública de lojas do NX;
  - grava "Minimum 10%" com a data da leitura;
  - **não rebaixa** taxas reais já conferidas.
- **Taxas reais:** o Cowork lê na área de membro quando o dono estiver
  logado no Chrome e grava com `conditions` = "Checked in member area".
