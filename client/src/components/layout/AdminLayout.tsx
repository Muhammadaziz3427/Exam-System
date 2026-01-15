import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Users, LogOut } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui-kit";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/exams", label: "Manage Exams", icon: FileText },
    { href: "/admin/sessions", label: "Live Monitoring", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Portal</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive ? "bg-primary text-white" : "hover:bg-slate-800 hover:text-white"}
              `}>
                  <item.icon size={18} />
                  <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-2"
            onClick={() => logout.mutate()}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
