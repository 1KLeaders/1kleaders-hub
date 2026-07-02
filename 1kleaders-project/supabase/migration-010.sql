-- ============================================================
-- MIGRATION 010 — VEP evaluations, newsletters, Teams
-- Run in Supabase SQL Editor
-- ============================================================

-- ── VEP EVALUATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vep_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  idea_id           UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  evaluator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Conflict declaration
  conflict_declared BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_notes    TEXT,
  declaration_at    TIMESTAMPTZ,

  -- Scoring criteria (each /25)
  score_product     INT CHECK (score_product BETWEEN 0 AND 25),
  score_market      INT CHECK (score_market BETWEEN 0 AND 25),
  score_competitive INT CHECK (score_competitive BETWEEN 0 AND 25),
  score_business    INT CHECK (score_business BETWEEN 0 AND 25),

  -- Comments per criterion
  comment_product     TEXT,
  comment_market      TEXT,
  comment_competitive TEXT,
  comment_business    TEXT,

  -- Overall
  overall_comment   TEXT,
  recommendation    TEXT, -- 'Move to MAB' | 'Request More Info' | 'Park' | 'Reject' | 'Merge'

  -- Total (computed)
  total_score       INT GENERATED ALWAYS AS (
    COALESCE(score_product, 0) + COALESCE(score_market, 0) +
    COALESCE(score_competitive, 0) + COALESCE(score_business, 0)
  ) STORED,

  status            TEXT NOT NULL DEFAULT 'in-progress',
  -- in-progress | submitted

  UNIQUE(idea_id, evaluator_id)
);

CREATE TRIGGER vep_evaluations_updated_at
  BEFORE UPDATE ON vep_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE vep_evaluations ENABLE ROW LEVEL SECURITY;

-- VEP members can manage their own evaluations
CREATE POLICY "VEP own evaluations"
  ON vep_evaluations FOR ALL
  USING (auth.uid() = evaluator_id);

-- Admins can read all
CREATE POLICY "Admin read all evaluations"
  ON vep_evaluations FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT ALL ON public.vep_evaluations TO authenticated;


-- ── NEWSLETTERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  sent_at     TIMESTAMPTZ,
  title       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body_html   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | sent
  sent_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_count INT DEFAULT 0,
  sendgrid_id TEXT  -- external SendGrid message ID
);

CREATE TABLE IF NOT EXISTS newsletter_opens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email         TEXT,
  opened_at     TIMESTAMPTZ DEFAULT NOW(),
  clicked       BOOLEAN DEFAULT FALSE,
  clicked_at    TIMESTAMPTZ
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage newsletters"
  ON newsletters FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

CREATE POLICY "Admin read opens"
  ON newsletter_opens FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

-- Public tracking pixel (no auth required)
CREATE POLICY "Public insert opens"
  ON newsletter_opens FOR INSERT WITH CHECK (true);

GRANT ALL ON public.newsletters TO authenticated;
GRANT ALL ON public.newsletter_opens TO authenticated;
GRANT INSERT ON public.newsletter_opens TO anon;


-- ── TEAMS CONNECTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  tenant_id     TEXT,
  display_name  TEXT,
  email         TEXT,
  connected     BOOLEAN DEFAULT TRUE
);

ALTER TABLE teams_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own teams connection"
  ON teams_connections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin read teams"
  ON teams_connections FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT ALL ON public.teams_connections TO authenticated;


-- ── RECOMMENDATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  submitted_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  body          TEXT NOT NULL,
  importance    INT DEFAULT 3,
  ai_review     TEXT,
  status        TEXT NOT NULL DEFAULT 'ai-reviewed',
  admin_notes   TEXT
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own recommendations"
  ON recommendations FOR ALL USING (auth.uid() = submitted_by);

CREATE POLICY "Admin read recommendations"
  ON recommendations FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT ALL ON public.recommendations TO authenticated;
