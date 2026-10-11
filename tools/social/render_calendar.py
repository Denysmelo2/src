#!/usr/bin/env python3
"""Render the 45-day SnapGain social calendar as branded PNGs (headless Chromium).

Default output is 1080x1920 (9:16) — TikTok, Reels, Stories and Facebook all
take it natively. `--size 1080x1350` gives the 4:5 variant the Instagram feed
prefers.

Why this lives in the repo
--------------------------
Every rate quoted in the artwork is a live partner rate that moves. They are
collected in RATES below, and the post copy references them by name, so when a
rate changes you edit one number and re-render — instead of hunting through 84
images' worth of prose.

    ./fetch_fonts.sh                     # once
    python3 render_calendar.py           # all 84 assets
    python3 render_calendar.py --only 3 6 38   # just the days that changed

Layout contract (why nothing ever collides)
-------------------------------------------
The frame is a 4-row CSS grid, so the mascot has a row of its own and no copy
can ever sit on top of it.

    row 1  meta rail          top of frame
    row 2  copy block         centred — survives Instagram's 4:5 centre crop
    row 3  mascot band        art only, never text
    row 4  brand + footer

Type
----
    Archivo 900/800              headlines and hooks (grotesk, huge x-height,
                                 reads at thumbnail size)
    Instrument Sans 600/500/400  sub-copy, body, footer
    IBM Plex Mono 500            the small day/date rail only

Outputs under ./out/weekN/:
    D01_single_9x16.png
    D03_carousel_1of4_9x16.png ..
    D02_reel_cover_9x16.png
"""
import argparse
import html
import os
import shutil
import subprocess
import sys
import zipfile
from glob import glob
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
FONTS = HERE / "fonts"
MASCOT = REPO / "public" / "snapgain-mascot.png"

# ── rates ─────────────────────────────────────────────────────────────
# Percentages, as of 16 Sep 2026. Edit here and re-render; the post copy
# below pulls these in by name.
RATES = {
    # discounted gift cards, by store
    "gc_currys": 6.5,
    "gc_treatwell": 7.8,
    "gc_argos": 4.8,
    "gc_tesco": 4.5,
    "gc_boots": 4.5,
    "gc_sainsburys": 3.9,
    "gc_deliveroo": 10.0,
    "gc_uber": 4.5,
    # the other layers
    "portal": 10.0,        # cashback portal guaranteed minimum
    "airtime": 4.0,        # phone-bill app, in-store, on a registered card
    "card": 1.0,           # a card earning 1 point per £1
    "rent_base": 1.0,
    "rent_partner": 1.5,
}

# Headline stack totals. These are the rounded marketing figures, kept
# separate on purpose — re-check each one by hand when a component above
# moves, since rounding is a judgement call, not arithmetic.
TOTALS = {
    "stack_deliveroo": 21,    # gc_deliveroo + portal + card
    "stack_uber": 5.5,        # gc_uber + card
    "stack_treatwell": 9,     # gc_treatwell + card
    "stack_amazon": 5.5,      # gc_tesco + card
    "stack_boots": 15,        # portal + card, plus a boosted-rate week
}

# Fixed scheme figures — not partner rates, but quoted in the copy.
SCHEME = {
    "nectar_in": 400,          # supermarket points ...
    "nectar_out": 250,         # ... convert to this many Avios
    "avios_par": "£9.20",      # value of 1,000 Avios at par (GBP_PER_AVIOS)
    "rent_cashout": "£10",     # minimum rent-points cash-out, since Nov 2025
}

# Worked examples the copy quotes. Pure arithmetic off RATES, so they stay
# right when a rate changes.
EXAMPLE_ORDER = 40      # the Deliveroo order in Day 3
EXAMPLE_RENT = 1500     # the monthly rent in Days 13 and 15


def pct(v):
    """6.5 -> '6.5%', 10.0 -> '10%'"""
    return f"{v:g}%"


