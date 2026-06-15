-- ============================================================
-- MIGRATION 002 — Auth integration, developer role, subroles
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add meeting_date column to waitlist_submissions (if not already added)
ALTER TABLE waitlist_submissions
  ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_scheduled_at TIMESTAMPTZ;

-- 2. Add subroles column to profiles (array of subrole badges)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subroles TEXT[] DEFAULT '{}';

-- 3. Allow anon to read+update waitlist (needed until full auth is wired)
GRANT SELECT, UPDATE ON public.waitlist_submissions TO anon;

-- 4. Allow authenticated users to read+update their own profile
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 5. Allow authenticated users to read notifications
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- 6. Allow authenticated users to read+insert KYC docs
GRANT SELECT, INSERT, UPDATE ON public.kyc_documents TO authenticated;

-- 7. Allow authenticated users to read their onboarding tracker
GRANT SELECT ON public.onboarding_tracker TO authenticated;

-- 8. Auto-create a profile row whenever a new auth user is created
-- (handles both invite flow and future self-signup flows)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, onboarding_status, is_first_login)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'Platform Access Issued',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING; -- don't overwrite if already created by invite route
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
