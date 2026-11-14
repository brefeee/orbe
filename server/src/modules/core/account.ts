import type { Ctx } from '../../context.ts';
import { badRequest, conflict, forbidden, HttpError, notFound, obj, oneOf, str } from '../../errors.ts';
import { now } from '../../crypto.ts';
import { verifyPassword } from '../../crypto.ts';
import { audit } from './auth.ts';
import { deleteMediaFiles } from './media.ts';
import {
  DEFAULT_PRIVACY, DEFAULT_SETTINGS, getUserRow, HANDLE_RE, LOCALES, mergeKnown, privacyOf, publicUser, selfView, settingsOf, TERMS_VERSION, type UserRow,
} from './users.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerAccount(ctx: Ctx): void {
  const { app, db } = ctx;

  app.get('/api/me', async req => selfView(getUserRow(ctx, ctx.requireUser(req, { terms: false }).id)!));

  app.post('/api/me/terms', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const body = obj(req.body);
    if (body.accept !== true || body.version !== TERMS_VERSION) throw badRequest('Version des conditions invalide.');
    db.run('UPDATE users SET terms_version=?, terms_accepted_at=? WHERE id=?', TERMS_VERSION, now(), user.id);
    audit(ctx, user.id, 'terms_accepted', req, TERMS_VERSION);
    return selfView(getUserRow(ctx, user.id)!);
  });

  app.patch('/api/me', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const body = obj(req.body);
    const row = getUserRow(ctx, user.id)!;
    const next = {
      display_name: body.displayName === undefined ? row.display_name : str(body.displayName, 'Nom affiché', { min: 2, max: 40 }),
      bio: body.bio === undefined ? row.bio : str(body.bio, 'Biographie', { optional: true, max: 500 }),
      locale: body.locale === undefined ? row.locale : oneOf(body.locale, 'Langue', LOCALES),
      handle: row.handle,
      avatar_media_id: row.avatar_media_id,
    };
    if (body.handle !== undefined) {
      const handle = str(body.handle, 'Identifiant', { min: 3, max: 24 }).toLowerCase();
      if (!HANDLE_RE.test(handle)) throw badRequest('Identifiant : 3 à 24 caractères parmi a-z, 0-9, point et tiret bas.');
      if (handle !== row.handle.toLowerCase() && db.get('SELECT 1 FROM users WHERE handle=? AND id<>?', handle, user.id)) throw conflict('Cet identifiant est déjà pris.', 'handle_taken');
      next.handle = handle;
    }
    if (body.avatarMediaId !== undefined) {
      if (body.avatarMediaId === null) next.avatar_media_id = null;
      else {
        const id = str(body.avatarMediaId, 'Avatar', { max: 40 });
        const media = db.get<{ mime: string }>('SELECT mime FROM media WHERE id=? AND owner_id=?', id, user.id);
        if (!media || !media.mime.startsWith('image/')) throw badRequest('Image de profil introuvable.');
        db.run("UPDATE media SET scope_type='avatar', scope_id=? WHERE id=?", user.id, id);
        next.avatar_media_id = id;
      }
    }
    db.run('UPDATE users SET display_name=?, bio=?, locale=?, handle=?, avatar_media_id=? WHERE id=?',
      next.display_name, next.bio, next.locale, next.handle, next.avatar_media_id, user.id);
    return selfView(getUserRow(ctx, user.id)!);
  });

  app.patch('/api/me/settings', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const row = getUserRow(ctx, user.id)!;
    const merged = mergeKnown(DEFAULT_SETTINGS, settingsOf(row), obj(req.body));
    db.run('UPDATE users SET settings=? WHERE id=?', JSON.stringify(merged), user.id);
    return merged;
  });

  app.patch('/api/me/privacy', async req => {
    const user = ctx.requireUser(req, { terms: false });
    const row = getUserRow(ctx, user.id)!;
    const merged = mergeKnown(DEFAULT_PRIVACY, privacyOf(row), obj(req.body));
    db.run('UPDATE users SET privacy=? WHERE id=?', JSON.stringify(merged), user.id);
    audit(ctx, user.id, 'privacy_changed', req);
    return merged;
  });

  app.post('/api/me/email', async req => {
    const user = ctx.requireUser(req, { terms: false });
    ctx.limit(`email:${user.id}`, 5, 3_600_000);
    const body = obj(req.body);
    const row = getUserRow(ctx, user.id)!;
    if (!row.password_hash) throw forbidden('Ce compte se connecte avec Google : l’adresse suit celle du compte Google.');
    if (!(await verifyPassword(str(body.password, 'Mot de passe', { max: 200, trim: false }), row.password_hash))) {
      throw new HttpError(401, 'bad_credentials', 'Mot de passe incorrect.');
    }
    const email = str(body.email, 'Adresse e-mail', { max: 200 }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw badRequest('Adresse e-mail invalide.');
    if (db.get('SELECT 1 FROM users WHERE email=? AND id<>?', email, user.id)) throw conflict('Un compte existe déjà avec cette adresse.', 'email_taken');
    // La nouvelle adresse n'est pas prouvée : le lien Google éventuel est retiré avec elle.
    db.run('UPDATE users SET email=?, email_verified=0, google_sub=NULL WHERE id=?', email, user.id);
    audit(ctx, user.id, 'email_changed', req);
    return selfView(getUserRow(ctx, user.id)!);
  });

  // Profil public d'un autre utilisateur, filtré par sa confidentialité.
  app.get('/api/users/:ref', async req => {
    const viewer = ctx.requireUser(req);
    const { ref } = req.params as { ref: string };
    const row = db.get<UserRow>('SELECT * FROM users WHERE id=? OR handle=?', ref, ref.replace(/^@/, ''));
    const view = publicUser(ctx, viewer.id, row);
    if (!view) throw notFound('Utilisateur introuvable.');
    return view;
  });

  // Export : tout ce qu'ORBE conserve sur le compte, module par module.
  app.get('/api/me/export', async (req, reply) => {
    const user = ctx.requireUser(req, { terms: false });
    ctx.limit(`export:${user.id}`, 6, 3_600_000);
    const row = getUserRow(ctx, user.id)!;
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      account: selfView(row),
      sessions: db.all('SELECT label, ip, created_at, last_seen_at FROM sessions WHERE user_id=? AND revoked_at IS NULL', user.id),
      media: db.all('SELECT id, mime, size, name, scope_type, created_at FROM media WHERE owner_id=?', user.id),
    };
    for (const exporter of ctx.registry.exporters) data[exporter.name] = exporter.export(user.id);
    audit(ctx, user.id, 'export', req);
    reply.header('Content-Disposition', 'attachment; filename="orbe-export.json"');
    return data;
  });

  app.delete('/api/me', async req => {
    const user = ctx.requireUser(req, { terms: false });
    ctx.limit(`delete:${user.id}`, 5, 3_600_000);
    const body = obj(req.body);
    const row = getUserRow(ctx, user.id)!;
    if (row.password_hash) {
      if (!(await verifyPassword(str(body.password, 'Mot de passe', { max: 200, trim: false }), row.password_hash))) {
        throw new HttpError(401, 'bad_credentials', 'Mot de passe incorrect.');
      }
    } else if (body.confirm !== row.handle) {
      throw badRequest('Pour confirmer, saisis ton identifiant.');
    }
    const media = db.all<{ id: string }>('SELECT id FROM media WHERE owner_id=?', user.id);
    db.tx(() => {
      for (const hook of ctx.registry.accountDeleteHooks) hook(user.id);
      db.run('DELETE FROM users WHERE id=?', user.id);
    });
    deleteMediaFiles(ctx, media.map(m => m.id));
    ctx.hub.kick(user.id);
    audit(ctx, null, 'account_deleted', req);
    return { ok: true };
  });
}
