import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TradingAccount, 
  Trade, 
  TradeFilter, 
  AccountMetrics, 
  EquityPoint,
  WithdrawalRecord
} from '../types';
import { 
  loadAccounts, 
  saveAccounts, 
  loadTrades, 
  saveTrades, 
  loadWithdrawals,
  saveWithdrawals,
  loadActiveAccountId, 
  saveActiveAccountId 
} from '../utils/storage';
import { calculateAccountMetrics, generateEquityCurve } from '../utils/calculations';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_WITHDRAWALS } from '../data/seedData';
import confetti from 'canvas-confetti';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface JournalContextType {
  accounts: TradingAccount[];
  trades: Trade[];
  withdrawals: WithdrawalRecord[];
  activeAccountId: string;
  activeAccount: TradingAccount | null;
  accountsMap: Record<string, TradingAccount>;
  filteredTrades: Trade[];
  metrics: AccountMetrics;
  equityCurve: EquityPoint[];
  filters: TradeFilter;
  setFilters: (filters: Partial<TradeFilter>) => void;
  resetFilters: () => void;
  setActiveAccountId: (id: string) => void;
  addAccount: (account: Omit<TradingAccount, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, updates: Partial<TradingAccount>) => void;
  deleteAccount: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  bulkDeleteTrades: (ids: string[]) => void;
  addWithdrawal: (withdrawal: Omit<WithdrawalRecord, 'id' | 'createdAt'>) => void;
  deleteWithdrawal: (id: string) => void;
  importData: (jsonData: any) => boolean;
  resetAllData: () => void;
  resetToDemoData?: () => void;
  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  triggerCelebration: () => void;
}

