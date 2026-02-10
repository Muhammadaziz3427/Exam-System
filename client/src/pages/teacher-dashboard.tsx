import { AdminLayout } from "@/components/layout/AdminLayout";
import * as card from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import * as tabs from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Loader2, Clock, PenTool, MessageSquare, Award, 
  CheckCircle2, User, Trash2, BookOpen, Headphones, 
  TrendingUp, FileText, ExternalLink
} from "lucide-react";
import type { ExamSession, Submission } from "@shared/schema";

interface WritingCriteria {
  tr: number;
  cc: number;
  lr: number;
  gra: number;
}

// IELTS yaxlitlash qoidasi: 6.25 -> 6.5, 6.75 -> 7.0
const ieltsRound = (score: number) => {
  return Math.round(score * 2) / 2;
};

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("waiting");

  // --- DATA FETCHING ---
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/sessions", selectedSessionId, "submission"],
    enabled: !!selectedSessionId,
  });

  // --- STATE ---
  const [wCriteria, setWCriteria] = useState<WritingCriteria>({ tr: 0, cc: 0, lr: 0, gra: 0 });
  const [speakingScore, setSpeakingScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  // Sync state when submission loads
  useEffect(() => {
    if (submission) {
      const g = (submission.grading as any) || {};
      const writingData = g.advancedAssessment?.writing?.task2 || {};

      setWCriteria({
        tr: writingData.taskResponse || 0,
        cc: writingData.coherenceCohesion || 0,
        lr: writingData.lexicalResource || 0,
        gra: writingData.grammaticalRange || 0
      });
      setSpeakingScore(parseFloat(g.speaking?.score) || 0);
      setFeedback(g.writing?.feedback || g.feedback || "");
    }
  }, [submission]);

  // --- LOGIC ---
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

  const liveOverall = useMemo(() => {
    const wAvg = (wCriteria.tr + wCriteria.cc + wCriteria.lr + wCriteria.gra) / 4;
    const wFinal = ieltsRound(wAvg);
    const s = speakingScore || 0;

    const auto = (submission?.grading as any)?.autoGraded || {};
    const lBand = ieltsRound(((auto.listening?.score || 0) / 40) * 9);
    const rBand = ieltsRound(((auto.reading?.score || 0) / 40) * 9);

    const overall = (lBand + rBand + wFinal + s) / 4;
    return ieltsRound(overall).toFixed(1);
  }, [wCriteria, speakingScore, submission]);

  // --- MUTATIONS ---
  const gradeMutation = useMutation({
    mutationFn: async ({ id, grading, scores }: { id: number, grading: any, scores: any }) => {
      const res = await apiRequest("POST", `/api/sessions/${id}/grade`, { grading, scores });
      if (!res.ok) throw new Error("Saqlashda xatolik yuz berdi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Muvaffaqiyatli", description: "Ballar va hisobot saqlandi." });
    },
  });

  const handleGrade = () => {
    if (!selectedSessionId || !submission) return;

    const wAvg = (wCriteria.tr + wCriteria.cc + wCriteria.lr + wCriteria.gra) / 4;
    const wFinal = ieltsRound(wAvg);

    const currentGrading = (submission.grading as any) || {};
    const auto = currentGrading.autoGraded || {};

    const updatedGrading = {
      ...currentGrading,
      advancedAssessment: {
        ...currentGrading.advancedAssessment,
        writing: { 
          task2: { 
            taskResponse: wCriteria.tr, 
            coherenceCohesion: wCriteria.cc, 
            lexicalResource: wCriteria.lr, 
            grammaticalRange: wCriteria.gra 
          } 
        }
      },
      writing: { feedback, score: wFinal },
      speaking: { score: speakingScore },
      feedback: feedback // Admin panelda ko'rinishi uchun asosiy feedback
    };

    gradeMutation.mutate({
      id: selectedSessionId,
      grading: updatedGrading,
      scores: {
        writingScore: wFinal.toString(),
        speakingScore: speakingScore.toString(),
        overallBand: liveOverall,
        status: 'graded'
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] max-w-[1600px] mx-auto">

        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4 animate-in slide-in-from-left">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="font-black text-2xl text-slate-900 tracking-tight">Examiner</h2>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Marking Dashboard</p>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-1">{filteredSessions.length} sessions</Badge>
          </div>

          <tabs.Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <tabs.TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl mb-4">
              {["waiting", "marking", "graded", "released"].map((t) => (
                <tabs.TabsTrigger key={t} value={t} className="capitalize text-[10px] font-bold">
                  {t}
                </tabs.TabsTrigger>
              ))}
            </tabs.TabsList>

            <card.Card className="h-[calc(100vh-280px)] overflow-hidden border-slate-100 shadow-xl rounded-[2rem]">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {filteredSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all relative group ${
                        selectedSessionId === session.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 scale-[0.98]" 
                        : "bg-white border-slate-100 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm truncate w-[80%]">{session.firstName} {session.lastName}</p>
                        {session.status === 'graded' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </div>
                      <div className="flex items-center gap-2 opacity-60 text-[10px] font-mono">
                        <span>{session.accessCode}</span>
                        <span>•</span>
                        <span>{new Date(session.createdAt!).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </card.Card>
          </tabs.Tabs>
        </div>

        {/* MAIN GRADING AREA */}
        <card.Card className="flex-1 flex flex-col overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white border border-slate-100">
          {selectedSessionId ? (
            submissionLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Submission...</p>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                      {sessions?.find(s => s.id === selectedSessionId)?.firstName[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-900 leading-none">
                        {sessions?.find(s => s.id === selectedSessionId)?.firstName} {sessions?.find(s => s.id === selectedSessionId)?.lastName}
                      </h3>
                      <div className="flex gap-2 mt-1">
                         <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none text-[10px] font-black">
                           LIVE BAND: {liveOverall}
                         </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleGrade} 
                    disabled={gradeMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-blue-100"
                  >
                    {gradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Save Results
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full px-8 py-6">
                    <div className="max-w-4xl mx-auto space-y-10">

                      {/* WRITING TASKS */}
                      <section className="space-y-6">
                        <div className="flex items-center gap-2 text-slate-400">
                          <PenTool size={18} />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em]">Writing Submissions</h4>
                        </div>

                        <div className="grid gap-6">
                          {["writingTask1", "writingTask2"].map((taskKey) => {
                            const content = (submission?.answers as any)?.[taskKey];
                            return (
                              <div key={taskKey} className="group">
                                <div className="flex justify-between mb-2 px-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{taskKey.replace(/([A-Z])/g, ' $1')}</span>
                                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                                    Words: {content?.split(/\s+/).filter(Boolean).length || 0}
                                  </span>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-serif leading-relaxed group-hover:bg-white group-hover:shadow-md transition-all whitespace-pre-wrap">
                                  {content || "No text submitted for this task."}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* SCORING GRID */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-blue-50/30 border border-blue-100 space-y-4">
                          <h4 className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-2">
                            <Award size={16} /> Writing Assessment
                          </h4>
                          <div className="space-y-2">
                            <CriteriaInput label="Task Response" value={wCriteria.tr} onChange={(v) => setWCriteria({...wCriteria, tr: v})} />
                            <CriteriaInput label="Cohesion" value={wCriteria.cc} onChange={(v) => setWCriteria({...wCriteria, cc: v})} />
                            <CriteriaInput label="Lexical" value={wCriteria.lr} onChange={(v) => setWCriteria({...wCriteria, lr: v})} />
                            <CriteriaInput label="Grammar" value={wCriteria.gra} onChange={(v) => setWCriteria({...wCriteria, gra: v})} />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-6 rounded-3xl bg-emerald-50/30 border border-emerald-100 space-y-4">
                            <h4 className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-2">
                              <MessageSquare size={16} /> Speaking Band
                            </h4>
                            <Input 
                              type="number" min="0" max="9" step="0.5"
                              className="h-14 text-2xl font-black rounded-xl border-emerald-200 text-emerald-700 bg-white"
                              value={speakingScore}
                              onChange={(e) => setSpeakingScore(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase">Listening</p>
                               <p className="text-xl font-black">{(submission?.grading as any)?.autoGraded?.listening?.score || 0}<span className="text-[10px] opacity-30">/40</span></p>
                             </div>
                             <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase">Reading</p>
                               <p className="text-xl font-black">{(submission?.grading as any)?.autoGraded?.reading?.score || 0}<span className="text-[10px] opacity-30">/40</span></p>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* FEEDBACK */}
                      <section className="space-y-4 pb-12">
                         <div className="flex items-center gap-2 text-slate-400">
                          <MessageSquare size={18} />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em]">Detailed Feedback</h4>
                        </div>
                        <Textarea 
                          className="min-h-[200px] rounded-3xl border-slate-100 p-6 text-base font-serif leading-relaxed italic focus:ring-blue-500 bg-slate-50/30"
                          placeholder="Write your professional feedback here..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                      </section>
                    </div>
                  </ScrollArea>
                </div>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-20">
              <Clock size={80} strokeWidth={1} />
              <p className="mt-4 font-bold uppercase tracking-widest text-sm">Select a student to grade</p>
            </div>
          )}
        </card.Card>
      </div>
    </AdminLayout>
  );
}

function CriteriaInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 group transition-all hover:border-blue-200">
      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
      <Input 
        type="number" min="0" max="9" step="0.5" 
        className="w-16 h-8 text-center font-black border-none bg-blue-50 text-blue-600 rounded-md p-0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}