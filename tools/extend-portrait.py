"""
Widen a portrait that was framed much tighter than the rest of the set.

    python tools/extend-portrait.py <source.jpg> <out.jpg> --subject 0.40

René V. Schalkwyk's photo is a close head-and-shoulders crop — her face fills
58% of the frame where the other eight average 28%, so her card reads as a
different shot entirely. There is no way to invent the rest of her torso, but
the wall behind her is a plain brick texture, so the frame can be extended
outwards with brick sampled from her own photograph. Same wall, same lighting,
same grain — it composites without a visible seam.

The subject stays flush to the bottom edge, because her original is cropped at
the chest; floating her higher would leave brick where her body should be.

--subject sets the target width of the face band as a fraction of the finished
frame. Lower means more wall and a smaller subject.
"""

import os
import sys

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError:
    sys.exit("Pillow and numpy are required:  pip install Pillow numpy")

ASPECT = 4 / 5
FEATHER = 38          # px of alpha ramp on the pasted photo's free edges
OUT = (800, 1000)


def wall_patch(arr):
    """Largest run of columns that stay close to the background colour over the
    top of the frame — the cleanest brick available to tile from."""
    h, w, _ = arr.shape
    bg = np.concatenate([arr[:, :12], arr[:, -12:]], axis=1).reshape(-1, 3).mean(axis=0)
    d = np.sqrt(((arr - bg) ** 2).sum(axis=2))

    best = None
    for depth in (400, 300, 260, 200):
        clean = d[:depth].max(axis=0) < 90
        runs, start = [], None
        for i, c in enumerate(clean):
            if c and start is None:
                start = i
            if not c and start is not None:
                runs.append((start, i)); start = None
        if start is not None:
            runs.append((start, w))
        for s, e in runs:
            if (e - s) < 60:
                continue
            # skip patches carrying a blown highlight — tiled, one bright spot
            # repeats across the wall and reads as a light leak
            region = arr[:depth, s:e]
            if region.max() > 245:
                continue
            area = (e - s) * depth
            if best is None or area > best[0]:
                best = (area, s, e, depth)
    if best is None:
        sys.exit("No clean wall found to extend from — this photo needs a different approach.")
    _, s, e, depth = best
    return arr[:depth, s:e].astype(np.uint8), bg


def tiled_backdrop(patch, size):
    """Mirror-tile the patch to fill `size`. Mirroring on both axes keeps the
    brick courses continuous instead of repeating with a hard edge."""
    ph, pw, _ = patch.shape
    W, H = size
    cols = -(-W // pw) + 1
    rows = -(-H // ph) + 1
    strip = []
    for r in range(rows):
        row = []
        for c in range(cols):
            t = patch
            if c % 2: t = t[:, ::-1]
            if r % 2: t = t[::-1, :]
            row.append(t)
        strip.append(np.concatenate(row, axis=1))
    big = np.concatenate(strip, axis=0)[:H, :W]
    return Image.fromarray(big)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        sys.exit(__doc__)
    src, dst = args[0], args[1]

    target = 0.40
    if "--subject" in sys.argv:
        target = float(sys.argv[sys.argv.index("--subject") + 1])

    im = Image.open(src).convert("RGB")
    arr = np.asarray(im).astype(float)
    w, h = im.size

    # how wide the subject currently is, measured across the face band
    bg = np.concatenate([arr[:, :12], arr[:, -12:]], axis=1).reshape(-1, 3).mean(axis=0)
    band = arr[int(h * 0.20):int(h * 0.52)]
    dev = np.sqrt(((band - bg) ** 2).sum(axis=2)).mean(axis=0)
    fg = np.where(dev > dev.max() * 0.45)[0]
    subject_px = (fg.max() - fg.min()) if len(fg) else w * 0.5
    print("subject is %d px wide in a %d px frame (%.0f%%)" % (subject_px, w, 100.0 * subject_px / w))

    W = int(round(subject_px / target))
    H = int(round(W / ASPECT))
    if W < w:
        W, H = w, int(round(w / ASPECT))
    pad_x = (W - w) // 2
    pad_y = H - h                      # all headroom goes above; subject stays flush
    print("extending to %dx%d  (+%d each side, +%d above)" % (W, H, pad_x, pad_y))

    patch, _ = wall_patch(np.asarray(im))
    print("wall patch %dx%d" % (patch.shape[1], patch.shape[0]))
    # A touch of blur on the tiled area reads as depth of field and, more
    # usefully, breaks up the repetition the mirroring leaves behind.
    canvas = tiled_backdrop(patch, (W, H)).filter(ImageFilter.GaussianBlur(2.2))

    # feather the photo's free edges so the join into the tiled wall disappears
    mask = Image.new("L", (w, h), 255)
    m = np.asarray(mask).astype(float)
    ramp = np.linspace(0, 255, FEATHER)
    m[:, :FEATHER] = np.minimum(m[:, :FEATHER], ramp[None, :])
    m[:, -FEATHER:] = np.minimum(m[:, -FEATHER:], ramp[::-1][None, :])
    m[:FEATHER, :] = np.minimum(m[:FEATHER, :], ramp[:, None])
    canvas.paste(im, (pad_x, pad_y), Image.fromarray(m.astype(np.uint8)))

    canvas = canvas.resize(OUT, Image.LANCZOS)
    canvas.save(dst, quality=88, optimize=True, progressive=True)
    print("wrote %s  %dx%d  %d KB" % (dst, OUT[0], OUT[1], os.path.getsize(dst) // 1024))


if __name__ == "__main__":
    main()
