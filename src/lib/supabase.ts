import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mhttudsztgpmxmejceln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GlF-bY_g1aVjf5Kwut8Ytg_gpis79w9";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
