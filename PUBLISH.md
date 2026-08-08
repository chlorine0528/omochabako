# 週1本を作って公開する手順

毎週日曜の朝6時、定期タスクがまっさらなセッションでこれを実行する。
このファイルは新しいセッションが唯一の頼りにする手順書なので、環境の癖まで書いてある。

- リポジトリ: `chlorine0528/omochabako`（Public、ブランチ `main`）
- 公開URL: https://chlorine0528.github.io/omochabako/
- 遊ぶのは2023年11月13日生まれの娘。母親のスマホで遊ぶ

## この環境の制約

**クラウドコンテナからGitHubへはpushできない。** gitプロキシがこのリポジトリを許可していない。
`api.github.com` への直接アクセスも `github.io` への通信も遮断されている。
**ファイルの読み書きはすべてChrome拡張経由でGitHub REST APIを叩く。** 迂回路はない。

**javascript_tool に長い文字列を渡すと `+` と `/` が化ける。** 素のbase64は壊れる。
バイナリを運ぶときは必ず **base64url**（`-` と `_`）を使い、4000文字前後に分割して、
1チャンクごとにSHA-256の先頭16桁を突き合わせてから結合する。

## 手順

### 1. ツールを読み込む

ToolSearch を1回だけ呼び、まとめて読み込む。

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer
```

Chromeに届かない場合はここで判断する。ゲームの制作と検証だけ済ませてファイルを渡し、
公開が残っていることを明示して終わる。中途半端にリトライしない。

### 2. 作業用タブを開いて認証を通す

`tabs_create_mcp` で専用タブを作り、公開URLへ移動する。`github.com` のページからだと
CSPで `github.io` への `fetch` が弾かれるので、**必ず `chlorine0528.github.io` 側にいること**。

```js
window.__T = '（定期タスクの本文で渡されたトークン）';
window.__api = async (p, o = {}) => {
  const r = await fetch('https://api.github.com' + p, {...o, headers: {
    'Authorization': 'Bearer ' + window.__T,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', ...(o.headers || {})}});
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch(e) { j = t }
  return {status: r.status, body: j};
};
(await window.__api('/repos/chlorine0528/omochabako')).status   // 200 を確認
```

401 が返ったらトークンが失効している（有効期限は2026年11月6日）。
その旨を報告して止める。勝手に新しいトークンを発行しない。

### 3. 現状を読む

同じタブから公開中のファイルを取得し、結果をそのままワークスペースに書く。

```js
const base = 'https://chlorine0528.github.io/omochabako/';
const g = await (await fetch(base + 'games.json', {cache:'no-store'})).text();
const b = await (await fetch(base + 'build.py',   {cache:'no-store'})).text();
const d = await (await fetch(base + 'DESIGN.md',  {cache:'no-store'})).text();
JSON.stringify({g, b, d})
```

`DESIGN.md` は必ず読む。2歳児向けの前提条件がすべてそこにある。

### 4. 今週の1本を作る

`games.json` の既存タイトルと重複しない題材を選ぶ。同じ操作の焼き直しも避ける
（タップして割る、パッドを叩く、はすでにある）。指でなぞる、傾ける、順番に押す、
といった別の動作か、別の題材で組む。

`games/<slug>/index.html` を1ファイルで完結させる。`DESIGN.md` の10項目を満たすこと。
`games/shabondama/index.html` の「もどる」ボタン（700ms長押し）はそのまま流用する。

### 5. 実測する

目分量で「対応済み」と書かない。Playwrightで縦(390x844)と横(844x390)の両方を開き、
以下をスクリプトで数える。1つでも落ちたら直してから次へ進む。

- コンソールエラーが出ない
- `scrollHeight - innerHeight` と `scrollWidth - innerWidth` がどちらも0以下
- `performance.getEntriesByType('resource')` に外部ホストが1件もない
- タップ対象の実測サイズが68px以上
- 「もどる」が250msの押下では発火せず、900msの長押しで発火する

スクリーンショットも撮って実際に見る。

### 6. 一覧を更新する

`games.json` の `games` 配列の**先頭**に1件足す。`slug` `title` `date` `bg` `icon`。
`icon` は viewBox="0 0 120 120" のインラインSVG。カードの絵になるので、
ゲームの中身が伝わる図にする。

`python3 build.py` を回して `index.html` を作り直す。手で書き換えない。

### 7. 公開する

変更があるのは3ファイルだけ（新しいゲーム、`games.json`、`index.html`）。
コンテナ側でまとめて圧縮する。

```python
import json, gzip, base64, hashlib, pathlib
paths = ['games/<slug>/index.html', 'games.json', 'index.html']
data = {p: pathlib.Path(p).read_text(encoding='utf-8') for p in paths}
gz = gzip.compress(json.dumps(data, ensure_ascii=False).encode(), 9)
u = base64.urlsafe_b64encode(gz).decode().rstrip('=')
n = 4; size = (len(u) + n - 1) // n
for i in range(n):
    c = u[i*size:(i+1)*size]
    print(f'--- {i} len={len(c)} sha={hashlib.sha256(c.encode()).hexdigest()[:16]}')
    print(c)
```

各チャンクを `window.__C[i]` に入れ、SHA-256の先頭16桁が一致することを毎回確認する。
一致しなければそのチャンクだけ送り直す。全部そろったらブラウザ側で復元する。

```js
const u = window.__C[0] + window.__C[1] + window.__C[2] + window.__C[3];
const bin = Uint8Array.from(atob(u.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const rd = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
const parts = []; let n = 0;
while (true) { const {done, value} = await rd.read(); if (done) break; parts.push(value); n += value.length; }
const buf = new Uint8Array(n); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
window.__F = JSON.parse(new TextDecoder().decode(buf));
Object.entries(window.__F).map(([k,v]) => k + ':' + v.length)
```

blob → tree → commit → ref の順に積む。`base_tree` に現在のツリーを渡して差分だけ載せる。

```js
const R = '/repos/chlorine0528/omochabako';
const head = (await window.__api(R + '/git/refs/heads/main')).body.object.sha;
const baseTree = (await window.__api(R + '/git/commits/' + head)).body.tree.sha;
const tree = [];
for (const [path, content] of Object.entries(window.__F)) {
  const r = await window.__api(R + '/git/blobs', {method:'POST',
    body: JSON.stringify({content, encoding: 'utf-8'})});
  tree.push({path, mode: '100644', type: 'blob', sha: r.body.sha});
}
const tr = await window.__api(R + '/git/trees', {method:'POST',
  body: JSON.stringify({base_tree: baseTree, tree})});
const cm = await window.__api(R + '/git/commits', {method:'POST',
  body: JSON.stringify({message: 'add: <title>', tree: tr.body.sha, parents: [head]})});
const rf = await window.__api(R + '/git/refs/heads/main', {method:'PATCH',
  body: JSON.stringify({sha: cm.body.sha})});
JSON.stringify({ref: rf.status, head: rf.body.object.sha.slice(0,7)})
```

### 8. 公開を確認する

1分ほど待ってから公開URLを開き直し、カードが1枚増えていること、
新しいゲームのURLが200を返すことを実際に確認する。ビルド状況は
`/repos/chlorine0528/omochabako/pages/builds/latest` で見られる。

### 9. LINEの文面を出す

自動送信はしない。くろださんがそのまま貼れる短い文面を用意する。
新作の名前、遊び方の一言、おもちゃばこのURL。3〜4行でよい。
ゲーム単体のURLではなく、おもちゃばこのURLを渡す。

## 後片付け（必須）

Chrome拡張（mcp__claude-in-chrome__*）を使った場合、処理の成否にかかわらず
終了前に必ず以下を行う。

1. tabs_context_mcp で自分のタブグループのタブを列挙する
2. このタスクで開いたタブをすべて tabs_close_mcp で閉じる
3. 最後の1枚を閉じるとタブグループも自動で解除される。
   タブとタブグループが残っていないことを確認してから終了する

エラーで中断する場合も、報告の前にこの後片付けを済ませること。
ユーザーが「このタブは開いたままにして」と明示した場合のみ、そのタブを除外する。
