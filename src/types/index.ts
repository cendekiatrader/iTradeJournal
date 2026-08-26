export type Currency = 'USD' | 'IDR' | 'EUR' | 'GBP' | 'JPY' | 'AUD';

export type AccountType = 'Prop Firm' | 'Live Personal' | 'Evaluation/Challenge' | 'Demo' | 'Funded Account';

export type AccountStatus = 'Active' | 'Passed' | 'Breached' | 'Archived';

export interface TradingAccount {
  id: string;
  name: string;
  type: AccountType;
  broker: string;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  targetProfit?: number; // Target for prop challenge (e.g., $10,000 for 100k account)
  maxDrawdownPercent?: number; // E.g., 10%
  dailyDrawdownPercent?: number; // E.g., 5%
  maxDrawdownAmount?: number; // Calculated or manual
  status: AccountStatus;
  colorTag: string; // Hex color or badge color for quick identification
  totalWithdrawn?: number;
  notes?: string;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  accountId: string;
  amount: number;
  date: string; // ISO string YYYY-MM-DD or YYYY-MM-DDTHH:mm
  notes?: string;
  status: 'Completed' | 'Pending';
  createdAt: string;
}

export type AssetClass = 'Forex' | 'Crypto' | 'Commodities' | 'Indices' | 'Stocks';

export type TradeDirection = 'LONG' | 'SHORT';

export type TradeStatus = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN' | 'CANCELLED';

export type TradingSession = 'Asian' | 'London' | 'New York AM' | 'New York PM' | 'Off Session';

export type StrategyType = 
  | 'SMC / Liquidity Sweep'
  | 'HTF FVG & iFVG 50% CE'
  | 'Turtle Soup Reversal'
  | 'BOS Trend Continuation'
  | 'BPR & Order Block'
  | 'Supply & Demand Bounce'
  | 'Breakout & Retest'
  | 'Mean Reversion'
  | 'Scalping'
  | 'Other';

export type EmotionState = 
  | 'Disciplined'
  | 'Confident'
  | 'Neutral'
  | 'FOMO'
  | 'Revenge Trading'
  | 'Hesitant / Fearful'
  | 'Greedy'
  | 'Overtrading';

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  entryDate: string; // ISO string YYYY-MM-DDTHH:mm
  exitDate?: string;  // ISO string YYYY-MM-DDTHH:mm
  timeframe: string; // '1m' | '3m' | '5m' | '15m' | '1h' | '4h' | '1D'
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number; // Lot size or contract quantity or tokens
  pnl: number; // Net PnL in account currency
  pnlPercent: number; // % return on account balance
  pips?: number;
  fees?: number;
  rrPlanned?: number;
  rrAchieved?: number;
  session: TradingSession;
  setup: StrategyType;
  emotion: EmotionState;
  rulesFollowed: boolean;
  confluences: string[];
  notes?: string;
  lessons?: string;
  screenshots?: string[];
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TradeFilter {
  accountId: string; // 'all' or accountId
  status: string; // 'all' | 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'
  direction: string; // 'all' | 'LONG' | 'SHORT'
  assetClass: string; // 'all' | AssetClass
  setup: string; // 'all' | StrategyType
  session: string; // 'all' | TradingSession
  searchQuery: string;
  startDate: string;
  endDate: string;
  sortBy: 'entryDate' | 'pnl' | 'pnlPercent' | 'symbol' | 'rrAchieved';
  sortOrder: 'asc' | 'desc';
}

export interface AccountMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  openTrades: number;
  winRate: number; // Percentage (0-100)
  totalPnL: number;
  totalPnlPercent: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  avgRR: number;
  expectancy: number; // Avg profit per trade
  maxDrawdown: number; // Absolute max DD $
  maxDrawdownPercent: number; // Max DD %
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  avgHoldingMinutes: number;
  avgHoldingFormatted: string;
  dailyPnlMap: Record<string, { pnl: number; tradesCount: number; wins: number; losses: number }>;
}

export interface EquityPoint {
  date: string;
  displayDate: string;
  balance: number;
  equity: number;
  pnl: number;
  tradeSymbol?: string;
  drawdown: number;
}
