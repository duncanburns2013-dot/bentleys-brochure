#!/usr/bin/env python3
"""Make the rendered PDF press-ready: declare the trim.

Chrome writes only a MediaBox. That is the single most important omission for
a commercial print job — the page is 8.75 x 11.25in because it carries a
0.125in bleed, and with no TrimBox the printer has no machine-readable
instruction saying where to cut. A RIP that trusts the MediaBox would trim at
8.75 x 11.25 and leave the bleed on the finished page.

This sets, on every page:
    BleedBox = the full 8.75 x 11.25in sheet
    TrimBox  = 8.5 x 11in, inset by one bleed on all four sides
    ArtBox   = the same as TrimBox

Run after scripts/build-pdf.mjs; `npm run pdf` chains both.

WHAT THIS DOES NOT DO: convert to CMYK, or make the file PDF/X-1a. Chrome
emits RGB and neither Ghostscript nor Acrobat is installed here. See the
README — a commercial shop's own conversion is usually better than a naive
one anyway, but they have to be told the file is RGB.
"""

from pathlib import Path
import sys

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT.parent / "bentleys-listing-presentation.pdf"

BLEED_PT = 0.125 * 72
TRIM_W_PT, TRIM_H_PT = 8.5 * 72, 11 * 72


def main() -> None:
    if not PDF.exists():
        sys.exit(f"not found: {PDF}\nRun `npm run pdf` first.")

    doc = pymupdf.open(PDF)
    for page in doc:
        media = page.mediabox
        trim = pymupdf.Rect(
            media.x0 + BLEED_PT,
            media.y0 + BLEED_PT,
            media.x1 - BLEED_PT,
            media.y1 - BLEED_PT,
        )
        page.set_bleedbox(media)
        page.set_trimbox(trim)
        page.set_artbox(trim)

    doc.saveIncr()

    check = pymupdf.open(PDF)[0]
    w, h = check.trimbox.width, check.trimbox.height
    ok = abs(w - TRIM_W_PT) < 1 and abs(h - TRIM_H_PT) < 1
    print(f"trim  {w / 72:.3f} x {h / 72:.3f} in   {'OK' if ok else 'WRONG'}")
    print(f"bleed {check.bleedbox.width / 72:.3f} x {check.bleedbox.height / 72:.3f} in")
    print(f"{doc.page_count} pages · {PDF}")
    if not ok:
        sys.exit("trim box is not 8.5 x 11in")


if __name__ == "__main__":
    main()
