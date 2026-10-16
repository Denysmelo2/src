# -*- coding: utf-8 -*-
"""Renderizador PDF do guia (ReportLab)."""

from util import dedent_body
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, XPreformatted,
                                HRFlowable)

CLAY = colors.HexColor("#C15F3C")
INK = colors.HexColor("#1F1E1D")
SLATE = colors.HexColor("#5A5651")
BOX_BG = colors.HexColor("#F4EFE9")
RULE_BG = colors.HexColor("#E8E0D6")
HEAD_BG = colors.HexColor("#2B2926")
ZEBRA = colors.HexColor("#F7F4F0")
GRID = colors.HexColor("#DDD6CD")

_SANS = "/usr/share/fonts/truetype/liberation/"
_MONO = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("Body", _SANS + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Body-Bold", _SANS + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Body-Italic", _SANS + "LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Body-BoldItalic", _SANS + "LiberationSans-BoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("Mono", _MONO + "DejaVuSansMono.ttf"))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold",
                              italic="Body-Italic", boldItalic="Body-BoldItalic")

PAGE_W, PAGE_H = A4
M_TOP, M_BOT, M_L, M_R = 2.0 * cm, 2.0 * cm, 2.2 * cm, 2.2 * cm
CONTENT_W = PAGE_W - M_L - M_R


def _esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _md(text):
    """**negrito** -> <b>negrito</b>, com escape de XML."""
    out, parts = [], _esc(text).split("**")
    for i, part in enumerate(parts):
        out.append("<b>%s</b>" % part if i % 2 == 1 else part)
    return "".join(out)


def _style(name, **kw):
    base = dict(fontName="Body", fontSize=9.8, leading=13.4, textColor=INK,
                alignment=TA_LEFT, spaceAfter=5)
    base.update(kw)
    return ParagraphStyle(name, **base)


S_BODY = _style("body")
S_MUTED = _style("muted", textColor=SLATE)
S_ITALIC = _style("italic", fontName="Body-Italic")
S_MUTED_ITALIC = _style("mutedit", fontName="Body-Italic", textColor=SLATE)
S_H1 = _style("h1", fontName="Body-Bold", fontSize=17, leading=21,
              textColor=CLAY, spaceAfter=2)
S_H2 = _style("h2", fontName="Body-Bold", fontSize=13, leading=17,
              spaceBefore=13, spaceAfter=4, keepWithNext=1)
S_H3 = _style("h3", fontName="Body-Bold", fontSize=10.4, leading=14,
              textColor=CLAY, spaceBefore=9, spaceAfter=2, keepWithNext=1)
S_BULLET = _style("bullet", leftIndent=15, bulletIndent=3, spaceAfter=3)
S_LABEL = _style("label", fontName="Body-Bold", fontSize=7.6, leading=10,
                 textColor=CLAY, spaceAfter=4)
S_MONO = ParagraphStyle("mono", fontName="Mono", fontSize=8.1, leading=11.3,
                        textColor=INK, spaceAfter=0)
S_NOTE = _style("note", fontName="Body-Italic", fontSize=8.2, leading=11,
                textColor=SLATE, spaceBefore=5, spaceAfter=0)
S_CELL = _style("cell", fontSize=8.8, leading=11.6, spaceAfter=0)
S_CELLH = _style("cellh", fontName="Body-Bold", fontSize=8.8, leading=11.6,
                 textColor=colors.white, spaceAfter=0)
S_CALL_T = _style("callt", fontName="Body-Bold", fontSize=9.2, leading=12,
                  spaceAfter=2)
S_CALL_B = _style("callb", fontSize=9.2, leading=12.6, spaceAfter=0)


