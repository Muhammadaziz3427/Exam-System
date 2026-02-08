import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit";
import { useSessions } from "@/hooks/use-sessions";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, FileSearch, PenTool, TrendingUp, ChevronRight, Search } from "lucide-react"; 

export function AdminDetailedAssessment() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const { toast } = useToast();

  const { data: submission, isLoading: submissionLoading } = useQuery<any>({
    queryKey: [`/api/sessions/${selectedSessionId}/submission`],
    enabled: !!selectedSessionId,
  });

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  // Ishlatilmagan 'exam' o'zgaruvchisi olib tashlandi yoki console'ga chiqarildi
  useQuery<any>({
    queryKey: [`/api/exams/${selectedSession?.examId}`],
    enabled: !!selectedSession?.examId,
  });

  // --- QIDIRUV MANTIQI ---
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter((s: any) => 
      s.studentName?.toLowerCase().includes(term) || 
      s.accessCode?.toLowerCase().includes(term)
    );
  }, [searchTerm, sessions]);

  const [assessment, setAssessment] = useState<any>({
    writing: {
      task1: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 },
      task2: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 }
    },
    speaking: { fluency: 0, lexicalResource: 0, grammaticalRange: 0, pronunciation: 0 },
    diagnosticFeedback: ""
  });

  const calculateAverage = (scores: object) => {
    const values = Object.values(scores);
    const sum = values.reduce((a, b) => a + b, 0);
    return values.length ? (Math.round((sum / values.length) * 2) / 2).toFixed(1) : "0.0";
  };

  useEffect(() => {
    if (submission?.grading?.advancedAssessment) {
      setAssessment(submission.grading.advancedAssessment);
    } else {
      setAssessment({
        writing: {
          task1: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 },
          task2: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 }
        },
        speaking: { fluency: 0, lexicalResource: 0, grammaticalRange: 0, pronunciation: 0 },
        diagnosticFeedback: ""
      });
    }
  }, [submission]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/sessions/${selectedSessionId}/advanced-assessment`, { assessment: data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${selectedSessionId}/submission`] });
      toast({ title: "Muvaffaqiyatli", description: "Assessment saqlandi" });
    }
  });

  const handleScoreChange = (module: string, task: string | null, criterion: string, value: string) => {
    const numValue = Math.min(9, Math.max(0, parseFloat(value) || 0));
    setAssessment((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (task) {
        next[module][task][criterion] = numValue;
      } else {
        next[module][criterion] = numValue;
      }
      return next;
    });
  };

  const handleFeedbackChange = (value: string) => {
    setAssessment((prev: any) => ({ ...prev, diagnosticFeedback: value }));
  };

  if (sessionsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Detailed Assessment</h2>
            <p className="text-slate-500 font-medium">IELTS Standard Grading Interface</p>
          </div>
          <uiKit.Badge variant="outline" className="h-8 border-slate-200">
            Session Status: {selectedSession?.status || 'Unknown'}
          </uiKit.Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <uiKit.Card className="lg:col-span-3 border-none shadow-xl rounded-3xl bg-white overflow-hidden flex flex-col h-fit">
            <uiKit.CardHeader className="bg-slate-50 border-b space-y-4">
              <uiKit.CardTitle className="text-xs uppercase tracking-widest text-slate-400">Student Directory</uiKit.CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <uiKit.Input 
                  placeholder="Ism yoki kod..." 
                  className="pl-9 bg-white border-slate-200 rounded-xl h-9 text-sm focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </uiKit.CardHeader>

            <uiKit.CardContent className="p-4 max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session: any) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full group flex items-center justify-between p-4 rounded-2xl transition-all ${
                        selectedSessionId === session.id 
                          ? "bg-slate-900 text-white shadow-lg" 
                          : "bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100"
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-black text-sm">{session.studentName}</div>
                        <div className={`text-[10px] ${selectedSessionId === session.id ? "text-slate-400" : "text-slate-500"}`}>
                          {session.accessCode}
                        </div>
                      </div>
                      <ChevronRight size={16} className={selectedSessionId === session.id ? "text-blue-400" : "text-slate-300"} />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm italic">
                    Hech kim topilmadi
                  </div>
                )}
              </div>
            </uiKit.CardContent>
          </uiKit.Card>

          {/* Assessment Interface */}
          <div className="lg:col-span-9 space-y-6">
            {!selectedSessionId ? (
              <uiKit.Card className="h-[600px] flex flex-col items-center justify-center p-12 border-dashed border-2 rounded-[3rem] bg-slate-50/50">
                <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                  <FileSearch size={48} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold text-xl">Baholash uchun talabani tanlang</p>
              </uiKit.Card>
            ) : submissionLoading ? (
              <uiKit.Card className="h-[600px] flex items-center justify-center border-none shadow-sm rounded-[3rem]">
                <Loader2 className="animate-spin size-12 text-blue-600" />
              </uiKit.Card>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <uiKit.Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                  <uiKit.CardHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                        {selectedSession?.studentName?.[0]}
                      </div>
                      <div>
                        <uiKit.CardTitle className="text-2xl font-black text-slate-900">{selectedSession?.studentName}</uiKit.CardTitle>
                        <uiKit.Badge className="bg-blue-100 text-blue-700 border-none font-bold">Standard Exam</uiKit.Badge>
                      </div>
                    </div>
                    <uiKit.Button 
                      onClick={() => mutation.mutate(assessment)} 
                      disabled={mutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-12 shadow-lg shadow-blue-200 gap-2 font-bold"
                    >
                      {mutation.isPending ? <Loader2 className="animate-spin size-4" /> : <Save size={18} />}
                      Saqlash
                    </uiKit.Button>
                  </uiKit.CardHeader>

                  <uiKit.CardContent className="space-y-10 p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <span className="font-bold text-blue-900">Task 1</span>
                        <span className="text-2xl font-black text-blue-600">{calculateAverage(assessment.writing.task1)}</span>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                        <span className="font-bold text-indigo-900">Task 2</span>
                        <span className="text-2xl font-black text-indigo-600">{calculateAverage(assessment.writing.task2)}</span>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Speaking</span>
                        <span className="text-2xl font-black text-emerald-600">{calculateAverage(assessment.speaking)}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <PenTool size={22} className="text-blue-500" /> Writing Assessment
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {['task1', 'task2'].map((task) => (
                          <div key={task} className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                             <h4 className="font-black uppercase text-xs text-slate-400">{task} Score Breakdown</h4>
                             {Object.keys(assessment.writing[task]).map(crit => (
                               <div key={crit} className="flex justify-between items-center bg-white p-2 rounded-xl px-4 shadow-sm">
                                 <span className="text-sm font-medium capitalize">{crit.replace(/([A-Z])/g, ' $1')}</span>
                                 <uiKit.Input 
                                   type="number" step="0.5" className="w-16 h-8 border-none bg-slate-100 text-center font-bold" 
                                   value={assessment.writing[task][crit]} 
                                   onChange={(e) => handleScoreChange('writing', task, crit, e.target.value)}
                                 />
                               </div>
                             ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp size={22} className="text-amber-500" /> Feedback
                      </h3>
                      <uiKit.Textarea
                        className="min-h-[150px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 focus:border-blue-500"
                        value={assessment.diagnosticFeedback}
                        onChange={(e) => handleFeedbackChange(e.target.value)}
                      />
                    </div>
                  </uiKit.CardContent>
                </uiKit.Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Default export ham qo'shib qo'yamiz
export default AdminDetailedAssessment;