import React, { useState, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { runMonteCarloSimulation, MonteCarloParams } from '../../utils/monteCarlo';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  RefreshCw, 
  Sliders, 
  Percent, 
  Layers, 
  Target, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const MonteCarloView: React.FC = () => {
  const { metrics, activeAccount, filteredTrades } = useJournal();
  const currency = activeAccount?.currency || 'USD';

  // Calculate actual baseline averages from user's journal
  const defaultBalance = activeAccount?.currentBalance || activeAccount?.initialBalance || 10000;
  const defaultWinRate = metrics.winRate > 0 ? Number(metrics.winRate.toFixed(1)) : 55;
  
  // Calculate average win % and loss %
  const wins = filteredTrades.filter(t => t.pnlPercent > 0);
  const losses = filteredTrades.filter(t => t.pnlPercent < 0);
  const calculatedAvgWinPct = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 2.5;
  const calculatedAvgLossPct = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length) : 1.0;

  // Custom adjustable parameters
  const [balance, setBalance] = useState<number>(defaultBalance);
  const [winRate, setWinRate] = useState<number>(defaultWinRate);
  const [avgWinPct, setAvgWinPct] = useState<number>(Number(calculatedAvgWinPct.toFixed(2)));
  const [avgLossPct, setAvgLossPct] = useState<number>(Number(calculatedAvgLossPct.toFixed(2)));
  const [tradesCount, setTradesCount] = useState<number>(100);
  const [targetProfitPct, setTargetProfitPct] = useState<number>(10);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(10);
  const [simulationSeed, setSimulationSeed] = useState<number>(0);

  const simulationResult = useMemo(() => {
    const params: MonteCarloParams = {
      startingBalance: balance,
      winRate: winRate,
      avgWinPercent: avgWinPct,
      avgLossPercent: avgLossPct,
      tradesCount: tradesCount,
      simulationsCount: 1000,
      targetProfitPercent: targetProfitPct,
      maxDrawdownLimitPercent: maxDrawdownPct
    };
    return runMonteCarloSimulation(params);
  }, [balance, winRate, avgWinPct, avgLossPct, tradesCount, targetProfitPct, maxDrawdownPct, simulationSeed]);

  const handleRerun = () => {
    setSimulationSeed(prev => prev + 1);
  };

  const handleResetToMyStats = () => {
    setBalance(defaultBalance);
    setWinRate(defaultWinRate);
    setAvgWinPct(Number(calculatedAvgWinPct.toFixed(2)));
    setAvgLossPct(Number(calculatedAvgLossPct.toFixed(2)));
    setSimulationSeed(prev => prev + 1);
  };

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 300;
  const paddingBottom = 30;
  const innerHeight = chartHeight - paddingBottom;

  const { minVal, maxVal, curves } = useMemo(() => {
    const p95s = simulationResult.percentileCurves.map(c => c.p95);
    const p05s = simulationResult.percentileCurves.map(c => c.p05);
    const rawMin = Math.min(...p05s, balance * 0.8);
    const rawMax = Math.max(...p95s, balance * 1.2);
    const pad = (rawMax - rawMin) * 0.1 || 100;
    const minVal = Math.floor(rawMin - pad);
    const maxVal = Math.ceil(rawMax + pad);
    const range = maxVal - minVal || 1;

    const curves = simulationResult.percentileCurves.map((c, i) => {
      const x = (i / tradesCount) * chartWidth;
      const y95 = innerHeight - ((c.p95 - minVal) / range) * innerHeight;
      const y50 = innerHeight - ((c.p50 - minVal) / range) * innerHeight;
      const y05 = innerHeight - ((c.p05 - minVal) / range) * innerHeight;
      return { x, y95, y50, y05 };
    });

    return { minVal, maxVal, curves };
  }, [simulationResult, balance, tradesCount]);

  const pathP95 = curves.length > 0 ? `M ${curves.map(c => `${c.x},${c.y95}`).join(' L ')}` : '';
  const pathP50 = curves.length > 0 ? `M ${curves.map(c => `${c.x},${c.y50}`).join(' L ')}` : '';
  const pathP05 = curves.length > 0 ? `M ${curves.map(c => `${c.x},${c.y05}`).join(' L ')}` : '';

  // Area between P95 and P05
  const areaConfidence = curves.length > 0 
    ? `${pathP95} L ${curves.slice().reverse().map(c => `${c.x},${c.y05}`).join(' L ')} Z`
    : '';

  return (
    <div style={{ marginTop: '28px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#a855f7" />
            <span>Monte Carlo Risk & Equity Forecaster</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              1,000 SIMULATIONS
            </span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Simulasi probabilitas matematika 1.000 skenario acak masa depan untuk memproyeksikan target saldo dan batas risiko drawdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleResetToMyStats} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <Layers size={14} />
            <span>Gunakan Data Asli Saya</span>
          </button>
          <button onClick={handleRerun} className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
            <RefreshCw size={14} />
            <span>Simulasi Ulang</span>
          </button>
        </div>
      </div>

      {/* Grid: Parameter Sliders & Key Probability Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Parameter Sliders Panel */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={17} color="#3b82f6" />
            <span>Pengaturan Parameter Simulasi</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Balance */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Starting Balance:</span>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{formatCurrency(balance, currency)}</span>
              </div>
              <input 
                type="range" 
                min={1000} 
                max={200000} 
                step={1000} 
                value={balance} 
                onChange={(e) => setBalance(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>

            {/* Win Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Win Rate (%):</span>
                <span style={{ fontWeight: 700, color: winRate >= 50 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>{winRate}%</span>
              </div>
              <input 
                type="range" 
                min={20} 
                max={90} 
                step={1} 
                value={winRate} 
                onChange={(e) => setWinRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            {/* Avg Win % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Avg Win per Trade (%):</span>
                <span style={{ fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>+{avgWinPct}%</span>
              </div>
              <input 
                type="range" 
                min={0.5} 
                max={10.0} 
                step={0.1} 
                value={avgWinPct} 
                onChange={(e) => setAvgWinPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            {/* Avg Loss % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Avg Loss per Trade (Risk %):</span>
                <span style={{ fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>-{avgLossPct}%</span>
              </div>
              <input 
                type="range" 
                min={0.2} 
                max={5.0} 
                step={0.1} 
                value={avgLossPct} 
                onChange={(e) => setAvgLossPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />
            </div>

            {/* Number of Future Trades */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Jumlah Trade Mendatang:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{tradesCount} Trades</span>
              </div>
              <input 
                type="range" 
                min={25} 
                max={250} 
                step={25} 
                value={tradesCount} 
                onChange={(e) => setTradesCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            {/* Target Profit % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Target Pertumbuhan (%):</span>
                <span style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>+{targetProfitPct}%</span>
              </div>
              <input 
                type="range" 
                min={5} 
                max={50} 
                step={5} 
                value={targetProfitPct} 
                onChange={(e) => setTargetProfitPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>
          </div>
        </div>

        {/* Results & Interactive SVG Multi-Path Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 4 Probability Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), #090e1c)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Probabilitas Profit</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: simulationResult.probOfProfit >= 70 ? '#10b981' : '#f59e0b', marginTop: '3px' }}>
                {simulationResult.probOfProfit.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Akun Berakhir Hijau
              </div>
            </div>

            <div className="card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), #090e1c)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Median Projected</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: '3px' }}>
                {formatCurrency(simulationResult.medianFinalBalance, currency)}
              </div>
              <div style={{ fontSize: '0.7rem', color: simulationResult.medianReturnPercent >= 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                {simulationResult.medianReturnPercent >= 0 ? '+' : ''}{simulationResult.medianReturnPercent.toFixed(1)}% Return
              </div>
            </div>

            <div className="card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), #090e1c)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Peluang Capai Target</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24', marginTop: '3px' }}>
                {simulationResult.probOfReachingTarget.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Hit +{targetProfitPct}% Target
              </div>
            </div>

            <div className="card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), #090e1c)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Risiko Max DD Breach</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: simulationResult.probOfExceedingDrawdown <= 5 ? '#10b981' : '#ef4444', marginTop: '3px' }}>
                {simulationResult.probOfExceedingDrawdown.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Risiko Tembus Drawdown
              </div>
            </div>
          </div>

          {/* Multi-Path Monte Carlo Simulation Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
                  Simulated Equity Pathways & Confidence Intervals
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Visualisasi 1.000 iterasi dengan pita rentang 90% Confidence (5th - 95th Percentile)
                </span>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Best 95th: {formatCurrency(simulationResult.bestCaseBalance, currency)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                  Median (P50)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  Worst 5th: {formatCurrency(simulationResult.worstCaseBalance, currency)}
                </span>
              </div>
            </div>

            {/* SVG Plot */}
            <div style={{ width: '100%', height: `${chartHeight}px`, overflow: 'hidden' }}>
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="monteCarloAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.18" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1={innerHeight * 0.25} x2={chartWidth} y2={innerHeight * 0.25} stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1={innerHeight * 0.5} x2={chartWidth} y2={innerHeight * 0.5} stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1={innerHeight * 0.75} x2={chartWidth} y2={innerHeight * 0.75} stroke="#1e293b" strokeDasharray="3 3" />

                {/* Starting balance baseline */}
                {(() => {
                  const range = maxVal - minVal || 1;
                  const startY = innerHeight - ((balance - minVal) / range) * innerHeight;
                  return (
                    <line x1="0" y1={startY} x2={chartWidth} y2={startY} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                  );
                })()}

                {/* Shaded 90% Confidence Area */}
                {areaConfidence && (
                  <path d={areaConfidence} fill="url(#monteCarloAreaGrad)" />
                )}

                {/* 10 Sample random paths */}
                {simulationResult.samplePaths.map((sp) => {
                  const range = maxVal - minVal || 1;
                  const d = sp.points.map((p, idx) => {
                    const x = (idx / tradesCount) * chartWidth;
                    const y = innerHeight - ((p.equity - minVal) / range) * innerHeight;
                    return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
                  }).join(' ');
                  return (
                    <path
                      key={sp.id}
                      d={d}
                      fill="none"
                      stroke={sp.finalBalance >= balance ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.2)'}
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Median Curve (P50) */}
                {pathP50 && (
                  <path d={pathP50} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                )}

                {/* Best 95th Percentile Curve */}
                {pathP95 && (
                  <path d={pathP95} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                )}

                {/* Worst 5th Percentile Curve */}
                {pathP05 && (
                  <path d={pathP05} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
                )}

                {/* X Axis Labels */}
                <text x="0" y={chartHeight - 8} fill="#64748b" fontSize="10">Trade #0</text>
                <text x={chartWidth * 0.5} y={chartHeight - 8} fill="#64748b" fontSize="10" textAnchor="middle">Trade #{Math.floor(tradesCount / 2)}</text>
                <text x={chartWidth} y={chartHeight - 8} fill="#64748b" fontSize="10" textAnchor="end">Trade #{tradesCount}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
