# Handover do Cowork para o Claude Code: Quidco (05/11/2026)

Continuam valendo os handovers anteriores. Esta é **uma tarefa urgente no
`snapgain-scraper`**: o robô do Quidco desligou ofertas boas em 05/11. A
regra do handover de 03/11 manda avisar o Code quando passar de 150
desativações numa rodada.

## O que aconteceu (rodada das 09:00 de 05/11, run 41998777155)

- O Quidco visitou **só 18 das 23 categorias** e mesmo assim terminou com
  `ok=true`:
  - `[18/23] Pets … unique = 3311` às 09:29:00;
  - logo depois, às 09:29:39, `aggregated → 3311 unique merchants`;
  - as categorias 19 a 23 (entre elas Toys & Gifts e Utilities & Telecoms)
    passaram em 39 segundos, sem nenhuma linha no log.
- Em 04/11, a rodada visitou as 23 e chegou a 3.570.
- Com isso, `sweepStaleOffers cashback_offers/quidco` **desligou 340
  ofertas** de 3.644. Eram ofertas válidas: Which? Travel 72%, eSIMs,
  MyFlowers, TrainPal e outras.
- A trava de 50% do sweep não pegou, porque 340 é só 9% do total.

### O que o Cowork já fez

- **Religou as 340** como estavam em 04/11 (`last_verified_at` de 04/11,
  sem mexer na data).
- Cópia em `ops.quidco_wrong_sweep_20261105`.
- Quidco ativo agora: 3.644.

## Causa provável (`scrapers/quidco.js`)

No laço das categorias, quando a página 1 falha (`page.goto` ou
`extractMerchantsFromPage`):

```js
} catch (err) {
  categoryStats.push({ path, count: 0, note: `page1: ${err.message}` });
  continue;
}
```

- O erro vai só para `categoryStats`, que nunca é impresso. O log mostra
  progresso só a cada 3 categorias, então as falhas ficam invisíveis.
- Depois disso o sweep roda como se a lista estivesse completa.

## O que mudar

1. **Toda categoria que falhar aparece no log**, com o motivo
   (`[quidco] category X failed: …`). Também imprimir `categoryStats` no
   fim, ou no resumo do job.
2. **Tentar de novo a página 1** de uma categoria que falhar: uma vez, com
   uma pausa de alguns segundos.
3. **Sem sweep se faltar categoria:**
   - se, depois da nova tentativa, alguma categoria ainda tiver
     `count: 0` com erro, **não rodar o `sweepStaleOffers` do Quidco**;
   - gravar o que foi lido (upsert), deixar a rodada amarela ou vermelha e
     escrever no resumo quais categorias faltaram;
   - as ofertas que não foram lidas somem sozinhas pela regra dos 30 dias
     se continuarem fora.
4. **Opcional, se fizer sentido:** uma trava por contagem absoluta no
   Quidco. Por exemplo, mais de 150 desligadas numa rodada não grava o
   sweep e avisa. É o mesmo número que o Cowork usa para conferir.
5. Ver o artefato `diagnose` desse run, se houver. Pode mostrar que as
   categorias 19 a 23 deram Cloudflare ou timeout no Chrome do Mac.

### Depois do merge

- Na rodada seguinte das 09:00, o Cowork confere:
  - 23 de 23 categorias visitadas;
  - menos de 150 ofertas desligadas.

---
_Cowork, 05/11/2026._
