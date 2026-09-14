import { Trade } from '../types';

export interface Insight {
  id: string;
  title: string;
  detail: string;
  tone: 'positive' | 'negative';
  score: number;
}

const MIN_SAMPLE = 6;
const MIN_TOTAL_TRADES = 12;

interface GroupStats {
  count: number;
  winRate: number;
  avgR: number;
  pnl: number;
}

function computeStats(list: Trade[]): GroupStats {
  const count = list.length;
  const wins = list.filter((t) => t.pnl > 0).length;
  const winRate = count > 0 ? (wins / count) * 100 : 0;
  const rSum = list.reduce((sum, t) => sum + (t.rrAchieved || 0), 0);
  const avgR = count > 0 ? rSum / count : 0;
  const pnl = list.reduce((sum, t) => sum + t.pnl, 0);
  return { count, winRate, avgR, pnl };
}

const isClosed = (t: Trade) => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN';

/**
 * Deterministic, statistics-only insight finder.
 * Looks at common dimensions (session, setup, symbol, weekday, hour, emotion)
 * and surfaces the subsets whose win-rate / average R deviates most from the
 * trader's own baseline, weighting by sample size.
 */
export function generateInsights(allTrades: Trade[]): Insight[] {
  const closed = allTrades.filter(isClosed);
  if (closed.length < MIN_TOTAL_TRADES) return [];

  const baseline = computeStats(closed);

  const dimensions: Array<{ key: string; label: string; get: (t: Trade) => string | null }> = [
    { key: 'session', label: 'Session', get: (t) => t.session || null },
    { key: 'setup', label: 'Setup', get: (t) => t.setup || null },
    { key: 'symbol', label: 'Symbol', get: (t) => t.symbol || null },
    {
      key: 'weekday',
      label: 'Day',
      get: (t) => {
        const d = new Date(t.entryDate);
        return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { weekday: 'long' });
      }
    },
    {
      key: 'hour',
      label: 'Hour',
      get: (t) => {
        const d = new Date(t.entryDate);
        return isNaN(d.getTime()) ? null : `${String(d.getHours()).padStart(2, '0')}:00`;
      }
    },
    { key: 'emotion', label: 'Emotion', get: (t) => t.emotion || null }
  ];

  const insights: Insight[] = [];

  dimensions.forEach((dim) => {
    const groups: Record<string, Trade[]> = {};
    closed.forEach((t) => {
      const key = dim.get(t);
      if (key) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      }
    });

    Object.entries(groups).forEach(([key, list]) => {
      if (list.length < MIN_SAMPLE) return;
      const stats = computeStats(list);
      const wrDelta = stats.winRate - baseline.winRate;
      const rDelta = stats.avgR - baseline.avgR;

      // Small-sample-aware effect score
      const score =
        (Math.abs(wrDelta) / 100) * Math.sqrt(list.length) +
        (Math.abs(rDelta) * Math.sqrt(list.length)) / 4;

      if (score < 0.55) return;

      insights.push({
        id: `${dim.key}-${key}`,
        title: `${dim.label}: ${key}`,
        detail:
          `${stats.count} trades · win rate ${stats.winRate.toFixed(0)}% ` +
          `(${wrDelta >= 0 ? '+' : ''}${wrDelta.toFixed(0)}pp vs your average) · ` +
          `avg ${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`,
        tone: wrDelta >= 0 ? 'positive' : 'negative',
        score
      });
    });
  });

  return insights.sort((a, b) => b.score - a.score).slice(0, 3);
}
