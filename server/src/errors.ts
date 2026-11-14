/** Erreur renvoyée telle quelle au client : { error: code, message }. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (message: string, code = 'bad_request') => new HttpError(400, code, message);
export const unauthorized = (message = 'Connexion requise.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Action non autorisée.', code = 'forbidden') => new HttpError(403, code, message);
export const notFound = (message = 'Introuvable.') => new HttpError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict') => new HttpError(409, code, message);
export const tooMany = (message = 'Trop de demandes. Réessaie dans un instant.') => new HttpError(429, 'rate_limited', message);

/** Validation minimale des corps de requête, sans dépendance. */
export function str(value: unknown, label: string, opts: { min?: number; max?: number; optional?: boolean; trim?: boolean } = {}): string {
  const { min = 1, max = 2000, optional = false, trim = true } = opts;
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw badRequest(`${label} : valeur manquante.`);
  }
  if (typeof value !== 'string') throw badRequest(`${label} : texte attendu.`);
  const text = trim ? value.trim() : value;
  if (text.length < min && !(optional && text.length === 0)) throw badRequest(`${label} : ${min} caractère(s) minimum.`);
  if (text.length > max) throw badRequest(`${label} : ${max} caractères maximum.`);
  return text;
}
export function oneOf<T extends string>(value: unknown, label: string, allowed: readonly T[], fallback?: T): T {
  if ((value === undefined || value === null) && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw badRequest(`${label} : valeur attendue parmi ${allowed.join(', ')}.`);
  return value as T;
}
export function int(value: unknown, label: string, opts: { min?: number; max?: number; fallback?: number } = {}): number {
  if ((value === undefined || value === null || value === '') && opts.fallback !== undefined) return opts.fallback;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) throw badRequest(`${label} : nombre entier attendu.`);
  if (opts.min !== undefined && n < opts.min) throw badRequest(`${label} : minimum ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw badRequest(`${label} : maximum ${opts.max}.`);
  return n;
}
export function obj(value: unknown, label = 'Requête'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest(`${label} : objet attendu.`);
  return value as Record<string, unknown>;
}
