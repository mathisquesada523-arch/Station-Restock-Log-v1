import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tbybflqfgixarvkxhndk.supabase.co";
const supabaseAnonKey = "sb_publishable_CDV_en-gIXcwpsPfg4zEWw_aIDAgU2w";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);