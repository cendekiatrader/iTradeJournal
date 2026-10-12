import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  CheckCircle2,
  Flag,
  Radio,
  ShieldOff,
  Users
} from 'lucide-react';
import {
  REPORT_REASONS,
  fetchProviderPublic,
  fmtNum,
  fmtPct,
  fmtRelative,
  reportProvider,
  type CopyProviderDetail
} from '../../utils/copytrade';
import { EmptyNote, CopyPageShell, SectionHead, StatTile } from './ui';

interface ProviderProfileViewProps {
  slug: string;
  onNavigate: (slug: string | null) => void;
  onBackToApp: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  signedIn: boolean;
}

export const ProviderProfileView: React.FC<ProviderProfileViewProps> = ({
  slug,
  onNavigate,
  onBackToApp,
  onOpenAuth,
  signedIn
}) => {
  const [detail, setDetail] = useState<CopyProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactive, setInactive] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const res = await fetchProviderPublic(slug);
      if (!alive) return;
      setDetail(res.detail);
      setInactive(res.missing && !res.detail);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const sendReport = async () => {
    setReportState('sending');
    setReportError(null);
    const res = await reportProvider({ slug, reason, detail: note.trim() });
    if (res.ok) {
      setReportState('sent');
      setNote('');
      return;
    }
    setReportError(res.error || 'Could not send the report');
    setReportState('error');
  };

  const provider = detail?.provider;

  return (
    <CopyPageShell
      onHome={() => onNavigate(null)}
      onBackToApp={onBackToApp}
      signedIn={signedIn}
      onCreateAccount={() => onOpenAuth('signup')}
    >
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onNavigate(null)}
        style={{ marginBottom: 18 }}
      >
        <ArrowLeft size={15} /> All providers
      </button>

      {loading ? (
        <div className="ct-grid" style={{ gap: 10 }}>
          <div className="ct-skel" style={{ height: 96 }} />
          <div className="ct-skel" style={{ height: 72 }} />
        </div>
      ) : !provider ? (
        <EmptyNote warn={inactive}>
          {inactive
            ? 'CopyTrade is not active on this deployment yet - the database migration (supabase_copytrade.sql) has not been run.'
            : `No provider found for “${slug}”. The handle may have changed or the provider was removed.`}
        </EmptyNote>
      ) : (
        <>
          <div className="ct-card">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                className="ct-dl-icon"
                style={{ width: 56, height: 56, fontSize: '1.3rem', fontWeight: 800 }}
                aria-hidden
              >
                {(provider.displayName || provider.slug).slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <h1 className="ct-h1" style={{ fontSize: '1.55rem', margin: '0 0 6px' }}>
                  {provider.displayName}
                  {provider.isVerified && (
                    <BadgeCheck
                      size={17}
                      style={{ marginLeft: 7, verticalAlign: '-3px', color: 'var(--accent-blue)' }}
                    />
                  )}
                </h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="ct-pill ct-pill-off">@{provider.slug}</span>
                  <span className={`ct-pill ${provider.eaOnline ? 'ct-pill-ok' : 'ct-pill-warn'}`}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 99,
                        background: provider.eaOnline ? 'var(--profit-green)' : 'var(--accent-amber)'
                      }}
                    />
                    terminal {provider.eaOnline ? 'online' : `last seen ${fmtRelative(provider.lastSeen)}`}
                  </span>
                  <span className="ct-pill ct-pill-off">
                    <Users size={12} /> {provider.followers} follower{provider.followers === 1 ? '' : 's'}
                  </span>
                </div>
                {provider.bio && (
                  <p className="ct-step-d" style={{ marginTop: 10, fontSize: '0.9rem' }}>
                    {provider.bio}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (signedIn ? onBackToApp() : onOpenAuth('signup'))}
                >
                  <ArrowLeftRight size={16} /> {signedIn ? 'Copy in dashboard' : 'Sign up to copy'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setReportOpen((v) => !v)}>
                  <Flag size={15} /> Report
                </button>
              </div>
            </div>
          </div>

          {!provider.eaOnline && (
            <div style={{ marginTop: 14 }}>
              <EmptyNote warn>
                This provider's terminal is not reporting right now. New entries will not appear, and - more
                importantly - if a position is open, its exit instruction cannot be sent either. Your own positions
                keep the stop loss and take profit that were set when they opened.
              </EmptyNote>
            </div>
          )}

          <div className="ct-grid ct-grid-4" style={{ marginTop: 14 }}>
            <StatTile value={provider.trades} label="Closed trades" />
            <StatTile value={fmtPct(provider.winrate)} label="Win rate" />
            <StatTile value={fmtNum(provider.avgRr)} label="Avg R:R" />
            <StatTile value={fmtNum(provider.maxDdPoints, 2)} label="Max DD (pts)" color="var(--loss-red)" />
          </div>

          {reportOpen && (
            <div className="ct-card" style={{ marginTop: 14 }}>
              {reportState === 'sent' ? (
                <div className="ct-note">
                  <CheckCircle2 size={17} style={{ flex: 'none', color: 'var(--profit-green)' }} />
                  <span>Report received. The admin team reviews every report before taking action.</span>
                </div>
              ) : (
                <>
                  <div className="ct-step-t" style={{ marginBottom: 10 }}>
                    <ShieldOff size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-amber)' }} />
                    Report @{provider.slug}
                  </div>
                  <div className="ct-form">
                    <div>
                      <label className="ct-label" htmlFor="ct-report-reason">
                        Reason
                      </label>
                      <select
                        id="ct-report-reason"
                        className="input-control"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      >
                        {REPORT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="ct-label" htmlFor="ct-report-note">
                        What happened
                      </label>
                      <textarea
                        id="ct-report-note"
                        className="input-control"
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Dates, symbols, screenshots described in text - anything that helps us check."
                      />
                    </div>
                    {reportError && (
                      <div className="ct-note ct-note-warn">
                        <AlertTriangle size={16} />
                        <span>{reportError}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={reportState === 'sending'}
                        onClick={sendReport}
                      >
                        {reportState === 'sending' ? 'Sending…' : 'Send report'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setReportOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <section className="ct-section">
            <SectionHead
              title="Open positions"
              subtitle="Straight from the provider terminal snapshot. These are the trades followers are mirroring right now."
            />
            {detail.openPositions.length === 0 ? (
              <EmptyNote>No open positions at the moment.</EmptyNote>
            ) : (
              <div className="ct-table-wrap">
                <table className="ct-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Volume</th>
                      <th>Entry</th>
                      <th>Stop loss</th>
                      <th>Take profit</th>
                      <th>Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.openPositions.map((p, i) => (
                      <tr key={`${p.symbol}-${i}`} style={{ cursor: 'default' }}>
                        <td className="ct-name">{p.symbol}</td>
                        <td style={{ color: p.side === 'buy' ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 700 }}>
                          {p.side}
                        </td>
                        <td>{fmtNum(p.volume, 2)}</td>
                        <td>{fmtNum(p.entry, 5)}</td>
                        <td style={{ color: p.sl ? 'var(--loss-red)' : 'var(--text-muted)' }}>
                          {p.sl ? fmtNum(p.sl, 5) : 'none'}
                        </td>
                        <td style={{ color: p.tp ? 'var(--profit-green)' : 'var(--text-muted)' }}>
                          {p.tp ? fmtNum(p.tp, 5) : 'none'}
                        </td>
                        <td>{fmtRelative(p.openedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="ct-section">
            <SectionHead
              title="Recent closed trades"
              subtitle="Published so you can judge the provider on their own history, not on a marketing screenshot."
            />
            {detail.recent.length === 0 ? (
              <EmptyNote>No closed trades published yet.</EmptyNote>
            ) : (
              <div className="ct-table-wrap">
                <table className="ct-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Volume</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recent.map((p, i) => (
                      <tr key={`${p.symbol}-c-${i}`} style={{ cursor: 'default' }}>
                        <td className="ct-name">{p.symbol}</td>
                        <td style={{ color: p.side === 'buy' ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 700 }}>
                          {p.side}
                        </td>
                        <td>{fmtNum(p.volume, 2)}</td>
                        <td>{fmtNum(p.entry, 5)}</td>
                        <td>{p.exit === null ? '-' : fmtNum(p.exit, 5)}</td>
                        <td>{fmtRelative(p.closedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="ct-note" style={{ marginTop: 22 }}>
            <Radio size={17} style={{ flex: 'none', color: 'var(--accent-amber)' }} />
            <span>
              Following this provider mirrors entries <em>and</em> exits, including stop-loss moves and partial closes.
              Your position size is not their size - it is calculated from your balance and your risk percentage, so
              the equity curve you see here is not what you will get.
            </span>
          </div>
        </>
      )}
    </CopyPageShell>
  );
};

export default ProviderProfileView;
