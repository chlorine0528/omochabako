#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""既存ファイルとの差分だけを1つの文字列にまとめる。

ファイル全体を送ると2万字近くになり、1回のツール呼び出しに収まらないことがある。
そういうときは、いま公開されている中身との差分だけを送る。

  python3 tools/pack_delta.py /tmp/delta.txt games/hanabi/index.html /tmp/pub.html

第2引数がリポジトリ内のパス、第3引数がいま公開されている中身のローカルコピー。
出す情報は、行番号で指定した置き換えの列と、適用前後のsha256。
Zapier側は、適用前のshaが合わないときと、適用後のshaが合わないときは何もしない。
"""
import sys, os, json, gzip, base64, hashlib, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = 'github' + '_pat_'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    out, path, basefile = sys.argv[1], sys.argv[2], sys.argv[3]
    os.chdir(ROOT)

    new = open(path, 'r', encoding='utf-8').read()
    base = open(basefile, 'r', encoding='utf-8').read()
    if MARK in new or MARK in base:
        raise SystemExit('トークンらしき文字列が混ざっている。中止する')

    bl = base.split('\n')
    nl = new.split('\n')
    ops = []
    sm = difflib.SequenceMatcher(None, bl, nl, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        ops.append([i1, i2, nl[j1:j2]])

    # 逆順に当てれば行番号がずれない。ローカルで先に確かめる
    chk = list(bl)
    for i1, i2, rep in reversed(ops):
        chk[i1:i2] = rep
    if '\n'.join(chk) != new:
        raise SystemExit('差分の当て直しが元に戻らない。中止する')

    doc = {
        'path': path,
        'base': sha(base.encode('utf-8')),
        'out': sha(new.encode('utf-8')),
        'ops': ops,
    }
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    packed = base64.urlsafe_b64encode(gzip.compress(raw, 9)).decode('ascii').rstrip('=')
    open(out, 'w').write(packed)
    print(len(packed), sha(packed.encode('ascii'))[:16])


main()
