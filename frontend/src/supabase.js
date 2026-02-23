import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://jjpkppykzgiltiqchkue.supabase.co"
const supabaseAnonKey = "sb_publishable_ODNVj-TLIfLAQr5fJOLnQg_aCObJkZT"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
