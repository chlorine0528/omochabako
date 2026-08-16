# 週1本を作って公開する手順

毎週日曜の朝6時、Coworkの定期タスクがまっさらなセッションでこれを実行する。
このファイルは新しいセッションが唯一の頼りにする手順書なので、環境の癖まで書いてある。

- リポジトリ: `chlorine0528/omochabako`（Public、ブランチ `main`）
- 公開URL: https://chlorine0528.github.io/omochabako/
- 遊ぶのは2023年11月13日生まれの娘。母親のスマホで遊ぶ

## この環境の制約

クラウドのコンテナで動く。**ここからGitHubへは書き込めない。**
サンドボックスの外向き通信は必ずプロキシを通り、そこを外すことはできない。
`git push` も `api.github.com` もこのリポジトリでは403で止まる。
Chrome拡張は、定期タスクがクラウドで起動する以上そもそも生えてこない。
くろださんのMacに用があるツールを探しても無駄なので、探さないこと。

読む方だけは通る。**`raw.githubusercontent.com` は読める。**
現状の把握はすべてここから `curl` する。`github.io` は遮断されているので使わない。

**書き込みは Zapier の Code by Zapier からGitHub APIを叩く。** 手順は下の「公開する」にある。

## 手順

### 1. 現状を読む

```
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/games.json
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/DESIGN.md
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/build.py
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/tools/verify_game.js
```

`DESIGN.md` は必ず読む。2歳児向けの前提条件がすべてそこにある。
既存のゲームも1本は読む。「もどる」ボタンを流用するため。

```
curl -sS --create-dirs -o games/shabondama/index.html \
  https://raw.githubusercontent.com/chlorine0528/omochabako/main/games/shabondama/index.html
```

### 2. 今週の1本を決める

**まず `NEXT.md` を読む。** くろださんからの指定が入っていることがある。

```
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/NEXT.md
```

見出しつきの項目が並んでいたら、**いちばん上の1件をそのとおりに作る。**
書かれた条件は勝手に変えない。よかれと思って足したり引いたりしない。
作り終えたら、その1件を `NEXT.md` から消して、`games.json` などと一緒に公開する
（残しておくと翌週も同じものを作ってしまう）。

`NEXT.md` に項目がなければ、自分で選ぶ。`games.json` の既存タイトルと重複しない題材で、
同じ操作の焼き直しも避ける。これまでに使った操作は `games.json` を見て確かめる。
指でなぞる、傾ける、順番に押す、といった別の動作か、別の題材で組む。

### 3. 作る

`games/<slug>/index.html` を1ファイルで完結させる。`DESIGN.md` の10項目を満たすこと。
加えて、このリポジトリでは次の2つを守る。

- **どこを押しても音が鳴る。** 無反応の場所を作らないという `DESIGN.md` の3番を、
  検証スクリプトは「音が鳴ったか」で数えている。押して何も鳴らない場所があると落ちる
- **「もどる」ボタンは `games/shabondama/index.html` のものをそのまま流用する。**
  700msの長押しで発火する、あのHTMLとCSSとJSの3点セットを丸ごと持ってくる
- **ひと工夫を1つ入れる。** `DESIGN.md` の「ひと工夫を必ず1つ入れる」から型を1つ選び、
  `games.json` の `twist` にその型名を書く。過去に使った型は `games.json` を見て避ける。
  基本の手触りだけで終わらせない。動詞を1つ実装した時点では、まだ半分

### 4. 実測する

目分量で「対応済み」と書かない。

```
node tools/verify_game.js <slug>
node tools/verify_touch.js <slug>
```

`verify_game.js` は縦(390x844)と横(844x390)の両方で20項目を数える。
`verify_touch.js` は、同じ場所を接触面1pxと90pxで1回ずつ押して、反応が変わらないことを見る。
ヘッドレスのブラウザは指の接触面をいつも1pxで返すので、`PointerEvent` の `width` や
`height` で操作を分岐させると、20項目を通ったまま実機だけで壊れる。
どちらも、1つでも落ちたら直してから次へ進む。
Playwrightはコンテナに入っている。`require('playwright')` が見つからないときだけ
`npm install -g playwright` を回す。

`/tmp/omochabako-verify/` にスクリーンショットが出る。撮って終わりにせず、
Readツールで実際に開いて見る。草の見えかたや花の重なりなど、数字に出ないところはここで直す。

### 5. 一覧を更新する

`games.json` の `games` 配列の**先頭**に1件足す。`slug` `title` `date` `bg` `icon`。
`date` はJSTの当日（`TZ=Asia/Tokyo date +%F`）。
`icon` は viewBox="0 0 120 120" のインラインSVG。カードの絵になるので、
ゲームの中身が伝わる図にする。小さく表示されるので、細かい線ではなく面で描く。

```
TZ=Asia/Tokyo python3 build.py
```

`index.html` はこれで作り直す。手で書き換えない。
`build.py` は `manifest.webmanifest` も書き出すが、中身は変わらないはずなので公開しなくてよい。

### 6. 公開する

変更があるのは3ファイル（新しいゲーム、`games.json`、`index.html`）。
`NEXT.md` の指定を消化したときは、消したあとの `NEXT.md` を足して4ファイルにする。

まずコンテナ側で1つの文字列にまとめる。

```
python3 tools/pack_payload.py /tmp/payload.txt games/<slug>/index.html games.json index.html
```

`NEXT.md` を消化したなら、引数の最後に `NEXT.md` も足す。
文字数と照合用のshaが出るので、shaは控えておく。

