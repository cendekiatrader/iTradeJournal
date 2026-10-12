import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Download,
  Eye,
  FileCode2,
  Gauge,
  LogIn,
  Radio,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import {
  EA_FILES,
  fetchLeaderboard,
  fetchMyProvider,
  fmtNum,
  fmtPct,
  fmtRelative,
  applyAsProvider,
  type CopyLeaderRow
} from '../../utils/copytrade';
import { slugify } from '../../utils/blog';
import { EmptyNote, CopyPageShell, SectionHead, StatTile } from './ui';

interface CopyTradeViewProps {
  onNavigate: (slug: string | null) => void;
  onBackToApp: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  signedIn: boolean;
}

const PROVIDER_STEPS = [
  {
    title: 'Trade your own MT5 account as usual',
    detail:
      'No signal posting, no copying numbers into a form. The EA reads the positions on your terminal and publishes every change automatically.'
  },
  {
    title: 'Your terminal must stay online 24/7',
    detail:
      'Follower exits come from your terminal. If it sleeps, nobody gets the close instruction - this is the one hard requirement, and it is why a VPS is recommended.'
  },
  {
    title: 'Your page is public immediately',
    detail:
      'Self-serve registration, no waiting for approval. The admin team only steps in when a provider gets reported.'
  }
];

const CLIENT_STEPS = [
  {
    title: 'Pick a provider and set a risk %',
    detail:
      'Choose how much of your balance to risk per copied position (0.5%, 1%, 2%, or any number you want). Position size is calculated from the provider SL distance.'
  },
  {
    title: 'Install the EA on your own terminal',
    detail:
      'One file, one chart. Your broker password never leaves your PC - it is not even stored, because the EA only reads instructions and sends order results back.'
  },
  {
    title: 'Every entry and exit is mirrored',
    detail:
      'Open, stop-loss and take-profit moves, partial closes and full closes are all followed. A 30 second reconciliation fixes anything that arrived while you were offline.'
  }
];

const INSTALL_STEPS = [
  'Download the file below (use the .ex5 if you do not want to compile anything).',
  'In MT5 open File → Open Data Folder → MQL5 → Experts and drop the file in there. Restart MT5 or right-click the Navigator and Refresh.',
  'Drag the EA onto any one chart (symbol does not matter - it trades what the provider trades).',
  'Fill the inputs: SupabaseUrl, AnonKey and the EaToken from your CopyTrade dashboard.',
  'Allow the URL: Tools → Options → Expert Advisors → tick “Allow WebRequest for listed URL” and add your Supabase project URL.',
  'Turn on the “Algo Trading” toolbar button, then confirm the EA shows ONLINE in your dashboard.'
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Does my account or broker password ever reach iTradeJournal?',
    a: 'No. The web app never places orders on your account. Your MT5 terminal places them, using an EA token that can only read your instructions and write back the result. There is no investor password, no MT5 login, no broker credential stored anywhere.'
  },
  {
    q: 'Is the copy exactly the same as the provider?',
    a: 'No, and be suspicious of anyone who claims otherwise. Different brokers mean different spreads, different fills and different slippage, plus weekend gaps and stop levels that can trigger at different prices. Position size is also deliberately different, because it is calculated from your balance and your risk %, not copied from the provider volume.'
  },
  {
    q: 'Do I need a VPS?',
    a: 'As a client, only if your PC is off during market hours - without the terminal running you keep the open positions but receive no new instructions. As a provider it is effectively mandatory: if your terminal is offline, your followers get no exits.'
  },
  {
    q: 'What happens if my terminal goes offline mid-trade?',
    a: 'New instructions stop, existing positions stay open. Every order carries the stop loss and take profit that the provider had at the time, so the broker still protects the position even with your PC off. When the EA comes back it reconciles against the provider state and closes anything the provider has already closed.'
  },
  {
    q: 'Is this for IDX stocks?',
    a: 'No. Runtime is MetaTrader 5 only, so it covers forex, gold, indices and crypto CFDs. Indonesian stock screening is a separate module of the journal.'
  }
];

