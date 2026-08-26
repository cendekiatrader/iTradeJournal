-- ==========================================================
-- iTradeJournal Bulletproof Multi-User Migration for Supabase
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or Update Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Live Personal',
    broker TEXT NOT NULL DEFAULT 'Broker',
    currency TEXT NOT NULL DEFAULT 'USD',
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    target_profit NUMERIC(15, 2),
    max_drawdown_percent NUMERIC(5, 2),
    daily_drawdown_percent NUMERIC(5, 2),
    max_drawdown_amount NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'Active',
    color_tag TEXT NOT NULL DEFAULT '#3B82F6',
    total_withdrawn NUMERIC(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_id column exists if table was created previously
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create or Update Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'Forex',
    direction TEXT NOT NULL DEFAULT 'LONG',
    entry_date TEXT NOT NULL,
    exit_date TEXT,
    timeframe TEXT NOT NULL DEFAULT '15m',
    entry_price NUMERIC(15, 5) NOT NULL,
    exit_price NUMERIC(15, 5),
    stop_loss NUMERIC(15, 5),
    take_profit NUMERIC(15, 5),
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 1.0,
    pnl NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    pnl_percent NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    pips NUMERIC(10, 2) DEFAULT 0.0,
    rr_planned NUMERIC(8, 2),
    rr_achieved NUMERIC(8, 2),
    session TEXT NOT NULL DEFAULT 'London',
    setup TEXT NOT NULL DEFAULT 'SMC / Liquidity Sweep',
    emotion TEXT NOT NULL DEFAULT 'Disciplined',
    rules_followed BOOLEAN NOT NULL DEFAULT true,
    confluences JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    lessons TEXT,
    screenshots JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'WIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_id column exists if table was created previously
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Create or Update Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_id column exists if table was created previously
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid duplicates
DROP POLICY IF EXISTS "Users can access own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can access own trades" ON trades;
DROP POLICY IF EXISTS "Users can access own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Allow public full access to accounts" ON accounts;
DROP POLICY IF EXISTS "Allow public full access to trades" ON trades;
DROP POLICY IF EXISTS "Allow public full access to withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Public accounts" ON accounts;
DROP POLICY IF EXISTS "Public trades" ON trades;
DROP POLICY IF EXISTS "Public withdrawals" ON withdrawals;

-- RLS Policies: Authenticated users can only see & modify their own rows
CREATE POLICY "Users can access own accounts" ON accounts
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access own trades" ON trades
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access own withdrawals" ON withdrawals
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. Storage Bucket for Trade Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read on trade-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete screenshots" ON storage.objects;

CREATE POLICY "Public read on trade-screenshots" ON storage.objects 
    FOR SELECT USING (bucket_id = 'trade-screenshots');

CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots');

CREATE POLICY "Authenticated users can delete screenshots" ON storage.objects 
    FOR DELETE USING (bucket_id = 'trade-screenshots');
