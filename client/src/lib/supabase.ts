import { createClient } from '@supabase/supabase-js';

// Server-side muhitda process.env ishlatiladi
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Backend Supabase xatosi: URL yoki Key topilmadi!");
}

// Backend uchun klient
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');