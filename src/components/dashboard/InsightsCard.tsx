import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '../../types';
import { generateInsights } from '../../utils/insights';

interface InsightsCardProps {
  trades: Trade[];
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ trades }) => {
  const insights = useMemo(() => generateInsights(trades), [trades]);

  if (insights.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <div className="card-title">
          <Sparkles size={18} color="var(--accent-amber)" />
          <span>Auto Insights</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Statistical findings from your closed trades — no AI guesswork
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
        {insights.map((insight) => (
          <div
            key={insight.id}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {insight.tone === 'positive' ? (
                <TrendingUp size={15} color="var(--profit-green)" />
              ) : (
                <TrendingDown size={15} color="var(--loss-red)" />
              )}
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {insight.title}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px', lineHeight: 1.5 }}>
              {insight.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
