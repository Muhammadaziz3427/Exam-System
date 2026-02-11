import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";

// --- QUERY KEYS (Keshni boshqarish uchun markaziy kalitlar) ---
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: number) => [...sessionKeys.all, "detail", id] as const,
};

// --- TYPES ---
interface SubmitPayload {
  id: number;
  answers: Record<string, any>; // 'any' o'rniga aniqroq Record ishlatildi
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
    queryFn: async ({ signal }) => {
      const res = await fetch(api.sessions.list.path, { signal });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json();
    },
    refetchInterval: 5000, // Jonli monitoring uchun har 5 sekundda yangilash
    staleTime: 2000,
  });
}

// 2. Yagona sessiyani olish (YANGI - Talaba yoki Admin detail ko'rishi uchun)
export function useSession(id: number) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async ({ signal }) => {
      // Agar backendda getById endpoint bo'lsa shuni ishlatamiz, 
      // yo'q bo'lsa list endpointdan filter qilish yoki backendga get route qo'shish kerak.
      // Hozircha universal fetch logikasi:
      const url = buildUrl(`${api.sessions.list.path}/:id`, { id }); 
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Failed to fetch session details");
      return await res.json();
    },
    enabled: !!id, // ID bo'lmasa so'rov yuborilmaydi
  });
}

// 3. Yangi sessiya yaratish
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSession) => {
      const res = await fetch(api.sessions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return await res.json();
    },
    onSuccess: () => {
      // Ro'yxatni yangilaymiz
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

// 4. Imtihonni boshlash
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sessions.start.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start exam");
      return await res.json();
    },
    onSuccess: (_, id) => {
      // Faqat shu sessiyani va ro'yxatni yangilaymiz
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
      const url = buildUrl(api.sessions.submit.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit answers");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Agar bu yakuniy topshirish bo'lsa, ma'lumotlarni yangilaymiz
      if (variables.isFinal) {
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      }
    },
  });
}

// 6. Qoidabuzarliklarni qayd etish
export function useLogViolation() {
  return useMutation({
    mutationFn: async ({ id, type }: ViolationPayload) => {
      const url = buildUrl(api.sessions.logViolation.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed to log violation");
      return await res.json();
    },
    // Violation muhim bo'lgani uchun xatolik bo'lsa ham logga yozishga harakat qilish kerak
    // yoki foydalanuvchiga bildirmaslik kerak (retry: 0)
    retry: 1,
  });
}