import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Download, Globe, LogOut, Network, Orbit, Search, Sparkles } from 'lucide-react';
import { api, ApiError, apiUrl, getToken } from '@/lib/api.ts';
import { LOCALE_NAMES, LOCALES, setLocale, useLocale, useT, type Locale } from '@/lib/i18n.ts';
import { useSession } from '@/lib/session.tsx';
import { Button, Field, Input, Loading, Markdown, Notice, Select, Tabs, toast } from '@/ui/index.tsx';
import { Logo } from './Logo.tsx';
import './shell.css';

type Doc = 'terms' | 'privacy' | 'license';

function LanguagePicker() {
  const t = useT();
  const locale = useLocale();
  return (
    <label className="row lang-picker"><Globe size={16} aria-hidden /><span className="sr-only">{t('core.welcome.language')}</span>
      <Select value={locale} onChange={e => setLocale(e.target.value as Locale)} aria-label={t('core.welcome.language')}>
        {LOCALES.map(l => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
      </Select>
    </label>
  );
}

/** Les documents légaux restent lisibles sans compte et sans accord. */
function LegalDocs() {
  const t = useT();
  const locale = useLocale();
  const [doc, setDoc] = useState<Doc>('terms');
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setText(null);
    api.get<{ markdown: string }>(`/api/legal/${doc}?lang=${locale}`).then(r => { if (alive) setText(r.markdown); }).catch(err => { if (alive) setText(`*${(err as Error).message}*`); });
    return () => { alive = false; };
  }, [doc, locale]);
  return (
    <div className="col">
      <Tabs label={t('core.terms.title')} value={doc} onChange={setDoc} items={[
        { id: 'terms', label: t('core.terms.terms') }, { id: 'privacy', label: t('core.terms.privacy') }, { id: 'license', label: t('core.terms.license') }]} />
      <div className="legal scroll" tabIndex={0}>{text === null ? <Loading /> : <Markdown source={text} />}</div>
    </div>
  );
}

