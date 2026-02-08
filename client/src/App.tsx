import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"; 
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminTeachers from "@/pages/admin-teachers";
import AdminSessions from "@/pages/admin-sessions";
import AdminDetailedAssessment from "@/pages/admin-detailed-assessment";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentExam from "@/pages/student-exam";
import AdminExamEditor from "@/pages/admin-exam-editor"; 
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />

      <Route path="/admin">
        <SidebarProvider><AdminDashboard /></SidebarProvider>
      </Route>
      <Route path="/admin/exams">
        <SidebarProvider><AdminExams /></SidebarProvider>
      </Route>
      <Route path="/admin/exams/:id">
        <SidebarProvider><AdminExamEditor /></SidebarProvider>
      </Route>
      <Route path="/admin/teachers">
        <SidebarProvider><AdminTeachers /></SidebarProvider>
      </Route>
      <Route path="/admin/sessions">
        <SidebarProvider><AdminSessions /></SidebarProvider>
      </Route>
      <Route path="/admin/detailed-assessment">
        <SidebarProvider><AdminDetailedAssessment /></SidebarProvider>
      </Route>

      <Route path="/teacher">
        <SidebarProvider><TeacherDashboard /></SidebarProvider>
      </Route>

      <Route path="/exam/:id" component={StudentExam} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen w-full bg-background">
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}