#!/usr/bin/env node
/*
 * おもちゃばこ の1本を実測する。
 *
 *   node tools/verify_game.js <slug>
 *
 * 縦(390x844)と横(844x390)の両方で以下を数える。1つでも落ちたら exit 1。
 * 目分量で「対応済み」と書かないために、毎回これを通してから公開する。
 *
 *   1. コンソールエラーが0件
 *   2. 縦スクロール量が0以下
 *   3. 横スクロール量が0以下
 *   4. 外部ホストへのリクエストが0件
 *   5. canvas がビューポート全面を覆う
 *   6. 68pxの格子で押して無反応の場所が1つもない（外れタップなし）
 *   7. 6本同時タッチでエラーが出ない
 *   8. もどるが250msでは発火しない
 *   9. もどるが900msの長押しで発火する
 *  10. 戻り先がおもちゃばこ
 *
 * スクリーンショットは OMOCHABAKO_SHOTS（既定 /tmp/omochabako-verify）に出す。
 * 撮って終わりにせず、実際に開いて見ること。
 *
 * 6の判定は「押すと音が鳴る」ことを反応の代わりに使っている
 * （createOscillator と createBufferSource の呼び出し回数を数える）。
 * どこを押しても音が鳴ることは PUBLISH.md の作りかたの条件にしてあるので、
 * ここが落ちたらゲーム側を直す。音を出さない種類のものを作ったときだけ、
 * この判定を作り直すこと。
 *
 * 5は canvas を使う場合の判定。DOMで組んだゲームでは canvas がないので飛ばす
 * （はみ出しは2と3が見ている）。
 */
'use strict';

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
if (!slug) {
  console.error('使い方: node tools/verify_game.js <slug>');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const GAME = path.join(ROOT, 'games', slug, 'index.html');
if (!fs.existsSync(GAME)) {
  console.error(`見つかりません: games/${slug}/index.html`);
  process.exit(2);
}

const SHOTS = process.env.OMOCHABAKO_SHOTS || '/tmp/omochabako-verify';
fs.mkdirSync(SHOTS, { recursive: true });

const PORT = Number(process.env.OMOCHABAKO_PORT || 8731);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};

