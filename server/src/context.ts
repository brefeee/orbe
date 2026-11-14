import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Config } from './config.ts';
import type { Db, Migration } from './db.ts';
import type { Hub } from './realtime.ts';
import type { Registry } from './registry.ts';

export interface User {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  locale: string;
  termsVersion: string | null;
  sessionId: string;
}

export interface Ctx {
  config: Config;
  db: Db;
  hub: Hub;
  registry: Registry;
  app: FastifyInstance;
  /**
   * Identifie l'utilisateur depuis l'en-tête Authorization. Lève 401 sans session valide,
   * et 403 'terms_required' si les conditions en vigueur ne sont pas acceptées (sauf terms:false).
   */
  requireUser(req: FastifyRequest, opts?: { terms?: boolean }): User;
  /** Limite simple en mémoire : lève 429 au-delà de max appels par fenêtre pour cette clé. */
  limit(key: string, max: number, windowMs: number): void;
  /** Crée une notification persistante et la pousse en temps réel. */
  notify(userId: string, type: string, data: Record<string, unknown>): void;
}

export interface OrbeModule {
  name: string;
  /** Les modules sont chargés par ordre croissant ; 'core' vaut 0. */
  order?: number;
  migrations: Migration[];
  register(ctx: Ctx): void | Promise<void>;
}
