import React from 'react';
import { Trade, TradingAccount } from '../../types';
import { formatCurrency, formatDate, formatDateTimeDDMMYYYY, formatDuration } from '../../utils/formatters';
import { 
  X, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Clock,
  History,
  RotateCcw
} from 'lucide-react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useConfirm } from '../common/ConfirmDialog';
import { useJournal } from '../../context/JournalContext';

const prettifyField = (field: string) =>
  field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '—';
  const str = String(value);
  return str.length > 40 ? `${str.slice(0, 37)}…` : str;
};

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  account?: TradingAccount;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  onEdit,
  onDelete,
  account
}) => {
  const { confirm } = useConfirm();
  const { getTradeAudit, revertTradeAuditEntry, customFieldDefs } = useJournal();
  const modalRef = useModalA11y(Boolean(trade), onClose);
  const auditEntries = trade ? getTradeAudit(trade.id) : [];

  if (!trade) return null;

  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const currency = account?.currency || 'USD';

  let tradeHolding = '';
  if (trade.entryDate && trade.exitDate) {
    const start = new Date(trade.entryDate).getTime();
    const end = new Date(trade.exitDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      tradeHolding = formatDuration((end - start) / (1000 * 60));
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} className="modal-container" role="dialog" aria-modal="true" aria-label="Trade Details" tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        {/* Header with Trade Status Banner */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: isWin ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), var(--bg-card))' : isLoss ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), var(--bg-card))' : 'var(--bg-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {trade.symbol}
              </h2>
              <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                {trade.direction === 'LONG' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trade.direction}
              </span>
              <span className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}>
                {trade.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDateTimeDDMMYYYY(trade.entryDate)}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: account?.colorTag || 'var(--theme-secondary-strong)' }} />
                {account?.name}
              </span>
              <span>•</span>
              <span className="badge badge-session" style={{ fontSize: '0.68rem' }}>{trade.session}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : 'var(--text-secondary)'
            }}>
              {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, currency)}
            </div>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {trade.pnlPercent > 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Execution Timeline (Opened At & Closed At) */}
          <div style={{ backgroundColor: '#070b18', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1c283f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Opened At
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {formatDateTimeDDMMYYYY(trade.entryDate)}
                </div>
              </div>

              <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--bg-chip)' }} />

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Closed At
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {trade.exitDate ? formatDateTimeDDMMYYYY(trade.exitDate) : 'Trade Still Open'}
                </div>
              </div>
            </div>

            {tradeHolding && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent)', padding: '6px 12px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)' }}>
                <Clock size={14} color="var(--theme-secondary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--theme-secondary)', fontFamily: 'var(--font-mono)' }}>
                  Holding: {tradeHolding}
                </span>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', backgroundColor: '#060913', padding: '14px', borderRadius: '12px', border: '1px solid #1c273a' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Entry Price</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {trade.entryPrice}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {trade.exits && trade.exits.length > 0 ? 'Avg Exit Price' : 'Exit Price'}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {trade.exitPrice || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Stop Loss</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss-red)' }}>
                {trade.stopLoss || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Take Profit</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                {trade.takeProfit || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {trade.assetClass === 'Crypto' ? 'Quantity (Units)' : trade.assetClass === 'Indices' ? 'Contracts' : 'Position Size (Lots)'}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {trade.quantity} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trade.assetClass === 'Crypto' ? 'Units' : trade.assetClass === 'Indices' ? 'Ctr' : 'Lots'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Realized R:R</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: trade.rrAchieved && trade.rrAchieved >= 0 ? 'var(--profit-green)' : 'var(--loss-red)' }}>
                {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(2)}` : '-'}
              </div>
            </div>
          </div>

          {/* Partial Exits Breakdown (if exists) */}
          {trade.exits && trade.exits.length > 0 && (
            <div style={{ backgroundColor: '#070b1a', padding: '14px', borderRadius: '10px', border: '1px solid var(--bg-chip)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Scaling Out / Partial Exits History</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                {trade.exits.map((item, idx) => (
                  <div key={item.id || idx} style={{ backgroundColor: '#0b1328', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1c2b48' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-secondary)' }}>{item.label || `TP${idx + 1}`}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.percentage ? `${item.percentage}%` : ''}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      Exit: <strong>{item.exitPrice}</strong> ({item.quantity} {trade.assetClass === 'Crypto' ? 'Units' : 'Lots'})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup & Confluences */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Strategy Setup Model
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="badge" style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--theme-secondary)', padding: '6px 12px', fontSize: '0.8rem' }}>
                {trade.setup}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Timeframe: <strong>{trade.timeframe}</strong>
              </span>
            </div>

            {trade.confluences && trade.confluences.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Confluences Verified:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {trade.confluences.map((c, i) => (
                    <span key={i} className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--profit-green)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.72rem' }}>
                      <CheckCircle2 size={12} /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Psychology & Discipline Audit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#070a16', padding: '14px', borderRadius: '10px', border: '1px solid #1a2538' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Psychological State</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {trade.emotion}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trading Plan Discipline</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: trade.rulesFollowed ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 700, fontSize: '0.9rem' }}>
                {trade.rulesFollowed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {trade.rulesFollowed ? 'Followed Rules 100%' : 'Broken Rule / Impulse'}
              </div>
            </div>
          </div>

          {/* Notes & Rich Journal */}
          {trade.notes && (
            <div style={{ backgroundColor: '#070a16', padding: '16px', borderRadius: '10px', border: '1px solid #1a2538' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#93c5fd', marginBottom: '8px' }}>
                Trade Notes & Visual Analysis
              </div>
              <div 
                className="rich-notes-content"
                style={{ fontSize: '0.875rem', color: 'var(--text-strong)', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: trade.notes }}
              />
            </div>
          )}

          {trade.lessons && (
            <div style={{ backgroundColor: '#070a16', padding: '14px', borderRadius: '10px', border: '1px solid #1a2538' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>Lessons & Feedback</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-strong)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {trade.lessons}
              </p>
            </div>
          )}

          {/* Dual Chart Before/After Slider or Single Screenshot Preview */}
          {trade.screenshots && trade.screenshots.length >= 2 ? (
            <BeforeAfterSlider
              beforeImage={trade.screenshots[0]}
              afterImage={trade.screenshots[1]}
              beforeLabel="Before (Entry Setup)"
              afterLabel="After (Execution / Exit)"
            />
          ) : trade.screenshots && trade.screenshots.length === 1 ? (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Chart Screenshot
              </div>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #23324d', maxHeight: '300px', backgroundColor: '#070b14' }}>
                <img
                  src={trade.screenshots[0]}
                  alt="Trade Chart Screenshot"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          ) : null}

          {/* Edit History / Audit Trail */}
          {auditEntries.length > 0 && (
            <div style={{ backgroundColor: '#070a16', padding: '14px', borderRadius: '10px', border: '1px solid #1a2538' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={14} /> Edit History ({auditEntries.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '170px', overflowY: 'auto' }}>
                {auditEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(entry.at).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => revertTradeAuditEntry(entry.id)}
                        title="Restore the values from before this edit"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--theme-secondary)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, padding: '2px 4px', flexShrink: 0 }}
                      >
                        <RotateCcw size={11} /> Revert
                      </button>
                    </div>
                    <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {entry.changes.map((c, i) => (
                        <div key={i}>
                          <strong style={{ color: 'var(--text-primary)' }}>{prettifyField(c.field)}</strong>:{' '}
                          <span style={{ textDecoration: 'line-through', opacity: 0.75 }}>{formatAuditValue(c.from)}</span>{' '}
                          <span style={{ color: 'var(--theme-secondary)' }}>→ {formatAuditValue(c.to)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {customFieldDefs.length > 0 && trade.customFields && Object.keys(trade.customFields).length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Custom Fields
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {customFieldDefs
                  .filter((d) => trade.customFields?.[d.id] !== undefined && trade.customFields?.[d.id] !== '')
                  .map((d) => (
                    <div key={d.id} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {d.label}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {String(trade.customFields?.[d.id])}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: `Delete trade ${trade.symbol}?`,
                message: 'This trade will be permanently removed from your journal.',
                confirmText: 'Delete trade',
                variant: 'danger'
              });
              if (confirmed) {
                onDelete(trade.id);
                onClose();
              }
            }}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={14} /> Delete
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onClose();
                onEdit(trade);
              }}
              className="btn btn-secondary btn-sm"
            >
              <Edit3 size={14} /> Edit Trade
            </button>

            <button onClick={onClose} className="btn btn-primary btn-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
