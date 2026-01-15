import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

// 1. Foydalanuvchi ma'lumotlarini olish va sessiyani tekshirish hooki
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      // LocalStorage-dan foydalanuvchini tekshirish
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    },
    // Bu ma'lumotni keshda saqlaymiz
    staleTime: Infinity,
  });

  return { user, isLoading, error };
}

// 2. Admin Login hooki
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
      // Ma'lumotni saqlash
      localStorage.setItem("user", JSON.stringify(userData));
      // Keshni yangilash
      queryClient.setQueryData(["/api/user"], userData);
      // Admin panelga o'tish
      window.location.replace("/admin");
    },
  });
}

// 3. Talaba Login hooki
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

// 4. Logout hooki
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Serverga logout so'rovi (ixtiyoriy)
      await fetch(api.auth.logout.path, { method: "POST" }).catch(() => {});
    },
    onSuccess: () => {
      // Tozalash
      localStorage.removeItem("user");
      localStorage.removeItem("student_session");
      queryClient.setQueryData(["/api/user"], null);
      window.location.replace("/");
    },
  });
}