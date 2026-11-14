import type { FastifyRequest } from 'fastify';
import type { Ctx, User } from '../../context.ts';
import { badRequest, conflict, forbidden, HttpError, obj, oneOf, str, unauthorized } from '../../errors.ts';
import { hashPassword, newId, newToken, now, seal, sha256, unseal, verifyPassword } from '../../crypto.ts';
import { createHash, randomBytes } from 'node:crypto';
import { getUserRow, HANDLE_RE, LOCALES, selfView, TERMS_VERSION, uniqueHandle, type UserRow } from './users.ts';

const SESSION_DAYS = 30;
const DAY = 86_400_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createSession(ctx: Ctx, userId: string, req: FastifyRequest | null, label = ''): { token: string; sessionId: string } {
  const token = newToken();
  const sessionId = newId();
  const t = now();
  ctx.db.run('INSERT INTO sessions (id, user_id, token_hash, label, ip, created_at, last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?,?)',
    sessionId, userId, sha256(token), label.slice(0, 80), req?.ip ?? '', t, t, t + SESSION_DAYS * DAY);
  return { token, sessionId };
}

export function audit(ctx: Ctx, userId: string | null, action: string, req: FastifyRequest | null, detail = ''): void {
  ctx.db.run('INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?,?,?,?,?)', userId, action, detail.slice(0, 300), req?.ip ?? '', now());
}

interface SessionRow { id: string; user_id: string; expires_at: number; revoked_at: number | null; last_seen_at: number }

/** Résout un jeton en utilisateur. Sert aussi au WebSocket. */
export function userFromToken(ctx: Ctx, token: string | undefined): User | null {
  if (!token || token.length < 20) return null;
  const s = ctx.db.get<SessionRow>('SELECT id, user_id, expires_at, revoked_at, last_seen_at FROM sessions WHERE token_hash=?', sha256(token));
  const t = now();
  if (!s || s.revoked_at || s.expires_at < t) return null;
  const row = getUserRow(ctx, s.user_id);
  if (!row) return null;
  if (t - s.last_seen_at > 60_000) {
    // Session glissante : chaque usage repousse l'expiration.
    ctx.db.run('UPDATE sessions SET last_seen_at=?, expires_at=? WHERE id=?', t, t + SESSION_DAYS * DAY, s.id);
  }
  return { id: row.id, email: row.email, handle: row.handle, displayName: row.display_name, locale: row.locale, termsVersion: row.terms_version, sessionId: s.id };
}

export function installRequireUser(ctx: Ctx): void {
  ctx.requireUser = (req, opts = {}) => {
    const header = req.headers.authorization ?? '';
    const user = userFromToken(ctx, header.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!user) throw unauthorized();
    if (opts.terms !== false && user.termsVersion !== TERMS_VERSION) {
      throw forbidden('Tu dois accepter les conditions d’utilisation pour utiliser cette fonctionnalité.', 'terms_required');
    }
    return user;
  };
}

function checkPassword(password: unknown): string {
  const p = str(password, 'Mot de passe', { min: 10, max: 200, trim: false });
  return p;
}

