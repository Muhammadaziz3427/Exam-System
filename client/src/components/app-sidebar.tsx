import { LayoutDashboard, BookOpen, Users, LogOut, UserCog, Calendar, FileText, Settings, ShieldCheck } from "lucide-react";
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
  SidebarMenuButton,
  SidebarSeparator
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userData = user?.user || user;
  const isAdmin = userData?.role === "admin";

  const items = isAdmin 
    ? [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
        { title: "Exam Library", url: "/admin/exams", icon: BookOpen },
        { title: "Instructors", icon: UserCog, url: "/admin/teachers" },
        { title: "Test Sessions", icon: Calendar, url: "/admin/sessions" },
        { title: "Performance Reports", icon: FileText, url: "/admin/detailed-assessment" },
      ]
    : [{ title: "Assessment Center", url: "/teacher", icon: LayoutDashboard }];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck size={20} />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold">IELTS Platform</span>
            <span className="truncate text-xs text-muted-foreground">{isAdmin ? "Administrator" : "Instructor"}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="hover-elevate"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" className="hover-elevate">
                  <Settings className="size-4" />
                  <span>Configuration</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => { localStorage.clear(); window.location.href = "/"; }}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}