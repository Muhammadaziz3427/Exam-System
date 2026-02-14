import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvmmrbjzlxoxookbsdme.supabase.co';
const supabaseAnonKey = 'SIZNING_ANON_KEY_SHU_YERGA'; // Dashborddan oling

export const supabase = createClient(supabaseUrl, supabaseAnonKey);