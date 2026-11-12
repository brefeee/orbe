// Rendu image par image d'une pub dans Chromium sans affichage.
//   node _moteur/render.js <dossier_du_jeu> [--workers=N] [--frames=a-b]
//   node _moteur/render.js <dossier_du_jeu> --sheet=18            planche de 18 vignettes réparties sur la durée
//   node _moteur/render.js <dossier_du_jeu> --sheet --times=1,2.5  planche aux instants choisis
//   node _moteur/render.js <dossier_du_jeu> --times=4.2,8.5        images pleine taille (t_4.20.jpg)
// Sorties dans <dossier_du_jeu>/projet/build/ (frames/, cues.json, planche.jpg).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const gameDir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const game = path.relative(ROOT, gameDir).split(path.sep)[0];
const opt = k => { const a = args.find(a => a === `--${k}` || a.startsWith(`--${k}=`)); return a == null ? null : (a.split('=')[1] ?? ''); };
const buildDir = path.join(ROOT, game, 'projet', 'build');
const framesDir = path.join(buildDir, 'frames');
const workers = +(opt('workers') || 4);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/_moteur/fonts.css">
<style>html,body{margin:0;background:#000;overflow:hidden}canvas#out{display:block;width:1080px;height:1920px}</style></head>
<body><canvas id="out" width="1080" height="1920"></canvas><script type="module" src="/${game}/projet/ad.js"></script></body></html>`;
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/' || u === '/index.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(PAGE); }
      const p = path.join(ROOT, u.replace(/^\/+/, ''));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(framesDir, { recursive: true });
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--ignore-gpu-blocklist'] });
  let failed = false;
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => { failed = true; console.error('ERREUR PAGE :', e.message); });
    page.on('console', m => { if (m.type() === 'error') console.error('console :', m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.AD && window.AD.ready, null, { timeout: 120000 });
    return page;
  };
  const first = await open();
  const meta = await first.evaluate(() => ({ FPS: AD.FPS, DURATION: AD.DURATION, cues: AD.cues, music: AD.music, thumbTime: AD.thumbTime }));
  fs.writeFileSync(path.join(buildDir, 'cues.json'), JSON.stringify({ cues: meta.cues, music: meta.music, fps: meta.FPS, duration: meta.DURATION, thumbTime: meta.thumbTime }, null, 1));

  if (opt('sheet') != null) {
    let times = opt('times') ? opt('times').split(',').map(Number) : null;
    if (!times) { const n = +(opt('sheet') || 18); times = Array.from({ length: n }, (_, i) => +((i + .5) * meta.DURATION / n).toFixed(2)); }
    const cols = Math.min(6, times.length), tw = 270, th = 480;
    const data = await first.evaluate(async ({ times, cols, tw, th }) => {
      const rows = Math.ceil(times.length / cols), c = document.createElement('canvas'); c.width = cols * tw; c.height = rows * th; const g = c.getContext('2d');
      const out = document.getElementById('out');
      times.forEach((t, i) => { AD.renderFrame(t); const x = (i % cols) * tw, y = Math.floor(i / cols) * th; g.drawImage(out, x, y, tw, th); g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x, y, 78, 26); g.fillStyle = '#fff'; g.font = '18px monospace'; g.fillText(t.toFixed(2) + 's', x + 5, y + 19); g.strokeStyle = '#444'; g.strokeRect(x + .5, y + .5, tw - 1, th - 1); });
      return c.toDataURL('image/jpeg', 0.86);
    }, { times, cols, tw, th });
    const f = path.join(buildDir, opt('out') || 'planche.jpg'); fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    console.log('Planche ->', f, `(${times.length} vignettes : ${times.join(', ')})`);
    await browser.close(); srv.close(); process.exit(failed ? 1 : 0);
  }

  let jobs;
  if (opt('times')) jobs = opt('times').split(',').map(s => ({ t: +s, file: path.join(buildDir, `t_${(+s).toFixed(2)}.jpg`) }));
  else {
    const total = Math.round(meta.FPS * meta.DURATION);
    const [a, b] = (opt('frames') || `0-${total - 1}`).split('-').map(Number);
    jobs = []; for (let i = a; i <= b; i++) jobs.push({ t: i / meta.FPS, file: path.join(framesDir, `f_${String(i).padStart(5, '0')}.jpg`) });
  }
  const pages = [first]; for (let i = 1; i < Math.min(workers, jobs.length); i++) pages.push(await open());
  let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const data = await page.evaluate(t => { AD.renderFrame(t); return document.getElementById('out').toDataURL('image/jpeg', 0.94); }, j.t);
      fs.writeFileSync(j.file, Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 150 === 0 || done === jobs.length) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${jobs.length} images  ${el.toFixed(0)}s  (~${(el / done * (jobs.length - done)).toFixed(0)}s restantes)`); }
    }
  }));
  await browser.close(); srv.close(); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
