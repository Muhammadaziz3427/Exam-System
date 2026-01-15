import { useState } from "react";
import { useAdminLogin, useStudentLogin } from "@/hooks/use-auth";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Label } from "@/components/ui-kit";
import { GraduationCap, ShieldCheck, Loader2 } from "lucide-react";

function AuthTabs() {
  const [activeTab, setActiveTab] = useState<"student" | "admin">("student");

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="flex bg-muted p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("student")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "student" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Student Login
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "admin" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Admin Portal
        </button>
      </div>

      {activeTab === "student" ? <StudentLoginForm /> : <AdminLoginForm />}
    </div>
  );
}

function StudentLoginForm() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const login = useStudentLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ accessCode: code, password }, {
      onSuccess: (data: any) => {
        // Talaba sessiyasini saqlash
        localStorage.setItem("student_session", JSON.stringify(data.session || data));
        // Talabani imtihon sahifasiga yuborish
        const id = data.session?.id || data.id;
        window.location.href = `/exam/${id}`;
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-primary shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
          <GraduationCap size={24} />
        </div>
        <CardTitle>Start Your Exam</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Enter the one-time access code provided by your invigilator.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Access Code</Label>
            <Input 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="e.g. EXAM-2024-X92"
              className="font-mono uppercase placeholder:normal-case"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>

          {login.error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
              {(login.error as any).message || "Login failed"}
            </div>
          )}

          <Button className="w-full text-lg h-12" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Enter Exam Environment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAdminLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password }, {
      onSuccess: (data: any) => {
        // Admin ma'lumotlarini saqlash
        localStorage.setItem("user", JSON.stringify(data.user || data));
        // Adminni Dashboardga yo'naltirish
        window.location.href = "/admin";
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-slate-800 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-800">
          <ShieldCheck size={24} />
        </div>
        <CardTitle>Administrative Access</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Secure login for teachers and administrators.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
              placeholder="admin"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              placeholder="••••••••"
            />
          </div>

          {login.error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
              {(login.error as any).message || "Invalid credentials"}
            </div>
          )}

          <Button className="w-full bg-slate-900 hover:bg-slate-800 h-12" disabled={login.isPending}>
             {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Access Dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          CD-IELTS <span className="text-primary">Mock Platform</span>
        </h1>
        <p className="text-slate-600">Secure, reliable testing environment.</p>
      </div>

      <AuthTabs />

      <div className="mt-12 text-center text-xs text-muted-foreground">
        &copy; 2026 Educational Testing Services. All rights reserved. <br/>
        System optimized for Chrome & Firefox.
      </div>
    </div>
  );
}