import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, type Config } from './config.ts';
import { Db } from './db.ts';
import { HttpError, tooMany } from './errors.ts';
import { Hub } from './realtime.ts';
import { Registry } from './registry.ts';
import type { Ctx, OrbeModule } from './context.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface OrbeApp { app: FastifyInstance; ctx: Ctx; close(): Promise<void> }

async function loadModules(): Promise<OrbeModule[]> {
  const root = join(HERE, 'modules');
  const mods: OrbeModule[] = [];
  for (const name of readdirSync(root)) {
    const entry = join(root, name, 'index.ts');
    if (!existsSync(entry)) continue;
    const loaded = (await import(pathToFileURL(entry).href)) as { default: OrbeModule };
    mods.push(loaded.default);
  }
  return mods.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
}

export async function buildApp(overrides: Partial<Config> = {}): Promise<OrbeApp> {
  const config = loadConfig(process.env, overrides);
  const db = new Db(config.dataDir);
  const hub = new Hub();
  const registry = new Registry();
  const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024, trustProxy: true });

  await app.register(cors, {
    // Les applications installées (Tauri) et le développement local sont toujours admis ; le reste vient de la configuration.
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      let host = '';
      try { host = new URL(origin).hostname; } catch { /* origine illisible */ }
      const ok = host === 'localhost' || host === '127.0.0.1' || host === 'tauri.localhost'
        || origin.startsWith('tauri://') || config.corsOrigins.includes(origin);
      cb(null, ok);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 10 } });
  await app.register(websocket, { options: { maxPayload: 256 * 1024 } });

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ error: err.code, message: err.message, details: err.details });
    }
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode && e.statusCode < 500) {
      return reply.status(e.statusCode).send({ error: e.code ?? 'bad_request', message: 'Requête invalide.' });
    }
    if (!config.isTest) console.error('[orbe] erreur interne', err);
    else console.error(err);
    return reply.status(500).send({ error: 'internal', message: 'Erreur interne du serveur.' });
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || !config.webDir) return reply.status(404).send({ error: 'not_found', message: 'Adresse inconnue.' });
    return reply.sendFile('index.html');
  });
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
  });

  const buckets = new Map<string, { count: number; reset: number }>();
  const sweep = setInterval(() => {
    const t = Date.now();
    for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k);
  }, 60_000);
  sweep.unref();

  const ctx: Ctx = {
    config, db, hub, registry, app,
    requireUser: (_req: FastifyRequest) => { throw new Error('Le module core doit être chargé en premier.'); },
    limit(key, max, windowMs) {
      const t = Date.now();
      const b = buckets.get(key);
      if (!b || b.reset < t) { buckets.set(key, { count: 1, reset: t + windowMs }); return; }
      if (++b.count > max) throw tooMany();
    },
    notify: () => { throw new Error('Le module core doit être chargé en premier.'); },
  };

  for (const mod of await loadModules()) {
    db.migrate(mod.name, mod.migrations);
    await mod.register(ctx);
  }

  if (config.webDir) await app.register(fastifyStatic, { root: config.webDir, wildcard: false });
  app.get('/api/health', async () => ({ ok: true, name: 'orbe', version: '2.0.0' }));
  await app.ready();

  return {
    app, ctx,
    async close() { clearInterval(sweep); await app.close(); db.close(); },
  };
}
