import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type InsertExam, 
  type Exam, 
  type ExamSession 
} from "@shared/schema";

// --- 1. Query Key Factory (Kesh kalitlarini markazlashtirish) ---
export const examKeys = {
  all: ["exams"] as const,
  lists: () => [...examKeys.all, "list"] as const,
  list: (filters: string) => [...examKeys.lists(), { filters }] as const,
  details: () => [...examKeys.all, "detail"] as const,
  detail: (id: number) => [...examKeys.details(), id] as const,
  sessions: ["sessions"] as const,
};

/**
 * Barcha imtihonlarni olish hooki
 * signal (bekor qilish) va staleTime qo'shildi.
 */
export function useExams() {
  return useQuery<Exam[]>({
    queryKey: examKeys.lists(),
    queryFn: async ({ signal }) => {
      const res = await fetch(api.exams.list.path, { signal });
      if (!res.ok) throw new Error("Imtihonlarni yuklashda xatolik yuz berdi");
      return await res.json();
    },
    staleTime: 1000 * 60, // 1 daqiqa davomida keshdan o'qiydi
  });
}

/**
 * ID bo'yicha bitta imtihonni olish hooki
 */
export function useExam(id: number | undefined) {
  return useQuery<Exam>({
    queryKey: examKeys.detail(id!),
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("ID kiritilmadi");
      const url = buildUrl(api.exams.get.path, { id });
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Imtihon ma'lumotlarini olishda xatolik");
      return await res.json();
    },
    enabled: !!id && !isNaN(id), // ID raqam ekanligiga ishonch hosil qilish
  });
}

/**
 * Yangi imtihon yaratish hooki
 */
export function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExam) => {
      const res = await fetch(api.exams.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Yangi imtihon yaratib bo'lmadi");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
    },
  });
}

/**
 * Imtihonni tahrirlash hooki
 */
export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertExam> & { id: number }) => {
      const url = buildUrl(api.exams.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Imtihonni yangilashda xatolik");
      return await res.json() as Exam;
    },
    onSuccess: (updatedExam) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.setQueryData(examKeys.detail(updatedExam.id), updatedExam);
    },
  });
}

/**
 * Imtihonni o'chirish hooki
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.exams.delete.path, { id });
      const res = await fetch(url, { 
        method: "DELETE" 
      });
      if (!res.ok) throw new Error("Imtihonni o'chirib bo'lmadi");
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.removeQueries({ queryKey: examKeys.detail(deletedId) });
    },
  });
}

/**
 * Sessiyalarni (Talabalar faolligini) olish hooki
 * Monitoring uchun har 10 sekundda yangilanadi
 */
export function useSessions() {
  return useQuery<ExamSession[]>({
    queryKey: examKeys.sessions,
    queryFn: async ({ signal }) => {
      const res = await fetch(api.sessions.list.path, { signal });
      if (!res.ok) throw new Error("Sessiyalarni yuklashda xatolik");
      return await res.json();
    },
    refetchInterval: 10000, // 10 sekundda auto-refresh
  });
}