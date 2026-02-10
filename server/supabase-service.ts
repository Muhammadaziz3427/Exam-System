import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadToSupabase = async (filePath: string, fileName: string) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // Fayl nomidagi bo'shliqlarni yo'qotamiz va vaqt tamg'asini qo'shamiz
    const cleanFileName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    const ext = path.extname(fileName).toLowerCase();

    // Content-Type ni aniqlash
    let contentType = 'application/octet-stream';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    console.log(`Yuklanmoqda: ${cleanFileName}, Turi: ${contentType}`);

    const { data, error } = await supabase.storage
      .from('ielts-assets')
      .upload(`uploads/${cleanFileName}`, fileBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Supabase Storage Error:", error.message);
      throw error;
    }

    const { data: publicUrl } = supabase.storage
      .from('ielts-assets')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error("UploadToSupabase ichidagi xatolik:", error);
    throw error;
  }
};