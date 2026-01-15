import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSession } from "@shared/schema";

export function useSessions() {
  return useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json();
    },
    refetchInterval: 5000, // Poll for live monitoring
  });
}

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
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
    },
  });
}

export function useStartSession() {
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sessions.start.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start exam");
      return await res.json();
    },
  });
}

export function useSubmitAnswers() {
  return useMutation({
    mutationFn: async ({ id, answers, isFinal }: { id: number; answers: any; isFinal?: boolean }) => {
      const url = buildUrl(api.sessions.submit.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, isFinal }),
      });
      if (!res.ok) throw new Error("Failed to submit answers");
      return await res.json();
    },
  });
}

export function useLogViolation() {
  return useMutation({
    mutationFn: async ({ id, type }: { id: number; type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' }) => {
      const url = buildUrl(api.sessions.logViolation.path, { id });
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
    },
  });
}
