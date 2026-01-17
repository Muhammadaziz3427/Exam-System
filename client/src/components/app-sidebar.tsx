import { LayoutDashboard, BookOpen, Users, LogOut, UserCog, Calendar, FileText } from "lucide-react";
import { useLocation, Link } from "wouter";

export function AppSidebar() {
  const [location] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userData = user?.user || user;
  const isAdmin = userData?.role === "admin";

  const items = isAdmin 
    ? [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
        { title: "Exams", url: "/admin/exams", icon: BookOpen },
        { title: "Teachers", icon: UserCog, url: "/admin/teachers" },
        { title: "Sessions", icon: Calendar, url: "/admin/sessions" },
        { title: "Detailed Assessment", icon: FileText, url: "/admin/detailed-assessment" },
      ]
    : [{ title: "Teacher Tasks", url: "/teacher", icon: LayoutDashboard }];

  return (
    <aside className="w-64 border-r bg-white h-screen flex flex-col sticky top-0 z-50">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 tracking-tight">CD-IELTS Admin</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <Link key={item.url} href={item.url}>
            <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location === item.url 
                ? "bg-blue-50 text-blue-600 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}>
              <item.icon size={20} />
              <span className="font-semibold text-sm">{item.title}</span>
            </a>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button 
          onClick={() => { localStorage.clear(); window.location.href = "/"; }}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-semibold text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}