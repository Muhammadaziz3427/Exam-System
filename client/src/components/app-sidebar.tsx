import { 
  LayoutDashboard, 
  BookOpen, 
  UserCog, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  LogOut 
} from "lucide-react"; // Kerakli ikonkalarni alohida olamiz
import { useLocation, Link } from "wouter";
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

const getUserData = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return parsed?.user?.user || parsed?.user || parsed;
  } catch (error) {
    return null;
  }
};

export function AppSidebar() {
  const [location] = useLocation();
  const userData = getUserData();
  const isAdmin = userData?.role === "admin";

  // Ikonkalarni komponent ko'rinishida saqlaymiz
  const items = isAdmin 
    ? [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
        { title: "Exam Library", url: "/admin/exams", icon: BookOpen },
        { title: "Instructors", url: "/admin/teachers", icon: UserCog },
        { title: "Test Sessions", url: "/admin/sessions", icon: Calendar },
        { title: "Performance Reports", url: "/admin/detailed-assessment", icon: FileText },
      ]
    : [{ title: "Assessment Center", url: "/teacher", icon: LayoutDashboard }];

  return (
    <Sidebar 
      collapsible="none" 
      className="w-72 border-r border-slate-200 bg-white shrink-0"
    >
      <SidebarHeader className="h-20 flex items-center px-6 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100">
            <ShieldCheck size={22} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-slate-900 text-lg tracking-tight">IELTS Studio</span>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white px-3 pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                const isActive = location === item.url;
                const Icon = item.icon; // Ikonkani komponent sifatida ajratib olamiz

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`h-11 rounded-xl px-4 transition-all duration-300 ${
                        isActive 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700 hover:text-white" 
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <Icon size={20} className={isActive ? "text-white" : "text-slate-400"} />
                        <span className="font-bold text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-50 space-y-4">
        <button 
          onClick={() => confirm("Chiqmoqchimisiz?") && (localStorage.clear(), window.location.href = "/")}
          className="flex items-center gap-3 w-full h-12 rounded-xl px-4 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all font-bold text-sm"
        >
          <LogOut size={20} />
          <span>Logout System</span>
        </button>
        <div className="px-2 pt-2 border-t border-slate-50">
          <p className="text-[9px] text-slate-400 font-medium leading-tight">
            Developed by Yursinaliyev Muhammadaziz
          </p>
          <p className="text-[9px] text-slate-300 font-normal">
            yursinaliyevm@gmail.com
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}