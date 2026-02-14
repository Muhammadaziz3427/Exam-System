import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env faylidagi o'zgaruvchilarni yuklash
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Xavfsizlik tekshiruvi
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "XATO: SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY topilmadi. .env faylini tekshiring!"
  );
}

/**
 * Supabase Service Role Client
 * Backend (server) uchun maxsus client. 
 * Bu orqali biz bazadagi barcha jadvallarga (RLS cheklovlarisiz) ruxsat olamiz.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Drizzle eksportlarini (masalan, 'export const db = ...') o'chirib tashlang, 
// chunki endi hamma joyda faqat 'supabase' ishlatiladi.