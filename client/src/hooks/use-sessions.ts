import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";
import { supabase } from "@/lib/supabase";

export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: number | string) => [...sessionKeys.all, "detail", id] as const,
};

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
// 1. Barcha sessiyalarni olish
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 2. Yagona sessiyani olish
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
      if (error) throw error;
      const exam = data?.exams as any;
      return { ...data, audioUrl: exam?.audioUrl || null };
    },
    enabled: !!id,
  });
}

// ------------------------------------------------------------
// 3. Yangi sessiya yaratish (FAQAT MAVJUD USTUNLAR BILAN)
// ------------------------------------------------------------
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSession & { firstName?: string; lastName?: string; email?: string; password: string }) => {
      // Jadvalda mavjud bo'lgan ustunlar:
      // camelCase: examId, studentName, firstName, lastName, email, accessCode, password, status
      // snake_case: is_used, access_code (agar mavjud bo'lsa)
      const payload: any = {
        examId: data.examId,
        studentName: data.studentName,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null,
        accessCode: data.accessCode,
        password: data.password,
        status: 'pending',
        is_used: false,
      };

      // Agar access_code ustuni mavjud bo'lsa (sizning jadvalingizda bor), uni ham qo'shamiz
      // (lekin accessCode bilan bir xil qiymat)
      payload.access_code = data.accessCode;

      const { data: newSession, error } = await supabase
        .from('exam_sessions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// ------------------------------------------------------------
// 4. Imtihonni boshlash (startedAt yangilanadi)
// ------------------------------------------------------------
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .update({ status: 'active', startedAt: new Date().toISOString() })
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

// ------------------------------------------------------------
// 5. Javoblarni yuborish
// ------------------------------------------------------------
export function useSubmitAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: SubmitPayload) => {
      const updateData: any = {
        answers: payload.answers,
        status: payload.isFinal ? 'completed' : (payload.status || 'active'),
        remainingTime: payload.remainingTime,
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('exam_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (payload.isFinal) {
        try {
          await fetch(buildUrl(api.sessions.submit.path, { id: String(id) }), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
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
        .insert([{ session_id: id, type, created_at: new Date().toISOString() }])
        .select();
      if (error) throw error;
      return data?.[0] || null;
    },
    retry: 1,
  });
}