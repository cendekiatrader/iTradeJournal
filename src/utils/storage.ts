import { TradingAccount, Trade, WithdrawalRecord } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_WITHDRAWALS } from '../data/seedData';

const ACCOUNTS_STORAGE_KEY = 'itrade_accounts_v1';
const TRADES_STORAGE_KEY = 'itrade_trades_v1';
const WITHDRAWALS_STORAGE_KEY = 'itrade_withdrawals_v1';
const ACTIVE_ACCOUNT_KEY = 'itrade_active_account_v1';

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
