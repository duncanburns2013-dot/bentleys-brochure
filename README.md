# Bentley's Listing Presentation

A listing-presentation booklet for Bentley's Real Estate (RE/MAX Collection),
built from one HTML source into two deliverables:

- **Print** — 8.5 × 11 in, saddle-stitched, 20pp, press-ready CMYK PDF
- **Digital** — a page-turn flipbook served from GitHub Pages and embedded
  into bentleysrealestate.com

See [`docs/2026-09-22-bentleys-brochure-design.md`](docs/2026-09-22-bentleys-brochure-design.md)
for the full design spec — palette, typography, page plan, and the rules the
build has to respect.

## Layout

| Path | What |
|---|---|
| `src/pages/` | Page markup, one file per page |
| `src/styles/` | Design tokens, shared layout, print rules |
| `assets/` | Logos, photography, self-hosted fonts |
| `scripts/` | Build scripts (HTML assembly, PDF render) |
| `docs/` | Design spec |

## Build

```bash
npm install
npm run build      # assemble the flipbook + print HTML
npm run pdf        # render the press-ready PDF
```

## Brand

Navy `#1e335e`, cyan `#c9ebfc` — Bentley's approved pair. These are
intentionally lighter than the 2026 RE/MAX Collection manual values; do not
"correct" them. Market data is attributed to MLS PIN.
