-- Migration 039: storage buckets, announcement scheduling/notification settings, invitee-only
-- calendar meetings, bug reports, KYC template + payment instructions.
-- Run in Supabase SQL editor after 035–038. Safe to re-run.

-- ── Storage buckets ─────────────────────────────────────────────────────
-- Announcement attachments + images inserted in the editor (public read, admins write)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('announcement-attachments', 'announcement-attachments', true, 104857600)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public files such as the Clara KYC Form template (public read, admins write)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('public-assets', 'public-assets', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "admin_public_buckets_read" ON storage.objects;
CREATE POLICY "admin_public_buckets_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('announcement-attachments', 'public-assets'));

DROP POLICY IF EXISTS "admin_public_buckets_insert" ON storage.objects;
CREATE POLICY "admin_public_buckets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('announcement-attachments', 'public-assets') AND kl_is_admin());

DROP POLICY IF EXISTS "admin_public_buckets_update" ON storage.objects;
CREATE POLICY "admin_public_buckets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('announcement-attachments', 'public-assets') AND kl_is_admin());

DROP POLICY IF EXISTS "admin_public_buckets_delete" ON storage.objects;
CREATE POLICY "admin_public_buckets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('announcement-attachments', 'public-assets') AND kl_is_admin());

-- ── Announcements: scheduling + notification settings ──────────────────
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS publish_at    timestamptz,            -- scheduled publish time (while is_published = false)
  ADD COLUMN IF NOT EXISTS notify_in_app boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_mode    text NOT NULL DEFAULT 'opted_in', -- 'none' | 'opted_in' | 'all'
  ADD COLUMN IF NOT EXISTS notify_admins boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS announcements_publish_at_idx ON announcements (publish_at) WHERE is_published = false;

-- ── Calendar: meetings are only visible to their invitees ──────────────
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS invitees         jsonb,     -- Hub profile ids (meetings created in the Hub)
  ADD COLUMN IF NOT EXISTS attendee_emails  text[],    -- lower-cased, from Teams (attendees + organizer)
  ADD COLUMN IF NOT EXISTS attendee_names   text[],    -- lower-cased display names, from Teams
  ADD COLUMN IF NOT EXISTS teams_event_id   text,
  ADD COLUMN IF NOT EXISTS teams_join_url   text;

-- Admins see everything. Everyone else sees non-meeting events (deadlines, newsletters…) and
-- only the meetings they're invited to — matched by Hub invitee id, email or full name.
CREATE OR REPLACE FUNCTION public.kl_can_view_event(e calendar_events)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kl_is_admin()
    OR COALESCE(e.type, 'meeting') <> 'meeting'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND (
        p.id::text IN (SELECT jsonb_array_elements_text(COALESCE(to_jsonb(e.invitees), '[]'::jsonb)))
        OR lower(p.email) = ANY (COALESCE(e.attendee_emails, '{}'))
        OR lower(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) = ANY (COALESCE(e.attendee_names, '{}'))
      )
    );
$$;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'calendar_events' AND cmd IN ('SELECT', 'ALL') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON calendar_events', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events_select_invitees" ON calendar_events
  FOR SELECT TO authenticated USING (kl_can_view_event(calendar_events));
CREATE POLICY "calendar_events_admin_all" ON calendar_events
  FOR ALL TO authenticated USING (kl_is_admin()) WITH CHECK (kl_is_admin());

-- ── Bug reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  title           text NOT NULL,
  description     text NOT NULL,
  severity        text NOT NULL DEFAULT 'medium',
  page            text,
  status          text NOT NULL DEFAULT 'open',
  reporter_email  text,
  reporter_name   text,
  admin_notes     text,
  resolved_at     timestamptz
);
ALTER TABLE bug_reports
  ADD COLUMN IF NOT EXISTS reporter_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS screenshot_path text,
  ADD COLUMN IF NOT EXISTS user_agent      text;
ALTER TABLE bug_reports ALTER COLUMN reporter_email DROP NOT NULL;

-- Reports are written/read through /api/bug-reports (service role); these policies are a fallback
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bug_reports' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON bug_reports', pol.policyname);
  END LOOP;
END $$;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bug_reports_admin" ON bug_reports FOR ALL TO authenticated USING (kl_is_admin()) WITH CHECK (kl_is_admin());

-- ── Startup logos: tile background behind (transparent) logos ──────────
ALTER TABLE startups ADD COLUMN IF NOT EXISTS logo_background text NOT NULL DEFAULT 'white';  -- 'white' | 'dark' | 'none'

-- ── KYC template + payment instructions ────────────────────────────────
INSERT INTO platform_settings (key, value) VALUES ('clara_kyc_template_url', '')
ON CONFLICT (key) DO NOTHING;

-- Bank details live in the signed partnership agreement
UPDATE platform_settings
SET value = 'The bank details for your partner fee are in your signed partnership agreement (Documents → Agreements). Once you''ve made the transfer, upload the receipt below.'
WHERE key = 'payment_instructions'
  AND value LIKE 'Please transfer your partner fee to the 1K Leaders bank account shared with you by email%';
