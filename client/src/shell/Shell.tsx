import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Network, Orbit, Search, Settings, Sparkles, UserRound, WifiOff } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { formatRelative, t as translate, useT } from '@/lib/i18n.ts';
import { realtime, type RtEvent } from '@/lib/realtime.ts';
import { useMe, useSession } from '@/lib/session.tsx';
import { Avatar, Button, IconButton, Loading } from '@/ui/index.tsx';
import { Logo } from './Logo.tsx';
import './shell.css';

const Ia = lazy(() => import('@/spaces/ia/index.tsx'));
const Carte = lazy(() => import('@/spaces/carte/index.tsx'));
const Reseau = lazy(() => import('@/spaces/reseau/index.tsx'));
const Recherche = lazy(() => import('@/spaces/recherche/index.tsx'));
const Profil = lazy(() => import('@/spaces/profil/index.tsx'));

const SPACES = [
  { id: 'ia', icon: <Sparkles /> }, { id: 'carte', icon: <Orbit /> }, { id: 'reseau', icon: <Network /> },
  { id: 'recherche', icon: <Search /> }, { id: 'profil', icon: <UserRound /> },
] as const;

// ---- Pastilles de la navigation : chaque espace peut signaler des éléments non lus ----
const badges = new Map<string, number>();
const badgeSubs = new Set<() => void>();
let badgeVersion = 0;
/** setNavBadge('reseau', 3) affiche une pastille sur l'espace ; 0 la retire. */
export function setNavBadge(space: (typeof SPACES)[number]['id'], count: number): void {
  if ((badges.get(space) ?? 0) === count) return;
  badges.set(space, count);
  badgeVersion++;
  badgeSubs.forEach(fn => fn());
}

// ---- Textes des notifications : chaque espace décrit ses propres types ----
export interface NotificationView { text: string; route?: string }
const renderers = new Map<string, (data: Record<string, any>) => NotificationView>();
/** registerNotification('friend_request', data => ({ text: …, route: '/reseau/amis' })) */
export function registerNotification(type: string, render: (data: Record<string, any>) => NotificationView): void { renderers.set(type, render); }

interface Notif { id: string; type: string; data: Record<string, any>; readAt: number | null; createdAt: number }

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