function serve() {
  return new Promise((res, rej) => {
    const s = http.createServer((req, rq) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        rq.writeHead(404); return rq.end('not found');
      }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      rq.end(fs.readFileSync(f));
    });
    s.on('error', rej);
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

// 押して何かが起きたかを、音が鳴ったかで見る。
// 音源は createOscillator と createBufferSource の2種類あるので両方を数える
const HOOK = `
  window.__osc = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    ['createOscillator', 'createBufferSource'].forEach(function (k) {
      const orig = AC.prototype[k];
      if (!orig) return;
      AC.prototype[k] = function () { window.__osc++; return orig.apply(this, arguments); };
    });
  }
`;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const SIZES = [['縦 390x844', 390, 844], ['横 844x390', 844, 390]];

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const base = `http://127.0.0.1:${PORT}`;

  for (const [label, w, h] of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    });
    await ctx.addInitScript(HOOK);
    const page = await ctx.newPage();

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(`${base}/games/${slug}/`, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    check(`[${label}] コンソールエラーが0件`, errors.length === 0, errors.join(' | '));

    const sc = await page.evaluate(() => ({
      dy: document.documentElement.scrollHeight - window.innerHeight,
      dx: document.documentElement.scrollWidth - window.innerWidth,
      by: document.body.scrollHeight - window.innerHeight,
      bx: document.body.scrollWidth - window.innerWidth,
    }));
    check(`[${label}] 縦スクロール量が0以下`, sc.dy <= 0 && sc.by <= 0, JSON.stringify(sc));
    check(`[${label}] 横スクロール量が0以下`, sc.dx <= 0 && sc.bx <= 0, JSON.stringify(sc));

    const ext = await page.evaluate(() =>
      performance.getEntriesByType('resource').map(e => e.name).filter(u => {
        try { return new URL(u).host !== location.host && !u.startsWith('data:'); }
        catch (e) { return true; }
      })
    );
    check(`[${label}] 外部ホストへのリクエストが0件`, ext.length === 0, ext.join(' | '));

    const cb = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height, x: r.x, y: r.y };
    });
    if (cb) {
      check(
        `[${label}] canvasが全面(${w}x${h})`,
        cb.w >= w - 0.5 && cb.h >= h - 0.5 && cb.x <= 0.5 && cb.y <= 0.5,
        JSON.stringify(cb)
      );
    } else {
      console.log(`SKIP  [${label}] canvasが全面 — canvasを使っていないので飛ばす`);
    }

    // もどるボタンの位置。ここだけは押しても何も起きなくてよい（DESIGN 6でわざと小さい）
    const homeBox = await page.evaluate(() => {
      const el = document.getElementById('home');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    });

    const dead = [];
    let taps = 0;
    for (let y = 34; y < h; y += 68) {
      for (let x = 34; x < w; x += 68) {
        if (homeBox && x >= homeBox.x - 6 && x <= homeBox.right + 6 &&
            y >= homeBox.y - 6 && y <= homeBox.bottom + 6) continue;
        const before = await page.evaluate(() => window.__osc);
        await page.mouse.click(x, y);
        await page.waitForTimeout(30);
        const after = await page.evaluate(() => window.__osc);
        taps++;
        if (after <= before) dead.push(`${x},${y}`);
      }
    }
    check(`[${label}] 外れタップなし（${taps}点すべてが反応）`, dead.length === 0,
      dead.length ? '無反応: ' + dead.join(' / ') : '');

    const errBefore = errors.length;
    await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return;
      for (let i = 0; i < 6; i++) {
        const o = { pointerId: 100 + i, clientX: 40 + i * 40, clientY: 200 + i * 20,
                    bubbles: true, cancelable: true, pointerType: 'touch' };
        c.dispatchEvent(new PointerEvent('pointerdown', o));
        c.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, { clientX: o.clientX + 90 })));
        c.dispatchEvent(new PointerEvent('pointerup', o));
      }
    });
    await page.waitForTimeout(400);
    check(`[${label}] 6本同時タッチでエラーが出ない`, errors.length === errBefore,
      errors.slice(errBefore).join(' | '));

    if (!homeBox) {
      check(`[${label}] もどるボタンがある`, false, '#home が見つからない');
    } else {
      const url0 = page.url();
      await page.mouse.move(homeBox.cx, homeBox.cy);
      await page.mouse.down();
      await page.waitForTimeout(250);
      await page.mouse.up();
      await page.waitForTimeout(500);
      check(`[${label}] もどるが250msでは発火しない`, page.url() === url0, page.url());

      await page.mouse.move(homeBox.cx, homeBox.cy);
      await page.mouse.down();
      await page.waitForTimeout(900);
      await page.mouse.up();
      await page.waitForTimeout(700);
      const now = page.url();
      check(`[${label}] もどるが900msの長押しで発火する`, now !== url0, now);
      check(`[${label}] 戻り先がおもちゃばこ`, !now.includes(`/games/${slug}`), now);
    }

    await ctx.close();
  }

  // スクリーンショット。少し遊んだ状態を撮る
  for (const [label, w, h] of SIZES) {
    const name = `${slug}-${w}x${h}.png`;
    const ctx = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/games/${slug}/`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const spots = [[0.2, 0.62], [0.34, 0.72], [0.5, 0.66], [0.66, 0.8], [0.8, 0.7],
                   [0.44, 0.86], [0.62, 0.55], [0.28, 0.9], [0.72, 0.92], [0.55, 0.2]];
    for (const [fx, fy] of spots) {
      await page.mouse.click(Math.round(w * fx), Math.round(h * fy));
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SHOTS, name) });
    console.log(`shot  ${label}  ${path.join(SHOTS, name)}`);
    await ctx.close();
  }

  await browser.close();
  server.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} 合格 ===`);
  if (failed.length) {
    console.log('落ちた項目:');
    for (const f of failed) console.log('  - ' + f.name);
  }
  process.exit(failed.length ? 1 : 0);
})().catch(e => {
  console.error('検証そのものが失敗しました:', e && e.stack || e);
  process.exit(2);
});
