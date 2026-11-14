import { HashRouter } from 'react-router-dom';
import { ServerCrash } from 'lucide-react';
import { useT } from '@/lib/i18n.ts';
import { serverConfigured } from '@/lib/platform.ts';
import { SessionProvider, useSession } from '@/lib/session.tsx';
import { Button, EmptyState, Loading, Overlays } from '@/ui/index.tsx';
import { Onboarding, TermsGate } from '@/shell/Onboarding.tsx';
import { Shell } from '@/shell/Shell.tsx';

function Gate() {
  const t = useT();
  const { status, retry } = useSession();
  if (!serverConfigured()) return <EmptyState icon={<ServerCrash />} title={t('core.noserver.title')}>{t('core.noserver.text')}</EmptyState>;
  if (status === 'loading') return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Loading /></div>;
  if (status === 'offline') return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><EmptyState icon={<ServerCrash />} title={t('core.offline.title')} action={<Button variant="primary" onClick={retry}>{t('core.retry')}</Button>}>{t('core.offline.text')}</EmptyState></div>;
  if (status === 'guest') return <Onboarding />;
  if (status === 'terms') return <TermsGate />;
  return <Shell />;
}

export default function App() {
  return (
    <SessionProvider>
      <HashRouter><Gate /></HashRouter>
      <Overlays />
    </SessionProvider>
  );
}
