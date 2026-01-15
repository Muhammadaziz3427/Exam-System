import { useState } from "react";
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
          CD-IELTS <span className="text-primary">Mock Platform</span>
        </h1>
        <p className="text-slate-500">Computer-delivered IELTS Practice System</p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Tab Switcher */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl backdrop-blur-sm border border-slate-300/50">
          <button 
            onClick={() => setActiveTab("student")} 
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "student" ? "bg-white text-primary shadow-md" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Student Login
          </button>
          <button 
            onClick={() => setActiveTab("admin")} 
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "admin" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admin Portal
          </button>
        </div>

        {activeTab === "student" ? <StudentLoginForm /> : <AdminLoginForm />}
      </div>
    </div>
  );
}

function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAdminLogin();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password }, {
      onSuccess: (data: any) => {
        // 1. Ma'lumotni tozalab saqlash
        const userData = data.user || data;
        localStorage.setItem("user", JSON.stringify(userData));

        // 2. Keshni majburan yangilash
        queryClient.setQueryData(["/api/user"], userData);

        // 3. Admin panelga yo'naltirish
        window.location.replace("/admin");
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-slate-900 shadow-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 bg-slate-50/50">
        <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-white shadow-lg">
          <ShieldCheck size={24} />
        </div>
        <CardTitle className="text-xl">Administrative Access</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-u">Username</Label>
            <Input 
              id="admin-u" 
              placeholder="Admin username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className="focus:ring-slate-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-p">Password</Label>
            <Input 
              id="admin-p" 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-2" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Access Dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
        // Student sessiyasini saqlash
        const sessionData = data.session || data;
        localStorage.setItem("student_session", JSON.stringify(sessionData));

        // Imtihon identifikatorini olish
        const id = sessionData.id;
        window.location.href = `/exam/${id}`;
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-primary shadow-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 bg-blue-50/30">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary shadow-sm">
          <GraduationCap size={24} />
        </div>
        <CardTitle className="text-xl text-slate-900">Start Your Exam</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-code">Access Code</Label>
            <Input 
              id="st-code" 
              placeholder="TEST-0000"
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              required 
              className="uppercase font-mono tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-pass">Exam Password</Label>
            <Input 
              id="st-pass" 
              type="password" 
              placeholder="Provided by invigilator"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button className="w-full shadow-lg shadow-primary/20 mt-2" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Enter Exam Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}