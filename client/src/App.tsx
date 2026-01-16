import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Sahifalar
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminSessions from "@/pages/admin-sessions";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentExam from "@/pages/student-exam";
import NotFound from "@/pages/not-found";

// Himoyalangan yo'nalishlar (Rolga asoslangan)
function ProtectedRoute({ component: Component, type }: { component: React.ComponentType, type: "admin" | "exam" }) {
  const storedUser = localStorage.getItem("user");
  const session = JSON.parse(localStorage.getItem("student_session") || "null");

  if (type === "admin") {
    if (!storedUser) return <Redirect to="/" />;

    const user = JSON.parse(storedUser);
    // Role tekshiruvi: serverdan kelgan formatga moslash
    const userData = user.user ? user.user : user;

    if (userData.role !== "admin" && userData.role !== "teacher") {
      return <Redirect to="/" />;
    }
  }

  if (type === "exam") {
    if (!session) return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />

      {/* Admin yo'llari eng tepada bo'lishi kerak */}
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} type="admin" />}
      </Route>
      <Route path="/admin/exams">
        {() => <ProtectedRoute component={AdminExams} type="admin" />}
      </Route>
      <Route path="/admin/sessions">
        {() => <ProtectedRoute component={AdminSessions} type="admin" />}
      </Route>

      <Route path="/teacher">
        {() => <ProtectedRoute component={TeacherDashboard} type="admin" />}
      </Route>

      <Route path="/exam/:id">
        {() => <ProtectedRoute component={StudentExam} type="exam" />}
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