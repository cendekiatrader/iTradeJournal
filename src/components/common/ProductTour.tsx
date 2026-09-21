import React, { useEffect, useState } from 'react';
import { Compass, ArrowRight, X } from 'lucide-react';

interface TourStep {
  target?: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to iTradeJournal 👋',
    body: 'This 30-second tour shows you the fastest paths through the app. You can replay it anytime from the command palette (Ctrl+K → “Start product tour”).'
  },
  {
    target: '[data-tour="log-trade"]',
    title: 'Log trades in seconds',
    body: 'Click here — or just press N — to open the trade form. New entries open in Quick mode with only the essential fields.'
  },
  {
    target: '[data-tour="nav-playbook"]',
    title: 'Your A+ Playbook',
    body: 'Store your best setup SOPs with checklists and Before/After blueprints. A trade form will auto-load the matching playbook.'
  },
  {
    target: '[data-tour="quick-risk-dock"]',
    title: 'Quick-Risk Dock',
    body: 'A floating lot-size calculator that stays on top of MT5 / TradingView. Can even pop out as an always-on-top desktop window.'
  },
  {
    title: 'Pro shortcuts',
    body: 'Press ? for the full cheat sheet, Ctrl+K for the command palette, and D / J / M / S to jump between pages.'
  }
];

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Steps pointing at something the user has hidden (progressive disclosure) are dropped,
  // so the tour never highlights an element that is not in the DOM.
  const [steps, setSteps] = useState<TourStep[]>(STEPS);

  useEffect(() => {
    if (!isOpen) return;
    setSteps(STEPS.filter(s => !s.target || document.querySelector(s.target)));
    setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const compute = () => {
      const target = steps[step]?.target;
      if (!target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(target);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    compute();
    window.addEventListener('resize', compute);
    const interval = window.setInterval(compute, 700);
    return () => {
      window.removeEventListener('resize', compute);
      window.clearInterval(interval);
    };
  }, [isOpen, step, steps]);

  if (!isOpen || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const pad = 6;

  const tooltipWidth = 340;
  const left = rect
    ? Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - tooltipWidth - 12))
    : Math.max(12, window.innerWidth / 2 - tooltipWidth / 2);
  const below = rect ? rect.bottom + 14 : 0;
  const useBelow = rect ? below + 180 < window.innerHeight : false;
  const top = rect ? (useBelow ? below : Math.max(12, rect.top - 190)) : Math.max(80, window.innerHeight / 2 - 120);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2600 }} role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <div
          style={{
            position: 'fixed',
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: '12px',
            border: '2px solid var(--theme-primary)',
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.82)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.82)' }} />
      )}

      <div
        className="card"
        style={{
          position: 'fixed',
          left,
          top,
          width: tooltipWidth,
          zIndex: 2601,
          border: '1px solid var(--theme-primary)',
          boxShadow: 'var(--shadow-glow)',
          padding: '18px 18px 14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} color="var(--theme-primary)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--theme-secondary)' }}>
              Tour · {step + 1}/{steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>

        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>{current.title}</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>{current.body}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '0.78rem' }}>
            Skip tour
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (isLast) onClose();
              else setStep((s) => Math.min(steps.length - 1, s + 1));
            }}
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
