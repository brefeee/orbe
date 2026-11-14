import type { Ctx, OrbeModule } from '../../context.ts';
import { newId, now } from '../../crypto.ts';
import { int } from '../../errors.ts';
import { migrations } from './schema.ts';
import { installRequireUser, registerAuth, userFromToken } from './auth.ts';
import { registerAccount } from './account.ts';
import { registerLegal } from './legal.ts';
import { registerMedia } from './media.ts';
import type { Conn } from '../../realtime.ts';

function registerNotifications(ctx: Ctx): void {
  const { app, db } = ctx;
  ctx.notify = (userId, type, data) => {
    const n = { id: newId(), type, data, readAt: null, createdAt: now() };
    db.run('INSERT INTO notifications (id, user_id, type, data, created_at) VALUES (?,?,?,?,?)', n.id, userId, type, JSON.stringify(data), n.createdAt);
    ctx.hub.send(userId, { type: 'notification', notification: n });
  };
  app.get('/api/notifications', async req => {
    const user = ctx.requireUser(req);
    const limit = int((req.query as { limit?: string }).limit, 'limit', { min: 1, max: 100, fallback: 50 });
    const rows = db.all<{ id: string; type: string; data: string; read_at: number | null; created_at: number }>(
      'SELECT id, type, data, read_at, created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?', user.id, limit);
    const unread = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL', user.id)!.n;
    return { unread, items: rows.map(r => ({ id: r.id, type: r.type, data: JSON.parse(r.data) as unknown, readAt: r.read_at, createdAt: r.created_at })) };
  });
  app.post('/api/notifications/read', async req => {
    const user = ctx.requireUser(req);
    const ids = ((req.body ?? {}) as { ids?: unknown }).ids;
    if (Array.isArray(ids)) {
      for (const id of ids.slice(0, 200)) if (typeof id === 'string') db.run('UPDATE notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL', now(), id, user.id);
    } else {
      db.run('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL', now(), user.id);
    }
    return { ok: true };
  });
}

function registerRealtime(ctx: Ctx): void {
  ctx.app.get('/api/ws', { websocket: true }, socket => {
    let conn: Conn | null = null;
    // Le jeton arrive dans le premier message (jamais dans l'adresse, qui finirait dans des journaux).
    const timer = setTimeout(() => { if (!conn) socket.close(4000, 'auth'); }, 8000);
    socket.on('message', raw => {
      let message: unknown;
      try { message = JSON.parse(String(raw)); } catch { return; }
      if (!conn) {
        const m = message as { type?: string; token?: string };
        const user = m?.type === 'auth' ? userFromToken(ctx, m.token) : null;
        if (!user) { socket.close(4001, 'auth'); return; }
        conn = { userId: user.id, socket, sessionId: user.sessionId };
        ctx.hub.add(conn);
        socket.send(JSON.stringify({ type: 'ready', userId: user.id }));
        return;
      }
      if ((message as { type?: string })?.type === 'ping') { socket.send('{"type":"pong"}'); return; }
      ctx.hub.dispatch(conn, message);
    });
    socket.on('close', () => { clearTimeout(timer); if (conn) ctx.hub.remove(conn); });
    socket.on('error', () => { /* la fermeture suit */ });
  });
}

const core: OrbeModule = {
  name: 'core',
  order: 0,
  migrations,
  register(ctx) {
    installRequireUser(ctx);
    registerNotifications(ctx);
    registerAuth(ctx);
    registerAccount(ctx);
    registerLegal(ctx);
    registerMedia(ctx);
    registerRealtime(ctx);
  },
};
export default core;
