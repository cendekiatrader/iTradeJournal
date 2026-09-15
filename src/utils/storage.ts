import { TradingAccount, Trade, WithdrawalRecord, PlaybookModel , TradeAuditEntry, CustomFieldDef } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_WITHDRAWALS } from '../data/seedData';

const ACCOUNTS_STORAGE_KEY = 'itrade_accounts_v1';
const TRADES_STORAGE_KEY = 'itrade_trades_v1';
const TRASHED_STORAGE_KEY = 'itrade_trashed_trades_v1';
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
    description: 'London session liquidity setup after an Asian Range High/Low sweep, followed by a Market Structure Shift (MSS) and entry at the 50% Fair Value Gap.',
    rules: [
      'Asian High / Low fully swept before 03:00 AM EST',
      'Strong displacement creates a Fair Value Gap (FVG)',
      'Entry at the 50% Consequent Encroachment (CE) of the FVG',
      'Stop Loss below/above the displacement trigger swing',
      'Take Profit at minimum 1:2 R:R or the opposite liquidity pool'
    ],
    confluences: [
      'Asian Session High Swept',
      'Market Structure Shift (MSS) on 5m',
      'FVG 50% CE Confluence',
      'London Killzone Active'
    ],
    mistakesToAvoid: [
      'Entering before the Asian High/Low is swept',
      'Forcing an entry after the FVG is fully mitigated',
      'Holding through CPI/NFP news'
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
    description: 'Fakeout / false breakout at the Previous Day High/Low (PDH/PDL) where the candle fails to close outside the range and gets rejected back inside.',
    rules: [
      'Identify PDH / PDL on the higher timeframe (4H / Daily)',
      'Candle sweeps the level with a wick only',
      'Next candle closes back inside the range (rejection)',
      'Enter at market as soon as the rejection candle closes',
      'Take Profit at equilibrium / midrange or opposite liquidity'
    ],
    confluences: [
      'Previous Day High / Low Sweep',
      'Candle Rejection Wick',
      'Premium / Discount Array',
      'RSI Divergence'
    ],
    mistakesToAvoid: [
      'Entering while the HTF candle is still closing solid outside the range',
      'Placing the SL too tight in high volatility'
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

export const saveTrades = (trades: Trade[]): boolean => {
  try {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    return true;
  } catch (err) {
    console.error('Error saving trades to localStorage:', err);
    return false;
  }
};

export const loadTrashedTrades = (): Trade[] => {
  try {
    const saved = localStorage.getItem(TRASHED_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading trashed trades from localStorage:', err);
  }
  return [];
};

export const saveTrashedTrades = (trades: Trade[]): boolean => {
  try {
    localStorage.setItem(TRASHED_STORAGE_KEY, JSON.stringify(trades));
    return true;
  } catch (err) {
    console.error('Error saving trashed trades to localStorage:', err);
    return false;
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

  try {
    localStorage.setItem('itrade_last_backup_at', new Date().toISOString());
  } catch {
    /* ignore */
  }

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

export const exportTradesToCSV = (
  trades: Trade[],
  accountsMap: Record<string, TradingAccount>,
  customFieldDefs: CustomFieldDef[] = []
): void => {
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
    ...customFieldDefs.map(d => d.label),
    'Notes',
    'Lessons'
  ];

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = trades.map(t => [
    esc(t.id),
    esc(accountsMap[t.accountId]?.name || t.accountId),
    esc(t.symbol),
    esc(t.assetClass),
    esc(t.direction),
    esc(t.status),
    esc(t.entryDate),
    esc(t.exitDate || ''),
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
    esc(t.session),
    esc(t.setup),
    esc(t.emotion),
    t.rulesFollowed ? 'YES' : 'NO',
    ...customFieldDefs.map(d => esc((t.customFields || {})[d.id] ?? '')),
    esc(t.notes || ''),
    esc(t.lessons || '')
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `itrade-journal-trades-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ---------- Trade Audit Log (local device cache) ---------- */
const AUDIT_KEY = 'itrade_trade_audit';

export const loadTradeAudit = (): TradeAuditEntry[] => {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as TradeAuditEntry[]) : [];
  } catch {
    return [];
  }
};

export const saveTradeAudit = (entries: TradeAuditEntry[]): void => {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, 800)));
  } catch {
    /* ignore quota errors */
  }
};

/* ---------- Custom field definitions ---------- */
const CUSTOM_FIELDS_KEY = 'itrade_custom_fields';

export const loadCustomFieldDefs = (): CustomFieldDef[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_FIELDS_KEY);
    return raw ? (JSON.parse(raw) as CustomFieldDef[]) : [];
  } catch {
    return [];
  }
};

export const saveCustomFieldDefs = (defs: CustomFieldDef[]): void => {
  try {
    localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(defs));
  } catch {
    /* ignore quota errors */
  }
};

