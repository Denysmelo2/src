#!/usr/bin/env bash
# Download the six webfont files render_calendar.py renders with.
#
# They are not vendored: all three families are SIL Open Font License 1.1 and
# Google Fonts serves them directly. A legacy User-Agent makes the css2 API
# hand back .ttf URLs instead of .woff2, which is what Chromium needs from a
# file:// @font-face.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fonts"
UA='Mozilla/5.0 (Windows NT 6.1)'
mkdir -p "$DIR"

# name           css2 family spec                      weight
grab() {
  local out="$1" family="$2" weight="$3" url
  if [[ -s "$DIR/$out" ]]; then
    echo "have   $out"
    return
  fi
  url=$(curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?family=${family}&display=swap" \
        | awk -v w="font-weight: ${weight};" '
            $0 ~ w {hit=1}
            hit && /src: url\(/ {
              match($0, /https:[^)]*\.ttf/); print substr($0, RSTART, RLENGTH); exit
            }')
  if [[ -z "$url" ]]; then
    echo "error: Google Fonts returned no .ttf for $family @ $weight" >&2
    exit 1
  fi
  curl -fsS -o "$DIR/$out" "$url"
  echo "got    $out"
}

grab Archivo-800.ttf          'Archivo:wght@800'          800
grab Archivo-900.ttf          'Archivo:wght@900'          900
grab InstrumentSans-400.ttf   'Instrument+Sans:wght@400'  400
grab InstrumentSans-500.ttf   'Instrument+Sans:wght@500'  500
grab InstrumentSans-600.ttf   'Instrument+Sans:wght@600'  600
grab IBMPlexMono-500.ttf      'IBM+Plex+Mono:wght@500'    500

echo "fonts ready in $DIR"
