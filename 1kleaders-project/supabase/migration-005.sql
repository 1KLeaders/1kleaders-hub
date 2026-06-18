-- ============================================================
-- MIGRATION 005 — DocuSign integration tables
-- Run in Supabase SQL Editor
-- ============================================================

-- ── DOCUSIGN ENVELOPES ────────────────────────────────────────
-- Tracks every envelope sent via DocuSign
CREATE TABLE IF NOT EXISTS docusign_envelopes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  envelope_id      TEXT NOT NULL UNIQUE,   -- DocuSign envelope UUID
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  waitlist_id      UUID,                   -- optional link to waitlist_submissions

  recipient_name   TEXT NOT NULL,
  recipient_email  TEXT NOT NULL,

  status           TEXT NOT NULL DEFAULT 'sent',
  -- DocuSign statuses: sent | delivered | completed | declined | voided

  sent_at          TIMESTAMPTZ,
  signed_at        TIMESTAMPTZ,
  declined_at      TIMESTAMPTZ,
  voided_at        TIMESTAMPTZ,
  void_reason      TEXT
);

CREATE TRIGGER docusign_envelopes_updated_at
  BEFORE UPDATE ON docusign_envelopes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE docusign_envelopes ENABLE ROW LEVEL SECURITY;

-- Users can see their own envelopes
CREATE POLICY "User can view own envelopes"
  ON docusign_envelopes FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see and manage all envelopes
CREATE POLICY "Admin manage envelopes"
  ON docusign_envelopes FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer'));

GRANT SELECT ON public.docusign_envelopes TO authenticated;
GRANT ALL    ON public.docusign_envelopes TO service_role;


-- ── DOCUSIGN TOKENS ───────────────────────────────────────────
-- Stores OAuth tokens for admin users (used by send route)
-- In production we use JWT grant so this table is less critical,
-- but kept for OAuth flow fallback
CREATE TABLE IF NOT EXISTS docusign_tokens (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE docusign_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only tokens"
  ON docusign_tokens FOR ALL
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'super-admin', 'developer'));

GRANT ALL ON public.docusign_tokens TO service_role;
