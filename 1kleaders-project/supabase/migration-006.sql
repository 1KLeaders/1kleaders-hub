-- ============================================================
-- MIGRATION 006 — KYC Storage policies + tracker grants
-- Run in Supabase SQL Editor
-- ============================================================

-- Storage policies for kyc-documents bucket
-- (Create the 'kyc-documents' bucket in Supabase Dashboard → Storage first)

CREATE POLICY "Users upload own KYC files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own KYC files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all KYC files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer')
  );

CREATE POLICY "Admins delete KYC files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer')
  );

-- Grants for onboarding tracker
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
