// Rend quelques images fixes : node render/preview.cjs <dossier> t1 t2 ...
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'scene');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(s); });
module.exports = { server, open };
async function open() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('ERREUR PAGE', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(() => window.renderAt && window.sceneReady, null, { timeout: 120000 });
  await page.evaluate(() => window.sceneReady);
  const envFile = path.join(ROOT, '..', 'build', 'envelope.json');
  if (fs.existsSync(envFile)) await page.evaluate(a => window.loadEnvelope(a), JSON.parse(fs.readFileSync(envFile, 'utf8')));
  return { browser, page };
}
if (require.main === module) (async () => {
  const [out, ...times] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const { browser, page } = await open();
  for (const t of times.map(Number)) {
    const t0 = Date.now();
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(out, `t${String(t).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 88 });
    console.log(`t=${t}s rendu en ${Date.now() - t0} ms`);
  }
  await browser.close(); server.close();
})();
