import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";

// Pages
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminSessions from "@/pages/admin-sessions";
import StudentExam from "@/pages/student-exam";

function ProtectedRoute({ component: Component, allowedRoles, ...rest }: any) {
  // Simple session check for mock
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const session = JSON.parse(localStorage.getItem("student_session") || "null");

  if (rest.path.startsWith("/admin") || rest.path.startsWith("/teacher")) {
    if (!user) return <Redirect to="/" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Redirect to="/" />;
    return <Component {...rest} />;
  }

  if (rest.path.startsWith("/exam")) {
    if (!session) return <Redirect to="/" />;
    return <Component {...rest} />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} path="/admin" />
      </Route>
      <Route path="/admin/exams">
        <ProtectedRoute component={AdminExams} allowedRoles={["admin"]} path="/admin/exams" />
      </Route>
      <Route path="/admin/sessions">
        <ProtectedRoute component={AdminSessions} allowedRoles={["admin", "teacher"]} path="/admin/sessions" />
      </Route>
      
      {/* Student Routes */}
      <Route path="/exam/:id">
        {(params) => <ProtectedRoute component={StudentExam} path={`/exam/${params.id}`} />}
      </Route>
      
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
