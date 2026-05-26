-- Optional trial end column (code falls back to trial_start + 7 days if missing)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
