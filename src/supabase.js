import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tbybflqfgixarvkxhndk.supabase.co";
const supabaseAnonKey = "sb_publishable_CDV_en-gIXcwpsPfg4zEWw_aIDAgU2w";

// Keep supervisor sessions in memory only: station devices are shared, so a
// page reload or closed tab signs the supervisor out (like the old code gate).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});