/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { TradingAccount, Trade, WithdrawalRecord } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
  );
};

export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ==========================================
// Accounts Sync
// ==========================================
export const fetchCloudAccounts = async (): Promise<TradingAccount[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      broker: item.broker,
      currency: item.currency,
      initialBalance: Number(item.initial_balance),
      currentBalance: Number(item.current_balance),
      targetProfit: item.target_profit ? Number(item.target_profit) : undefined,
      maxDrawdownPercent: item.max_drawdown_percent ? Number(item.max_drawdown_percent) : undefined,
      dailyDrawdownPercent: item.daily_drawdown_percent ? Number(item.daily_drawdown_percent) : undefined,
      maxDrawdownAmount: item.max_drawdown_amount ? Number(item.max_drawdown_amount) : undefined,
      status: item.status,
      colorTag: item.color_tag,
      totalWithdrawn: item.total_withdrawn ? Number(item.total_withdrawn) : 0,
      notes: item.notes,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Error fetching accounts from Supabase:', err);
    return null;
  }
};

export const syncAccountToCloud = async (account: TradingAccount): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = {
      id: account.id,
      name: account.name,
      type: account.type,
      broker: account.broker,
      currency: account.currency,
      initial_balance: account.initialBalance,
      current_balance: account.currentBalance,
      target_profit: account.targetProfit || null,
      max_drawdown_percent: account.maxDrawdownPercent || null,
      daily_drawdown_percent: account.dailyDrawdownPercent || null,
      max_drawdown_amount: account.maxDrawdownAmount || null,
      status: account.status,
      color_tag: account.colorTag,
      total_withdrawn: account.totalWithdrawn || 0,
      notes: account.notes || null,
      created_at: account.createdAt
    };

    const { error } = await supabase.from('accounts').upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error syncing account to Supabase:', err);
    return false;
  }
};

export const deleteAccountFromCloud = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting account from Supabase:', err);
    return false;
  }
};

// ==========================================
// Trades Sync
// ==========================================
export const fetchCloudTrades = async (): Promise<Trade[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      symbol: item.symbol,
      assetClass: item.asset_class,
      direction: item.direction,
      entryDate: item.entry_date,
      exitDate: item.exit_date || undefined,
      timeframe: item.timeframe,
      entryPrice: Number(item.entry_price),
      exitPrice: item.exit_price ? Number(item.exit_price) : undefined,
      stopLoss: item.stop_loss ? Number(item.stop_loss) : undefined,
      takeProfit: item.take_profit ? Number(item.take_profit) : undefined,
      quantity: Number(item.quantity),
      pnl: Number(item.pnl),
      pnlPercent: Number(item.pnl_percent),
      pips: item.pips ? Number(item.pips) : undefined,
      rrPlanned: item.rr_planned ? Number(item.rr_planned) : undefined,
      rrAchieved: item.rr_achieved ? Number(item.rr_achieved) : undefined,
      session: item.session,
      setup: item.setup,
      emotion: item.emotion,
      rulesFollowed: item.rules_followed,
      confluences: Array.isArray(item.confluences) ? item.confluences : [],
      notes: item.notes || '',
      lessons: item.lessons || '',
      screenshots: Array.isArray(item.screenshots) ? item.screenshots : [],
      status: item.status,
      createdAt: item.created_at || new Date().toISOString(),
      updatedAt: item.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error fetching trades from Supabase:', err);
    return null;
  }
};

export const syncTradeToCloud = async (trade: Trade): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = {
      id: trade.id,
      account_id: trade.accountId,
      symbol: trade.symbol,
      asset_class: trade.assetClass,
      direction: trade.direction,
      entry_date: trade.entryDate,
      exit_date: trade.exitDate || null,
      timeframe: trade.timeframe,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice || null,
      stop_loss: trade.stopLoss || null,
      take_profit: trade.takeProfit || null,
      quantity: trade.quantity,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      pips: trade.pips || 0,
      rr_planned: trade.rrPlanned || null,
      rr_achieved: trade.rrAchieved || null,
      session: trade.session,
      setup: trade.setup,
      emotion: trade.emotion,
      rules_followed: trade.rulesFollowed,
      confluences: trade.confluences || [],
      notes: trade.notes || null,
      lessons: trade.lessons || null,
      screenshots: trade.screenshots || [],
      status: trade.status
    };

    const { error } = await supabase.from('trades').upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error syncing trade to Supabase:', err);
    return false;
  }
};

export const deleteTradeFromCloud = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting trade from Supabase:', err);
    return false;
  }
};

export const bulkDeleteTradesFromCloud = async (ids: string[]): Promise<boolean> => {
  if (!supabase || ids.length === 0) return false;
  try {
    const { error } = await supabase.from('trades').delete().in('id', ids);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error bulk deleting trades from Supabase:', err);
    return false;
  }
};

// ==========================================
// Withdrawals Sync
// ==========================================
export const fetchCloudWithdrawals = async (): Promise<WithdrawalRecord[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      amount: Number(item.amount),
      date: item.date,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Error fetching withdrawals from Supabase:', err);
    return null;
  }
};

export const syncWithdrawalToCloud = async (withdrawal: WithdrawalRecord): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = {
      id: withdrawal.id,
      account_id: withdrawal.accountId,
      amount: withdrawal.amount,
      date: withdrawal.date,
      notes: withdrawal.notes || null,
      status: withdrawal.status,
      created_at: withdrawal.createdAt
    };

    const { error } = await supabase.from('withdrawals').upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error syncing withdrawal to Supabase:', err);
    return false;
  }
};

export const deleteWithdrawalFromCloud = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('withdrawals').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting withdrawal from Supabase:', err);
    return false;
  }
};

// ==========================================
// Image Upload to Supabase Storage
// ==========================================
export const uploadImageToStorage = async (file: File | Blob, filename: string): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const filePath = `screenshots/${Date.now()}_${filename}`;
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    if (!data) return null;

    const { data: publicData } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (err) {
    console.error('Error uploading image to Supabase Storage:', err);
    return null;
  }
};
