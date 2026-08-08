#!/usr/bin/env python3
"""ホーム画面用アイコンを papa.jpg から書き出す。

papa.jpg を差し替えたときだけ回せばよい。
iOSは apple-touch-icon に自前の角丸マスクをかけるので、透過なしの正方形をそのまま渡す。
"""

import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "papa.jpg"

src = Image.open(SRC).convert("RGB")
w, h = src.size
if w != h:  # 念のため中央で正方形に切る
    s = min(w, h)
    src = src.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))

for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
    src.resize((size, size), Image.LANCZOS).save(ROOT / name, optimize=True)
    print("書き出し:", name)
