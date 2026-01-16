import { useState } from "react";
// useAdminLogin va useStudentLogin hooklarini ishlatish xatoni yo'qotadi
import { useAdminLogin, useStudentLogin } from "@/hooks/use-auth";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Label } from "@/components/ui-kit";
import { GraduationCap, ShieldCheck, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"student" | "admin">("student");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          CD-IELTS <span className="text-blue-600">Mock Platform</span>
        </h1>
        <p className="text-slate-500 font-medium">Computer-delivered IELTS Practice System</p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Tab Switcher */}
        <div className="flex bg-white/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200 shadow-sm">
          <button 
            type="button"
            onClick={() => setActiveTab("student")} 
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === "student" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Student Login
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("admin")} 
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === "admin" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Admin Portal
          </button>
        </div>

        {/* Komponentlarni chaqirish */}
        {activeTab === "student" ? <StudentLoginForm /> : <AdminLoginForm />}
      </div>
    </div>
  );
}

// ADMIN LOGIN KOMPONENTI
function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAdminLogin();
  const queryClient = useQueryClient(); // useQueryClient ishlatildi

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password }, {
      onSuccess: (userData: any) => {
        localStorage.setItem("user", JSON.stringify(userData));
        queryClient.setQueryData(["/api/user"], userData);
        window.location.replace(userData.role === "admin" ? "/admin" : "/teacher");
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-slate-900 shadow-2xl animate-in fade-in zoom-in duration-300">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-2 text-white shadow-lg">
          <ShieldCheck size={24} />
        </div>
        <CardTitle className="text-xl">Administrative Access</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-u">Username</Label>
            <Input id="admin-u" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-p">Password</Label>
            <Input id="admin-p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Access Dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// STUDENT LOGIN KOMPONENTI
function StudentLoginForm() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const login = useStudentLogin();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ accessCode: code, password }, {
      onSuccess: (data: any) => {
        const session = data.session || data;
        localStorage.setItem("student_session", JSON.stringify(session));
        window.location.href = `/exam/${session.id}`;
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-blue-600 shadow-2xl animate-in fade-in zoom-in duration-300">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-2 text-blue-600 shadow-sm">
          <GraduationCap size={24} />
        </div>
        <CardTitle className="text-xl">Start Your Exam</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-code">Access Code</Label>
            <Input id="st-code" placeholder="TEST-0000" className="uppercase font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-pass">Exam Password</Label>
            <Input id="st-pass" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Enter Exam Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}