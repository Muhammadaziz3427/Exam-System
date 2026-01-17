import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit"; 
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { 
  Loader2, RefreshCw, UserPlus, AlertCircle, Eye, 
  Copy, PowerOff, CheckCircle, ArrowLeft, Mail, ShieldCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminSessions() {
  const { data: sessions, isLoading, refetch } = useSessions();
  const { data: exams } = useExams();
  const createSession = useCreateSession();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const { toast } = useToast();

  const [studentName, setStudentName] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const { data: allViolations } = useQuery({
    queryKey: ['/api/violations'],
    queryFn: async () => {
      const res = await fetch('/api/violations');
      return res.json();
    },
    refetchInterval: 5000 
  });

  const handleCopyAccess = (code: string, pass: string) => {
    navigator.clipboard.writeText(`Kod: ${code}\nParol: ${pass}`);
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
              </uiKit.CardContent>
            </uiKit.Card>

            {/* SESSIONS GRID */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Sessiyalar ro'yxati</h3>
              <div className="grid gap-3">
                {isLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" /></div>
                ) : (
                  sessions?.map((session: any) => (
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
                            <button onClick={() => handleCopyAccess(session.accessCode, session.password)} className="text-slate-300 hover:text-blue-500 transition-colors">
                               <Copy size={12} />
                            </button>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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

      {/* RESULT MODAL - TOZALANGAN INTERFEYS */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-xl bg-white p-0 rounded-3xl overflow-hidden shadow-2xl border-none">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <DialogTitle className="text-lg font-bold text-slate-900 flex justify-between items-center">
                <span>Imtihon Natijasi</span>
                <uiKit.Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{selectedSubmission.studentName}</uiKit.Badge>
              </DialogTitle>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {['listening', 'reading', 'writing', 'speaking'].map((skill) => {
                   const g = selectedSubmission.grading as any;
                   const band = skill === 'listening' || skill === 'reading' 
                      ? g?.autoGraded?.[skill]?.band 
                      : g?.[skill]?.band;
                   return (
                     <div key={skill} className="p-4 bg-white border border-slate-100 rounded-2xl text-center">
                       <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{skill}</p>
                       <p className="text-2xl font-black text-slate-900">{band || "0.0"}</p>
                     </div>
                   );
                })}
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