次に、その文字列を切り分ける。**1つが2000字を超えないように切ること。**
長い1本のまま渡すと、途中の文字が化けて必ずsha照合で落ちる。
（1万字を超えると、ほぼ毎回落ちる。8000字でも落ちたことがある。）

```
python3 tools/split_payload.py /tmp/payload.txt 8
```

`/tmp/q1.txt` から `/tmp/q8.txt` が出る。**1つずつ `cat` して読む。**
2つ以上をまとめて出すと、切れ目の文字を取りこぼす。

次に ToolSearch で Zapier のツールを読み込む。

```
select:mcp__Zapier__execute_zapier_write_action
```

`execute_zapier_write_action` を次のように呼ぶ。

- `selected_api`: `CodeCLIAPI`
- `action`: `01929fad-d3dd-62c2-52ed-7868d5fcc691`（Run Javascript）
- `params.input`: `t`（トークン）、`p1` から `p8`（切り分けた文字列）、
  `sha`（`pack_payload.py` が出したsha）、`msg`（`add: <title>`）
- `params.code`: 下のJS

```js
const zlib = require('zlib');
const crypto = require('crypto');
const h = s => crypto.createHash('sha256').update(s).digest('hex');
const T = inputData.t, R = '/repos/chlorine0528/omochabako';
const parts = [inputData.p1, inputData.p2, inputData.p3, inputData.p4,
               inputData.p5, inputData.p6, inputData.p7, inputData.p8].filter(Boolean);
const u = parts.join('');
const sha = h(u).slice(0,16);
if (sha !== inputData.sha) return { error: 'payload sha mismatch', got: sha, want: inputData.sha, len: u.length, parts: parts.map(p => h(p).slice(0,8) + ':' + p.length) };
const files = JSON.parse(zlib.gunzipSync(Buffer.from(u, 'base64url')).toString('utf8'));
const api = async (p, opt = {}) => {
  const r = await fetch('https://api.github.com' + p, Object.assign({}, opt, {
    headers: Object.assign({
      'Authorization': 'Bearer ' + T,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'omochabako-bot'
    }, opt.headers || {})
  }));
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = t; }
  if (r.status >= 300) throw new Error(p + ' -> ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
};
const head = (await api(R + '/git/refs/heads/main')).object.sha;
const baseTree = (await api(R + '/git/commits/' + head)).tree.sha;
const tree = [];
for (const path of Object.keys(files)) {
  const b = await api(R + '/git/blobs', { method: 'POST', body: JSON.stringify({ content: files[path], encoding: 'utf-8' }) });
  tree.push({ path: path, mode: '100644', type: 'blob', sha: b.sha });
}
const tr = await api(R + '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree: tree }) });
const cm = await api(R + '/git/commits', { method: 'POST', body: JSON.stringify({
  message: inputData.msg, tree: tr.sha, parents: [head],
  author: { name: 'Claude', email: 'noreply@anthropic.com', date: new Date().toISOString() }
}) });
const rf = await api(R + '/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: cm.sha }) });
return { ok: true, before: head.slice(0,7), after: rf.object.sha.slice(0,7) };
```

`payload sha mismatch` が返ったら、どこかの文字列が途中で化けている。
このとき `parts` に、届いた側のchunkごとのshaと文字数が並んで返る。
`split_payload.py` が出したshaと突き合わせれば、化けたchunkがすぐ分かるので、
そこだけ `cat` して送り直す。落ちるのは照合の時点なので、リポジトリには何も入っていない。

よくある落ち方は2つ。1つは、chunkの文字数は合っているのに中身が違う場合で、
これは1文字が別の文字に置き換わっている。もう1つは、隣り合うchunkで
文字数が2字ずれている場合で、これは切れ目の文字を取りこぼしている。
どちらも `cat` し直せば直る。

ファイルが多いときは、1回の呼び出しに詰め込まず、2回に分けて公開してよい。
`build.py` を回したあとなら、ゲーム本体だけを先に送り、`games.json` と
`index.html` をあとから送っても、途中の状態が数分見えるだけで問題は起きない。

### 7. 公開を確かめる

1分ほど待ってから `raw.githubusercontent.com` を叩き、`main` に載ったことを確かめる。

```
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://raw.githubusercontent.com/chlorine0528/omochabako/main/games/<slug>/index.html
curl -sS https://raw.githubusercontent.com/chlorine0528/omochabako/main/games.json
```

`github.io` はここから見えないので、Pagesのビルドまでは確認できない。
`main` に載っていれば数分で公開される。

### 8. 知らせる

PushNotification で、新作の名前と、奥様へそのまま貼れるLINEの文面を送る。
自動送信はしない。文面は3〜4行でよい。ゲーム単体のURLではなく、おもちゃばこのURLを渡す。

```
あたらしいおもちゃ「○○」ができました。
（遊び方を1行）
https://chlorine0528.github.io/omochabako/
```

## うまくいかないとき

- GitHubが401を返したらトークンが失効している（有効期限は2026年11月6日）。
  その旨を PushNotification で知らせて止まる。勝手に新しいトークンを発行しない
- 20項目のどれかが落ちたまま公開しない。直せないときは、そのゲームを捨てて
  別の題材で作り直したほうが早い
- どうしても完成しないときは、何がだめだったかを PushNotification で知らせて終わる。
  壊れたものを公開しない
- 途中で止まったときも、必ず PushNotification で知らせる。黙って終わらない
