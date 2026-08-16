#!/usr/bin/env bash
# Re-download the self-hosted webfonts and regenerate assets/fonts/fonts.css.
#
#   ./scripts/fetch-fonts.sh
#
# Run from the repository root. Only needed when you want different weights or
# subsets — edit FAMILIES / SUBSETS below, then re-run. The committed fonts are
# already correct for the site as it stands.

set -euo pipefail

FAMILIES="family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600"
SUBSETS="latin latin-ext"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
OUT="assets/fonts"

mkdir -p "$OUT"
curl -sS -A "$UA" "https://fonts.googleapis.com/css2?${FAMILIES}&display=swap" -o /tmp/gf.css

SUBSETS="$SUBSETS" OUT="$OUT" python3 - <<'PY'
import os, re, subprocess, pathlib

subsets = set(os.environ['SUBSETS'].split())
out = pathlib.Path(os.environ['OUT'])
css = pathlib.Path('/tmp/gf.css').read_text()

kept = []
for subset, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S):
    if subset not in subsets:
        continue
    url = re.search(r"url\((https://fonts\.gstatic\.com[^)]+)\)", block).group(1)
    fam = re.search(r"font-family:\s*'([^']+)'", block).group(1).replace(' ', '-').lower()
    weight = re.search(r"font-weight:\s*([\d ]+)", block).group(1).strip().replace(' ', '-')
    name = f"{fam}-{weight}-{subset}.woff2"
    subprocess.run(['curl', '-sS', '-o', str(out / name), url], check=True)
    kept.append(f"/* {subset} */\n" + block.replace(url, f"./{name}"))
    print('  ', name)

header = """/* Self-hosted webfonts, so the site has zero external runtime dependencies:
   it renders identically offline, inside an Obsidian vault, and on networks
   that block Google Fonts. Latin subsets only — see fonts/README.md for
   licensing (both families are SIL OFL 1.1).
   Regenerate with scripts/fetch-fonts.sh if you need more weights or subsets. */

"""
(out / 'fonts.css').write_text(header + "\n\n".join(kept) + "\n")
print(f"\nwrote {out}/fonts.css with {len(kept)} @font-face rules")
PY
