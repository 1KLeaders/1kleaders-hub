-- ============================================================
-- MIGRATION 003 — Bug reports table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS bug_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  page            TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  reporter_email  TEXT NOT NULL,
  reporter_name   TEXT,
  admin_notes     TEXT,
  resolved_at     TIMESTAMPTZ
);

-- Anyone authenticated can insert
GRANT INSERT ON public.bug_reports TO authenticated;
GRANT INSERT ON public.bug_reports TO anon;

-- Only developer/admin can read and update
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit bug reports"
  ON bug_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Developers can read all bug reports"
  ON bug_reports FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('developer', 'admin', 'super-admin'));

CREATE POLICY "Developers can update bug reports"
  ON bug_reports FOR UPDATE
  USING (auth.jwt() ->> 'app_role' IN ('developer', 'admin', 'super-admin'));
