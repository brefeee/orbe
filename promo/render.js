// Capture image par image de film.html (Chromium sans tête) → build/frames/*.jpg
// usage : node render.js [fps=30] [début=0] [fin=60]   |   node render.js still 3.5 12 ...
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const args = process.argv.slice(2), still = args[0] === 'still';
  const fps = still ? 0 : +(args[0] || 30), t0 = +(args[1] || 0), t1 = +(args[2] || 60), WORKERS = 4;
  const dir = path.join(__dirname, 'build', still ? 'stills' : 'frames'); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const open = async () => { const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto('file://' + path.join(__dirname, 'film.html') + '?capture'); await p.evaluate(() => window.ready); return p; };
  if (still) { const p = await open(); for (const t of args.slice(1).map(Number)) { await p.evaluate(t => window.render(t), t); await p.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 80 }); } }
  else {
    const first = Math.round(t0 * fps), last = Math.round(t1 * fps); let next = first, done = 0;
    await Promise.all([...Array(WORKERS)].map(async () => { const p = await open(); for (;;) { const f = next++; if (f >= last) break; await p.evaluate(t => window.render(t), f / fps); await p.screenshot({ path: path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 96 }); if (++done % 150 === 0) console.log(done, '/', last - first); } }));
  }
  await browser.close();
})();
