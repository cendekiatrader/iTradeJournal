import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  TradingAccount, 
  Trade, 
  TradeFilter, 
  AccountMetrics, 
  EquityPoint, 
  WithdrawalRecord,
  PlaybookModel,
  TradeAuditEntry,
  TradeAuditChange,
  CustomFieldDef
} from '../types';
import { 
  loadAccounts, 
  saveAccounts, 
  loadTrades, 
  saveTrades, 
  loadWithdrawals, 
  saveWithdrawals,
  loadPlaybooks,
  savePlaybooks,
  loadActiveAccountId,
  saveActiveAccountId,
  clearAllStorage,
  loadTradeAudit,
  saveTradeAudit,
  loadCustomFieldDefs,
  saveCustomFieldDefs
} from '../utils/storage';
import { 
  isSupabaseConfigured, 
  fetchCloudAccounts, 
  fetchCloudTrades, 
  fetchCloudWithdrawals, 
  fetchCloudPlaybooks,
  syncAccountToCloud, 
  deleteAccountFromCloud, 
  syncTradeToCloud, 
  deleteTradeFromCloud, 
  bulkDeleteTradesFromCloud, 
  syncWithdrawalToCloud, 
  deleteWithdrawalFromCloud,
  syncPlaybookToCloud,
  deletePlaybookFromCloud,
  fetchUserSettings,
  saveUserSettings
} from '../utils/supabase';
import { useAuth } from './AuthContext';
import { calculateAccountMetrics, generateEquityCurve } from '../utils/calculations';
import { setStealthModeState } from '../utils/formatters';
import { isPerformanceMode } from '../utils/uiPrefs';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_WITHDRAWALS } from '../data/seedData';
import { isDemoModeEnabled, setDemoModeFlag } from '../utils/demoMode';
import confetti from 'canvas-confetti';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

