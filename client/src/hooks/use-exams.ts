import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertExam, type Exam, type ExamSession } from "@shared/schema";

// ------------------------------------------------------------
// Query Key Factory (kesh kalitlarini markazlashtirish)
// ------------------------------------------------------------
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
 * - staleTime: 1 daqiqa – bu vaqt ichida qayta so‘rov yuborilmaydi
 */
export function useExams() {
  return useQuery<Exam[]>({
    queryKey: examKeys.lists(),
    queryFn: async ({ signal }) => {
      const res = await fetch(api.exams.list.path, { signal });
      if (!res.ok) {
        throw new Error(`Imtihonlarni yuklashda xatolik: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 1000 * 60, // 1 daqiqa
  });
}

/**
 * ID bo‘yicha bitta imtihonni olish hooki
 * - enabled: faqat ID to‘g‘ri bo‘lganda ishlaydi
 */
export function useExam(id: number | undefined) {
  return useQuery<Exam>({
    queryKey: examKeys.detail(id!),
    queryFn: async ({ signal }) => {
      // ID mavjudligi enabled orqali kafolatlangan
      const url = buildUrl(api.exams.get.path, { id: id! });
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Imtihon ma'lumotlarini olishda xatolik: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!id && !isNaN(id),
  });
}

/**
 * Yangi imtihon yaratish hooki
 * - muvaffaqiyatli yaratilgandan so‘ng imtihonlar ro‘yxati yangilanadi
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
      if (!res.ok) {
        throw new Error(`Yangi imtihon yaratib bo‘lmadi: ${res.status}`);
      }
      return res.json() as Promise<Exam>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
    },
  });
}

/**
 * Imtihonni tahrirlash hooki
 * - PATCH so‘rovi orqali qisman yangilash
 * - muvaffaqiyatli bo‘lsa, detail kesh ham yangilanadi
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
      if (!res.ok) {
        throw new Error(`Imtihonni yangilashda xatolik: ${res.status}`);
      }
      return res.json() as Promise<Exam>;
    },
    onSuccess: (updatedExam) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.setQueryData(examKeys.detail(updatedExam.id), updatedExam);
    },
  });
}

/**
 * Imtihonni o‘chirish hooki
 * - o‘chirilgandan so‘ng ro‘yxat va detail kesh tozalanadi
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.exams.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Imtihonni o‘chirib bo‘lmadi: ${res.status}`);
      }
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.removeQueries({ queryKey: examKeys.detail(deletedId) });
    },
  });
}

/**
 * Sessiyalarni (talabalar faolligini) olish hooki
 * - monitoring uchun har 10 sekundda avtomatik yangilanadi
 */
export function useSessions() {
  return useQuery<ExamSession[]>({
    queryKey: examKeys.sessions,
    queryFn: async ({ signal }) => {
      const res = await fetch(api.sessions.list.path, { signal });
      if (!res.ok) {
        throw new Error(`Sessiyalarni yuklashda xatolik: ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 10000, // 10 sekund
  });
}