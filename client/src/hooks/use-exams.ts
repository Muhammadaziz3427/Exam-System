import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Exam, type InsertExam } from "@shared/schema";

export function useExams() {
  return useQuery({
    queryKey: [api.exams.list.path],
    queryFn: async () => {
      const res = await fetch(api.exams.list.path);
      if (!res.ok) throw new Error("Failed to fetch exams");
      return await res.json();
    },
  });
}

export function useExam(id: number) {
  return useQuery({
    queryKey: [api.exams.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.exams.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch exam");
      return await res.json();
    },
    enabled: !!id,
  });
}

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
