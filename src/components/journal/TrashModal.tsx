import React from 'react';
import { RotateCcw, Trash2, X } from 'lucide-react';
import { useJournal } from '../../context/JournalContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useConfirm } from '../common/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RETENTION_DAYS = 30;

const daysUntilPurge = (deletedAt?: string): number => {
  if (!deletedAt) return RETENTION_DAYS;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, RETENTION_DAYS - Math.floor(elapsed / (24 * 60 * 60 * 1000)));
};

/** Lists soft-deleted trades with restore / permanent delete / empty actions. */
export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const { trashedTrades, restoreTrashedTrades, deleteForever, emptyTrash, accountsMap } = useJournal();
  const { confirm } = useConfirm();
  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleDeleteForever = async (id: string, symbol: string) => {
    const ok = await confirm({
      title: `Permanently delete ${symbol}?`,
      message: 'This cannot be undone — the trade will be removed from the database.',
      confirmText: 'Delete forever',
      variant: 'danger'
    });
    if (ok) deleteForever([id]);
  };

  const handleEmpty = async () => {
    const ok = await confirm({
      title: `Empty Trash (${trashedTrades.length} trade${trashedTrades.length === 1 ? '' : 's'})?`,
      message: 'All trashed trades will be permanently deleted. This cannot be undone.',
      confirmText: 'Empty trash',
      variant: 'danger'
    });
    if (ok) emptyTrash();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Trash"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Trash2 size={17} color="var(--text-secondary)" />
            <span style={{ fontWeight: 800 }}>Trash</span>
            {trashedTrades.length > 0 && (
              <span className="badge" style={{ fontSize: '0.68rem' }}>{trashedTrades.length}</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close trash">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 22px', maxHeight: '52vh', overflowY: 'auto' }}>
          {trashedTrades.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '28px 0' }}>
              Trash is empty. Deleted trades are kept here for {RETENTION_DAYS} days before auto-delete.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Deleted trades are kept for {RETENTION_DAYS} days, then removed automatically.
              </p>
              {trashedTrades.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>{t.symbol}</span>
                      <span
                        className={`badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}
                        style={{ fontSize: '0.62rem' }}
                      >
                        {t.direction}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: t.pnl > 0 ? 'var(--profit-green)' : t.pnl < 0 ? 'var(--loss-red)' : 'var(--text-secondary)'
                        }}
                      >
                        {t.pnl > 0 ? '+' : ''}
                        {formatCurrency(t.pnl, accountsMap[t.accountId]?.currency || 'USD')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Deleted {t.deletedAt ? new Date(t.deletedAt).toLocaleDateString() : ''} · auto-delete in {daysUntilPurge(t.deletedAt)} days
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => restoreTrashedTrades([t.id])}
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteForever(t.id, t.symbol)}
                      style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--loss-red)' }}
                      title="Delete forever"
                      aria-label={`Delete ${t.symbol} forever`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleEmpty}
            disabled={trashedTrades.length === 0}
            style={{ color: trashedTrades.length === 0 ? 'var(--text-muted)' : 'var(--loss-red)', opacity: trashedTrades.length === 0 ? 0.5 : 1 }}
          >
            <Trash2 size={13} /> Empty Trash
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
