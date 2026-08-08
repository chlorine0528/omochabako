# おもちゃばこ

娘（2023年11月13日生まれ）に向けて、毎週1本ずつゲームを足していくための置き場。
妻のスマホから固定URLを1つ開けば、過去の分もすべて並んでいる。

- 公開URL: GitHub Pages のルート（後述）
- ゲーム本体: `games/<slug>/index.html`。1本が1ファイルで完結し、外部リクエストを出さない
- 一覧の正: `games.json`
- 一覧の生成: `python3 build.py`（`index.html` と `manifest.webmanifest` を上書き）

作るときのルールは `DESIGN.md` にまとめてある。毎回そこから始める。

## 週1本を足す手順

```bash
# 1. ゲームを作る
mkdir -p games/<slug> && $EDITOR games/<slug>/index.html

# 2. games.json の games 配列の先頭に1件足す
#    { "slug", "title", "date", "bg", "icon" }

# 3. 一覧を作り直す
python3 build.py

# 4. 公開する
git add -A && git commit -m "add: <title>" && git push
```

push から1分ほどで公開URLに反映される。

## 検証

`verify.py`（このリポジトリの外、セッション側）で以下を実測している。
新しいゲームを足したときも同じ項目を通す。

- コンソールエラーが出ない
- 縦・横どちらでもスクロールが発生しない
- 外部リクエストが1本も出ない
- タップ領域が68px以上ある
- 「もどる」が250msでは発火せず、900msで発火する

## ファイル

| ファイル | 役割 |
|---|---|
| `games.json` | ゲーム一覧の正。ここだけ手で編集する |
| `build.py` | `index.html` と `manifest.webmanifest` を生成する |
| `make_icons.py` | ホーム画面用アイコンを書き出す。通常は再実行不要 |
| `DESIGN.md` | 2歳児向けの設計ルール |
| `index.html` | 生成物。手で編集しない |
