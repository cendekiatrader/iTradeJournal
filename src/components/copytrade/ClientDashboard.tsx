import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  KeyRound,
  Pause,
  Play,
  Power,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  DEFAULT_COPY_SETTINGS,
  EA_FILES,
  RISK_PRESETS,
  createEaToken,
  estimateLots,
  fetchClientPositions,
  fetchMyClientLinks,
  fetchMyDeliveries,
  fetchMyEaTokens,
  fmtNum,
  fmtRelative,
  isEaOnline,
  mergeSettings,
  revokeEaToken,
  riskWarning,
  saveCopySettings,
  setKillSwitch,
  setLinkStatus,
  slugFromProviderRef,
  symbolValueHint,
  requestFollow,
  type CopySettings,
  type DeliveryRow,
  type EaTokenRow,
  type MyLink
} from '../../utils/copytrade';
import { useConfirm } from '../common/ConfirmDialog';
import { useJournal } from '../../context/JournalContext';
import { EmptyNote, SectionHead, StatTile } from './ui';

/**
 * Client dashboard: what I copy, at what risk, and whether my terminal is alive.
 *
 * Two things this screen must never obscure:
 *  - a paused / killed link (orders stop, open positions are left to their SL/TP)
 *  - a terminal that stopped reporting (no new entries AND no exits)
 */

interface ClientDashboardProps {
  signedIn: boolean;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenPublic: () => void;
}

/**
 * Numeric field without `type="number"`: Chromium reports "" for the interim
 * "-" / "12." keystrokes, so a controlled number input wipes the character the
 * user just typed. Raw text locally, a number pushed up only when it parses.
 */
