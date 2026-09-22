# Bentley's Listing Presentation — Design Spec

**Date:** 2026-09-22
**Status:** Approved (Duncan Burns, 2026-09-22)

## What this is

A listing-presentation booklet for Bentley's Real Estate (RE/MAX Collection),
delivered two ways from one source:

1. **Print** — 8.5 × 11 in portrait, saddle-stitched, 20 pages. Press-ready
   PDF handed to a commercial print shop.
2. **Digital** — a page-turn flipbook on GitHub Pages, embedded into
   bentleysrealestate.com by iframe.

The book is presented to prospective sellers of high-end homes. Its job is to
win the listing.

## Reference

Gibson Sotheby's International Realty's listing presentation, scanned to 38
single-page PDFs in the parent folder (`SKM_*.pdf`). Its structure is the
model; its palette and typography are not.

## Non-negotiables

- **Brand colors are Bentley's approved pair**, confirmed by the owner:
  navy `#1e335e`, cyan `#c9ebfc`. These are lighter than the 2026 RE/MAX
  Collection manual's `#000E35` / `#A3D4F2`. Bentley's region holds RE/MAX
  approval for Collection branding; the owner confirmed these colors are
  approved. **Do not silently "correct" them toward the manual values.**
- **Never name the MLS data vendor.** All market data is attributed to
  "MLS PIN" and nothing else — in copy, comments, commit messages, and docs.
- **No MLS backfills.** Targeted reads only. The housing pipeline in
  Massachusetts-Data-Hub is driven from another machine; a stray backfill
  starves the data quota.
- **Print authority is CMYK.** The manual names Pantone 295 C / 277 C as
  Collection inks. Since we are using Bentley's own hex, the press PDF ships
  CMYK conversions of `#1e335e` / `#c9ebfc` as authoritative, with Pantones
  listed as reference only. Pull a printed proof before any full run.

## Palette

| Role | Hex | Use |
|---|---|---|
| Navy | `#1e335e` | Primary ground, display type on cream |
| Cyan | `#c9ebfc` | Accent — eyebrows, rules, display numerals on navy |
| Cream | `#F7F5EE` | Secondary ground (Collection standard) |
| Black | `#000000` | Body text on light grounds |
| White | `#FFFFFF` | Reversed body text, photo grounds |

The Collection palette carries no warm accent, so cyan does the work
Sotheby's gives to gold. The book therefore reads cooler and more maritime
than its reference. This is deliberate.

## Typography

RE/MAX Collection standards (manual p.64): Gotham Condensed all-caps tracked
wide for headlines, Miller Display for subheads, Gotham for body.

Gotham and Miller Display are commercial licenses that Bentley's may not
hold. The build therefore uses the manual's own sanctioned fallback path:

| Role | Shipped | Licensed equivalent |
|---|---|---|
| Headlines | Montserrat, caps, wide tracking | Gotham Condensed |
| Subheads / display serif | Playfair Display | Miller Display |
| Body | Montserrat | Gotham |

Fonts are self-hosted as woff2 under `assets/fonts/`, not loaded from a CDN —
the PDF build must render identically offline. Swapping to licensed fonts is
a change to the font-family custom properties in `tokens.css` and nothing
else.

## Page plan (20 pages)

| # | Spread | Content |
|---|---|---|
| 1 | Cover | Lockup, hero photograph, title line |
| 2 | Letter | From Robert Bentley & Alissa Christie |
| 3 | Strategy | "The attention your property deserves" |
| 4 | Community | Greater Newburyport · Essex County · Southern NH |
| 5 | Process | The five-step selling process |
| 6 | Pricing | Pricing strategy |
| 7 | Brokerage | Founded 2016 → #1 since 2019 |
| 8 | Local numbers | $1.14B sold, 7 years #1, #1 Essex County |
| 9 | Marketing power | Newburyport.com official agency partnership |
| 10 | The Collection | What Collection listing means for the seller |
| 11 | Network reach | RE/MAX global footprint |
| 12 | Online | Web reach and search presence |
| 13 | Syndication | Where the listing appears |
| 14 | Advertising | Paid placement |
| 15 | Social | Audience and engagement |
| 16 | Press | Recognition and rankings |
| 17 | Reporting | Performance data through the sale |
| 18 | Trust | Closing argument |
| 19 | Team | The people, and contact |
| 20 | Back cover | Lockup, 978-572-1200, bentleysrealestate.com |