const defaultFilter: TradeFilter = {
  accountId: 'all',
  status: 'all',
  direction: 'all',
  assetClass: 'all',
  setup: 'all',
  session: 'all',
  searchQuery: '',
  startDate: '',
  endDate: '',
  sortBy: 'entryDate',
  sortOrder: 'desc'
};

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => loadAccounts());
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => loadWithdrawals());
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() => loadActiveAccountId());
  const [filters, setFiltersState] = useState<TradeFilter>(defaultFilter);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });

  // Save changes to localStorage
  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    saveTrades(trades);
  }, [trades]);

  useEffect(() => {
    saveWithdrawals(withdrawals);
  }, [withdrawals]);

  const setActiveAccountId = useCallback((id: string) => {
    setActiveAccountIdState(id);
    saveActiveAccountId(id);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const triggerCelebration = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const accountsMap = useMemo(() => {
    return accounts.reduce((acc, a) => {
      acc[a.id] = a;
      return acc;
    }, {} as Record<string, TradingAccount>);
  }, [accounts]);

  const activeAccount = useMemo(() => {
    if (activeAccountId === 'all') return null;
    return accounts.find(a => a.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  // Sync active account balance with trades and withdrawals
  const recalculateAccountBalances = useCallback((
    currentAccounts: TradingAccount[], 
    currentTrades: Trade[],
    currentWithdrawals: WithdrawalRecord[]
  ) => {
    return currentAccounts.map(acc => {
      const accTrades = currentTrades.filter(t => t.accountId === acc.id && (t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN'));
      const netPnL = accTrades.reduce((sum, t) => sum + t.pnl, 0);
      const totalWd = currentWithdrawals.filter(w => w.accountId === acc.id).reduce((sum, w) => sum + w.amount, 0);
      return {
        ...acc,
        currentBalance: acc.initialBalance + netPnL - totalWd,
        totalWithdrawn: totalWd
      };
    });
  }, []);

  // Filtered trades by account & criteria
  const filteredTrades = useMemo(() => {
    let list = trades.filter(t => {
      // Account filter: either global activeAccount or filter-level account
      if (activeAccountId !== 'all' && t.accountId !== activeAccountId) {
        return false;
      }
      if (filters.accountId !== 'all' && t.accountId !== filters.accountId) {
        return false;
      }
      if (filters.status !== 'all' && t.status !== filters.status) {
        return false;
      }
      if (filters.direction !== 'all' && t.direction !== filters.direction) {
        return false;
      }
      if (filters.assetClass !== 'all' && t.assetClass !== filters.assetClass) {
        return false;
      }
      if (filters.setup !== 'all' && t.setup !== filters.setup) {
        return false;
      }
      if (filters.session !== 'all' && t.session !== filters.session) {
        return false;
      }
      if (filters.startDate && t.entryDate < filters.startDate) {
        return false;
      }
      if (filters.endDate && t.entryDate > `${filters.endDate}T23:59:59`) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(query);
        const matchNotes = (t.notes || '').toLowerCase().includes(query);
        const matchSetup = t.setup.toLowerCase().includes(query);
        if (!matchSymbol && !matchNotes && !matchSetup) return false;
      }
      return true;
    });

    // Sort
    list.sort((a, b) => {
      let valA: any = a[filters.sortBy];
      let valB: any = b[filters.sortBy];

      if (filters.sortBy === 'entryDate') {
        valA = new Date(a.entryDate).getTime();
        valB = new Date(b.entryDate).getTime();
      }

      if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [trades, activeAccountId, filters]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    // Trades for active account
    const targetTrades = activeAccountId === 'all' 
      ? trades 
      : trades.filter(t => t.accountId === activeAccountId);

    const initialBal = activeAccountId === 'all'
      ? accounts.reduce((sum, a) => sum + a.initialBalance, 0)
      : (activeAccount?.initialBalance || 0);

    return calculateAccountMetrics(targetTrades, initialBal);
  }, [trades, accounts, activeAccountId, activeAccount]);

  // Equity Curve
  const equityCurve = useMemo(() => {
    const targetTrades = activeAccountId === 'all' 
      ? trades 
      : trades.filter(t => t.accountId === activeAccountId);

    const initialBal = activeAccountId === 'all'
      ? accounts.reduce((sum, a) => sum + a.initialBalance, 0)
      : (activeAccount?.initialBalance || 0);

    return generateEquityCurve(targetTrades, initialBal);
  }, [trades, accounts, activeAccountId, activeAccount]);

  const setFilters = (newFilters: Partial<TradeFilter>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilter);
  };

  // Account CRUD
  const addAccount = (accData: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    const newAccount: TradingAccount = {
      ...accData,
      id: `acc-${Date.now()}`,
      currentBalance: accData.initialBalance,
      createdAt: new Date().toISOString()
    };
    setAccounts(prev => [...prev, newAccount]);
    showToast(`Account "${newAccount.name}" created successfully!`, 'success');
  };

  const updateAccount = (id: string, updates: Partial<TradingAccount>) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      return recalculateAccountBalances(updated, trades, withdrawals);
    });
    showToast('Account updated successfully!', 'success');
  };

  const deleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      showToast('Cannot delete the only remaining account.', 'error');
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTrades(prev => prev.filter(t => t.accountId !== id));
    setWithdrawals(prev => prev.filter(w => w.accountId !== id));
    if (activeAccountId === id) {
      setActiveAccountId('all');
    }
    showToast('Account and associated trades deleted.', 'info');
  };

  // Trade CRUD
  const addTrade = (tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTrade: Trade = {
      ...tradeData,
      id: `trade-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };

    setTrades(prev => {
      const updatedTrades = [newTrade, ...prev];
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });

    if (newTrade.pnl > 0) {
      triggerCelebration();
      showToast(`+${newTrade.pnl.toFixed(2)} Win logged on ${newTrade.symbol}! 🚀`, 'success');
    } else {
      showToast(`Trade on ${newTrade.symbol} recorded to journal.`, 'info');
    }
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    const now = new Date().toISOString();
    setTrades(prev => {
      const updatedTrades = prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t);
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });
    showToast('Trade entry updated.', 'success');
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => {
      const updatedTrades = prev.filter(t => t.id !== id);
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });
    showToast('Trade deleted from journal.', 'info');
  };

  const bulkDeleteTrades = (ids: string[]) => {
    setTrades(prev => {
      const updatedTrades = prev.filter(t => !ids.includes(t.id));
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });
    showToast(`${ids.length} trades deleted.`, 'info');
  };

  // Withdrawal Actions
  const addWithdrawal = (wdData: Omit<WithdrawalRecord, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newWd: WithdrawalRecord = {
      ...wdData,
      id: `wd-${Date.now()}`,
      createdAt: now
    };

    setWithdrawals(prev => {
      const updatedWds = [newWd, ...prev];
      setAccounts(accs => recalculateAccountBalances(accs, trades, updatedWds));
      return updatedWds;
    });

    triggerCelebration();
    showToast(`Withdrawal of ${wdData.amount} recorded! Payout celebration! 🎉`, 'success');
  };

  const deleteWithdrawal = (id: string) => {
    setWithdrawals(prev => {
      const updatedWds = prev.filter(w => w.id !== id);
      setAccounts(accs => recalculateAccountBalances(accs, trades, updatedWds));
      return updatedWds;
    });
    showToast('Withdrawal record removed.', 'info');
  };

  const importData = (jsonData: any): boolean => {
    try {
      if (jsonData && Array.isArray(jsonData.accounts) && Array.isArray(jsonData.trades)) {
        const importedAccounts = jsonData.accounts;
        const importedTrades = jsonData.trades;
        const importedWds = Array.isArray(jsonData.withdrawals) ? jsonData.withdrawals : [];
        setAccounts(importedAccounts);
        setTrades(importedTrades);
        setWithdrawals(importedWds);
        showToast(`Successfully restored ${importedAccounts.length} accounts & ${importedTrades.length} trades!`, 'success');
        return true;
      } else {
        showToast('Invalid backup file format.', 'error');
        return false;
      }
    } catch (err) {
      showToast('Failed to import backup.', 'error');
      return false;
    }
  };

  const resetAllData = () => {
    const cleanStarterAccount: TradingAccount = {
      id: 'acc-primary',
      name: 'Main Trading Account',
      type: 'Live Personal',
      broker: 'Broker',
      currency: 'USD',
      initialBalance: 10000,
      currentBalance: 10000,
      status: 'Active',
      colorTag: '#3B82F6',
      totalWithdrawn: 0,
      createdAt: new Date().toISOString()
    };

    setAccounts([cleanStarterAccount]);
    setTrades([]);
    setWithdrawals([]);
    setActiveAccountId('all');
    showToast('Semua data trade & akun berhasil dihapus bersih!', 'info');
  };

  const resetToDemoData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTrades(INITIAL_TRADES);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setActiveAccountId('all');
    showToast('Reset to demo institutional accounts & trades!', 'info');
  };

  return (
    <JournalContext.Provider
      value={{
        accounts,
        trades,
        withdrawals,
        activeAccountId,
        activeAccount,
        accountsMap,
        filteredTrades,
        metrics,
        equityCurve,
        filters,
        setFilters,
        resetFilters,
        setActiveAccountId,
        addAccount,
        updateAccount,
        deleteAccount,
        addTrade,
        updateTrade,
        deleteTrade,
        bulkDeleteTrades,
        addWithdrawal,
        deleteWithdrawal,
        importData,
        resetAllData,
        resetToDemoData,
        toast,
        showToast,
        hideToast,
        triggerCelebration
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};
