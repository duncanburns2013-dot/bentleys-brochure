# Bentley's Listing Presentation

A listing-presentation booklet for Bentley's Real Estate (RE/MAX Collection),
built from one HTML source into two deliverables:

- **Print** — 8.5 × 11 in, saddle-stitched, 20pp, press-ready CMYK PDF
- **Digital** — a page-turn flipbook served from GitHub Pages and embedded
  into bentleysrealestate.com

**Live flipbook:** <https://duncanburns2013-dot.github.io/bentleys-brochure/>

See [`docs/2026-09-22-bentleys-brochure-design.md`](docs/2026-09-22-bentleys-brochure-design.md)
for the full design spec — palette, typography, page plan, and the rules the
build has to respect, and [`docs/data-sources.md`](docs/data-sources.md) for
where every figure in the book comes from.

**Market share chart source:**
<https://app.flourish.studio/visualisation/29950235/edit>

## Layout

| Path | What |
|---|---|
| `src/pages/` | Page markup, one file per page |
| `src/styles/` | Design tokens, shared layout, chart chrome, print rules |
| `src/data/` | Committed datasets the charts are built from |
| `assets/` | Logos, photography, self-hosted fonts |
| `scripts/` | Build scripts (HTML assembly, chart render, photo prep, PDF) |
| `docs/` | Design spec and data provenance |

## Build

```bash
npm install
npm run build      # assemble the flipbook + print HTML
npm run pdf        # render the press-ready PDF
```

Photography is re-cropped separately, since it reads from a source library
outside the repo:

```bash
python scripts/prepare-photos.py
```

## Embedding

```html
<iframe src="https://duncanburns2013-dot.github.io/bentleys-brochure/"
        width="100%" height="820" style="border:0"
        title="Bentley's Listing Presentation"></iframe>
```

## Brand

Navy `#1e335e`, cyan `#c9ebfc` — Bentley's approved pair. These are
intentionally lighter than the 2026 RE/MAX Collection manual values; do not
"correct" them. Market data is attributed to MLS PIN.

Charts carry **one data series**. The brand pair cannot encode more: cyan
measures 1.22:1 against cream, and cyan against cream measures ΔE 7.0 to
normal vision. Both are hard accessibility failures. Where more than one
entity must appear, use emphasis — the subject in navy, everything else in a
neutral gray.

## Credentials

**Never commit an API key or token to this repository.** It is public, so a
committed secret is compromised the moment it is pushed — deleting it later
does not help, because it remains in the git history and public repos are
scraped for keys within minutes.

Nothing in this build needs a live MLS connection: the chart reads a committed
CSV. If a future script does need one, put it in `.env.local` (gitignored) and
record the variable's *name* — never its value — in `.env.example`.
