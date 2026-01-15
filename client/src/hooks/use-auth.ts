import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type StudentLoginRequest } from "@shared/routes";
import { useLocation } from "wouter";

export function useAdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.adminLogin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // In a real app, we might store user info in context
      // For now, redirect to admin dashboard
      setLocation("/admin");
    },
  });
}

export function useStudentLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: StudentLoginRequest) => {
      const res = await fetch(api.auth.studentLogin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid access code");
      }
      
      const data = await res.json();
      // Store session ID in localStorage for persistence across reloads if needed
      // But purely relying on HTTP-only cookies is safer.
      // We will rely on the response for the immediate session object.
      return data;
    },
    onSuccess: (data) => {
      // Redirect to exam start page
      setLocation(`/exam/${data.session.id}`);
    },
  });
}

export function useLogout() {
  const [, setLocation] = useLocation();
  
  return useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: "POST" });
    },
    onSuccess: () => {
      setLocation("/");
    },
  });
}
