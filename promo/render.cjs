// Rendu de la vidéo : node render.cjs [sortie.mp4]
// Nécessite playwright (Chromium), ffmpeg et les polices Inter / Inter Display.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const out = path.resolve(process.argv[2] || path.join(__dirname, 'orbe-abonnements.mp4'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbe-promo-'));
const WORKERS = Math.max(1, Math.min(4, os.cpus().length));
const url = 'file://' + path.join(__dirname, 'video.html') + '?capture';

(async () => {
  const browser = await chromium.launch();
  const probe = await browser.newPage();
  await probe.goto(url); await probe.evaluate(() => window.ready);
  const { W, H, FPS, frames } = await probe.evaluate(() => window.VIDEO);
  await probe.close();
  let done = 0;
  const per = Math.ceil(frames / WORKERS), segs = [];
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const a = w * per, b = Math.min(frames, a + per); if (a >= b) return;
    const seg = path.join(tmp, `seg${w}.mp4`); segs[w] = seg;
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-g', String(FPS * 2), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto(url); await page.evaluate(() => window.ready);
    for (let f = a; f < b; f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 98 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done} / ${frames} images`);
    }
    ff.stdin.end(); await closed; await page.close();
  }));
  await browser.close();
  const list = path.join(tmp, 'list.txt'), wav = path.join(tmp, 'audio.wav');
  fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
  execFileSync('node', [path.join(__dirname, 'audio.cjs'), wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK →', out);
})().catch(e => { console.error(e); process.exit(1); });
