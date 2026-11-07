#!/usr/bin/env python3
"""Generate goblin colour-map variants for the Kenney Mini Characters atlas.

Reads  game/public/assets/kenney/mini-characters/Textures/colormap.png (CC0, Kenney)
Writes game/public/assets/kenney/mini-characters/Textures/colormap-goblin-{0..5}.png

The atlas is 512x512: two rows of eight 64x128 cells at y=256..511 (each cell is a
flat colour on its left 32 px and a shade gradient on its right 32 px), plus one
magenta cell at x=0..63,y=128..255; everything else is black padding. Every one of
the 12 character GLBs maps its face (a 220-vertex block) into one of three cells,
which is how the skin cells below were identified:
    (col 5, row 1) #f1976c medium skin   (col 6, row 1) #b06041 dark skin
    (col 7, row 1) #f2bf99 light skin
Row 1 cols 0-4 are neutrals (dark grey, grey, slate, light slate, white: hair, eyes,
shoes, shirts) and stay untouched. Every other coloured cell is clothing/hair and
gets saturated. The layout never changes, so the GLB UVs keep working.

Usage:
    uv venv .venv && uv pip install --python .venv/bin/python pillow
    .venv/bin/python -I tools/make_goblin_palettes.py [--src PNG] [--out DIR] [--preview PNG]
"""
from __future__ import annotations

import argparse
import colorsys
import os
import sys

from PIL import Image

ATLAS = 512
CELL_W, CELL_H = 64, 128
ROW0_Y = 256  # first row of colour cells

# (col, row) of the three skin cells on the bottom row.
SKIN_CELLS = {(5, 1): "medium", (6, 1): "dark", (7, 1): "light"}
# Relative lightness kept between the three skin tones so the variants still read as
# three slightly different goblins of one species.
SKIN_TONE_MUL = {"light": 1.00, "medium": 0.92, "dark": 0.78}
# Bottom-row neutrals (hair, eyes, shoes, white shirts) that stay as they are.
NEUTRAL_CELLS = {(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)}

# name, description, target hue (deg), skin saturation, skin value, clothing saturation gain
VARIANTS = [
    ("goblin-0", "green (design-doc goblin skin #A6D96A)", 85.0, 0.52, 0.86, 1.25),
    ("goblin-1", "teal", 170.0, 0.55, 0.82, 1.25),
    ("goblin-2", "lilac", 278.0, 0.38, 0.92, 1.25),
    ("goblin-3", "orange", 26.0, 0.80, 0.98, 1.20),
    ("goblin-4", "grey (zombie-kid)", 215.0, 0.10, 0.72, 1.35),
    ("goblin-5", "sick yellow", 62.0, 0.70, 0.90, 1.25),
]


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def cell_of(x: int, y: int) -> tuple[int, int] | None:
    """Return (col, row) for the colour grid, (0, -1) for the magenta cell, None for padding."""
    if y >= ROW0_Y:
        return (x // CELL_W, (y - ROW0_Y) // CELL_H)
    if 128 <= y < 256 and x < CELL_W:
        return (0, -1)
    return None


def flat_colour(px, cell: tuple[int, int]) -> tuple[int, int, int]:
    """The flat (un-shaded) colour of a cell: sampled at its top-left corner."""
    col, row = cell
    y = ROW0_Y + row * CELL_H if row >= 0 else 128
    return px[col * CELL_W, y]


def transform(rgb, cell, flat, hue, skin_sat, skin_val, cloth_gain):
    r, g, b = (c / 255.0 for c in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if cell is None or cell in NEUTRAL_CELLS:
        return rgb
    tone = SKIN_CELLS.get(cell)
    if tone is not None:
        fh, fs, fv = colorsys.rgb_to_hsv(*(c / 255.0 for c in flat))
        # Keep the cell's own shade gradient as offsets from its flat colour.
        ds, dv = s - fs, v - fv
        h2 = hue / 360.0
        s2 = clamp01(skin_sat + ds * 1.5)
        v2 = clamp01(skin_val * SKIN_TONE_MUL[tone] + dv)
    else:
        if s < 0.12:  # white/grey inside a colour cell: leave alone
            return rgb
        h2 = h
        s2 = clamp01(s * cloth_gain + 0.04)
        v2 = v
    r2, g2, b2 = colorsys.hsv_to_rgb(h2, s2, v2)
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255))


def make_variant(src: Image.Image, hue, skin_sat, skin_val, cloth_gain) -> Image.Image:
    w, h = src.size
    if (w, h) != (ATLAS, ATLAS):
        raise SystemExit(f"expected a {ATLAS}x{ATLAS} atlas, got {w}x{h}")
    spx = src.load()
    out = Image.new("RGB", (w, h))
    opx = out.load()
    cache: dict[tuple, tuple[int, int, int]] = {}
    for y in range(h):
        for x in range(w):
            rgb = spx[x, y]
            cell = cell_of(x, y)
            key = (rgb, cell)
            c = cache.get(key)
            if c is None:
                flat = flat_colour(spx, cell) if cell is not None else rgb
                c = transform(rgb, cell, flat, hue, skin_sat, skin_val, cloth_gain)
                cache[key] = c
            opx[x, y] = c
    return out


def to_indexed(im: Image.Image) -> Image.Image:
    """Store as an 8-bit palette PNG when the image has <= 256 colours (it always should)."""
    colours = im.getcolors(256)
    if colours is None:
        return im
    pal = Image.new("P", (1, 1))
    flat = []
    for _, rgb in colours:
        flat.extend(rgb)
    flat.extend([0] * (768 - len(flat)))
    pal.putpalette(flat)
    return im.quantize(palette=pal, dither=Image.Dither.NONE)


def main(argv: list[str]) -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    default_dir = os.path.join(repo, "game", "public", "assets", "kenney", "mini-characters", "Textures")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=os.path.join(default_dir, "colormap.png"))
    ap.add_argument("--out", default=default_dir)
    ap.add_argument("--preview", default=None, help="optional contact-sheet PNG (source + 6 variants, 2x)")
    args = ap.parse_args(argv)

    src = Image.open(args.src).convert("RGB")
    os.makedirs(args.out, exist_ok=True)
    written = []
    sheet = [src]
    for name, desc, hue, skin_sat, skin_val, cloth_gain in VARIANTS:
        im = make_variant(src, hue, skin_sat, skin_val, cloth_gain)
        path = os.path.join(args.out, f"colormap-{name}.png")
        to_indexed(im).save(path, optimize=True)
        written.append(path)
        sheet.append(im)
        print(f"{os.path.relpath(path, repo)}  {desc}  ({os.path.getsize(path)} bytes)")
    if args.preview:
        # Crop to the coloured bottom half of each atlas so the sheet is readable.
        tiles = [im.crop((0, 128, ATLAS, ATLAS)) for im in sheet]
        tw, th = tiles[0].size
        cols = 4
        rows = (len(tiles) + cols - 1) // cols
        out = Image.new("RGB", (cols * (tw + 8), rows * (th + 8)), (24, 24, 28))
        for i, t in enumerate(tiles):
            out.paste(t, ((i % cols) * (tw + 8), (i // cols) * (th + 8)))
        out.save(args.preview)
        print("preview:", args.preview)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
