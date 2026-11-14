import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  /** Adresse publique du serveur (sans / final), utilisée pour les redirections OAuth. */
  publicUrl: string;
  /** Clé maîtresse (32 octets) qui chiffre les secrets des utilisateurs (clés d'IA, jetons OAuth). */
  secretKey: Buffer;
  corsOrigins: string[];
  google: { clientId: string; clientSecret: string; base: string; tokenUrl: string; userinfoUrl: string } | null;
  /** Dossier du client web compilé, servi tel quel s'il existe. */
  webDir: string | null;
  isTest: boolean;
}

function localOnly(url: string, name: string): string {
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`${name} doit rester local (réservé aux tests).`);
  return url.replace(/\/$/, '');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<Config> = {}): Config {
  const dataDir = resolve(overrides.dataDir ?? env.ORBE_DATA_DIR ?? './data');
  mkdirSync(dataDir, { recursive: true });
  let secretKey: Buffer;
  if (env.ORBE_SECRET_KEY) {
    secretKey = Buffer.from(env.ORBE_SECRET_KEY, 'base64');
    if (secretKey.length !== 32) throw new Error('ORBE_SECRET_KEY doit contenir 32 octets encodés en base64.');
  } else {
    // Sans variable d'environnement, la clé est créée une fois dans le dossier de données (jamais dans le dépôt).
    const file = join(dataDir, 'secret.key');
    if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString('base64'), { mode: 0o600 });
    secretKey = Buffer.from(readFileSync(file, 'utf8').trim(), 'base64');
  }
  const port = Number(env.PORT ?? 4780);
  const publicUrl = (env.ORBE_PUBLIC_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, '');
  let google: Config['google'] = null;
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    const test = env.ORBE_GOOGLE_TEST_BASE ? localOnly(env.ORBE_GOOGLE_TEST_BASE, 'ORBE_GOOGLE_TEST_BASE') : null;
    google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      base: test ? `${test}/auth` : 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: test ? `${test}/token` : 'https://oauth2.googleapis.com/token',
      userinfoUrl: test ? `${test}/userinfo` : 'https://openidconnect.googleapis.com/v1/userinfo',
    };
  }
  const webDir = env.ORBE_WEB_DIR ? resolve(env.ORBE_WEB_DIR) : null;
  return {
    port,
    host: env.HOST ?? '127.0.0.1',
    dataDir,
    publicUrl,
    secretKey,
    corsOrigins: (env.ORBE_CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
    google,
    webDir: webDir && existsSync(webDir) ? webDir : null,
    isTest: env.NODE_ENV === 'test',
    ...overrides,
  };
}
