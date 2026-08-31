"""
Crop the nine practitioner portraits out of the Canva team-board screenshot
and write them into assets/team/ under the filenames index.html expects.

Usage
-----
    python tools/crop-faces.py path/to/screenshot.png
    python tools/crop-faces.py path/to/screenshot.png --contact-sheet
    python tools/crop-faces.py path/to/screenshot.png --force

The crop boxes are stored as fractions of the image, taken from the original
738x1568 phone screenshot, so a re-saved copy at any resolution still lines up
as long as it is the same framing (full phone screen, board centred).

--contact-sheet writes _contact-sheet.jpg with the crop boxes drawn on, so you
can eyeball the alignment before committing the files.
--force overwrites portraits that already exist (Ciska's real photo is in
place, so she is skipped by default).
"""

import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(os.path.dirname(HERE), "assets", "team")

# (left, top, right, bottom) as fractions of the full screenshot
COLS = [(0.1125, 0.3388), (0.3862, 0.6125), (0.6558, 0.8875)]
ROWS = [(0.2768, 0.4031), (0.4375, 0.5638), (0.5982, 0.7245)]

# reading order of the board, left to right, top to bottom
NAMES = [
    "ciska-kruger",       "annwin-strohmenger", "nicola-mostert",
    "marone-vivier",      "emcy-louw",          "tania-cameron",
    "kayla-van-zyl",      "annette-pennazza",   "rene-van-schalkwyk",
]

TARGET = (800, 1000)   # 4:5, matching the card aspect


def boxes(w, h):
    for i, name in enumerate(NAMES):
        l, r = COLS[i % 3]
        t, b = ROWS[i // 3]
        yield name, (int(l * w), int(t * h), int(r * w), int(b * h))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if not args:
        sys.exit(__doc__)

    src = args[0]
    if not os.path.isfile(src):
        sys.exit("No such file: " + src)

    im = Image.open(src).convert("RGB")
    w, h = im.size
    print("source: %s  (%dx%d)" % (src, w, h))

    if "--contact-sheet" in flags:
        sheet = im.copy()
        d = ImageDraw.Draw(sheet)
        for name, box in boxes(w, h):
            d.rectangle(box, outline=(255, 0, 0), width=3)
            d.text((box[0] + 6, box[1] + 6), name, fill=(255, 0, 0))
        out = os.path.join(HERE, "_contact-sheet.jpg")
        sheet.save(out, quality=90)
        print("wrote " + out + "  — check the boxes line up, then re-run without the flag")
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    for name, box in boxes(w, h):
        dest = os.path.join(OUT_DIR, name + ".jpg")
        if os.path.exists(dest) and "--force" not in flags:
            print("  skip  %-22s (already exists)" % (name + ".jpg"))
            continue
        crop = im.crop(box)

        # centre-crop to 4:5 before upscaling so faces are not stretched
        cw, ch = crop.size
        want = TARGET[0] / TARGET[1]
        if cw / ch > want:
            new = int(ch * want)
            crop = crop.crop(((cw - new) // 2, 0, (cw - new) // 2 + new, ch))
        else:
            new = int(cw / want)
            crop = crop.crop((0, 0, cw, new))

        crop = crop.resize(TARGET, Image.LANCZOS)
        crop.save(dest, quality=92)
        print("  wrote %-22s from %dx%d source pixels" % (name + ".jpg", box[2] - box[0], box[3] - box[1]))

    print("\nDone. Reload the site — the monograms are replaced by the photos.")


if __name__ == "__main__":
    main()