def money(v):
    return f"£{v:,.2f}".replace(".00", "")


def build_vars():
    v = {k: pct(n) for k, n in RATES.items()}
    v.update({k: pct(n) for k, n in TOTALS.items()})
    v.update(SCHEME)
    deliveroo_off = RATES["gc_deliveroo"] + RATES["portal"] + RATES["card"]
    v["ex_order"] = money(EXAMPLE_ORDER)
    v["ex_order_net"] = money(EXAMPLE_ORDER * (1 - deliveroo_off / 100))
    v["rent_range"] = f'{RATES["rent_base"]:g}–{pct(RATES["rent_partner"])}'
    v["ex_rent"] = money(EXAMPLE_RENT)
    v["ex_rent_year"] = money(EXAMPLE_RENT * 12 * RATES["rent_base"] / 100)
    v["ex_rent_month"] = money(EXAMPLE_RENT * RATES["rent_partner"] / 100)
    return v


VARS = build_vars()

# ── brand ─────────────────────────────────────────────────────────────
PURPLE, PINK, GREEN = "#7D4DFB", "#FF3FCE", "#99FF33"
INK, GROUND, MUTED = "#FFFFFF", "#0F0A22", "#C9C2E8"
DISCLAIMER = "Rates change · Not financial advice"

FONT_FILES = [
    ("Archivo", 800, "Archivo-800.ttf"),
    ("Archivo", 900, "Archivo-900.ttf"),
    ("Instrument Sans", 400, "InstrumentSans-400.ttf"),
    ("Instrument Sans", 500, "InstrumentSans-500.ttf"),
    ("Instrument Sans", 600, "InstrumentSans-600.ttf"),
    ("IBM Plex Mono", 500, "IBMPlexMono-500.ttf"),
]


