'use strict';
/*
  ぬけるやさい の「連れが増える」を数える。

    node tools/check_nukeru.js [回数]

  目分量で「入れました」と書かないために、次の5つを実測する。

    1. 1回の連続した引きで抜けた割合（100%であること）
    2. 抜くたびに連れが1体増える割合と、6体で頭打ちになること
    3. 引いているあいだ、並んだ連れが後ろへ傾く角度
    4. 抜けた瞬間に全員が端から順に転がる割合
    5. 直前と同じやさいが続けて出た割合（0%であること）
*/
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8794;
const N = Number(process.argv[2] || 24);

function serve(){
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/games/nukeru-yasai/`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const probe = () => page.evaluate(() => window.__probe());

  let popped = 0, grew = 0, repeat = 0, toppled = 0;
  const counts = [], leans = [];
  let prevKind = (await probe()).kind;

  for (let i = 0; i < N; i++){
    const a = await probe();
    const x = Math.round(a.x), y = Math.round(a.gy - 40);
    await page.mouse.move(x, y);
    await page.mouse.down();
    // 抜ける手前まで引いて、そこで並んだ連れの傾きを読む
    await page.mouse.move(x + 6, y - 62, { steps: 5 });
    await page.waitForTimeout(150);
    const mid = await probe();
    if (mid.fall.length) leans.push({ pull: mid.pull, lean: Math.max(...mid.fall.map(Math.abs)) });
    const rest = mid.fall.length ? 0 : 0;
    await page.mouse.move(x + 8, y - 170, { steps: 6 });
    // 離さずに待つ。1回の連続した引きで抜けること
    let b = null, ok = false;
    for (let w = 0; w < 40; w++){
      await page.waitForTimeout(100);
      b = await probe();
      if (b.n > a.n || b.kind !== a.kind){ ok = true; break; }
    }
    await page.mouse.up();
    if (ok){
      popped++;
      counts.push({ before: a.n, after: b.n });
      if (b.n === Math.min(6, a.n + 1)) grew++;
      if (b.kind === a.kind) repeat++;
      prevKind = b.kind;
      // 転がり。端から順に倒れる
      let allDown = false;
      for (let w = 0; w < 14; w++){
        await page.waitForTimeout(90);
        const c2 = await probe();
        if (c2.fall.length && c2.fall.every(v => Math.abs(v) > 0.8)){ allDown = true; break; }
      }
      if (allDown) toppled++;
      await page.waitForTimeout(900);
    }
  }

  const pct = (a, b) => (b ? (a * 100 / b).toFixed(0) : '0') + '%';
  console.log(`1回の連続した引きで抜けた      ${popped}/${N}  ${pct(popped, N)}`);
  console.log(`連れが1体増えた（6体で頭打ち）  ${grew}/${popped}  ${pct(grew, popped)}`);
  console.log(`連れの数の並び                  ${counts.map(c => c.before + '→' + c.after).join(' ')}`);
  console.log(`抜けた瞬間に全員が転がった      ${toppled}/${popped}  ${pct(toppled, popped)}`);
  console.log(`直前と同じやさいが続けて出た    ${repeat}/${popped}  ${pct(repeat, popped)}`);
  if (leans.length){
    const avg = leans.reduce((s, v) => s + v.lean, 0) / leans.length;
    const avgp = leans.reduce((s, v) => s + v.pull, 0) / leans.length;
    console.log(`引いている途中の傾き            引き${avgp.toFixed(2)}のとき ${(avg * 180 / Math.PI).toFixed(1)}度（${leans.length}回の平均）`);
  }

  await browser.close();
  server.close();
})();
