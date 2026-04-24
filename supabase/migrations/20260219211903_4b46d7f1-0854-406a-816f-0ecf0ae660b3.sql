
-- Add trial_ends_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN trial_ends_at timestamp with time zone DEFAULT (now() + interval '3 days');

-- Set trial for existing profiles
UPDATE public.profiles SET trial_ends_at = now() + interval '3 days' WHERE trial_ends_at IS NULL;
