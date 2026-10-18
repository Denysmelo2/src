# Para o Claude Cowork: estrutura da área de membro do NX (18/10/2026)

Escrito pelo Claude Code. É o que falta para escrever o robô diário do NX
(tarefa 5 de `docs/HANDOVER_CLAUDE_CODE_NX_2026-10-18.md`).

## O que o dono decidiu (18/10/2026)

- O robô entra com a **conta extra da Bárbara**, não com a conta principal
  do dono.
- O robô usa o **Chrome do Mac da Bárbara**, que já fica logado, do mesmo
  jeito que o robô de membro faz hoje (`CDP_ENDPOINT`). Nenhuma senha do NX
  vai para o GitHub nem para o chat.
- O robô roda **uma vez por dia**. Ele **para** se aparecer captcha,
  bloqueio ou tela de login.
- Na primeira semana o robô **só lê e conta**, sem gravar nada no banco.

## O que preciso que o Cowork faça

Com o Chrome da Bárbara logado no NX com a conta extra:

1. **Lista de parceiras.**
   - Abrir a página que mostra todas as lojas parceiras e anotar o endereço
     exato.
   - Anotar se a lista vem inteira numa página ou em várias. Se forem
     várias, anotar como se passa de página: o endereço muda (`?page=2`) ou
     há um botão "mais"?
   - De **uma** loja da lista, copiar o pedaço de HTML que mostra o nome e a
     taxa: botão direito na loja, "Inspecionar", copiar o elemento ("Copy
     element"). Pode ser de uma loja grande, por exemplo a Boots.
   - Anotar onde aparece a taxa: "Minimum 10%", "12%", etc. Ela está na
     lista ou só na página de cada loja?
2. **Página de uma loja.** Repetir para a página da Boots no NX: o endereço
   e o pedaço de HTML com a taxa e as "Special Terms".
3. **Busca.** Confirmar se `/moreinfo/pgsearchm?type=merchant&keywords=boots`
   ainda funciona. Anotar o que volta (o HTML de um resultado).
4. **Como saber que não está logado.** Abrir o mesmo endereço da lista numa
   janela anônima e anotar o que aparece: se volta para a home, se mostra um
   formulário de login, e qual texto ou elemento dá para reconhecer.
5. **Captcha.** Se em algum momento aparecer captcha ou "verify you are
   human", anotar como ele é. **Não resolver o captcha** para o robô.

## Regras

- **Não copiar nenhum dado da conta**: nome, e-mail, saldo, histórico ou
  número de membro. Se o HTML tiver algum desses dados, trocar por `XXX`
  antes de gravar.
- Gravar tudo em `docs/NX_ESTRUTURA_AREA_MEMBRO_2026-10-18.md` num branch
  `docs/...`, como nas outras tarefas, e avisar o dono.
- Depois disso o Claude Code escreve o robô, com a semana em que ele só lê.
