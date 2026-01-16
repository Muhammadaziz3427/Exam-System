import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"; 
import { TooltipProvider } from "@/components/ui/tooltip";

// Sahifalar - Importlarni tekshiring
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminTeachers from "@/pages/admin-teachers";
import AdminSessions from "@/pages/admin-sessions";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentExam from "@/pages/student-exam";
import AdminExamEditor from "@/pages/admin-exam-editor"; // <-- BU IMPORT SHART
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />

      {/* Admin yo'nalishlari */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/exams" component={AdminExams} />
      <Route path="/admin/exams/:id" component={AdminExamEditor} />
      <Route path="/admin/teachers" component={AdminTeachers} />
      <Route path="/admin/sessions" component={AdminSessions} />

      {/* Teacher yo'nalishlari */}
      <Route path="/teacher" component={TeacherDashboard} />

      {/* Student yo'nalishlari */}
      <Route path="/exam/:id" component={StudentExam} />

      {/* 404 sahifasi */}
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