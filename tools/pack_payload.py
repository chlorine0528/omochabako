"""公開するファイルを1つの文字列にまとめる。

  python3 tools/pack_payload.py /tmp/payload.txt games/<slug>/index.html games.json index.html

第1引数が書き出し先、それ以降が公開するファイル（リポジトリのルートからの相対パス）。
文字数と、照合用のsha256の先頭16桁を表示する。

base64url を使う。素のbase64だと `+` と `/` が途中で化けて、必ずsha照合で落ちる。
"""

import json, gzip, base64, pathlib, hashlib, sys, os

os.chdir(pathlib.Path(__file__).resolve().parent.parent)
out = sys.argv[1]
paths = sys.argv[2:]
data = {p: pathlib.Path(p).read_text(encoding='utf-8') for p in paths}
# トークンをPublicリポジトリに入れない。目印は継ぎ足して作る（このファイル自身が引っかかるため）
MARK = 'github' + '_pat_'
for p in paths:
    assert MARK not in data[p], p
gz = gzip.compress(json.dumps(data, ensure_ascii=False).encode(), 9)
u = base64.urlsafe_b64encode(gz).decode().rstrip('=')
pathlib.Path(out).write_text(u)
print(len(u), hashlib.sha256(u.encode()).hexdigest()[:16])
