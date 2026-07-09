-- ============================================================
-- MIGRATION 012 — Quality Reviews, MAB Evaluations
-- Run in Supabase SQL Editor
-- ============================================================

-- ── QUALITY REVIEWS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  idea_id     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checks      JSONB NOT NULL DEFAULT '{}',
  notes       TEXT,
  decision    TEXT, -- approve | reject | request-info
  status      TEXT NOT NULL DEFAULT 'in-progress',
  UNIQUE(idea_id, reviewer_id)
);

CREATE TRIGGER quality_reviews_updated_at
  BEFORE UPDATE ON quality_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE quality_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quality reviews"
  ON quality_reviews FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
GRANT ALL ON public.quality_reviews TO authenticated;


-- ── MAB EVALUATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mab_evaluations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  idea_id            UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  evaluator_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score_strategic    INT CHECK (score_strategic BETWEEN 0 AND 25),
  score_founder      INT CHECK (score_founder BETWEEN 0 AND 25),
  score_risk         INT CHECK (score_risk BETWEEN 0 AND 25),
  score_investment   INT CHECK (score_investment BETWEEN 0 AND 25),
  comment_strategic  TEXT,
  comment_founder    TEXT,
  comment_risk       TEXT,
  comment_investment TEXT,
  overall_comment    TEXT,
  conditions         TEXT,
  decision           TEXT,
  status             TEXT NOT NULL DEFAULT 'in-progress',
  UNIQUE(idea_id, evaluator_id)
);

CREATE TRIGGER mab_evaluations_updated_at
  BEFORE UPDATE ON mab_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE mab_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MAB members manage evaluations"
  ON mab_evaluations FOR ALL
  USING (auth.uid() = evaluator_id);
CREATE POLICY "Admins read all MAB evals"
  ON mab_evaluations FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));
GRANT ALL ON public.mab_evaluations TO authenticated;
