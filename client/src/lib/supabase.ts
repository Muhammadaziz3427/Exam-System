import { createClient } from '@supabase/supabase-js';

// Replit yoki Vite loyihalari uchun muhit o'zgaruvchilari (Environment Variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Agar o'zgaruvchilar aniqlanmagan bo'lsa, xatolikni oldini olish uchun tekshiruv
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL yoki API Key topilmadi! .env faylingizni tekshiring.");
}

// Supabase klientini yaratish va eksport qilish
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');