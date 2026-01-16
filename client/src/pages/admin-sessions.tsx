import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, Button, Input, Label, Badge } from "@/components/ui-kit"; 
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { 
  Loader2, RefreshCw, UserPlus, AlertCircle, Eye, 
  Copy, PowerOff, CheckCircle, ArrowLeft, Mail 
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
    if (!confirm("Haqiqatan ham bu o'quvchini imtihondan chiqarib yubormoqchimisiz?")) return;
    try {
      await apiRequest("POST", `/api/sessions/${id}/terminate`, {});
      toast({ title: "Sessiya yopildi", variant: "destructive" });
      // Bazani yangilashni majburlash
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
      toast({ title: "Natija tasdiqlandi" });
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
    const randomCode = `IELTS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const randomPass = Math.random().toString(36).slice(-6).toUpperCase();
    try {
      await createSession.mutateAsync({
        studentName,
        firstName: studentName.split(' ')[0] || "",
        lastName: studentName.split(' ').slice(1).join(' ') || "",
        email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        examId: parseInt(selectedExamId),
        accessCode: randomCode,
        password: randomPass
      });
      setStudentName("");
      toast({ title: "Yaratildi!" });
    } catch (err) {
      toast({ title: "Xatolik" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm"><ArrowLeft size={18} className="mr-2"/> Panel</Button>
            </Link>
            <h1 className="text-xl font-black">Monitoring</h1>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold uppercase text-[12px]">
                  <UserPlus size={18} />
                  <span>Yangi o'quvchi qo'shish</span>
                </div>
                <form onSubmit={onGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Talaba F.I.Sh</Label>
                    <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required placeholder="Ism Familiya" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Imtihon turi</Label>
                    <select className="w-full h-10 px-3 rounded-md border text-sm bg-white" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} required>
                      <option value="">Tanlang...</option>
                      {exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-blue-600 font-bold" disabled={createSession.isPending}>
                      {createSession.isPending ? <Loader2 className="animate-spin" /> : "GENERATSIYA"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-2">
              {sessions?.map((session: any) => (
                <div key={session.id} className="p-4 rounded-lg border bg-white flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {session.studentName?.[0] || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{session.studentName}</span>
                        <Badge variant={(session.status === 'in_progress' || session.status === 'active') ? "default" : "secondary"}>
                          {(session.status === 'in_progress' || session.status === 'active') ? 'LIVE' : session.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-1">
                        <span>{session.accessCode}</span> | <span>{session.password}</span>
                        <button type="button" onClick={() => handleCopyAccess(session.accessCode, session.password)} className="hover:text-blue-600">
                           <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(session)}>
                      <Eye size={16} className="mr-1" /> Ko'rish
                    </Button>

                    {/* TUZATILGAN: 'active' statusida ham tugma ko'rinadi */}
                    {(session.status === 'in_progress' || session.status === 'active') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50" 
                        onClick={(e) => {
                          e.stopPropagation(); // Dialogni ochilib ketishini to'xtatadi
                          handleTerminate(session.id);
                        }}
                      >
                        <PowerOff size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-80">
            <Card className="bg-slate-50 border-none shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-red-600 font-bold text-[11px] uppercase mb-4 flex items-center gap-2">
                  <AlertCircle size={14} /> Cheat Monitoring
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-auto pr-2">
                  {allViolations?.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">Hozircha qoidabuzarlik yo'q</p>}
                  {allViolations?.map((v: any) => (
                    <div key={v.id} className="p-2 bg-white border border-red-100 rounded text-[10px] shadow-sm">
                      <div className="flex justify-between font-bold text-red-700">
                        <span>{sessions?.find((s:any) => s.id === v.sessionId)?.studentName || "Talaba"}</span>
                        <span className="text-slate-400 font-normal">{new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="mt-1 text-slate-600 font-medium">{v.type}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* NATIJALAR DIALOGI - O'ZGARISSIZ QOLDI */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-2xl">
            <DialogTitle className="text-xl font-black border-b pb-4 text-slate-800">
              Natija: {selectedSubmission.studentName}
            </DialogTitle>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['listening', 'reading', 'writing', 'speaking'].map((skill) => {
                   const g = selectedSubmission.grading as any;
                   const band = skill === 'listening' || skill === 'reading' 
                      ? g?.autoGraded?.[skill]?.band 
                      : g?.[skill]?.band;
                   return (
                     <div key={skill} className="p-4 bg-slate-50 rounded-2xl border text-center shadow-inner">
                       <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{skill}</p>
                       <p className="text-2xl font-black text-blue-700">{band || "0.0"}</p>
                     </div>
                   );
                })}
              </div>
              <div className="pt-4 border-t">
                {!selectedSubmission.resultsReleased ? (
                  <Button 
                    onClick={() => handleRelease(selectedSubmission.id)} 
                    disabled={isReleasing} 
                    className="w-full bg-blue-600 h-14 text-lg font-black rounded-xl hover:bg-blue-700 shadow-lg"
                  >
                    {isReleasing ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" size={20} />}
                    NATIJANI TASDIQLASH VA YUBORISH
                  </Button>
                ) : (
                  <div className="w-full p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold">
                    <CheckCircle className="mr-2" /> NATIJA O'QUVCHIGA YUBORILGAN
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