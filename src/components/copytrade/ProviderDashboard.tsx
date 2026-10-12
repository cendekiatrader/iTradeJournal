import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  TrendingUp,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import {
  EA_FILES,
  closeAllProviderPositions,
  createEaToken,
  fetchProviderPanel,
  fmtNum,
  fmtPct,
  fmtRelative,
  isEaOnline,
  respondFollow,
  revokeEaToken,
  type EaTokenRow,
  type Follower,
  type ProviderPanel
} from '../../utils/copytrade';
import { useConfirm } from '../common/ConfirmDialog';
import { useJournal } from '../../context/JournalContext';
import { EmptyNote, SectionHead, StatTile } from './ui';

/**
 * Provider dashboard.
 *
 * Priority one on this screen is the provider's own terminal status: with a
 * mirror model, a terminal that stops reporting does not just miss entries, it
 * also stops sending the EXITS - every follower is left holding whatever was
 * open. That is why the offline state is a full-width warning, not a badge.
 */

interface ProviderDashboardProps {
  signedIn: boolean;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenPublic: () => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ signedIn, onOpenAuth, onOpenPublic }) => {
  const { showToast } = useJournal();
  const { confirm } = useConfirm();
  const [panel, setPanel] = useState<ProviderPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenLabel, setTokenLabel] = useState('my provider terminal');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await fetchProviderPanel();
    setPanel(res);
    setLoading(false);
  };

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const providerTokens = (panel?.tokens || []).filter((t) => t.role !== 'CLIENT' && t.active);
  const onlineToken =
    providerTokens
      .filter((t) => isEaOnline(t.lastSeen))
      .sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)))[0] || null;
  const lastSeen = providerTokens
    .map((t) => t.lastSeen)
    .filter(Boolean)
    .sort()
    .reverse()[0] as string | undefined;

  const onRespond = async (f: Follower, accept: boolean) => {
    const res = await respondFollow(f.id, accept);
    if (!res.ok) return showToast(res.error || 'Could not answer the request', 'error');
    showToast(accept ? 'Follower accepted - their EA can copy from now on.' : 'Request rejected.', 'success');
    await refresh();
  };

  const onCloseAll = async (providerId: string) => {
    const ok = await confirm({
      title: 'Close every follower position now?',
      message:
        'A CLOSE_ALL event goes out to every active follower for this provider. Their terminals close the mirrored positions on their next poll. Positions they opened themselves are not touched.',
      confirmText: 'Close all positions',
      variant: 'danger'
    });
    if (!ok) return;
    const res = await closeAllProviderPositions(providerId);
    if (!res.ok) return showToast(res.error || 'Could not send the close-all', 'error');
    showToast('Close-all sent to your followers.', 'success');
    await refresh();
  };

  const onGenerate = async () => {
    setBusy(true);
    const res = await createEaToken({ role: 'PROVIDER', label: tokenLabel });
    setBusy(false);
    if (!res.ok || !res.token) return showToast(res.error || 'Could not create the token', 'error');
    setNewToken(res.token);
    await refresh();
  };

  const onRevoke = async (t: EaTokenRow) => {
    const ok = await confirm({
      title: `Revoke “${t.label}”?`,
      message: 'This terminal stops publishing immediately and your followers stop receiving anything from it.',
      confirmText: 'Revoke token',
      variant: 'danger'
    });
    if (!ok) return;
    const res = await revokeEaToken(t.id);
    if (!res.ok) return showToast(res.error || 'Could not revoke', 'error');
    showToast('Token revoked.', 'success');
    await refresh();
  };

  if (!signedIn) {
    return (
      <EmptyNote>
        Sign in to publish your trades and manage followers.{' '}
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => onOpenAuth('signin')}>
          Sign in
        </button>
      </EmptyNote>
    );
  }

  if (loading) {
    return (
      <div className="ct-grid" style={{ gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="ct-skel" />
        ))}
      </div>
    );
  }

  if (panel?.missing) {
    return (
      <EmptyNote warn>
        CopyTrade is not active on this deployment yet - run <code className="ct-inline-code">supabase_copytrade.sql</code> in
        the Supabase SQL editor, then reload.
      </EmptyNote>
    );
  }

  if (!panel?.slug) {
    return (
      <div className="ct-card">
        <div className="ct-step-t" style={{ marginBottom: 8 }}>
          <Radio size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-amber)' }} />
          You are not a provider yet
        </div>
        <div className="ct-step-d" style={{ marginBottom: 14 }}>
          Provider accounts are self-serve: fill in a display name and a handle, and your public page goes live
          immediately. You will need to keep a MetaTrader 5 terminal online around the clock - followers depend on it for
          their exits, not just their entries.
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenPublic}>
          Register as provider
        </button>
      </div>
    );
  }

  const stats = (panel.stats || {}) as Record<string, any>;
  const providerId = panel.followers[0]?.providerId || '';

  return (
    <div>
      {/* 1. terminal sendiri */}
      <div style={{ marginBottom: 14 }}>
        {onlineToken ? (
          <div className="ct-note" style={{ borderLeft: '3px solid var(--profit-green)' }}>
            <CheckCircle2 size={17} style={{ flex: 'none', color: 'var(--profit-green)' }} />
            <span>
              <strong>Your terminal is online.</strong> Last heartbeat {fmtRelative(onlineToken.lastSeen)} - entries and
              exits are flowing to your {panel.followers.length} active follower
              {panel.followers.length === 1 ? '' : 's'}.
            </span>
          </div>
        ) : (
          <div className="ct-note ct-note-warn" style={{ borderLeft: '3px solid var(--loss-red)' }}>
            <AlertTriangle size={18} style={{ flex: 'none', color: 'var(--loss-red)' }} />
            <span>
              <strong>Your terminal is offline.</strong> Nothing is being published right now: your followers get no new
              entries <em>and</em> - more importantly - no exit instructions. Any position they hold has only the stop
              loss and take profit that were attached when it opened. Start MT5 (or the VPS it runs on) and check that
              Algo Trading is still on.{' '}
              {lastSeen ? `Last heartbeat: ${fmtRelative(lastSeen)}.` : 'No heartbeat has ever been received for your token.'}
            </span>
          </div>
        )}
      </div>

      {panel.isSuspended && (
        <div style={{ marginBottom: 14 }}>
          <EmptyNote warn>
            Your provider account is suspended - the fan-out is cut, so nothing you publish reaches followers until an
            admin lifts it. Reply to the report if you think this is a mistake.
          </EmptyNote>
        </div>
      )}

      {/* 2. statistik */}
      <div className="ct-grid ct-grid-4">
        <StatTile value={stats.trades ?? 0} label="Closed trades" />
        <StatTile value={stats.winrate === null || stats.winrate === undefined ? '-' : fmtPct(Number(stats.winrate))} label="Win rate" />
        <StatTile value={stats.avg_rr === null || stats.avg_rr === undefined ? '-' : fmtNum(Number(stats.avg_rr))} label="Avg R:R" />
        <StatTile
          value={fmtNum(Number(stats.max_drawdown_points ?? 0), 2)}
          label="Max DD (price points)"
          color="var(--loss-red)"
        />
      </div>
      <div className="ct-step-d" style={{ marginTop: 8 }}>
        Figures are computed from the positions your EA published ({stats.wins ?? 0} wins / {stats.losses ?? 0} losses,{' '}
        {fmtNum(Number(stats.total_points ?? 0), 2)} points total). They are in price points, not currency - followers size
        their own lots, so points are the only number that means the same thing for everyone.
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refresh()}>
          <RefreshCw size={14} /> Refresh
        </button>
        <a className="btn btn-secondary btn-sm" href={EA_FILES[0].href} download>
          <Server size={14} /> Download the EA
        </a>
      </div>

      {/* 3. permintaan follow */}
      <section className="ct-section" style={{ marginTop: 26 }}>
        <SectionHead
          title="Follow requests"
          subtitle="Nobody can copy you until you accept. Accepting means their EA starts mirroring your next trade."
        />
        {panel.pending.length === 0 ? (
          <EmptyNote>No pending requests.</EmptyNote>
        ) : (
          <div className="ct-grid" style={{ gap: 10 }}>
            {panel.pending.map((f) => (
              <div key={f.id} className="ct-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <div className="ct-step-t">Follower {f.clientId.slice(0, 8)}…</div>
                  <div className="ct-step-d">
                    Asked {fmtRelative(f.updatedAt)}
                    {f.requestedBy === 'provider' ? ' (added by you)' : ''}
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void onRespond(f, true)}>
                  <UserCheck size={14} /> Accept
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onRespond(f, false)}>
                  <UserX size={14} /> Reject
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. follower aktif */}
      <section className="ct-section" style={{ marginTop: 30 }}>
        <SectionHead
          title="Followers"
          subtitle="Their risk percentage is their own decision - you only control what you trade. An offline terminal here hurts them, not you."
        />
        {panel.followers.length === 0 ? (
          <EmptyNote>No active followers yet.</EmptyNote>
        ) : (
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Their risk / trade</th>
                  <th>Max total risk</th>
                  <th>Sizing base</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {panel.followers.map((f) => (
                  <tr key={f.id} style={{ cursor: 'default' }}>
                    <td className="ct-name">
                      {f.clientId.slice(0, 8)}…
                      <small>{f.runtimeState?.kill_switch ? 'kill switch ON' : 'kill switch off'}</small>
                    </td>
                    <td>
                      <span className={`ct-pill ${f.status === 'active' ? 'ct-pill-ok' : 'ct-pill-warn'}`}>{f.status}</span>
                    </td>
                    <td>{fmtNum(f.settings.sizing.riskPct, 2)}%</td>
                    <td>{fmtNum(f.settings.limits.maxTotalRiskPct, 1)}%</td>
                    <td>{f.settings.sizing.basis}</td>
                    <td>{fmtRelative(f.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!providerId || panel.followers.length === 0}
            onClick={() => void onCloseAll(providerId)}
          >
            <ShieldAlert size={15} /> Close all follower positions
          </button>
          <span className="ct-step-d">
            Use it when you are stepping away: everything your followers mirror from you gets closed on their next poll.
          </span>
        </div>
      </section>

      {/* 5. token EA */}
      <section className="ct-section" style={{ marginTop: 30 }}>
        <SectionHead
          title="Publishing terminal"
          subtitle="Your EA only reads your own positions and publishes them - it never places orders. The server stores just the hash of this token."
        />

        {panel.tokens.filter((t) => t.role !== 'CLIENT').length > 0 && (
          <div className="ct-table-wrap" style={{ marginBottom: 14 }}>
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Terminal</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {panel.tokens
                  .filter((t) => t.role !== 'CLIENT')
                  .map((t) => (
                    <tr key={t.id} style={{ cursor: 'default' }}>
                      <td className="ct-name">{t.label}</td>
                      <td>{t.role}</td>
                      <td>
                        <span className={`ct-pill ${!t.active ? 'ct-pill-off' : isEaOnline(t.lastSeen) ? 'ct-pill-ok' : 'ct-pill-warn'}`}>
                          {!t.active ? 'revoked' : isEaOnline(t.lastSeen) ? 'online' : `last seen ${fmtRelative(t.lastSeen)}`}
                        </span>
                      </td>
                      <td>
                        {t.accountLogin ? `${t.accountLogin}${t.accountServer ? ` @ ${t.accountServer}` : ''}` : '-'}
                        {t.isDemo === true && <span className="ct-pill ct-pill-ok" style={{ marginLeft: 6 }}>DEMO</span>}
                        {t.isDemo === false && <span className="ct-pill ct-pill-bad" style={{ marginLeft: 6 }}>REAL</span>}
                      </td>
                      <td>
                        {t.active && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onRevoke(t)}>
                            <Trash2 size={14} /> Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {newToken ? (
          <div className="ct-card">
            <div className="ct-step-t" style={{ marginBottom: 8 }}>
              <KeyRound size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-amber)' }} />
              Copy this token now - it is shown once
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code className="ct-inline-code" style={{ wordBreak: 'break-all', flex: '1 1 260px' }}>
                {newToken}
              </code>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(newToken);
                  showToast('Token copied.', 'success');
                }}
              >
                Copy
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewToken(null)}>
                <X size={14} /> Close
              </button>
            </div>
            <div className="ct-step-d" style={{ marginTop: 10 }}>
              Set it as <code className="ct-inline-code">EaToken</code> in the EA inputs, with{' '}
              <code className="ct-inline-code">Role = PROVIDER</code>.
            </div>
          </div>
        ) : (
          <div className="ct-card">
            <div className="ct-grid" style={{ gap: 12 }}>
              <div>
                <label className="ct-label" htmlFor="ct-provider-token-label">
                  Terminal label
                </label>
                <input
                  id="ct-provider-token-label"
                  className="input-control"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                />
              </div>
              <div>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onGenerate()}>
                  <KeyRound size={15} /> {busy ? 'Generating…' : 'Generate provider token'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ct-card" style={{ marginTop: 14 }}>
          <div className="ct-step-t" style={{ marginBottom: 10 }}>
            <TrendingUp size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--theme-primary)' }} />
            What to publish, and how to install
          </div>
          <div className="ct-grid ct-grid-3">
            {[
              'Drop the EA into MT5 → File → Open Data Folder → MQL5 → Experts, then refresh the Navigator.',
              'Attach it to one chart, set Role = PROVIDER and paste your token.',
              'Allow the URL in Tools → Options → Expert Advisors and turn Algo Trading on. Keep the terminal running - a VPS is the sane way to promise that.'
            ].map((s, i) => (
              <div key={s} className="ct-step">
                <span className="ct-step-n">{i + 1}</span>
                <div className="ct-step-d">{s}</div>
              </div>
            ))}
          </div>
          <div className="ct-note" style={{ marginTop: 14 }}>
            <Radio size={17} style={{ flex: 'none', color: 'var(--accent-amber)' }} />
            <span>
              <code className="ct-inline-code">PublishMode</code> is an EA input, not a server setting:{' '}
              <strong>ALL</strong> publishes every position on the account (including trades you opened by hand),{' '}
              <strong>MAGIC_ONLY</strong> publishes only positions carrying the EA's magic number - use it if the account
              also runs other strategies.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProviderDashboard;
