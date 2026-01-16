import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Users, LogOut, Loader2, UserCog } from "lucide-react";
import { useLogout, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white sticky top-0 z-50">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">
              {location.includes("exams") ? "Exams" : 
               location.includes("sessions") ? "Live Monitoring" : 
               location.includes("teachers") ? "Manage Teachers" : "Dashboard"}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 font-medium hidden md:inline-block">
                {user.username} ({user.role})
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm("Tizimdan chiqmoqchimisiz?")) {
                    logout.mutate();
                  }
                }}
                disabled={logout.isPending}
              >
                {logout.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}