Page 9 has no Sotheby's counterpart. Being the official agency of
Newburyport.com is a genuinely differentiated asset and earns a full page.

## Architecture

One HTML source, two outputs. No design-tool round trip, so print and web
cannot drift.

```
src/pages/01-cover.html … 20-back.html   page markup, one file per page
src/styles/tokens.css                    colors, type scale, spacing
src/styles/book.css                      shared page/layout rules
src/styles/print.css                     @page, bleed, crop marks
scripts/build.mjs                        assembles dist/
scripts/build-pdf.mjs                    headless Chrome → press PDF
dist/print.html                          all 20 pages, for PDF
dist/index.html                          flipbook, for GitHub Pages
```

**Print path:** `dist/print.html` → headless Chrome `--print-to-pdf` →
`dist/bentleys-listing-presentation.pdf`. Page box is 8.75 × 11.25 in
(8.5 × 11 trim plus 0.125 in bleed all round).

**Digital path:** the same page markup wrapped in
[StPageFlip](https://github.com/Nodlik/StPageFlip) (MIT, vanilla JS). Pages
render as live HTML, so type stays crisp and selectable rather than becoming
images of pages. Facing-page spreads on desktop, single page with swipe on
mobile.

**Hosting:** GitHub Pages from `main`. A push ships. Embedded via iframe.

### Why not the alternatives

- **Design tool → PDF → flipbook.** The flipbook becomes rasterized page
  images: fuzzy text, no selectable copy, no accessibility. The Adobe and
  Canva connectors were also unauthorized in the build session.
- **Separate print and web builds.** Guarantees divergence the first time a
  figure changes.

## Content sources

| Need | Source |
|---|---|
| Positioning, markets, team, owner bios | bentleysrealestate.com |
| $1.14B since 2019, 7 years #1, #1 Essex County | Owner-confirmed, MLS PIN |
| Supporting market stats | Targeted MLS PIN reads — no backfills |
| Hero photography | Bentley's closed-listing photos |
| Place photography | `D:\Bentleys 250` library (808 images) |
| Headshots | `D:\Agent Photos` (68 images) |
| Logos, brand rules | `Brand_Identity_Manual_qkryau.pdf`, `Logo Design Files/` |

Photography is selected by contact sheet and approved by the owner before it
enters the book.

## Logo rebuild (separate deliverable, lowest priority)

The current `Bentleys Logo.png` is `BENTLEY'S℠ | [old 3-D balloon] THE RE/MAX
COLLECTION®` in the old navy. The 2026 refresh replaces the balloon with a
flat pin mark and drops the slash from the REMAX wordmark.

A straight swap is not compliant. The 2026 office-logo rules (manual p.16–17)
require the full office name, forbid the balloon to the right of the REMAX
logotype, and bar the ® from an office logo. The Collection palette page
(p.63) further restricts **logo** colors to Dark Blue and Cream — Black and
Sky Blue are explicitly not for logo use.

So this is a rebuild against the new rules, from the vector sources in
`Logo Design Files/`, not a substitution. Owner has flagged it as
non-blocking.

## Definition of done

- [ ] 20 pages built, proofed against the page plan
- [ ] Press PDF: CMYK, 0.125 in bleed, crop marks, fonts embedded
- [ ] Reader-spreads PDF for on-screen review
- [ ] Flipbook live on GitHub Pages, embed snippet documented
- [ ] Every figure traceable to a source in this spec
- [ ] No MLS vendor named anywhere in the repo
- [ ] Printed proof reviewed before a production run
