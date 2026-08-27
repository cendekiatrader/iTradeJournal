import React, { useMemo } from 'react';
import { Activity, ShieldAlert, Zap, TrendingUp } from 'lucide-react';

const WINRATES = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const RRRS = [1, 1.5, 2, 2.5, 3, 4, 5];

export const WinrateRRRMatrix: React.FC = () => {
  const matrixData = useMemo(() => {
    return WINRATES.map((wr) => {
      const row = RRRS.map((rrr) => {
        const expectancy = (wr / 100) * rrr - (1 - wr / 100);
        return { wr, rrr, expectancy };
      });
      return row;
    });
  }, []);

  const maxExp = 4; 
  const minExp = -1; 

  const getCellStyles = (exp: number) => {
    if (exp < 0) {
      const intensity = Math.min(1, Math.abs(exp) / Math.abs(minExp));
      return {
        backgroundColor: `rgba(239, 68, 68, ${0.05 + intensity * 0.25})`,
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.15)',
      };
    } else if (exp > 0) {
      const intensity = Math.min(1, exp / maxExp);
      return {
        backgroundColor: `rgba(16, 185, 129, ${0.05 + intensity * 0.35})`,
        color: intensity > 0.5 ? '#34d399' : '#a7f3d0',
        border: intensity > 0.3 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.1)',
        textShadow: intensity > 0.5 ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
      };
    } else {
      return {
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        color: '#94a3b8',
        border: '1px solid rgba(148, 163, 184, 0.1)',
      };
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
            <Activity size={20} color="#3b82f6" />
            Winrate & RRR Sensitivity Threshold Matrix
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
            Peta sensitivitas ekspektasi matematis. Menunjukkan kombinasi minimum Winrate vs Reward-to-Risk Ratio agar strategi tetap profit (hijau) vs hancur (merah).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(16, 185, 129, 0.4)', border: '1px solid rgba(16, 185, 129, 0.6)' }}></span>
            Profit Edge
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgba(239, 68, 68, 0.5)' }}></span>
            Bleeding Edge
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', textAlign: 'center', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={14} /> WINRATE \ RRR
                </div>
              </th>
              {RRRS.map((rrr) => (
                <th key={rrr} style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  1 : {rrr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'left' }}>
                  {WINRATES[i]}%
                </td>
                {row.map((cell, j) => {
                  const styles = getCellStyles(cell.expectancy);
                  return (
                    <td
                      key={j}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        transition: 'all 0.2s ease',
                        cursor: 'crosshair',
                        ...styles,
                      }}
                      title={`Winrate: ${cell.wr}% | RRR: 1:${cell.rrr} | Expectancy: ${cell.expectancy.toFixed(2)}R`}
                    >
                      {cell.expectancy > 0 ? '+' : ''}{cell.expectancy.toFixed(2)}R
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Zap size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.8rem', color: '#93c5fd', lineHeight: 1.6 }}>
          <strong>Edge Sustainability Insight:</strong> Formula ekspektasi dihitung dari <code>E = (Winrate × RRR) - Lossrate</code>. Area merah menunjukkan kombinasi Winrate/RRR yang akan menggerus modal Anda secara perlahan (*Bleeding Edge*), sedangkan area hijau tua menunjukkan *Cash Cow Zone* (Ekspektasi tinggi per trade).
        </div>
      </div>
    </div>
  );
};
