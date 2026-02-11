import { useEffect, useState, useCallback } from "react";
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User, 
  ShieldCheck,
  Command,
  ChevronRight,
  LayoutDashboard
} from "lucide-react"; 
import * as uiKit from "@/components/ui-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"; // Shadcn bo'lsa

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorizedUser, setAuthorizedUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Auth check logic
  useEffect(() => {
    const checkAuth = () => {
      const rawData = localStorage.getItem("user");
      if (!rawData) {
        window.location.href = "/";
        return;
      }
      try {
        const parsed = JSON.parse(rawData);
        const userData = parsed?.user?.user || parsed?.user || parsed;
        if (userData && userData.username) {
          setAuthorizedUser(userData);
        } else {
          window.location.href = "/";
        }
      } catch (e) {
        window.location.href = "/";
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Keyboard shortcut for search (Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById("admin-search")?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] gap-6">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 border-[3px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <ShieldCheck className="text-blue-600 absolute animate-pulse" size={32} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-slate-900 font-bold tracking-tight">Xavfsiz ulanish...</p>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">IELTS Studio Admin</p>
        </div>
      </div>
    );
  }

  if (!authorizedUser) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-white overflow-hidden m-0 p-0 antialiased text-slate-900 font-sans">

        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative">

          {/* HEADER - Sticky & Glassmorphism */}
          <header className="h-20 w-full flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shrink-0 z-40 sticky top-0">
            <div className="flex items-center gap-8">
              <div className="hidden lg:block border-l-4 border-blue-600 pl-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1.5">
                  <LayoutDashboard size={12} />
                  <span>{authorizedUser.role || "Administrator"}</span>
                </div>
                <p className="text-xl font-extrabold text-slate-900 leading-none tracking-tight">Boshqaruv Markazi</p>
              </div>

              {/* Enhanced Search */}
              <div className="hidden xl:flex items-center relative group">
                <Search className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={17} />
                <input 
                  id="admin-search"
                  type="text" 
                  placeholder="Tizimdan qidirish..." 
                  className="w-80 pl-11 pr-14 py-2.5 bg-slate-100/50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all italic"
                />
                <kbd className="absolute right-3 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-400 flex items-center gap-1 pointer-events-none">
                  <Command size={10} /> K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {/* Action Buttons */}
              <div className="flex items-center gap-2 pr-5 border-r border-slate-200">
                <uiKit.Button variant="ghost" size="icon" className="relative w-10 h-10 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </uiKit.Button>
                <uiKit.Button variant="ghost" size="icon" className="w-10 h-10 text-slate-500 rounded-xl hover:bg-slate-100 transition-all">
                  <Settings size={20} />
                </uiKit.Button>
              </div>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="flex items-center gap-3 p-1 pr-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-bold shadow-md">
                        {authorizedUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-bold text-slate-800 leading-none">{authorizedUser.username}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Hozir faol</p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-xl shadow-xl border-slate-100">
                  <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-widest">Mening hisobim</DropdownMenuLabel>
                  <DropdownMenuItem className="rounded-lg cursor-pointer py-2">
                    <User className="mr-2 h-4 w-4" /> Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer py-2">
                    <Settings className="mr-2 h-4 w-4" /> Sozlamalar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="rounded-lg cursor-pointer py-2 text-red-600 focus:bg-red-50 focus:text-red-600"
                    onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Chiqish
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* MAIN CONTENT Area */}
          <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
            <div className="w-full max-w-[1600px] mx-auto p-8">

              {/* Dynamic Breadcrumbs (Optional but Pro) */}
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span className="text-blue-600">Joriy Sahifa</span>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-3 duration-1000">
                {children}
              </div>
            </div>

            {/* SPACER for footer */}
            <div className="h-20"></div>
          </main>

          {/* FOOTER - Floating Style */}
          <footer className="absolute bottom-0 left-0 right-0 px-8 py-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Tizim barqaror ishlamoqda
              </div>
              <div className="flex items-center gap-4">
                <p>© 2026 IELTS STUDIO</p>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <p className="font-medium italic normal-case tracking-normal">
                  Dev: <a href="mailto:yursinaliyevm@gmail.com" className="text-blue-500 hover:underline">M. Yursinaliyev</a>
                </p>
              </div>
          </footer>

        </div>
      </div>
    </SidebarProvider>
  );
}