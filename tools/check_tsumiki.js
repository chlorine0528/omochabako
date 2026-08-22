'use strict';
/*
  つみき の「ためると変わる」が本当に出るかを数える。

    node tools/check_tsumiki.js

  2歳は同じところを何度も押す。だから同じ列を続けて押したときに、
  雲が下りてきて積み木のてっぺんに当たるところまで届くかを見る。
  10秒の体験を4〜6回くり返すあいだに1回は当たること（DESIGN.md）を、
  「8回押すあいだに1回は当たるか」で確かめる。

  雲に当たったときの音（sCloud）だけが lowpass のフィルタを作るので、
  createBiquadFilter を包んで type を見れば、ゲーム側に印を足さずに数えられる。
*/

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8795;
const TRIALS = 16;
const TAPS = 8;

const HOOK = `
  window.__cloud = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  const orig = AC.prototype.createBiquadFilter;
  AC.prototype.createBiquadFilter = function () {
    const n = orig.apply(this, arguments);
    setTimeout(function () { if (n.type === 'lowpass') window.__cloud++; }, 0);
    return n;
  };
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

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const out = [];

  for (const [w, h] of [[390, 844], [844, 390]]) {
    const label = `${w > h ? '横' : '縦'} ${w}x${h}`;
    let hitTrials = 0, sum = 0;

    for (let k = 0; k < TRIALS; k++) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true
      });
      const page = await ctx.newPage();
      await page.addInitScript(HOOK);
      await page.goto(`http://127.0.0.1:${PORT}/games/tsumiki/`, { waitUntil: 'load' });
      await page.waitForTimeout(400);

      // 押す場所は毎回すこしずらす。同じ列のあたりを続けて押す
      const x = Math.round(w * (0.30 + 0.4 * (k / TRIALS)));
      let firstAt = 0;
      for (let i = 1; i <= TAPS; i++) {
        await page.mouse.click(x + Math.round((Math.random() - 0.5) * 24), Math.round(h * 0.5));
        await page.waitForTimeout(700);   // 積み木が落ちて着地するまで待つ
        const n = await page.evaluate(() => window.__cloud);
        if (n > 0 && !firstAt) { firstAt = i; break; }
      }
      if (firstAt) { hitTrials++; sum += firstAt; }
      await ctx.close();
    }

    const rate = hitTrials / TRIALS;
    const avg = hitTrials ? (sum / hitTrials).toFixed(1) : '-';
    const ok = rate >= 0.75;
    out.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${label}] ${TAPS}回のうちに雲へ届いた: ` +
      `${hitTrials}/${TRIALS}（${Math.round(rate * 100)}%）  初回まで平均${avg}回`);
  }

  await browser.close();
  server.close();
  const bad = out.filter(v => !v).length;
  console.log(bad ? `\n=== ${bad}件 不合格 ===` : '\n=== ひと工夫 合格 ===');
  process.exit(bad ? 1 : 0);
})();
