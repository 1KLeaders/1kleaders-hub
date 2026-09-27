-- Migration 038: KYC via Form Builder, TypeForm import, payment step, admin-started (prospect) onboarding
-- Run in Supabase SQL editor. Requires kl_is_admin() from migration-036.

-- ── Forms: purpose + file uploads ───────────────────────────────────────
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'general';   -- 'general' | 'kyc'

-- Private bucket for files uploaded through general forms (KYC forms upload into 'kyc-documents')
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('form-uploads', 'form-uploads', false, 26214400)
ON CONFLICT (id) DO NOTHING;

-- Users upload/read inside their own folder (<user_id>/...); admins read everything
DROP POLICY IF EXISTS "form_uploads_insert_own" ON storage.objects;
CREATE POLICY "form_uploads_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'form-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "form_uploads_read" ON storage.objects;
CREATE POLICY "form_uploads_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'form-uploads' AND ((storage.foldername(name))[1] = auth.uid()::text OR kl_is_admin()));

-- Make sure the KYC bucket has the same own-folder + admin rules (safe to re-run)
DROP POLICY IF EXISTS "kyc_docs_insert_own" ON storage.objects;
CREATE POLICY "kyc_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kyc_docs_update_own" ON storage.objects;
CREATE POLICY "kyc_docs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kyc_docs_read" ON storage.objects;
CREATE POLICY "kyc_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR kl_is_admin()));

-- ── KYC documents: where did it come from? ─────────────────────────────
ALTER TABLE kyc_documents
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS source          text NOT NULL DEFAULT 'platform',  -- 'platform' | 'form' | 'typeform'
  ADD COLUMN IF NOT EXISTS form_response_id uuid,
  ADD COLUMN IF NOT EXISTS external_id      text,                              -- TypeForm response token
  ADD COLUMN IF NOT EXISTS answers          jsonb;                             -- non-file answers (TypeForm/KYC form)

-- Admins can review (approve/reject) any KYC document
DROP POLICY IF EXISTS "kyc_admin_all" ON kyc_documents;
CREATE POLICY "kyc_admin_all" ON kyc_documents
  FOR ALL TO authenticated USING (kl_is_admin()) WITH CHECK (kl_is_admin());

DROP POLICY IF EXISTS "kyc_own_rw" ON kyc_documents;
CREATE POLICY "kyc_own_rw" ON kyc_documents
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Non-admins can upload/replace their own documents but can never approve/reject them
CREATE OR REPLACE FUNCTION public.kl_kyc_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT kl_is_admin() THEN
    NEW.status           := 'submitted';
    NEW.rejection_reason := NULL;
    NEW.reviewed_by      := NULL;
    NEW.reviewed_at      := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kyc_documents_guard ON kyc_documents;
CREATE TRIGGER kyc_documents_guard BEFORE INSERT OR UPDATE ON kyc_documents
  FOR EACH ROW EXECUTE FUNCTION kl_kyc_guard();

-- Columns the guard below reads — make sure they exist so profile updates can't start failing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subroles            text[],
  ADD COLUMN IF NOT EXISTS founder_startup_ids text[],
  ADD COLUMN IF NOT EXISTS partner_level       text,
  ADD COLUMN IF NOT EXISTS onboarding_status   text;

-- SECURITY: users may update their own profile row, so stop them changing their own
-- role / badges / startup links. (Service role and admins are unaffected.)
CREATE OR REPLACE FUNCTION public.kl_profile_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT kl_is_admin() THEN
    NEW.role                := OLD.role;
    NEW.subroles            := OLD.subroles;
    NEW.founder_startup_ids := OLD.founder_startup_ids;
    NEW.partner_level       := OLD.partner_level;
    -- Only admins can mark the payment step done or later
    IF NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status
       AND NEW.onboarding_status IN ('KYC Approved', 'Payment Confirmed', 'Awaiting ADGM Registration', 'Officially Registered Partner') THEN
      NEW.onboarding_status := OLD.onboarding_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_guard ON profiles;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION kl_profile_guard();

-- ── Payment instructions shown on the KYC & Onboarding page ────────────
INSERT INTO platform_settings (key, value)
VALUES ('payment_instructions', 'Please transfer your partner fee to the 1K Leaders bank account shared with you by email, then upload the receipt below.')
ON CONFLICT (key) DO NOTHING;

-- ── Admin-started onboarding (prospect shareholders) ───────────────────
-- Admin enters name/email/phone → DocuSign agreement sent → on signature an account is created
-- automatically and the person completes the full registration profile after first login.
CREATE TABLE IF NOT EXISTS shareholder_prospects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  email          text NOT NULL,
  phone          text,
  notes          text,
  status         text NOT NULL DEFAULT 'agreement_sent',
  -- 'agreement_sent' | 'signed' | 'account_created' | 'registered' | 'declined' | 'voided' | 'cancelled' | 'error'
  envelope_id    text,
  user_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  signed_at      timestamptz,
  last_error     text
);
CREATE UNIQUE INDEX IF NOT EXISTS shareholder_prospects_open_email
  ON shareholder_prospects (lower(email)) WHERE status IN ('agreement_sent', 'signed');

ALTER TABLE shareholder_prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_admin" ON shareholder_prospects;
CREATE POLICY "prospects_admin" ON shareholder_prospects
  FOR ALL TO authenticated USING (kl_is_admin()) WITH CHECK (kl_is_admin());

-- Accounts created from a signed agreement must fill in the registration details after first login
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS needs_registration boolean NOT NULL DEFAULT false;
