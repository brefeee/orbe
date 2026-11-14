import type { WebSocket } from 'ws';

export interface RtEvent { type: string; [key: string]: unknown }
export interface Conn { userId: string; socket: WebSocket; sessionId: string }
type Handler = (conn: Conn, payload: Record<string, unknown>) => void;

/** Diffusion en temps réel vers les appareils connectés d'un utilisateur. */
export class Hub {
  private byUser = new Map<string, Set<Conn>>();
  private handlers = new Map<string, Handler>();
  private connectHooks: ((userId: string, first: boolean) => void)[] = [];
  private disconnectHooks: ((userId: string, last: boolean, conn: Conn) => void)[] = [];

  add(conn: Conn): void {
    let set = this.byUser.get(conn.userId);
    const first = !set;
    if (!set) { set = new Set(); this.byUser.set(conn.userId, set); }
    set.add(conn);
    for (const hook of this.connectHooks) hook(conn.userId, first);
  }

  remove(conn: Conn): void {
    const set = this.byUser.get(conn.userId);
    if (!set?.delete(conn)) return;
    const last = set.size === 0;
    if (last) this.byUser.delete(conn.userId);
    for (const hook of this.disconnectHooks) hook(conn.userId, last, conn);
  }

  /** Ferme les connexions d'une session révoquée (ou de tout le compte si sessionId est omis). */
  kick(userId: string, sessionId?: string): void {
    for (const conn of [...(this.byUser.get(userId) ?? [])]) {
      if (!sessionId || conn.sessionId === sessionId) conn.socket.close(4001, 'session');
    }
  }

  isOnline(userId: string): boolean { return this.byUser.has(userId); }

  send(userId: string, event: RtEvent): void {
    const set = this.byUser.get(userId);
    if (!set) return;
    const text = JSON.stringify(event);
    for (const conn of set) if (conn.socket.readyState === 1) conn.socket.send(text);
  }

  sendMany(userIds: Iterable<string>, event: RtEvent): void {
    const text = JSON.stringify(event);
    for (const id of new Set(userIds)) {
      for (const conn of this.byUser.get(id) ?? []) if (conn.socket.readyState === 1) conn.socket.send(text);
    }
  }

  /** Messages envoyés par le client (ex. 'typing', signalisation vocale). Le handler vérifie lui-même les droits. */
  on(type: string, handler: Handler): void { this.handlers.set(type, handler); }
  onConnect(hook: (userId: string, first: boolean) => void): void { this.connectHooks.push(hook); }
  onDisconnect(hook: (userId: string, last: boolean, conn: Conn) => void): void { this.disconnectHooks.push(hook); }

  dispatch(conn: Conn, message: unknown): void {
    if (!message || typeof message !== 'object') return;
    const payload = message as Record<string, unknown>;
    const handler = typeof payload.type === 'string' ? this.handlers.get(payload.type) : undefined;
    if (!handler) return;
    try { handler(conn, payload); } catch { /* un message invalide ne doit pas couper la connexion */ }
  }
}
