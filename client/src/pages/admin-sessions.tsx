import react from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit"; 
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import * as lucideReact from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as tabs from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// --- TYPES (Kod barqarorligi uchun) ---
interface Session {
  id: number;
  studentName: string;
  accessCode: string;
  password: string;
  status: 'active' | 'in_progress' | 'completed' | 'pending_grading' | 'graded';
  resultsReleased: boolean;
  isCameraActive: boolean;
  currentSection?: string;
  overallBand?: string | number;
  grading?: {
    autoGraded?: { [key: string]: { score: number } };
    writing?: { score: string | number };
    speaking?: { score: string | number };
  };
  writingScore?: string;
  speakingScore?: string;
  createdAt: string;
}

interface Violation {
  id: number;
  sessionId: number;
  type: string;
  timestamp: string;
}

// --- HELPER FUNCTIONS ---
const calculateBandScore = (session: Session, skill: 'listening' | 'reading' | 'writing' | 'speaking'): string => {
  const g = session.grading;
  if (!g) return "0.0";

  if (skill === 'listening' || skill === 'reading') {
    const rawScore = g.autoGraded?.[skill]?.score;
    return rawScore !== undefined 
      ? (Math.min(9, Math.max(0, (rawScore / 40) * 9))).toFixed(1) 
      : "0.0";
  }

  if (skill === 'writing') return String(session.writingScore || g.writing?.score || "0.0");
  if (skill === 'speaking') return String(session.speakingScore || g.speaking?.score || "0.0");

  return "0.0";
};

