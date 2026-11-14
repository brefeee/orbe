import type { Migration } from '../../db.ts';

export const migrations: Migration[] = [{
  id: '001_init',
  sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_media_id TEXT,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  locale TEXT NOT NULL DEFAULT 'fr',
  terms_version TEXT,
  terms_accepted_at INTEGER,
  settings TEXT NOT NULL DEFAULT '{}',
  privacy TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE auth_attempts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  poll_hash TEXT NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  verifier TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  sealed_token TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX notifications_user ON notifications(user_id, created_at DESC);
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  scope_type TEXT,
  scope_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX media_owner ON media(owner_id);
CREATE INDEX media_scope ON media(scope_type, scope_id);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
`,
}];
