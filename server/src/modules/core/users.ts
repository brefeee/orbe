import type { Ctx } from '../../context.ts';
import { badRequest } from '../../errors.ts';

export const TERMS_VERSION = '2026-11-14';
export const LOCALES = ['fr', 'en', 'es'] as const;
export const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;

export const DEFAULT_SETTINGS = {
  theme: 'dark' as 'system' | 'dark' | 'light',
  notifications: { messages: true, mentions: true, friendRequests: true, posts: true, shares: true, sound: true },
  accessibility: { reduceMotion: false, largeText: false, highContrast: false, captions: false, voiceMode: false },
  voice: { autoRead: false, rate: 1, voiceName: '' },
};
export const DEFAULT_PRIVACY = {
  /** Qui voit la biographie et les publications du profil. */
  profileVisibility: 'public' as 'public' | 'friends' | 'private',
  allowMessagesFrom: 'everyone' as 'everyone' | 'friends',
  showServers: false,
  showActivity: false,
  /** Apparaître dans la recherche d'utilisateurs. */
  discoverable: true,
  /** Autoriser ORBE IA à lire la carte privée pour répondre. */
  aiCanReadMap: true,
  /** Autoriser l'ajout automatique de connaissances depuis les conversations. */
  learnFromConversations: false,
};
export type Settings = typeof DEFAULT_SETTINGS;
export type Privacy = typeof DEFAULT_PRIVACY;

const ENUMS: Record<string, readonly string[]> = {
  theme: ['system', 'dark', 'light'],
  profileVisibility: ['public', 'friends', 'private'],
  allowMessagesFrom: ['everyone', 'friends'],
};

/** Fusionne un changement dans une structure de réglages en n'acceptant que les clés et types connus. */
export function mergeKnown<T extends Record<string, unknown>>(defaults: T, current: unknown, patch: unknown): T {
  const out: Record<string, unknown> = {};
  const cur = (current && typeof current === 'object' ? current : {}) as Record<string, unknown>;
  const pat = (patch && typeof patch === 'object' ? patch : {}) as Record<string, unknown>;
  for (const key of Object.keys(pat)) if (!(key in defaults)) throw badRequest(`Réglage inconnu : ${key}.`);
  for (const [key, def] of Object.entries(defaults)) {
    if (def && typeof def === 'object') {
      out[key] = mergeKnown(def as Record<string, unknown>, cur[key], pat[key]);
      continue;
    }
    let value = key in cur && typeof cur[key] === typeof def ? cur[key] : def;
    if (key in pat) {
      const next = pat[key];
      if (typeof next !== typeof def) throw badRequest(`Réglage ${key} : type invalide.`);
      if (ENUMS[key] && !ENUMS[key].includes(next as string)) throw badRequest(`Réglage ${key} : valeur invalide.`);
      if (typeof next === 'number' && (!Number.isFinite(next) || next < 0.25 || next > 4)) throw badRequest(`Réglage ${key} : valeur invalide.`);
      if (typeof next === 'string' && next.length > 200) throw badRequest(`Réglage ${key} : valeur trop longue.`);
      value = next;
    }
    out[key] = value;
  }
  return out as T;
}

export interface UserRow {
  id: string; email: string; email_verified: number; handle: string; display_name: string; bio: string;
  avatar_media_id: string | null; password_hash: string | null; google_sub: string | null; locale: string;
  terms_version: string | null; terms_accepted_at: number | null; settings: string; privacy: string; created_at: number;
}

const parse = (text: string): unknown => { try { return JSON.parse(text); } catch { return {}; } };
export const settingsOf = (row: UserRow): Settings => mergeKnown(DEFAULT_SETTINGS, parse(row.settings), {});
export const privacyOf = (row: UserRow): Privacy => mergeKnown(DEFAULT_PRIVACY, parse(row.privacy), {});

export function getUserRow(ctx: Ctx, id: string): UserRow | undefined {
  return ctx.db.get<UserRow>('SELECT * FROM users WHERE id=?', id);
}

/** Ce que le titulaire voit de son propre compte. */
export function selfView(row: UserRow) {
  return {
    id: row.id, email: row.email, emailVerified: !!row.email_verified, handle: row.handle, displayName: row.display_name,
    bio: row.bio, avatarMediaId: row.avatar_media_id, locale: row.locale, hasPassword: !!row.password_hash,
    googleLinked: !!row.google_sub, termsAccepted: row.terms_version === TERMS_VERSION, termsVersion: TERMS_VERSION,
    settings: settingsOf(row), privacy: privacyOf(row), createdAt: row.created_at,
  };
}

export interface PublicUser {
  id: string; handle: string; displayName: string; avatarMediaId: string | null;
  bio?: string; relation: 'self' | 'friend' | 'none'; limited: boolean;
}

/**
 * Profil tel que viewerId a le droit de le voir. Renvoie null si l'un a bloqué l'autre.
 * Le nom, l'identifiant et l'avatar sont toujours visibles (nécessaires aux messages) ; le reste suit la confidentialité.
 */
export function publicUser(ctx: Ctx, viewerId: string, target: UserRow | string | undefined): PublicUser | null {
  const row = typeof target === 'string' ? getUserRow(ctx, target) : target;
  if (!row) return null;
  const self = row.id === viewerId;
  if (!self && ctx.registry.social.isBlocked(viewerId, row.id)) return null;
  const friend = !self && ctx.registry.social.isFriend(viewerId, row.id);
  const privacy = privacyOf(row);
  const full = self || privacy.profileVisibility === 'public' || (privacy.profileVisibility === 'friends' && friend);
  return {
    id: row.id, handle: row.handle, displayName: row.display_name, avatarMediaId: row.avatar_media_id,
    ...(full ? { bio: row.bio } : {}), relation: self ? 'self' : friend ? 'friend' : 'none', limited: !full,
  };
}

/** Vrai si viewerId peut voir le contenu de profil (bio, publications) de targetId. */
export function canSeeProfile(ctx: Ctx, viewerId: string, targetId: string): boolean {
  const view = publicUser(ctx, viewerId, targetId);
  return !!view && !view.limited;
}

export function uniqueHandle(ctx: Ctx, wish: string): string {
  let base = wish.normalize('NFKD').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
  if (base.length < 3) base = `orbe${base}`;
  let handle = base;
  for (let n = 1; ctx.db.get('SELECT 1 FROM users WHERE handle=?', handle); n++) handle = `${base}${n + Math.floor(Math.random() * 90)}`.slice(0, 24);
  return handle;
}
