import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminSessions from "@/pages/admin-sessions";
import StudentExam from "@/pages/student-exam";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/exams" component={AdminExams} />
      <Route path="/admin/sessions" component={AdminSessions} />
      
      {/* Student Routes */}
      <Route path="/exam/:id" component={StudentExam} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
