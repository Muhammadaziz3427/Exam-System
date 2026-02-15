import { createClient } from '@supabase/supabase-js';

// BU YERGA O'ZINGIZNING SUPABASE MA'LUMOTLARINGIZNI QO'YING
const supabaseUrl = "https://sizning-proyektingiz.supabase.co";
const supabaseAnonKey = "sizning-juda-uzun-anon-kalitingiz";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);