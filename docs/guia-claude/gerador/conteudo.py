# -*- coding: utf-8 -*-
"""Conteudo do Guia Pratico do Claude, independente do formato de saida."""


def build(e):
    h1, h2, h3 = e.h1, e.h2, e.h3
    para, bullet, numbered = e.para, e.bullet, e.numbered
    prompt, tabela, callout = e.prompt, e.tabela, e.callout

    e.capa(
        "GUIA PRÁTICO", "DO CLAUDE",
        "Manual de suporte para uso diário — prompts prontos para cada função "
        "e estratégias de trabalho",
        [
            ("14 áreas de trabalho cobertas", True),
            ("Mais de 70 prompts prontos para copiar e colar", False),
            ("9 estratégias de uso avançado", False),
            ("6 playbooks passo a passo", False),
            ("Cola de bolso e modelo de projeto", False),
        ],
        "Documento de apoio · Versão 1.0 · Agosto de 2026",
    )

    h1("Sobre este guia")

    para(
        "Este é um manual de consulta rápida. Você não precisa ler do começo ao fim: vá direto à "
        "**Parte 3**, encontre a função que você exerce, copie o prompt e adapte os campos entre colchetes. "
        "As partes 1 e 2 explicam a lógica por trás dos prompts — leia quando quiser melhorar seus próprios resultados. "
        "As partes 4 a 7 mostram como combinar tudo em rotinas de trabalho."
    )

    h3("Como ler os blocos de prompt")
    para(
        "Todo bloco laranja é um prompt pronto. Os trechos entre [colchetes] são os campos que você troca "
        "pelas suas informações. Quanto mais específico for o preenchimento, melhor o resultado — "
        "\"[público-alvo]\" preenchido como \"donas de pet shop no interior de São Paulo, faturamento até R$ 40 mil/mês\" "
        "vale dez vezes mais do que \"empreendedoras\"."
    )

    h3("Uma observação importante sobre a origem do conteúdo")
    callout(
        "O que foi possível coletar e o que não foi",
        "Este guia foi solicitado a partir do conteúdo do perfil @getintoai no Instagram. O acesso ao instagram.com "
        "está bloqueado pela política de rede do ambiente onde este documento foi produzido, e portanto NÃO foi possível "
        "ler as publicações do perfil. Para não inventar conteúdo atribuído a terceiros, o guia foi construído a partir "
        "da documentação oficial da Anthropic e de prática consolidada de uso do Claude. Se você exportar ou copiar as "
        "legendas dos posts do perfil, o guia pode ser reescrito ponto a ponto sobre aquele material.",
    )

    # ====================================================================
    h1("Parte 1 — Fundamentos")

    h2("1.1 O que é o Claude")
    para(
        "O Claude é um assistente de inteligência artificial da Anthropic. Na prática, funciona como um "
        "profissional sênior disponível 24 horas por dia que lê, escreve, analisa, calcula, programa e organiza — "
        "desde que você dê contexto suficiente. A diferença entre um resultado genérico e um resultado que você "
        "publica sem editar está quase inteiramente na qualidade do que você entrega a ele."
    )

    h2("1.2 Onde usar")
    tabela(
        ["Superfície", "Para que serve", "Quando escolher"],
        [
            ["**claude.ai** (navegador)", "Conversa, upload de arquivos, Projetos, Artifacts, conectores", "Uso do dia a dia; é o ponto de partida para 90% das tarefas"],
            ["**App para computador**", "Mesmo que o site, com atalhos de teclado e integração com o sistema", "Quem usa o Claude várias vezes por dia"],
            ["**App para celular**", "Conversa por voz e texto, fotos", "Capturar ideias, tirar dúvidas fora do escritório"],
            ["**Claude Code**", "Agente que trabalha dentro do seu código, no terminal, no navegador ou na IDE", "Programação, automação de repositórios, scripts"],
            ["**API / Managed Agents**", "Integrar o Claude dentro do seu próprio produto ou automação", "Time técnico; volume alto; produto próprio"],
            ["**Conectores e MCP**", "Ligar o Claude a Gmail, Drive, Notion, Slack, GitHub, bancos de dados", "Quando você quer que o Claude leia e escreva nos seus sistemas"],
        ],
        widths=[4.2, 6.4, 5.6],
    )

    h2("1.3 Qual modelo escolher")
    para(
        "Os modelos atuais da família Claude diferem em profundidade de raciocínio, velocidade e custo. "
        "Regra simples: use o mais capaz que couber no seu orçamento e reduza só quando a tarefa for trivial."
    )
    tabela(
        ["Modelo", "Perfil", "Use para"],
        [
            ["**Claude Fable 5**", "O mais capaz da linha", "Raciocínio muito difícil, tarefas longas e autônomas"],
            ["**Claude Opus 5**", "Alta capacidade, uso geral", "Padrão recomendado: análise, escrita, código, estratégia"],
            ["**Claude Sonnet 5**", "Equilíbrio entre qualidade e custo", "Volume alto de tarefas de dificuldade média"],
            ["**Claude Haiku 4.5**", "Rápido e econômico", "Classificação, extração, respostas curtas e repetitivas"],
        ],
        widths=[4.0, 5.0, 7.2],
    )
    callout(
        "Regra prática",
        "Não desça de modelo para economizar antes de ter um problema real de custo. Um resultado ruim que você "
        "precisa refazer três vezes é mais caro do que o modelo melhor na primeira tentativa.",
    )

    h2("1.4 Os recursos que mudam o jogo")
    para("Estes são os recursos que separam quem \"usa uma IA\" de quem tem um sistema de trabalho:")

    h3("Projetos (Projects)")
    para(
        "Um Projeto é um espaço com memória própria: você sobe documentos (a base de conhecimento) e escreve "
        "instruções permanentes. Toda conversa dentro daquele Projeto já nasce sabendo quem é você, qual é a marca, "
        "qual é o tom de voz e o que não pode ser dito. **É o recurso com maior retorno sobre o tempo investido** — "
        "trinta minutos configurando um Projeto economizam meses de repetição de contexto."
    )

    h3("Artifacts")
    para(
        "Quando o Claude produz algo que se sustenta sozinho — um documento, uma tabela, uma página, um pequeno "
        "aplicativo, um diagrama — isso aparece em um painel lateral que você pode editar, versionar e compartilhar "
        "por link. Peça explicitamente: \"gere isso como um artifact\"."
    )

    h3("Conectores e MCP")
    para(
        "Conectores ligam o Claude a ferramentas externas (e-mail, agenda, armazenamento, repositórios, CRM, banco de "
        "dados). O MCP é o padrão aberto por trás disso. Com conectores, o Claude deixa de ser um lugar onde você cola "
        "texto e passa a ser um lugar onde o trabalho acontece."
    )

    h3("Skills")
    para(
        "Skills são pacotes de instruções e arquivos que ensinam ao Claude um procedimento específico da sua "
        "operação — o seu checklist de revisão, o seu formato de relatório, o seu padrão de nomenclatura. "
        "Uma vez criada, a skill é acionada automaticamente quando a tarefa se encaixa."
    )

    h3("Raciocínio estendido")
    para(
        "Em problemas difíceis, o Claude pensa antes de responder. Você não precisa configurar nada na interface, "
        "mas ajuda dizer: \"pense com calma antes de responder\" ou \"analise as alternativas antes de escolher\". "
        "Use em decisões, diagnósticos, cálculos e arquitetura — não em tarefas triviais."
    )

    h3("Arquivos e pesquisa na web")
    para(
        "Você pode enviar PDFs, planilhas, documentos, apresentações, imagens e áudio. O Claude também pesquisa na "
        "internet quando a pergunta exige informação atual. Peça sempre as fontes quando o assunto for factual."
    )

    # ====================================================================
    h1("Parte 2 — Como escrever prompts que funcionam")

    h2("2.1 Os seis blocos de um prompt forte")
    para(
        "Prompt bom não é prompt longo, é prompt completo. Estes são os seis blocos. Nem toda tarefa precisa dos "
        "seis, mas toda tarefa mal resolvida costuma estar faltando um deles."
    )
    tabela(
        ["Bloco", "Pergunta que ele responde", "Exemplo"],
        [
            ["**1. Papel**", "Quem o Claude deve ser?", "\"Você é um diretor de arte com 15 anos em moda.\""],
            ["**2. Objetivo**", "O que precisa acontecer no mundo real?", "\"Preciso aumentar a taxa de cliques do e-mail.\""],
            ["**3. Contexto**", "O que ele precisa saber que só você sabe?", "Público, produto, histórico, restrições da marca"],
            ["**4. Tarefa**", "O que exatamente ele deve produzir?", "\"Escreva 5 linhas de assunto.\""],
            ["**5. Formato**", "Como o resultado deve chegar?", "\"Tabela com 3 colunas: assunto, ângulo, motivo.\""],
            ["**6. Restrições**", "O que não pode acontecer?", "\"Sem emojis. Máximo 45 caracteres. Nada de urgência falsa.\""],
        ],
        widths=[2.8, 5.4, 8.0],
    )

    h2("2.2 Antes e depois")

    h3("Exemplo 1 — Conteúdo")
    para("**Fraco:** \"Escreva uma legenda para o Instagram sobre meu curso.\"", muted=True)
    prompt(
        "versão forte",
        """Você é redator de social media especializado em infoprodutos de educação.

    CONTEXTO
    - Produto: curso online de finanças pessoais, R$ 397, 8 semanas.
    - Público: mulheres de 28 a 45 anos, CLT, que ganham bem mas terminam o mês no zero.
    - Dor principal: vergonha de não saber para onde o dinheiro foi.
    - Tom da marca: direto, acolhedor, zero julgamento, nada de "mindset de rico".

    TAREFA
    Escreva 5 legendas para carrossel de Instagram, cada uma com um ângulo diferente:
    (1) diagnóstico da dor, (2) mito que precisa cair, (3) micro-vitória rápida,
    (4) história de aluna, (5) convite direto.

    FORMATO
    Para cada legenda: gancho de 1 linha (até 90 caracteres) + corpo de até 120 palavras
    + CTA + 5 hashtags. Entregue em tabela.

    RESTRIÇÕES
    Sem promessa de renda. Sem emoji no gancho. Não use "transforme sua vida".""",
        nota="A diferença não é o tamanho — é que o Claude agora sabe para quem escrever e o que evitar.",
    )

    h3("Exemplo 2 — Análise")
    para("**Fraco:** \"Analise essa planilha.\"", muted=True)
    prompt(
        "versão forte",
        """Anexei a planilha de vendas dos últimos 12 meses.

    Você é analista de dados. Antes de responder, examine a estrutura do arquivo e me diga
    quais colunas existem e se identificou algum problema de qualidade nos dados.

    Depois responda, nesta ordem:
    1. Quais 3 produtos mais cresceram e quais 3 mais caíram, em % e em valor absoluto.
    2. Existe sazonalidade clara? Mostre os meses de pico e de vale.
    3. Qual canal tem o melhor ticket médio e qual tem o pior?
    4. Três hipóteses do que explica a queda do trimestre mais fraco.

    Para cada conclusão, cite os números que a sustentam. Se algum dado for insuficiente
    para concluir, diga "dados insuficientes" em vez de estimar.""",
        nota="A última frase é o que impede o Claude de preencher lacunas com suposições.",
    )

    h2("2.3 Ajustes finos que quase ninguém usa")
    bullet("**Nível do leitor:** \"explique para alguém que nunca ouviu o termo\" ou \"assuma que sou especialista, pule o básico\".")
    bullet("**Extensão exata:** \"em no máximo 120 palavras\" funciona melhor do que \"seja breve\".")
    bullet("**Densidade:** \"corte todo adjetivo que não muda o sentido\".")
    bullet("**Ponto de vista:** \"escreva do ponto de vista de quem vai receber a proposta, não de quem envia\".")
    bullet("**Grau de certeza:** \"marque com (?) tudo que você não conseguir confirmar\".")
    bullet("**Formato de saída:** tabela, JSON, lista numerada, e-mail pronto para enviar, slides, checklist.")

    h2("2.4 Comandos de refino (a segunda mensagem)")
    para(
        "Raramente a primeira resposta é a final. Estes são os comandos que mais melhoram um resultado já entregue:"
    )
    tabela(
        ["Quando o resultado está...", "Diga isso"],
        [
            ["Genérico demais", "\"Está genérico. Reescreva com detalhes que só alguém que conhece [nicho] escreveria.\""],
            ["Longo demais", "\"Corte 40% sem perder nenhuma informação. Mantenha só o que muda a decisão.\""],
            ["Sem personalidade", "\"Reescreva no tom destes exemplos:\" + cole 2 ou 3 textos seus"],
            ["Bom, mas você quer opções", "\"Me dê 3 versões radicalmente diferentes entre si, não variações da mesma ideia.\""],
            ["Você não sabe avaliar", "\"Critique sua própria resposta como se fosse um cliente exigente. Depois reescreva.\""],
            ["Perto do ideal", "\"Mantenha tudo. Mude só [X].\""],
            ["Você quer entender o raciocínio", "\"Explique por que escolheu essa abordagem em vez das alternativas.\""],
        ],
        widths=[5.0, 11.2],
    )

    # ====================================================================
    h1("Parte 3 — Biblioteca de prompts por função")

    para(
        "Encontre sua área, copie o prompt, substitua os campos entre colchetes. "
        "Todos os prompts foram escritos para funcionar sozinhos, mas rendem muito mais dentro de um "
        "**Projeto** com a sua base de conhecimento carregada (veja a Parte 4.4)."
    )

    # ---------------------------------------------------- 1 Marketing
    h2("3.1 Marketing de conteúdo e redes sociais")

    prompt(
        "calendário editorial de 30 dias",
        """Você é estrategista de conteúdo.

    NEGÓCIO: [o que você vende, em uma frase]
    PÚBLICO: [quem compra, com detalhe demográfico e de comportamento]
    OBJETIVO DO MÊS: [ex.: gerar 200 leads para o lançamento de setembro]
    CANAIS: [Instagram, LinkedIn, TikTok, newsletter...]
    FREQUÊNCIA: [ex.: 4 posts por semana + 1 newsletter]

    Monte um calendário editorial de 30 dias equilibrado entre 4 pilares:
    educar, provar (casos e dados), conectar (bastidores e opinião) e vender.

    Entregue em tabela: dia | canal | pilar | formato | tema | gancho | CTA.
    Regra: no máximo 20% dos posts podem ser de venda direta.
    Ao final, liste os 5 temas com maior potencial de alcance e explique por quê.""",
    )

    prompt(
        "roteiro de vídeo curto (reels / tiktok / shorts)",
        """Escreva 3 roteiros de vídeo de até 45 segundos sobre [tema].

    Público: [quem]. Objetivo: [salvar / comentar / clicar no link].

    Para cada roteiro entregue:
    - GANCHO (3 primeiros segundos, falado — precisa gerar uma pergunta na cabeça de quem vê)
    - DESENVOLVIMENTO em blocos de 5 segundos, com o que é falado e o que aparece na tela
    - VIRADA (o momento em que a pessoa muda de ideia)
    - CTA
    - Sugestão de legenda na tela e de texto do post

    Não use "você sabia que". Não comece com saudação. Cada roteiro deve usar uma
    estrutura diferente: um por contradição, um por lista, um por história.""",
    )

    prompt(
        "reaproveitar um conteúdo em 8 formatos",
        """Vou colar abaixo um conteúdo longo que já publiquei.

    Transforme-o em:
    1. 1 carrossel de 8 slides (texto de cada slide)
    2. 3 posts curtos para LinkedIn, com ângulos diferentes
    3. 1 roteiro de vídeo de 60 segundos
    4. 5 tuítes / posts curtos avulsos
    5. 1 e-mail para a base
    6. 3 ideias de stories com enquete
    7. 1 resumo em bullets para newsletter
    8. 5 títulos alternativos para o conteúdo original

    Mantenha os dados e exemplos do original. Não invente estatísticas novas.

    CONTEÚDO:
    [cole aqui]""",
        nota="Este é o prompt de maior retorno da lista: um conteúdo bom vira um mês de publicações.",
    )

    prompt(
        "análise de concorrente",
        """Você é analista de marketing. Pesquise na web e analise a comunicação de [concorrente].

    Quero saber:
    1. Como eles se posicionam (a promessa central, em uma frase)
    2. Quais 3 temas eles mais repetem
    3. Que tom de voz usam e para quem parecem falar
    4. O que eles NÃO falam — as lacunas
    5. Onde eu poderia me diferenciar, dado que meu diferencial real é [seu diferencial]

    Cite as fontes de cada afirmação. Se não encontrar informação suficiente sobre algum
    ponto, diga isso em vez de deduzir.""",
    )

    prompt(
        "briefing de campanha",
        """Monte um briefing de campanha completo para [produto/ação].

    Estrutura obrigatória:
    1. Problema de negócio (não de marketing)
    2. Objetivo mensurável e prazo
    3. Público primário e secundário, com uma frase de "insight" sobre cada um
    4. Promessa única
    5. Provas que sustentam a promessa
    6. Tom e o que evitar
    7. Peças necessárias por canal
    8. Métricas de sucesso e de alerta
    9. Riscos e plano B

    Onde eu não tiver dado a informação, escreva "A DEFINIR — [pergunta específica]".""",
    )

    # ---------------------------------------------------- 2 Copy e vendas
    h2("3.2 Copywriting e vendas")

    prompt(
        "página de vendas do zero",
        """Você é copywriter de resposta direta.

    OFERTA: [o que é, preço, o que inclui]
    PÚBLICO: [quem, com a dor exata nas palavras deles]
    NÍVEL DE CONSCIÊNCIA: [não sabe que tem o problema / sabe do problema / conhece soluções /
    conhece meu produto / pronto para comprar]
    PROVAS: [depoimentos, números, credenciais, garantias]
    OBJEÇÕES REAIS: [as três que mais aparecem]

    Escreva a estrutura completa da página:
    headline, sub-headline, abertura, agitação do problema, apresentação da solução,
    mecanismo único, prova, oferta detalhada, quebra de cada objeção, garantia,
    escassez honesta, CTA repetido 3 vezes, FAQ com 6 perguntas.

    Regras: nada de promessa que eu não possa cumprir; nada de urgência inventada;
    frases curtas; a headline precisa funcionar mesmo sem o resto da página.""",
    )

    prompt(
        "sequência de e-mails",
        """Escreva uma sequência de 5 e-mails para [objetivo: carrinho abandonado /
    boas-vindas / lançamento / reativação].

    Público: [quem]. Produto: [o quê]. Prazo: [quantos dias].

    Para cada e-mail: objetivo do e-mail, 3 opções de linha de assunto,
    pré-header, corpo (até 200 palavras), CTA único.

    O e-mail 1 não pode vender. O e-mail 5 pode ser o único totalmente comercial.
    Cada e-mail precisa entregar valor mesmo para quem nunca vai comprar.""",
    )

    prompt(
        "quebra de objeção",
        """Meu cliente disse: "[objeção literal, com as palavras dele]".

    Contexto da negociação: [o que já foi conversado, valor, prazo, concorrentes].

    1. Traduza a objeção: o que ele provavelmente quer dizer de verdade?
    2. Liste 3 causas possíveis por trás dela.
    3. Para cada causa, escreva uma resposta em 3 frases — sem defensividade,
       sem desconto automático.
    4. Escreva a pergunta que eu deveria fazer antes de responder qualquer coisa.
    5. Diga em que cenário eu deveria simplesmente encerrar a negociação.""",
        nota="O item 5 é o que impede você de gastar semanas com um negócio que nunca ia fechar.",
    )

    prompt(
        "proposta comercial",
        """Escreva uma proposta comercial para [cliente], para o serviço [descrição].

    Informações: [escopo, prazo, equipe, investimento, o que não está incluso].
    O cliente se preocupa principalmente com: [prioridade real dele].

    Estrutura: diagnóstico do problema dele (nas palavras dele) | resultado esperado
    | como chegamos lá, em fases | o que precisamos dele | investimento apresentado
    como retorno, não como custo | prazo de validade | próximo passo único e concreto.

    Máximo 2 páginas. Nada de "somos uma empresa líder de mercado".""",
    )

    prompt(
        "preparação para reunião de vendas",
        """Vou me reunir com [cargo] da [empresa] em [contexto].

    Pesquise a empresa e me prepare:
    1. O que eles fazem, tamanho, momento atual (fontes citadas)
    2. Três hipóteses de dor que meu produto resolve para eles
    3. Cinco perguntas de diagnóstico que eu deveria fazer, na ordem certa
    4. As três objeções mais prováveis vindas desse cargo específico
    5. Um resumo de 30 segundos do meu valor, na linguagem do setor deles
    6. Sinais de que essa reunião não vale um segundo encontro""",
    )

    # ---------------------------------------------------- 3 Atendimento
    h2("3.3 Atendimento ao cliente e suporte")

    prompt(
        "resposta a cliente insatisfeito",
        """Um cliente enviou a mensagem abaixo. Escreva a resposta.

    Contexto: [o que de fato aconteceu, de quem é a culpa, o que podemos oferecer].
    Tom da marca: [ex.: humano, direto, sem formalidade excessiva].

    Regras da resposta:
    - Reconheça o problema na primeira frase, sem "lamentamos o ocorrido"
    - Explique o que aconteceu sem jargão e sem culpar o cliente ou o sistema
    - Diga exatamente o que será feito e até quando
    - Ofereça [compensação, se houver]
    - Termine com uma via de contato direta

    Depois da resposta, liste separadamente: o que essa reclamação revela sobre um
    problema de processo nosso.

    MENSAGEM DO CLIENTE:
    [cole aqui]""",
    )

    prompt(
        "base de conhecimento a partir de tickets",
        """Vou colar 30 tickets de suporte reais.

    1. Agrupe-os em categorias de problema (não de produto).
    2. Mostre quantos tickets há em cada categoria e o % do total.
    3. Para as 5 categorias mais frequentes, escreva um artigo de ajuda:
       título em forma de pergunta do cliente | resposta em até 150 palavras |
       passo a passo numerado | o que fazer se não funcionar.
    4. Aponte quais dessas 5 deveriam ser resolvidas no produto em vez da ajuda.

    TICKETS:
    [cole aqui]""",
    )

    prompt(
        "macros de atendimento padronizadas",
        """Crie 10 respostas-padrão para as situações mais comuns do nosso suporte:
    [liste as situações].

    Cada macro deve ter: nome interno curto | texto da resposta com campos [variáveis]
    | quando NÃO usar essa macro.

    Tom: [descrição]. Máximo 120 palavras cada. Nenhuma deve soar automática —
    todas devem ter pelo menos uma frase que só faz sentido naquela situação.""",
    )

    prompt(
        "classificação e triagem",
        """Para cada mensagem abaixo, devolva uma linha de tabela com:
    categoria (bug / dúvida / cobrança / cancelamento / elogio / outro),
    urgência (1 a 5), sentimento (positivo / neutro / negativo / crítico),
    time responsável, e uma resposta sugerida de uma frase.

    Não escreva nenhum texto fora da tabela.

    MENSAGENS:
    [cole aqui]""",
        nota="Ótima tarefa para um modelo rápido e econômico como o Haiku, em volume.",
    )

    # ---------------------------------------------------- 4 E-mail
    h2("3.4 E-mail e comunicação profissional")

    prompt(
        "escrever e-mail difícil",
        """Preciso escrever um e-mail para [quem, e qual a relação hierárquica].

    Situação: [o que aconteceu]
    O que eu preciso que aconteça depois que a pessoa ler: [resultado desejado]
    O que eu NÃO posso dizer: [restrições]
    Meu risco aqui: [ex.: parecer que estou passando a culpa]

    Escreva o e-mail em até 150 palavras. Assunto claro. Pedido explícito e único.
    Depois, escreva uma versão alternativa mais firme e outra mais diplomática,
    e me diga em uma linha quando usar cada uma.""",
    )

    prompt(
        "resumir uma caixa de entrada bagunçada",
        """Vou colar uma sequência longa de e-mails de uma mesma conversa.

    Devolva:
    1. O que foi decidido (só o que foi de fato decidido)
    2. O que ficou em aberto
    3. Quem deve fazer o quê, até quando — em tabela
    4. Os pontos onde há divergência entre os participantes
    5. O e-mail que eu deveria enviar agora para destravar a conversa

    CONVERSA:
    [cole aqui]""",
    )

    prompt(
        "revisar antes de enviar",
        """Revise o texto abaixo antes de eu enviar para [destinatário].

    Verifique: clareza do pedido | tom (não pode soar [passivo-agressivo / submisso /
    arrogante]) | frases que podem ser mal interpretadas | informação faltando |
    excesso de palavras.

    Devolva: a lista de problemas encontrados, e depois a versão corrigida.
    Não mude meu estilo — corrija o que atrapalha o objetivo.

    TEXTO:
    [cole aqui]""",
    )

    # ---------------------------------------------------- 5 Reuniões
    h2("3.5 Reuniões, atas e gestão de projetos")

    prompt(
        "de transcrição para plano de ação",
        """Anexei a transcrição de uma reunião de [duração] sobre [tema].

    Produza:
    1. RESUMO EXECUTIVO — 5 linhas, para quem não estava lá
    2. DECISÕES — o que foi decidido e por quem
    3. AÇÕES — tabela: tarefa | responsável | prazo | dependência
    4. QUESTÕES EM ABERTO — o que precisa de decisão e quem decide
    5. RISCOS mencionados, mesmo que de passagem
    6. O QUE NÃO FOI DITO — assuntos que deveriam ter sido tratados dado o tema
       e não apareceram

    Não invente responsáveis nem prazos. Se não ficou claro, escreva "não definido".""",
        nota="O item 6 é o que transforma uma ata em consultoria.",
    )

    prompt(
        "plano de projeto",
        """Monte um plano para [projeto], que precisa estar pronto em [prazo]
    com [recursos disponíveis].

    Entregue:
    1. Objetivo em uma frase e definição de "pronto"
    2. Fases, com entregável concreto em cada uma
    3. Cronograma em tabela (semana a semana)
    4. Papéis e responsabilidades
    5. Os 5 maiores riscos, cada um com probabilidade, impacto e mitigação
    6. Os 3 pontos onde este projeto mais costuma falhar na prática
    7. Marcos de checagem: o que precisa ser verdade em cada um para continuar

    Se o prazo for irrealista para o escopo, diga isso primeiro e proponha o que cortar.""",
    )

    prompt(
        "status report para a liderança",
        """Escreva o relatório semanal do projeto [nome] para [audiência].

    Dados desta semana: [o que foi feito, números, problemas].

    Formato: farol geral (verde/amarelo/vermelho) com justificativa em uma linha |
    o que avançou | o que travou e por quê | decisões que preciso da liderança |
    próxima semana | número que melhor resume o progresso.

    Máximo 250 palavras. Comece pelo que a liderança precisa decidir, não pelo histórico.""",
    )

    # ---------------------------------------------------- 6 Dados
    h2("3.6 Análise de dados e planilhas")

    prompt(
        "análise exploratória de planilha",
        """Anexei [arquivo]. Antes de analisar, descreva a estrutura dos dados e liste
    qualquer problema de qualidade que encontrar (valores faltantes, duplicatas,
    formatos inconsistentes, outliers suspeitos).

    Depois:
    1. Cinco fatos que saltam aos olhos, cada um com o número que o sustenta
    2. Três relações entre variáveis que merecem investigação
    3. Três perguntas de negócio que estes dados conseguem responder
    4. Três perguntas importantes que estes dados NÃO conseguem responder,
       e que dado faltaria para respondê-las

    Gere os gráficos que ajudarem a enxergar os pontos 1 e 2.""",
    )

    prompt(
        "fórmula ou consulta explicada",
        """Preciso de [uma fórmula de planilha / uma consulta SQL / um script] que faça:
    [descrição do resultado desejado].

    Estrutura dos dados: [colunas, tipos, exemplo de 3 linhas].
    Ferramenta: [Excel / Google Sheets / PostgreSQL / Python].

    Entregue: a solução pronta para colar | uma explicação linha a linha |
    os casos-limite em que ela quebra | uma versão alternativa mais simples,
    se existir.""",
    )

    prompt(
        "relatório a partir de números",
        """Transforme os dados abaixo em um relatório para [audiência], que se importa com
    [o que essa audiência realmente quer saber].

    Regras: comece pela conclusão | cada afirmação acompanhada do número |
    separe o que é fato do que é interpretação | termine com 3 recomendações
    priorizadas por impacto e esforço | sinalize onde os dados são frágeis demais
    para embasar decisão.

    DADOS:
    [cole aqui]""",
    )

    # ---------------------------------------------------- 7 Pesquisa
    h2("3.7 Pesquisa e síntese de informação")

    prompt(
        "pesquisa estruturada com fontes",
        """Pesquise sobre [tema] e produza um relatório.

    Escopo: [o que entra e o que não entra]. Recorte temporal: [período].
    Profundidade: [visão geral / análise técnica].

    Estrutura:
    1. Resposta curta à pergunta central (5 linhas)
    2. O que é consenso hoje
    3. Onde há divergência, e quem defende cada lado
    4. Dados e números relevantes, com data e fonte
    5. O que mudou nos últimos [período]
    6. O que ainda não se sabe

    Cite a fonte de cada afirmação factual. Diferencie explicitamente fato,
    estimativa e opinião. Se as fontes se contradisserem, mostre a contradição
    em vez de escolher uma.""",
    )

    prompt(
        "ler um documento longo",
        """Anexei [documento de X páginas].

    1. Resumo em 10 linhas
    2. A tese central e os 3 argumentos que a sustentam
    3. Os pontos fracos do argumento
    4. O que é afirmado sem evidência
    5. As 5 passagens mais importantes, citadas literalmente com a localização
    6. O que este documento significa especificamente para [seu contexto]

    Não resuma seção por seção. Organize por importância.""",
    )

    prompt(
        "comparar opções",
        """Preciso decidir entre [opção A], [opção B] e [opção C] para [objetivo].

    Meus critérios, em ordem de importância: [1, 2, 3].
    Minhas restrições: [orçamento, prazo, equipe, técnicas].

    Entregue:
    1. Tabela comparativa pelos meus critérios, com nota e justificativa
    2. O melhor cenário e o pior cenário de cada opção
    3. Uma recomendação clara, com o motivo
    4. O que precisaria ser verdade para a recomendação mudar
    5. A opção que eu não considerei e deveria""",
        nota="Peça sempre o item 5. É onde costuma estar a resposta melhor.",
    )

    # ---------------------------------------------------- 8 Código
    h2("3.8 Programação e produto")

    prompt(
        "implementar com contexto",
        """Objetivo: [o que a funcionalidade precisa fazer, do ponto de vista do usuário]

    Stack: [linguagem, framework, versões]
    Onde vive: [arquivos e módulos envolvidos]
    Padrões do projeto: [convenções que devem ser seguidas]
    Restrições: [performance, compatibilidade, dependências proibidas]

    Antes de escrever código, descreva sua abordagem em 5 linhas e aponte a decisão
    de design mais arriscada. Depois implemente, com tratamento de erro e testes.
    Se algum requisito estiver ambíguo, pergunte em vez de assumir.""",
    )

    prompt(
        "revisão de código",
        """Revise o código abaixo com olhar crítico.

    Procure, nesta ordem: bugs de correção (com o caso concreto que quebra) |
    condições de corrida e casos-limite | falhas de segurança | performance |
    legibilidade.

    Para cada achado: gravidade (alta/média/baixa), o cenário exato que falha,
    e a correção. Não comente estilo se não afetar manutenção.
    Se o código estiver correto, diga isso em vez de inventar problemas.

    CÓDIGO:
    [cole aqui]""",
    )

    prompt(
        "depurar um erro",
        """Erro: [mensagem completa e stack trace]
    O que eu esperava: [comportamento esperado]
    O que aconteceu: [comportamento real]
    O que eu já tentei: [tentativas]
    Contexto: [quando começou, o que mudou antes]

    Liste as 5 causas mais prováveis, da mais para a menos provável, com o raciocínio.
    Para cada uma, diga qual teste rápido confirma ou descarta a hipótese.
    Só depois proponha a correção da causa mais provável.""",
        nota="Pedir o diagnóstico antes da correção evita as \"soluções\" que só escondem o sintoma.",
    )

    prompt(
        "documentação técnica",
        """Escreva a documentação de [módulo/API/serviço] para [público: dev novo no time /
    consumidor externo da API].

    Inclua: o que faz e o que não faz | como começar em 5 minutos | referência
    completa de parâmetros e retornos | 3 exemplos reais de uso | erros comuns
    e o que significam | limites e cotas.

    Baseie-se apenas no código anexado. Marque com TODO qualquer coisa que o código
    não deixa claro.""",
    )

    prompt(
        "especificação de produto",
        """Transforme esta ideia em uma especificação: [ideia em uma frase].

    Estrutura: problema do usuário (com evidência) | quem é afetado e quantos |
    o que fazemos hoje | proposta | fluxo do usuário passo a passo | casos-limite |
    o que fica FORA desta versão | critérios de aceite testáveis | métricas de sucesso |
    riscos.

    Escreva os critérios de aceite no formato "dado que... quando... então...".""",
    )

    # ---------------------------------------------------- 9 Estratégia
    h2("3.9 Estratégia de negócio e finanças")

    prompt(
        "diagnóstico de negócio",
        """Você é consultor de estratégia. Faça um diagnóstico do meu negócio.

    O QUE FAZEMOS: [descrição]
    FATURAMENTO E MARGEM: [números]
    CLIENTES: [quantos, ticket, concentração, churn]
    EQUIPE: [tamanho e estrutura]
    O QUE MAIS ME INCOMODA HOJE: [problema percebido]

    Antes de opinar, faça-me até 8 perguntas cujas respostas mudariam seu diagnóstico.
    Espere minhas respostas antes de continuar.""",
        nota="Fazer o Claude perguntar antes de responder é a diferença entre conselho genérico e consultoria.",
    )

    prompt(
        "modelo financeiro simples",
        """Monte uma projeção de 12 meses para [negócio].

    Premissas: [receita atual, crescimento esperado, custos fixos, custos variáveis,
    sazonalidade, investimentos previstos].

    Entregue: tabela mês a mês com receita, custos, margem e caixa acumulado |
    o mês de ponto de equilíbrio | três cenários (pessimista, base, otimista) |
    as 3 premissas que mais afetam o resultado | o que aconteceria se cada uma
    errasse em 20%.

    Deixe explícita toda premissa que você assumiu e que eu não informei.""",
    )

    prompt(
        "decisão difícil",
        """Preciso decidir: [decisão].

    Contexto: [situação, restrições, o que já foi tentado]
    Prazo para decidir: [quando]
    O que está em jogo: [consequências]

    1. Reformule a decisão — talvez eu esteja fazendo a pergunta errada
    2. Liste as opções, incluindo as que eu não mencionei (inclusive "não fazer nada")
    3. Para cada uma: melhor caso, pior caso, custo de reverter
    4. Qual informação, se eu tivesse, tornaria a decisão óbvia? Dá para consegui-la
       antes do prazo?
    5. Sua recomendação e o principal argumento contra ela""",
    )

    prompt(
        "análise de precificação",
        """Analise a precificação de [produto/serviço].

    Preço atual: [valor]. Custo: [valor]. Concorrentes: [preços].
    Percepção do cliente: [o que eles dizem sobre o preço].
    Volume atual: [números].

    Avalie: a margem real | onde estamos no mercado | o valor percebido versus
    o preço | risco de aumentar | oportunidade de escalonar em planos |
    o que testar primeiro, e como medir o resultado sem quebrar a base atual.""",
    )

    # ---------------------------------------------------- 10 Documentos
    h2("3.10 Documentos, contratos e revisão")

    callout(
        "Aviso",
        "O Claude é excelente para revisar, resumir e apontar riscos em documentos, mas não substitui "
        "advogado, contador ou profissional habilitado. Use-o para chegar preparado à conversa com o especialista, "
        "não para dispensá-la.",
    )

    prompt(
        "revisar contrato",
        """Anexei um contrato. Eu sou a parte [contratante / contratada].

    Analise e me diga:
    1. Resumo do que o contrato estabelece, em 10 linhas e sem jargão
    2. Minhas obrigações e meus direitos, em duas listas
    3. As cláusulas que me expõem a risco, ordenadas por gravidade, com a citação
       literal de cada uma e a explicação do risco em linguagem simples
    4. O que está faltando e deveria estar lá
    5. Cláusulas ambíguas que podem ser interpretadas contra mim
    6. As 5 mudanças que eu deveria pedir, com a redação sugerida

    Não dê parecer jurídico definitivo — aponte o que levar ao advogado.""",
    )

    prompt(
        "criar um documento interno",
        """Escreva [política / procedimento / manual] sobre [tema] para [empresa de que tipo].

    Deve cobrir: [pontos obrigatórios].
    Público: [quem vai ler e qual o nível de conhecimento].

    Regras: linguagem simples, frases curtas | cada regra acompanhada do motivo |
    exemplos do que é e do que não é aceitável | o que fazer em caso de dúvida
    e a quem recorrer | data de revisão.

    Evite texto decorativo. Se alguma regra depender de decisão da empresa,
    marque como [DEFINIR].""",
    )

    prompt(
        "traduzir juridiquês",
        """Reescreva o texto abaixo para que uma pessoa sem formação jurídica entenda,
    sem perder nenhuma obrigação ou direito.

    Depois, monte uma tabela: "o que o texto diz" | "o que isso significa na prática"
    | "o que fazer".

    TEXTO:
    [cole aqui]""",
    )

    # ---------------------------------------------------- 11 Aprendizado
    h2("3.11 Estudo, aprendizado e treinamento de equipe")

    prompt(
        "aprender um assunto do zero",
        """Quero aprender [assunto]. Meu nível hoje: [iniciante total / sei X mas não Y].
    Tempo disponível: [X horas por semana, durante Y semanas].
    Objetivo prático: [o que quero conseguir fazer no final].

    Monte um plano de estudo:
    1. Os 20% do conteúdo que dão 80% do resultado para o meu objetivo
    2. Sequência semana a semana, com o que estudar e o que praticar
    3. Um exercício prático por semana, com critério de "consegui"
    4. Os erros mais comuns de quem está aprendendo isso
    5. Como eu testo, ao final, se realmente aprendi

    Não inclua nada que não sirva ao meu objetivo declarado.""",
    )

    prompt(
        "explicar em três níveis",
        """Explique [conceito] em três níveis:

    1. Para uma criança de 10 anos, com uma analogia do dia a dia
    2. Para um profissional de outra área
    3. Para um especialista, incluindo as ressalvas e onde a simplificação do nível 2 falha

    Ao final, liste as 3 confusões mais comuns sobre esse conceito e por que elas surgem.""",
    )

    prompt(
        "modo tutor socrático",
        """Aja como meu tutor de [assunto]. Não me dê respostas prontas.

    Funcione assim: faça uma pergunta por vez, do básico para o avançado. Quando eu
    errar, não corrija direto — faça uma pergunta que me leve a perceber o erro.
    Quando eu acertar, aprofunde. A cada 5 perguntas, resuma o que eu já domino
    e o que ainda falha.

    Comece com a primeira pergunta e espere minha resposta.""",
        nota="Prompt de sessão contínua: mantenha na mesma conversa por semanas.",
    )

    prompt(
        "treinamento para a equipe",
        """Crie um treinamento de [duração] sobre [tema] para [perfil da equipe].

    Entregue: objetivo de aprendizagem em 1 frase | roteiro com blocos de tempo |
    3 exemplos reais do nosso contexto: [contexto] | um exercício prático em grupo |
    5 perguntas de verificação com gabarito | um material de 1 página para levar
    para casa | os 3 pontos onde o pessoal costuma travar e como destravar.""",
    )

    # ---------------------------------------------------- 12 Apresentações
    h2("3.12 Apresentações e materiais visuais")

    prompt(
        "estrutura de apresentação",
        """Monte a estrutura de uma apresentação de [duração] sobre [tema]
    para [audiência], cujo objetivo é [decisão que quero que tomem].

    Para cada slide: título (uma afirmação, não um rótulo) | os 3 pontos do slide |
    o que eu falo e não está no slide | qual visual usar.

    Regras: uma ideia por slide | comece pela conclusão, não pelo contexto |
    o slide mais importante deve estar entre os 3 primeiros | inclua os 2 slides
    de reserva para as perguntas difíceis que virão.""",
    )

    prompt(
        "criar um artifact visual",
        """Crie como artifact [um painel / uma calculadora / uma linha do tempo /
    um infográfico / uma tabela interativa] que mostre [conteúdo].

    Requisitos: funciona em celular e computador | legível em tema claro e escuro |
    sem depender de nada externo | [cores/identidade, se houver].

    Dados:
    [cole aqui]""",
    )

    # ---------------------------------------------------- 13 RH
    h2("3.13 Recrutamento e pessoas")

    prompt(
        "descrição de vaga que atrai",
        """Escreva a descrição da vaga de [cargo] para [empresa, tamanho, setor].

    Realidade da vaga: [o que a pessoa vai fazer de verdade nos primeiros 90 dias]
    Faixa salarial: [valor]. Modelo: [presencial/híbrido/remoto].
    O que é difícil nesta vaga: [seja honesto]

    Estrutura: o problema que essa pessoa vem resolver | os primeiros 90 dias |
    o que é obrigatório versus o que é desejável (no máximo 5 obrigatórios) |
    como é trabalhar aqui, incluindo o que não é para todo mundo | processo seletivo
    com prazos | faixa salarial explícita.

    Sem "ambiente dinâmico", sem "família", sem lista de 20 requisitos.""",
    )

    prompt(
        "roteiro de entrevista",
        """Monte um roteiro de entrevista de [duração] para a vaga de [cargo].

    Competências críticas: [liste 4].

    Para cada competência: 2 perguntas comportamentais (situação real vivida,
    não hipótese) | o que caracteriza uma resposta forte | o que é sinal de alerta.
    Inclua também: como abrir a entrevista, como falar de salário, e as perguntas
    que o candidato provavelmente fará e como respondê-las com honestidade.""",
    )

    prompt(
        "feedback difícil",
        """Preciso dar um feedback a [cargo/relação] sobre [comportamento ou resultado].

    Fatos observados: [situações concretas, com data se possível]
    Impacto: [o que isso causou]
    O que eu quero que mude: [comportamento desejado, observável]
    Histórico: [já foi conversado antes?]

    Escreva o roteiro da conversa: abertura, exposição dos fatos, escuta,
    acordo de mudança, acompanhamento. Antecipe 3 reações possíveis e
    como responder a cada uma sem escalar o conflito.""",
    )

    # ---------------------------------------------------- 14 Automação
    h2("3.14 Automação, conectores e agentes")

    prompt(
        "mapear o que automatizar",
        """Descreva-me como consultor de automação.

    Minha rotina semanal: [liste as tarefas recorrentes e quanto tempo cada uma leva]
    Ferramentas que uso: [liste]
    O que mais me consome tempo: [percepção]

    1. Classifique cada tarefa em: automatizar totalmente / assistir com IA /
       manter manual — com o motivo
    2. Ordene as candidatas por (tempo economizado ÷ esforço de implementar)
    3. Para as 3 primeiras, descreva o fluxo de automação passo a passo
    4. Diga o que pode dar errado em cada uma e que verificação humana manter""",
    )

    prompt(
        "rotina diária com conectores",
        """Com acesso ao meu e-mail, agenda e arquivos, monte meu resumo da manhã:

    1. Compromissos de hoje, com o que preciso preparar para cada um
    2. E-mails que exigem resposta minha hoje, ordenados por urgência real
       (não por remetente)
    3. E-mails que posso ignorar, e por quê
    4. Prazos que vencem nos próximos 3 dias
    5. As 3 coisas que, se eu fizer hoje, tornam o dia produtivo

    Máximo 300 palavras. Comece pelo que muda o meu dia.""",
        nota="Requer conectores ativos. Vale configurar como tarefa recorrente.",
    )

    # ====================================================================
    h1("Parte 4 — Estratégias de uso avançado")

    h2("4.1 Encadeamento: uma tarefa grande vira várias pequenas")
    para(
        "A causa número um de resultados medianos é pedir tudo de uma vez. O Claude executa melhor uma "
        "sequência de passos do que um pedido gigante. Em vez de \"crie minha estratégia de marketing\", faça:"
    )
    numbered("**Diagnóstico** — \"analise estes dados e me diga onde está o gargalo\"")
    numbered("**Opções** — \"gere 5 caminhos possíveis para resolver esse gargalo\"")
    numbered("**Escolha** — \"compare os 5 pelos meus critérios e recomende um\"")
    numbered("**Detalhamento** — \"detalhe o caminho escolhido em plano de 90 dias\"")
    numbered("**Execução** — \"escreva as peças da primeira semana\"")
    para(
        "Cada etapa vira insumo da seguinte, e você corrige o rumo antes de o erro se propagar. "
        "Mantenha tudo na mesma conversa para preservar o contexto."
    )

    h2("4.2 Ensinar pelo exemplo")
    para(
        "Descrever o tom que você quer é impreciso. Mostrar é exato. Cole de dois a cinco exemplos do que "
        "considera bom e diga: **\"aprenda o padrão destes exemplos — estrutura, ritmo, vocabulário e nível de "
        "formalidade — e escreva o próximo seguindo o mesmo padrão\"**. Se puder, inclua também um exemplo ruim "
        "marcado como ruim, explicando o motivo. O contraste ensina mais do que dez adjetivos."
    )

    h2("4.3 Autocrítica: a segunda passada")
    para(
        "A primeira resposta é um rascunho. A segunda é onde está o valor. Depois de receber qualquer entrega "
        "importante, use uma destas:"
    )
    bullet("\"Critique esta resposta como o cliente mais exigente possível. Depois reescreva corrigindo tudo que você apontou.\"")
    bullet("\"Quais são os três pontos mais fracos do que você acabou de escrever?\"")
    bullet("\"Assuma que essa recomendação vai dar errado. O que provavelmente aconteceu?\"")
    bullet("\"O que um especialista em [área] diria que está faltando aqui?\"")

    h2("4.4 Projetos: pare de repetir contexto")
    para(
        "Se você explica quem é você e o que a sua empresa faz toda vez que abre uma conversa, você está "
        "desperdiçando o recurso mais valioso da ferramenta. Crie um Projeto por frente de trabalho "
        "(\"Conteúdo\", \"Comercial\", \"Produto\") e configure duas coisas:"
    )
    bullet("**Base de conhecimento:** suba os documentos que definem o contexto — manual de marca, tabela de preços, personas, exemplos dos seus melhores textos, políticas internas, dados do último trimestre.")
    bullet("**Instruções do projeto:** um texto permanente com quem você é, para quem fala, o que nunca pode ser dito e em que formato prefere receber as respostas. O modelo está no Anexo.")

    h2("4.5 Peça para ser entrevistado")
    para(
        "Quando você não sabe explicar direito o que quer, inverta: **\"antes de produzir qualquer coisa, "
        "faça-me até 10 perguntas cujas respostas mudariam significativamente o resultado. Faça uma pergunta "
        "por vez.\"** Esse único hábito resolve a maior parte dos casos em que \"a IA não entendeu o que eu queria\"."
    )

    h2("4.6 Separe pensar de escrever")
    para(
        "Peça o raciocínio antes do texto final: \"primeiro me mostre a estrutura em bullets e espere minha "
        "aprovação; só depois escreva\". Aprovar uma estrutura leva 30 segundos; refazer um texto de duas mil "
        "palavras leva meia hora."
    )

    h2("4.7 Defina o que não pode acontecer")
    para(
        "Restrições negativas costumam melhorar mais o resultado do que instruções positivas. Monte a sua "
        "lista fixa e reaproveite: sem clichês de mercado, sem promessas exageradas, sem emoji, sem \"é importante "
        "ressaltar\", sem introdução antes de responder, sem repetir a pergunta, nada inventado sem fonte."
    )

    h2("4.8 Marque a incerteza")
    para(
        "Em qualquer tarefa factual, acrescente: **\"marque com (?) tudo que você não conseguir confirmar, "
        "e escreva 'não sei' quando for o caso — prefiro uma lacuna a uma informação incorreta\"**. "
        "E confira sempre números, nomes próprios, datas, citações e valores legais antes de usar."
    )

    h2("4.9 Trabalhe com arquivos longos em duas etapas")
    para(
        "Com documentos extensos, primeiro peça um mapa (\"liste as seções e o que cada uma trata, em uma linha\"), "
        "depois mergulhe no que interessa (\"agora detalhe apenas as seções 4 e 7\"). Você economiza tempo e "
        "evita respostas superficiais que tentam cobrir tudo."
    )

    # ====================================================================
    h1("Parte 5 — Playbooks passo a passo")

    h2("Playbook 1 — Um mês de conteúdo em 90 minutos")
    numbered("Abra um Projeto \"Conteúdo\" e suba: manual de marca, 10 melhores posts anteriores, descrição do público e da oferta.")
    numbered("Use o prompt **3.1 · calendário editorial** para gerar 30 dias de temas.")
    numbered("Escolha os 8 temas mais fortes e peça: \"desenvolva o tema 3 em carrossel de 8 slides\".")
    numbered("Para cada peça pronta, use **3.1 · reaproveitar em 8 formatos**.")
    numbered("Rode a autocrítica (4.3) nas 3 peças mais importantes.")
    numbered("Peça ao final: \"liste o que precisa de imagem, vídeo ou dado que eu ainda não tenho\".")

    h2("Playbook 2 — Da reunião ao plano de ação em 10 minutos")
    numbered("Grave e transcreva a reunião (qualquer ferramenta de transcrição).")
    numbered("Suba a transcrição e rode o prompt **3.5 · de transcrição para plano de ação**.")
    numbered("Peça: \"escreva o e-mail de follow-up para os participantes, com as ações de cada um\".")
    numbered("Peça: \"liste o que ficou decidido sem dono — preciso resolver isso hoje\".")
    numbered("Com conectores ativos, peça para criar as tarefas direto na sua ferramenta de gestão.")

    h2("Playbook 3 — Auditar e reescrever uma página de vendas")
    numbered("Cole a página atual e peça: \"identifique o nível de consciência para o qual essa página foi escrita\".")
    numbered("Peça: \"liste os 10 pontos onde um visitante desiste de ler, e o motivo de cada um\".")
    numbered("Peça 3 headlines alternativas com ângulos distintos e escolha uma.")
    numbered("Rode o prompt **3.2 · página de vendas** já com a headline escolhida.")
    numbered("Peça a versão de teste A/B: \"mude apenas a abertura e a oferta; mantenha o resto\".")
    numbered("Peça o plano de medição: \"o que eu meço para saber qual venceu, e com quantos visitantes\".")

    h2("Playbook 4 — De planilha a decisão")
    numbered("Suba o arquivo e rode **3.6 · análise exploratória**.")
    numbered("Escolha o achado mais relevante e peça: \"investigue essa hipótese a fundo\".")
    numbered("Peça os gráficos que sustentam a conclusão, como artifact.")
    numbered("Rode **3.6 · relatório a partir de números** para a audiência certa.")
    numbered("Rode a autocrítica: \"que argumento um cético usaria contra este relatório?\".")

    h2("Playbook 5 — Um assistente de suporte com o conhecimento da empresa")
    numbered("Crie um Projeto \"Suporte\".")
    numbered("Suba: base de conhecimento, política de reembolso, tabela de planos, tom de voz, 20 tickets exemplares bem respondidos.")
    numbered("Escreva as instruções do projeto usando o modelo do Anexo, incluindo o que o assistente nunca pode prometer.")
    numbered("Rode **3.3 · macros padronizadas** para gerar o conjunto inicial de respostas.")
    numbered("Teste com 20 tickets reais antigos e compare com o que foi respondido na época.")
    numbered("Ajuste as instruções com base nos erros. Repita até estabilizar.")

    h2("Playbook 6 — Inteligência de concorrência trimestral")
    numbered("Rode **3.1 · análise de concorrente** para cada um dos 3 principais.")
    numbered("Peça: \"compare os três em uma tabela: posicionamento, preço, público, canal principal, lacuna\".")
    numbered("Peça: \"onde os três são iguais? Essa é a minha oportunidade de contraste\".")
    numbered("Peça o plano: \"3 movimentos que eu poderia fazer nos próximos 90 dias para ocupar essa lacuna\".")
    numbered("Salve o relatório no Projeto e repita a cada trimestre para acompanhar a evolução.")

    # ====================================================================
    h1("Parte 6 — Dez erros que estragam o resultado")

    tabela(
        ["Erro", "Por que atrapalha", "O que fazer"],
        [
            ["Pedir sem contexto", "O modelo preenche as lacunas com a média da internet", "Use os seis blocos da Parte 2.1"],
            ["Pedir tudo de uma vez", "Cada parte sai pela metade", "Encadeie (4.1)"],
            ["Aceitar a primeira resposta", "A primeira é rascunho", "Rode a autocrítica (4.3)"],
            ["Descrever o tom em vez de mostrar", "\"Descontraído\" significa coisas diferentes", "Cole exemplos (4.2)"],
            ["Repetir o contexto toda vez", "Desperdiça tempo e gera inconsistência", "Use Projetos (4.4)"],
            ["Não dizer o que evitar", "O resultado vem cheio de clichê", "Liste restrições negativas (4.7)"],
            ["Publicar dado factual sem conferir", "Números, datas e citações precisam de verificação", "Peça fontes e confira (4.8)"],
            ["Usar como oráculo, não como colega", "Você perde a chance de ser questionado", "Peça que ele te entreviste (4.5)"],
            ["Nunca revisar o que funcionou", "Você reinventa o prompt toda semana", "Guarde seus melhores prompts em um documento"],
            ["Terceirizar o julgamento final", "A responsabilidade continua sendo sua", "Revise sempre antes de publicar ou enviar"],
        ],
        widths=[4.2, 6.0, 6.0],
    )

    # ====================================================================
    h1("Parte 7 — Cola de bolso")

    para("Frases curtas para colar no meio de qualquer conversa. Guarde esta página.", italic=True, muted=True)

    h3("Para melhorar o que veio")
    bullet("\"Está genérico. Reescreva com detalhes que só um especialista em [X] escreveria.\"")
    bullet("\"Corte 40% sem perder informação.\"")
    bullet("\"Me dê 3 versões radicalmente diferentes.\"")
    bullet("\"Critique sua resposta e reescreva.\"")
    bullet("\"Mantenha tudo, mude só [X].\"")

    h3("Para controlar o formato")
    bullet("\"Responda apenas com a tabela, sem texto antes ou depois.\"")
    bullet("\"Máximo [N] palavras.\"")
    bullet("\"Comece pela conclusão.\"")
    bullet("\"Gere como artifact.\"")
    bullet("\"Uma linha por item, sem introdução.\"")

    h3("Para garantir qualidade")
    bullet("\"Marque com (?) o que não conseguir confirmar.\"")
    bullet("\"Cite a fonte de cada afirmação factual.\"")
    bullet("\"Se faltar informação, pergunte em vez de assumir.\"")
    bullet("\"Separe o que é fato do que é sua interpretação.\"")
    bullet("\"Pense com calma antes de responder.\"")

    h3("Para destravar")
    bullet("\"Faça-me 10 perguntas antes de começar. Uma por vez.\"")
    bullet("\"Qual pergunta eu deveria estar fazendo e não fiz?\"")
    bullet("\"O que eu não considerei?\"")
    bullet("\"Me mostre a estrutura primeiro; escrevo depois da minha aprovação.\"")
    bullet("\"Assuma que isso vai dar errado. O que aconteceu?\"")

    # ====================================================================
    h1("Anexo — Modelo de instruções de Projeto")

    para(
        "Copie o texto abaixo no campo de instruções do seu Projeto e preencha. "
        "Este é o investimento de trinta minutos que muda todos os resultados seguintes."
    )

    prompt(
        "instruções permanentes do projeto",
        """QUEM SOU EU
    Nome / empresa: [ ]
    O que fazemos, em uma frase: [ ]
    Meu papel: [ ]

    PARA QUEM FALAMOS
    Público principal: [demografia + comportamento + o que os mantém acordados à noite]
    Público secundário: [ ]
    Como eles falam: [expressões que usam, termos que não entendem]

    NOSSA VOZ
    Somos: [3 adjetivos]
    Não somos: [3 adjetivos]
    Referências de tom: [marcas ou autores cujo tom nos agrada]

    REGRAS FIXAS
    - Nunca prometer [ ]
    - Nunca usar as palavras/expressões: [ ]
    - Sempre incluir [ ] em textos de venda
    - Moeda, unidades e formato de data: [ ]
    - Idioma e variante: [ ]

    COMO PREFIRO RECEBER AS RESPOSTAS
    - Comece sempre pela conclusão
    - Sem introdução do tipo "claro, aqui está"
    - Formato padrão: [bullets / tabela / texto corrido]
    - Extensão padrão: [ ]
    - Quando faltar informação, pergunte em vez de assumir
    - Marque com (?) o que não puder confirmar

    CONTEXTO ATUAL
    Objetivo do trimestre: [ ]
    Campanhas ou projetos em andamento: [ ]
    O que mudou recentemente e você precisa saber: [ ]""",
    )

    para(
        "Revise essas instruções a cada trimestre. Um Projeto com instruções desatualizadas produz "
        "trabalho desatualizado com muita confiança.",
        italic=True,
        muted=True,
    )