export default function AdminSessions() {
  const { toast } = useToast();
  const createSession = useCreateSession();

  // State Management
  const [selectedSubmission, setSelectedSubmission] = react.useState<Session | null>(null);
  const [isReleasing, setIsReleasing] = react.useState(false);
  const [activeTab, setActiveTab] = react.useState("waiting");
  const [isTvMode, setIsTvMode] = react.useState(false);
  const [studentName, setStudentName] = react.useState("");
  const [selectedExamId, setSelectedExamId] = react.useState("");
  const [searchQuery, setSearchQuery] = react.useState("");
  const [autoRefresh, setAutoRefresh] = react.useState(true);
  const [newSessionInfo, setNewSessionInfo] = react.useState<{code: string, pass: string, name: string} | null>(null);

  // Data Fetching
  const { data: rawSessions, isLoading, refetch } = useSessions();
  const sessions = (rawSessions as Session[]) || [];
  const { data: exams } = useExams();

  const { data: allViolations } = useQuery({
    queryKey: ['/api/violations'],
    queryFn: async () => {
      const res = await fetch('/api/violations');
      return res.json();
    },
    refetchInterval: autoRefresh ? 5000 : false, // Avto-yangilanishni boshqarish
    enabled: autoRefresh
  });

  // Derived State (Memoized)
  const activeSessions = react.useMemo(() => {
    return sessions.filter(s => s.status === "in_progress" || s.status === "active");
  }, [sessions]);

  const filteredSessions = react.useMemo(() => {
    let result = sessions;

    // Tab Filter
    if (activeTab === "waiting") result = result.filter(s => s.status === "pending_grading");
    else if (activeTab === "marking") result = result.filter(s => s.status === "in_progress" || s.status === "active");
    else if (activeTab === "graded") result = result.filter(s => s.status === "graded" && !s.resultsReleased);
    else if (activeTab === "released") result = result.filter(s => s.resultsReleased);

    // Search Filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.studentName.toLowerCase().includes(lowerQ) || 
        s.accessCode.toLowerCase().includes(lowerQ)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, activeTab, searchQuery]);

  // Effects
  react.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTvMode) setIsTvMode(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isTvMode]);

  // Handlers
  const handleDeleteSession = async (id: number) => {
    if (!confirm("DIQQAT: Ushbu sessiyani va unga tegishli barcha javoblarni o'chirib tashlamoqchimisiz?")) return;
    try {
      await apiRequest("DELETE", `/api/sessions/${id}`);
      toast({ title: "Muvaffaqiyatli o'chirildi", className: "bg-red-500 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      refetch();
    } catch (err) {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    }
  };

  const handleCopyAccess = (code: string, pass: string) => {
    navigator.clipboard.writeText(`Test ID: ${code}\nParol: ${pass}`);
    toast({ title: "Login ma'lumotlari nusxalandi" });
  };

  const handleTerminate = async (id: number) => {
    if (!confirm("Sessiyani majburiy yakunlamoqchimisiz?")) return;
    try {
      await apiRequest("POST", `/api/sessions/${id}/terminate`, {});
      toast({ title: "Sessiya yakunlandi", className: "bg-orange-500 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      refetch();
    } catch (err) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const handleRelease = async (sessionId: number) => {
    setIsReleasing(true);
    try {
      await apiRequest("POST", `/api/sessions/${sessionId}/release`, {});
      toast({ title: "Natija talabaga yuborildi", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSubmission(null);
      refetch();
    } catch (error) {
      toast({ title: "Xatolik", variant: "destructive" });
    } finally {
      setIsReleasing(false);
    }
  };

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    const randomCode = `IELTS-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomPass = Math.random().toString(36).slice(-6).toUpperCase();

    try {
      await createSession.mutateAsync({
        studentName,
        firstName: studentName.split(' ')[0] || "",
        lastName: studentName.split(' ').slice(1).join(' ') || "",
        email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@exam.com`,
        examId: parseInt(selectedExamId),
        accessCode: randomCode,
        password: randomPass
      });

      setNewSessionInfo({ code: randomCode, pass: randomPass, name: studentName });
      setStudentName("");
      toast({ title: "Yangi sessiya yaratildi" });
    } catch (err) {
      toast({ title: "Yaratishda xatolik" });
    }
  };

  // --- TV MODE VIEW ---
  if (isTvMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] p-6 flex flex-col overflow-hidden animate-in fade-in duration-500">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
                <lucideReact.Monitor className="text-blue-500" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Live Monitoring Wall</h1>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Real-Time Data Stream</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-6 py-2 rounded-full border border-slate-800 flex items-center gap-3 shadow-2xl">
               <lucideReact.Users size={16} className="text-slate-400"/>
               <span className="text-white text-sm font-black uppercase tracking-widest">{activeSessions.length} Active</span>
            </div>
            <uiKit.Button variant="outline" size="sm" onClick={() => setIsTvMode(false)} className="bg-red-600 border-none text-white hover:bg-red-700 rounded-full px-6 font-bold">
              EXIT (ESC)
            </uiKit.Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {activeSessions.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-[60vh] text-slate-800">
              <lucideReact.MonitorOff size={80} strokeWidth={1} className="mb-6 opacity-20" />
              <p className="text-2xl font-black uppercase tracking-widest opacity-30">No Active Sessions</p>
            </div>
          ) : (
            activeSessions.map((session) => (
              <div key={session.id} className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl group hover:scale-[1.02] transition-all duration-300">
                 {/* Mock Video Feed */}
                 <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                    {session.isCameraActive ? (
                      <lucideReact.Video size={48} className="text-emerald-500/20 animate-pulse" />
                    ) : (
                      <lucideReact.VideoOff size={48} className="text-red-500/20" />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                       <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase text-white backdrop-blur-md ${session.isCameraActive ? 'bg-emerald-600/80' : 'bg-red-600/80'}`}>
                           {session.isCameraActive ? 'LIVE' : 'OFFLINE'}
                       </span>
                    </div>
                 </div>

                 {/* Student Info Overlay */}
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-white font-black text-sm uppercase tracking-tight truncate max-w-[150px]">{session.studentName}</p>
                          <p className="text-blue-400 font-mono text-[10px] font-bold tracking-widest mt-0.5">{session.accessCode}</p>
                       </div>
                       <uiKit.Badge variant="outline" className="text-[9px] h-6 px-2 border-white/20 text-white font-mono bg-white/10 backdrop-blur-sm">
                          {session.currentSection || 'READY'}
                       </uiKit.Badge>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN PANEL VIEW ---
  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               <lucideReact.Activity className="text-blue-600" /> 
               Exam Control Center
            </h1>
            <p className="text-slate-500 font-medium mt-2">Real-time monitoring, session management, and result processing.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <uiKit.Button onClick={() => setIsTvMode(true)} className="bg-slate-900 text-white hover:bg-blue-600 border-none shadow-xl rounded-xl px-6">
              <lucideReact.Tv size={18} className="mr-2"/> TV WALL MODE
            </uiKit.Button>
            <Link href="/admin">
              <uiKit.Button variant="outline" className="rounded-xl border-slate-200"><lucideReact.ArrowLeft size={18} className="mr-2"/> Back</uiKit.Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Main Controls & List */}
          <div className="xl:col-span-8 space-y-8">

            {/* GENERATE CARD */}
            <uiKit.Card className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
              <uiKit.CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <lucideReact.UserPlus size={20} className="text-blue-600" />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-900">Create Session</h3>
                      <p className="text-xs text-slate-400">Generate access credentials for new candidates</p>
                  </div>
                </div>

                <form onSubmit={onGenerate} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-1">
                    <uiKit.Input 
                      value={studentName} 
                      onChange={(e) => setStudentName(e.target.value)} 
                      required 
                      placeholder="Candidate Full Name"
                      className="bg-slate-50 border-transparent h-12 rounded-xl focus:bg-white transition-all font-bold"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <select 
                      className="w-full h-12 px-4 rounded-xl border-none bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer" 
                      value={selectedExamId} 
                      onChange={(e) => setSelectedExamId(e.target.value)} 
                      required
                    >
                      <option value="">Select Exam Paper...</option>
                      {exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title} ({e.timeLimit}m)</option>)}
                    </select>
                  </div>
                  <uiKit.Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-blue-200" disabled={createSession.isPending}>
                    {createSession.isPending ? <lucideReact.Loader2 className="animate-spin" /> : "GENERATE ID"}
                  </uiKit.Button>
                </form>

                {/* NEW SESSION ALERT */}
                {newSessionInfo && (
                  <div className="mt-6 p-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl animate-in zoom-in-95 duration-300 shadow-xl">
                    <div className="bg-slate-900 roundedxl p-5 rounded-[0.9rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><lucideReact.Ticket size={100} className="text-white"/></div>
                        <div className="flex justify-between items-start relative z-10 mb-4">
                            <div>
                                <h4 className="text-white font-black text-lg">{newSessionInfo.name}</h4>
                                <p className="text-blue-200 text-xs uppercase tracking-widest">Ready for Exam</p>
                            </div>
                            <button onClick={() => setNewSessionInfo(null)} className="text-slate-500 hover:text-white transition-colors"><lucideReact.X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                               <p className="text-[9px] text-blue-200 uppercase font-black">Access ID</p>
                               <p className="text-white font-mono text-xl font-bold tracking-widest">{newSessionInfo.code}</p>
                           </div>
                           <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                               <p className="text-[9px] text-blue-200 uppercase font-black">Passcode</p>
                               <p className="text-white font-mono text-xl font-bold tracking-widest">{newSessionInfo.pass}</p>
                           </div>
                        </div>
                        <uiKit.Button 
                          onClick={() => handleCopyAccess(newSessionInfo.code, newSessionInfo.pass)}
                          className="w-full mt-4 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl h-12"
                        >
                          <lucideReact.Copy size={16} className="mr-2"/> COPY CREDENTIALS
                        </uiKit.Button>
                    </div>
                  </div>
                )}
              </uiKit.CardContent>
            </uiKit.Card>

            {/* SESSIONS LIST */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <lucideReact.List size={16}/> Session Manager
                </h3>

                {/* Search & Refresh Controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative group flex-1 sm:flex-none">
                        <lucideReact.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Search student..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 h-10 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 w-full sm:w-64"
                        />
                    </div>
                    <button 
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${autoRefresh ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                        title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                    >
                        <lucideReact.RefreshCw size={18} className={autoRefresh ? "animate-spin" : ""} style={{animationDuration: '3s'}}/>
                    </button>
                </div>
              </div>

              <tabs.Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <tabs.TabsList className="flex w-full bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm mb-6 overflow-x-auto">
                  {['waiting', 'marking', 'graded', 'released'].map(tab => (
                      <tabs.TabsTrigger 
                        key={tab} 
                        value={tab} 
                        className="flex-1 rounded-xl text-xs font-bold uppercase tracking-wide py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                      >
                        {tab.replace('_', ' ')}
                      </tabs.TabsTrigger>
                  ))}
                </tabs.TabsList>

                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <lucideReact.Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                        <p className="text-slate-400 text-sm font-bold">Loading Sessions...</p>
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-slate-200">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <lucideReact.Inbox size={24} className="text-slate-300"/>
                      </div>
                      <p className="text-slate-900 font-bold">No sessions found</p>
                      <p className="text-slate-400 text-xs mt-1">Try changing the filter or create a new session</p>
                    </div>
                  ) : (
                    filteredSessions.map((session) => (
                      <div key={session.id} className="group p-5 rounded-3xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-5 w-full sm:w-auto">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                            session.status === 'completed' || session.status === 'graded' ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white'
                          }`}>
                            {session.studentName?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-lg">{session.studentName}</span>
                              {(session.status === 'in_progress' || session.status === 'active') && (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <code className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-mono font-bold border border-slate-200">{session.accessCode}</code>
                              <span onClick={() => handleCopyAccess(session.accessCode, session.password)} className="text-slate-300 hover:text-blue-500 transition-colors cursor-pointer" title="Copy">
                                 <lucideReact.Copy size={14} />
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(session.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <uiKit.Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(session)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl h-10 w-10 p-0">
                            <lucideReact.Eye size={20} />
                          </uiKit.Button>

                          {(session.status === 'in_progress' || session.status === 'active') && (
                            <uiKit.Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl h-10 w-10 p-0" onClick={() => handleTerminate(session.id)} title="Force Finish">
                              <lucideReact.PowerOff size={20} />
                            </uiKit.Button>
                          )}

                          <uiKit.Button variant="ghost" size="sm" className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 w-10 p-0" onClick={() => handleDeleteSession(session.id)} title="Delete">
                            <lucideReact.Trash2 size={20} />
                          </uiKit.Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </tabs.Tabs>
            </div>

            <footer className="py-8 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase opacity-50 hover:opacity-100 transition-opacity">
                Exam System v2.0 • Yursinaliyev Muhammadaziz
              </p>
            </footer>
          </div>

          {/* RIGHT COLUMN: Violations */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl sticky top-6 max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                <h3 className="text-red-600 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <lucideReact.AlertTriangle size={16} /> Security Alerts
                </h3>
                <uiKit.Badge variant="outline" className="text-[10px] bg-red-50 border-red-100 text-red-600 font-bold px-2 py-1">{allViolations?.length || 0}</uiKit.Badge>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {allViolations?.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                        <lucideReact.ShieldCheck size={32} className="text-emerald-500" />
                    </div>
                    <p className="text-slate-800 font-bold text-sm">All Clear</p>
                    <p className="text-[11px] text-slate-400 mt-1">No violations detected currently.</p>
                  </div>
                ) : (
                  allViolations?.map((v: Violation) => {
                    const student = sessions?.find(s => s.id === v.sessionId);
                    return (
                      <div key={v.id} className="p-4 bg-red-50/50 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                            {student?.studentName || "Unknown ID"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-red-100">
                             {new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-red-600">
                            <lucideReact.AlertCircle size={12} />
                            <p className="text-[10px] font-bold uppercase tracking-wide">{v.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RESULT / GRADING MODAL */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent aria-describedby="result-desc" className="max-w-2xl bg-white p-0 rounded-[2.5rem] overflow-hidden shadow-2xl border-none outline-none">
          {selectedSubmission && (
            <>
                <div className="bg-slate-900 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><lucideReact.Award size={120} className="text-white"/></div>
                    <DialogTitle className="text-xl font-black text-white relative z-10 flex flex-col gap-2">
                        <span className="text-blue-400 text-xs uppercase tracking-widest">Candidate Result</span>
                        <span>{selectedSubmission.studentName}</span>
                    </DialogTitle>
                    <p id="result-desc" className="text-slate-400 text-xs mt-2 relative z-10 font-medium">Review breakdown and release official scores.</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['listening', 'reading', 'writing', 'speaking'] as const).map((skill) => (
                            <div key={skill} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl text-center group hover:bg-white hover:shadow-lg transition-all">
                                <p className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-widest">{skill}</p>
                                <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {calculateBandScore(selectedSubmission, skill)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-center text-white shadow-xl shadow-blue-200">
                        <p className="text-[10px] uppercase font-black text-blue-200 mb-1 tracking-[0.2em]">Overall Band Score</p>
                        <p className="text-5xl font-black tracking-tighter">{selectedSubmission.overallBand || "0.0"}</p>
                    </div>

                    <div className="pt-2">
                        {!selectedSubmission.resultsReleased ? (
                            <uiKit.Button 
                                onClick={() => handleRelease(selectedSubmission.id)} 
                                disabled={isReleasing} 
                                className="w-full bg-slate-900 hover:bg-black h-16 text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3"
                            >
                                {isReleasing ? <lucideReact.Loader2 className="animate-spin" /> : <lucideReact.Send className="text-blue-400" size={20} />}
                                PUBLISH & EMAIL RESULTS
                            </uiKit.Button>
                        ) : (
                            <div className="w-full h-16 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-xs font-black uppercase tracking-widest gap-3">
                                <div className="p-1 bg-emerald-200 rounded-full"><lucideReact.Check size={14} className="text-emerald-700"/></div>
                                Results Officially Released
                            </div>
                        )}
                    </div>
                </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}