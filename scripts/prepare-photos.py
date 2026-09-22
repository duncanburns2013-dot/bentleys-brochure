#!/usr/bin/env python3
"""Crop and resize source photography into the book's asset folder.

Every plate in the book is a fixed physical size, so its image wants a
specific pixel size at 300dpi. Doing that by hand invites drift, so the
manifest below is the single record of what each plate needs and where its
source lives.

    python scripts/prepare-photos.py

`bias` shifts the crop window vertically: 0.5 centres it, lower values keep
more of the top of the frame. Exterior shots usually want a value below 0.5
so the crop favours the house over the driveway.
"""

from pathlib import Path
from PIL import Image

DPI = 300
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "photos"

LISTINGS = Path(r"D:\Bentleys 250\Photos")
PEOPLE = Path(r"D:\Agent Photos")
MISC = Path("D:/")  # a bare "D:" is a drive-relative path, not the root
BRAND = Path(r"D:\Bentley's Brochure")

# out name, source, width_in, height_in, vertical bias
PLATES = [
    # 01 cover — binding edge to the bleed on three sides
    ("cover-entry.jpg", LISTINGS / "2213.jpg", 7.675, 7.30, 0.40),
    # 02 letter — the two owners, matched portraits
    ("owner-robert.jpg", PEOPLE / "Bentley_015.jpg", 2.45, 3.25, 0.34),
    ("owner-alissa.jpg", PEOPLE / "Christie_051.jpg", 2.45, 3.25, 0.30),
    # 03 the attention your property deserves
    ("strategy-hero.jpg", LISTINGS / "5.jpg", 8.75, 4.70, 0.46),
    # 04 your community is our community
    ("community-aerial.jpg", MISC / "Drone Newburyport.jpg", 8.75, 4.30, 0.50),
    # 05 the way we work
    ("process-detail.jpg", LISTINGS / "7H1A7796-HDR.jpg", 3.35, 4.60, 0.40),
    # 06 the right price
    ("pricing-home.jpg", LISTINGS / "7406.jpg", 8.75, 3.85, 0.46),
    # 07 your brokerage
    ("brokerage-town.jpg", LISTINGS / "DJI_0683.jpg", 3.60, 4.60, 0.45),
    # 08 our numbers work for you — full-bleed foot band
    ("numbers-street.jpg", LISTINGS / "DJI_0237.jpg", 8.75, 3.05, 0.45),
    # 10 marketing power
    ("marketing-aerial.jpg", LISTINGS / "1.jpg", 8.75, 3.55, 0.45),
    # 11 the RE/MAX Collection
    ("collection-home.jpg", LISTINGS / "DO3A9433-HDR-2.jpg", 8.75, 5.00, 0.44),
    # 17 trust builds a lasting relationship
    ("trust-home.jpg", LISTINGS / "4699-1.jpg", 8.75, 4.20, 0.44),
]

# Brand artwork is copied at native size — it is a diagram, not a photograph,
# and re-cropping it would cut the country list off.
COPIES = [("global-map.png", BRAND / "Global-Map-1.png")]

# 18 the team. Deliberately unnamed: putting the wrong name under a colleague's
# face in a client brochure is a worse failure than showing none. Robert and
# Alissa are omitted because they already appear full-size on the letter page.
# Full-length environmental portraits are excluded — beside head-and-shoulders
# shots the subject reads as tiny.
TEAM_COLS, TEAM_ROWS, TEAM_CELL = 8, 3, (328, 400)
TEAM_FACES = [
    "studio headshot Brian C 1 022 (1).jpg", "jill.png", "Allyson R.jpg", "Andrew M.jpg",
    "Cindy Scally.jpg", "colleen.jpg", "craig 1 088.jpg", "Daryle2023.jpg",
    "Deanna 3.jpg", "DianeHeadShot.jpg", "drew2.jpg", "EC_final.jpeg",
    "JoeL2.jpg", "Judy C.jpg", "Karol F.jpg", "Katie Cole.jpeg",
    "Kerri Yemma.jpg", "Kim2.jpg", "Kristen D.jpeg", "Lela Wright -47 high resolution.jpg",
    "M Curtin.jpeg", "studio headshot Lauren D 1 014.jpg", "Rick Z.jpg", "Madison 2.jpg",
]


def build_team_mosaic() -> None:
    cw, ch = TEAM_CELL
    sheet = Image.new("RGB", (TEAM_COLS * cw, TEAM_ROWS * ch), "#f7f5ee")
    for i, name in enumerate(TEAM_FACES[: TEAM_COLS * TEAM_ROWS]):
        src = PEOPLE / name
        if not src.exists():
            raise SystemExit(f"missing headshot: {src}")
        im = Image.open(src).convert("RGB")
        scale = max(cw / im.width, ch / im.height)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        left = (im.width - cw) // 2
        # Faces sit high in a portrait, so the crop keeps the top of the frame.
        top = round((im.height - ch) * 0.20)
        sheet.paste(im.crop((left, top, left + cw, top + ch)), ((i % TEAM_COLS) * cw, (i // TEAM_COLS) * ch))
    sheet.save(OUT / "team-mosaic.jpg", quality=88, optimize=True)
    print(f"  {'team-mosaic.jpg':24} {sheet.width}x{sheet.height}px  ({len(TEAM_FACES)} faces)")


def build(name: str, src: Path, w_in: float, h_in: float, bias: float) -> None:
    w, h = round(w_in * DPI), round(h_in * DPI)
    if not src.exists():
        raise SystemExit(f"missing source photo: {src}")

    im = Image.open(src).convert("RGB")
    if im.width < w or im.height < h:
        print(f"  ! {name}: source is {im.width}x{im.height}, below {w}x{h} — upscaling")

    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

    left = (im.width - w) // 2
    top = round((im.height - h) * bias)
    im.crop((left, top, left + w, top + h)).save(OUT / name, quality=88, optimize=True)
    print(f"  {name:24} {w}x{h}px  ({w_in}x{h_in}in)")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"preparing {len(PLATES)} plate(s) at {DPI}dpi")
    for plate in PLATES:
        build(*plate)
    for name, src in COPIES:
        if not src.exists():
            raise SystemExit(f"missing artwork: {src}")
        Image.open(src).convert("RGBA").save(OUT / name)
        print(f"  {name:24} copied at native size")
    build_team_mosaic()


if __name__ == "__main__":
    main()
