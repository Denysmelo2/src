# -*- coding: utf-8 -*-
import sys
from conteudo import build
from emit_docx import DocxEmitter
from emit_pdf import PdfEmitter

outdir = sys.argv[1] if len(sys.argv) > 1 else "."
nome = "Guia-Pratico-do-Claude"

d = DocxEmitter(); build(d); d.save(f"{outdir}/{nome}.docx")
p = PdfEmitter(); build(p); p.save(f"{outdir}/{nome}.pdf")
print("gerado:", nome)
