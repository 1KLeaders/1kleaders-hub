-- Migration 037: LinkedIn-style startup pages
--   • cover image + extra "About" fields on startups
--   • rich attachments on founder/team update posts (images, video, documents, links)
--   • public 'startup-media' bucket for logos, covers and post attachments
--   • founders can edit their own startup page and post updates
-- Run in Supabase SQL editor. Requires kl_is_admin() from migration-036.

ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS cover_url     text,
  ADD COLUMN IF NOT EXISTS linkedin_url  text,
  ADD COLUMN IF NOT EXISTS founded_year  int,
  ADD COLUMN IF NOT EXISTS team_size     text,
  ADD COLUMN IF NOT EXISTS industry      text,
  ADD COLUMN IF NOT EXISTS deck_url      text;

ALTER TABLE startup_updates
  ADD COLUMN IF NOT EXISTS attachments jsonb,        -- [{kind:'image'|'video'|'audio'|'file'|'link', url, name?, size?, mime?}]
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- Posts can be text/attachments only (no headline)
DO $$
BEGIN
  ALTER TABLE startup_updates ALTER COLUMN title DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Needed by kl_is_startup_founder() below (added in migration 032, kept here in case it's missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founder_startup_ids text[];

-- Is the current user a founder of this startup?
CREATE OR REPLACE FUNCTION public.kl_is_startup_founder(sid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND founder_startup_ids IS NOT NULL AND sid::text = ANY(founder_startup_ids::text[])
  );
$$;

-- Founders can edit their own startup (admins keep their existing policies)
DROP POLICY IF EXISTS "startups_founder_update" ON startups;
CREATE POLICY "startups_founder_update" ON startups
  FOR UPDATE TO authenticated
  USING (kl_is_startup_founder(id) OR kl_is_admin())
  WITH CHECK (kl_is_startup_founder(id) OR kl_is_admin());

-- Founders/admins post and manage updates; everyone signed in can read them
DROP POLICY IF EXISTS "startup_updates_read" ON startup_updates;
CREATE POLICY "startup_updates_read" ON startup_updates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "startup_updates_write" ON startup_updates;
CREATE POLICY "startup_updates_write" ON startup_updates
  FOR ALL TO authenticated
  USING (kl_is_startup_founder(startup_id) OR kl_is_admin())
  WITH CHECK (kl_is_startup_founder(startup_id) OR kl_is_admin());

-- Storage bucket for logos, covers and post attachments (public read, 50 MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('startup-media', 'startup-media', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Paths are <startup_id>/...  — only that startup's founders (or admins) may write
DROP POLICY IF EXISTS "startup_media_read" ON storage.objects;
CREATE POLICY "startup_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'startup-media');

DROP POLICY IF EXISTS "startup_media_write" ON storage.objects;
CREATE POLICY "startup_media_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'startup-media'
    AND (kl_is_admin() OR kl_is_startup_founder(((storage.foldername(name))[1])::uuid))
  );

DROP POLICY IF EXISTS "startup_media_delete" ON storage.objects;
CREATE POLICY "startup_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'startup-media'
    AND (kl_is_admin() OR kl_is_startup_founder(((storage.foldername(name))[1])::uuid))
  );
