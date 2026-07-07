-- ============================================================
-- MIGRATION 011 — Idea submission extended fields + Cohort dates
-- Run in Supabase SQL Editor
-- ============================================================

-- Extended idea fields
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS tech_basis          TEXT,
  ADD COLUMN IF NOT EXISTS target_customer     TEXT,
  ADD COLUMN IF NOT EXISTS revenue_detail      TEXT,
  ADD COLUMN IF NOT EXISTS mvp_cost            TEXT,
  ADD COLUMN IF NOT EXISTS mvp_timeline        TEXT,
  ADD COLUMN IF NOT EXISTS revenue_timeline    TEXT,
  ADD COLUMN IF NOT EXISTS founder_name        TEXT,
  ADD COLUMN IF NOT EXISTS founder_role        TEXT,
  ADD COLUMN IF NOT EXISTS co_founder_name     TEXT,
  ADD COLUMN IF NOT EXISTS co_founder_role     TEXT,
  ADD COLUMN IF NOT EXISTS co_founder_commitment TEXT,
  ADD COLUMN IF NOT EXISTS team_description    TEXT,
  ADD COLUMN IF NOT EXISTS lean_canvas_path    TEXT,
  ADD COLUMN IF NOT EXISTS pitch_deck_path     TEXT,
  ADD COLUMN IF NOT EXISTS founder_video_url   TEXT;

-- Extended cohort timeline fields
ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS vep_scoring_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mab_eval_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_day_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS announcement_date  TIMESTAMPTZ;

-- Fix default require_subrole to false for new cohorts
ALTER TABLE cohorts ALTER COLUMN require_subrole SET DEFAULT FALSE;

-- Supabase Storage bucket for idea files (run once)
-- If bucket already exists this will fail silently
INSERT INTO storage.buckets (id, name, public)
VALUES ('ideas-files', 'ideas-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ideas-files bucket
CREATE POLICY "Authenticated users upload idea files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ideas-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users read own idea files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ideas-files' AND auth.role() = 'authenticated');
