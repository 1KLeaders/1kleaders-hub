import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types matching our DB schema
export type DbProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  country: string | null;
  city: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  org_name: string | null;
  org_website: string | null;
  org_country: string | null;
  org_industries: string[] | null;
  job_level: string | null;
  years_experience: number | null;
  expertise_domains: string[] | null;
  role: string;
  subroles: string[] | null;
  pool: string | null;
  onboarding_status: string;
  leader_profiles: string[] | null;
  bio: string | null;
  profile_photo_url: string | null;
  is_first_login: boolean;
  whatsapp_opt_in: boolean;
  partner_level: string | null;
  created_at: string;
  updated_at: string;
};
