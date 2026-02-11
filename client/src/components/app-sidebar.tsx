import { useMemo } from "react";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  UserCog, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  LogOut,
  ChevronRight,
  Circle
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils"; // Tailwind klasslarini birlashtirish uchun utility

// User ma'lumotlarini olish mantiqi (memoization bilan ishlatiladi)
const fetchUserData = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return parsed?.user?.user || parsed?.user || parsed;
  } catch {
    return null;
  }
};

export function AppSidebar() {
  const [location] = useLocation();

  // Har renderda localStorage-ga murojaat qilmaslik uchun
  const userData = useMemo(() => fetchUserData(), []);
  const isAdmin = userData?.role === "admin";

  const menuItems = useMemo(() => {
    const base = isAdmin ? [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Exam Library", url: "/admin/exams", icon: BookOpen },
      { title: "Instructors", url: "/admin/teachers", icon: UserCog },
      { title: "Test Sessions", url: "/admin/sessions", icon: Calendar },
      { title: "Performance", url: "/admin/detailed-assessment", icon: FileText },
    ] : [
      { title: "Assessment Center", url: "/teacher", icon: LayoutDashboard }
    ];
    return base;
  }, [isAdmin]);

  const handleLogout = () => {
    if (window.confirm("Tizimdan chiqmoqchimisiz?")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <Sidebar 
      collapsible="none" 
      className="w-72 border-r border-slate-200 bg-white shrink-0"
    >
      {/* HEADER: Brend va Status */}
      <SidebarHeader className="h-24 flex flex-col justify-center px-6 border-b border-slate-50">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-black text-slate-900 text-xl tracking-tight leading-none truncate">
              IELTS Studio
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {isAdmin ? "Admin Engine" : "Teacher Hub"}
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT: Navigatsiya */}
      <SidebarContent className="bg-white px-4 pt-8">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            Management System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => {
                // Sub-route'larni ham tekshirish (masalan: /admin/exams/new bo'lsa ham Exam Library aktiv qoladi)
                const isActive = location === item.url || (item.url !== "/admin" && location.startsWith(item.url));
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={cn(
                        "h-12 rounded-2xl px-4 transition-all duration-300 group",
                        isActive 
                          ? "bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Icon 
                            size={20} 
                            className={cn(
                              "transition-transform group-hover:scale-110",
                              isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"
                            )} 
                          />
                          <span className={cn("text-sm tracking-wide", isActive ? "font-bold" : "font-semibold")}>
                            {item.title}
                          </span>
                        </div>
                        {isActive && <ChevronRight size={14} className="text-white/40" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: Profil va Chiqish */}
      <SidebarFooter className="p-4 bg-slate-50/50 border-t border-slate-100">
        {/* User Profile Card */}
        <div className="mb-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            {userData?.name?.charAt(0) || <Circle size={14} />}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-black text-slate-800 truncate">
              {userData?.name || "Premium User"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              {userData?.email || "online@system"}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full h-12 rounded-2xl px-4 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all duration-300 font-bold text-sm group"
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          <span>Exit System</span>
        </button>

        {/* Developer Info */}
        <div className="mt-6 px-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-4 bg-slate-200" />
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Powered By</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold pl-6">
            M. Yursinaliyev
          </p>
          <p className="text-[8px] text-slate-300 font-medium pl-6 font-mono">
            v2.4.0 (Stable)
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}