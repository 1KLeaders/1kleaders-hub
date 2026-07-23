-- ============================================================
-- MIGRATION 013 — AI Chat Sessions
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_type   TEXT NOT NULL DEFAULT 'general', -- 'general' | 'idea'
  session_id   TEXT NOT NULL,                   -- Lyzr session ID
  title        TEXT,                             -- auto-generated from first message
  messages     JSONB NOT NULL DEFAULT '[]',      -- [{role, content, created_at}]
  idea_id      TEXT                              -- linked idea if agent_type = 'idea'
);

CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat sessions"
  ON ai_chat_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins read all sessions"
  ON ai_chat_sessions FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin','super-admin','developer'));

GRANT ALL ON public.ai_chat_sessions TO authenticated;
