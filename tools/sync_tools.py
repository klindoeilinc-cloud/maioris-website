#!/usr/bin/env python3
"""Insère (ou met à jour) le bloc partagé « Poursuivre votre diagnostic » sur les trois pages d'outils
et la page Insights, en français et en anglais. Idempotent : le bloc est délimité par des marqueurs.
Commande : python3 tools/sync_tools.py puis python3 tools/build_assets.py puis python3 tools/qa.py"""
import html, os, re
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")

TOOLS = {  # clé : (fichier FR, fichier EN)
 "brief": ("evaluer-votre-brief.html", "brief-check.html"),
 "diag": ("autodiagnostic.html", "self-assessment.html"),
 "coi": ("creative-operations-intelligence.html", "creative-operations-intelligence.html"),
}
TXT = {
 "fr": dict(lbl="Outils", t_tool="Poursuivre votre diagnostic", t_hub="Trois outils pour regarder votre situation sous trois angles",
   lead="Chaque outil répond à une question différente et calcule dans votre navigateur. Commencez par le plus court, puis approfondissez avec Creative Operations Intelligence™.",
   here="Vous êtes ici", go="Ouvrir l'outil",
   items={"brief": ("Évaluez votre brief", "2 minutes · 5 questions", "Votre brief est-il assez solide pour lancer la production ?"),
          "diag": ("Où est votre contrainte ?", "2 minutes · 7 affirmations", "Qu'est-ce qui freine le plus probablement votre marque ?"),
          "coi": ("Creative Operations Intelligence™", "20 questions · 5 étapes", "Combien coûtent vos reprises, et qu'est-ce qui limite votre performance ?")}),
 "en": dict(lbl="Tools", t_tool="Continue your diagnostic", t_hub="Three tools to look at your situation from three angles",
   lead="Each tool answers a different question and calculates in your browser. Start with the shortest, then go deeper with Creative Operations Intelligence™.",
   here="You are here", go="Open the tool",
   items={"brief": ("Assess your brief", "2 minutes · 5 questions", "Is your brief solid enough to start production?"),
          "diag": ("Where is your constraint?", "2 minutes · 7 statements", "What is most likely holding your brand back?"),
          "coi": ("Creative Operations Intelligence™", "20 questions · 5 steps", "What do your reworks cost, and what limits your performance?")}),
}
E_ = html.escape

def block(lang, current):
    x = TXT[lang]; i = 0 if lang == "fr" else 1; out = []
    for key in ("brief", "diag", "coi"):
        title, meta, q = x["items"][key]
        inner = '<span class="tnx-k">%s</span><b>%s</b><span class="tnx-q">%s</span>' % (E_(meta), E_(title), E_(q))
        if key == current:
            out.append('<li class="tnx-i cur" aria-current="page"><div>%s<span class="tnx-here">%s</span></div></li>' % (inner, E_(x["here"])))
        else:
            out.append('<li class="tnx-i"><a data-track="cta_click" data-rank="offer" data-label="tools-%s" href="%s">%s<span class="tnx-go">%s →</span></a></li>' % (key, TOOLS[key][i], inner, E_(x["go"])))
    title = x["t_tool"] if current else x["t_hub"]
    return ('<!--tools-next--><section class="sec alt tnx" data-reveal=""><div class="wrap"><p class="lbl">%s</p><h2 class="h2">%s</h2><p class="tnx-lead">%s</p><ul class="tnx-list">%s</ul></div></section><!--/tools-next-->'
            % (E_(x["lbl"]), E_(title), E_(x["lead"]), "".join(out)))

def apply(path, lang, current):
    p = os.path.join(SITE, path); t = o = open(p, encoding="utf8").read(); b = block(lang, current)
    if "<!--tools-next-->" in t:
        t = re.sub(r"<!--tools-next-->.*?<!--/tools-next-->", lambda m: b, t, flags=re.S)
    elif current is None:   # page Insights : remplace la section « Outil » existante
        t, n = re.subn(r'<section class="sec alt" data-reveal=""><div class="wrap split"><div><p class="lbl">(?:Outil|Tool)</p>.*?</section>', lambda m: b, t, count=1, flags=re.S)
        assert n == 1, path
    else:
        k = t.find('<section class="sec closing"'); k = k if k >= 0 else t.index("</main>")
        t = t[:k] + b + "\n" + t[k:]
    if t != o: open(p, "w", encoding="utf8").write(t); print("mis à jour", path)

for lang in ("fr", "en"):
    i = 0 if lang == "fr" else 1
    for key, files in TOOLS.items(): apply("%s/%s" % (lang, files[i]), lang, key)
    apply("%s/%s" % (lang, "analyses.html" if lang == "fr" else "insights.html"), lang, None)
