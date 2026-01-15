import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Users, LogOut, Loader2 } from "lucide-react";
import { useLogout, useAuth } from "@/hooks/use-auth"; // useAuth qo'shildi
import { Button } from "@/components/ui-kit";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();
  const { user, isLoading } = useAuth(); // Foydalanuvchi holatini tekshirish

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/exams", label: "Manage Exams", icon: FileText },
    { href: "/admin/sessions", label: "Live Monitoring", icon: Users },
  ];

  // Yuklanish holati (Skelet yuklanayotganda oq ekran bo'lmasligi uchun)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agar foydalanuvchi admin bo'lmasa, layoutni ko'rsatmaslik (xavfsizlik uchun)
  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed to left */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full" />
            Admin Portal
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            // Replit yo'llari ba'zan '/' bilan tugaydi yoki tugamaydi, shuni hisobga olamiz
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <a className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-slate-800 hover:text-white"}
                `}>
                  <item.icon size={18} className={isActive ? "animate-pulse" : ""} />
                  <span className="font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="px-3 py-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Account</p>
            <p className="text-sm text-white truncate font-medium">{user.username}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-2 transition-colors"
            onClick={() => {
              if (confirm("Tizimdan chiqmoqchimisiz?")) {
                logout.mutate();
              }
            }}
            disabled={logout.isPending}
          >
            {logout.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} />
            )}
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content - Pushed to right by ml-64 */}
      <main className="flex-1 ml-64 p-8 min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}