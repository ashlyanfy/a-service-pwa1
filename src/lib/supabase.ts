import { createClient } from '@supabase/supabase-js';

// Используем env vars или захардкоженные значения как fallback для localhost
const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  as string)
  || 'https://szffyfwjwdlystyxenpo.supabase.co';

const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  || 'sb_publishable_Z3tVIZYoRzFzRLpKaofoHw_oGG0wmgW';

// URL куда Supabase редиректит после подтверждения email / сброса пароля
export const APP_URL: string = (import.meta.env.VITE_APP_URL as string)
  || window.location.origin;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    // Токены хранятся в localStorage — стандарт для SPA
    // XSS защита: CSP + экранирование всего innerHTML (уже сделано)
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
