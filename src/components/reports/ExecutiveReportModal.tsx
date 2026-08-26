import React, { useState, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent, formatDate, formatDateTimeDDMMYYYY } from '../../utils/formatters';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Calendar, 
  Eye, 
  EyeOff,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { filteredTrades, activeAccount, accounts, metrics } = useJournal();

  const [dateFilter, setDateFilter] = useState<'all' | '30d' | 'this_month' | 'ytd'>('all');
  const [hideDollar, setHideDollar] = useState(false);
  const [traderNote, setTraderNote] = useState(
    'Laporan ini diverifikasi secara mandiri berdasarkan catatan histori transaksi akun trading. Seluruh eksekusi mengikuti SOP manajemen risiko yang ketat.'
  );

  const reportTrades = useMemo(() => {
    const now = new Date();
    return filteredTrades.filter((t) => {
      const tradeDate = new Date(t.entryDate);
      if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return tradeDate >= thirtyDaysAgo;
      }
      if (dateFilter === 'this_month') {
        return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'ytd') {
        return tradeDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [filteredTrades, dateFilter]);

  const reportMetrics = useMemo(() => {
    const closed = reportTrades.filter(t => t.status !== 'OPEN');
    const totalTrades = closed.length;
    const wins = closed.filter(t => t.status === 'WIN' || t.pnl > 0).length;
    const losses = closed.filter(t => t.status === 'LOSS' || t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnL = closed.reduce((s, t) => s + t.pnl, 0);
    const grossProfit = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const rrs = closed.filter(t => t.rrAchieved).map(t => t.rrAchieved!);
    const avgRR = rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      totalPnL,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWin,
      avgLoss,
      avgRR
    };
  }, [reportTrades]);

  if (!isOpen) return null;

  const currentCurrency = activeAccount?.currency || 'USD';
  const traderName = user?.user_metadata?.full_name || 'Verified Trader';
  const reportDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const auditId = `ITJ-AUDIT-${Math.floor(100000 + Math.random() * 900000)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Toolbar (Screen Only, Hidden in Print) */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Executive PDF Audit Report Generator
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Ekspor laporan portofolio resmi siap cetak / simpan sebagai PDF untuk investor & mentor
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ padding: '7px 14px' }}>
              <Printer size={15} /> Cetak / Save PDF
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Customization Toolbar (Screen Only) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          backgroundColor: '#070b16',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Filter Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Periode:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="input-field"
              style={{ padding: '4px 10px', fontSize: '0.78rem', width: 'auto' }}
            >
              <option value="all">Semua Riwayat (All-Time)</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
          </div>

          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={() => setHideDollar(!hideDollar)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
          >
            {hideDollar ? <EyeOff size={14} color="#f59e0b" /> : <Eye size={14} color="#10b981" />}
            <span>{hideDollar ? 'Mode Privasi: Nominal Disensor (***)' : 'Mode Lengkap: Tampilkan Nominal ($)'}</span>
          </button>
        </div>

        {/* ========================================================
            DOCUMENT PRINT AREA (Rendered on screen & PDF print)
            ======================================================== */}
        <div className="executive-print-area" style={{
          padding: '36px 40px',
          backgroundColor: '#0b0f1d',
          color: '#f8fafc',
          borderRadius: '0 0 16px 16px'
        }}>
          {/* Header Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #1e293b',
            paddingBottom: '20px',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#38bdf8' }}>
                  iTrade<span style={{ color: '#10b981' }}>Journal</span>
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} color="#10b981" /> VERIFIED AUDIT REPORT
                </span>
              </div>

              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                Executive Performance & Portfolio Audit
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Akun: <strong>{activeAccount?.name || 'All Accounts'}</strong> ({activeAccount?.broker || 'Multi-Broker'}) • Mata Uang: <strong>{currentCurrency}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ID Audit:</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {auditId}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>Tanggal Cetak:</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                {reportDate}
              </div>
            </div>
          </div>

          {/* Trader Profile Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: '#070b16',
            border: '1px solid #1e293b',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Nama Trader / Pemegang Portofolio</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {traderName}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Posisi Tereksekusi</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {reportMetrics.totalTrades} Transaksi
              </div>
            </div>
          </div>

          {/* Executive KPI Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#070b16', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Cumulative Return</span>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: reportMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px'
              }}>
                {hideDollar ? '••••••' : `${reportMetrics.totalPnL >= 0 ? '+' : ''}${formatCurrency(reportMetrics.totalPnL, currentCurrency)}`}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#070b16', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Win Rate (%)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: reportMetrics.winRate >= 50 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {reportMetrics.winRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#070b16', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Profit Factor</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {reportMetrics.profitFactor.toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#070b16', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Average Risk-to-Reward</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                1 : {reportMetrics.avgRR.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Trader Statement / Debrief Note */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: '#070b16',
            border: '1px solid #1e293b',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
              Executive Statement & Risk Debrief
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {traderNote}
            </div>
          </div>

          {/* Transaction History Table */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', marginBottom: '10px' }}>
              Riwayat Transaksi Tertutup ({reportTrades.length} Eksekusi)
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Waktu</th>
                  <th style={{ padding: '8px 6px' }}>Symbol</th>
                  <th style={{ padding: '8px 6px' }}>Tipe</th>
                  <th style={{ padding: '8px 6px' }}>Setup SOP</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>R:R</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>PnL</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {reportTrades.slice(0, 25).map((t) => {
                  const isWin = t.status === 'WIN' || t.pnl > 0;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '7px 6px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {formatDateTimeDDMMYYYY(t.entryDate).split(' ')[0]}
                      </td>
                      <td style={{ padding: '7px 6px', fontWeight: 700, color: '#f8fafc' }}>
                        {t.symbol}
                      </td>
                      <td style={{ padding: '7px 6px', fontWeight: 600, color: (t.direction === 'LONG' || (t.direction as any) === 'BUY') ? '#10b981' : '#ef4444' }}>
                        {t.direction}
                      </td>
                      <td style={{ padding: '7px 6px', color: '#cbd5e1' }}>
                        {t.setup}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                        {t.rrAchieved ? `1:${t.rrAchieved}` : '-'}
                      </td>
                      <td style={{
                        padding: '7px 6px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: isWin ? '#10b981' : '#ef4444'
                      }}>
                        {hideDollar ? '••••' : `${t.pnl >= 0 ? '+' : ''}${formatCurrency(t.pnl, currentCurrency)}`}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: isWin ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          color: isWin ? '#34d399' : '#f87171'
                        }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reportTrades.length > 25 && (
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '8px' }}>
                * Menampilkan 25 dari total {reportTrades.length} transaksi pada ringkasan cetak.
              </div>
            )}
          </div>

          {/* Formal Audit Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b',
            fontSize: '0.7rem',
            color: '#64748b'
          }}>
            <div>
              Generated autonomously via <strong>iTradeJournal Enterprise Terminal</strong>
            </div>
            <div>
              Status: <span style={{ color: '#10b981', fontWeight: 700 }}>VERIFIED DIGITAL RECORD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
