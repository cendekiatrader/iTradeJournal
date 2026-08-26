import { Trade, AccountMetrics, EquityPoint, TradingAccount } from '../types';

export const calculateAccountMetrics = (
  trades: Trade[],
  initialBalance: number = 0
): AccountMetrics => {
  const closedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN');
  const openTrades = trades.filter(t => t.status === 'OPEN').length;
  
  const winningTrades = closedTrades.filter(t => t.status === 'WIN');
  const losingTrades = closedTrades.filter(t => t.status === 'LOSS');
  const breakevenTrades = closedTrades.filter(t => t.status === 'BREAKEVEN');

  const totalTradesCount = closedTrades.length;
  const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + Math.max(0, t.pnl), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + Math.min(0, t.pnl), 0));
  const totalPnL = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalPnlPercent = initialBalance > 0 ? (totalPnL / initialBalance) * 100 : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;

  const rrList = closedTrades.filter(t => typeof t.rrAchieved === 'number').map(t => t.rrAchieved!);
  const avgRR = rrList.length > 0 ? rrList.reduce((a, b) => a + b, 0) / rrList.length : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const winProb = totalTradesCount > 0 ? winningTrades.length / totalTradesCount : 0;
  const lossProb = totalTradesCount > 0 ? losingTrades.length / totalTradesCount : 0;
  const expectancy = (winProb * avgWin) - (lossProb * avgLoss);

  // Best / Worst
  const pnls = closedTrades.map(t => t.pnl);
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

  // Consecutive wins / losses & current streak
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;

  // Sort trades chronologically for streaks and drawdowns
  const sortedTrades = [...closedTrades].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );

  sortedTrades.forEach(t => {
    if (t.status === 'WIN') {
      curWins++;
      curLosses = 0;
      if (curWins > maxConsecWins) maxConsecWins = curWins;
    } else if (t.status === 'LOSS') {
      curLosses++;
      curWins = 0;
      if (curLosses > maxConsecLosses) maxConsecLosses = curLosses;
    } else {
      curWins = 0;
      curLosses = 0;
    }
  });

  let currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number } = { type: 'NONE', count: 0 };
  if (sortedTrades.length > 0) {
    const last = sortedTrades[sortedTrades.length - 1];
    if (last.status === 'WIN') {
      currentStreak = { type: 'WIN', count: curWins };
    } else if (last.status === 'LOSS') {
      currentStreak = { type: 'LOSS', count: curLosses };
    }
  }

  // Calculate Max Drawdown
  let peak = initialBalance;
  let runningEquity = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  sortedTrades.forEach(t => {
    runningEquity += t.pnl;
    if (runningEquity > peak) {
      peak = runningEquity;
    }
    const currentDD = peak - runningEquity;
    if (currentDD > maxDrawdown) {
      maxDrawdown = currentDD;
    }
    if (peak > 0) {
      const currentDDPercent = (currentDD / peak) * 100;
      if (currentDDPercent > maxDrawdownPercent) {
        maxDrawdownPercent = currentDDPercent;
      }
    }
  });

  // Daily PnL Map for Calendar
  const dailyPnlMap: Record<string, { pnl: number; tradesCount: number; wins: number; losses: number }> = {};
  trades.forEach(t => {
    const dayKey = t.entryDate.split('T')[0];
    if (!dailyPnlMap[dayKey]) {
      dailyPnlMap[dayKey] = { pnl: 0, tradesCount: 0, wins: 0, losses: 0 };
    }
    dailyPnlMap[dayKey].pnl += t.pnl;
    dailyPnlMap[dayKey].tradesCount += 1;
    if (t.status === 'WIN') dailyPnlMap[dayKey].wins += 1;
    if (t.status === 'LOSS') dailyPnlMap[dayKey].losses += 1;
  });

  // Calculate Average Holding Period (in minutes)
  const holdingMinutesList: number[] = [];
  closedTrades.forEach(t => {
    if (t.entryDate && t.exitDate) {
      const entryTime = new Date(t.entryDate).getTime();
      const exitTime = new Date(t.exitDate).getTime();
      if (!isNaN(entryTime) && !isNaN(exitTime) && exitTime > entryTime) {
        holdingMinutesList.push((exitTime - entryTime) / (1000 * 60));
      }
    }
  });

  const avgHoldingMinutes = holdingMinutesList.length > 0
    ? holdingMinutesList.reduce((a, b) => a + b, 0) / holdingMinutesList.length
    : 0;

  // Import formatDuration logic
  const totalMins = Math.round(avgHoldingMinutes);
  const days = Math.floor(totalMins / (24 * 60));
  const remainingHours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;
  let avgHoldingFormatted = '0m';
  if (days > 0) {
    avgHoldingFormatted = `${days}d ${remainingHours}h ${mins}m`;
  } else if (remainingHours > 0) {
    avgHoldingFormatted = `${remainingHours}h ${mins}m`;
  } else if (mins > 0) {
    avgHoldingFormatted = `${mins}m`;
  }

  return {
    totalTrades: totalTradesCount,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    openTrades,
    winRate,
    totalPnL,
    totalPnlPercent,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    winLossRatio,
    avgRR,
    expectancy,
    maxDrawdown,
    maxDrawdownPercent,
    bestTrade,
    worstTrade,
    consecutiveWins: maxConsecWins,
    consecutiveLosses: maxConsecLosses,
    currentStreak,
    avgHoldingMinutes,
    avgHoldingFormatted,
    dailyPnlMap
  };
};

export const generateEquityCurve = (
  trades: Trade[],
  initialBalance: number
): EquityPoint[] => {
  const sortedTrades = [...trades]
    .filter(t => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN')
    .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  if (sortedTrades.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        date: today,
        displayDate: 'Start',
        balance: initialBalance,
        equity: initialBalance,
        pnl: 0,
        drawdown: 0
      }
    ];
  }

  const firstDate = sortedTrades[0].entryDate.split('T')[0];
  const points: EquityPoint[] = [
    {
      date: firstDate,
      displayDate: 'Initial',
      balance: initialBalance,
      equity: initialBalance,
      pnl: 0,
      drawdown: 0
    }
  ];

  let currentEquity = initialBalance;
  let peak = initialBalance;

  sortedTrades.forEach((trade, index) => {
    currentEquity += trade.pnl;
    if (currentEquity > peak) {
      peak = currentEquity;
    }
    const drawdown = peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0;

    const dateObj = new Date(trade.exitDate || trade.entryDate);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    points.push({
      date: trade.exitDate || trade.entryDate,
      displayDate: `#${index + 1} ${displayDate}`,
      balance: initialBalance,
      equity: currentEquity,
      pnl: trade.pnl,
      tradeSymbol: trade.symbol,
      drawdown
    });
  });

  return points;
};
