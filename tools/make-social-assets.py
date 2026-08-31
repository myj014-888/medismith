"""
Generate the Open Graph card and the favicon from assets/logo-board.png.

    python tools/make-social-assets.py

Writes:
    assets/og-image.jpg   1200x630, the logo board letterboxed to OG aspect
    assets/favicon.png    180x180, the gold cross alone

Both are kept small on purpose: the favicon loads on every page view, and
WhatsApp will skip a preview image that is slow to fetch.

The board is narrower than 1200x630 once scaled to fit, so the sides are
filled by replicating the board's own edge columns. Because the board has a
soft vertical gradient, copying whole columns keeps the fill seamless — a
flat colour fill would band.
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets", "logo-board.png")

OG = (1200, 630)
FAVICON = 180   # also the standard apple-touch-icon size

# measured from the board: the full lockup, and the cross on its own
LOCKUP_Y = (0.16, 0.90)
CROSS_BOX = (550, 251, 832, 566)


def og_image(board):
    w, h = board.size
    top, bottom = int(LOCKUP_Y[0] * h), int(LOCKUP_Y[1] * h)
    crop = board.crop((0, top, w, bottom))

    scale = OG[1] / crop.height
    scaled = crop.resize((int(crop.width * scale), OG[1]), Image.LANCZOS)

    canvas = Image.new("RGB", OG)
    x = (OG[0] - scaled.width) // 2
    canvas.paste(scaled, (x, 0))

    # replicate the edge columns outward so the gradient carries across
    if x > 0:
        left = scaled.crop((0, 0, 1, OG[1])).resize((x, OG[1]))
        canvas.paste(left, (0, 0))
        right_w = OG[0] - (x + scaled.width)
        if right_w > 0:
            right = scaled.crop((scaled.width - 1, 0, scaled.width, OG[1]))
            canvas.paste(right.resize((right_w, OG[1])), (x + scaled.width, 0))

    out = os.path.join(ROOT, "assets", "og-image.jpg")
    canvas.save(out, "JPEG", quality=86, optimize=True, progressive=True)
    print("  og-image.jpg   %dx%d  %d KB" % (canvas.size + (os.path.getsize(out) // 1024,)))


def favicon(board):
    l, t, r, b = CROSS_BOX
    # square the crop around the cross, then add a little breathing room
    cx, cy = (l + r) / 2, (t + b) / 2
    half = max(r - l, b - t) / 2 * 1.28
    crop = board.crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half)))
    crop = crop.resize((FAVICON, FAVICON), Image.LANCZOS)

    # 64 colours is plenty for gold-on-cream and takes this from 238KB to
    # under 20KB; the icon renders at 16-32px in practice
    crop = crop.quantize(colors=64, method=Image.MEDIANCUT)
    out = os.path.join(ROOT, "assets", "favicon.png")
    crop.save(out, optimize=True)
    print("  favicon.png    %dx%d  %d KB" % (crop.size + (os.path.getsize(out) // 1024,)))


def main():
    if not os.path.isfile(SRC):
        sys.exit("Missing " + SRC)
    board = Image.open(SRC).convert("RGB")
    print("source: logo-board.png (%dx%d)" % board.size)
    og_image(board)
    favicon(board)


if __name__ == "__main__":
    main()
