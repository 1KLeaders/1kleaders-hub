-- ============================================================
-- MIGRATION 014 — Fellowship Applications, Contribution Tracking, Demo Day
-- ============================================================

-- ── FELLOWSHIP APPLICATIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS fellowship_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Step 1
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  mobile        TEXT,
  city          TEXT,
  university    TEXT,
  major         TEXT,
  academic_year TEXT,
  grad_year     TEXT,
  linkedin      TEXT,
  portfolio     TEXT,
  is_student    TEXT,
  -- Step 2
  commit_6mo          TEXT,
  hours_per_week      TEXT,
  weekly_meetings     TEXT,
  willing_real_projects TEXT,
  partner_track_interest TEXT,
  -- Step 3
  ai_skill_level TEXT,
  tools          TEXT[],
  other_tools    TEXT,
  built_before   TEXT,
  built_desc     TEXT,
  can_code       TEXT,
  interests      TEXT[],
  -- Step 4
  why_join        TEXT,
  ai_generalist   TEXT,
  learned_quickly TEXT,
  team_pressure   TEXT,
  startup_problem TEXT,
  describes_you   TEXT,
  -- Step 5
  challenge_option   TEXT,
  challenge_response TEXT,
  -- Step 6
  conf_comfortable    TEXT,
  willing_sign_nda    TEXT,
  understand_verify   TEXT,
  biggest_risk        TEXT,
  handle_uncertain    TEXT,
  -- Step 7
  why_select_you TEXT,
  become_after   TEXT,
  anything_else  TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | reviewing | shortlisted | rejected | accepted
  reviewer_notes TEXT
);

ALTER TABLE fellowship_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert applications"
  ON fellowship_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage applications"
  ON fellowship_applications FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
GRANT INSERT ON public.fellowship_applications TO anon;
GRANT ALL ON public.fellowship_applications TO authenticated;


-- ── CONTRIBUTION TRACKING ────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL, -- 'meeting' | 'hours' | 'idea' | 'review' | 'event' | 'other'
  description  TEXT NOT NULL,
  hours        NUMERIC(5,1),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  verified     BOOLEAN DEFAULT FALSE,
  verified_by  UUID REFERENCES profiles(id),
  points       INT DEFAULT 0
);

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own contributions"
  ON contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage contributions"
  ON contributions FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
GRANT SELECT, INSERT ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;


-- ── DEMO DAY ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_day_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  title        TEXT NOT NULL,
  date         DATE,
  location     TEXT,
  description  TEXT,
  is_live      BOOLEAN DEFAULT FALSE, -- controls visibility
  cohort_id    UUID REFERENCES cohorts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS demo_day_startups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_day_id     UUID NOT NULL REFERENCES demo_day_events(id) ON DELETE CASCADE,
  idea_id         UUID REFERENCES ideas(id) ON DELETE SET NULL,
  pitch_order     INT,
  pitch_time_mins INT DEFAULT 5,
  status          TEXT DEFAULT 'scheduled' -- scheduled | pitched | winner
);

ALTER TABLE demo_day_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_day_startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view live demo days"
  ON demo_day_events FOR SELECT
  USING (is_live = true OR auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
CREATE POLICY "Admins manage demo days"
  ON demo_day_events FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
CREATE POLICY "Authenticated view demo day startups"
  ON demo_day_startups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage demo day startups"
  ON demo_day_startups FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT SELECT ON public.demo_day_events TO authenticated;
GRANT SELECT ON public.demo_day_startups TO authenticated;
GRANT ALL ON public.demo_day_events TO service_role;
GRANT ALL ON public.demo_day_startups TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.demo_day_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.demo_day_startups TO authenticated;
