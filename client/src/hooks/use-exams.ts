import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type InsertExam, 
  type Exam, 
  type ExamSession // Sxemangizdagi nom bilan bir xil
} from "@shared/schema";

/**
 * Barcha imtihonlarni olish hooki
 */
export function useExams() {
  return useQuery<Exam[]>({
    queryKey: [api.exams.list.path],
    queryFn: async () => {
      const res = await fetch(api.exams.list.path);
      if (!res.ok) throw new Error("Failed to fetch exams");
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
      // buildUrl ishlatish xavfsizroq
      const url = buildUrl(api.exams.get.path, { id: id! });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch exam");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create exam");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exams.list.path] });
    },
  });
}

/**
 * Imtihonni tahrirlash hooki
 */
export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: InsertExam & { id: number }) => {
      // TypeScript xatosini oldini olish uchun url qo'lda yozildi
      const url = `/api/exams/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update exam");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.exams.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.exams.get.path, variables.id] });
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
      const url = `/api/exams/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete exam");
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
    queryKey: ["/api/sessions"], // Pathni api.sessions orqali o'zgartirishingiz mumkin
    queryFn: async () => {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json();
    },
  });
}