const NumField: React.FC<{
  value: number;
  onChange: (n: number) => void;
  step?: string;
  min?: number;
  max?: number;
  ariaLabel: string;
}> = ({ value, onChange, step, min, max, ariaLabel }) => {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <input
      className="input-control"
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      step={step}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.');
        setText(raw);
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        const n = Number(text.replace(',', '.'));
        if (!Number.isFinite(n)) setText(String(value));
        else if (min !== undefined && n < min) {
          onChange(min);
          setText(String(min));
        } else if (max !== undefined && n > max) {
          onChange(max);
          setText(String(max));
        }
      }}
    />
  );
};

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="ct-label">{label}</label>
    {children}
    {hint && (
      <div className="ct-step-d" style={{ marginTop: 4 }}>
        {hint}
      </div>
    )}
  </div>
);

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ signedIn, onOpenAuth, onOpenPublic }) => {
  const { showToast } = useJournal();
  const { confirm } = useConfirm();

  const [links, setLinks] = useState<MyLink[]>([]);
  const [tokens, setTokens] = useState<EaTokenRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [positions, setPositions] = useState<Awaited<ReturnType<typeof fetchClientPositions>>>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [followInput, setFollowInput] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  const [followMsg, setFollowMsg] = useState<string | null>(null);
  const [followBad, setFollowBad] = useState(false);

  /** Kirim permintaan follow ke provider (satu-satunya jalan masuk ke CopyTrade). */
  const sendFollowRequest = async () => {
    const slug = slugFromProviderRef(followInput);
    if (!slug) return;
    setFollowBusy(true);
    const res = await requestFollow(slug);
    setFollowBusy(false);
    if (!res.ok) {
      setFollowBad(true);
      setFollowMsg(res.error || 'Could not send the request.');
      return;
    }
    setFollowBad(false);
    setFollowInput('');
    setFollowMsg(
      res.status === 'active'
        ? `You are already copying ${slug}.`
        : `Request sent to ${slug}. Your terminal stays idle until the provider accepts.`
    );
    await refresh();
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CopySettings>(DEFAULT_COPY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenLabel, setTokenLabel] = useState('my mt5 terminal');
  const [busy, setBusy] = useState(false);
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);
  const [calc, setCalc] = useState({ symbol: 'XAUUSD', stopDistance: '2.50', valuePerUnit: '100' });

  const refresh = async () => {
    const [linksRes, tok, del, pos] = await Promise.all([
      fetchMyClientLinks(),
      fetchMyEaTokens(),
      fetchMyDeliveries(60),
      fetchClientPositions()
    ]);
    setLinks(linksRes.links);
    setMissing(linksRes.missing);
    setLoadError(linksRes.error);
    setTokens(tok);
    setDeliveries(del);
    setPositions(pos);
    setLoading(false);
    return linksRes.links;
  };

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const selected = useMemo(() => links.find((l) => l.id === selectedId) || links[0] || null, [links, selectedId]);

  useEffect(() => {
    if (selected) {
      setDraft(mergeSettings(selected.settings));
      setConfirmHighRisk(false);
    }
  }, [selected?.id, selected?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const eaTokens = tokens.filter((t) => t.role !== 'PROVIDER');
  const onlineToken = eaTokens.filter((t) => t.active && isEaOnline(t.lastSeen)).sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)))[0] || null;
  const latestWithBalance = deliveries.find((d) => d.eaBalance !== null) || null;
  const warning = riskWarning(draft.sizing.riskPct);
  const inPageReason = draft.limits.maxTotalRiskPct; // referenced so the value is visible in the summary line
  const suggestions = links.filter((l) => l.status === 'pending');

  const patch = (section: keyof CopySettings, value: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, [section]: { ...(prev[section] as object), ...value } } as CopySettings));
  };

  const onSave = async () => {
    if (!selected) return;
    if (warning.level === 'danger' && draft.sizing.riskPct > 25 && !confirmHighRisk) {
      setConfirmHighRisk(true);
      showToast('Risk above 25% - confirm once more to save.', 'info');
      return;
    }
    setSaving(true);
    const res = await saveCopySettings(selected.id, draft);
    setSaving(false);
    if (!res.ok) {
      showToast(res.error || 'Could not save', 'error');
      return;
    }
    setConfirmHighRisk(false);
    showToast('Risk settings saved - the EA picks them up on its next poll.', 'success');
    await refresh();
  };

  const onToggleKill = async (link: MyLink, on: boolean) => {
    const ok = await confirm({
      title: on ? `Kill switch for ${link.providerName}?` : `Release the kill switch for ${link.providerName}?`,
      message: on
        ? 'New entries stop immediately. Positions already open are left alone and stay protected only by the stop loss / take profit that were placed when they opened.'
        : 'New entries resume on the next provider trade.',
      confirmText: on ? 'Kill switch on' : 'Release',
      variant: on ? 'danger' : 'info'
    });
    if (!ok) return;
    const res = await setKillSwitch(link.id, on);
    if (!res.ok) return showToast(res.error || 'Could not change the kill switch', 'error');
    showToast(on ? 'Kill switch ON - new entries stopped.' : 'Kill switch released.', 'success');
    await refresh();
  };

  const onTogglePause = async (link: MyLink, pause: boolean) => {
    const res = await setLinkStatus(link.id, pause ? 'paused' : 'active');
    if (!res.ok) return showToast(res.error || 'Could not change the status', 'error');
    showToast(pause ? 'Paused: no new deliveries are created for this link.' : 'Active again.', 'success');
    await refresh();
  };

  const onGenerate = async () => {
    setBusy(true);
    const res = await createEaToken({ role: 'CLIENT', label: tokenLabel });
    setBusy(false);
    if (!res.ok || !res.token) return showToast(res.error || 'Could not create the token', 'error');
    setNewToken(res.token);
    await refresh();
  };

  const onRevoke = async (t: EaTokenRow) => {
    const ok = await confirm({
      title: `Revoke “${t.label}”?`,
      message: 'That terminal loses access on its very next request. You can generate a new token any time.',
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
        Sign in to manage what you copy and how much you risk per trade.{' '}
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => onOpenAuth('signin')}>
          Sign in
        </button>
      </EmptyNote>
    );
  }

  const calcBalance = latestWithBalance?.eaBalance ?? 10000;
  const calcLots = estimateLots({
    balance: calcBalance,
    riskPct: draft.sizing.riskPct,
    stopDistance: Number(calc.stopDistance.replace(',', '.')),
    valuePerUnitPerLot: Number(calc.valuePerUnit.replace(',', '.'))
  });

  return (
    <div>
      {missing && (
        <div style={{ marginBottom: 14 }}>
          <EmptyNote warn>
            CopyTrade is not installed in this Supabase project yet - run{' '}
            <code className="ct-inline-code">supabase_copytrade.sql</code> in the SQL editor, then reload.
            {loadError && (
              <div className="ct-step-d" style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                {loadError}
              </div>
            )}
          </EmptyNote>
        </div>
      )}

      {/* 1. status ringkas */}
      <div className="ct-grid ct-grid-4" style={{ marginBottom: 14 }}>
        <StatTile
          value={links.filter((l) => l.status === 'active').length}
          label="Active links"
          color="var(--theme-primary)"
        />
        <StatTile
          value={positions.filter((p) => p.state === 'open').length}
          label="Mirrored positions"
        />
        <StatTile
          value={latestWithBalance?.eaBalance !== null && latestWithBalance ? `$${fmtNum(latestWithBalance.eaBalance, 2)}` : '-'}
          label="EA balance"
        />
        <StatTile
          value={onlineToken ? 'ONLINE' : eaTokens.length ? 'OFFLINE' : 'no token'}
          label="Terminal"
          color={onlineToken ? 'var(--profit-green)' : 'var(--loss-red)'}
        />
      </div>

      {!onlineToken && (
        <div style={{ marginBottom: 14 }}>
          <EmptyNote warn>
            <strong>Your terminal is not reporting.</strong> The EA has to be running for anything to happen: no terminal
            means no new entries and - just as important - no exit instructions. Positions already open keep the stop
            loss and take profit that were attached when they were opened.
          </EmptyNote>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refresh()}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenPublic}>
          Find providers
        </button>
      </div>

      {/* 1b. hubungkan ke provider - satu-satunya jalan masuk ke CopyTrade */}
      <div className="ct-card" style={{ marginBottom: 18 }}>
        <div className="ct-step-t" style={{ marginBottom: 6 }}>
          <UserPlus size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Copy a provider
        </div>
        <div className="ct-step-d" style={{ marginBottom: 10 }}>
          Paste the link a provider shared with you - or just their handle. They have to accept the request before
          anything is copied; until they do, your terminal stays idle.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input-control"
            style={{ flex: '1 1 280px' }}
            value={followInput}
            placeholder="https://…/copytrade/provider/gold-london  or  @gold-london"
            onChange={(e) => {
              setFollowInput(e.target.value);
              setFollowMsg(null);
              setFollowBad(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendFollowRequest();
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={followBusy || !slugFromProviderRef(followInput)}
            onClick={() => void sendFollowRequest()}
          >
            <UserPlus size={14} /> {followBusy ? 'Sending…' : 'Send request'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenPublic}>
            Browse providers
          </button>
        </div>
        {followInput.trim() !== '' && !slugFromProviderRef(followInput) && (
          <div className="ct-step-d" style={{ marginTop: 8 }}>
            That does not look like a provider link or handle yet (at least 3 characters, after that anything that is not
            a letter or a digit becomes a dash).
          </div>
        )}
        {followMsg && (
          <div className="ct-step-d" style={{ marginTop: 8, color: followBad ? 'var(--loss-red)' : undefined }}>
            {followMsg}
          </div>
        )}
      </div>

      {loading ? (
        <div className="ct-grid" style={{ gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="ct-skel" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <EmptyNote>
          You are not copying anyone yet. Open the public provider list, pick a trader, then come back here to set your
          risk percentage.
        </EmptyNote>
      ) : (
        <>
          {/* 2. daftar link */}
          <section className="ct-section" style={{ marginTop: 26 }}>
            <SectionHead
              title="What you copy"
              subtitle="Follow as many providers as you like. Every provider gets its own magic number, so its positions stay separate from yours and from each other."
            />
            <div className="ct-grid ct-grid-2">
              {links.map((link) => {
                const killed = Boolean(link.runtimeState?.kill_switch);
                const paused = link.status === 'paused';
                return (
                  <div key={link.id} className="ct-card">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.98rem' }}>{link.providerName}</strong>
                      <span className={`ct-pill ${link.status === 'active' ? 'ct-pill-ok' : link.status === 'pending' ? 'ct-pill-warn' : 'ct-pill-off'}`}>
                        {link.status}
                      </span>
                      {killed && (
                        <span className="ct-pill ct-pill-bad">
                          <Power size={11} /> kill switch
                        </span>
                      )}
                      <span className="ct-pill ct-pill-off" style={{ marginLeft: 'auto' }}>
                        risk {fmtNum(link.settings.sizing.riskPct, 2)}%
                      </span>
                    </div>
                    <div className="ct-step-d" style={{ marginTop: 8 }}>
                      @{link.providerSlug || 'unknown'} · updated {fmtRelative(link.updatedAt)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedId(link.id)}
                      >
                        <Gauge size={14} /> Risk settings
                      </button>
                      {link.status !== 'pending' && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onTogglePause(link, !paused)}>
                          {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume' : 'Pause'}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`btn btn-sm ${killed ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => void onToggleKill(link, !killed)}
                      >
                        <Power size={14} /> {killed ? 'Release' : 'Kill switch'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {suggestions.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <EmptyNote>
                {suggestions.length} follow request{suggestions.length > 1 ? 's are' : ' is'} still waiting for the
                provider to accept. Nothing is copied until then.
              </EmptyNote>
            </div>
          )}

          {/* 3. setelan risiko */}
          {selected && (
            <section className="ct-section" style={{ marginTop: 34 }}>
              <SectionHead
                title={`Risk settings — ${selected.providerName}`}
                subtitle="These values live on the link and are read by your EA every poll. The EA recalculates the lot with your broker's real tick value, so the preview below is an estimate."
              />

              <div className="ct-grid ct-grid-2">
                <div className="ct-card">
                  <div className="ct-step-t" style={{ marginBottom: 12 }}>
                    <Gauge size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--theme-primary)' }} />
                    Position sizing
                  </div>
                  <div className="ct-grid" style={{ gap: 12 }}>
                    <Row label="Risk per trade (%)" hint="There is no hard ceiling - the input is yours. The warnings exist so a typo cannot quietly cost a quarter of the account.">
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <NumField
                          ariaLabel="risk percent"
                          value={draft.sizing.riskPct}
                          onChange={(n) => patch('sizing', { riskPct: n })}
                          min={0}
                          max={100}
                        />
                        {RISK_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={draft.sizing.riskPct === p ? { boxShadow: 'var(--neo-inset-sm)', color: 'var(--theme-primary)' } : undefined}
                            onClick={() => patch('sizing', { riskPct: p })}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </Row>
                    {warning.text && (
                      <div className={`ct-note${warning.level === 'danger' ? ' ct-note-warn' : ''}`}>
                        <AlertTriangle size={16} />
                        <span>{warning.text}</span>
                      </div>
                    )}
                    <div className="ct-grid ct-grid-2">
                      <Row label="Risk % is taken from">
                        <select
                          className="input-control"
                          value={draft.sizing.basis}
                          onChange={(e) => patch('sizing', { basis: e.target.value })}
                        >
                          <option value="balance">Balance</option>
                          <option value="equity">Equity (floating P/L included)</option>
                        </select>
                      </Row>
                      <Row label="Max lot per position">
                        <NumField ariaLabel="max lot" value={draft.sizing.maxLotCap} onChange={(n) => patch('sizing', { maxLotCap: n })} min={0} />
                      </Row>
                    </div>
                  </div>
                </div>

                <div className="ct-card">
                  <div className="ct-step-t" style={{ marginBottom: 12 }}>
                    <Activity size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--profit-green)' }} />
                    Live lot preview
                  </div>
                  <div className="ct-grid" style={{ gap: 10 }}>
                    <div className="ct-grid ct-grid-2">
                      <Row label="Symbol">
                        <input
                          className="input-control"
                          value={calc.symbol}
                          onChange={(e) => {
                            const sym = e.target.value.toUpperCase();
                            const hint = symbolValueHint(sym);
                            setCalc({ ...calc, symbol: sym, valuePerUnit: hint ? String(hint) : calc.valuePerUnit });
                          }}
                        />
                      </Row>
                      <Row label="Stop distance (price)">
                        <input
                          className="input-control"
                          inputMode="decimal"
                          value={calc.stopDistance}
                          onChange={(e) => setCalc({ ...calc, stopDistance: e.target.value })}
                        />
                      </Row>
                    </div>
                    <Row label="Value per 1.0 price move, per lot" hint="Filled from a preset table. Your broker's real number may differ (suffixes, account currency) - the EA always uses the broker value.">
                      <input
                        className="input-control"
                        inputMode="decimal"
                        value={calc.valuePerUnit}
                        onChange={(e) => setCalc({ ...calc, valuePerUnit: e.target.value })}
                      />
                    </Row>
                    <div className="ct-grid ct-grid-2">
                      <StatTile value={calcLots ? fmtNum(calcLots.lots, 2) : '-'} label="Estimated lots" color="var(--theme-primary)" />
                      <StatTile value={calcLots ? `$${fmtNum(calcLots.riskAmount, 2)}` : '-'} label="Risk if the stop is hit" />
                    </div>
                    <div className="ct-step-d">
                      Based on {latestWithBalance ? `your EA-reported balance of $${fmtNum(calcBalance, 2)}` : 'a $10,000 placeholder - the EA has not reported a balance yet'}.
                    </div>
                  </div>
                </div>
              </div>

              <div className="ct-grid ct-grid-2" style={{ marginTop: 14 }}>
                <div className="ct-card">
                  <div className="ct-step-t" style={{ marginBottom: 12 }}>
                    <ShieldAlert size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-amber)' }} />
                    Guards on the entry
                  </div>
                  <div className="ct-grid ct-grid-2" style={{ gap: 12 }}>
                    <Row label="Max spread (points)">
                      <NumField ariaLabel="max spread" value={draft.guards.maxSpreadPoints} onChange={(n) => patch('guards', { maxSpreadPoints: n })} min={0} />
                    </Row>
                    <Row label="Max entry deviation (points)">
                      <NumField ariaLabel="max entry deviation" value={draft.guards.maxEntryDeviationPoints} onChange={(n) => patch('guards', { maxEntryDeviationPoints: n })} min={0} />
                    </Row>
                    <Row label="Max slippage sent to broker (points)">
                      <NumField ariaLabel="max slippage" value={draft.guards.maxSlippagePoints} onChange={(n) => patch('guards', { maxSlippagePoints: n })} min={0} />
                    </Row>
                    <Row label="Max open positions">
                      <NumField ariaLabel="max positions" value={draft.guards.maxPositions} onChange={(n) => patch('guards', { maxPositions: n })} min={1} />
                    </Row>
                    <Row label="Max positions per symbol">
                      <NumField ariaLabel="max per symbol" value={draft.guards.maxPositionsPerSymbol} onChange={(n) => patch('guards', { maxPositionsPerSymbol: n })} min={1} />
                    </Row>
                    <Row label="Fallback stop (points)" hint="Used only when the provider's position has no stop loss, so your position is never left completely unprotected.">
                      <NumField ariaLabel="fallback stop" value={draft.stops.slFallbackPoints} onChange={(n) => patch('stops', { slFallbackPoints: n })} min={0} />
                    </Row>
                  </div>
                  <div className="ct-grid" style={{ gap: 10, marginTop: 12 }}>
                    <Row label="Blocked symbols (comma separated)">
                      <input
                        className="input-control"
                        value={draft.guards.blockSymbols.join(', ')}
                        onChange={(e) =>
                          patch('guards', {
                            blockSymbols: e.target.value
                              .split(',')
                              .map((s) => s.trim().toUpperCase())
                              .filter(Boolean)
                          })
                        }
                      />
                    </Row>
                    <label className="ct-check">
                      <input
                        type="checkbox"
                        checked={draft.stops.copyTp}
                        onChange={(e) => patch('stops', { copyTp: e.target.checked })}
                      />
                      <span>Copy the take profit (turn off to manage your own exits)</span>
                    </label>
                    <label className="ct-check">
                      <input
                        type="checkbox"
                        checked={draft.guards.followOnReconnect}
                        onChange={(e) => patch('guards', { followOnReconnect: e.target.checked })}
                      />
                      <span>
                        Chase positions missed while offline (off = safe default: a trade that happened while your terminal
                        was down is marked missed, never entered at a stale price)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="ct-card">
                  <div className="ct-step-t" style={{ marginBottom: 12 }}>
                    <Power size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--loss-red)' }} />
                    Stop trading automatically
                  </div>
                  <div className="ct-grid ct-grid-2" style={{ gap: 12 }}>
                    <Row label="Max total risk open (%)" hint={`Currently ${fmtNum(inPageReason, 1)}% allowed across all open copied positions.`}>
                      <NumField ariaLabel="max total risk" value={draft.limits.maxTotalRiskPct} onChange={(n) => patch('limits', { maxTotalRiskPct: n })} min={0} />
                    </Row>
                    <Row label="Daily loss limit (%)">
                      <NumField ariaLabel="daily loss" value={draft.limits.dailyLossLimitPct} onChange={(n) => patch('limits', { dailyLossLimitPct: n })} min={0} />
                    </Row>
                    <Row label="Max drawdown from peak (%)">
                      <NumField ariaLabel="max drawdown" value={draft.limits.maxDrawdownPct} onChange={(n) => patch('limits', { maxDrawdownPct: n })} min={0} />
                    </Row>
                    <Row label="Max trades per day">
                      <NumField ariaLabel="max trades per day" value={draft.limits.maxTradesPerDay} onChange={(n) => patch('limits', { maxTradesPerDay: n })} min={0} />
                    </Row>
                  </div>
                  <div className="ct-grid ct-grid-2" style={{ gap: 12, marginTop: 12 }}>
                    <Row label="If the provider widens the stop" hint="Lot size is fixed at entry, so a wider stop means more money at risk than the % you configured.">
                      <select
                        className="input-control"
                        value={draft.mirror.riskBreachAction}
                        onChange={(e) => patch('mirror', { riskBreachAction: e.target.value })}
                      >
                        <option value="warn">Follow the provider, notify me</option>
                        <option value="trim">Follow, then trim my position back to my %</option>
                        <option value="ignore">Follow silently</option>
                      </select>
                    </Row>
                    <Row label="Close positions left without news after (minutes, 0 = off)" hint="Protects against a provider terminal that dies mid-trade.">
                      <NumField ariaLabel="max hold" value={draft.stops.maxHoldMinutes} onChange={(n) => patch('stops', { maxHoldMinutes: n })} min={0} />
                    </Row>
                  </div>
                  <div className="ct-grid" style={{ gap: 10, marginTop: 12 }}>
                    <label className="ct-check">
                      <input
                        type="checkbox"
                        checked={draft.guards.sessionFilter.enabled}
                        onChange={(e) => patch('guards', { sessionFilter: { ...draft.guards.sessionFilter, enabled: e.target.checked } })}
                      />
                      <span>Only trade during a window (server time)</span>
                    </label>
                    {draft.guards.sessionFilter.enabled && (
                      <div className="ct-grid ct-grid-2">
                        <Row label="From">
                          <input
                            className="input-control"
                            value={draft.guards.sessionFilter.start}
                            onChange={(e) => patch('guards', { sessionFilter: { ...draft.guards.sessionFilter, start: e.target.value } })}
                          />
                        </Row>
                        <Row label="To">
                          <input
                            className="input-control"
                            value={draft.guards.sessionFilter.end}
                            onChange={(e) => patch('guards', { sessionFilter: { ...draft.guards.sessionFilter, end: e.target.value } })}
                          />
                        </Row>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ct-card" style={{ marginTop: 14 }}>
                <label className="ct-check">
                  <input
                    type="checkbox"
                    checked={draft.journal.autoSync}
                    onChange={(e) => patch('journal', { autoSync: e.target.checked })}
                  />
                  <span>
                    Write every copied trade into my journal automatically (off by default - the journal stays yours
                    unless you ask for this)
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void onSave()}>
                    {saving ? 'Saving…' : confirmHighRisk ? 'Confirm and save' : 'Save risk settings'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDraft(mergeSettings(DEFAULT_COPY_SETTINGS))}
                  >
                    Reset to defaults
                  </button>
                  <span className="ct-step-d">
                    Saved values are read by the EA on its next poll (about {draft.mirror.modifyThrottleSeconds}s cadence).
                  </span>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* 4. terminal + token */}
      <section className="ct-section" style={{ marginTop: 34 }}>
        <SectionHead
          title="Your terminal"
          subtitle="The EA on your MT5 receives the instructions and places the orders. The token below is what identifies that terminal - the server only ever stores its hash."
        />
        {eaTokens.length > 0 && (
          <div className="ct-table-wrap" style={{ marginBottom: 14 }}>
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Terminal</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th>Leverage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {eaTokens.map((t) => (
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
                    <td>{t.leverage ? `1:${t.leverage}` : '-'}</td>
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
                I saved it
              </button>
            </div>
            <div className="ct-step-d" style={{ marginTop: 10 }}>
              Paste it into the EA's <code className="ct-inline-code">EaToken</code> input. If you lose it, generate a new
              one and revoke this terminal - it cannot be recovered, by design.
            </div>
          </div>
        ) : (
          <div className="ct-card">
            <div className="ct-grid" style={{ gap: 12 }}>
              <Row label="Terminal label">
                <input className="input-control" value={tokenLabel} onChange={(e) => setTokenLabel(e.target.value)} />
              </Row>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onGenerate()}>
                  <KeyRound size={15} /> {busy ? 'Generating…' : 'Generate EA token'}
                </button>
                <a className="btn btn-secondary" href={EA_FILES[0].href} download>
                  <Server size={15} /> Download the EA
                </a>
              </div>
            </div>
            <div className="ct-grid ct-grid-3" style={{ marginTop: 14 }}>
              {[
                'Drop the file into MT5 → File → Open Data Folder → MQL5 → Experts, then refresh the Navigator.',
                'Attach it to one chart and paste the token into EaToken (plus SupabaseUrl and AnonKey).',
                'Allow the URL in Tools → Options → Expert Advisors and switch Algo Trading on.'
              ].map((s, i) => (
                <div key={s} className="ct-step">
                  <span className="ct-step-n">{i + 1}</span>
                  <div className="ct-step-d">{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. posisi + log */}
      <section className="ct-section" style={{ marginTop: 34 }}>
        <SectionHead title="Positions being mirrored" subtitle="Derived from the EA's acknowledgements - this is what the EA told the server it actually did." />
        {positions.length === 0 ? (
          <EmptyNote>No positions mirrored yet.</EmptyNote>
        ) : (
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>State</th>
                  <th>Lots</th>
                  <th>Stop loss</th>
                  <th>Take profit</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} style={{ cursor: 'default' }}>
                    <td className="ct-name">{p.symbol}</td>
                    <td>
                      <span className={`ct-pill ${p.state === 'open' ? 'ct-pill-ok' : 'ct-pill-off'}`}>{p.state}</span>
                    </td>
                    <td>{fmtNum(p.lots, 2)}</td>
                    <td style={{ color: p.sl ? 'var(--loss-red)' : 'var(--text-muted)' }}>{p.sl ? fmtNum(p.sl, 5) : 'none'}</td>
                    <td style={{ color: p.tp ? 'var(--profit-green)' : 'var(--text-muted)' }}>{p.tp ? fmtNum(p.tp, 5) : 'none'}</td>
                    <td>{fmtRelative(p.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          <SectionHead title="Execution log" subtitle="Every instruction the provider sent, what the EA did with it, and - when it did nothing - why." />
          {deliveries.length === 0 ? (
            <EmptyNote>Nothing yet.</EmptyNote>
          ) : (
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Event</th>
                    <th>Symbol</th>
                    <th>Lots</th>
                    <th>Risk</th>
                    <th>Fill</th>
                    <th>Slip</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} style={{ cursor: 'default' }}>
                      <td>{fmtRelative(d.executedAt || d.createdAt)}</td>
                      <td className="ct-name">{d.kind}</td>
                      <td>{d.symbol}</td>
                      <td>{d.lots === null ? '-' : fmtNum(d.lots, 2)}</td>
                      <td>{d.riskAmount === null ? '-' : `$${fmtNum(d.riskAmount, 2)}`}</td>
                      <td>{d.fillPrice === null ? '-' : fmtNum(d.fillPrice, 5)}</td>
                      <td>{d.slippagePoints === null ? '-' : fmtNum(d.slippagePoints, 1)}</td>
                      <td>
                        <span
                          className={`ct-pill ${
                            d.status === 'executed' ? 'ct-pill-ok' : d.status === 'skipped' || d.status === 'expired' ? 'ct-pill-warn' : 'ct-pill-bad'
                          }`}
                        >
                          {d.status}
                        </span>
                        {(d.skipReason || d.failReason) && (
                          <div className="ct-step-d" style={{ marginTop: 3 }}>
                            {d.skipReason || d.failReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="ct-note" style={{ marginTop: 22 }}>
        <CheckCircle2 size={17} style={{ flex: 'none', color: 'var(--profit-green)' }} />
        <span>
          Results will not match the provider. Different brokers mean different spreads and fills, and your lot size is
          calculated from your balance - not copied from theirs.
        </span>
      </div>
    </div>
  );
};

export default ClientDashboard;
