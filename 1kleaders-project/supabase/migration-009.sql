-- ============================================================
-- MIGRATION 009 — Cohort management
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS cohorts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  name              TEXT NOT NULL,           -- e.g. "Cohort 1 — Q1 2025"
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  -- values: draft | open | review | closed | archived

  opens_at          TIMESTAMPTZ,             -- when submissions open
  closes_at         TIMESTAMPTZ,             -- when submissions close
  review_starts_at  TIMESTAMPTZ,             -- when quality review begins
  results_at        TIMESTAMPTZ,             -- when results are announced

  max_ideas         INT DEFAULT 50,          -- max submissions
  eligible_roles    TEXT[] DEFAULT ARRAY['user','shareholder'],
  eligible_subroles TEXT[] DEFAULT ARRAY['idea-owner'],
  require_subrole   BOOLEAN DEFAULT TRUE,    -- if true, user must have idea-owner badge

  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Stats (updated by triggers/manually)
  idea_count        INT DEFAULT 0,
  approved_count    INT DEFAULT 0
);

CREATE TRIGGER cohorts_updated_at
  BEFORE UPDATE ON cohorts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add cohort_id to ideas table
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cohorts"
  ON cohorts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage cohorts"
  ON cohorts FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT SELECT ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
