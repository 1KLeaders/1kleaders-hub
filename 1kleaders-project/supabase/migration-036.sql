-- Migration 036: Announcements rework
--   • ordered content blocks (multiple content + media sections)
--   • audience targeting (roles, subroles like VEP/MAB, include/exclude specific people)
--   • comments, replies and reactions (never on External Use announcements)
--   • publish notifications (in-app always, email for users who opt in)
-- Run in Supabase SQL editor.

-- ── Helpers ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.kl_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin', 'developer')
  );
$$;

-- ── Announcements: new columns ──────────────────────────────────────────
-- The live table may not match migration-021 exactly, so only ADD columns that are missing
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_published   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility     text NOT NULL DEFAULT 'shareholders_only',
  ADD COLUMN IF NOT EXISTS attachments    jsonb,
  ADD COLUMN IF NOT EXISTS blocks         jsonb,          -- [{id,type:'content',html} | {id,type:'media',url,caption}]
  ADD COLUMN IF NOT EXISTS audience       jsonb NOT NULL DEFAULT '{"roles":["shareholder"],"subroles":[],"include_user_ids":[],"exclude_user_ids":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at   timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- If description already existed as NOT NULL, relax it (new announcements can skip it)
DO $$
BEGIN
  ALTER TABLE announcements ALTER COLUMN description DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Existing published announcements were shareholder-wide; keep them that way
UPDATE announcements SET published_at = COALESCE(published_at, updated_at, created_at)
  WHERE is_published = true AND published_at IS NULL;

-- Can the current user see this announcement?
-- Admins see everything. Others need it published AND to match the audience:
--   (role in roles OR any subrole in subroles OR explicitly included) AND not explicitly excluded.
CREATE OR REPLACE FUNCTION public.kl_can_view_announcement(a announcements)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me profiles%ROWTYPE;
  aud jsonb := COALESCE(a.audience, '{}'::jsonb);
BEGIN
  IF kl_is_admin() THEN RETURN true; END IF;
  IF NOT a.is_published THEN RETURN false; END IF;

  SELECT * INTO me FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;

  IF COALESCE(aud->'exclude_user_ids', '[]'::jsonb) ? me.id::text THEN RETURN false; END IF;
  IF COALESCE(aud->'include_user_ids', '[]'::jsonb) ? me.id::text THEN RETURN true; END IF;
  IF COALESCE(aud->'roles', '[]'::jsonb) ? me.role THEN RETURN true; END IF;
  -- to_jsonb() makes this work whether profiles.subroles is text[] or jsonb
  IF me.subroles IS NOT NULL AND COALESCE(aud->'subroles', '[]'::jsonb)
       ?| ARRAY(SELECT jsonb_array_elements_text(to_jsonb(me.subroles))) THEN RETURN true; END IF;
  RETURN false;
END;
$$;

-- Replace all existing announcement policies with audience-aware ones
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON announcements', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_audience" ON announcements
  FOR SELECT TO authenticated USING (kl_can_view_announcement(announcements));

CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL TO authenticated USING (kl_is_admin()) WITH CHECK (kl_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- ── Comments & replies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES announcement_comments(id) ON DELETE CASCADE,  -- NULL = top-level, else a reply
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000)
);
CREATE INDEX IF NOT EXISTS announcement_comments_ann_idx ON announcement_comments (announcement_id, created_at);

-- Comments/reactions are allowed only when the viewer can see the announcement,
-- comments are enabled, and it is NOT an External Use announcement.
CREATE OR REPLACE FUNCTION public.kl_can_interact_announcement(ann_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM announcements a
    WHERE a.id = ann_id
      AND a.visibility <> 'external_use'
      AND a.allow_comments
      AND kl_can_view_announcement(a)
  );
$$;

ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ann_comments_select" ON announcement_comments;
CREATE POLICY "ann_comments_select" ON announcement_comments
  FOR SELECT TO authenticated USING (kl_can_interact_announcement(announcement_id));
DROP POLICY IF EXISTS "ann_comments_insert" ON announcement_comments;
CREATE POLICY "ann_comments_insert" ON announcement_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND kl_can_interact_announcement(announcement_id));
DROP POLICY IF EXISTS "ann_comments_update_own" ON announcement_comments;
CREATE POLICY "ann_comments_update_own" ON announcement_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "ann_comments_delete" ON announcement_comments;
CREATE POLICY "ann_comments_delete" ON announcement_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR kl_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;

-- ── Reactions (on the announcement itself, or on a comment) ─────────────
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  comment_id      uuid REFERENCES announcement_comments(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji           text NOT NULL CHECK (emoji IN ('👍','❤️','🎉','👏','💡','🔥')),
  UNIQUE NULLS NOT DISTINCT (announcement_id, comment_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS announcement_reactions_ann_idx ON announcement_reactions (announcement_id);

ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ann_reactions_select" ON announcement_reactions;
CREATE POLICY "ann_reactions_select" ON announcement_reactions
  FOR SELECT TO authenticated USING (kl_can_interact_announcement(announcement_id));
DROP POLICY IF EXISTS "ann_reactions_insert" ON announcement_reactions;
CREATE POLICY "ann_reactions_insert" ON announcement_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND kl_can_interact_announcement(announcement_id));
DROP POLICY IF EXISTS "ann_reactions_delete_own" ON announcement_reactions;
CREATE POLICY "ann_reactions_delete_own" ON announcement_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.announcement_reactions TO authenticated;

-- Live comment/reaction updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcement_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcement_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Notification preferences ────────────────────────────────────────────
-- In-app notifications are always sent; email only for people who opt in (Settings page).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_announcements boolean NOT NULL DEFAULT false;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url text;
