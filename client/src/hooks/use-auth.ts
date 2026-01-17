import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) return JSON.parse(storedUser);
      return null;
    },
    staleTime: Infinity,
  });
  return { user, isLoading, error };
}

export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: any) => {
      const res = await fetch(api.auth.adminLogin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kirishda xatolik yuz berdi");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const userData = data.user || data;
      localStorage.setItem("user", JSON.stringify(userData));
      queryClient.setQueryData(["/api/user"], userData);

      // ROLGA QARAB YO'NALTIRISH
      if (userData.role === "teacher") {
        window.location.replace("/teacher");
      } else {
        window.location.replace("/admin");
      }
    },
  });
}

export function useStudentLogin() {
  return useMutation({
    mutationFn: async (credentials: any) => {
      const res = await fetch(api.auth.studentLogin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kod yoki parol xato");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const sessionData = data.session || data;
      localStorage.setItem("student_session", JSON.stringify(sessionData));
      window.location.href = `/exam/${sessionData.id}`;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: "POST" }).catch(() => {});
    },
    onSuccess: () => {
      localStorage.removeItem("user");
      localStorage.removeItem("student_session");
      queryClient.setQueryData(["/api/user"], null);
      window.location.replace("/");
    },
  });
}