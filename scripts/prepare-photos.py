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
LIBRARY = Path(r"D:\Bentleys 250\Photos")

# name, source file, width_in, height_in, vertical bias
PLATES = [
    # Cover plate: binding edge to the bleed on three sides.
    ("cover-entry.jpg", "2213.jpg", 7.675, 7.30, 0.40),
    # "Our numbers work for you" foot band, full bleed width.
    ("numbers-street.jpg", "DJI_0237.jpg", 8.75, 3.05, 0.45),
]


def build(name: str, source: str, w_in: float, h_in: float, bias: float) -> None:
    w, h = round(w_in * DPI), round(h_in * DPI)
    src = LIBRARY / source
    if not src.exists():
        raise SystemExit(f"missing source photo: {src}")

    im = Image.open(src).convert("RGB")
    if im.width < w or im.height < h:
        print(f"  ! {name}: source is {im.width}x{im.height}, below {w}x{h} — will upscale")

    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

    left = (im.width - w) // 2
    top = round((im.height - h) * bias)
    im.crop((left, top, left + w, top + h)).save(OUT / name, quality=90, optimize=True)
    print(f"  {name}  {w}x{h}px  ({w_in}x{h_in}in @ {DPI}dpi)")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"preparing {len(PLATES)} plate(s) at {DPI}dpi")
    for plate in PLATES:
        build(*plate)


if __name__ == "__main__":
    main()
