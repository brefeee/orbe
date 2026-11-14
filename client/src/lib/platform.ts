/** Différences entre l'application installée (Tauri) et le navigateur. */
declare global { interface Window { __TAURI_INTERNALS__?: unknown } }

export const isTauri = (): boolean => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

/** Adresse du serveur ORBE. Vide = même origine (développement et version web). */
export const SERVER_URL: string = (import.meta.env.VITE_ORBE_SERVER ?? '').replace(/\/$/, '');

/** Dans l'application installée, une adresse de serveur doit avoir été fixée à la compilation. */
export const serverConfigured = (): boolean => !isTauri() || SERVER_URL !== '';

/** Ouvre une adresse dans le navigateur du système (connexion Google, liens externes). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  return `${isTauri() ? 'Application ORBE' : 'Navigateur'} · ${os}`;
}
