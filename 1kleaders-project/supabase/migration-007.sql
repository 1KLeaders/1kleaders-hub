-- ============================================================
-- MIGRATION 007 — Simplified onboarding steps
-- Run in Supabase SQL Editor
-- ============================================================

-- Update any profiles still on removed steps to the nearest valid step
UPDATE profiles SET onboarding_status = 'Meeting Completed'
  WHERE onboarding_status IN (
    'Waitlist Submitted', 'Under Admin Review',
    'Meeting to be Scheduled', 'Meeting Scheduled'
  );

UPDATE profiles SET onboarding_status = 'Agreement Signed'
  WHERE onboarding_status IN ('Not Proceeding', 'Agreement Sent');

UPDATE profiles SET onboarding_status = 'KYC Submitted'
  WHERE onboarding_status IN ('KYC Pending', 'KYC Under Review');

UPDATE profiles SET onboarding_status = 'Payment Receipt Submitted'
  WHERE onboarding_status = 'Payment Pending';

UPDATE profiles SET onboarding_status = 'Awaiting ADGM Registration'
  WHERE onboarding_status IN (
    'Welcome Pack Shared', 'Pending Operations Review',
    'File Completed', 'Awaiting 50-Person Round'
  );

-- Also update the handle_new_user trigger default
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
    'Meeting Completed',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
