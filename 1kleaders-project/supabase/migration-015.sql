-- Migration 015 — Teams calendar sync support
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS teams_event_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS teams_join_url  TEXT,
  ADD COLUMN IF NOT EXISTS invitees        TEXT[]; -- array of user_ids or emails
