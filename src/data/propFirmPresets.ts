export interface PropFirmPreset {
  id: string;
  vendor: string;
  profitTargetPct: number;
  maxDrawdownPct: number;
  dailyDrawdownPct: number;
  minTradingDays?: number;
  consistencyRulePct?: number;
  trailingDrawdown?: boolean;
  notes: string;
  updatedAt: string;
}

/**
 * Community-maintained starting points for popular prop firms.
 * Rules change frequently — always verify the current numbers with the vendor.
 * All values are percentages of the starting balance.
 */
export const PROP_FIRM_PRESETS: PropFirmPreset[] = [
  {
    id: 'ftmo',
    vendor: 'FTMO',
    profitTargetPct: 10,
    maxDrawdownPct: 10,
    dailyDrawdownPct: 5,
    minTradingDays: 4,
    notes: 'Standard 2-step Challenge — static max drawdown from the initial balance.',
    updatedAt: '2026-01'
  },
  {
    id: 'fundednext',
    vendor: 'FundedNext',
    profitTargetPct: 8,
    maxDrawdownPct: 10,
    dailyDrawdownPct: 5,
    consistencyRulePct: 40,
    notes: 'Stellar 1-Step profile — 40% best-day consistency rule on the funded stage.',
    updatedAt: '2026-01'
  },
  {
    id: 'e8',
    vendor: 'E8 Markets',
    profitTargetPct: 8,
    maxDrawdownPct: 8,
    dailyDrawdownPct: 5,
    notes: 'E8 One — static drawdown; max loss varies per account size.',
    updatedAt: '2026-01'
  },
  {
    id: 'the5ers',
    vendor: 'The5ers',
    profitTargetPct: 6,
    maxDrawdownPct: 5,
    dailyDrawdownPct: 3,
    notes: 'Bootcamp / High Stakes style — tighter drawdown, faster pacing.',
    updatedAt: '2026-01'
  },
  {
    id: 'fundingpips',
    vendor: 'FundingPips',
    profitTargetPct: 8,
    maxDrawdownPct: 10,
    dailyDrawdownPct: 5,
    notes: '1-step & 2-step options — minimum trading days vary by plan.',
    updatedAt: '2026-01'
  },
  {
    id: 'apex',
    vendor: 'Apex Trader Funding',
    profitTargetPct: 6,
    maxDrawdownPct: 5,
    dailyDrawdownPct: 0,
    trailingDrawdown: true,
    notes: 'Futures evaluation — trailing threshold (intraday), no daily loss limit.',
    updatedAt: '2026-01'
  },
  {
    id: 'topstep',
    vendor: 'Topstep',
    profitTargetPct: 6,
    maxDrawdownPct: 4,
    dailyDrawdownPct: 0,
    trailingDrawdown: true,
    notes: 'Trading Combine — trailing max loss; daily loss limit applies on funded stage.',
    updatedAt: '2026-01'
  },
  {
    id: 'myfundedfx',
    vendor: 'MyFundedFX',
    profitTargetPct: 8,
    maxDrawdownPct: 10,
    dailyDrawdownPct: 5,
    notes: 'Standard challenge profile.',
    updatedAt: '2026-01'
  }
];
