import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

// URL куда Supabase редиректит после подтверждения email / сброса пароля
export const APP_URL = import.meta.env.VITE_APP_URL as string
  ?? window.location.origin;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
