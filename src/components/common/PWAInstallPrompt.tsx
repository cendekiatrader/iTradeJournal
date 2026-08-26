import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in this session
    const dismissed = localStorage.getItem('itrade_pwa_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Chrome/Edge/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error during PWA install:', err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('itrade_pwa_dismissed', 'true');
  };

  // If already installed, dismissed, or not mobile/installable, hide
  if (isInstalled || isDismissed) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 850,
        maxWidth: '380px',
        backgroundColor: '#0c1326',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '16px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(59, 130, 246, 0.15)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e3a8a, #0b1329)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Smartphone size={22} color="#60a5fa" />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
          Install App di HP / Laptop
        </div>
        <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.35 }}>
          {isIOS ? (
            <span>Tap ikon <strong>Share [↑]</strong> lalu pilih <strong>Add to Home Screen</strong></span>
          ) : (
            <span>Akses cepat full-screen seperti aplikasi resmi tanpa browser!</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="btn btn-primary btn-sm"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-icon btn-sm"
          style={{ color: '#64748b', padding: '4px' }}
          title="Tutup"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
