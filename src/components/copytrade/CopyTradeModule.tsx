import React, { useEffect, useState } from 'react';
import { CopyStyles } from './ui';
import { ClientDashboard } from './ClientDashboard';
import { ProviderDashboard } from './ProviderDashboard';

/**
 * In-app CopyTrade module (sidebar tab `copytrade`).
 *
 * Deliberately separate from the PUBLIC pages at /copytrade and
 * /copytrade/provider/<slug>: those are early-return routes that render outside
 * the app shell for signed-out visitors, while this module is a normal tab with
 * the sidebar around it. Both render the same `.ct-*` design language, and
 * `CopyStyles` is mounted here once so the dashboards can reuse it.
 */

type SubTab = 'client' | 'provider';
const TAB_KEY = 'itrade_copytrade_tab_v1';

const readTab = (): SubTab => {
  try {
    return localStorage.getItem(TAB_KEY) === 'provider' ? 'provider' : 'client';
  } catch {
    return 'client';
  }
};

interface CopyTradeModuleProps {
  signedIn: boolean;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenPublic: () => void;
}

export const CopyTradeModule: React.FC<CopyTradeModuleProps> = ({ signedIn, onOpenAuth, onOpenPublic }) => {
  const [tab, setTab] = useState<SubTab>(readTab);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  return (
    <div>
      <CopyStyles />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 className="ct-h2" style={{ margin: 0 }}>
            CopyTrade
          </h2>
          <p className="ct-sub" style={{ margin: '2px 0 0' }}>
            Mirror an MT5 provider automatically, with your own risk percentage. Orders are placed by the EA on your
            terminal - never by this website.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenPublic}>
            Public pages
          </button>
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              borderRadius: 12,
              boxShadow: 'var(--neo-inset-sm)'
            }}
          >
            {(['client', 'provider'] as SubTab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className="btn btn-sm"
                style={{
                  background: 'transparent',
                  color: tab === id ? 'var(--theme-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  boxShadow: tab === id ? 'var(--neo-outset-sm)' : 'none'
                }}
              >
                {id === 'client' ? 'Client' : 'Signal Provider'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'client' ? (
        <ClientDashboard signedIn={signedIn} onOpenAuth={onOpenAuth} onOpenPublic={onOpenPublic} />
      ) : (
        <ProviderDashboard signedIn={signedIn} onOpenAuth={onOpenAuth} onOpenPublic={onOpenPublic} />
      )}
    </div>
  );
};

export default CopyTradeModule;
