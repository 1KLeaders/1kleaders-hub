-- ============================================================
-- MIGRATION 008 — Calendar and Discussion Room tables
-- Run in Supabase SQL Editor
-- ============================================================

-- ── CALENDAR EVENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,  -- YYYY-MM-DD
  time        TEXT NOT NULL DEFAULT 'All Day',
  type        TEXT NOT NULL DEFAULT 'meeting',
  location    TEXT,
  description TEXT
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view events" ON calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage events" ON calendar_events FOR ALL USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
GRANT ALL ON public.calendar_events TO authenticated;


-- ── MEETING VOTES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  title           TEXT NOT NULL,
  proposed_dates  JSONB NOT NULL DEFAULT '[]',
  -- [{date, time, votes, voter_ids:[]}]
  status          TEXT NOT NULL DEFAULT 'voting',
  initiated_by    TEXT,
  confirmed_date  TEXT,
  confirmed_time  TEXT
);

ALTER TABLE meeting_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view votes" ON meeting_votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated create votes" ON meeting_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update votes" ON meeting_votes FOR UPDATE USING (auth.role() = 'authenticated');
GRANT ALL ON public.meeting_votes TO authenticated;


-- ── DISCUSSION ROOMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discussion_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'general',
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['shareholder','admin','super-admin','developer']
);

-- Seed default rooms
INSERT INTO discussion_rooms (id, name, description, type, allowed_roles) VALUES
  ('11111111-0000-0000-0000-000000000001', 'General Shareholders',    'Open discussion for all shareholders',        'general',   ARRAY['shareholder','admin','super-admin','developer']),
  ('11111111-0000-0000-0000-000000000002', 'Investment Committee',    'Investment proposals and portfolio review',   'committee', ARRAY['shareholder','admin','super-admin','developer']),
  ('11111111-0000-0000-0000-000000000003', 'Board Advisory',          'Board-level discussion and governance',       'board',     ARRAY['admin','super-admin','developer']),
  ('11111111-0000-0000-0000-000000000004', 'Annual General Meeting',  'AGM preparation and resolutions',             'general',   ARRAY['shareholder','admin','super-admin','developer']),
  ('11111111-0000-0000-0000-000000000005', 'Venture Evaluation Panel','VEP scoring and evaluation discussion',       'committee', ARRAY['admin','super-admin','developer'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE discussion_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view rooms" ON discussion_rooms FOR SELECT USING (auth.role() = 'authenticated');
GRANT SELECT ON public.discussion_rooms TO authenticated;


-- ── DISCUSSION MESSAGES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS discussion_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  room_id          TEXT NOT NULL,  -- matches discussion_rooms.id
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  sender_name      TEXT,
  sender_role      TEXT,
  sender_subroles  TEXT[] DEFAULT '{}',
  sender_initials  TEXT
);

ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view messages" ON discussion_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users send messages" ON discussion_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT ON public.discussion_messages TO authenticated;

-- Enable Realtime for discussion_messages
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_messages;

CREATE POLICY "Admins manage rooms" ON discussion_rooms FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT INSERT, UPDATE, DELETE ON public.discussion_rooms TO authenticated;
