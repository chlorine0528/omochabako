#!/usr/bin/env python3
"""games.json から index.html（おもちゃばこ）を再生成する。

使い方:
    python3 build.py

games.json が正。ゲームを足したら games.json の games 配列の先頭に1件加えて、
このスクリプトを回す。index.html は毎回まるごと上書きされる。
"""

import json
import pathlib
import datetime

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / "games.json").read_text(encoding="utf-8"))

WD = ["月", "火", "水", "木", "金", "土", "日"]


def jp_date(iso: str) -> str:
    d = datetime.date.fromisoformat(iso)
    return f"{d.year}年{d.month}月{d.day}日（{WD[d.weekday()]}）"


def card(g: dict, newest: bool) -> str:
    badge = '<span class="badge">あたらしい</span>' if newest else ""
    return f"""      <a class="card" href="games/{g['slug']}/">
        <span class="tile" style="background:{g['bg']}">{g['icon']}{badge}</span>
        <span class="name">{g['title']}</span>
        <time class="when" datetime="{g['date']}">{jp_date(g['date'])}</time>
      </a>"""


games = DATA["games"]
cards = "\n".join(card(g, i == 0) for i, g in enumerate(games))
built = datetime.date.today().isoformat()

HTML = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{DATA['title']}</title>
<meta name="theme-color" content="#fbf7ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1b1e" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{DATA['title']}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="robots" content="noindex,nofollow">
<style>
  :root{{
    color-scheme: light dark;
    --bg:#fbf7ef; --panel:#fffdf8; --line:#e6ddcd;
    --ink:#33312c; --sub:#7c766a; --accent:#c96a4e;
  }}
  @media (prefers-color-scheme: dark){{
    :root{{
      --bg:#1a1b1e; --panel:#232428; --line:#34363b;
      --ink:#eae7e0; --sub:#9d9a93; --accent:#e8956f;
    }}
  }}
  *{{ margin:0; padding:0; box-sizing:border-box; }}
  html{{ -webkit-text-size-adjust:100%; }}
  body{{
    min-height:100dvh; background:var(--bg); color:var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI",
      "Hiragino Kaku Gothic ProN", "Hiragino Sans",
      "BIZ UDPGothic", "Yu Gothic Medium", "Yu Gothic", YuGothic,
      Meiryo, "Noto Sans JP", sans-serif;
    font-size:15px; line-height:1.85; letter-spacing:.03em;
    line-break:strict;
    -webkit-tap-highlight-color:transparent;
    padding:
      max(20px, env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right))
      max(28px, env(safe-area-inset-bottom))
      max(16px, env(safe-area-inset-left));
  }}
  .wrap{{ max-width:640px; margin:0 auto; }}

  header{{ padding:6px 4px 22px; }}
  h1{{
    font-size:27px; font-weight:700; line-height:1.35; letter-spacing:.04em;
    font-feature-settings:"palt" 1;
  }}
  .lede{{ margin-top:6px; color:var(--sub); font-size:13.5px; line-height:1.8; }}

  .grid{{
    display:grid; gap:14px;
    grid-template-columns:repeat(2,minmax(0,1fr));
  }}
  @media (min-width:560px){{ .grid{{ grid-template-columns:repeat(3,minmax(0,1fr)); }} }}

  .card{{
    display:flex; flex-direction:column; gap:8px;
    text-decoration:none; color:inherit;
    transition:transform .14s ease-out;
  }}
  .card:active{{ transform:scale(.972); }}
  .tile{{
    position:relative; display:grid; place-items:center;
    aspect-ratio:1/1; border-radius:20px;
    border:1px solid var(--line); overflow:hidden;
  }}
  .tile svg{{ width:74%; height:74%; display:block; }}
  .badge{{
    position:absolute; top:9px; right:9px;
    background:var(--accent); color:#fffdf8;
    font-size:10.5px; font-weight:700; letter-spacing:.06em;
    line-height:1; padding:5px 8px; border-radius:999px;
  }}
  .name{{
    font-size:16px; font-weight:700; line-height:1.5; letter-spacing:.05em;
    padding:0 2px;
  }}
  .when{{
    font-size:11.5px; color:var(--sub); line-height:1.5;
    letter-spacing:.02em; padding:0 2px;
    font-variant-numeric:tabular-nums;
  }}

  .note{{
    margin-top:34px; padding:16px 18px;
    background:var(--panel); border:1px solid var(--line); border-radius:16px;
    font-size:13px; line-height:1.9; color:var(--sub);
  }}
  .note p + p{{ margin-top:9px; }}
  .note b{{ color:var(--ink); font-weight:700; }}
  footer{{
    margin-top:18px; padding:0 4px;
    font-size:11.5px; color:var(--sub); letter-spacing:.02em;
    font-variant-numeric:tabular-nums;
  }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>{DATA['title']}</h1>
    <p class="lede">すきな えを おしてね</p>
  </header>

  <nav class="grid">
{cards}
  </nav>

  <div class="note">
    <p><b>音が出ないとき</b>はスマホのマナーモードを解除してください。画面を1回タップしてから鳴りはじめます。</p>
    <p><b>ホーム画面に追加</b>しておくと、このページからすぐ開けます。共有ボタン（□に↑）から追加できます。</p>
    <p>ゲームの中の<b>左上の小さいボタンを1秒ほど長押し</b>すると、ここに戻ります。短く押しただけでは戻らないので、遊んでいる最中に間違って抜けることはありません。</p>
  </div>

  <footer>ぜんぶで {len(games)}こ ／ 最終更新 {built}</footer>
</div>
</body>
</html>
"""

(ROOT / "index.html").write_text(HTML, encoding="utf-8")

MANIFEST = {
    "name": DATA["title"],
    "short_name": DATA["title"],
    "start_url": ".",
    "scope": ".",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#fbf7ef",
    "theme_color": "#fbf7ef",
    "lang": "ja",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    ],
}
(ROOT / "manifest.webmanifest").write_text(
    json.dumps(MANIFEST, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

print(f"index.html を書き出しました（ゲーム {len(games)}件）")
