// Installable app (PWA): registers the service worker and exposes Chrome's install prompt.
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; listeners.forEach(f => f()); });
  addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()); });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* app still works without it */ }); });
  }
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(n => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const installed = typeof window !== 'undefined' && matchMedia('(display-mode: standalone)').matches;
  return {
    canInstall: !!deferred && !installed,
    installed,
    prompt: async () => { if (!deferred) return; await deferred.prompt(); deferred = null; force(n => n + 1); },
  };
}
