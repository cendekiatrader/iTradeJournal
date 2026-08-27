import React from 'react';
import { useJournal } from '../../context/JournalContext';
import { StatCard } from '../common/StatCard';
import { EquityChart } from '../common/EquityChart';
import { MarketSessionClock } from '../common/MarketSessionClock';
import { PropFirmGauge } from './PropFirmGauge';
import { StatCardSkeleton, TableRowSkeleton } from '../common/Skeleton';
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
  Plus,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Trade } from '../../types';

interface DashboardViewProps {
  onOpenTradeModal: () => void;
  onViewTradeDetail: (trade: Trade) => void;
  onNavigateToJournal: () => void;
  onNavigateToNews?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenTradeModal,
  onViewTradeDetail,
  onNavigateToJournal,
  onNavigateToNews
}) => {
  const { metrics, equityCurve, activeAccount, filteredTrades, accountsMap, isLoadingCloud } = useJournal();
  const currentCurrency = activeAccount?.currency || 'USD';

  const recentTrades = [...filteredTrades]
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Performance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeAccount ? `Account overview for ${activeAccount.name} (${activeAccount.broker})` : 'All Trading Accounts combined metrics & growth'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenTradeModal} 
            className="btn btn-primary min-h-touch px-5 font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-theme-glow/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Log New Trade</span>
          </button>
        </div>
      </div>

      {/* High-Impact News Live Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/25 gap-3 transition-all hover:border-red-500/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-red-400 flex items-center gap-2">
              <span>High-Impact Economic Radar: Waspada Rilis Berita Red Folder</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                RADAR
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              US CPI, NFP, & Keputusan Suku Bunga FOMC memicu lonjakan volatilitas & pelebaran spread.
            </div>
          </div>
        </div>

        {onNavigateToNews && (
          <button 
            onClick={onNavigateToNews}
            className="btn btn-secondary min-h-touch text-xs px-3.5 py-1.5 border-red-500/40 text-red-300 hover:bg-red-500/15 whitespace-nowrap self-start sm:self-auto transition-colors flex items-center gap-1.5"
          >
            <span>Lihat Kalender Berita Live</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Real-time Multi-Market Session & Killzone Radar */}
      <MarketSessionClock />

      {/* Prop Firm Rule Tracker if applicable */}
      {activeAccount && <PropFirmGauge account={activeAccount} metrics={metrics} />}

      {/* Key Metric Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoadingCloud ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Net Cumulative PnL"
              value={formatCurrency(metrics.totalPnL, currentCurrency)}
              subValue={formatPercent(metrics.totalPnlPercent)}
              subValueType={metrics.totalPnL >= 0 ? 'positive' : 'negative'}
              icon={metrics.totalPnL >= 0 ? TrendingUp : TrendingDown}
              iconColor={metrics.totalPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'}
              iconBg={metrics.totalPnL >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
            />

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

            <StatCard
              title="Profit Factor"
              value={metrics.profitFactor > 99 ? '99.0+' : metrics.profitFactor.toFixed(2)}
              subValue={`Gross Profit: ${formatCurrency(metrics.grossProfit, currentCurrency, true)}`}
              subValueType={metrics.profitFactor >= 1.5 ? 'positive' : 'neutral'}
              icon={Scale}
              iconColor="#f59e0b"
              iconBg="rgba(245, 158, 11, 0.12)"
            />

            <StatCard
              title="Average Realized R:R"
              value={`1 : ${metrics.avgRR > 0 ? metrics.avgRR.toFixed(2) : '0.00'}`}
              subValue={`Expectancy: ${formatCurrency(metrics.expectancy, currentCurrency)} / trade`}
              subValueType="accent"
              icon={Activity}
              iconColor="#8b5cf6"
              iconBg="rgba(139, 92, 246, 0.12)"
            />

            <StatCard
              title="Max Drawdown"
              value={`${metrics.maxDrawdownPercent.toFixed(1)}%`}
              subValue={formatCurrency(metrics.maxDrawdown, currentCurrency)}
              subValueType={metrics.maxDrawdownPercent < 5 ? 'positive' : 'negative'}
              icon={ShieldCheck}
              iconColor={metrics.maxDrawdownPercent < 5 ? 'var(--profit-green)' : 'var(--loss-red)'}
              iconBg="rgba(239, 68, 68, 0.1)"
            />

            <StatCard
              title="Avg Holding Period"
              value={metrics.avgHoldingFormatted}
              subValue={`Based on ${metrics.totalTrades} closed trades`}
              subValueType="accent"
              icon={Clock}
              iconColor="#06b6d4"
              iconBg="rgba(6, 182, 212, 0.12)"
            />

            <StatCard
              title="Current Streak"
              value={metrics.currentStreak.count > 0 ? `${metrics.currentStreak.count} ${metrics.currentStreak.type}` : 'None'}
              subValue={`Best Trade: +${formatCurrency(metrics.bestTrade, currentCurrency, true)}`}
              subValueType={metrics.currentStreak.type === 'WIN' ? 'positive' : 'negative'}
              icon={Flame}
              iconColor="#ec4899"
              iconBg="rgba(236, 72, 153, 0.12)"
            />
          </>
        )}
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="card-title text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Cumulative Equity Growth</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Account balance growth timeline across all closed trades
              </p>
            </div>
            <span className="badge bg-slate-800/80 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-xs">
              {equityCurve.length - 1} Closed Points
            </span>
          </div>

          <EquityChart data={equityCurve} currency={currentCurrency} height={300} />
        </div>

        {/* Win/Loss & Edge Summary Card */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="card-title text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <span>Trade Performance Edge</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {/* Avg Holding Period row in edge summary */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-main/60 border border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">Avg Holding Period</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                    {metrics.avgHoldingFormatted}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Expectancy</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    +{formatCurrency(metrics.expectancy, currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Avg Win vs Avg Loss */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-main/60 border border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">Average Win</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    +{formatCurrency(metrics.avgWin, currentCurrency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Average Loss</div>
                  <div className="text-base font-bold font-mono text-red-400 mt-0.5">
                    -{formatCurrency(metrics.avgLoss, currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Win/Loss Ratio */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-main/60 border border-slate-800">
                <span className="text-xs text-slate-400">Win / Loss Payout Ratio</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {metrics.winLossRatio.toFixed(2)}x
                </span>
              </div>

              {/* Consecutive Streaks */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-main/60 border border-slate-800">
                <span className="text-xs text-slate-400">Max Win Streak</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {metrics.consecutiveWins} Trades
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-500">
              Risk Per Trade Target: <strong className="text-slate-300">1.0% - 2.0%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="card-title text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            <span>Recent Executions</span>
          </div>
          <button 
            onClick={onNavigateToJournal} 
            className="btn btn-ghost min-h-touch text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
          >
            <span>View Full Journal ({filteredTrades.length} trades)</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {isLoadingCloud ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                <TableRowSkeleton cols={6} />
                <TableRowSkeleton cols={6} />
                <TableRowSkeleton cols={6} />
              </tbody>
            </table>
          </div>
        ) : recentTrades.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No trades recorded yet. Click "+ Log New Trade" above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">Opened At</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Setup / Strategy</th>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">R:R</th>
                  <th className="py-2.5 px-3 text-right">Net PnL</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
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
                      className="border-b border-slate-900/80 cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-400 text-xs font-mono">
                        {formatDateTimeDDMMYYYY(trade.entryDate)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-300 flex items-center gap-1.5">
                          <span 
                            className="w-1.5 h-1.5 rounded-full shrink-0" 
                            style={{ backgroundColor: account?.colorTag || '#3b82f6' }} 
                          />
                          {account?.name || 'Account'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-slate-100">
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-xs">
                        {trade.setup}
                      </td>
                      <td className="py-3 px-3">
                        <span className="badge badge-session text-[11px]">
                          {trade.session}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 text-xs">
                        {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(1)}` : (trade.rrPlanned ? `1:${trade.rrPlanned.toFixed(1)}` : '-')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono">
                        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-slate-400'}>
                          {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, account?.currency || 'USD')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-breakeven'}`}>
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
    </div>
  );
};
