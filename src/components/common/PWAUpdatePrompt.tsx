import React, { useEffect, useRef } from 'react';
import { useJournal } from '../../context/JournalContext';

/**
 * Detects when a newer build has been deployed while this tab is open and
 * offers a one-click refresh. Works with the built app only (the service
 * worker is network-first, so a reload always picks up the new assets).
 */
export const PWAUpdatePrompt: React.FC = () => {
  const { showToast } = useJournal();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator)) return;

    let disposed = false;

    const checkForUpdate = async () => {
      try {
        const base = import.meta.env.BASE_URL || './';
        const res = await fetch(`${base}index.html?ts=${Date.now()}`, { cache: 'no-store' });
        const html = await res.text();
        const match = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
        if (!match || disposed) return;

        const currentScript = document.querySelector(
          'script[type="module"][src*="assets/index-"]'
        ) as HTMLScriptElement | null;
        const currentSrc = currentScript?.getAttribute('src') || '';

        if (currentSrc && !currentSrc.includes(match[0])) {
          if (notifiedRef.current) return;
          notifiedRef.current = true;
          showToast('A new version of iTradeJournal is available.', 'info', {
            label: 'Refresh',
            onClick: () => window.location.reload()
          });
        }
      } catch {
        /* offline or blocked — ignore */
      }
    };

    checkForUpdate();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [showToast]);

  return null;
};
