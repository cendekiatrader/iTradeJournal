import React, { useState, useEffect } from 'react';
import { useJournal } from '../../context/JournalContext';
import { StatCard } from '../common/StatCard';
import { EquityChart } from '../common/EquityChart';
import { MarketSessionClock } from '../common/MarketSessionClock';
import { PropFirmGauge } from './PropFirmGauge';
import { formatCurrency, formatPercent, formatDateTimeDDMMYYYY } from '../../utils/formatters';
import { 
  Percent, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Activity, 
  Flame, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Compass,
  Layers,
  Calendar,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { Trade } from '../../types';

interface DashboardViewProps {
  onOpenTradeModal: () => void;
  onViewTradeDetail: (trade: Trade) => void;
  onNavigateToJournal: () => void;
  onNavigateToNews?: () => void;
}

const DEFAULT_CARD_VISIBILITY: Record<string, boolean> = {
  netPnl: true,
  winRate: true,
  profitFactor: true,
  avgRR: true,
  maxDrawdown: true,
  recoveryFactor: true,
  disciplineRate: true,
  dailyRunRate: true,
  currentStreak: true,
  longShortBias: true,
  avgHolding: true,
  totalVolume: true,
};

const CARD_CONFIG: { id: string; label: string; category: string }[] = [
  { id: 'netPnl', label: 'Net Cumulative PnL', category: 'Core Profitability' },
  { id: 'winRate', label: 'Win Rate', category: 'Core Profitability' },
  { id: 'profitFactor', label: 'Profit Factor', category: 'Core Profitability' },
  { id: 'avgRR', label: 'Average Realized R:R', category: 'Core Profitability' },
  { id: 'maxDrawdown', label: 'Max Drawdown', category: 'Risk Management' },
  { id: 'recoveryFactor', label: 'Recovery Factor', category: 'Risk Management' },
  { id: 'disciplineRate', label: 'Trade Discipline Rate', category: 'Risk Management' },
  { id: 'dailyRunRate', label: 'Daily Run Rate', category: 'Risk Management' },
  { id: 'currentStreak', label: 'Current Streak', category: 'Execution Habits' },
  { id: 'longShortBias', label: 'Long vs Short Bias', category: 'Execution Habits' },
  { id: 'avgHolding', label: 'Avg Holding Period', category: 'Execution Habits' },
  { id: 'totalVolume', label: 'Total Traded Volume', category: 'Execution Habits' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenTradeModal,
  onViewTradeDetail,
  onNavigateToJournal,
  onNavigateToNews
}) => {
  const { metrics, equityCurve, activeAccount, filteredTrades, accountsMap } = useJournal();
  const currentCurrency = activeAccount?.currency || 'USD';

  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('itrade_dashboard_cards');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_CARD_VISIBILITY;
  });

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('itrade_dashboard_cards', JSON.stringify(visibleCards));
    } catch (e) {
      // ignore
    }
  }, [visibleCards]);

  const toggleCard = (id: string) => {
    setVisibleCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = () => {
    const allTrue = CARD_CONFIG.reduce((acc, c) => ({ ...acc, [c.id]: true }), {});
    setVisibleCards(allTrue);
  };

  const handleReset = () => {
    setVisibleCards(DEFAULT_CARD_VISIBILITY);
  };

  const recentTrades = [...filteredTrades]
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, 6);

  const activeCount = Object.values(visibleCards).filter(Boolean).length;

  return (
    <div>
      {/* Top Welcome & Summary Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Performance Dashboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeAccount ? `Account overview for ${activeAccount.name} (${activeAccount.broker})` : 'All Trading Accounts combined metrics & growth'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowCustomizeModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.8rem' }}
            title="Pilih kartu metrik yang ingin ditampilkan atau disembunyikan"
          >
            <SlidersHorizontal size={15} />
            <span>Customize Cards ({activeCount}/12)</span>
          </button>

          <button onClick={onOpenTradeModal} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            + Log New Trade
          </button>
        </div>
      </div>

      {/* Real-time Multi-Market Session & Killzone Radar */}
      <MarketSessionClock />

      {/* Prop Firm Rule Tracker if applicable */}
      {activeAccount && <PropFirmGauge account={activeAccount} metrics={metrics} />}

      {/* Key Metric Stats Grid */}
      <div className="grid-stats">
        {/* Row 1: Core Profitability & Edge */}
        {visibleCards.netPnl && (
          <StatCard
            title="Net Cumulative PnL"
            value={formatCurrency(metrics.totalPnL, currentCurrency)}
            subValue={formatPercent(metrics.totalPnlPercent)}
            subValueType={metrics.totalPnL >= 0 ? 'positive' : 'negative'}
            icon={metrics.totalPnL >= 0 ? TrendingUp : TrendingDown}
            iconColor={metrics.totalPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'}
            iconBg={metrics.totalPnL >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
          />
        )}

        {visibleCards.winRate && (
          <StatCard
            title="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
            subValue={`${metrics.winningTrades} Wins / ${metrics.losingTrades} Losses`}
            subValueType={metrics.winRate >= 50 ? 'positive' : 'negative'}
            icon={Percent}
            iconColor="#3b82f6"
            iconBg="rgba(59, 130, 246, 0.12)"
            progress={metrics.winRate}
            progressColor={metrics.winRate >= 50 ? 'var(--profit-green)' : 'var(--loss-red)'}
          />
        )}

        {visibleCards.profitFactor && (
          <StatCard
            title="Profit Factor"
            value={metrics.profitFactor > 99 ? '99.0+' : metrics.profitFactor.toFixed(2)}
            subValue={`Gross Profit: ${formatCurrency(metrics.grossProfit, currentCurrency, true)}`}
            subValueType={metrics.profitFactor >= 1.5 ? 'positive' : 'neutral'}
            icon={Scale}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.12)"
          />
        )}

        {visibleCards.avgRR && (
          <StatCard
            title="Average Realized R:R"
            value={`1 : ${metrics.avgRR > 0 ? metrics.avgRR.toFixed(2) : '0.00'}`}
            subValue={`Expectancy: ${formatCurrency(metrics.expectancy, currentCurrency)} / trade`}
            subValueType="accent"
            icon={Activity}
            iconColor="#8b5cf6"
            iconBg="rgba(139, 92, 246, 0.12)"
          />
        )}

        {/* Row 2: Risk Management & Account Defense */}
        {visibleCards.maxDrawdown && (
          <StatCard
            title="Max Drawdown"
            value={`${metrics.maxDrawdownPercent.toFixed(1)}%`}
            subValue={formatCurrency(metrics.maxDrawdown, currentCurrency)}
            subValueType={metrics.maxDrawdownPercent < 5 ? 'positive' : 'negative'}
            icon={ShieldCheck}
            iconColor={metrics.maxDrawdownPercent < 5 ? 'var(--profit-green)' : 'var(--loss-red)'}
            iconBg="rgba(239, 68, 68, 0.1)"
          />
        )}

        {visibleCards.recoveryFactor && (
          <StatCard
            title="Recovery Factor"
            value={`${metrics.recoveryFactor > 99 ? '99.0+' : metrics.recoveryFactor.toFixed(2)}x`}
            subValue={metrics.recoveryFactor >= 2 ? 'Excellent Resilience' : 'Moderate Resilience'}
            subValueType={metrics.recoveryFactor >= 2 ? 'positive' : 'neutral'}
            icon={Zap}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.12)"
          />
        )}

        {visibleCards.disciplineRate && (
          <StatCard
            title="Trade Discipline Rate"
            value={`${metrics.disciplineRate.toFixed(1)}%`}
            subValue={`${metrics.rulesFollowedCount}/${metrics.totalTrades} Rules Followed`}
            subValueType={metrics.disciplineRate >= 80 ? 'positive' : metrics.disciplineRate >= 50 ? 'neutral' : 'negative'}
            icon={CheckCircle2}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.12)"
            progress={metrics.disciplineRate}
            progressColor={metrics.disciplineRate >= 80 ? '#10b981' : '#f59e0b'}
          />
        )}

        {visibleCards.dailyRunRate && (
          <StatCard
            title="Daily Run Rate"
            value={`${metrics.dailyRunRate >= 0 ? '+' : ''}${formatCurrency(metrics.dailyRunRate, currentCurrency)}`}
            subValue={`Across ${metrics.activeTradingDays} active days`}
            subValueType={metrics.dailyRunRate >= 0 ? 'positive' : 'negative'}
            icon={Calendar}
            iconColor="#14b8a6"
            iconBg="rgba(20, 184, 166, 0.12)"
          />
        )}

        {/* Row 3: Execution Habits & Momentum */}
        {visibleCards.currentStreak && (
          <StatCard
            title="Current Streak"
            value={metrics.currentStreak.count > 0 ? `${metrics.currentStreak.count} ${metrics.currentStreak.type}` : 'None'}
            subValue={`Best: ${metrics.bestTrade > 0 ? `+${formatCurrency(metrics.bestTrade, currentCurrency, true)}` : '-'}${metrics.worstTrade < 0 ? ` • Worst: -${formatCurrency(Math.abs(metrics.worstTrade), currentCurrency, true)}` : ''}`}
            subValueType={metrics.currentStreak.type === 'WIN' ? 'positive' : 'negative'}
            icon={Flame}
            iconColor="#ec4899"
            iconBg="rgba(236, 72, 153, 0.12)"
          />
        )}

        {visibleCards.longShortBias && (
          <StatCard
            title="Long vs Short Bias"
            value={`L ${metrics.longWinRate.toFixed(0)}% | S ${metrics.shortWinRate.toFixed(0)}%`}
            subValue={`${metrics.longTradesCount} Longs / ${metrics.shortTradesCount} Shorts`}
            subValueType={metrics.longWinRate >= 50 && metrics.shortWinRate >= 50 ? 'positive' : 'accent'}
            icon={Compass}
            iconColor="#60a5fa"
            iconBg="rgba(96, 165, 250, 0.12)"
          />
        )}

        {visibleCards.avgHolding && (
          <StatCard
            title="Avg Holding Period"
            value={metrics.avgHoldingFormatted}
            subValue={`Based on ${metrics.totalTrades} closed trades`}
            subValueType="accent"
            icon={Clock}
            iconColor="#06b6d4"
            iconBg="rgba(6, 182, 212, 0.12)"
          />
        )}

        {visibleCards.totalVolume && (
          <StatCard
            title="Total Traded Volume"
            value={`${metrics.totalVolume >= 100 ? metrics.totalVolume.toFixed(1) : metrics.totalVolume.toFixed(2)}`}
            subValue="Lots / Contracts / Units"
            subValueType="accent"
            icon={Layers}
            iconColor="#a855f7"
            iconBg="rgba(168, 85, 247, 0.12)"
          />
        )}
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid-2col">
        {/* Equity Curve Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--profit-green)" />
                <span>Cumulative Equity Growth</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Account balance growth timeline across all closed trades
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge" style={{ backgroundColor: '#131e33', color: '#60a5fa' }}>
                {equityCurve.length - 1} Closed Points
              </span>
            </div>
          </div>

          <EquityChart data={equityCurve} currency={currentCurrency} height={300} />
        </div>

        {/* Win/Loss & Edge Summary Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <div className="card-title">
                <Sparkles size={18} color="#f59e0b" />
                <span>Trade Performance Edge</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              {/* Avg Holding Period row in edge summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '10px', border: '1px solid #1c273a' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg Holding Period</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {metrics.avgHoldingFormatted}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expectancy</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                    +{formatCurrency(metrics.expectancy, currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Avg Win vs Avg Loss */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '10px', border: '1px solid #1c273a' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Win</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                    +{formatCurrency(metrics.avgWin, currentCurrency)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Loss</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss-red)' }}>
                    -{formatCurrency(metrics.avgLoss, currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Win/Loss Ratio */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '10px', border: '1px solid #1c273a' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Win / Loss Payout Ratio</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                  {metrics.winLossRatio.toFixed(2)}x
                </span>
              </div>

              {/* Consecutive Streaks */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '10px', border: '1px solid #1c273a' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Win Streak</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                  {metrics.consecutiveWins} Trades
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Risk Per Trade Target: <strong>1.0% - 2.0%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={18} color="#60a5fa" />
            <span>Recent Executions</span>
          </div>
          <button onClick={onNavigateToJournal} className="btn btn-ghost btn-sm" style={{ color: '#60a5fa' }}>
            View Full Journal ({filteredTrades.length} trades) →
          </button>
        </div>

        {recentTrades.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No trades recorded yet. Click "+ Log New Trade" above to get started!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Opened At</th>
                  <th style={{ padding: '10px 12px' }}>Account</th>
                  <th style={{ padding: '10px 12px' }}>Symbol</th>
                  <th style={{ padding: '10px 12px' }}>Side</th>
                  <th style={{ padding: '10px 12px' }}>Setup / Strategy</th>
                  <th style={{ padding: '10px 12px' }}>Session</th>
                  <th style={{ padding: '10px 12px' }}>R:R</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net PnL</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => {
                  const account = accountsMap[trade.accountId];
                  const isWin = trade.status === 'WIN';
                  const isLoss = trade.status === 'LOSS';

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => onViewTradeDetail(trade)}
                      style={{
                        borderBottom: '1px solid #141d2d',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#101726')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        {formatDateTimeDDMMYYYY(trade.entryDate)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: account?.colorTag || '#3b82f6' }} />
                          {account?.name || 'Account'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        {trade.symbol}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {trade.direction}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {trade.setup}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-session" style={{ fontSize: '0.7rem' }}>
                          {trade.session}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                        {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(1)}` : (trade.rrPlanned ? `1:${trade.rrPlanned.toFixed(1)}` : '-')}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : '#94a3b8'
                      }}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, account?.currency || 'USD')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customize Stat Cards Modal */}
      {showCustomizeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0c1322',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Customize Dashboard Cards
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Pilih metrik yang ingin Anda tampilkan atau sembunyikan di dashboard utama. Preferensi akan otomatis tersimpan di browser Anda.
            </p>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1a2538' }}>
              <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700 }}>
                {activeCount} dari 12 Kartu Aktif
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Tampilkan Semua
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#131b2e',
                    color: '#94a3b8',
                    border: '1px solid #23304a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={12} /> Reset Default
                </button>
              </div>
            </div>

            {/* Cards Checkbox List by Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {['Core Profitability', 'Risk Management', 'Execution Habits'].map((cat) => {
                const catCards = CARD_CONFIG.filter(c => c.category === cat);
                return (
                  <div key={cat}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      {cat}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {catCards.map((card) => {
                        const isChecked = !!visibleCards[card.id];
                        return (
                          <button
                            type="button"
                            key={card.id}
                            onClick={() => toggleCard(card.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.12)' : '#070b16',
                              border: isChecked ? '1px solid #3b82f6' : '1px solid #1a2538',
                              color: isChecked ? '#f8fafc' : '#64748b',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 400 }}>
                              {card.label}
                            </span>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              backgroundColor: isChecked ? '#3b82f6' : '#141d2e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '11px',
                              flexShrink: 0
                            }}>
                              {isChecked && <Check size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1a2538', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
