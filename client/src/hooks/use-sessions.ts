import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";
import { supabase } from "@/lib/supabase";

// --- QUERY KEYS ---
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: number | string) => [...sessionKeys.all, "detail", id] as const,
};

// --- TYPES ---
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

// 1. Barcha sessiyalarni olish
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, 
    staleTime: 2000,
  });
}

// 2. Yagona sessiyani olish
export function useSession(id: number | string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*, exams(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        audioUrl: data?.audioUrl || "",
      };
    },
    enabled: !!id,
  });
}

// 3. Yangi sessiya yaratish (TOZALANGAN VARIANT)
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSession) => {
      // 400 xatosini oldini olish uchun faqat bazada aniq bor ustunlarni yuboramiz
      const payload = {
        examId: data.examId,
        studentName: data.studentName,
        accessCode: data.accessCode,
        status: 'pending',
        // Agar firstName/lastName bazada bo'lsa buni qoldiring, bo'lmasa o'chiring
        firstName: (data as any).firstName || null,
        lastName: (data as any).lastName || null,
        email: (data as any).email || null,
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

// 4. Imtihonni boshlash
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .update({ 
          status: 'active', 
          startedAt: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// 5. Javoblarni yuborish
export function useSubmitAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: SubmitPayload) => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .update({
          answers: payload.answers,
          status: payload.isFinal ? 'completed' : (payload.status || 'active'),
          remainingTime: payload.remainingTime,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (payload.isFinal) {
        try {
          await fetch(buildUrl(api.sessions.submit.path, { id: String(id) }), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, isFinal: true }),
          });
        } catch (e) {
          console.error("Backend hisoblashda xato (ixtiyoriy):", e);
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

// 6. Qoidabuzarliklarni qayd etish
export function useLogViolation() {
  return useMutation({
    mutationFn: async ({ id, type }: ViolationPayload) => {
      const { data, error } = await supabase
        .from('violations')
        .insert([{ 
          session_id: id, 
          type: type, 
          created_at: new Date().toISOString() 
        }]);

      if (error) throw error;
      return data;
    },
    retry: 1,
  });
}