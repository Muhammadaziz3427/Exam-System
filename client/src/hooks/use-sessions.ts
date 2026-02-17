import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";
import { supabase } from "@/lib/supabase";

// ------------------------------------------------------------
// Query Keys
// ------------------------------------------------------------
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: number | string) => [...sessionKeys.all, "detail", id] as const,
};

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface SubmitPayload {
  id: number | string;
  answers: Record<string, any>;
  isFinal?: boolean;
  status?: "pending" | "submitted" | "blocked" | "active" | "completed";
  currentSection?: string;
  remainingTime?: number;
  email?: string;
  notes?: string;
}

interface ViolationPayload {
  id: number | string;
  type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'multiple_faces' | 'no_face';
}

// ------------------------------------------------------------
// 1. Barcha sessiyalarni olish (real-time monitoring)
// ------------------------------------------------------------
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Sessiyalarni yuklashda xato:", error.message);
        throw error;
      }
      return data || [];
    },
    refetchInterval: 5000,   // har 5 sekundda yangilanadi
    staleTime: 2000,
  });
}

// ------------------------------------------------------------
// 2. Yagona sessiyani olish (barcha bog‘langan ma'lumotlar bilan)
// ------------------------------------------------------------
export function useSession(id: number | string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*, exams(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Sessiya ma'lumotlarini olishda xato:", error.message);
        throw error;
      }

      // exams ichidan audioUrl ni olish
      const exam = data?.exams as any;
      return {
        ...data,
        audioUrl: exam?.audioUrl || null,
      };
    },
    enabled: !!id,
  });
}

// ------------------------------------------------------------
// 3. Yangi sessiya yaratish (faqat mavjud ustunlar bilan)
// ------------------------------------------------------------
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSession) => {
      // Supabase jadvalidagi ustun nomlariga mos payload
      const payload = {
        exam_id: data.examId,                     // snake_case bo‘lishi mumkin
        student_name: data.studentName,
        access_code: data.accessCode,
        password: (data as any).password,         // agar kerak bo‘lsa
        status: 'pending',
        // Agar jadvalda qo‘shimcha ustunlar bo‘lsa, shu yerga qo‘shing
        // first_name, last_name, email – agar mavjud bo‘lsa
      };

      const { data: newSession, error } = await supabase
        .from('exam_sessions')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Sessiya yaratishda xato:", error.message);
        throw error;
      }
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// ------------------------------------------------------------
// 4. Imtihonni boshlash (status → active, start_time yoziladi)
// ------------------------------------------------------------
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .update({ 
          status: 'active', 
          start_time: new Date().toISOString(),   // column name: start_time
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Sessiyani boshlashda xato:", error.message);
        throw error;
      }
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// ------------------------------------------------------------
// 5. Javoblarni yuborish (va ixtiyoriy backend autograd)
// ------------------------------------------------------------
export function useSubmitAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: SubmitPayload) => {
      // Supabase ga yangilash
      const updateData: any = {
        answers: payload.answers,
        status: payload.isFinal ? 'completed' : (payload.status || 'active'),
        updated_at: new Date().toISOString(),
      };
      if (payload.remainingTime !== undefined) {
        updateData.remaining_time = payload.remainingTime;
      }

      const { data, error } = await supabase
        .from('exam_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Javoblarni saqlashda xato:", error.message);
        throw error;
      }

      // Agar imtihon yakunlangan bo‘lsa, backend autograd endpoint'ini chaqirish
      if (payload.isFinal) {
        try {
          await fetch(buildUrl(api.sessions.submit.path, { id: String(id) }), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          // Autograd muhim emas, faqat log yozamiz
          console.warn("Backend autograd xatosi (davom etish mumkin):", e);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// ------------------------------------------------------------
// 6. Qoidabuzarliklarni qayd etish
// ------------------------------------------------------------
export function useLogViolation() {
  return useMutation({
    mutationFn: async ({ id, type }: ViolationPayload) => {
      const { data, error } = await supabase
        .from('violations')
        .insert([{ 
          session_id: id, 
          type, 
          created_at: new Date().toISOString() 
        }])
        .select();   // .select() qo‘shildi – yaratilgan qatorni qaytaradi

      if (error) {
        console.error("Qoidabuzarlikni yozishda xato:", error.message);
        throw error;
      }
      return data?.[0] || null;
    },
    retry: 1,
  });
}