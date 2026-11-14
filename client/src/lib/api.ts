import { SERVER_URL } from './platform.ts';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'orbe.token';
let token: string | null = null;
try { token = localStorage.getItem(TOKEN_KEY); } catch { /* stockage indisponible */ }

export const getToken = (): string | null => token;
export function setToken(next: string | null): void {
  token = next;
  try { if (next) localStorage.setItem(TOKEN_KEY, next); else localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
}

type Listener = (err: ApiError) => void;
const authListeners = new Set<Listener>();
/** Prévenu quand le serveur refuse la session (401) ou exige les conditions (403 terms_required). */
export function onAuthProblem(fn: Listener): () => void { authListeners.add(fn); return () => authListeners.delete(fn); }

export const apiUrl = (path: string): string => `${SERVER_URL}${path}`;

async function request<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method, headers, body: payload, ...init });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network', 'Le serveur ORBE est injoignable. Vérifie ta connexion.');
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* réponse non JSON */ }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string };
    const err = new ApiError(res.status, d.error ?? 'error', d.message ?? 'Une erreur est survenue.');
    if (res.status === 401 && d.error !== 'bad_credentials' || d.error === 'terms_required') authListeners.forEach(fn => fn(err));
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T = unknown>(path: string, body: unknown = {}, init?: RequestInit) => request<T>('POST', path, body, init),
  patch: <T = unknown>(path: string, body: unknown = {}) => request<T>('PATCH', path, body),
  put: <T = unknown>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  del: <T = unknown>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  /** Envoie un fichier ; renvoie l'identifiant du média, à rattacher ensuite à un contenu. */
  upload(file: File | Blob, name?: string): Promise<{ id: string; mime: string; size: number; name: string }> {
    const form = new FormData();
    form.append('file', file, name ?? (file as File).name ?? 'fichier');
    return request('POST', '/api/media', form);
  },
};

const urlCache = new Map<string, { url: string; exp: number }>();
/** Adresse temporaire d'un média, utilisable dans <img>, <video> ou <audio>. */
export async function mediaUrl(id: string): Promise<string> {
  const hit = urlCache.get(id);
  if (hit && hit.exp - Date.now() > 60_000) return hit.url;
  const res = await api.get<{ url: string; expiresAt: number }>(`/api/media/${id}/url`);
  const url = apiUrl(res.url);
  urlCache.set(id, { url, exp: res.expiresAt });
  return url;
}
export const clearMediaCache = (): void => urlCache.clear();
