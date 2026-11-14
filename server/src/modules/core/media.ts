import { createReadStream, createWriteStream, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import type { Ctx } from '../../context.ts';
import { badRequest, forbidden, notFound, unauthorized } from '../../errors.ts';
import { newId, now } from '../../crypto.ts';
import { userFromToken } from './auth.ts';

const INLINE = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|audio\/(mpeg|ogg|wav|webm|mp4)|application\/pdf)$/;
const ALLOWED = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime)|audio\/[\w.+-]+|application\/(pdf|zip|json|octet-stream|vnd\.[\w.+-]+)|text\/(plain|markdown|csv))$/;

const pathOf = (ctx: Ctx, id: string) => join(ctx.config.dataDir, 'media', id.slice(0, 2), id);

export function deleteMediaFiles(ctx: Ctx, ids: string[]): void {
  for (const id of ids) rmSync(pathOf(ctx, id), { force: true });
}

export interface MediaRow { id: string; owner_id: string; mime: string; size: number; name: string; scope_type: string | null; scope_id: string | null }

/**
 * Rattache un média envoyé par ownerId à un contenu (publication, message, connaissance…).
 * Tant qu'il n'est pas rattaché, seul son propriétaire peut le lire.
 */
export function attachMedia(ctx: Ctx, mediaId: string, ownerId: string, scopeType: string, scopeId: string): MediaRow {
  const row = ctx.db.get<MediaRow>('SELECT * FROM media WHERE id=? AND owner_id=?', mediaId, ownerId);
  if (!row) throw badRequest('Pièce jointe introuvable.');
  if (row.scope_type && (row.scope_type !== scopeType || row.scope_id !== scopeId)) throw badRequest('Cette pièce jointe est déjà utilisée ailleurs.');
  ctx.db.run('UPDATE media SET scope_type=?, scope_id=? WHERE id=?', scopeType, scopeId, mediaId);
  return { ...row, scope_type: scopeType, scope_id: scopeId };
}

/** Supprime les médias rattachés à un contenu (à appeler quand ce contenu est supprimé). */
export function deleteScopeMedia(ctx: Ctx, scopeType: string, scopeId: string): void {
  const rows = ctx.db.all<{ id: string }>('SELECT id FROM media WHERE scope_type=? AND scope_id=?', scopeType, scopeId);
  ctx.db.run('DELETE FROM media WHERE scope_type=? AND scope_id=?', scopeType, scopeId);
  deleteMediaFiles(ctx, rows.map(r => r.id));
}

export function canReadMedia(ctx: Ctx, viewerId: string, row: MediaRow): boolean {
  if (row.owner_id === viewerId) return true;
  if (!row.scope_type || !row.scope_id) return false;
  if (row.scope_type === 'avatar') return !ctx.registry.social.isBlocked(viewerId, row.owner_id);
  const check = ctx.registry.mediaAccess[row.scope_type];
  return check ? check(viewerId, row.scope_id) : false;
}

const sign = (ctx: Ctx, id: string, userId: string, exp: number) =>
  createHmac('sha256', ctx.config.secretKey).update(`media:${id}:${userId}:${exp}`).digest('base64url');

export function registerMedia(ctx: Ctx): void {
  const { app, db } = ctx;

  app.post('/api/media', async req => {
    const user = ctx.requireUser(req);
    ctx.limit(`upload:${user.id}`, 120, 3_600_000);
    const file = await req.file();
    if (!file) throw badRequest('Aucun fichier reçu.');
    const mime = file.mimetype.toLowerCase();
    if (!ALLOWED.test(mime)) { file.file.resume(); throw badRequest('Ce type de fichier n’est pas accepté.'); }
    const id = newId();
    const target = pathOf(ctx, id);
    mkdirSync(join(target, '..'), { recursive: true });
    await pipeline(file.file, createWriteStream(target, { mode: 0o600 }));
    if (file.file.truncated) { rmSync(target, { force: true }); throw badRequest('Fichier trop volumineux (50 Mo maximum).'); }
    const size = statSync(target).size;
    db.run('INSERT INTO media (id, owner_id, mime, size, name, created_at) VALUES (?,?,?,?,?,?)', id, user.id, mime, size, file.filename.slice(0, 200), now());
    return { id, mime, size, name: file.filename.slice(0, 200) };
  });

  // Adresse temporaire signée, pour les balises <img>/<video> qui ne peuvent pas envoyer d'en-tête Authorization.
  app.get('/api/media/:id/url', async req => {
    const user = ctx.requireUser(req);
    const { id } = req.params as { id: string };
    const row = db.get<MediaRow>('SELECT * FROM media WHERE id=?', id);
    if (!row || !canReadMedia(ctx, user.id, row)) throw notFound('Média introuvable.');
    const exp = now() + 15 * 60_000;
    return { url: `/api/media/${id}?u=${user.id}&exp=${exp}&sig=${sign(ctx, id, user.id, exp)}`, mime: row.mime, expiresAt: exp };
  });

  app.get('/api/media/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as { u?: string; exp?: string; sig?: string };
    let viewerId: string;
    if (q.sig && q.u && q.exp) {
      const exp = Number(q.exp);
      const expected = Buffer.from(sign(ctx, id, q.u, exp));
      const got = Buffer.from(q.sig);
      if (!(exp > now()) || expected.length !== got.length || !timingSafeEqual(expected, got)) throw unauthorized('Lien expiré.');
      if (!db.get('SELECT 1 FROM users WHERE id=?', q.u)) throw unauthorized();
      viewerId = q.u;
    } else {
      const header = req.headers.authorization ?? '';
      const user = userFromToken(ctx, header.startsWith('Bearer ') ? header.slice(7) : undefined);
      if (!user) throw unauthorized();
      viewerId = user.id;
    }
    const row = db.get<MediaRow>('SELECT * FROM media WHERE id=?', id);
    // Les droits sont revérifiés à chaque lecture : un partage retiré coupe aussi les liens déjà émis.
    if (!row || !canReadMedia(ctx, viewerId, row)) throw notFound('Média introuvable.');
    const inline = INLINE.test(row.mime);
    reply.header('Content-Type', inline ? row.mime : 'application/octet-stream');
    reply.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name || id)}`);
    reply.header('Content-Security-Policy', "default-src 'none'; sandbox");
    reply.header('Cache-Control', 'private, max-age=600');
    reply.header('Accept-Ranges', 'bytes');
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, row.size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), row.size - 1) : row.size - 1;
      if (start > end || start >= row.size) return reply.status(416).header('Content-Range', `bytes */${row.size}`).send();
      reply.status(206).header('Content-Range', `bytes ${start}-${end}/${row.size}`).header('Content-Length', end - start + 1);
      return reply.send(createReadStream(pathOf(ctx, id), { start, end }));
    }
    reply.header('Content-Length', row.size);
    return reply.send(createReadStream(pathOf(ctx, id)));
  });

  app.delete('/api/media/:id', async req => {
    const user = ctx.requireUser(req);
    const { id } = req.params as { id: string };
    const row = db.get<MediaRow>('SELECT * FROM media WHERE id=? AND owner_id=?', id, user.id);
    if (!row) throw notFound('Média introuvable.');
    if (row.scope_type && row.scope_type !== 'avatar') throw forbidden('Supprime plutôt le contenu auquel ce fichier est rattaché.');
    db.run('UPDATE users SET avatar_media_id=NULL WHERE avatar_media_id=?', id);
    db.run('DELETE FROM media WHERE id=?', id);
    deleteMediaFiles(ctx, [id]);
    return { ok: true };
  });
}
