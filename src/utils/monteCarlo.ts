export interface MonteCarloParams {
  startingBalance: number;
  winRate: number; // 0 - 100
  avgWinAmount?: number;
  avgLossAmount?: number;
  avgWinPercent: number; // e.g. 2.0 (%)
  avgLossPercent: number; // e.g. 1.0 (%)
  tradesCount: number; // e.g. 50, 100
  simulationsCount?: number; // e.g. 500
  targetProfitPercent?: number; // e.g. 10%
  maxDrawdownLimitPercent?: number; // e.g. 10%
}

export interface MonteCarloResult {
  params: MonteCarloParams;
  medianFinalBalance: number;
  medianReturnPercent: number;
  bestCaseBalance: number; // 95th percentile
  worstCaseBalance: number; // 5th percentile
  probOfProfit: number; // 0 - 100%
  probOfReachingTarget: number; // 0 - 100%
  probOfExceedingDrawdown: number; // 0 - 100%
  maxConsecutiveLossStreak: number;
  samplePaths: {
    id: number;
    points: { tradeIndex: number; equity: number }[];
    finalBalance: number;
  }[];
  percentileCurves: {
    tradeIndex: number;
    p95: number;
    p75: number;
    p50: number;
    p25: number;
    p05: number;
  }[];
}

export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  const {
    startingBalance,
    winRate,
    avgWinPercent,
    avgLossPercent,
    tradesCount = 100,
    simulationsCount = 500,
    targetProfitPercent = 10,
    maxDrawdownLimitPercent = 10
  } = params;

  const winProb = Math.max(0.05, Math.min(0.95, winRate / 100));
  const winMultiplier = 1 + (Math.max(0.1, avgWinPercent) / 100);
  const lossMultiplier = 1 - (Math.max(0.1, avgLossPercent) / 100);
  const targetBalance = startingBalance * (1 + targetProfitPercent / 100);
  const maxDdFloor = startingBalance * (1 - maxDrawdownLimitPercent / 100);

  const allSimulations: {
    finalBalance: number;
    maxDrawdown: number;
    maxLossStreak: number;
    hitTarget: boolean;
    hitMaxDd: boolean;
    path: number[];
  }[] = [];

  for (let s = 0; s < simulationsCount; s++) {
    let balance = startingBalance;
    let peak = startingBalance;
    let maxDd = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    let hitTarget = false;
    let hitMaxDd = false;
    const path: number[] = [startingBalance];

    for (let t = 1; t <= tradesCount; t++) {
      const isWin = Math.random() < winProb;
      if (isWin) {
        balance = balance * winMultiplier;
        currentLossStreak = 0;
      } else {
        balance = balance * lossMultiplier;
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      }

      if (balance > peak) {
        peak = balance;
      }
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDd) {
        maxDd = dd;
      }

      if (balance >= targetBalance) {
        hitTarget = true;
      }
      if (balance <= maxDdFloor) {
        hitMaxDd = true;
      }

      path.push(balance);
    }

    allSimulations.push({
      finalBalance: balance,
      maxDrawdown: maxDd,
      maxLossStreak,
      hitTarget,
      hitMaxDd,
      path
    });
  }

  // Calculate Percentiles per trade index (0 to tradesCount)
  const percentileCurves: MonteCarloResult['percentileCurves'] = [];
  for (let t = 0; t <= tradesCount; t++) {
    const balancesAtStep = allSimulations.map(sim => sim.path[t]).sort((a, b) => a - b);
    const p05 = balancesAtStep[Math.floor(simulationsCount * 0.05)];
    const p25 = balancesAtStep[Math.floor(simulationsCount * 0.25)];
    const p50 = balancesAtStep[Math.floor(simulationsCount * 0.50)];
    const p75 = balancesAtStep[Math.floor(simulationsCount * 0.75)];
    const p95 = balancesAtStep[Math.floor(simulationsCount * 0.95)];

    percentileCurves.push({
      tradeIndex: t,
      p05,
      p25,
      p50,
      p75,
      p95
    });
  }

  const finalBalances = allSimulations.map(s => s.finalBalance).sort((a, b) => a - b);
  const medianFinalBalance = finalBalances[Math.floor(simulationsCount * 0.50)];
  const bestCaseBalance = finalBalances[Math.floor(simulationsCount * 0.95)];
  const worstCaseBalance = finalBalances[Math.floor(simulationsCount * 0.05)];
  const medianReturnPercent = ((medianFinalBalance - startingBalance) / startingBalance) * 100;

  const profitableRuns = allSimulations.filter(s => s.finalBalance > startingBalance).length;
  const probOfProfit = (profitableRuns / simulationsCount) * 100;

  const targetRuns = allSimulations.filter(s => s.hitTarget).length;
  const probOfReachingTarget = (targetRuns / simulationsCount) * 100;

  const breachedRuns = allSimulations.filter(s => s.hitMaxDd).length;
  const probOfExceedingDrawdown = (breachedRuns / simulationsCount) * 100;

  const maxConsecutiveLossStreak = Math.max(...allSimulations.map(s => s.maxLossStreak));

  // Select 10 sample paths for visually stunning rendering
  const step = Math.floor(simulationsCount / 10);
  const samplePaths: MonteCarloResult['samplePaths'] = [];
  for (let i = 0; i < 10; i++) {
    const sim = allSimulations[i * step];
    if (sim) {
      samplePaths.push({
        id: i,
        points: sim.path.map((val, idx) => ({ tradeIndex: idx, equity: val })),
        finalBalance: sim.finalBalance
      });
    }
  }

  return {
    params,
    medianFinalBalance,
    medianReturnPercent,
    bestCaseBalance,
    worstCaseBalance,
    probOfProfit,
    probOfReachingTarget,
    probOfExceedingDrawdown,
    maxConsecutiveLossStreak,
    samplePaths,
    percentileCurves
  };
}
