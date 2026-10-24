# Gerador do Guia Prático do Claude

Gera `Guia-Pratico-do-Claude.docx` e `Guia-Pratico-do-Claude.pdf` a partir de uma
única fonte de conteúdo.

## Estrutura

| Arquivo | Papel |
|---|---|
| `conteudo.py` | Todo o texto do guia, independente do formato de saída |
| `emit_docx.py` | Renderizador Word (python-docx) |
| `emit_pdf.py` | Renderizador PDF (ReportLab) |
| `util.py` | Utilidades compartilhadas |
| `gerar.py` | Ponto de entrada |

`conteudo.py` expõe `build(e)`, onde `e` é um emissor que implementa
`capa, h1, h2, h3, para, bullet, numbered, prompt, tabela, callout`. Para
adicionar um novo formato de saída, basta implementar essa mesma interface.

## Como rodar

```bash
pip install python-docx reportlab
python3 gerar.py <diretório-de-saída>
```

O PDF usa Liberation Sans (texto) e DejaVu Sans Mono (blocos de prompt),
lidas de `/usr/share/fonts/truetype/`. Em outro sistema, ajuste `_SANS` e
`_MONO` no topo de `emit_pdf.py`.
