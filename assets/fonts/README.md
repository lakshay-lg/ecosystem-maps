# Self-hosted fonts

Both families are self-hosted so the site has no external runtime dependency —
it renders identically offline, dropped into an Obsidian vault, or on a network
that blocks Google Fonts.

| Family | Used for | Weights | License |
| --- | --- | --- | --- |
| [Inter](https://github.com/rsms/inter) | body text, UI | 400, 500, 600 | SIL OFL 1.1 — `OFL-Inter.txt` |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) | headings, node labels | 400, 500, 600, 700 | SIL OFL 1.1 — `OFL-SpaceGrotesk.txt` |

Only the `latin` and `latin-ext` subsets are included; each `.woff2` is 20-45 KB
and browsers fetch only the ones a page actually needs.

To add weights or subsets, edit the request in `scripts/fetch-fonts.sh` and re-run
it from the repository root. It rewrites `fonts.css` and re-downloads the files.
