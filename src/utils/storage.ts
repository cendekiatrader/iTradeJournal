import { TradingAccount, Trade, WithdrawalRecord, PlaybookModel } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_WITHDRAWALS } from '../data/seedData';

const ACCOUNTS_STORAGE_KEY = 'itrade_accounts_v1';
const TRADES_STORAGE_KEY = 'itrade_trades_v1';
const WITHDRAWALS_STORAGE_KEY = 'itrade_withdrawals_v1';
const PLAYBOOK_STORAGE_KEY = 'itrade_playbooks_v1';
const ACTIVE_ACCOUNT_KEY = 'itrade_active_account_v1';

export const INITIAL_PLAYBOOKS: PlaybookModel[] = [
  {
    id: 'pb-1',
    title: 'ICT London Silver Bullet & FVG Mitigation',
    category: 'SMC / Liquidity Sweep',
    timeframe: '1m / 5m',
    winrateTarget: 70,
    rrTarget: 2.5,
    description: 'Setup likuiditas sesi London pasca sapuan Asian Range High/Low diikuti Market Structure Shift (MSS) dan entry pada 50% Fair Value Gap.',
    rules: [
      'Asian High / Low tersapu bersih sebelum 03:00 AM EST',
      'Terjadi displacement kuat membentuk Fair Value Gap (FVG)',
      'Entry di 50% Consequent Encroachment (CE) FVG',
      'Stop Loss di bawah/atas swing trigger displacement',
      'Take Profit minimal 1:2 R:R atau opposite liquidity pool'
    ],
    confluences: [
      'Asian Session High Swept',
      'Market Structure Shift (MSS) on 5m',
      'FVG 50% CE Confluence',
      'London Killzone Active'
    ],
    mistakesToAvoid: [
      'Entry sebelum Asian High/Low tersapu',
      'Memaksa entry ketika FVG sudah dimitigasi penuh',
      'Menahan posisi melewati news CPI/NFP'
    ],
    rating: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pb-2',
    title: 'Turtle Soup 15m HTF Liquidity Run Reversal',
    category: 'Turtle Soup Reversal',
    timeframe: '15m / 1H',
    winrateTarget: 65,
    rrTarget: 3.0,
    description: 'Fakeout / false breakout pada Previous Day High/Low (PDH/PDL) yang gagal closing candle di luar range dan langsung ditutup kembali ke dalam range.',
    rules: [
      'Identifikasi PDH / PDL pada Higher Timeframe (4H / Daily)',
      'Candle menyapu level tersebut hanya dengan wick (ekor)',
      'Candle berikutnya close kembali ke dalam range (Rejection)',
      'Entry pada market order begitu candle rejection close',
      'Target TP pada equilibrium / midrange atau opposite liquidity'
    ],
    confluences: [
      'Previous Day High / Low Sweep',
      'Candle Rejection Wick',
      'Premium / Discount Array',
      'Divergence pada RSI'
    ],
    mistakesToAvoid: [
      'Entry saat candle HTF masih closing solid di luar range',
      'Menempatkan SL terlalu tipis pada volatilitas tinggi'
    ],
    rating: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const loadPlaybooks = (): PlaybookModel[] => {
  try {
    const saved = localStorage.getItem(PLAYBOOK_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading playbooks from localStorage:', err);
  }
  return INITIAL_PLAYBOOKS;
};

export const savePlaybooks = (playbooks: PlaybookModel[]): void => {
  try {
    localStorage.setItem(PLAYBOOK_STORAGE_KEY, JSON.stringify(playbooks));
  } catch (err) {
    console.error('Error saving playbooks to localStorage:', err);
  }
};

export const loadAccounts = (): TradingAccount[] => {
  try {
    const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading accounts from localStorage:', err);
  }
  // If first run, return empty array (let user create their account or explore)
  return [];
};

export const saveAccounts = (accounts: TradingAccount[]): void => {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Error saving accounts to localStorage:', err);
  }
};

export const loadTrades = (): Trade[] => {
  try {
    const saved = localStorage.getItem(TRADES_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading trades from localStorage:', err);
  }
  // Default empty on first run
  return [];
};

export const saveTrades = (trades: Trade[]): void => {
  try {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Error saving trades to localStorage:', err);
  }
};

export const loadWithdrawals = (): WithdrawalRecord[] => {
  try {
    const saved = localStorage.getItem(WITHDRAWALS_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading withdrawals from localStorage:', err);
  }
  // Default seed on first run
  saveWithdrawals(INITIAL_WITHDRAWALS);
  return INITIAL_WITHDRAWALS;
};

export const saveWithdrawals = (withdrawals: WithdrawalRecord[]): void => {
  try {
    localStorage.setItem(WITHDRAWALS_STORAGE_KEY, JSON.stringify(withdrawals));
  } catch (err) {
    console.error('Error saving withdrawals to localStorage:', err);
  }
};

export const clearAllStorage = (): void => {
  try {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(TRADES_STORAGE_KEY);
    localStorage.removeItem(WITHDRAWALS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    localStorage.removeItem('itrade_onboarding_dismissed');
  } catch (err) {
    console.error('Error clearing localStorage:', err);
  }
};

export const loadActiveAccountId = (): string => {
  try {
    const saved = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (saved) return saved;
  } catch (err) {
    console.error('Error loading active account:', err);
  }
  return 'all';
};

export const saveActiveAccountId = (id: string): void => {
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  } catch (err) {
    console.error('Error saving active account:', err);
  }
};

export const exportDatabaseToJSON = (
  accounts: TradingAccount[],
  trades: Trade[],
  withdrawals: WithdrawalRecord[] = []
): void => {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    accounts,
    trades,
    withdrawals
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iTradeJournal_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportTradesToCSV = (trades: Trade[], accountsMap: Record<string, TradingAccount>): void => {
  const headers = [
    'Trade ID',
    'Account Name',
    'Symbol',
    'Asset Class',
    'Direction',
    'Status',
    'Entry Date',
    'Exit Date',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Lot/Qty',
    'Net PnL',
    'PnL %',
    'Pips',
    'Planned RR',
    'Achieved RR',
    'Session',
    'Strategy/Setup',
    'Emotion',
    'Rules Followed',
    'Notes'
  ];

  const rows = trades.map(t => [
    `"${t.id}"`,
    `"${accountsMap[t.accountId]?.name || t.accountId}"`,
    `"${t.symbol}"`,
    `"${t.assetClass}"`,
    `"${t.direction}"`,
    `"${t.status}"`,
    `"${t.entryDate}"`,
    `"${t.exitDate || ''}"`,
    t.entryPrice,
    t.exitPrice ?? '',
    t.stopLoss ?? '',
    t.takeProfit ?? '',
    t.quantity,
    t.pnl,
    t.pnlPercent,
    t.pips ?? '',
    t.rrPlanned ?? '',
    t.rrAchieved ?? '',
    `"${t.session}"`,
    `"${t.setup}"`,
    `"${t.emotion}"`,
    t.rulesFollowed ? 'YES' : 'NO',
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iTradeJournal_Trades_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
