# Social artwork renderer

Renders the 45-day SnapGain content calendar into ready-to-post PNGs —
84 assets: 12 single images, 13 four-slide carousels, 20 reel covers.

The point of keeping it here rather than as a one-off: **every rate quoted in
the artwork is a live partner rate that moves.** They live in one `RATES` dict
at the top of `render_calendar.py`, and the post copy references them by name.
Change a number, re-render, repost — instead of hunting through 84 images'
worth of prose.

## Run it

```bash
cd tools/social
./fetch_fonts.sh                          # once — pulls 6 TTFs from Google Fonts
python3 render_calendar.py                # all 84, into ./out, plus a zip
python3 render_calendar.py --only 3 6 38  # just the days a rate touched
python3 render_calendar.py --size 1080x1350   # the 4:5 the IG feed prefers
```

No dependencies beyond Python 3 and a Chromium binary. The script finds Chrome
on `PATH`, in the Playwright cache, or in `/Applications`; override with
`CHROME=/path/to/chrome`.

Output lands in `out/weekN/` and is gitignored, as are the fonts.

## When a rate changes

1. Edit `RATES` in `render_calendar.py`.
2. Check `TOTALS` — those are the rounded headline figures (`= 21% BACK`), kept
   separate on purpose because rounding is a judgement call. The comment beside
   each one names the components it adds up.
3. `python3 render_calendar.py --only <days>`. The days a rate appears on are
   easy to find: `grep -n '{gc_treatwell}' render_calendar.py`.

Figures that are pure arithmetic off `RATES` — the £31.60 Deliveroo order, the
£180/year and £22.50 rent examples — recompute themselves.

## House rule

Same as the public landing page: **never name a partner platform in the copy.**
Shops (Sainsbury's, Currys, Boots, Deliveroo, Uber, BA) and Avios may be named;
the platforms that actually pay stay generic — "a cashback portal", "the
gift-card apps", "the app that pays your phone bill". A post that names them
lets a viewer Google their way past the affiliate flow.

## Design

Authored at 1080×1920. Every vertical metric scales off that, so other page
heights keep the same proportions.

The frame is a 4-row CSS grid — meta rail, copy, mascot band, footer. The
mascot owns a row, which is why no headline can ever land on top of it. Copy
sits in the centre band so it survives Instagram's 4:5 crop of a 9:16 image.

Type is Archivo 900/800 for headlines (grotesk, large x-height, holds up at
thumbnail size), Instrument Sans for body, IBM Plex Mono for the date rail.
Colours come from `src/index.css` — `#7D4DFB`, `#FF3FCE`, `#99FF33`. The
mascot is read straight from `public/snapgain-mascot.png`, so a logo change
flows through on the next render.