export const CopyTradeView: React.FC<CopyTradeViewProps> = ({
  onNavigate,
  onBackToApp,
  onOpenAuth,
  signedIn
}) => {
  const [rows, setRows] = useState<CopyLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inactive, setInactive] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [mySlug, setMySlug] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: '', slug: '', bio: '' });
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchLeaderboard();
      if (!alive) return;
      setRows(res.rows);
      setInactive(res.missing && res.rows.length === 0);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setMySlug(null);
      return;
    }
    let alive = true;
    (async () => {
      const { slug } = await fetchMyProvider();
      if (alive) setMySlug(slug);
    })();
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const effectiveSlug = useMemo(
    () => (touchedSlug ? form.slug : slugify(form.displayName)),
    [form.slug, form.displayName, touchedSlug]
  );

  const submitApply = async () => {
    setFormError(null);
    setFormOk(null);
    if (!form.displayName.trim()) return setFormError('Display name is required.');
    if (!effectiveSlug) return setFormError('Pick a URL slug (letters, numbers and dashes).');
    if (!ack) return setFormError('Please acknowledge the 24/7 requirement and the terms.');
    setBusy(true);
    const res = await applyAsProvider({
      displayName: form.displayName.trim(),
      slug: effectiveSlug,
      bio: form.bio.trim()
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error || 'Could not register.');
    setMySlug(res.slug || effectiveSlug);
    setFormOk('You are live. Install the EA to start publishing.');
  };

  return (
    <CopyPageShell
      onHome={() => onNavigate(null)}
      onBackToApp={onBackToApp}
      signedIn={signedIn}
      onCreateAccount={() => onOpenAuth('signup')}
    >
      <section className="ct-hero">
        <h1 className="ct-h1">
          Copy a provider automatically on <span style={{ color: 'var(--theme-primary)' }}>your own MT5</span>
        </h1>
        <p className="ct-lead">
          CopyTrade mirrors another trader's MetaTrader 5 positions into your account - entries, stop-loss and
          take-profit changes, partial closes and exits. You decide the risk percentage; we calculate the lot size
          from it. Orders are placed by your terminal, never by this website, so your broker credentials stay on
          your machine.
        </p>
        <div className="ct-cta">
          <a className="btn btn-primary" href="#download">
            <Download size={16} /> Download the EA
          </a>
          <a className="btn btn-secondary" href="#providers">
            <Users size={16} /> Browse providers
          </a>
          {!signedIn && (
            <button type="button" className="btn btn-secondary" onClick={() => onOpenAuth('signup')}>
              <LogIn size={16} /> Create free account
            </button>
          )}
        </div>
        <div className="ct-grid ct-grid-4" style={{ marginTop: 26 }}>
          <StatTile value="0%" label="Performance fee" />
          <StatTile value="3–5s" label="Typical copy latency" />
          <StatTile value="Risk %" label="Sizing model" />
          <StatTile value="MT5" label="Runtime (not IDX equities)" />
        </div>
      </section>

      <section className="ct-section" style={{ marginTop: 40 }}>
        <EmptyNote>
          <strong>Read this before signing up as a client.</strong> FULL AUTO has no rehearsal mode: once you switch
          it on, the next provider trade lands in your account. Test on a demo account first - the EA clearly shows
          whether it is attached to a demo or a live account. Position sizing is calculated from your balance and the
          provider stop distance, and changes to the provider stop-loss can move your real risk up or down after
          entry.
        </EmptyNote>
      </section>

      <section className="ct-section">
        <SectionHead
          title="How the mirror works"
          subtitle="Two EAs, one relay, and a clear rule about who executes: the provider's terminal publishes, your terminal executes."
        />
        <div className="ct-grid ct-grid-3">
          <div className="ct-card">
            <div className="ct-step">
              <span className="ct-step-n">1</span>
              <div>
                <div className="ct-step-t">Provider trades in their MT5</div>
                <div className="ct-step-d">
                  The provider EA reads the position list every second and publishes open, modify,
                  partial-close and close events. It never places orders.
                </div>
              </div>
            </div>
          </div>
          <div className="ct-card">
            <div className="ct-step">
              <span className="ct-step-n">2</span>
              <div>
                <div className="ct-step-t">The relay fans out the event</div>
                <div className="ct-step-d">
                  Each active follower gets its own delivery row, so one slow terminal never delays anyone
                  else. A cheap revision counter keeps polling light.
                </div>
              </div>
            </div>
          </div>
          <div className="ct-card">
            <div className="ct-step">
              <span className="ct-step-n">3</span>
              <div>
                <div className="ct-step-t">Your EA sizes and executes</div>
                <div className="ct-step-d">
                  Guards run locally (spread, entry deviation, session, limits, kill switch), then the lot is
                  calculated from your risk % and the order is sent with the provider SL/TP.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ct-section">
        <SectionHead
          title="Position size comes from your risk, not from theirs"
          subtitle="A provider trading 1.00 lot on a $50k account and a client with $500 must not get the same lot. Here is the formula the EA runs on your terminal."
        />
        <div className="ct-grid ct-grid-2">
          <div className="ct-card">
            <div className="ct-step-t" style={{ marginBottom: 10 }}>
              <Gauge size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--theme-primary)' }} />
              The calculation
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                lineHeight: 1.85,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)'
              }}
            >{`riskAmount   = balance x riskPct / 100
stopDistance = |entry - stopLoss|
valuePerLot  = tickValue / tickSize
lots         = riskAmount / (stopDistance x valuePerLot)
lots         = round DOWN to the broker volume step`}</pre>
            <div className="ct-step-d" style={{ marginTop: 12 }}>
              Rounded down on purpose - overshooting the risk you asked for is worse than trading slightly smaller.
              Margin, minimum lot and maximum lot limits from your broker still apply and are checked before sending.
            </div>
          </div>
          <div className="ct-card">
            <div className="ct-step-t" style={{ marginBottom: 10 }}>
              <TrendingUp size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--profit-green)' }} />
              Example: $10,000 balance, 1% risk
            </div>
            <div className="ct-grid ct-grid-2">
              <StatTile value="$100" label="Risk per trade" />
              <StatTile value="0.40" label="Lot · XAUUSD · 2.50 SL" />
              <StatTile value="0.40" label="Lot · EURUSD · 25 pips" />
              <StatTile value="6.67" label="Lot · US500 · 15 pts" />
            </div>
            <div className="ct-step-d" style={{ marginTop: 12 }}>
              There is no hard ceiling on the risk percentage - it is your account. The UI warns hard above 5% and
              asks for a typed confirmation above 25%, and stop-loss moves by the provider can change your real risk
              after entry. You can be notified of that, or let the EA trim the position back to your percentage.
            </div>
          </div>
        </div>
      </section>

      <section className="ct-section">
        <SectionHead title="Two roles" subtitle="You can be one, the other, or both on the same terminal - it is a single EA with a Role input." />
        <div className="ct-grid ct-grid-2">
          <div className="ct-card">
            <div className="ct-step-t" style={{ marginBottom: 12 }}>
              <Radio size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-amber)' }} />
              As a provider
            </div>
            <div className="ct-grid" style={{ gap: 12 }}>
              {PROVIDER_STEPS.map((s) => (
                <div key={s.title} className="ct-step">
                  <CheckCircle2 size={15} style={{ flex: 'none', marginTop: 3, color: 'var(--profit-green)' }} />
                  <div>
                    <div className="ct-step-t">{s.title}</div>
                    <div className="ct-step-d">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              {mySlug ? (
                <div className="ct-note">
                  <BadgeCheck size={17} style={{ flex: 'none', color: 'var(--profit-green)' }} />
                  <span>
                    You are registered as provider <strong>{mySlug}</strong>.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (signedIn ? setApplyOpen((v) => !v) : onOpenAuth('signup'))}
                >
                  <Zap size={16} /> {signedIn ? 'Register as provider' : 'Sign up as provider'}
                </button>
              )}
            </div>

            {applyOpen && !mySlug && (
              <div className="ct-form" style={{ marginTop: 16 }}>
                <div>
                  <label className="ct-label" htmlFor="ct-provider-name">
                    Display name
                  </label>
                  <input
                    id="ct-provider-name"
                    className="input-control"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="Your trading name"
                  />
                </div>
                <div>
                  <label className="ct-label" htmlFor="ct-provider-slug">
                    Public URL
                  </label>
                  <input
                    id="ct-provider-slug"
                    className="input-control"
                    value={effectiveSlug}
                    onChange={(e) => {
                      setTouchedSlug(true);
                      setForm({ ...form, slug: slugify(e.target.value) });
                    }}
                    placeholder="your-name"
                  />
                  <div className="ct-step-d" style={{ marginTop: 5 }}>
                    /copytrade/provider/{effectiveSlug || 'your-name'}
                  </div>
                </div>
                <div>
                  <label className="ct-label" htmlFor="ct-provider-bio">
                    Short description
                  </label>
                  <textarea
                    id="ct-provider-bio"
                    className="input-control"
                    rows={3}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Instrument, style, session, average risk per trade."
                  />
                </div>
                <label className="ct-check">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                  <span>
                    I understand the terminal must stay online 24/7 (I will use a VPS), that my results are published
                    publicly, and that this is not investment advice or a managed account.
                  </span>
                </label>
                {formError && (
                  <div className="ct-note ct-note-warn">
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}
                {formOk && (
                  <div className="ct-note">
                    <CheckCircle2 size={16} style={{ flex: 'none', color: 'var(--profit-green)' }} />
                    <span>{formOk}</span>
                  </div>
                )}
                <div>
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={submitApply}>
                    {busy ? 'Registering…' : 'Go live'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="ct-card">
            <div className="ct-step-t" style={{ marginBottom: 12 }}>
              <ArrowLeftRight size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--theme-primary)' }} />
              As a client
            </div>
            <div className="ct-grid" style={{ gap: 12 }}>
              {CLIENT_STEPS.map((s) => (
                <div key={s.title} className="ct-step">
                  <CheckCircle2 size={15} style={{ flex: 'none', marginTop: 3, color: 'var(--profit-green)' }} />
                  <div>
                    <div className="ct-step-t">{s.title}</div>
                    <div className="ct-step-d">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ct-note" style={{ marginTop: 16 }}>
              <ShieldAlert size={17} style={{ flex: 'none', color: 'var(--accent-blue)' }} />
              <span>
                Follow as many providers as you want. Each one gets its own magic number so its positions stay
                separate from your manual trades and from the other providers.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="ct-section" id="download">
        <SectionHead
          title="Download the EA"
          subtitle="One file, both roles: set Role = PROVIDER to publish your trades, Role = CLIENT to copy someone else's. Built and compiled with MetaEditor 5."
        />
        <div className="ct-grid ct-grid-2">
          {EA_FILES.map((f) => (
            <div key={f.href} className="ct-card">
              <div className="ct-dl">
                <div className="ct-dl-icon">{f.compiled ? <Server size={20} /> : <FileCode2 size={20} />}</div>
                <div style={{ flex: '1 1 160px' }}>
                  <div className="ct-step-t">{f.label}</div>
                  <div className="ct-step-d" style={{ marginTop: 2 }}>
                    {f.detail}
                  </div>
                  <div className="ct-step-d" style={{ marginTop: 6 }}>
                    <span className="ct-inline-code">{f.filename}</span>
                  </div>
                </div>
              </div>
              <div className="ct-dl-actions" style={{ marginTop: 14 }}>
                <a className="btn btn-primary btn-sm" href={f.href} download>
                  <Download size={15} /> Download
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="ct-card" style={{ marginTop: 14 }}>
          <div className="ct-step-t" style={{ marginBottom: 12 }}>
            <Download size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--theme-primary)' }} />
            Installation, in order
          </div>
          <div className="ct-grid" style={{ gap: 11 }}>
            {INSTALL_STEPS.map((s, i) => (
              <div key={s} className="ct-step">
                <span className="ct-step-n">{i + 1}</span>
                <div className="ct-step-d">{s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <EmptyNote warn>
              Step 5 is the one everybody misses. MetaTrader blocks every outbound request until the host is on the
              allowed list, and the EA will report a WebRequest error until you add it. Nothing on your terminal is
              at risk by adding it: the EA only talks to your own Supabase project.
            </EmptyNote>
          </div>
        </div>
      </section>

      <section className="ct-section" id="providers">
        <SectionHead
          title="Providers"
          subtitle="Every provider page is public: results, open positions and how long ago their terminal last reported. Uptime matters here, so it is shown where you can see it."
        />
        {loading ? (
          <div className="ct-grid" style={{ gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="ct-skel" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyNote warn={inactive}>
            {inactive
              ? 'CopyTrade is not active on this deployment yet - the database migration (supabase_copytrade.sql) has not been run.'
              : 'No providers yet. Register as a provider above and your page appears here immediately.'}
          </EmptyNote>
        ) : (
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Followers</th>
                  <th>Trades</th>
                  <th>Win rate</th>
                  <th>Avg R:R</th>
                  <th>Max DD (pts)</th>
                  <th>Terminal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} onClick={() => onNavigate(r.slug)}>
                    <td>
                      <span className="ct-name">
                        {r.displayName}
                        {r.isVerified && (
                          <BadgeCheck
                            size={13}
                            style={{ marginLeft: 5, verticalAlign: '-2px', color: 'var(--accent-blue)' }}
                          />
                        )}
                        <small>@{r.slug}{r.bio ? ` · ${r.bio.slice(0, 60)}` : ''}</small>
                      </span>
                    </td>
                    <td>{r.followers}</td>
                    <td>{r.trades}</td>
                    <td>{fmtPct(r.winrate)}</td>
                    <td>{fmtNum(r.avgRr)}</td>
                    <td style={{ color: 'var(--loss-red)' }}>{fmtNum(r.maxDdPoints, 2)}</td>
                    <td>
                      <span className={`ct-pill ${r.eaOnline ? 'ct-pill-ok' : 'ct-pill-off'}`}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 99,
                            background: r.eaOnline ? 'var(--profit-green)' : 'var(--text-muted)'
                          }}
                        />
                        {r.eaOnline ? 'online' : fmtRelative(r.lastSeen)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ct-section">
        <SectionHead title="Questions people actually ask" />
        <div className="ct-grid" style={{ gap: 10 }}>
          {FAQ.map((f, i) => (
            <div key={f.q} className="ct-card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  color: 'inherit',
                  padding: '15px 18px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center'
                }}
              >
                <Eye size={15} style={{ flex: 'none', color: 'var(--theme-primary)' }} />
                <span style={{ flex: 1 }}>{f.q}</span>
                <span style={{ color: 'var(--text-muted)' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div className="ct-step-d" style={{ padding: '0 18px 16px 43px' }}>{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="ct-section">
        <div className="ct-card">
          <div className="ct-step-t" style={{ marginBottom: 10 }}>
            <Bot size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-blue)' }} />
            Notifications
          </div>
          <div className="ct-step-d">
            Providers can connect their own Telegram bot and hand followers an access code: the follower sends the code
            to the bot once and receives executions, skips and limit alerts in their chat. In-app notifications work
            without Telegram.
          </div>
        </div>
      </section>

      <footer className="ct-foot">
        <strong style={{ color: 'var(--text-secondary)' }}>Risk warning.</strong> CopyTrade is a technical mirror, not
        investment advice, not a managed account and not a performance guarantee. Copying a provider will not reproduce
        their results: different brokers, spreads, slippage, weekend gaps and stop triggers all change the outcome, and
        partial closes are rounded to your broker volume step. Free to use, no fees, and this platform never holds your
        funds. Trading leveraged instruments can lose more than your deposit. Test on a demo account first.
      </footer>
    </CopyPageShell>
  );
};

export default CopyTradeView;