function AuthForm({ onBack }: { onBack: () => void }) {
  const t = useT();
  const session = useSession();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [google, setGoogle] = useState<AbortController | null>(null);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', handle: '' });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));
  useEffect(() => () => google?.abort(), [google]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await session.signup(form);
      else await session.login(form.email, form.password);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function withGoogle() {
    const ctl = new AbortController();
    setGoogle(ctl);
    setError(null);
    try { await session.loginWithGoogle(ctl.signal); }
    catch (err) { if ((err as Error).name !== 'AbortError') setError((err as Error).message); }
    finally { setGoogle(null); }
  }

  if (google) {
    return (
      <div className="col auth-card fade-up" style={{ textAlign: 'center', alignItems: 'center' }}>
        <Loading /><p className="muted">{t('core.auth.google.waiting')}</p>
        <Button onClick={() => google.abort()}>{t('core.cancel')}</Button>
      </div>
    );
  }
  const googleReady = session.providers?.google.configured;
  return (
    <form className="col auth-card fade-up" onSubmit={submit}>
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}><ArrowLeft />{t('core.back')}</button>
      <div><h2>{t(mode === 'signup' ? 'core.auth.signup' : 'core.auth.login')}</h2><p className="muted small">{t(`core.auth.subtitle.${mode}`)}</p></div>
      {googleReady && <>
        <Button size="lg" block onClick={withGoogle} icon={<GoogleMark />}>{t('core.auth.google')}</Button>
        <div className="divider"><span>{t('core.or')}</span></div>
      </>}
      {mode === 'signup' && <>
        <Field label={t('core.auth.displayName')}>{id => <Input id={id} value={form.displayName} onChange={set('displayName')} required minLength={2} maxLength={40} autoComplete="name" />}</Field>
        <Field label={t('core.auth.handle')} hint={t('core.auth.handle.hint')}>{id => <Input id={id} value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))} required minLength={3} maxLength={24} autoComplete="username" autoCapitalize="none" />}</Field>
      </>}
      <Field label={t('core.auth.email')}>{id => <Input id={id} type="email" value={form.email} onChange={set('email')} required autoComplete="email" />}</Field>
      <Field label={t('core.auth.password')} hint={mode === 'signup' ? t('core.auth.password.hint') : undefined}>{id => <Input id={id} type="password" value={form.password} onChange={set('password')} required minLength={mode === 'signup' ? 10 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />}</Field>
      {error && <Notice kind="danger">{error}</Notice>}
      <Button type="submit" variant="primary" size="lg" block loading={busy}>{t(mode === 'signup' ? 'core.auth.signup' : 'core.auth.login')}</Button>
      <button type="button" className="btn btn-ghost" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }}>{t(mode === 'signup' ? 'core.auth.have' : 'core.auth.new')}</button>
      {!googleReady && <p className="faint small" style={{ textAlign: 'center' }}>{t('core.auth.google.unavailable')}</p>}
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.100-3.1-.400-4.5H24v9h12.4c-.500 2.9-2.2 5.3-4.6 6.9l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.3z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.300-3.1.700-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.900 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Première ouverture : accueil → conditions → création de compte ou connexion. */
export function Onboarding() {
  const t = useT();
  const [step, setStep] = useState<'welcome' | 'terms' | 'refused' | 'auth'>('welcome');
  const features = [
    { icon: <Sparkles />, text: t('core.welcome.ia'), name: 'ORBE IA' }, { icon: <Orbit />, text: t('core.welcome.carte'), name: 'ORBE CARTE' },
    { icon: <Network />, text: t('core.welcome.reseau'), name: 'ORBE RÉSEAU' }, { icon: <Search />, text: t('core.welcome.recherche'), name: 'ORBE RECHERCHE' },
  ];
  return (
    <div className="onboarding">
      <div className="onboarding-sky" aria-hidden />
      <header className="row between onboarding-top"><div className="row brand"><Logo size={30} /><strong>ORBE</strong></div><LanguagePicker /></header>
      <main className="onboarding-main">
        {step === 'welcome' && (
          <div className="col welcome fade-up">
            <Logo size={92} />
            <h1>ORBE</h1>
            <p className="lead">{t('core.welcome.tagline')}</p>
            <ul className="features">{features.map(f => <li key={f.name}>{f.icon}<div><strong>{f.name}</strong><span>{f.text}</span></div></li>)}</ul>
            <Button variant="primary" size="lg" onClick={() => setStep('terms')}>{t('core.welcome.start')}</Button>
          </div>
        )}
        {step === 'terms' && (
          <div className="col auth-card wide fade-up">
            <div><h2>{t('core.terms.title')}</h2><p className="muted small">{t('core.terms.intro')}</p></div>
            <LegalDocs />
            <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => setStep('refused')}>{t('core.terms.refuse')}</Button>
              <Button variant="primary" onClick={() => setStep('auth')}>{t('core.terms.accept')}</Button>
            </div>
          </div>
        )}
        {step === 'refused' && (
          <div className="col auth-card wide fade-up">
            <h2>{t('core.terms.refused.title')}</h2>
            <Notice kind="warn">{t('core.terms.refused.text')}</Notice>
            <LegalDocs />
            <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" onClick={() => setStep('terms')}>{t('core.terms.review')}</Button></div>
          </div>
        )}
        {step === 'auth' && <AuthForm onBack={() => setStep('terms')} />}
      </main>
    </div>
  );
}

/** Compte connecté dont l'accord manque (nouveau compte Google, ou conditions mises à jour). */
export function TermsGate() {
  const t = useT();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  async function exportData() {
    try {
      const res = await fetch(apiUrl('/api/me/export'), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new ApiError(res.status, 'export', t('core.offline.text'));
      const url = URL.createObjectURL(await res.blob());
      link.current!.href = url;
      link.current!.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) { toast.error(err); }
  }
  return (
    <div className="onboarding">
      <div className="onboarding-sky" aria-hidden />
      <header className="row between onboarding-top"><div className="row brand"><Logo size={30} /><strong>ORBE</strong></div><LanguagePicker /></header>
      <main className="onboarding-main">
        <div className="col auth-card wide fade-up">
          <h2>{t(refused ? 'core.terms.refused.title' : 'core.terms.title')}</h2>
          <Notice kind={refused ? 'warn' : 'info'}>{refused ? `${t('core.terms.refused.text')} ${t('core.terms.refused.account')}` : t('core.terms.updated')}</Notice>
          <LegalDocs />
          <div className="row wrap between">
            <div className="row wrap">
              <Button variant="ghost" icon={<LogOut />} onClick={() => void session.logout()}>{t('core.account.logout')}</Button>
              <Button variant="ghost" icon={<Download />} onClick={exportData}>{t('core.terms.export')}</Button>
              <a ref={link} download="orbe-export.json" hidden />
            </div>
            <div className="row">
              {!refused && <Button onClick={() => setRefused(true)}>{t('core.terms.refuse')}</Button>}
              <Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await session.acceptTerms(); } catch (err) { toast.error(err); } finally { setBusy(false); } }}>{t('core.terms.accept')}</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
