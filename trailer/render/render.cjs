// Rend les images [début, fin) à 30 i/s et les encode directement : node render/render.cjs <début> <fin> <sortie.mp4>
const { spawn } = require('child_process');
const { open, server } = require('./preview.cjs');
(async () => {
  const [a, b, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
  const { browser, page } = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate(([t, fr]) => window.renderAt(t, fr), [f / 30, f]);
    const img = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 150 === 0) console.log(`${out} image ${f} (${f - a}/${b - a}) ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close(); server.close();
  console.log(`${out} terminé en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})();
