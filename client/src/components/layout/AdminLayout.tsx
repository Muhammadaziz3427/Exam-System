import { useEffect, useState } from "react";
// Nomma-nom import qilish (Linter xatolarini yo'qotish uchun eng yaxshi yo'l)
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User, 
  ShieldCheck 
} from "lucide-react"; 
import * as uiKit from "@/components/ui-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorizedUser, setAuthorizedUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const rawData = localStorage.getItem("user");
    if (rawData) {
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
      }
    } else {
      window.location.href = "/";
    }
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <ShieldCheck className="text-blue-600 animate-pulse" size={32} />
      </div>
    );
  }

  if (!authorizedUser) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-white overflow-hidden m-0 p-0 antialiased text-slate-900">

        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
          <header className="h-20 w-full flex items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0 z-40">
            <div className="flex items-center gap-6">
              <div className="border-l-4 border-blue-600 pl-4">
                <h1 className="text-[10px] font-black uppercase tracking-widest text-blue-600 leading-none mb-1">
                  {authorizedUser.role || "Admin"}
                </h1>
                <p className="text-xl font-extrabold text-slate-800 leading-none tracking-tight">Boshqaruv Markazi</p>
              </div>

              <div className="hidden xl:flex items-center relative w-80 ml-4">
                <Search className="absolute left-3 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Tizimdan qidirish..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
                <uiKit.Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 rounded-lg hover:bg-blue-50">
                  <Bell size={18} />
                </uiKit.Button>
                <uiKit.Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 rounded-lg hover:bg-slate-100">
                  <Settings size={18} />
                </uiKit.Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-none">{authorizedUser.username}</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Online</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold shadow-lg">
                  {authorizedUser.username.charAt(0).toUpperCase()}
                </div>
                <uiKit.Button 
                  variant="ghost" 
                  size="icon"
                  className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                >
                  <LogOut size={18} />
                </uiKit.Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            <div className="w-full p-8">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                {children}
              </div>
            </div>

            <footer className="px-8 py-6 border-t border-slate-200/60 bg-white/50 flex flex-col sm:flex-row justify-between items-center gap-2">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">© 2026 IELTS Studio</p>
              <p className="text-slate-400 text-[10px] font-medium italic">
                Created & Developed by Yursinaliyev Muhammadaziz | Email: yursinaliyevm@gmail.com
              </p>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}