-- Fix credit deduction to use actual cost parameter
-- This migration fixes the check_and_deduct_credits function to properly use cost parameter

-- Drop and recreate the function with proper cost handling
DROP FUNCTION IF EXISTS public.check_and_deduct_credits;

CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user uuid,
  p_feature text,
  p_reason text default 'Feature usage',
  p_idempotency text default null,
  p_cost integer default 1
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_credits integer;
  v_remaining_credits integer;
  v_reset_needed boolean := false;
  v_cost_to_deduct integer;  -- Declare variable first
BEGIN
  -- Check if daily reset is needed
  SELECT last_reset_date < current_date INTO v_reset_needed
  FROM public.users
  WHERE id = p_user;
  
  IF v_reset_needed THEN
    -- Perform daily reset first
    PERFORM public.daily_credit_reset(p_user);
  END IF;

  -- Get current credits
  SELECT credits INTO v_current_credits
  FROM public.users
  WHERE id = p_user;
  
  IF v_current_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  -- Use the provided cost parameter
  -- Default to 1 if not specified for backward compatibility
  v_cost_to_deduct := p_cost;
  
  IF v_current_credits < v_cost_to_deduct THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  v_remaining_credits := v_current_credits - v_cost_to_deduct;
  UPDATE public.users SET credits = v_remaining_credits WHERE id = p_user;

  -- Insert new transaction
  INSERT INTO public.credit_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_credits)
  VALUES (p_user, -v_cost_to_deduct, 'deduct', p_feature, p_reason, p_idempotency, v_remaining_credits);
  
  RETURN v_remaining_credits;
END;
$$;
