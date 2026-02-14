import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

/**
 * Foydalanuvchi holatini tekshirish uchun hook
 * localStorage-dagi ma'lumotni React Query keshiga ulaydi
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          // Supabase-dan kelayotgan user obyekti ichma-ich bo'lishi mumkin
          return parsed?.user || parsed;
        }
      } catch (e) {
        console.error("Auth parsing error:", e);
      }
      return null;
    },
    staleTime: Infinity,
  });
  return { user, isLoading, error };
}

/**
 * Admin va O'qituvchilar uchun kirish hook-i
 */
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
        const errorData = await res.json();
        throw new Error(errorData.message || "Kirishda xatolik yuz berdi");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      // Supabase formatida data.user ichida bo'lishi mumkin
      const userData = data.user || data;

      localStorage.setItem("user", JSON.stringify(userData));
      queryClient.setQueryData(["/api/user"], userData);

      // Navigate funksiyasi AuthPage-ning o'zida location orqali boshqariladi, 
      // lekin bu yerda ham qo'shimcha xavfsizlik uchun qoldirildi.
    },
  });
}

/**
 * Talabalar uchun Test ID (accessCode) orqali kirish hook-i
 */
export function useStudentLogin() {
  return useMutation({
    mutationFn: async (credentials: any) => {
      const res = await fetch(api.auth.studentLogin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Kod yoki parol xato");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      // Sessiya ma'lumotlarini saqlash
      const sessionData = data.session || data;
      localStorage.setItem("student_session", JSON.stringify(sessionData));
    },
  });
}

/**
 * Tizimdan chiqish hook-i
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Serverdagi sessiyani yakunlash
      await fetch(api.auth.logout.path, { method: "POST" }).catch(() => {});
    },
    onSuccess: () => {
      // Barcha mahalliy ma'lumotlarni tozalash
      localStorage.removeItem("user");
      localStorage.removeItem("student_session");
      queryClient.setQueryData(["/api/user"], null);

      // Bosh sahifaga qaytarish
      window.location.replace("/");
    },
  });
}