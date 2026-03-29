import { useState, useEffect } from "react";
import { useAdminLogin, useStudentLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap, ShieldCheck, Loader2, Trophy, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"student" | "admin" | "teacher">("student");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("student_session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        console.error("Session parse error", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          CD-IELTS <span className="text-blue-600">Mock Platform</span>
        </h1>
        <p className="text-slate-500 font-medium">Computer-delivered IELTS Practice System</p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        {session && activeTab === "student" ? (
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in duration-500">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Trophy className="size-6 text-yellow-300" />
                Your Test Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 transition-opacity rounded-full"></div>
                  <div className="relative w-32 h-32 rounded-full border-8 border-blue-50 flex items-center justify-center bg-white shadow-inner">
                    <div className="text-center">
                      <p className="text-4xl font-black text-blue-600 leading-none">{session.overallBand || "0.0"}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Overall</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900">{session.studentName}</h3>
                  <p className="text-sm text-slate-500 font-medium">Session ID: {session.accessCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Listening", score: session.listeningScore, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Reading", score: session.readingScore, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Writing", score: session.writingScore, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Speaking", score: session.speakingScore, color: "text-orange-600", bg: "bg-orange-50" }
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center border border-white shadow-sm`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.score || "0.0"}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Link href={`/student/detailed-results/${session.id}`}>
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl">
                    <FileText className="mr-2 h-5 w-5" />
                    View Performance Breakdown
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="text-slate-400 hover:text-slate-600 text-xs"
                  onClick={() => {
                    localStorage.removeItem("student_session");
                    setSession(null);
                  }}
                >
                  Log out and try another code
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-white/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200 shadow-sm">
              <button 
                type="button"
                onClick={() => setActiveTab("student")} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  activeTab === "student" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Student Login
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("admin")} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  activeTab === "admin" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Admin Portal
              </button>
            </div>

            {activeTab === "student" ? <StudentLoginForm /> : <AdminLoginForm />}
          </div>
        )}
      </div>

      <footer className="mt-auto py-8 text-center space-y-1">
        <p className="text-slate-400 text-xs font-medium">
          Created & Developed by <span className="text-slate-600 font-bold">Yursinaliyev Muhammadaziz</span>
        </p>
        <p className="text-slate-400 text-[10px] tracking-wider uppercase">
          Email: yursinaliyevm@gmail.com
        </p>
      </footer>
    </div>
  );
}

function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAdminLogin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username: username.trim(), password: password.trim() }, {
      onSuccess: (userData: any) => {
        queryClient.setQueryData(["/api/user"], userData);
        if (userData.role === "admin") {
          setLocation("/admin");
        } else {
          setLocation("/teacher");
        }
      },
      onError: (error: any) => {
        toast({
          title: "Admin Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-slate-900 shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-2 text-white">
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

function StudentLoginForm() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const login = useStudentLogin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trim va UpperCase kiritish xatolarini (bo'sh joy, kichik harf) oldini oladi
    login.mutate({ accessCode: code.trim().toUpperCase(), password: password.trim() }, {
      onSuccess: (data: any) => {
        const session = data.session || data;
        localStorage.setItem("student_session", JSON.stringify(session));
        toast({ title: "Muvaffaqiyatli", description: "Imtihon xonasiga kirilmoqda..." });
        setLocation(`/exam/${session.id}`);
      },
      onError: (error: any) => {
        toast({
          title: "Kirishda xatolik",
          description: error.message || "Access Code yoki Parol noto'g'ri. Iltimos, qayta tekshiring.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Card className="border-t-4 border-t-blue-600 shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-2 text-blue-600">
          <GraduationCap size={24} />
        </div>
        <CardTitle className="text-xl">Start Your Exam</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-code">Access Code</Label>
            <Input 
              id="st-code" 
              placeholder="TEST-0000" 
              className="uppercase font-mono" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-pass">Exam Password</Label>
            <Input 
              id="st-pass" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin mr-2" /> : "Enter Exam Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}