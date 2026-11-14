/**
 * Composants communs d'ORBE. Tous les espaces les utilisent pour garder une interface cohérente.
 * Les classes CSS associées sont dans styles/base.css.
 */
import {
  forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { mediaUrl } from '@/lib/api.ts';
import { t } from '@/lib/i18n.ts';

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

// ---------- Boutons ----------
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', block, loading, icon, className, children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', className)} {...rest}>
      {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { label: string; small?: boolean }
/** Bouton réduit à une icône : `label` est obligatoire pour l'accessibilité. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, small, className, children, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} aria-label={label} title={label} className={cx('icon-btn', small && 'sm', className)} {...rest}>{children}</button>;
});

// ---------- Champs ----------
interface FieldProps { label: string; hint?: string; error?: string | null; children: (id: string) => ReactNode }
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('input', className)} {...rest} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('textarea', className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cx('select', className)} {...rest} />;
});
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)} />;
}
/** Ligne de réglage : titre, description et interrupteur. */
export function SettingRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="row between" style={{ padding: '12px 0', gap: 16 }}>
      <div className="grow"><div style={{ fontWeight: 700 }}>{title}</div>{description && <div className="small muted">{description}</div>}</div>
      {children}
    </div>
  );
}

// ---------- États ----------
export function Spinner({ size = 22 }: { size?: number }) {
  return <span className="spinner" role="status" aria-label={t('core.loading')} style={{ width: size, height: size }} />;
}
export function Loading({ label }: { label?: string }) {
  return <div className="empty"><Spinner size={28} />{label && <p>{label}</p>}</div>;
}
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty">{icon}<h3>{title}</h3>{children && <p style={{ maxWidth: 420 }}>{children}</p>}{action}</div>;
}
export function Notice({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  return <div className={cx('notice', kind !== 'info' && kind)} role={kind === 'danger' ? 'alert' : 'note'}>{kind === 'info' ? <Info /> : <AlertCircle />}<div>{children}</div></div>;
}
export function Badge({ kind, children }: { kind?: 'accent' | 'info' | 'success' | 'danger'; children: ReactNode }) {
  return <span className={cx('badge', kind)}>{children}</span>;
}
/** Barre de progression : `value` et `max` doivent refléter un travail réellement effectué. */
export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}><i style={{ width: `${pct}%` }} /></div>;
}

// ---------- Avatar ----------
export function useMediaUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (id) mediaUrl(id).then(u => { if (alive) setUrl(u); }).catch(() => { /* média indisponible : on garde le repli */ });
    return () => { alive = false; };
  }, [id]);
  return url;
}
const HUES = [42, 200, 340, 160, 265, 20];
export function Avatar({ name, mediaId, size = 40 }: { name: string; mediaId?: string | null; size?: number }) {
  const url = useMediaUrl(mediaId);
  const hue = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span className="avatar" aria-hidden style={{ width: size, height: size, fontSize: size * 0.4, background: url ? undefined : `hsl(${hue} 45% 32%)`, color: '#fff' }}>
      {url ? <img src={url} alt="" /> : (name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

// ---------- Onglets ----------
export interface TabItem<T extends string> { id: T; label: string; icon?: ReactNode; count?: number }
export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map(item => (
        <button key={item.id} role="tab" type="button" aria-selected={item.id === value} className="tab" onClick={() => onChange(item.id)}>
          {item.icon}{item.label}{item.count ? <span className="badge accent">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ---------- Fenêtres ----------
interface DialogProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }
export function Dialog({ open, onClose, title, children, footer, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} className={cx('dialog', wide && 'wide')} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="dialog-head"><h2>{title}</h2><IconButton label={t('core.close')} onClick={onClose}><X /></IconButton></div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>
  );
}

interface ConfirmRequest { title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
let confirmState: ConfirmRequest | null = null;
const confirmSubs = new Set<() => void>();
/** Demande une confirmation : `if (await confirm({ title, message, danger: true })) …` */
export function confirm(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise(resolve => {
    confirmState?.resolve(false);
    confirmState = { ...req, resolve };
    confirmSubs.forEach(fn => fn());
  });
}

interface ToastItem { id: number; kind: 'info' | 'success' | 'error'; text: string }
let toasts: ToastItem[] = [];
let toastId = 0;
const toastSubs = new Set<() => void>();
function push(kind: ToastItem['kind'], text: string): void {
  const item = { id: ++toastId, kind, text };
  toasts = [...toasts.slice(-3), item];
  toastSubs.forEach(fn => fn());
  setTimeout(() => { toasts = toasts.filter(x => x !== item); toastSubs.forEach(fn => fn()); }, kind === 'error' ? 6500 : 3500);
}
export const toast = {
  info: (text: string) => push('info', text),
  success: (text: string) => push('success', text),
  /** Accepte une erreur attrapée : affiche son message. */
  error: (err: unknown) => push('error', err instanceof Error ? err.message : String(err)),
};

/** À monter une seule fois à la racine : affiche les confirmations et les messages. */
export function Overlays() {
  const req = useSyncExternalStore(fn => { confirmSubs.add(fn); return () => confirmSubs.delete(fn); }, () => confirmState);
  const list = useSyncExternalStore(fn => { toastSubs.add(fn); return () => toastSubs.delete(fn); }, () => toasts);
  const answer = (ok: boolean) => { req?.resolve(ok); confirmState = null; confirmSubs.forEach(fn => fn()); };
  return (
    <>
      <Dialog open={!!req} onClose={() => answer(false)} title={req?.title ?? ''}
        footer={<><Button onClick={() => answer(false)}>{t('core.cancel')}</Button><Button variant={req?.danger ? 'danger' : 'primary'} onClick={() => answer(true)} autoFocus>{req?.confirmLabel ?? t('core.confirm')}</Button></>}>
        <p className="muted">{req?.message}</p>
      </Dialog>
      <div className="toasts" aria-live="polite">
        {list.map(item => (
          <div key={item.id} className={cx('toast', item.kind)} role={item.kind === 'error' ? 'alert' : 'status'}>
            {item.kind === 'error' ? <AlertCircle /> : item.kind === 'success' ? <CheckCircle2 /> : <Info />}{item.text}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Texte mis en forme ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
/** Convertit un Markdown simple en HTML sûr (tout le texte est échappé avant mise en forme). */
export function renderMarkdown(source: string): string {
  const out: string[] = [];
  const lines = source.replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i]!.startsWith('```'); i++) code.push(lines[i]!);
      i++;
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (/^#{1,4} /.test(line)) {
      const level = line.indexOf(' ');
      out.push(`<h${level + 1}>${inline(line.slice(level + 1))}</h${level + 1}>`);
      i++;
    } else if (/^\s*([-*]|\d+\.) /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line);
      const items: string[] = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i]!); i++) items.push(`<li>${inline(lines[i]!.replace(/^\s*([-*]|\d+\.) /, ''))}</li>`);
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
    } else if (line.startsWith('|') && lines[i + 1]?.startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i]!.startsWith('|'); i++) rows.push(lines[i]!.split('|').slice(1, -1).map(c => c.trim()));
      const body = rows.filter(r => !r.every(c => /^:?-+:?$/.test(c)));
      out.push(`<table><thead><tr>${body[0]!.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (line.trim() === '') {
      i++;
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i]!.trim() !== '' && !/^(#{1,4} |```|\s*([-*]|\d+\.) |\|)/.test(lines[i]!); i++) para.push(lines[i]!);
      out.push(`<p>${inline(para.join('\n')).replace(/\n/g, '<br>')}</p>`);
    }
  }
  return out.join('');
}
export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={cx('md', className)} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
