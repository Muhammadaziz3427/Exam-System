import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type InsertExam, 
  type Exam, 
  type ExamSession 
} from "@shared/schema";

/**
 * Barcha imtihonlarni olish hooki
 */
export function useExams() {
  return useQuery<Exam[]>({
    queryKey: [api.exams.list.path],
    queryFn: async () => {
      const res = await fetch(api.exams.list.path);
      if (!res.ok) throw new Error("Imtihonlarni yuklashda xatolik yuz berdi");
      return await res.json();
    },
  });
}

/**
 * ID bo'yicha bitta imtihonni olish hooki
 */
export function useExam(id: number | undefined) {
  return useQuery<Exam>({
    queryKey: [api.exams.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.exams.get.path, { id: id! });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Imtihon ma'lumotlarini olishda xatolik");
      return await res.json();
    },
    enabled: !!id,
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
        method: api.exams.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Yangi imtihon yaratib bo'lmadi");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exams.list.path] });
    },
  });
}

/**
 * Imtihonni tahrirlash hooki (Yangilandi)
 */
export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: InsertExam & { id: number }) => {
      // buildUrl ishlatish xavfsiz va markazlashgan usul
      const url = buildUrl(api.exams.update.path, { id });
      const res = await fetch(url, {
        method: api.exams.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Imtihonni yangilashda xatolik");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.exams.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.exams.get.path, variables.id] });
    },
  });
}

/**
 * Imtihonni o'chirish hooki (Yangilandi)
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.exams.delete.path, { id });
      const res = await fetch(url, { 
        method: api.exams.delete.method 
      });
      if (!res.ok) throw new Error("Imtihonni o'chirib bo'lmadi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exams.list.path] });
    },
  });
}

/**
 * Sessiyalarni (Talabalar faolligini) olish hooki
 */
export function useSessions() {
  return useQuery<ExamSession[]>({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path);
      if (!res.ok) throw new Error("Sessiyalarni yuklashda xatolik");
      return await res.json();
    },
  });
}