import React from 'react';
import { useJournal } from '../../context/JournalContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toasts, hideToast } = useJournal();

  if (toasts.length === 0) return null;

  const iconFor = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#10b981" />;
      case 'error':
        return <AlertTriangle size={18} color="#ef4444" />;
      default:
        return <Info size={18} color="var(--theme-secondary-strong)" />;
    }
  };

  const borderFor = (type: string) => {
    switch (type) {
      case 'success': return 'rgba(16, 185, 129, 0.4)';
      case 'error': return 'rgba(239, 68, 68, 0.4)';
      default: return 'color-mix(in srgb, var(--theme-secondary-strong) 40%, transparent)';
    }
  };

  return (
    <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            backgroundColor: 'var(--bg-panel)',
            border: `1px solid ${borderFor(toast.type)}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
            minWidth: '260px'
          }}
        >
          {iconFor(toast.type)}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, flex: 1 }}>
            {toast.message}
          </span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                hideToast(toast.id);
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => hideToast(toast.id)}
            aria-label="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px',
              flexShrink: 0
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
