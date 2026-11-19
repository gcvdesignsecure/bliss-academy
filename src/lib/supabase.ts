
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configMissing = !SUPABASE_URL || !SUPABASE_ANON_KEY;

if (configMissing) {
  console.error(
    "BLISS Academy: Supabase configuration is missing. Check your environment variables."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://rlqccyjlsnodivjbqsdg.supabase.co",
  SUPABASE_ANON_KEY || "MISSING_PUBLIC_KEY",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
