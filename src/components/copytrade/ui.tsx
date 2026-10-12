import React from 'react';

/**
 * Shared shell + tokens for the public CopyTrade pages (/copytrade and the
 * provider profile). These pages live OUTSIDE the journal app shell, so they
 * carry their own stylesheet - the same choice the Blog page made - and every
 * colour comes from the design tokens so light/dark keeps working.
 */

export const CopyStyles: React.FC = () => (
  <style>{`
.ct-page { min-height: 100vh; background: var(--bg-main); color: var(--text-primary); }
.ct-shell { max-width: 1120px; margin: 0 auto; padding: 20px 20px 72px; }
.ct-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 0 26px; }
.ct-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: -0.01em; font-size: 1.05rem; cursor: pointer; background: none; color: inherit; }
.ct-brand-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; box-shadow: var(--neo-outset-sm); }
.ct-chip { font-size: 0.66rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; box-shadow: var(--neo-inset-sm); color: var(--theme-primary); }
.ct-head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ct-hero { padding: 26px 0 8px; max-width: 780px; }
.ct-h1 { font-size: clamp(1.7rem, 4.2vw, 2.55rem); font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 14px; }
.ct-lead { font-size: 1rem; line-height: 1.7; color: var(--text-secondary); margin: 0 0 20px; }
.ct-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.ct-section { margin-top: 52px; }
.ct-h2 { font-size: 1.22rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 6px; }
.ct-sub { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0 0 18px; max-width: 760px; }
.ct-card { background: var(--bg-card); border-radius: 16px; box-shadow: var(--neo-outset); padding: 18px; }
.ct-grid { display: grid; gap: 14px; }
.ct-grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.ct-grid-3 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.ct-grid-4 { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
.ct-step { display: flex; gap: 12px; }
.ct-step-n { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-size: 0.78rem; font-weight: 800; box-shadow: var(--neo-outset-sm); color: var(--theme-primary); }
.ct-step-t { font-weight: 700; font-size: 0.92rem; margin-bottom: 3px; }
.ct-step-d { color: var(--text-secondary); font-size: 0.85rem; line-height: 1.6; }
.ct-tile { background: var(--bg-card); border-radius: 14px; box-shadow: var(--neo-outset-sm); padding: 14px; }
.ct-tile-v { font-size: 1.16rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.ct-tile-l { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-top: 3px; }
.ct-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; box-shadow: var(--neo-inset-sm); }
.ct-pill-ok { color: var(--profit-green); }
.ct-pill-off { color: var(--text-muted); }
.ct-pill-warn { color: var(--accent-amber); }
.ct-pill-bad { color: var(--loss-red); }
.ct-table-wrap { overflow-x: auto; border-radius: 16px; box-shadow: var(--neo-outset); background: var(--bg-card); }
.ct-table { width: 100%; border-collapse: collapse; font-size: 0.87rem; min-width: 640px; }
.ct-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); padding: 12px 14px; background: var(--bg-card); }
.ct-table td { padding: 13px 14px; border-top: 1px solid var(--neo-sep); font-variant-numeric: tabular-nums; }
.ct-table tr { cursor: pointer; }
.ct-table tbody tr:hover td { background: var(--bg-surface); }
.ct-name { font-weight: 700; }
.ct-name small { display: block; font-weight: 500; color: var(--text-muted); font-size: 0.72rem; }
.ct-dl { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
.ct-dl-icon { flex: none; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; box-shadow: var(--neo-outset-sm); color: var(--theme-primary); }
.ct-dl-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.ct-note { display: flex; gap: 10px; padding: 13px 15px; border-radius: 12px; box-shadow: var(--neo-inset-sm); font-size: 0.86rem; line-height: 1.6; color: var(--text-secondary); }
.ct-note-warn { color: var(--text-secondary); }
.ct-note-warn svg { color: var(--accent-amber); flex: none; }
.ct-list { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 0.88rem; line-height: 1.75; }
.ct-inline-code { font-family: var(--font-mono); font-size: 0.82rem; padding: 2px 6px; border-radius: 6px; box-shadow: var(--neo-inset-sm); }
.ct-form { display: grid; gap: 13px; }
.ct-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 5px; display: block; }
.ct-check { display: flex; gap: 10px; align-items: flex-start; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; }
.ct-foot { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--neo-sep); color: var(--text-muted); font-size: 0.78rem; line-height: 1.7; }
.ct-skel { height: 44px; border-radius: 10px; box-shadow: var(--neo-inset-sm); animation: ct-pulse 1.4s ease-in-out infinite; }
@keyframes ct-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@media (max-width: 640px) {
  .ct-shell { padding: 16px 14px 64px; }
  .ct-dl-actions { margin-left: 0; width: 100%; }
  .ct-dl-actions .btn { flex: 1; }
  .ct-table { min-width: 560px; }
}
`}</style>
);

export const CopyPageShell: React.FC<{
  children: React.ReactNode;
  onHome: () => void;
  onBackToApp: () => void;
  onCreateAccount?: () => void;
  signedIn?: boolean;
}> = ({ children, onHome, onBackToApp, onCreateAccount, signedIn }) => (
  <div className="ct-page">
    <CopyStyles />
    <div className="ct-shell">
      <div className="ct-head">
        <button type="button" className="ct-brand btn-ghost" onClick={onHome}>
          <span className="ct-brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 17l5-5 3 3 5-6" />
              <path d="M17 9h3v3" />
            </svg>
          </span>
          iTradeJournal
        </button>
        <span className="ct-chip">CopyTrade</span>
        <div className="ct-head-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToApp}>
            Open journal
          </button>
          {!signedIn && onCreateAccount && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onCreateAccount}>
              Create account
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  </div>
);

export const SectionHead: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <>
    <h2 className="ct-h2">{title}</h2>
    {subtitle && <p className="ct-sub">{subtitle}</p>}
  </>
);

export const StatTile: React.FC<{ value: React.ReactNode; label: string; color?: string }> = ({
  value,
  label,
  color
}) => (
  <div className="ct-tile">
    <div className="ct-tile-v" style={color ? { color } : undefined}>
      {value}
    </div>
    <div className="ct-tile-l">{label}</div>
  </div>
);

export const EmptyNote: React.FC<{ children: React.ReactNode; warn?: boolean }> = ({
  children,
  warn
}) => (
  <div className={`ct-note${warn ? ' ct-note-warn' : ''}`}>
    {warn && (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3l9 16H3z" />
        <path d="M12 9v4M12 16h.01" />
      </svg>
    )}
    <span>{children}</span>
  </div>
);
