import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { join } from 'node:path';

export interface Migration { id: string; sql: string }
type Param = string | number | bigint | null | Uint8Array;

/** Enveloppe fine autour de SQLite : requêtes préparées en cache et transactions imbriquables. */
export class Db {
  readonly raw: DatabaseSync;
  private cache = new Map<string, StatementSync>();
  private depth = 0;

  constructor(dataDir: string | ':memory:') {
    this.raw = new DatabaseSync(dataDir === ':memory:' ? ':memory:' : join(dataDir, 'orbe.db'));
    this.raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;');
    this.raw.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  }

  private stmt(sql: string): StatementSync {
    let s = this.cache.get(sql);
    if (!s) { s = this.raw.prepare(sql); this.cache.set(sql, s); }
    return s;
  }

  get<T = Record<string, unknown>>(sql: string, ...params: Param[]): T | undefined {
    return this.stmt(sql).get(...params) as T | undefined;
  }

  all<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
    return this.stmt(sql).all(...params) as T[];
  }

  run(sql: string, ...params: Param[]): { changes: number; lastInsertRowid: number } {
    const r = this.stmt(sql).run(...params);
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  }

  exec(sql: string): void { this.raw.exec(sql); }

  /** Exécute fn dans une transaction ; tout est annulé si fn lève une erreur. fn doit être synchrone. */
  tx<T>(fn: () => T): T {
    const name = `sp_${this.depth}`;
    this.raw.exec(this.depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${name}`);
    this.depth++;
    try {
      const out = fn();
      this.depth--;
      this.raw.exec(this.depth === 0 ? 'COMMIT' : `RELEASE ${name}`);
      return out;
    } catch (err) {
      this.depth--;
      this.raw.exec(this.depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${name}; RELEASE ${name}`);
      throw err;
    }
  }

  migrate(module: string, migrations: Migration[]): void {
    for (const m of migrations) {
      const id = `${module}/${m.id}`;
      if (this.get('SELECT 1 FROM _migrations WHERE id=?', id)) continue;
      this.tx(() => {
        this.raw.exec(m.sql);
        this.run('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)', id, Date.now());
      });
    }
  }

  close(): void { this.cache.clear(); this.raw.close(); }
}

/** Prépare une requête FTS5 sûre à partir d'un texte libre : chaque mot devient un préfixe. */
export function ftsQuery(text: string): string | null {
  const words = text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!words?.length) return null;
  return words.slice(0, 12).map(w => `"${w}"*`).join(' ');
}
