-- Migration 035: hide agreements from the platform
-- Run in Supabase SQL editor.
-- Hidden envelopes stay in DocuSign; /api/docusign/sync never writes these columns,
-- so re-syncing does not bring a hidden agreement back.

ALTER TABLE docusign_envelopes
  ADD COLUMN IF NOT EXISTS hidden    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS docusign_envelopes_hidden_idx ON docusign_envelopes (hidden);
