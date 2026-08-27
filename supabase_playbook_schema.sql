-- =========================================================
-- iTradeJournal - Playbook Table Migration
-- =========================================================

CREATE TABLE IF NOT EXISTS public.playbooks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  timeframe TEXT,
  winrate_target NUMERIC,
  rr_target NUMERIC,
  description TEXT,
  rules JSONB DEFAULT '[]'::jsonb,
  confluences JSONB DEFAULT '[]'::jsonb,
  mistakes_to_avoid JSONB DEFAULT '[]'::jsonb,
  chart_before_url TEXT,
  chart_after_url TEXT,
  rating INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
CREATE POLICY "Users can manage their own playbooks"
ON public.playbooks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Public read policy if needed for public bio
CREATE POLICY "Allow public read for playbooks"
ON public.playbooks
FOR SELECT
TO anon
USING (true);
