import { getToken } from './api.ts';
import { SERVER_URL } from './platform.ts';

export interface RtEvent { type: string; [key: string]: any }
type Handler = (event: RtEvent) => void;

const handlers = new Map<string, Set<Handler>>();
const statusListeners = new Set<(online: boolean) => void>();
let socket: WebSocket | null = null;
let wanted = false;
let online = false;
let retry = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let ping: ReturnType<typeof setInterval> | undefined;

function setOnline(next: boolean): void {
  if (online === next) return;
  online = next;
  statusListeners.forEach(fn => fn(next));
}

function wsUrl(): string {
  const base = SERVER_URL || window.location.origin;
  return `${base.replace(/^http/, 'ws')}/api/ws`;
}

function open(): void {
  const token = getToken();
  if (!wanted || !token || socket) return;
  const ws = new WebSocket(wsUrl());
  socket = ws;
  ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
  ws.onmessage = e => {
    let event: RtEvent;
    try { event = JSON.parse(String(e.data)); } catch { return; }
    if (event.type === 'ready') { retry = 0; setOnline(true); }
    handlers.get(event.type)?.forEach(fn => fn(event));
    handlers.get('*')?.forEach(fn => fn(event));
  };
  ws.onclose = e => {
    if (socket === ws) socket = null;
    setOnline(false);
    if (!wanted || e.code === 4001) return; // session refusée : inutile d'insister
    timer = setTimeout(open, Math.min(30_000, 500 * 2 ** retry++));
  };
  ws.onerror = () => ws.close();
}

export const realtime = {
  /** À appeler une fois connecté ; se reconnecte seul après une coupure. */
  start(): void {
    wanted = true;
    open();
    ping ??= setInterval(() => { if (socket?.readyState === 1) socket.send('{"type":"ping"}'); }, 25_000);
  },
  stop(): void {
    wanted = false;
    clearTimeout(timer);
    clearInterval(ping);
    ping = undefined;
    socket?.close();
    socket = null;
  },
  /** S'abonne à un type d'événement ('*' pour tous). Renvoie la fonction de désabonnement. */
  on(type: string, fn: Handler): () => void {
    let set = handlers.get(type);
    if (!set) { set = new Set(); handlers.set(type, set); }
    set.add(fn);
    return () => { set.delete(fn); };
  },
  send(event: RtEvent): boolean {
    if (socket?.readyState !== 1 || !online) return false;
    socket.send(JSON.stringify(event));
    return true;
  },
  isOnline: (): boolean => online,
  onStatus(fn: (online: boolean) => void): () => void { statusListeners.add(fn); return () => statusListeners.delete(fn); },
};
