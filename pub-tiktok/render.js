// Rendu des images de la pub : node render.js [dossier_images] [--frames=a-b] [--times=1.2,3.4] [--workers=N]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const args = process.argv.slice(2);
const outDir = path.resolve(args.find(a => !a.startsWith('--')) || path.join(__dirname, 'build', 'frames'));
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const workers = +(opt('workers') || 3);
const config = opt('config') ? JSON.parse(fs.readFileSync(opt('config'), 'utf8')) : {};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.css': 'text/css' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      const p = path.join(SRC, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!p.startsWith(SRC) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync'] });
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => console.error('PAGE ERROR', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
    await page.addInitScript(c => { window.AD_CONFIG = c; }, config);
    await page.goto(url);
    await page.waitForFunction(() => window.AD && window.AD.ready, null, { timeout: 180000 });
    return page;
  };
  const first = await open();
  const meta = await first.evaluate(() => ({ FPS: AD.FPS, DURATION: AD.DURATION, cues: AD.cues, music: AD.music }));
  fs.writeFileSync(path.join(outDir, '..', 'cues.json'), JSON.stringify({ cues: meta.cues, music: meta.music, fps: meta.FPS, duration: meta.DURATION }, null, 1));

  let jobs;
  if (opt('times')) jobs = opt('times').split(',').map(s => ({ t: +s, file: `t_${(+s).toFixed(2)}.jpg` }));
  else {
    const total = Math.round(meta.FPS * meta.DURATION);
    let [a, b] = (opt('frames') || `0-${total - 1}`).split('-').map(Number);
    jobs = []; for (let i = a; i <= b; i++) jobs.push({ t: i / meta.FPS, file: `f_${String(i).padStart(5, '0')}.jpg` });
  }
  const pages = [first]; for (let i = 1; i < Math.min(workers, jobs.length); i++) pages.push(await open());
  let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const data = await page.evaluate(t => { AD.renderFrame(t); return document.getElementById('out').toDataURL('image/jpeg', 0.96); }, j.t);
      fs.writeFileSync(path.join(outDir, j.file), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 30 === 0 || done === jobs.length) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${jobs.length} images  ${el.toFixed(0)}s  (~${(el / done * (jobs.length - done)).toFixed(0)}s restantes)`);
      }
    }
  }));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
