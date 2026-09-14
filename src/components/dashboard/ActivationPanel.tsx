import React from 'react';
import { CheckCircle2, Circle, Zap, Sparkles, X } from 'lucide-react';

interface ActivationPanelProps {
  accountName?: string;
  analyticsDone: boolean;
  onLogTrade: () => void;
  onStartSample: () => void;
  onDismiss: () => void;
}

interface StepRow {
  label: string;
  sub: string;
  done: boolean;
}

/** First-run welcome panel shown on the dashboard until the first trades exist. */
export const ActivationPanel: React.FC<ActivationPanelProps> = ({
  accountName,
  analyticsDone,
  onLogTrade,
  onStartSample,
  onDismiss
}) => {
  const steps: StepRow[] = [
    {
      label: 'Trading account created',
      sub: accountName ? `Active account: ${accountName}` : 'All set',
      done: true
    },
    {
      label: 'Log your first trade',
      sub: 'The quick form takes about 20 seconds',
      done: false
    },
    {
      label: 'Explore Analytics & insights',
      sub: 'Charts, edge stats, and automatic insights build from your trades',
      done: analyticsDone
    }
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        padding: '26px 28px',
        marginBottom: '20px',
        border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 32%, var(--border-color))',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--theme-secondary-strong) 9%, var(--bg-card)) 0%, var(--bg-card) 55%)',
        overflow: 'hidden'
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-70px',
          right: '-40px',
          width: '260px',
          height: '180px',
          background:
            'radial-gradient(ellipse, color-mix(in srgb, var(--theme-secondary-strong) 22%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide getting-started checklist"
        title="Hide"
        className="btn btn-ghost btn-icon btn-sm"
        style={{ position: 'absolute', top: '12px', right: '12px', padding: '5px', opacity: 0.7 }}
      >
        <X size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Welcome to iTradeJournal 👋
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Get set up in 3 quick steps — then this dashboard fills itself with your stats.
          </p>
        </div>
        <span
          className="badge"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 14%, transparent)',
            color: 'var(--theme-secondary)',
            fontWeight: 800,
            fontSize: '0.75rem',
            padding: '5px 12px'
          }}
        >
          {doneCount}/3 completed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', position: 'relative' }}>
        {steps.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
            {s.done ? (
              <CheckCircle2 size={18} color="var(--profit-green)" style={{ flexShrink: 0, marginTop: '1px' }} />
            ) : (
              <Circle size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
            )}
            <div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: s.done ? 'var(--text-secondary)' : 'var(--text-primary)',
                  textDecoration: s.done ? 'line-through' : 'none'
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '1px' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px', position: 'relative' }}>
        <button type="button" className="btn btn-primary" onClick={onLogTrade} style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 800 }}>
          <Zap size={15} /> Log Your First Trade
        </button>
        <button type="button" className="btn btn-secondary" onClick={onStartSample} style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700 }}>
          <Sparkles size={14} /> Start With Sample Data
        </button>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', position: 'relative' }}>
        Sample data is added to your account so you can look around — delete it anytime.
      </p>
    </div>
  );
};
