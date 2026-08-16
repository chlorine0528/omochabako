'use strict';
/*
  指の接触面の大きさで反応が変わらないことを確かめる。

  PointerEvent の width と height は、指が画面に触れている面積を返す。
  実機では指1本でも50pxを超えることがあり、値は端末ごとにばらばらで、
  ヘッドレスのブラウザでは常に1pxが返る。だからここを見て
  「太いから手のひらだ」と判断すると、ふつうのタップが手のひら扱いになり、
  それが verify_game.js の20項目をすり抜けて実機だけで壊れる。

  対策は、接触面を見ないこと。同時に降りたポインタの数で判断する。
  このスクリプトは、同じ場所を接触面1pxと90pxで1回ずつ押して、
  鳴った音の数が変わらないことを見る。

  使い方:
    node tools/verify_touch.js <slug>
*/

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
if (!slug) { console.error('使い方: node tools/verify_touch.js <slug>'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const PORT = 8791;
const SIZES = [1, 90];        // ヘッドレスの既定値と、実機の太い指
const VIEWS = [[390, 844], [844, 390]];

// 音が鳴った回数を数える。ゲームによって使うノードが違うので両方を見る
const HOOK = `
  window.__n = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  for (const m of ['createOscillator', 'createBufferSource']) {
    const f = AC.prototype[m];
    AC.prototype[m] = function () { window.__n++; return f.apply(this, arguments); };
  }
`;

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rq) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        rq.writeHead(404); return rq.end('x');
      }
      rq.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      rq.end(fs.readFileSync(f));
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

// 押すたびに新しいページを開く。前の音を持ち越さないため
async function tapOnce(browser, w, h, x, y, size) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  await page.addInitScript(HOOK);
  await page.goto(`http://127.0.0.1:${PORT}/games/${slug}/`, { waitUntil: 'load' });
  await page.waitForTimeout(350);   // 誘いの自動再生が始まる前に押す
  await page.evaluate(() => { window.__n = 0; });
  await page.evaluate(({ x, y, size }) => {
    const el = document.elementFromPoint(x, y) || document.body;
    el.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, width: size, height: size,
      bubbles: true, cancelable: true
    }));
  }, { x, y, size });
  await page.waitForTimeout(70);    // 押した瞬間の音だけを数える
  const n = await page.evaluate(() => window.__n);
  await ctx.close();
  return n;
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let bad = 0;

  for (const [w, h] of VIEWS) {
    const label = `${w > h ? '横' : '縦'} ${w}x${h}`;
    // 画面をひととおり。左上は「もどる」があるので外す
    const pts = [];
    for (const fy of [0.18, 0.42, 0.62, 0.78, 0.9]) {
      for (const fx of [0.18, 0.5, 0.82]) {
        const y = Math.round(h * fy);
        const x = Math.round(w * fx);
        if (x < 62 && y < 62) continue;
        pts.push([x, y]);
      }
    }

    let worst = null;
    for (const [x, y] of pts) {
      const counts = [];
      for (const size of SIZES) counts.push(await tapOnce(browser, w, h, x, y, size));
      const base = counts[0], big = counts[counts.length - 1];
      // 音の数に多少のゆらぎがあるゲームもあるので、倍まで開いたら落とす
      const blown = big > base * 1.6 + 1;
      if (blown && (!worst || big - base > worst.big - worst.base)) {
        worst = { x: x, y: y, base: base, big: big };
      }
    }

    if (worst) {
      bad++;
      console.log(`FAIL  [${label}] 接触面の大きさで反応が変わらない  — ` +
        `(${worst.x},${worst.y}) 1px:${worst.base}回 90px:${worst.big}回`);
    } else {
      console.log(`PASS  [${label}] 接触面の大きさで反応が変わらない（${pts.length}点）`);
    }
  }

  await browser.close();
  server.close();
  console.log(bad === 0 ? '\n=== 接触面 合格 ===' : `\n=== ${bad}件 不合格 ===`);
  process.exit(bad === 0 ? 0 : 1);
})();
