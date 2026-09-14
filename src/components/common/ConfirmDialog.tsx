import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  /** When set, the user must type this exact text before the confirm button enables. */
  typeToConfirm?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useConfirm = (): ConfirmContextValue => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    setOptions(null);
    setTyped('');
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const modalRef = useModalA11y(Boolean(options), () => settle(false));

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setTyped('');
      setOptions(opts);
    });
  }, []);

  const variant = options?.variant || 'danger';
  const accent =
    variant === 'danger' ? 'var(--loss-red)'
    : variant === 'warning' ? '#f59e0b'
    : 'var(--theme-secondary-strong)';

  const accentBg =
    variant === 'danger' ? 'var(--loss-red-glow)'
    : variant === 'warning' ? 'rgba(245, 158, 11, 0.15)'
    : 'var(--theme-glow)';

  const canConfirm = !options?.typeToConfirm || typed.trim() === options.typeToConfirm;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className="modal-backdrop" style={{ zIndex: 3000 }} onClick={() => settle(false)}>
          <div
            ref={modalRef}
            className="modal-container"
            role="alertdialog"
            aria-modal="true"
            aria-label={options.title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            <div style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    backgroundColor: accentBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {variant === 'info' ? (
                    <Info size={20} color={accent} />
                  ) : variant === 'warning' ? (
                    <AlertTriangle size={20} color={accent} />
                  ) : (
                    <ShieldAlert size={20} color={accent} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {options.title}
                  </h3>
                  {options.message && (
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.55 }}>
                      {options.message}
                    </p>
                  )}
                </div>
              </div>

              {options.typeToConfirm && (
                <div className="input-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                  <label className="input-label">
                    Type{' '}
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {options.typeToConfirm}
                    </strong>{' '}
                    to confirm
                  </label>
                  <input
                    type="text"
                    className="input-control font-mono"
                    value={typed}
                    autoFocus
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canConfirm) settle(true);
                    }}
                    placeholder={options.typeToConfirm}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                disabled={!canConfirm}
                style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                onClick={() => settle(true)}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
