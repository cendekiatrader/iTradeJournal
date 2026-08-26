import React, { useState, useMemo } from 'react';
import { EquityPoint, Currency } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface EquityChartProps {
  data: EquityPoint[];
  currency?: Currency;
  height?: number;
}

export const EquityChart: React.FC<EquityChartProps> = ({
  data,
  currency = 'USD',
  height = 320
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minVal, maxVal, points, pathD, areaD, baseLineY } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minVal: 0, maxVal: 100, points: [], pathD: '', areaD: '', baseLineY: height / 2 };
    }

    const equities = data.map(d => d.equity);
    const initialBal = data[0].balance;
    const rawMin = Math.min(...equities, initialBal);
    const rawMax = Math.max(...equities, initialBal);

    const padding = (rawMax - rawMin) * 0.12 || (rawMax * 0.05) || 100;
    const minVal = Math.floor(rawMin - padding);
    const maxVal = Math.ceil(rawMax + padding);
    const range = maxVal - minVal || 1;

    const width = 800;
    const chartHeight = height - 40; // leave bottom room for X labels

    const points = data.map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * width;
      const y = chartHeight - ((d.equity - minVal) / range) * chartHeight;
      return { x, y, data: d };
    });

    const baseLineY = chartHeight - ((initialBal - minVal) / range) * chartHeight;

    // Generate smooth or direct SVG path
    let pathD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x},${points[i].y}`;
      }
    }

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
      : '';

    return { minVal, maxVal, points, pathD, areaD, baseLineY };
  }, [data, height]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  if (data.length <= 1) {
    return (
      <div style={{
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        backgroundColor: '#070b18',
        borderRadius: '12px',
        border: '1px dashed var(--border-color)'
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
          No Closed Trades Yet
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Log your closed winning or losing trades to plot the interactive equity curve.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Chart Canvas / SVG Container */}
      <svg
        viewBox={`0 0 800 ${height}`}
        style={{ width: '100%', height: `${height}px`, overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
          const y = (height - 40) * ratio;
          const val = maxVal - ratio * (maxVal - minVal);
          return (
            <g key={idx}>
              <line
                x1="0"
                y1={y}
                x2="800"
                y2={y}
                stroke="#172236"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x="4"
                y={y - 4}
                fill="#475569"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {formatCurrency(val, currency, true)}
              </text>
            </g>
          );
        })}

        {/* Baseline (Initial balance) reference line */}
        <line
          x1="0"
          y1={baseLineY}
          x2="800"
          y2={baseLineY}
          stroke="#475569"
          strokeDasharray="6 6"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <text
          x="796"
          y={baseLineY - 6}
          textAnchor="end"
          fill="#94a3b8"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          Baseline: {formatCurrency(data[0].balance, currency)}
        </text>

        {/* Area fill */}
        <path d={areaD} fill="url(#equityGradient)" />

        {/* Equity Line */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Hover Hitboxes & Points */}
        {points.map((pt, i) => (
          <g key={i}>
            {/* Invisible wide column hitbox */}
            <rect
              x={Math.max(0, pt.x - 400 / Math.max(1, points.length))}
              y="0"
              width={800 / Math.max(1, points.length)}
              height={height}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoverIndex(i)}
            />

            {/* Glowing dot on points */}
            {(hoverIndex === i || i === points.length - 1) && (
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 6 : 4}
                fill="#ffffff"
                stroke={pt.data.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'}
                strokeWidth={hoverIndex === i ? 3 : 2}
              />
            )}
          </g>
        ))}

        {/* Active Crosshair vertical line */}
        {activePoint && (
          <line
            x1={activePoint.x}
            y1="0"
            x2={activePoint.x}
            y2={height - 40}
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {activePoint && (
        <div
          style={{
            position: 'absolute',
            left: `${(activePoint.x / 800) * 100}%`,
            top: `${Math.max(10, (activePoint.y / height) * 100 - 35)}%`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#0c1324',
            border: '1px solid #283952',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 50,
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>{activePoint.data.displayDate}</span>
            {activePoint.data.tradeSymbol && (
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{activePoint.data.tradeSymbol}</span>
            )}
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {formatCurrency(activePoint.data.equity, currency)}
          </div>
          {activePoint.data.pnl !== 0 && (
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: activePoint.data.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)',
              marginTop: '2px'
            }}>
              PnL: {activePoint.data.pnl >= 0 ? '+' : ''}{formatCurrency(activePoint.data.pnl, currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
