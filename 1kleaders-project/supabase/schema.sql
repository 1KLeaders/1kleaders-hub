-- ============================================================
-- 1K LEADERS — SUPABASE SCHEMA (Phase 1)
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================


-- ── 1. PROFILES ──────────────────────────────────────────────
-- One row per user. Created after auth signup or admin invite.
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Identity
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT UNIQUE NOT NULL,
  phone_country_code  TEXT,
  phone_number        TEXT,
  date_of_birth       DATE,
  gender              TEXT,
  nationality         TEXT,

  -- Location
  country             TEXT,
  city                TEXT,

  -- Professional
  linkedin_url        TEXT,
  current_role        TEXT,
  org_name            TEXT,
  org_website         TEXT,
  org_country         TEXT,
  org_industries      TEXT[],   -- array of selected industries
  job_level           TEXT,
  years_experience    INT,
  expertise_domains   TEXT[],   -- array of selected domains

  -- Platform
  role                TEXT NOT NULL DEFAULT 'waiting-list',
  -- values: 'waiting-list' | 'shareholder' | 'founder' | 'idea-owner' | 'admin' | 'super-admin' | 'user'
  pool                TEXT,
  -- values: 'prospect-shareholder' | 'prospect-idea-owner' | 'prospect-founder' | null
  onboarding_status   TEXT NOT NULL DEFAULT 'Waitlist Submitted',
  -- see 22-status list in spec
  leader_profiles     TEXT[],   -- ['co-founder', 'advisor', 'idea-owner', 'investor']
  bio                 TEXT,
  profile_photo_url   TEXT,
  is_first_login      BOOLEAN DEFAULT TRUE,
  whatsapp_opt_in     BOOLEAN DEFAULT FALSE,
  partner_level       TEXT      -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
);

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. WAITLIST SUBMISSIONS ───────────────────────────────────
-- Raw form data captured at submission time, before admin review.
-- Kept separate from profiles so unreviewed applicants don't get auth accounts yet.
CREATE TABLE waitlist_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Page 1 — Contact Info
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone_country_code  TEXT NOT NULL,
  phone_number        TEXT NOT NULL,
  linkedin_url        TEXT NOT NULL,

  -- Page 2 — Organization Info
  org_name            TEXT NOT NULL,
  org_website         TEXT NOT NULL,
  org_industries      TEXT[] NOT NULL,
  org_country         TEXT NOT NULL,
  job_level           TEXT NOT NULL,
  years_experience    INT NOT NULL,

  -- Page 3 — Leader Profile
  leader_profiles     TEXT[] NOT NULL,  -- ['co-founder', 'advisor', etc.]
  nationality         TEXT NOT NULL,
  gender              TEXT NOT NULL,
  date_of_birth       DATE NOT NULL,
  expertise_domains   TEXT[] NOT NULL,

  -- Admin review
  status              TEXT NOT NULL DEFAULT 'pending',
  -- values: 'pending' | 'approved' | 'rejected' | 'parked' | 'more-info-required'
  admin_notes         TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,

  -- Pool assignment (set by admin on approval)
  pool                TEXT
  -- values: 'prospect-shareholder' | 'prospect-idea-owner' | 'prospect-founder'
);


-- ── 3. ONBOARDING TRACKER ─────────────────────────────────────
-- Tracks each partner's progress through the 22 onboarding statuses.
CREATE TABLE onboarding_tracker (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  current_status      TEXT NOT NULL DEFAULT 'Waitlist Submitted',
  -- Full 22-status list:
  -- 1  Waitlist Submitted         12  KYC Under Review
  -- 2  Under Admin Review         13  KYC Approved
  -- 3  Meeting to be Scheduled    14  Payment Pending
  -- 4  Meeting Scheduled          15  Payment Receipt Submitted
  -- 5  Meeting Completed          16  Payment Confirmed
  -- 6  Not Proceeding             17  Welcome Pack Shared
  -- 7  Agreement Sent             18  Pending Operations Review
  -- 8  Agreement Signed           19  File Completed
  -- 9  Platform Access Issued     20  Awaiting 50-Person Round
  -- 10 KYC Pending                21  Awaiting ADGM Registration
  -- 11 KYC Submitted              22  Officially Registered Partner

  meeting_date        TIMESTAMPTZ,
  meeting_decision    TEXT,    -- 'invite' | 'reject' | 'park' | 'more-info'
  docusign_envelope_id TEXT,
  docusign_status     TEXT,    -- 'sent' | 'signed' | 'declined' | 'voided'
  payment_amount      NUMERIC(10,2),
  payment_confirmed_at TIMESTAMPTZ,
  adgm_registered_at  TIMESTAMPTZ,
  notes               TEXT
);

CREATE TRIGGER onboarding_tracker_updated_at
  BEFORE UPDATE ON onboarding_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 4. KYC DOCUMENTS ─────────────────────────────────────────
-- One row per document per user. File stored in Supabase Storage bucket 'kyc-documents'.
CREATE TABLE kyc_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  doc_type            TEXT NOT NULL,
  -- values: 'clara-kyc-form' | 'passport' | 'national-id' | 'cv' | 'proof-of-address'

  storage_path        TEXT,        -- path inside Supabase Storage bucket
  file_name           TEXT,
  file_size_bytes     INT,
  uploaded_at         TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'pending',
  -- values: 'pending' | 'submitted' | 'under-review' | 'approved' | 'rejected'

  rejection_reason    TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,

  UNIQUE(user_id, doc_type)        -- one of each doc type per user
);

CREATE TRIGGER kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 5. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),

  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'info',
  -- values: 'info' | 'success' | 'warning' | 'error'

  is_read             BOOLEAN DEFAULT FALSE,
  read_at             TIMESTAMPTZ,
  action_url          TEXT    -- optional deep-link to relevant page
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles: users can only read/update their own row; admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));


-- Waitlist: anyone can insert (public form); only admins can read
ALTER TABLE waitlist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit waitlist"
  ON waitlist_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view waitlist"
  ON waitlist_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));

CREATE POLICY "Admins can update waitlist"
  ON waitlist_submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));


-- Onboarding tracker: user sees own; admins see all
ALTER TABLE onboarding_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON onboarding_tracker FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding"
  ON onboarding_tracker FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));

CREATE POLICY "Admins can update onboarding"
  ON onboarding_tracker FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));


-- KYC: users can upload their own; admins can read/update all
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC"
  ON kyc_documents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC"
  ON kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all KYC"
  ON kyc_documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));


-- Notifications: users only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
  ));


-- ============================================================
-- STORAGE BUCKETS
-- Create these manually in Supabase Dashboard → Storage:
--
--   Bucket name: kyc-documents   (private)
--   Bucket name: profile-photos  (public)
--
-- Set the kyc-documents bucket to private with signed URLs only.
-- ============================================================
