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
  Clock
} from 'lucide-react';
import { BeforeAfterSlider } from './BeforeAfterSlider';

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
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        {/* Header with Trade Status Banner */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: isWin ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), #0c101e)' : isLoss ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), #0c101e)' : '#0c101e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
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
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: account?.colorTag || '#3b82f6' }} />
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
              color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : '#94a3b8'
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
                  Opened At (DD/MM/YYYY, hh:mm)
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc', marginTop: '2px' }}>
                  {formatDateTimeDDMMYYYY(trade.entryDate)}
                </div>
              </div>

              <div style={{ width: '1px', height: '28px', backgroundColor: '#1e293b' }} />

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Closed At (DD/MM/YYYY, hh:mm)
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc', marginTop: '2px' }}>
                  {trade.exitDate ? formatDateTimeDDMMYYYY(trade.exitDate) : 'Trade Still Open'}
                </div>
              </div>
            </div>

            {tradeHolding && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <Clock size={14} color="#60a5fa" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                  Holding: {tradeHolding}
                </span>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', backgroundColor: '#060913', padding: '14px', borderRadius: '12px', border: '1px solid #1c273a' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Entry Price</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {trade.entryPrice}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Exit Price</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
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
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
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

          {/* Setup & Confluences */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Strategy Setup Model
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="badge" style={{ backgroundColor: '#1e293b', color: '#60a5fa', padding: '6px 12px', fontSize: '0.8rem' }}>
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
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
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
                style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: trade.notes }}
              />
            </div>
          )}

          {trade.lessons && (
            <div style={{ backgroundColor: '#070a16', padding: '14px', borderRadius: '10px', border: '1px solid #1a2538' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>Lessons & Feedback</div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
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
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            onClick={() => {
              if (window.confirm(`Delete trade ${trade.symbol}?`)) {
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