class PdfEmitter:
    def __init__(self):
        self.flow = []
        self._n = 0
        self._cover_done = False

    # ------------------------------------------------------ internos
    def _reset_num(self):
        self._n = 0

    def _add(self, f):
        self.flow.append(f)

    # ---------------------------------------------------------- capa
    def capa(self, linha1, linha2, subtitulo, destaques, rodape):
        self._add(Spacer(1, 4.4 * cm))
        self._add(Paragraph(_esc(linha1), _style("t1", fontName="Body-Bold",
                                                 fontSize=34, leading=39,
                                                 spaceAfter=0)))
        self._add(Paragraph(_esc(linha2), _style("t2", fontName="Body-Bold",
                                                 fontSize=34, leading=39,
                                                 textColor=CLAY, spaceAfter=14)))
        self._add(Paragraph(_esc(subtitulo), _style("sub", fontSize=12.5,
                                                    leading=17, textColor=SLATE,
                                                    spaceAfter=24)))
        inner = []
        for texto, bold in destaques:
            st = _style("d", fontSize=10.6, leading=15,
                        fontName="Body-Bold" if bold else "Body", spaceAfter=2)
            inner.append(Paragraph("•&nbsp;&nbsp;" + _esc(texto), st))
        self._add(self._box(inner, BOX_BG, bar=True))
        self._add(Spacer(1, 5.2 * cm))
        self._add(Paragraph(_esc(rodape), _style("rod", fontSize=9,
                                                 textColor=SLATE)))
        self._add(PageBreak())
        self._cover_done = True

    def _box(self, flowables, bg, bar=False, pad_l=10):
        t = Table([[flowables]], colWidths=[CONTENT_W])
        style = [
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), pad_l),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]
        if bar:
            style.append(("LINEBEFORE", (0, 0), (0, -1), 3, CLAY))
        t.setStyle(TableStyle(style))
        return t

    # ------------------------------------------------------- títulos
    def h1(self, text, page_break=True):
        self._reset_num()
        if page_break and self._cover_done:
            self._add(PageBreak())
        self._add(Paragraph(_esc(text.upper()), S_H1))
        self._add(HRFlowable(width="100%", thickness=1, color=CLAY,
                             spaceBefore=3, spaceAfter=11))

    def h2(self, text):
        self._reset_num()
        self._add(Paragraph(_esc(text), S_H2))

    def h3(self, text):
        self._reset_num()
        self._add(Paragraph(_esc(text), S_H3))

    # --------------------------------------------------------- texto
    def para(self, text, italic=False, muted=False, after=7):
        self._reset_num()
        if italic and muted:
            st = S_MUTED_ITALIC
        elif italic:
            st = S_ITALIC
        elif muted:
            st = S_MUTED
        else:
            st = S_BODY
        self._add(Paragraph(_md(text), st))

    def bullet(self, text, level=0):
        self._reset_num()
        st = ParagraphStyle("b%d" % level, parent=S_BULLET,
                            leftIndent=15 + 15 * level,
                            bulletIndent=3 + 15 * level)
        self._add(Paragraph(_md(text), st, bulletText="•"))

    def numbered(self, text):
        self._n += 1
        self._add(Paragraph(_md(text), S_BULLET, bulletText="%d." % self._n))

    # -------------------------------------------------------- blocos
    def prompt(self, titulo, corpo, nota=None):
        self._reset_num()
        inner = [Paragraph(_esc("PROMPT · " + titulo.upper()), S_LABEL),
                 XPreformatted(_esc(dedent_body(corpo)), S_MONO)]
        if nota:
            inner.append(Paragraph(_esc("» " + nota), S_NOTE))
        self._add(self._box(inner, BOX_BG, bar=True))
        self._add(Spacer(1, 8))

    def tabela(self, headers, rows, widths=None):
        self._reset_num()
        if widths:
            total = sum(widths)
            col_w = [CONTENT_W * (w / total) for w in widths]
        else:
            col_w = [CONTENT_W / len(headers)] * len(headers)
        data = [[Paragraph(_md(h), S_CELLH) for h in headers]]
        for row in rows:
            data.append([Paragraph(_md(c), S_CELL) for c in row])
        t = Table(data, colWidths=col_w, repeatRows=1)
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
        t.setStyle(TableStyle(style))
        self._add(t)
        self._add(Spacer(1, 9))

    def callout(self, titulo, texto):
        self._reset_num()
        inner = [Paragraph(_esc(titulo), S_CALL_T),
                 Paragraph(_esc(texto), S_CALL_B)]
        self._add(self._box(inner, RULE_BG))
        self._add(Spacer(1, 8))

    # ---------------------------------------------------------- save
    def save(self, path, titulo="Guia Prático do Claude"):
        doc = BaseDocTemplate(path, pagesize=A4, title=titulo,
                              author="Guia de apoio", leftMargin=M_L,
                              rightMargin=M_R, topMargin=M_TOP,
                              bottomMargin=M_BOT)
        frame = Frame(M_L, M_BOT, CONTENT_W, PAGE_H - M_TOP - M_BOT,
                      leftPadding=0, rightPadding=0, topPadding=0,
                      bottomPadding=0, id="main")

        def footer(canvas, _doc):
            if _doc.page == 1:
                return
            canvas.saveState()
            canvas.setFont("Body", 8)
            canvas.setFillColor(SLATE)
            canvas.drawRightString(PAGE_W - M_R, M_BOT - 0.9 * cm,
                                   str(_doc.page))
            canvas.drawString(M_L, M_BOT - 0.9 * cm, "Guia Prático do Claude")
            canvas.setStrokeColor(GRID)
            canvas.setLineWidth(0.5)
            canvas.line(M_L, M_BOT - 0.55 * cm, PAGE_W - M_R, M_BOT - 0.55 * cm)
            canvas.restoreState()

        doc.addPageTemplates([PageTemplate(id="body", frames=[frame],
                                           onPage=footer)])
        doc.build(self.flow)
