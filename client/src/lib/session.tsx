import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, clearMediaCache, getToken, onAuthProblem, setToken } from './api.ts';
import { realtime } from './realtime.ts';
import { getLocale, setLocale, type Locale } from './i18n.ts';
import { deviceLabel, openExternal } from './platform.ts';

export interface Me {
  id: string; email: string; emailVerified: boolean; handle: string; displayName: string; bio: string;
  avatarMediaId: string | null; locale: Locale; hasPassword: boolean; googleLinked: boolean;
  termsAccepted: boolean; termsVersion: string;
  settings: {
    theme: 'system' | 'dark' | 'light';
    notifications: { messages: boolean; mentions: boolean; friendRequests: boolean; posts: boolean; shares: boolean; sound: boolean };
    accessibility: { reduceMotion: boolean; largeText: boolean; highContrast: boolean; captions: boolean; voiceMode: boolean };
    voice: { autoRead: boolean; rate: number; voiceName: string };
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private'; allowMessagesFrom: 'everyone' | 'friends';
    showServers: boolean; showActivity: boolean; discoverable: boolean; aiCanReadMap: boolean; learnFromConversations: boolean;
  };
  createdAt: number;
}
export interface Providers { password: boolean; google: { configured: boolean }; termsVersion: string }

type Status = 'loading' | 'offline' | 'guest' | 'terms' | 'ready';
interface SessionValue {
  status: Status;
  me: Me | null;
  providers: Providers | null;
  signup(input: { email: string; password: string; displayName: string; handle: string }): Promise<void>;
  login(email: string, password: string): Promise<void>;
  /** Ouvre Google dans le navigateur et attend la fin de la connexion. Annulable avec le signal. */
  loginWithGoogle(signal: AbortSignal): Promise<void>;
  acceptTerms(): Promise<void>;
  logout(): Promise<void>;
  /** Recharge le compte depuis le serveur (après une modification du profil ou des réglages). */
  refresh(): Promise<void>;
  setMe(me: Me): void;
  retry(): void;
}

const Ctx = createContext<SessionValue | null>(null);
export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('SessionProvider manquant');
  return v;
}
/** Le compte connecté ; à n'utiliser que dans les espaces (toujours défini une fois connecté). */
export function useMe(): Me {
  const { me } = useSession();
  if (!me) throw new Error('Aucun compte connecté');
  return me;
}

function applyAppearance(me: Me | null): void {
  const root = document.documentElement;
  const theme = me?.settings.theme ?? 'dark';
  root.dataset.theme = theme;
  const a = me?.settings.accessibility;
  root.classList.toggle('reduce-motion', !!a?.reduceMotion);
  root.classList.toggle('large-text', !!a?.largeText);
  root.classList.toggle('high-contrast', !!a?.highContrast);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMeState] = useState<Me | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [attempt, setAttempt] = useState(0);

  const adopt = useCallback((user: Me | null) => {
    setMeState(user);
    applyAppearance(user);
    if (!user) { setStatus('guest'); realtime.stop(); return; }
    if (user.locale !== getLocale()) setLocale(user.locale);
    if (user.termsAccepted) { setStatus('ready'); realtime.start(); } else { setStatus('terms'); realtime.stop(); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const p = await api.get<Providers>('/api/auth/providers');
        if (cancelled) return;
        setProviders(p);
        if (!getToken()) { adopt(null); return; }
        const user = await api.get<Me>('/api/me');
        if (!cancelled) adopt(user);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { setToken(null); adopt(null); } else setStatus('offline');
      }
    })();
    return () => { cancelled = true; };
  }, [adopt, attempt]);

  useEffect(() => onAuthProblem(err => {
    if (err.code === 'terms_required') { setStatus(s => (s === 'ready' ? 'terms' : s)); return; }
    setToken(null);
    clearMediaCache();
    adopt(null);
  }), [adopt]);

  const value = useMemo<SessionValue>(() => ({
    status, me, providers,
    async signup(input) {
      const res = await api.post<{ token: string; user: Me }>('/api/auth/signup', {
        ...input, locale: getLocale(), acceptTerms: true, termsVersion: providers?.termsVersion, device: deviceLabel(),
      });
      setToken(res.token);
      adopt(res.user);
    },
    async login(email, password) {
      const res = await api.post<{ token: string; user: Me }>('/api/auth/login', { email, password, device: deviceLabel() });
      setToken(res.token);
      adopt(res.user);
    },
    async loginWithGoogle(signal) {
      const start = await api.post<{ attemptId: string; pollSecret: string; url: string }>('/api/auth/google/start', { device: deviceLabel() });
      await openExternal(start.url);
      for (;;) {
        await new Promise(r => setTimeout(r, 1500));
        if (signal.aborted) throw new DOMException('Annulé', 'AbortError');
        const res = await api.post<{ status: string; token?: string; user?: Me; error?: string }>('/api/auth/attempt', { attemptId: start.attemptId, pollSecret: start.pollSecret });
        if (res.status === 'pending') continue;
        if (res.status === 'done' && res.token && res.user) { setToken(res.token); adopt(res.user); return; }
        throw new ApiError(400, res.error ?? res.status, res.status === 'expired' ? 'La demande de connexion a expiré.' : 'La connexion Google n’a pas abouti.');
      }
    },
    async acceptTerms() {
      adopt(await api.post<Me>('/api/me/terms', { accept: true, version: providers?.termsVersion }));
    },
    async logout() {
      try { await api.post('/api/auth/logout'); } catch { /* la session locale est fermée quoi qu'il arrive */ }
      setToken(null);
      clearMediaCache();
      adopt(null);
    },
    async refresh() { adopt(await api.get<Me>('/api/me')); },
    setMe: adopt,
    retry: () => setAttempt(n => n + 1),
  }), [status, me, providers, adopt]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
