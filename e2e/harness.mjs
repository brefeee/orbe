// Lance un vrai serveur ORBE (données temporaires) qui sert le client compilé, puis ouvre un navigateur.
// Utilisation : import { launch } from './harness.mjs' ; const { base, browser, newUser, stop } = await launch();
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const SHOTS = join(ROOT, 'e2e', 'shots');

export async function launch({ env = {} } = {}) {
  if (!existsSync(join(ROOT, 'client', 'dist', 'index.html'))) throw new Error('Compile d’abord le client : (cd client && npm run build)');
  mkdirSync(SHOTS, { recursive: true });
  const dataDir = mkdtempSync(join(tmpdir(), 'orbe-e2e-'));
  const port = 4900 + Math.floor(Math.random() * 500);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/main.ts'], {
    cwd: join(ROOT, 'server'),
    env: { ...process.env, PORT: String(port), ORBE_DATA_DIR: dataDir, ORBE_WEB_DIR: join(ROOT, 'client', 'dist'), ORBE_PUBLIC_URL: base, ...env },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* pas encore prêt */ }
    if (i > 100) throw new Error('Le serveur ne démarre pas.');
    await new Promise(r => setTimeout(r, 100));
  }
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let n = 0;
  return {
    base, browser, dataDir,
    /** Crée un compte par l'API et renvoie une page déjà connectée (contexte isolé = utilisateur indépendant). */
    async newUser(name, { viewport = { width: 1280, height: 800 } } = {}) {
      const id = `${name.toLowerCase()}${++n}`;
      const res = await fetch(`${base}/api/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `${id}@test.orbe`, password: `motdepasse-${id}`, displayName: name, handle: id, acceptTerms: true, termsVersion: '2026-11-14' }) });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      const context = await browser.newContext({ viewport, locale: 'fr-FR' });
      await context.addInitScript(([token]) => { localStorage.setItem('orbe.token', token); localStorage.setItem('orbe.locale', 'fr'); }, [body.token]);
      const page = await context.newPage();
      page.on('pageerror', err => console.error(`[page ${name}]`, err.message));
      await page.goto(base);
      return { page, context, token: body.token, user: body.user, handle: id, email: `${id}@test.orbe`, password: `motdepasse-${id}`,
        api: (method, path, payload) => fetch(base + path, { method, headers: { Authorization: `Bearer ${body.token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, body: payload ? JSON.stringify(payload) : undefined }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) })) };
    },
    async stop() { await browser.close(); server.kill(); rmSync(dataDir, { recursive: true, force: true }); },
  };
}
