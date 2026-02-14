import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";
import { supabase } from "@/lib/supabase"; // Supabase klientini import qilamiz

// --- QUERY KEYS ---
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: number) => [...sessionKeys.all, "detail", id] as const,
};

// --- TYPES ---
interface SubmitPayload {
  id: number;
  answers: Record<string, any>;
  isFinal?: boolean;
  status?: "pending" | "submitted" | "blocked" | "active" | "completed";
  currentSection?: string;
  remainingTime?: number;
  email?: string;
  notes?: string;
}

interface ViolationPayload {
  id: number;
  type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'multiple_faces' | 'no_face';
}

// 1. Barcha sessiyalarni olish (Admin/Monitor uchun)
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
export function useSession(id: number) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*, exams(*)') // Imtihon ma'lumotlari bilan birga olish
        .eq('id', id)
        .single();

      if (error) throw error;

      //startsWith xatosini oldini olish uchun ma'lumotni tekshiramiz
      return {
        ...data,
        audioUrl: data.audioUrl || "", // Agar null bo'lsa, bo'sh string beramiz
      };
    },
    enabled: !!id,
  });
}

// 3. Yangi sessiya yaratish
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSession) => {
      const { data: newSession, error } = await supabase
        .from('exam_sessions')
        .insert([data])
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

// 4. Imtihonni boshlash
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
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

// 5. Javoblarni yuborish (Autosave yoki Final Submit)
export function useSubmitAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: SubmitPayload) => {
      // Supabase-da update qilish
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

      // Agar final submit bo'lsa, backend-ga natijani hisoblash uchun xabar berish (ixtiyoriy)
      if (payload.isFinal) {
        await fetch(buildUrl(api.sessions.submit.path, { id }), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, isFinal: true }),
        });
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
        .insert([{ session_id: id, type, created_at: new Date().toISOString() }]);

      if (error) throw error;
      return data;
    },
    retry: 1,
  });
}