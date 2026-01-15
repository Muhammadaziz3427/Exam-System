import { Switch, Route, Redirect } from "wouter";
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

// ProtectedRoute komponenti
function ProtectedRoute({ component: Component, allowedRoles, type }: any) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const session = JSON.parse(localStorage.getItem("student_session") || "null");

  if (type === "admin") {
    if (!user) return <Redirect to="/" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Redirect to="/" />;
    return <Component />;
  }

  if (type === "exam") {
    if (!session) return <Redirect to="/" />;
    return <Component />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />

      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} type="admin" />
      </Route>

      <Route path="/admin/exams">
        <ProtectedRoute component={AdminExams} allowedRoles={["admin"]} type="admin" />
      </Route>

      <Route path="/admin/sessions">
        <ProtectedRoute component={AdminSessions} allowedRoles={["admin", "teacher"]} type="admin" />
      </Route>

      <Route path="/exam/:id">
        <ProtectedRoute component={StudentExam} type="exam" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}