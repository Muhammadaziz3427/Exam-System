import { useLocation } from "wouter";
import { LogOut, Loader2, User } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui-kit";
import { AppSidebar } from "@/components/app-sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();

  // LocalStorage dan ma'lumotni olish
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const user = storedUser?.user ? storedUser.user : storedUser;

  // Agar foydalanuvchi tizimga kirmagan bo'lsa, login sahifasiga yuborish
  if (!user) {
    window.location.replace("/");
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-wider">
              {user.role} Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
              <User size={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">{user.username}</span>
            </div>

            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
              onClick={() => {
                if (confirm("Chiqmoqchimisiz?")) {
                  localStorage.clear();
                  window.location.href = "/";
                }
              }}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </header>

        {/* Kontent */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}