"""まとめた文字列を、Zapierに渡せる長さに切り分ける。

  python3 tools/split_payload.py /tmp/payload.txt 8

/tmp/q1.txt から /tmp/qN.txt に書き出し、それぞれの文字数とsha256の先頭8桁を表示する。
1つが2000字を超えないように N を決める。長い1本のまま渡すと途中の文字が化ける。
"""

import pathlib, hashlib, sys

u = pathlib.Path(sys.argv[1]).read_text()
n = int(sys.argv[2])
step = -(-len(u) // n)
for i in range(n):
    part = u[i * step:(i + 1) * step]
    pathlib.Path('/tmp/q%d.txt' % (i + 1)).write_text(part)
    print(i + 1, len(part), hashlib.sha256(part.encode()).hexdigest()[:8])