function Notifications() {
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useOutside(open, () => setOpen(false));
  useEffect(() => {
    const load = () => api.get<{ unread: number; items: Notif[] }>('/api/notifications').then(r => { setItems(r.items); setUnread(r.unread); }).catch(() => { /* réessayé à la reconnexion */ });
    load();
    const off = realtime.on('notification', (e: RtEvent) => { setItems(list => [e.notification as Notif, ...list].slice(0, 100)); setUnread(n => n + 1); });
    const offReady = realtime.on('ready', load);
    return () => { off(); offReady(); };
  }, []);
  const readAll = () => { setUnread(0); setItems(list => list.map(n => ({ ...n, readAt: n.readAt ?? Date.now() }))); void api.post('/api/notifications/read').catch(() => {}); };
  return (
    <div className="menu-anchor" ref={ref}>
      <IconButton label={`${t('core.notif.title')}${unread ? ` (${unread})` : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Bell />{unread > 0 && <span className="nav-dot" style={{ top: 4, left: 22 }}>{unread > 99 ? '99+' : unread}</span>}
      </IconButton>
      {open && (
        <div className="popover notifs" role="dialog" aria-label={t('core.notif.title')}>
          <div className="row between" style={{ padding: '6px 8px' }}><strong>{t('core.notif.title')}</strong>{unread > 0 && <Button size="sm" variant="ghost" onClick={readAll}>{t('core.notif.readAll')}</Button>}</div>
          <div className="scroll">
            {items.length === 0 && <p className="muted small" style={{ padding: 16, textAlign: 'center' }}>{t('core.notif.empty')}</p>}
            {items.map(n => {
              const view = renderers.get(n.type)?.(n.data) ?? { text: n.type };
              return (
                <button key={n.id} type="button" className={`list-item notif${n.readAt ? '' : ' unread'}`} style={{ display: 'block' }}
                  onClick={() => { setOpen(false); if (!n.readAt) { setUnread(u => Math.max(0, u - 1)); setItems(l => l.map(x => (x.id === n.id ? { ...x, readAt: Date.now() } : x))); void api.post('/api/notifications/read', { ids: [n.id] }).catch(() => {}); } if (view.route) navigate(view.route); }}>
                  <div>{view.text}</div><div className="faint" style={{ fontSize: 'var(--fs-xs)' }}>{formatRelative(n.createdAt)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const t = useT();
  const me = useMe();
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const go = (route: string) => { setOpen(false); navigate(route); };
  return (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="account-btn" aria-haspopup="menu" aria-expanded={open} aria-label={t('core.account.menu')} onClick={() => setOpen(o => !o)}>
        <Avatar name={me.displayName} mediaId={me.avatarMediaId} size={30} /><span className="name truncate">{me.displayName}</span>
      </button>
      {open && (
        <div className="popover" role="menu">
          <div className="row" style={{ padding: 8 }}>
            <Avatar name={me.displayName} mediaId={me.avatarMediaId} size={42} />
            <div className="grow"><div className="truncate" style={{ fontWeight: 800 }}>{me.displayName}</div><div className="small muted truncate">@{me.handle}</div></div>
          </div>
          <hr />
          <button role="menuitem" type="button" className="list-item" onClick={() => go('/profil')}><UserRound size={18} />{t('core.account.profile')}</button>
          <button role="menuitem" type="button" className="list-item" onClick={() => go('/profil/parametres')}><Settings size={18} />{t('core.account.settings')}</button>
          <hr />
          <button role="menuitem" type="button" className="list-item" style={{ color: 'var(--danger)' }} onClick={() => void session.logout()}><LogOut size={18} />{t('core.account.logout')}</button>
        </div>
      )}
    </div>
  );
}

function OfflineBar() {
  const t = useT();
  const online = useSyncExternalStore(realtime.onStatus, realtime.isOnline);
  const [late, setLate] = useState(false);
  useEffect(() => { if (online) { setLate(false); return; } const id = setTimeout(() => setLate(true), 4000); return () => clearTimeout(id); }, [online]);
  return late ? <div className="badge danger offline-bar" role="status"><WifiOff size={14} />{t('core.status.offline')}</div> : null;
}

/** Remplaçant honnête d'un espace pas encore livré. */
export function ComingSoon({ icon }: { icon: ReactNode }) {
  return <div className="empty" style={{ height: '100%' }}>{icon}<h3>{translate('core.soon.title')}</h3><p>{translate('core.soon.text')}</p></div>;
}

export function Shell() {
  const t = useT();
  const location = useLocation();
  useSyncExternalStore(fn => { badgeSubs.add(fn); return () => badgeSubs.delete(fn); }, () => badgeVersion);
  const current = SPACES.find(s => location.pathname.startsWith(`/${s.id}`))?.id ?? 'ia';
  return (
    <div className="shell">
      <header className="topbar">
        <div className="row brand" style={{ gap: 10 }}><Logo size={28} /><strong>ORBE</strong><span className="space">{t(`core.nav.${current}`)}</span></div>
        <div className="row" style={{ gap: 6 }}><Notifications /><AccountMenu /></div>
      </header>
      <main className="shell-main">
        <OfflineBar />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/ia/*" element={<Ia />} />
            <Route path="/carte/*" element={<Carte />} />
            <Route path="/reseau/*" element={<Reseau />} />
            <Route path="/recherche/*" element={<Recherche />} />
            <Route path="/profil/*" element={<Profil />} />
            <Route path="*" element={<Navigate to="/ia" replace />} />
          </Routes>
        </Suspense>
      </main>
      <nav className="bottom-nav" aria-label={t('core.nav.label')}>
        {SPACES.map(s => (
          <NavLink key={s.id} to={`/${s.id}`} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {s.icon}<span>{t(`core.nav.${s.id}`)}</span>
            {(badges.get(s.id) ?? 0) > 0 && <span className="nav-dot">{badges.get(s.id)! > 99 ? '99+' : badges.get(s.id)}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