interface JournalContextType {
  accounts: TradingAccount[];
  trades: Trade[];
  withdrawals: WithdrawalRecord[];
  playbooks: PlaybookModel[];
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
  addPlaybook: (playbook: Omit<PlaybookModel, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlaybook: (id: string, updates: Partial<PlaybookModel>) => void;
  deletePlaybook: (id: string) => void;
  importData: (jsonData: any) => boolean;
  resetAllData: () => void;
  resetToDemoData?: () => void;
  isCloudSync: boolean;
  isLoadingCloud: boolean;
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: ToastAction) => void;
  hideToast: (id?: string) => void;
  tradeAudit: TradeAuditEntry[];
  getTradeAudit: (tradeId: string) => TradeAuditEntry[];
  revertTradeAuditEntry: (entryId: string) => void;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  importSampleTrades: () => void;
  customFieldDefs: CustomFieldDef[];
  setCustomFieldDefs: (defs: CustomFieldDef[]) => void;
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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => loadAccounts());
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => loadWithdrawals());
  const [playbooks, setPlaybooks] = useState<PlaybookModel[]>(() => loadPlaybooks());
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() => loadActiveAccountId());
  const [filters, setFiltersState] = useState<TradeFilter>(defaultFilter);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tradeAudit, setTradeAudit] = useState<TradeAuditEntry[]>(() => loadTradeAudit());
  const [customFieldDefs, setCustomFieldDefsState] = useState<CustomFieldDef[]>(() => loadCustomFieldDefs());
  const [isCloudSync, setIsCloudSync] = useState<boolean>(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeEnabled());
  const quotaWarnedRef = useRef(false);
  const [isStealthMode, setIsStealthMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('itrade_stealth_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setStealthModeState(isStealthMode);
    try {
      localStorage.setItem('itrade_stealth_mode', String(isStealthMode));
    } catch {}
  }, [isStealthMode]);

  const toggleStealthMode = useCallback(() => {
    setIsStealthMode(prev => {
      const next = !prev;
      setStealthModeState(next);
      showToast(next ? '👁️ Stealth Mode Aktif: Saldo disensor' : '👁️ Stealth Mode Nonaktif: Saldo ditampilkan', 'info');
      return next;
    });
  }, []);

  const enterDemoMode = useCallback(() => {
    setDemoModeFlag(true);
    setIsDemoMode(true);
  }, []);

  const exitDemoMode = useCallback(() => {
    setDemoModeFlag(false);
    setIsDemoMode(false);
  }, []);

  // Sync with Supabase on mount or user change if configured
  useEffect(() => {
    // Signing in always leaves the demo sandbox
    if (user && isDemoModeEnabled()) {
      setDemoModeFlag(false);
      setIsDemoMode(false);
    }
    if (isSupabaseConfigured() && user) {
      setIsLoadingCloud(true);
      Promise.all([fetchCloudAccounts(), fetchCloudTrades(), fetchCloudWithdrawals(), fetchCloudPlaybooks()])
        .then(([cloudAccounts, cloudTrades, cloudWithdrawals, cloudPlaybooks]) => {
          setAccounts(cloudAccounts || []);
          saveAccounts(cloudAccounts || []);

          setTrades(cloudTrades || []);
          saveTrades(cloudTrades || []);

          setWithdrawals(cloudWithdrawals || []);
          saveWithdrawals(cloudWithdrawals || []);

          if (cloudPlaybooks && cloudPlaybooks.length > 0) {
            setPlaybooks(cloudPlaybooks);
            savePlaybooks(cloudPlaybooks);
          }

          setIsCloudSync(true);
        })
        .catch(err => {
          console.error('Failed to sync with Supabase:', err);
        })
        .finally(() => {
          setIsLoadingCloud(false);
        });
    } else if (!isSupabaseConfigured() || isDemoMode) {
      // Local mode: standalone build or the no-login demo sandbox
      const localAccs = loadAccounts();
      const localTrades = loadTrades();
      const localWds = loadWithdrawals();
      const localPbs = loadPlaybooks();
      setAccounts(localAccs.length > 0 ? localAccs : INITIAL_ACCOUNTS);
      setTrades(localTrades.length > 0 ? localTrades : INITIAL_TRADES);
      setWithdrawals(localWds.length > 0 ? localWds : INITIAL_WITHDRAWALS);
      setPlaybooks(localPbs);
    } else if (!user) {
      // Supabase configured but logged out (the public landing page is shown instead)
      setAccounts([]);
      setTrades([]);
      setWithdrawals([]);
      setPlaybooks([]);
    }
    // Refetch only on actual sign-in/out or demo enter/exit — USER_UPDATED
    // metadata events must not trigger a full cloud reload (skeleton flash).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDemoMode]);

  // Save changes to localStorage as fallback & cache
  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    if (!saveTrades(trades) && !quotaWarnedRef.current) {
      quotaWarnedRef.current = true;
      showToast('Storage is full — some data could not be saved locally. Export a backup or remove old data.', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  useEffect(() => {
    saveWithdrawals(withdrawals);
  }, [withdrawals]);

  useEffect(() => {
    saveTradeAudit(tradeAudit);
  }, [tradeAudit]);

  // Load custom field definitions from the settings table when signed in
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const settings = await fetchUserSettings();
      if (!alive) return;
      const cloudDefs = (Array.isArray(settings?.custom_fields) && settings.custom_fields.length > 0
        ? settings.custom_fields
        : Array.isArray(user.user_metadata?.custom_fields) && user.user_metadata.custom_fields.length > 0
          ? user.user_metadata.custom_fields
          : null) as CustomFieldDef[] | null;
      if (cloudDefs) {
        setCustomFieldDefsState(prev => (JSON.stringify(prev) === JSON.stringify(cloudDefs) ? prev : cloudDefs));
        saveCustomFieldDefs(cloudDefs);
        if (!Array.isArray(settings?.custom_fields) || settings.custom_fields.length === 0) {
          saveUserSettings({ custom_fields: cloudDefs });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const setActiveAccountId = useCallback((id: string) => {
    setActiveAccountIdState(id);
    saveActiveAccountId(id);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', action?: ToastAction) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id));
    }, action ? 7000 : 4200);
  }, []);

  const hideToast = useCallback((id?: string) => {
    setToasts(prev => (id ? prev.filter(item => item.id !== id) : []));
  }, []);

  const triggerCelebration = useCallback(() => {
    if (isPerformanceMode()) return;
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

  // Overall or filtered metrics
  const metrics = useMemo(() => {
    const startingBalance = activeAccount 
      ? activeAccount.initialBalance 
      : accounts.reduce((acc, a) => acc + a.initialBalance, 0);
    return calculateAccountMetrics(filteredTrades, startingBalance);
  }, [filteredTrades, activeAccount, accounts]);

  // Equity Curve Data
  const equityCurve = useMemo(() => {
    const startingBalance = activeAccount 
      ? activeAccount.initialBalance 
      : accounts.reduce((acc, a) => acc + a.initialBalance, 0);
    return generateEquityCurve(filteredTrades, startingBalance);
  }, [filteredTrades, activeAccount, accounts]);

  // Filter setters
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
    if (isSupabaseConfigured()) {
      syncAccountToCloud(newAccount);
    }
    showToast(`Account "${newAccount.name}" created successfully!`, 'success');
  };

  const updateAccount = (id: string, updates: Partial<TradingAccount>) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      const recalculated = recalculateAccountBalances(updated, trades, withdrawals);
      const targetAcc = recalculated.find(a => a.id === id);
      if (targetAcc && isSupabaseConfigured()) {
        syncAccountToCloud(targetAcc);
      }
      return recalculated;
    });
    showToast('Account updated successfully!', 'success');
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTrades(prev => prev.filter(t => t.accountId !== id));
    setWithdrawals(prev => prev.filter(w => w.accountId !== id));
    if (isSupabaseConfigured()) {
      deleteAccountFromCloud(id);
    }
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
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, updatedTrades, withdrawals);
        const targetAcc = recalculated.find(a => a.id === newTrade.accountId);
        if (targetAcc && isSupabaseConfigured()) {
          syncAccountToCloud(targetAcc);
        }
        return recalculated;
      });
      return updatedTrades;
    });

    if (isSupabaseConfigured()) {
      syncTradeToCloud(newTrade);
    }

    if (newTrade.pnl > 0) {
      triggerCelebration();
      showToast(`+${newTrade.pnl.toFixed(2)} Win logged on ${newTrade.symbol}! 🚀`, 'success');
    } else {
      showToast(`Trade on ${newTrade.symbol} recorded to journal.`, 'info');
    }
  };

  // First-run helper: adds the sample trades to the selected account so new users can explore
  const importSampleTrades = () => {
    const target = accounts.find(a => a.id === activeAccountId) || accounts[0];
    if (!target) {
      showToast('Create a trading account first.', 'error');
      return;
    }
    const now = Date.now();
    const stamp = new Date().toISOString();
    const samples: Trade[] = INITIAL_TRADES.map((t, i) => ({
      ...t,
      id: `sample-${now}-${i}`,
      accountId: target.id,
      createdAt: stamp,
      updatedAt: stamp,
      pnlPercent: target.initialBalance > 0 ? Number(((t.pnl / target.initialBalance) * 100).toFixed(2)) : t.pnlPercent
    }));
    setTrades(prev => {
      const updatedTrades = [...prev, ...samples];
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });
    if (isSupabaseConfigured()) {
      samples.forEach(s => syncTradeToCloud(s));
    }
    showToast(`${samples.length} sample trades added — explore freely, then replace them with your own.`, 'success');
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    const now = new Date().toISOString();

    // Audit trail: record what changed before applying the update
    const before = trades.find(t => t.id === id);
    if (before) {
      const changes: TradeAuditChange[] = [];
      (Object.keys(updates) as Array<keyof Trade>).forEach((key) => {
        if (key === 'updatedAt') return;
        const fromVal = (before as unknown as Record<string, unknown>)[key as string];
        const toVal = (updates as unknown as Record<string, unknown>)[key as string];
        if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
          changes.push({ field: String(key), from: fromVal, to: toVal });
        }
      });
      if (changes.length > 0) {
        const entry: TradeAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tradeId: id,
          at: now,
          changes
        };
        setTradeAudit(prev => [entry, ...prev].slice(0, 800));
      }
    }

    setTrades(prev => {
      const updatedTrades = prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t);
      const targetTrade = updatedTrades.find(t => t.id === id);
      if (targetTrade && isSupabaseConfigured()) {
        syncTradeToCloud(targetTrade);
      }
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, updatedTrades, withdrawals);
        if (targetTrade) {
          const targetAcc = recalculated.find(a => a.id === targetTrade.accountId);
          if (targetAcc && isSupabaseConfigured()) {
            syncAccountToCloud(targetAcc);
          }
        }
        return recalculated;
      });
      return updatedTrades;
    });
    showToast('Trade entry updated.', 'success');
  };

  const restoreTrades = useCallback((snapshots: Trade[]) => {
    if (snapshots.length === 0) return;
    setTrades(prev => {
      const missing = snapshots.filter(s => !prev.some(t => t.id === s.id));
      if (missing.length === 0) return prev;
      const restored = [...missing, ...prev];
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, restored, withdrawals);
        missing.forEach(s => {
          const acc = recalculated.find(a => a.id === s.accountId);
          if (acc && isSupabaseConfigured()) {
            syncAccountToCloud(acc);
          }
        });
        return recalculated;
      });
      return restored;
    });
    if (isSupabaseConfigured()) {
      snapshots.forEach(s => syncTradeToCloud(s));
    }
    showToast(snapshots.length > 1 ? `${snapshots.length} trades restored.` : 'Trade restored.', 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawals]);

  const deleteTrade = (id: string) => {
    const targetTrade = trades.find(t => t.id === id);
    setTrades(prev => {
      const updatedTrades = prev.filter(t => t.id !== id);
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, updatedTrades, withdrawals);
        if (targetTrade) {
          const targetAcc = recalculated.find(a => a.id === targetTrade.accountId);
          if (targetAcc && isSupabaseConfigured()) {
            syncAccountToCloud(targetAcc);
          }
        }
        return recalculated;
      });
      return updatedTrades;
    });
    if (isSupabaseConfigured()) {
      deleteTradeFromCloud(id);
    }
    showToast('Trade deleted from journal.', 'info', targetTrade ? {
      label: 'Undo',
      onClick: () => restoreTrades([targetTrade])
    } : undefined);
  };

  const bulkDeleteTrades = (ids: string[]) => {
    const snapshots = trades.filter(t => ids.includes(t.id));
    setTrades(prev => {
      const updatedTrades = prev.filter(t => !ids.includes(t.id));
      setAccounts(accs => recalculateAccountBalances(accs, updatedTrades, withdrawals));
      return updatedTrades;
    });
    if (isSupabaseConfigured()) {
      bulkDeleteTradesFromCloud(ids);
    }
    showToast(`${ids.length} trades deleted.`, 'info', snapshots.length > 0 ? {
      label: 'Undo',
      onClick: () => restoreTrades(snapshots)
    } : undefined);
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
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, trades, updatedWds);
        const targetAcc = recalculated.find(a => a.id === newWd.accountId);
        if (targetAcc && isSupabaseConfigured()) {
          syncAccountToCloud(targetAcc);
        }
        return recalculated;
      });
      return updatedWds;
    });

    if (isSupabaseConfigured()) {
      syncWithdrawalToCloud(newWd);
    }

    triggerCelebration();
    showToast(`Withdrawal of ${wdData.amount} recorded! Payout celebration! 🎉`, 'success');
  };

  const deleteWithdrawal = (id: string) => {
    const targetWd = withdrawals.find(w => w.id === id);
    setWithdrawals(prev => {
      const updatedWds = prev.filter(w => w.id !== id);
      setAccounts(accs => {
        const recalculated = recalculateAccountBalances(accs, trades, updatedWds);
        if (targetWd) {
          const targetAcc = recalculated.find(a => a.id === targetWd.accountId);
          if (targetAcc && isSupabaseConfigured()) {
            syncAccountToCloud(targetAcc);
          }
        }
        return recalculated;
      });
      return updatedWds;
    });

    if (isSupabaseConfigured()) {
      deleteWithdrawalFromCloud(id);
    }

    showToast('Withdrawal record removed.', 'info');
  };

  // Playbook CRUD Actions
  const addPlaybook = (pbData: Omit<PlaybookModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPb: PlaybookModel = {
      ...pbData,
      id: `pb-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    setPlaybooks(prev => {
      const updated = [newPb, ...prev];
      savePlaybooks(updated);
      return updated;
    });
    if (isSupabaseConfigured()) {
      syncPlaybookToCloud(newPb);
    }
    showToast(`Playbook "${newPb.title}" saved!`, 'success');
  };

  const updatePlaybook = (id: string, updates: Partial<PlaybookModel>) => {
    setPlaybooks(prev => {
      const updated = prev.map(pb => pb.id === id ? { ...pb, ...updates, updatedAt: new Date().toISOString() } : pb);
      savePlaybooks(updated);
      const target = updated.find(pb => pb.id === id);
      if (target && isSupabaseConfigured()) {
        syncPlaybookToCloud(target);
      }
      return updated;
    });
    showToast('Playbook updated.', 'success');
  };

  const deletePlaybook = (id: string) => {
    setPlaybooks(prev => {
      const updated = prev.filter(pb => pb.id !== id);
      savePlaybooks(updated);
      return updated;
    });
    if (isSupabaseConfigured()) {
      deletePlaybookFromCloud(id);
    }
    showToast('Playbook deleted.', 'info');
  };

  const setCustomFieldDefs = useCallback((defs: CustomFieldDef[]) => {
    setCustomFieldDefsState(defs);
    saveCustomFieldDefs(defs);
    if (user && isSupabaseConfigured()) {
      saveUserSettings({ custom_fields: defs });
    }
  }, [user]);

  const getTradeAudit = useCallback((tradeId: string) => {
    return tradeAudit.filter(e => e.tradeId === tradeId);
  }, [tradeAudit]);

  const revertTradeAuditEntry = (entryId: string) => {
    const entry = tradeAudit.find(e => e.id === entryId);
    if (!entry) return;
    if (!trades.some(t => t.id === entry.tradeId)) {
      showToast('Cannot revert — the trade no longer exists.', 'error');
      return;
    }
    const updates: Record<string, unknown> = {};
    entry.changes.forEach(c => {
      updates[c.field] = c.from;
    });
    updateTrade(entry.tradeId, updates as Partial<Trade>);
    showToast('Edit reverted — previous values restored.', 'success');
  };

  // Backup & Import
  const importData = (jsonData: any) => {
    try {
      if (jsonData && Array.isArray(jsonData.accounts) && Array.isArray(jsonData.trades)) {
        const importedAccounts: TradingAccount[] = jsonData.accounts;
        const importedTrades: Trade[] = jsonData.trades;
        const importedWithdrawals: WithdrawalRecord[] = Array.isArray(jsonData.withdrawals) ? jsonData.withdrawals : [];

        setAccounts(recalculateAccountBalances(importedAccounts, importedTrades, importedWithdrawals));
        setTrades(importedTrades);
        setWithdrawals(importedWithdrawals);
        setActiveAccountId('all');

        if (isSupabaseConfigured()) {
          importedAccounts.forEach(a => syncAccountToCloud(a));
          importedTrades.forEach(t => syncTradeToCloud(t));
          importedWithdrawals.forEach(w => syncWithdrawalToCloud(w));
        }

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

    if (isSupabaseConfigured()) {
      syncAccountToCloud(cleanStarterAccount);
    }

    showToast('All data has been reset.', 'info');
  };

  const resetToDemoData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTrades(INITIAL_TRADES);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setActiveAccountId('all');
    showToast('Reset to demo accounts & trades!', 'info');
  };

  return (
    <JournalContext.Provider
      value={{
        accounts,
        trades,
        withdrawals,
        playbooks,
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
        addPlaybook,
        updatePlaybook,
        deletePlaybook,
        importData,
        resetAllData,
        resetToDemoData,
        isCloudSync,
        isLoadingCloud,
        isStealthMode,
        toggleStealthMode,
        toasts,
        showToast,
        hideToast,
        tradeAudit,
        getTradeAudit,
        revertTradeAuditEntry,
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        importSampleTrades,
        customFieldDefs,
        setCustomFieldDefs,
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