def find_chrome():
    """Env override, then the usual places a Chromium binary turns up."""
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        found = shutil.which(name)
        if found:
            return found
    patterns = (
        "/opt/pw-browsers/chromium-*/chrome-linux/chrome",
        str(Path.home() / ".cache/ms-playwright/chromium-*/chrome-linux/chrome"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
    for pat in patterns:
        hits = sorted(glob(pat))
        if hits:
            return hits[-1]
    sys.exit("No Chromium found. Set CHROME=/path/to/chrome and re-run.")


def css(cv, mascot_h):
    z = cv.s   # every vertical metric scales with page height
    face = "".join(
        f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:normal;"
        f"src:url('file://{FONTS}/{f}') format('truetype');}}"
        for fam, wt, f in FONT_FILES
    )
    return f"""
{face}
*{{box-sizing:border-box;margin:0}}
html,body{{width:100%;height:100%;overflow:hidden}}
body{{width:{cv.w}px;height:{cv.h}px;background:{GROUND};color:{INK};
  font-family:'Instrument Sans',sans-serif;position:relative}}
.bg{{position:absolute;inset:0;background:
  radial-gradient(1000px 900px at 108% -6%, rgba(125,77,251,.62), transparent 62%),
  radial-gradient(820px 760px at -12% 104%, rgba(43,181,201,.32), transparent 62%),
  {GROUND}}}
.grid{{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:108px 108px}}

/* 4 rows — the mascot gets its own band, so copy can never overlap it */
.frame{{position:absolute;inset:0;padding:{z(110)}px 80px {z(118)}px;
  display:grid;grid-template-rows:auto 1fr auto auto;gap:{z(36)}px;z-index:2}}

.rail{{display:flex;justify-content:space-between;align-items:center;
  font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:{z(26)}px;
  letter-spacing:.16em;text-transform:uppercase;color:{GREEN}}}
.rail .r{{color:{MUTED}}}

.copy{{display:flex;flex-direction:column;justify-content:center;gap:{z(30)}px;
  max-width:920px}}
.kicker{{font-family:'Instrument Sans',sans-serif;font-weight:600;font-size:{z(30)}px;
  letter-spacing:.14em;text-transform:uppercase;color:{PINK}}}
h1{{font-family:'Archivo',sans-serif;font-weight:900;line-height:1.02;
  letter-spacing:-.032em;text-wrap:balance}}
.sub{{font-family:'Instrument Sans',sans-serif;font-weight:500;font-size:{z(42)}px;
  line-height:1.34;color:{MUTED}}}
.body{{font-family:'Instrument Sans',sans-serif;font-weight:600;line-height:1.3;
  letter-spacing:-.005em}}
h1 em,.body em,.sub em{{font-style:normal;color:{GREEN}}}
.swipe{{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:{z(26)}px;
  color:{GREEN};letter-spacing:.18em}}
.pill{{align-self:flex-start;background:{GREEN};color:{GROUND};
  font-family:'Archivo',sans-serif;font-weight:800;font-size:{z(38)}px;
  letter-spacing:-.01em;padding:{z(22)}px {z(40)}px;border-radius:999px}}

/* row 3 — art only */
.art{{height:{mascot_h}px;position:relative}}
.art img{{position:absolute;right:-14px;bottom:0;height:100%;
  filter:drop-shadow(0 {z(34)}px {z(66)}px rgba(0,0,0,.55))}}

/* row 4 */
.foot{{display:flex;flex-direction:column;gap:{z(18)}px}}
.footrow{{display:flex;justify-content:space-between;align-items:center}}
.brand{{display:flex;align-items:center;gap:18px}}
.brand img{{height:{z(76)}px}}
.brand span{{font-family:'Archivo',sans-serif;font-weight:900;font-size:{z(42)}px;
  letter-spacing:-.03em}}
.brand span b{{color:{GREEN};font-weight:900}}
.url{{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:{z(28)}px;
  color:{GREEN};letter-spacing:.1em}}
.pager{{display:flex;gap:{z(13)}px;align-items:center}}
.pager i{{display:block;width:{z(19)}px;height:{z(19)}px;border-radius:50%;
  background:rgba(255,255,255,.26)}}
.pager i.on{{background:{GREEN};width:{z(48)}px;border-radius:{z(10)}px}}
.disc{{font-family:'Instrument Sans',sans-serif;font-weight:400;font-size:{z(22)}px;
  color:rgba(255,255,255,.42);letter-spacing:.03em}}
"""


def hsize(text):
    n = len(text)
    for lim, px in ((28, 132), (48, 116), (72, 100), (100, 88), (140, 76)):
        if n < lim:
            return px
    return 66


def bsize(text):
    n = len(text)
    for lim, px in ((110, 56), (170, 50), (240, 45)):
        if n < lim:
            return px
    return 40


def fill(s):
    """Substitute the live rates. Always before measuring or escaping — the
    type-size tiers below count characters, so they must see the final text."""
    return s.format(**VARS)


def esc(s):
    return html.escape(s, quote=False).replace("\n", "<br>")


def emph(s):
    """*highlight* → green span"""
    return "".join(
        f"<em>{p}</em>" if i % 2 else p for i, p in enumerate(esc(s).split("*"))
    )


def brand():
    return (f"<div class='brand'><img src='file://{MASCOT}'>"
            f"<span>Snap<b>Gain</b></span></div>")


class Canvas:
    """Page size plus the mascot band, which scales with the page."""

    #: the design is authored at this height; everything vertical scales off it
    BASE_H = 1920

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.k = h / self.BASE_H
        self.mascot_h = self.s(650)
        self.tag = "9x16" if (w, h) == (1080, 1920) else f"{w}x{h}"

    def s(self, px):
        """Scale a vertical metric. Identity at the authored 1080x1920."""
        return round(px * self.k)


def page(cv, rail_l, rail_r, copy, right_slot, mascot, disclaimer=True):
    sheet = css(cv, cv.mascot_h if mascot else 0)
    art = (f"<div class='art'><img src='file://{MASCOT}'></div>"
           if mascot else "<div class='art'></div>")
    disc = (f"<span class='disc'>{DISCLAIMER}</span>" if disclaimer
            else "<span class='disc'></span>")
    return f"""<!doctype html><html><head><meta charset='utf-8'><style>{sheet}</style></head>
<body><div class='bg'></div><div class='grid'></div>
<div class='frame'>
  <div class='rail'><span>{rail_l}</span><span class='r'>{rail_r}</span></div>
  <div class='copy'>{copy}</div>
  {art}
  <div class='foot'>{disc}<div class='footrow'>{brand()}{right_slot}</div></div>
</div></body></html>"""


def single(cv, day, date, kicker, headline, sub):
    kicker, headline, sub = fill(kicker), fill(headline), fill(sub)
    copy = (f"<div class='kicker'>{esc(kicker)}</div>"
            f"<h1 style='font-size:{cv.s(hsize(headline))}px'>{emph(headline)}</h1>"
            f"<div class='sub'>{emph(sub)}</div>")
    short = len(headline) < 62 and len(sub) < 130
    return page(cv, f"SnapGain · Day {day:02d}", esc(date), copy,
                "<span class='url'>snapgain.uk</span>", short)


def slide(cv, day, date, kicker, i, label, text, n=4):
    kicker, label, text = fill(kicker), fill(label), fill(text)
    dots = "".join(f"<i class='{'on' if k == i else ''}'></i>" for k in range(1, n + 1))
    if i == 1:
        copy = (f"<div class='kicker'>{esc(kicker)}</div>"
                f"<h1 style='font-size:{cv.s(hsize(text))}px'>{emph(text)}</h1>"
                f"<div class='swipe'>SWIPE →</div>")
    else:
        copy = (f"<div class='kicker'>{esc(label)}</div>"
                f"<div class='body' style='font-size:{cv.s(bsize(text))}px'>{emph(text)}</div>")
        if i == n:
            copy += "<div class='pill'>Free 7-day trial · snapgain.uk</div>"
    return page(cv, f"SnapGain · Day {day:02d}", f"{esc(date)} · {i}/{n}", copy,
                f"<div class='pager'>{dots}</div>", i == 1, disclaimer=(i == n))


def reel_cover(cv, day, date, kicker, hook):
    kicker, hook = fill(kicker), fill(hook)
    copy = (f"<div class='kicker'>{esc(kicker)}</div>"
            f"<h1 style='font-size:{cv.s(hsize(hook))}px'>{emph(hook)}</h1>")
    return page(cv, f"SnapGain · Day {day:02d}", f"{esc(date)} · Reel", copy,
                "<span class='url'>snapgain.uk</span>", len(hook) < 62)


# ── content ───────────────────────────────────────────────────────────
# Mirrors the published 45-day calendar. {braces} are substituted from
# RATES / TOTALS / SCHEME above; *stars* mark the green highlight.
#
# House rule, same as the public landing page: never name a partner
# platform here. Shops (Sainsbury's, Currys, Boots, Deliveroo, Uber, BA)
# and Avios may be named; the platforms that pay stay generic, so the
# post can't be used to bypass the affiliate flow.
S, C, R = "single", "carousel", "reel"
POSTS = [
 (1, 1, S, "17 Sep", "The number that opens everything", "£129 back + 724 Avios. Same shopping. *Every month.*", "A real SnapGain beta profile · £3,064/month of normal UK spending"),
 (1, 2, R, "18 Sep", "The 3 hidden layers", "You paid full price for that. *Twice.*"),
 (1, 3, C, "19 Sep", "Takeaway Friday", [("HOOK", "Your {ex_order} Deliveroo order should cost *{ex_order_net}.*"), ("LAYER 1", "Buy the Deliveroo gift card first. On the right day it's *{gc_deliveroo} off.* Buy the exact amount of tonight's order."), ("LAYERS 2 + 3", "Pay for it with a card that earns *1 point per £1.* Then open Deliveroo through a cashback portal (*{portal}*) before you order."), ("= {stack_deliveroo} BACK", "On every order. The app names are inside SnapGain. Save this for tonight.")]),
 (1, 4, R, "20 Sep", "Receipt Check #1", "Receipt check: my Saturday big shop. *£120.*"),
 (1, 5, S, "21 Sep", "Would you rather #1", "£15 cashback — or — *1,600 Avios?*", "Vote below. Tomorrow I'll tell you which one I take — and why it depends on you."),
 (2, 6, C, "22 Sep", "Money Monday #1", [("HOOK", "Before you pay ANY UK retailer, *check this.*"), ("THE GIFT CARD LAYER", "Three apps sell store gift cards at a discount. This week: Currys *{gc_currys}* · Treatwell *{gc_treatwell}* · Argos *{gc_argos}* · Tesco *{gc_tesco}* · Boots *{gc_boots}*"), ("HOW", "Buy the exact amount of your basket. Pay with a points card. Show the barcode at the till or paste the code online. *Instant* — no tracking, no waiting."), ("RATES MOVE WEEKLY", "SnapGain shows which app is highest *today.*")]),
 (2, 7, R, "23 Sep", "Layer 2 · the card", "The card in your wallet earns *nothing.* Swap it."),
 (2, 8, S, "24 Sep", "Layer 3 · the portal", "*{portal} minimum.* 100+ UK shops. One portal.", "The catch: click through it BEFORE you shop, and pay by card."),
 (2, 9, R, "25 Sep", "60-second stack", "£600 laptop. *£39 back* before I left the house."),
 (2, 10, C, "26 Sep", "Fuel Friday", [("HOOK", "Your petrol pays for a flight. *Slowly* — but it does."), ("AT THE PUMP", "BP: pay through the BP app, link your supermarket points. Esso: scan the supermarket card. Both earn on fuel *and* the shop."), ("THE CONVERSION", "{nectar_in} supermarket points = *{nectar_out} Avios.* £1,500–2,000 of fuel a year = 1,000–1,500 Avios. Add a points card: *+1 per £.*"), ("SAVE THIS", "For the next fill-up. Full fuel playbook inside SnapGain.")]),
 (2, 11, R, "27 Sep", "Receipt Check #2", "Receipt check: Boots, £62. My *phone bill* just got cheaper."),
 (2, 12, S, "28 Sep", "Screenshot this", "Before you pay, ask:", "☐ Discounted gift card for this shop? (3–8%)\n☐ Paying with a card that earns 1 point per £?\n☐ Online: opened through a portal?\n☐ In-store: card registered in the phone-bill app?\n☐ Scanned the loyalty card?"),
 (3, 13, C, "29 Sep", "Money Monday #2", [("HOOK", "{ex_rent} rent → *{ex_rent_year} a year back.* From an app your landlord never sees."), ("HOW IT WORKS", "A rent-rewards platform forwards your rent to the landlord and credits you *{rent_base}* (any property) or *{rent_partner}* (partner properties). They get the full amount, in your name."), ("NEW SINCE NOV 2025", "Cash out from *1,000 points = {rent_cashout}* (it used to be 2,500). That's 2.5× faster to see money."), ("RENT DAY IS WEDNESDAY", "Set it up today. Rent calculator free at snapgain.uk.")]),
 (3, 14, R, "30 Sep", "Rent day tomorrow", "Rent day is in *24 hours.* Do this first."),
 (3, 15, S, "1 Oct", "Rent day", "Rent day.\n{ex_rent} out. *{ex_rent_month} back.*", "{rent_partner} on partner properties · {rent_base} anywhere else · cash out from {rent_cashout}"),
 (3, 16, R, "2 Oct", "60-second stack", "Paying rent by credit card for the points. *Worth the 1.99% fee?*"),
 (3, 17, C, "3 Oct", "Uber + Uber Eats", [("HOOK", "Every Uber you take earns Avios. *You just never linked it.*"), ("ONE MINUTE", "Uber app → Rewards → link British Airways. *1 Avios per £1* on rides, *2* on Uber Eats."), ("THEN STACK", "Buy Uber gift cards at *~{gc_uber} off*, pay for them with a points card (+1/£), add the gift card as your Uber payment."), ("= ~{stack_uber} + AVIOS", "On every ride. Save this and do it in the queue for your next one.")]),
 (3, 18, R, "4 Oct", "Receipt Check #3", "Receipt check: Saturday takeaway, *£38.*"),
 (3, 19, S, "5 Oct", "Be honest", "This week you had *5 chances* to earn.\nHow many did you take?", "A · 0     B · 1–2     C · 3+"),
 (4, 20, C, "6 Oct", "Money Monday #3", [("HOOK", "Your supermarket points are worth *more as Avios.* Most people spend them on a meal deal."), ("THE {nectar_in}:{nectar_out} RULE", "{nectar_in} supermarket points = *{nectar_out} Avios.* At the till, {nectar_in} points = £2. As Avios at par they're £2.30 — on a good flight, *£4–6.*"), ("ONCE A MONTH", "Convert in the loyalty app, one tap. 1,000 points a month becomes *7,500 Avios a year.*"), ("NEVER GUESS A REDEMPTION", "'Is this flight worth my Avios?' calculator — free at snapgain.uk.")]),
 (4, 21, R, "7 Oct", "Avios test", "Is this flight worth your Avios? *10-second test.*"),
 (4, 22, S, "8 Oct", "Prime Big Deal Days", "Amazon does no cashback.\nHere's the *{stack_amazon}* anyway.", "Tesco gift card at {gc_tesco} off → paid with a points card (+1/£) → buy the Amazon gift card in Tesco → top up your balance."),
 (4, 23, R, "9 Oct", "60-second stack", "£600 flight for £150. *The maths backwards.*"),
 (4, 24, C, "10 Oct", "The haircut stack", [("HOOK", "Your £45 haircut has *£4 and 135 Avios* in it."), ("GIFT CARD", "Treatwell gift card at *{gc_treatwell} off* — the highest gift-card rate in the whole catalogue right now. Pay with a points card."), ("AVIOS SITE", "Open Treatwell through the Avios site: *3 Avios per £1.* Redeem the gift card in your account, then book."), ("= {stack_treatwell} + 300 AVIOS PER £100", "Salons, barbers, nails, massage. Save for your next booking.")]),
 (4, 25, R, "11 Oct", "Receipt Check #4", "Four weeks of stacking. *Here's the running total.*"),
 (4, 26, S, "12 Oct", "Would you rather #2", "2 hours a month of stacking — or — *£1,500 a year?*", "Trick question. It's the same thing."),
 (5, 27, C, "13 Oct", "Money Monday #4", [("MYTH 1", "'Cashback is a scam.' — No. It's the shop paying for a customer. *You're just usually not the one collecting.*"), ("MYTH 2", "'Gift cards are risky.' — Buy the exact basket amount, spend it the same day. *Zero balance, zero risk.*"), ("MYTH 3", "'Points aren't worth anything.' — 1,000 Avios = *{avios_par}* at par. On the right flight, double."), ("MYTH 4", "'It takes hours.' — *Two hours a month.* The app does the comparing.")]),
 (5, 28, R, "14 Oct", "Honest answer", "Is £14.99 a month worth it? *Honest answer.*"),
 (5, 29, S, "15 Oct", "The comparison engine", "Type a shop.\n*Get the best route.*", "Gift card · portal · card · points — ranked with today's rates, for any UK shop you type."),
 (5, 30, R, "16 Oct", "60-second stack", "I compared 5 ways to earn at Sainsbury's. One wins by 2.5× — *with a catch.*"),
 (5, 31, C, "17 Oct", "Boots & Argos", [("HOOK", "Up to *{stack_boots} at Boots.* Most people get 0."), ("REGISTER EVERY CARD", "In the app that pays your phone bill. It tracks the card, not the shop — up to *{airtime}* at partners, in-store at Boots and Argos."), ("TWO ROUTES", "Online at Boots: portal (*{portal}*) + points card (1/£). In-store: registered card (1/£) + phone-bill app (*{airtime}*)."), ("THE CAVEAT", "A gift card is *invisible* to the phone-bill app. Use gift cards where that app doesn't track.")]),
 (5, 32, R, "18 Oct", "Receipt Check #5", "What I got wrong this month. *£12 gone.*"),
 (5, 33, S, "19 Oct", "Screenshot this", "The stacking order", "1 · Gift card, if the shop has one at a discount\n2 · Pay for it with a points card\n3 · Online: portal OR Avios site — never both\n4 · Scan the loyalty card\n⚠ Portal + gift card don't mix."),
 (6, 34, C, "20 Oct", "Money Monday #5", [("HOOK", "Buy your December gift cards *in October.* Here's why."), ("TODAY'S DISCOUNTS", "Currys *{gc_currys}* · Argos *{gc_argos}* · Boots *{gc_boots}* · Treatwell *{gc_treatwell}* · Tesco *{gc_tesco}*. A £600 Christmas budget = *£30–40 back* before a single present."), ("SPREAD IT", "Buy over payday weeks, pay with a points card (+1/£), keep them in the app wallet. Buy per shop so nothing sits unused."), ("THE FULL Q4 STACK LIST", "Every shop, every layer — in SnapGain Premium.")]),
 (6, 35, R, "21 Oct", "Payday is Friday", "Payday is Friday. *20 minutes tonight* pays you every month after."),
 (6, 36, S, "22 Oct", "This is what average looks like", "£3,064 in.\n*£129 + 724 Avios out.*", "A real beta profile · 4.2% cashback + 0.24 Avios per £ · no extreme couponing, no spreadsheets"),
 (6, 37, R, "23 Oct", "Payday routine", "Payday routine. *60 seconds,* once a month."),
 (6, 38, C, "24 Oct", "Weekend big shop", [("HOOK", "*Never mix these two.*"), ("ROUTE A · CASH FIRST", "Click through the portal (*{portal}*), pay with a points card (1/£), scan your loyalty card. *No gift card.*"), ("ROUTE B · AVIOS FIRST", "Gift card at *{gc_sainsburys} off*, paid with a points card, open Sainsbury's from the Avios site (*1 Avios/£*), pay with the gift card, scan your loyalty card."), ("£100 SHOP", "A = £10 + 100 pts + 100 loyalty pts. B = £4 + 100 pts + 100 Avios + 100 loyalty pts. *Pick per basket.*")]),
 (6, 39, R, "25 Oct", "Receipt Check #6", "Receipt check: I just bought Christmas. *In October.*"),
 (6, 40, S, "26 Oct", "Would you rather #3", "£50 off on Black Friday — or — *{portal} off every day of the year?*", "One of these is £50. The other is £1,500."),
 (7, 41, C, "27 Oct", "Money Monday #6", [("HOOK", "Black Friday is *4 weeks away.* Set up in this order or you'll miss half of it."), ("WEEKS 1–2", "Cards registered in the phone-bill app, portal account live, gift-card apps installed. Then shortlist the shops you'll *actually* buy from."), ("WEEKS 3–4", "Buy gift cards for those shops on their best-rate day. On the day: portal first, gift card where it doesn't conflict, points card for the rest."), ("THE SHOP-BY-SHOP LIST", "Drops in SnapGain Premium mid-November.")]),
 (7, 42, R, "28 Oct", "Black Friday", "Black Friday 'deals' are 15% off. My stack is *15% off before the deal.*"),
 (7, 43, S, "29 Oct", "The map", "45 days ago I said I'd show you every door. *Here's the map.*", "Gift cards 3–8% · Points card 1/£ · Portal {portal} · Phone-bill app {airtime} · Rent {rent_range} · Supermarket points → Avios {nectar_in}:{nectar_out}"),
 (7, 44, R, "30 Oct", "Most asked question", "Most asked question this month: *'Which one do I start with?'*"),
 (7, 45, C, "31 Oct", "Halloween", [("HOOK", "🎃 Four money habits *scarier than any costume.*"), ("HABIT 1", "Paying full price at the till when a gift card was {gc_currys} off. → *Check three apps first.*"), ("HABITS 2 + 3", "Rent leaving your account with nothing coming back → *route it through the rewards platform.* Supermarket points spent on a meal deal → *convert to Avios.*"), ("HABIT 4", "Paying with a debit card that earns 0 → *1 point per £1.* November: the Black Friday stack list.")]),
]


def render(chrome, cv, path, markup):
    tmp = path.with_suffix(".html")
    tmp.write_text(markup, encoding="utf-8")
    subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
                    "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={cv.w},{cv.h}",
                    f"--screenshot={path}", f"file://{tmp}"],
                   check=True, capture_output=True)
    tmp.unlink()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--size", default="1080x1920",
                    help="WxH, default 1080x1920 (9:16). 1080x1350 is the "
                         "4:5 the Instagram feed prefers.")
    ap.add_argument("--only", nargs="+", type=int, metavar="DAY",
                    help="render only these day numbers (1-45)")
    ap.add_argument("--out", default=None, help="output directory")
    ap.add_argument("--no-zip", action="store_true")
    args = ap.parse_args()

    try:
        w, h = (int(x) for x in args.size.lower().split("x"))
    except ValueError:
        sys.exit(f"--size wants WxH, got {args.size!r}")
    cv = Canvas(w, h)

    if not MASCOT.exists():
        sys.exit(f"Missing {MASCOT}")
    missing = [f for _, _, f in FONT_FILES if not (FONTS / f).exists()]
    if missing:
        sys.exit(f"Missing fonts ({', '.join(missing)}). Run ./fetch_fonts.sh first.")

    chrome = find_chrome()
    out = Path(args.out) if args.out else HERE / "out"
    wanted = set(args.only) if args.only else None

    files = []
    for wk, day, kind, date, kicker, *rest in POSTS:
        if wanted and day not in wanted:
            continue
        d = out / f"week{wk}"
        d.mkdir(parents=True, exist_ok=True)
        if kind == S:
            headline, sub = rest
            p = d / f"D{day:02d}_single_{cv.tag}.png"
            render(chrome, cv, p, single(cv, day, date, kicker, headline, sub))
            files.append(p)
        elif kind == R:
            (hook,) = rest
            p = d / f"D{day:02d}_reel_cover_{cv.tag}.png"
            render(chrome, cv, p, reel_cover(cv, day, date, kicker, hook))
            files.append(p)
        else:
            (slides,) = rest
            for i, (label, text) in enumerate(slides, 1):
                p = d / f"D{day:02d}_carousel_{i}of4_{cv.tag}.png"
                render(chrome, cv, p, slide(cv, day, date, kicker, i, label, text))
                files.append(p)
        print("ok", day, kind)

    if wanted:
        unknown = wanted - {p[1] for p in POSTS}
        if unknown:
            print("warning: no such day(s):", *sorted(unknown), file=sys.stderr)
    if not files:
        sys.exit("nothing rendered")

    if args.no_zip:
        print(len(files), "images →", out)
        return
    z = out / f"snapgain-45-dias-artes-{cv.tag}.zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(f, f.relative_to(out))
    print(len(files), "images →", z)


if __name__ == "__main__":
    main()
