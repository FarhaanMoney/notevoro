-- Migration script to add trial fields to existing users
-- Run this in Supabase SQL Editor to update existing users

-- Add trial fields to users table if they don't exist
DO $$
BEGIN
    -- Add trial_start column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' 
        AND column_name='trial_start'
        AND table_schema='public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN trial_start timestamptz;
    END IF;
    
    -- Add is_trial_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' 
        AND column_name='is_trial_active'
        AND table_schema='public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_trial_active boolean NOT NULL DEFAULT false;
    END IF;
    
    -- Add last_reset_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' 
        AND column_name='last_reset_date'
        AND table_schema='public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_reset_date date NOT NULL default current_date;
    END IF;
END $$;

-- Update existing users who don't have trial data
UPDATE public.users 
SET 
    trial_start = CASE 
        WHEN trial_start IS NULL AND created_at >= (now() - interval '7 days') 
        THEN created_at 
        ELSE trial_start 
    END,
    is_trial_active = CASE 
        WHEN is_trial_active = false AND created_at >= (now() - interval '7 days') 
        THEN true 
        ELSE is_trial_active 
    END,
    last_reset_date = CASE 
        WHEN last_reset_date IS NULL 
        THEN current_date 
        ELSE last_reset_date 
    END,
    personalization = CASE 
        WHEN personalization IS NULL 
        THEN '{"goal":"","subjects":"","style":"","learningStyle":""}'::jsonb
        ELSE personalization 
    END
WHERE id IS NOT NULL;

-- Set default credits for existing users based on their plan
UPDATE public.users 
SET credits = CASE 
    WHEN plan = 'free' THEN 5
    WHEN plan = 'pro' THEN 20
    WHEN plan = 'premium' THEN 50
    ELSE 5
END
WHERE credits IS NULL OR credits > 1000; -- Fix users with old monthly credit amounts
