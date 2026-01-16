import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Users, LogOut, UserCog } from "lucide-react";
import { useLocation } from "wouter";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userData = user?.user || user;

  const isAdmin = userData?.role === "admin";

  const items = [
    ...(isAdmin ? [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Exams", url: "/admin/exams", icon: BookOpen },
      { title: "Teachers", url: "/admin/teachers", icon: UserCog },
      { title: "Sessions", url: "/admin/sessions", icon: Users },
    ] : [
      { title: "Teacher Tasks", url: "/teacher", icon: LayoutDashboard },
    ]),
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("student_session");
    window.location.href = "/";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