export function registerAuth(ctx: Ctx): void {
  const { app, db } = ctx;

  app.get('/api/auth/providers', async () => ({
    password: true,
    google: { configured: !!ctx.config.google },
    termsVersion: TERMS_VERSION,
    locales: LOCALES,
  }));

  app.post('/api/auth/signup', async req => {
    ctx.limit(`signup:${req.ip}`, 10, 3_600_000);
    const body = obj(req.body);
    const email = str(body.email, 'Adresse e-mail', { max: 200 }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw badRequest('Adresse e-mail invalide.');
    const password = checkPassword(body.password);
    const displayName = str(body.displayName, 'Nom affiché', { min: 2, max: 40 });
    const handle = str(body.handle, 'Identifiant', { min: 3, max: 24 }).toLowerCase();
    if (!HANDLE_RE.test(handle)) throw badRequest('Identifiant : 3 à 24 caractères parmi a-z, 0-9, point et tiret bas.');
    const locale = oneOf(body.locale, 'Langue', LOCALES, 'fr');
    if (body.acceptTerms !== true || body.termsVersion !== TERMS_VERSION) {
      throw forbidden('La création d’un compte demande d’accepter les conditions d’utilisation en vigueur.', 'terms_required');
    }
    if (db.get('SELECT 1 FROM users WHERE email=?', email)) throw conflict('Un compte existe déjà avec cette adresse.', 'email_taken');
    if (db.get('SELECT 1 FROM users WHERE handle=?', handle)) throw conflict('Cet identifiant est déjà pris.', 'handle_taken');
    const hash = await hashPassword(password);
    const id = newId();
    const t = now();
    try {
      db.run(`INSERT INTO users (id, email, handle, display_name, password_hash, locale, terms_version, terms_accepted_at, created_at)
              VALUES (?,?,?,?,?,?,?,?,?)`, id, email, handle, displayName, hash, locale, TERMS_VERSION, t, t);
    } catch {
      throw conflict('Ce compte existe déjà.', 'email_taken');
    }
    audit(ctx, id, 'signup', req);
    const { token } = createSession(ctx, id, req, str(body.device, 'Appareil', { optional: true, max: 80 }));
    return { token, user: selfView(getUserRow(ctx, id)!) };
  });

  app.post('/api/auth/login', async req => {
    const body = obj(req.body);
    const email = str(body.email, 'Adresse e-mail', { max: 200 }).toLowerCase();
    const password = str(body.password, 'Mot de passe', { max: 200, trim: false });
    ctx.limit(`login:ip:${req.ip}`, 30, 900_000);
    ctx.limit(`login:email:${email}`, 8, 900_000);
    const row = db.get<UserRow>('SELECT * FROM users WHERE email=?', email);
    const ok = await verifyPassword(password, row?.password_hash ?? null);
    if (!row || !ok) {
      audit(ctx, row?.id ?? null, 'login_failed', req);
      throw new HttpError(401, 'bad_credentials', 'Adresse ou mot de passe incorrect.');
    }
    audit(ctx, row.id, 'login', req);
    const { token } = createSession(ctx, row.id, req, str(body.device, 'Appareil', { optional: true, max: 80 }));
    return { token, user: selfView(row) };
  });

  app.post('/api/auth/logout', async req => {
    const user = ctx.requireUser(req, { terms: false });
    db.run('UPDATE sessions SET revoked_at=? WHERE id=?', now(), user.sessionId);
    ctx.hub.kick(user.id, user.sessionId);
    return { ok: true };
  });

  // ---- Google : flux OAuth officiel (code d'autorisation + PKCE), secret gardé côté serveur ----
  app.post('/api/auth/google/start', async req => {
    const g = ctx.config.google;
    if (!g) throw new HttpError(503, 'google_not_configured', 'La connexion Google n’est pas encore configurée sur ce serveur.');
    ctx.limit(`gstart:${req.ip}`, 20, 600_000);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const attemptId = newId();
    const pollSecret = newToken();
    const state = newToken();
    const verifier = randomBytes(48).toString('base64url');
    const t = now();
    db.run('INSERT INTO auth_attempts (id, provider, poll_hash, state_hash, verifier, label, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)',
      attemptId, 'google', sha256(pollSecret), sha256(state), seal(ctx.config.secretKey, verifier),
      str(body.device, 'Appareil', { optional: true, max: 80 }), t, t + 600_000);
    const url = new URL(g.base);
    url.search = new URLSearchParams({
      client_id: g.clientId, redirect_uri: `${ctx.config.publicUrl}/api/auth/google/callback`, response_type: 'code',
      scope: 'openid email profile', state, code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), prompt: 'select_account',
    }).toString();
    return { attemptId, pollSecret, url: url.toString() };
  });

  const page = (title: string, text: string) => `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ORBE</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#090C20;color:#EEF1FA;font-family:system-ui,sans-serif;text-align:center">
<main style="padding:32px;max-width:420px"><h1 style="font-size:22px;color:#F2C14E">${title}</h1><p style="line-height:1.5;color:#B7BDD6">${text}</p></main></body></html>`;

  app.get('/api/auth/google/callback', async (req, reply) => {
    const g = ctx.config.google;
    const q = req.query as { state?: string; code?: string; error?: string };
    reply.type('text/html; charset=utf-8');
    const attempt = q.state ? db.get<{ id: string; verifier: string; label: string; status: string; expires_at: number }>(
      'SELECT id, verifier, label, status, expires_at FROM auth_attempts WHERE state_hash=?', sha256(q.state)) : undefined;
    if (!g || !attempt || attempt.status !== 'pending' || attempt.expires_at < now()) {
      return reply.status(400).send(page('Connexion expirée', 'Cette demande de connexion n’est plus valable. Reviens dans ORBE et recommence.'));
    }
    const fail = (error: string, text: string) => {
      db.run("UPDATE auth_attempts SET status='error', error=? WHERE id=?", error, attempt.id);
      return reply.status(400).send(page('Connexion impossible', text));
    };
    if (q.error || !q.code) return fail('denied', 'La connexion Google a été annulée. Tu peux fermer cette page et revenir dans ORBE.');
    try {
      const tokenRes = await fetch(g.tokenUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: q.code, client_id: g.clientId, client_secret: g.clientSecret, grant_type: 'authorization_code',
          redirect_uri: `${ctx.config.publicUrl}/api/auth/google/callback`, code_verifier: unseal(ctx.config.secretKey, attempt.verifier),
        }),
      });
      if (!tokenRes.ok) return fail('exchange', 'Google a refusé la connexion. Reviens dans ORBE et recommence.');
      const tokens = (await tokenRes.json()) as { access_token?: string };
      const infoRes = await fetch(g.userinfoUrl, { headers: { Authorization: `Bearer ${tokens.access_token ?? ''}` } });
      if (!infoRes.ok) return fail('userinfo', 'Impossible de lire le profil Google. Reviens dans ORBE et recommence.');
      const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!info.sub || !info.email || info.email_verified !== true) return fail('unverified', 'Ce compte Google n’a pas d’adresse e-mail vérifiée.');
      const email = info.email.toLowerCase();
      const userId = db.tx(() => {
        let row = db.get<UserRow>('SELECT * FROM users WHERE google_sub=?', info.sub!);
        if (row) return row.id;
        row = db.get<UserRow>('SELECT * FROM users WHERE email=?', email);
        if (row) {
          if (!row.email_verified) {
            // L'adresse n'avait jamais été prouvée : Google la prouve. L'ancien mot de passe et les sessions sont invalidés
            // pour qu'une personne ayant créé le compte à la place du titulaire ne garde aucun accès.
            db.run('UPDATE users SET password_hash=NULL WHERE id=?', row.id);
            db.run('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', now(), row.id);
            ctx.hub.kick(row.id);
          }
          db.run('UPDATE users SET google_sub=?, email_verified=1 WHERE id=?', info.sub!, row.id);
          return row.id;
        }
        const id = newId();
        const name = (info.name ?? email.split('@')[0]!).slice(0, 40) || 'ORBE';
        db.run('INSERT INTO users (id, email, email_verified, handle, display_name, google_sub, created_at) VALUES (?,?,?,?,?,?,?)',
          id, email, 1, uniqueHandle(ctx, email.split('@')[0]!), name.length < 2 ? `${name}_` : name, info.sub!, now());
        return id;
      });
      const { token } = createSession(ctx, userId, req, attempt.label);
      db.run("UPDATE auth_attempts SET status='done', sealed_token=? WHERE id=?", seal(ctx.config.secretKey, token), attempt.id);
      audit(ctx, userId, 'login_google', req);
      return reply.send(page('Connexion réussie', 'Tu peux fermer cette page et revenir dans ORBE.'));
    } catch {
      return fail('network', 'Le service Google ne répond pas. Reviens dans ORBE et recommence.');
    }
  });

  // L'application interroge cette adresse pendant que l'utilisateur termine la connexion dans son navigateur.
  app.post('/api/auth/attempt', async req => {
    const body = obj(req.body);
    const id = str(body.attemptId, 'Tentative', { max: 60 });
    const secret = str(body.pollSecret, 'Secret', { max: 100 });
    ctx.limit(`poll:${id}`, 400, 600_000);
    const a = db.get<{ poll_hash: string; status: string; error: string | null; sealed_token: string | null; expires_at: number }>(
      'SELECT poll_hash, status, error, sealed_token, expires_at FROM auth_attempts WHERE id=?', id);
    if (!a || a.poll_hash !== sha256(secret)) throw unauthorized('Tentative inconnue.');
    if (a.status === 'pending') return a.expires_at < now() ? { status: 'expired' } : { status: 'pending' };
    if (a.status === 'error') return { status: 'error', error: a.error };
    if (!a.sealed_token) return { status: 'expired' };
    const token = unseal(ctx.config.secretKey, a.sealed_token);
    db.run('DELETE FROM auth_attempts WHERE id=?', id); // le jeton n'est remis qu'une seule fois
    const user = userFromToken(ctx, token);
    return { status: 'done', token, user: user ? selfView(getUserRow(ctx, user.id)!) : null };
  });

  // ---- Sessions ----
  app.get('/api/me/sessions', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const rows = db.all<{ id: string; label: string; ip: string; created_at: number; last_seen_at: number }>(
      'SELECT id, label, ip, created_at, last_seen_at FROM sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY last_seen_at DESC', user.id, now());
    return rows.map(s => ({ id: s.id, label: s.label, ip: s.ip, createdAt: s.created_at, lastSeenAt: s.last_seen_at, current: s.id === user.sessionId }));
  });

  app.delete('/api/me/sessions/:id', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const { id } = req.params as { id: string };
    const r = db.run('UPDATE sessions SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL', now(), id, user.id);
    if (r.changes) ctx.hub.kick(user.id, id);
    return { ok: r.changes > 0 };
  });

  app.post('/api/me/sessions/revoke-others', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const others = db.all<{ id: string }>('SELECT id FROM sessions WHERE user_id=? AND id<>? AND revoked_at IS NULL', user.id, user.sessionId);
    db.run('UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL', now(), user.id, user.sessionId);
    for (const s of others) ctx.hub.kick(user.id, s.id);
    return { revoked: others.length };
  });

  app.post('/api/me/password', async req => {
    const user = ctx.requireUser(req, { terms: false });
    ctx.limit(`pw:${user.id}`, 8, 900_000);
    const body = obj(req.body);
    const row = getUserRow(ctx, user.id)!;
    if (row.password_hash && !(await verifyPassword(str(body.current, 'Mot de passe actuel', { max: 200, trim: false }), row.password_hash))) {
      throw new HttpError(401, 'bad_credentials', 'Mot de passe actuel incorrect.');
    }
    db.run('UPDATE users SET password_hash=? WHERE id=?', await hashPassword(checkPassword(body.next)), user.id);
    // Changer de mot de passe ferme les autres appareils.
    const others = db.all<{ id: string }>('SELECT id FROM sessions WHERE user_id=? AND id<>? AND revoked_at IS NULL', user.id, user.sessionId);
    db.run('UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL', now(), user.id, user.sessionId);
    for (const s of others) ctx.hub.kick(user.id, s.id);
    audit(ctx, user.id, 'password_changed', req);
    return { ok: true };
  });
}
