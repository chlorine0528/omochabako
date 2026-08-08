#!/usr/bin/env python3
"""ホーム画面用アイコンを書き出す。games.json とは独立で、通常は一度だけ回せばよい。"""

import math
import pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent
S = 1024
BG = (245, 239, 225)


def star(cx, cy, R, r, n=5, rot=-math.pi / 2):
    pts = []
    for i in range(n * 2):
        rad = R if i % 2 == 0 else r
        a = rot + i * math.pi / n
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts


img = Image.new("RGB", (S, S), BG)
d = ImageDraw.Draw(img)

u = S / 100.0
# まる
d.ellipse([28 * u, 26 * u, 50 * u, 48 * u], fill=(238, 108, 108))
# ほし
d.polygon(star(63 * u, 37 * u, 13.5 * u, 5.6 * u), fill=(242, 201, 76))
# しかく
d.rounded_rectangle([27 * u, 55 * u, 49 * u, 77 * u], radius=6 * u, fill=(79, 184, 150))
# さんかく
d.polygon([(63 * u, 54 * u), (76 * u, 77 * u), (50 * u, 77 * u)], fill=(106, 159, 224))

for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
    img.resize((size, size), Image.LANCZOS).save(ROOT / name, optimize=True)
    print("書き出し:", name)
