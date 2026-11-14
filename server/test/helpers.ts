import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { buildApp, type OrbeApp } from '../src/app.ts';
import type { Config } from '../src/config.ts';

process.env.NODE_ENV = 'test';
export const TERMS = '2026-11-14';

export interface TestUser { id: string; token: string; handle: string; email: string; password: string }
export interface Res<T = any> { status: number; body: T }

export interface TestApp extends OrbeApp {
  dataDir: string;
  /** Appel HTTP en mémoire. `token` peut être un TestUser, un jeton ou null. */
  api<T = any>(method: string, url: string, who?: TestUser | string | null, body?: unknown): Promise<Res<T>>;
  /** Crée un compte indépendant (conditions acceptées) et renvoie son jeton. */
  signup(name: string): Promise<TestUser>;
  /** Démarre l'écoute réseau (pour tester le WebSocket) et renvoie l'adresse de base. */
  listen(): Promise<string>;
  stop(): Promise<void>;
}

export async function startTestApp(overrides: Partial<Config> = {}): Promise<TestApp> {
  const dataDir = mkdtempSync(join(tmpdir(), 'orbe-test-'));
  const built = await buildApp({ dataDir, isTest: true, ...overrides });
  let counter = 0;
  const api: TestApp['api'] = async (method, url, who, body) => {
    const token = typeof who === 'string' ? who : who?.token;
    const res = await built.app.inject({
      method: method as 'GET', url,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      payload: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let parsed: unknown = res.body;
    try { parsed = JSON.parse(res.body); } catch { /* réponse non JSON */ }
    return { status: res.statusCode, body: parsed as never };
  };
  return {
    ...built, dataDir, api,
    async signup(name) {
      const n = ++counter;
      const email = `${name.toLowerCase()}${n}@test.orbe`;
      const password = `motdepasse-${name}-${n}`;
      const handle = `${name.toLowerCase()}${n}`;
      const res = await api('POST', '/api/auth/signup', null, { email, password, displayName: name, handle, acceptTerms: true, termsVersion: TERMS });
      if (res.status !== 200) throw new Error(`signup ${name}: ${res.status} ${JSON.stringify(res.body)}`);
      return { id: res.body.user.id, token: res.body.token, handle, email, password };
    },
    async listen() {
      await built.app.listen({ port: 0, host: '127.0.0.1' });
      return `http://127.0.0.1:${(built.app.server.address() as AddressInfo).port}`;
    },
    async stop() {
      await built.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
