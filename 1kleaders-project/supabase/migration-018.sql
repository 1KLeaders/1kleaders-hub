-- Migration 018 — Teams connections fix
ALTER TABLE teams_connections
  ADD COLUMN IF NOT EXISTS ms_user_id TEXT;

-- Create unique index on ms_user_id for upsert
CREATE UNIQUE INDEX IF NOT EXISTS teams_connections_ms_user_id_idx 
  ON teams_connections(ms_user_id) WHERE ms_user_id IS NOT NULL;

-- Grant full access to service role
GRANT ALL ON public.teams_connections TO service_role;
GRANT ALL ON public.teams_connections TO authenticated;
