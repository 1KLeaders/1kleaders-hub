-- Migration 021 — Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Announcement',
  visibility   TEXT NOT NULL DEFAULT 'shareholders_only',
  content      TEXT,
  meta         TEXT,
  cta          TEXT DEFAULT 'Read →',
  media_url    TEXT,
  is_published BOOLEAN DEFAULT FALSE
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Shareholders can view published announcements
CREATE POLICY "Authenticated view published announcements"
  ON announcements FOR SELECT
  USING (is_published = true OR auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

-- Admins manage all
CREATE POLICY "Admins manage announcements"
  ON announcements FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
