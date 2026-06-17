-- ============================================================
-- MIGRATION 004 — Ideas, Documents, Notifications tables
-- Run in Supabase SQL Editor
-- ============================================================

-- ── IDEAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Submitter
  submitted_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core fields
  title             TEXT NOT NULL,
  tagline           TEXT,
  problem           TEXT,
  solution          TEXT,
  target_market     TEXT,
  revenue_model     TEXT,
  competitive_edge  TEXT,
  sector            TEXT,
  stage             TEXT DEFAULT 'Idea',

  -- Files (Supabase Storage paths)
  lean_canvas_path  TEXT,
  pitch_deck_path   TEXT,
  founder_video_url TEXT,

  -- Pipeline
  status            TEXT NOT NULL DEFAULT 'Draft',
  -- values: Draft | Submitted | Under Quality Review | Quality Approved |
  --         Assigned to VEP | Under VEP Evaluation | VEP Complete |
  --         Moved to MAB | Under MAB Evaluation | MAB Complete |
  --         Approved | Rejected | Parked

  quality_notes     TEXT,
  vep_score         NUMERIC(4,2),
  mab_decision      TEXT,
  cohort            TEXT
);

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Submitters can see their own ideas
CREATE POLICY "Idea owner can read own ideas"
  ON ideas FOR SELECT USING (auth.uid() = submitted_by);

-- Submitters can create ideas
CREATE POLICY "Idea owner can insert ideas"
  ON ideas FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Submitters can update their own drafts
CREATE POLICY "Idea owner can update own draft"
  ON ideas FOR UPDATE USING (auth.uid() = submitted_by AND status = 'Draft');

-- Admins/VEP/MAB/Developer can read all
CREATE POLICY "Admin read all ideas"
  ON ideas FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer'));

CREATE POLICY "Admin update all ideas"
  ON ideas FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer'));

GRANT ALL ON public.ideas TO authenticated;


-- ── DOCUMENTS ─────────────────────────────────────────────────
-- Extends kyc_documents with a general purpose documents table
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Owner
  owner_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- File info
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'General',
  -- values: KYC | Agreements | Company | Idea | Financial | Shareholder | General

  storage_path    TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size_bytes INT,
  mime_type       TEXT,

  -- Status
  status          TEXT NOT NULL DEFAULT 'pending',
  -- values: pending | verified | rejected | expired

  -- Visibility
  visible_to      TEXT[] DEFAULT ARRAY['admin', 'super-admin'],
  -- e.g. ['shareholder'] = all shareholders can view

  version         INT DEFAULT 1,
  notes           TEXT
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own documents"
  ON documents FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = uploaded_by);

CREATE POLICY "Owner can insert documents"
  ON documents FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admin manage all documents"
  ON documents FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer'));

GRANT ALL ON public.documents TO authenticated;


-- ── NOTIFICATIONS (extend existing) ───────────────────────────
-- audience_roles: which roles/subroles see it
-- audience_user_ids: specific user overrides
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS audience_roles    TEXT[] DEFAULT ARRAY['all'],
  ADD COLUMN IF NOT EXISTS audience_user_ids UUID[],
  ADD COLUMN IF NOT EXISTS sent_by           UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'info';
  -- info | success | warning | action

GRANT ALL ON public.notifications TO authenticated;


-- ── STORAGE BUCKETS ───────────────────────────────────────────
-- Create these in Supabase Dashboard → Storage if not already:
--   ideas-files    (private)  — lean canvas, pitch decks, videos
--   documents      (private)  — general platform documents
-- Both private — access via signed URLs only
