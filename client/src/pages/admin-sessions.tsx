import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit"; 
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { 
  Loader2, RefreshCw, UserPlus, AlertCircle, Eye, 
  Copy, PowerOff, CheckCircle, ArrowLeft, Mail, ShieldCheck,
  Trash2, Monitor, Tv, VideoOff, Video, Key, User
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminSessions() {
  const { data: sessions, isLoading, refetch } = useSessions();
  const { data: exams } = useExams();
  const createSession = useCreateSession();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [activeTab, setActiveTab] = useState("waiting");
  const [isTvMode, setIsTvMode] = useState(false);
  const { toast } = useToast();
  const [studentName, setStudentName] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  // YANGI: Yaratilgan sessiya ma'lumotlarini ko'rsatish uchun state
  const [newSessionInfo, setNewSessionInfo] = useState<{code: string, pass: string, name: string} | null>(null);

  const { data: allViolations } = useQuery({
    queryKey: ['/api/violations'],
    queryFn: async () => {
      const res = await fetch('/api/violations');
      return res.json();
    },
    refetchInterval: 5000 
  });

  const activeSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s: any) => s.status === "in_progress");
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s: any) => {
      if (activeTab === "waiting") return s.status === "pending_grading";
      if (activeTab === "marking") return s.status === "in_progress";
      if (activeTab === "graded") return s.status === "graded" && !s.resultsReleased;
      if (activeTab === "released") return s.resultsReleased;
      return true;
    });
  }, [sessions, activeTab]);

  if (isTvMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] p-4 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-3">
            <Monitor className="text-blue-500" size={32} />
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Live Monitoring Wall</h1>
              <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Real-Time Exam Supervision</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-white text-xs font-black uppercase tracking-widest">Live: {activeSessions.length}</span>
            </div>
            <uiKit.Button variant="outline" size="sm" onClick={() => setIsTvMode(false)} className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-full">
              Exit TV Mode
            </uiKit.Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {activeSessions.length === 0 ? (
            <div className="col-span-full flex items-center justify-center">
              <div className="text-center text-slate-700">
                <Monitor size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-xl font-bold uppercase tracking-widest opacity-30">No Active Sessions</p>
              </div>
            </div>
          ) : (
            activeSessions.map((session: any) => (
              <div key={session.id} className="relative aspect-video bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl group transition-all hover:border-blue-500/50">
                 <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                    {session.isCameraActive ? (
                      <Video size={48} className="text-blue-500/20 animate-pulse" />
                    ) : (
                      <VideoOff size={48} className="text-red-500/20" />
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-md backdrop-blur-md">
                       <div className={`w-1.5 h-1.5 rounded-full ${session.isCameraActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       <span className="text-[9px] font-black text-white uppercase">{session.isCameraActive ? 'Online' : 'Signal Lost'}</span>
                    </div>
                 </div>

                 <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-white font-black text-sm uppercase tracking-tight">{session.studentName}</p>
                          <p className="text-blue-400 font-mono text-[10px] font-bold tracking-widest mt-0.5">{session.accessCode}</p>
                       </div>
                       <uiKit.Badge variant="outline" className="text-[9px] h-5 px-1.5 border-white/10 text-slate-300 font-mono bg-black/40">
                          {session.currentSection || 'INIT'}
                       </uiKit.Badge>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>

        <footer className="mt-4 pt-4 border-t border-slate-900 flex justify-between items-center px-2">
           <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
             Developed by Yursinaliyev Muhammadaziz | yursinalivem@gmail.com
           </div>
           <div className="text-slate-700 text-[10px] font-mono">
             System Time: {new Date().toLocaleTimeString()}
           </div>
        </footer>
      </div>
    );
  }

  const handleDeleteSession = async (id: number) => {
    if (!confirm("Ushbu sessiyani butunlay o'chirib tashlamoqchimisiz? Barcha javoblar va qoidabuzarliklar o'chib ketadi.")) return;
    try {
      await apiRequest("DELETE", `/api/sessions/${id}`);
      toast({ title: "Sessiya o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      refetch();
    } catch (err) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const handleCopyAccess = (code: string, pass: string) => {
    navigator.clipboard.writeText(`Test ID: ${code}\nParol: ${pass}`);
    toast({ title: "Nusxa olindi" });
  };

  const handleTerminate = async (id: number) => {
    if (!confirm("Sessiyani yakunlamoqchimisiz?")) return;
    try {
      await apiRequest("POST", `/api/sessions/${id}/terminate`, {});
      toast({ title: "Sessiya yopildi", variant: "destructive" });
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
      toast({ title: "Natija yuborildi" });
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

      // YANGI: Muvaffaqiyatli yaratilgach ma'lumotlarni saqlash
      setNewSessionInfo({
        code: randomCode,
        pass: randomPass,
        name: studentName
      });

      setStudentName("");
      toast({ title: "Sessiya yaratildi" });
    } catch (err) {
      toast({ title: "Xatolik" });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-2">

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Monitoring</h1>
            <p className="text-slate-500 text-sm">Imtihon jarayonini real vaqtda kuzatish va boshqarish.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <uiKit.Button onClick={() => setIsTvMode(true)} variant="outline" size="sm" className="rounded-lg bg-slate-900 text-white border-slate-800 hover:bg-slate-800">
              <Tv size={16} className="mr-2"/> TV Wall
            </uiKit.Button>
            <Link href="/admin">
              <uiKit.Button variant="outline" size="sm" className="rounded-lg"><ArrowLeft size={16} className="mr-2"/> Panel</uiKit.Button>
            </Link>
            <uiKit.Button onClick={() => refetch()} variant="secondary" size="sm" className="rounded-lg">
              <RefreshCw size={14} className={`${isLoading ? 'animate-spin' : ''} mr-2`} /> Yangilash
            </uiKit.Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: GENERATION & LIST */}
          <div className="lg:col-span-8 space-y-8">

            {/* QUICK ADD CARD */}
            <uiKit.Card className="border-none shadow-sm bg-slate-50 rounded-2xl">
              <uiKit.CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                  <UserPlus size={18} className="text-blue-600" />
                  <span>Sessiya yaratish</span>
                </div>
                <form onSubmit={onGenerate} className="flex flex-wrap md:flex-nowrap gap-4">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <uiKit.Input 
                      value={studentName} 
                      onChange={(e) => setStudentName(e.target.value)} 
                      required 
                      placeholder="Talaba ismi"
                      className="bg-white border-slate-200 h-10 rounded-xl"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <select 
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                      value={selectedExamId} 
                      onChange={(e) => setSelectedExamId(e.target.value)} 
                      required
                    >
                      <option value="">Imtihon turi...</option>
                      {exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </div>
                  <uiKit.Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl h-10 px-6" disabled={createSession.isPending}>
                    {createSession.isPending ? <Loader2 className="animate-spin" /> : "Generatsiya"}
                  </uiKit.Button>
                </form>

                {/* YANGI: Yaratilgan sessiya ma'lumotlari vizitkasi */}
                {newSessionInfo && (
                  <div className="mt-6 p-4 bg-blue-600 rounded-2xl text-white animate-in zoom-in-95 duration-300 shadow-xl shadow-blue-200">
                    <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-2">
                          <ShieldCheck size={20} className="text-blue-200" />
                          <span className="text-xs font-bold uppercase tracking-widest">Yangi Sessiya Ma'lumotlari</span>
                       </div>
                       <button onClick={() => setNewSessionInfo(null)} className="text-blue-200 hover:text-white">
                          <Trash2 size={16} />
                       </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-blue-700/50 p-3 rounded-xl border border-blue-500/30">
                          <p className="text-[10px] text-blue-200 uppercase font-black mb-1">Test ID</p>
                          <p className="font-mono text-lg font-bold">{newSessionInfo.code}</p>
                       </div>
                       <div className="bg-blue-700/50 p-3 rounded-xl border border-blue-500/30">
                          <p className="text-[10px] text-blue-200 uppercase font-black mb-1">Parol (1 martalik)</p>
                          <p className="font-mono text-lg font-bold">{newSessionInfo.pass}</p>
                       </div>
                    </div>
                    <uiKit.Button 
                      onClick={() => handleCopyAccess(newSessionInfo.code, newSessionInfo.pass)}
                      className="w-full mt-3 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl py-2 flex items-center justify-center gap-2"
                    >
                      <Copy size={16} /> NUSXA OLISH (COPY)
                    </uiKit.Button>
                  </div>
                )}
              </uiKit.CardContent>
            </uiKit.Card>

            {/* SESSIONS GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sessiyalar</h3>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl mb-6">
                  <TabsTrigger value="waiting" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">Waiting</TabsTrigger>
                  <TabsTrigger value="marking" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">Marking</TabsTrigger>
                  <TabsTrigger value="graded" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">Graded</TabsTrigger>
                  <TabsTrigger value="released" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">Released</TabsTrigger>
                </TabsList>

                <div className="grid gap-3">
                  {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">Hozircha hech narsa yo'q</p>
                    </div>
                  ) : (
                    filteredSessions.map((session: any) => (
                      <div key={session.id} className="group p-4 rounded-2xl border border-slate-100 bg-white flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all">
                        <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${session.status === 'completed' ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                            {session.studentName?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{session.studentName}</span>
                              {(session.status === 'in_progress' || session.status === 'active') && (
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{session.accessCode}</code>
                              <span onClick={() => handleCopyAccess(session.accessCode, session.password)} className="text-slate-300 hover:text-blue-500 transition-colors cursor-pointer">
                                 <Copy size={12} />
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <uiKit.Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(session)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Eye size={18} />
                          </uiKit.Button>
                          {(session.status === 'in_progress' || session.status === 'active') && (
                            <uiKit.Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" 
                              onClick={() => handleTerminate(session.id)}
                            >
                              <PowerOff size={18} />
                            </uiKit.Button>
                          )}
                          <uiKit.Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" 
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            <Trash2 size={18} />
                          </uiKit.Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Tabs>
            </div>
            <footer className="mt-12 py-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Created & Developed by Yursinaliyev Muhammadaziz | yursinalivem@gmail.com
              </p>
            </footer>
          </div>

          {/* RIGHT: VIOLATIONS SIDEBAR */}
          <div className="lg:col-span-4">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-red-600 font-bold text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} /> Cheat Monitoring
                </h3>
                <uiKit.Badge variant="outline" className="text-[10px] border-red-200 text-red-600">{allViolations?.length || 0}</uiKit.Badge>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allViolations?.length === 0 ? (
                  <div className="text-center py-12">
                    <ShieldCheck size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-[11px] text-slate-400">Hech qanday qoidabuzarlik<br/>aniqlanmadi.</p>
                  </div>
                ) : (
                  allViolations?.map((v: any) => (
                    <div key={v.id} className="p-3 bg-white border border-red-50 rounded-xl shadow-sm animate-in fade-in slide-in-from-right-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800 text-[11px] truncate w-32">
                          {sessions?.find((s:any) => s.id === v.sessionId)?.studentName || "Talaba"}
                        </span>
                        <span className="text-[9px] text-slate-400">{new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[10px] text-red-500 font-medium">{v.type}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RESULT MODAL */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent aria-describedby="result-dialog-description" className="max-w-xl bg-white p-0 rounded-3xl overflow-hidden shadow-2xl border-none">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <DialogTitle className="text-lg font-bold text-slate-900 flex justify-between items-center">
                <span>Imtihon Natijasi</span>
                <uiKit.Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{selectedSubmission.studentName}</uiKit.Badge>
              </DialogTitle>
              <p id="result-dialog-description" className="sr-only">Student exam results breakdown and release control.</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {['listening', 'reading', 'writing', 'speaking'].map((skill) => {
                   const g = selectedSubmission.grading as any;
                   let band = "0.0";

                   if (skill === 'listening' || skill === 'reading') {
                     band = g?.autoGraded?.[skill]?.score !== undefined 
                       ? (Math.min(9, Math.max(0, (g.autoGraded[skill].score / 40) * 9))).toFixed(1)
                       : "0.0";
                   } else if (skill === 'writing') {
                     band = selectedSubmission.writingScore || g?.writing?.score || "0.0";
                   } else if (skill === 'speaking') {
                     band = selectedSubmission.speakingScore || g?.speaking?.score || "0.0";
                   }

                   return (
                     <div key={skill} className="p-4 bg-white border border-slate-100 rounded-2xl text-center">
                       <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{skill}</p>
                       <p className="text-2xl font-black text-slate-900">{band}</p>
                     </div>
                   );
                })}
                <div className="col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                  <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Overall Band</p>
                  <p className="text-3xl font-black text-blue-900">{selectedSubmission.overallBand || "0.0"}</p>
                </div>
              </div>

              <div className="pt-2">
                {!selectedSubmission.resultsReleased ? (
                  <uiKit.Button 
                    onClick={() => handleRelease(selectedSubmission.id)} 
                    disabled={isReleasing} 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-sm font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all"
                  >
                    {isReleasing ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" size={18} />}
                    NATIJANI TASDIQLASH VA YUBORISH
                  </uiKit.Button>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-sm font-bold">
                    <CheckCircle className="mr-2" size={20} /> NATIJA O'QUVCHIGA YUBORILGAN
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}