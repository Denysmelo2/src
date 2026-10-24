# -*- coding: utf-8 -*-
"""Utilidades compartilhadas pelos renderizadores."""


def dedent_body(corpo):
    """Remove a indentação comum das linhas de continuação de um prompt.

    A primeira linha vem colada ao delimitador da string e nunca tem recuo;
    as demais carregam o recuo do código-fonte.
    """
    linhas = corpo.strip("\n").split("\n")
    resto = [l for l in linhas[1:] if l.strip()]
    if not resto:
        return "\n".join(linhas)
    recuo = min(len(l) - len(l.lstrip(" ")) for l in resto)
    if recuo:
        linhas = [linhas[0]] + [l[recuo:] if l.strip() else "" for l in linhas[1:]]
    return "\n".join(linhas)
