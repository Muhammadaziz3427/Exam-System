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
import { cn } from "@/lib/utils";
import { 
  Loader2, Clock, PenTool, MessageSquare, Award, 
  CheckCircle2, Trash2, Search, Info,
  TrendingUp, Sparkles, Zap, ChevronRight
} from "lucide-react";
import type { ExamSession, Submission } from "@shared/schema";

// IELTS Rounding Logic: 6.25 -> 6.5, 6.75 -> 7.0
const ieltsRound = (score: number) => Math.round(score * 2) / 2;

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("waiting");
  const [searchTerm, setSearchTerm] = useState("");

  // --- DATA FETCHING ---
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/sessions", selectedSessionId, "submission"],
    enabled: !!selectedSessionId,
  });

  // --- COMPREHENSIVE ASSESSMENT STATE ---
  const [wCriteria, setWCriteria] = useState({ tr: 0, cc: 0, lr: 0, gra: 0 });
  const [sCriteria, setSCriteria] = useState({ fc: 0, lr: 0, gra: 0, pr: 0 });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (submission) {
      const g = (submission.grading as any) || {};
      const w = g.advancedAssessment?.writing?.task2 || {};
      const s = g.advancedAssessment?.speaking || {};

      setWCriteria({
        tr: w.taskResponse || 0,
        cc: w.coherenceCohesion || 0,
        lr: w.lexicalResource || 0,
        gra: w.grammaticalRange || 0
      });
      setSCriteria({
        fc: s.fluency || 0,
        lr: s.lexical || 0,
        gra: s.grammar || 0,
        pr: s.pronunciation || parseFloat(g.speaking?.score) || 0
      });
      setFeedback(g.writing?.feedback || g.feedback || "");
    }
  }, [submission]);

  // --- DERIVED CALCULATIONS ---
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s: any) => {
      const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "waiting") return s.status === "pending_grading";
      if (activeTab === "marking") return s.status === "in_progress";
      if (activeTab === "graded") return s.status === "graded" && !s.resultsReleased;
      if (activeTab === "released") return s.resultsReleased;
      return true;
    });
  }, [sessions, activeTab, searchTerm]);

  const scores = useMemo(() => {
    const wBand = ieltsRound((wCriteria.tr + wCriteria.cc + wCriteria.lr + wCriteria.gra) / 4 || 0);
    const sBand = ieltsRound((sCriteria.fc + sCriteria.lr + sCriteria.gra + sCriteria.pr) / 4 || 0);

    const auto = (submission?.grading as any)?.autoGraded || {};
    const lBand = ieltsRound(((auto.listening?.score || 0) / 40) * 9);
    const rBand = ieltsRound(((auto.reading?.score || 0) / 40) * 9);

    const overall = ieltsRound((lBand + rBand + wBand + sBand) / 4);
    return { lBand, rBand, wBand, sBand, overall };
  }, [wCriteria, sCriteria, submission]);

  // --- MUTATION ---
  const gradeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/sessions/${selectedSessionId}/grade`, payload);
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Scores Published", description: "Assessment has been recorded successfully." });
    },
  });

  const handleGrade = () => {
    const updatedGrading = {
      ...(submission?.grading as any),
      advancedAssessment: {
        writing: { task2: { 
          taskResponse: wCriteria.tr, coherenceCohesion: wCriteria.cc, 
          lexicalResource: wCriteria.lr, grammaticalRange: wCriteria.gra 
        }},
        speaking: { 
          fluency: sCriteria.fc, lexical: sCriteria.lr, 
          grammar: sCriteria.gra, pronunciation: sCriteria.pr 
        }
      },
      writing: { feedback, score: scores.wBand },
      speaking: { score: scores.sBand },
      feedback
    };

    gradeMutation.mutate({
      id: selectedSessionId,
      grading: updatedGrading,
      scores: {
        writingScore: scores.wBand.toString(),
        speakingScore: scores.sBand.toString(),
        overallBand: scores.overall.toFixed(1),
        status: 'graded'
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] overflow-hidden animate-in fade-in duration-500">

        {/* LEFT SIDEBAR: Session List */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="flex flex-col gap-4 px-2">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-black text-3xl text-slate-900 tracking-tighter">Examiner</h2>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] flex items-center gap-1">
                  <Zap size={10} fill="currentColor" /> Evaluation Portal
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border-none rounded-lg font-bold">
                {filteredSessions.length} total
              </Badge>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input 
                placeholder="Find student..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <tabs.Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <tabs.TabsList className="grid grid-cols-4 bg-slate-100/80 p-1 rounded-xl mx-2">
              {["waiting", "marking", "graded", "released"].map((t) => (
                <tabs.TabsTrigger key={t} value={t} className="capitalize text-[10px] font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t}
                </tabs.TabsTrigger>
              ))}
            </tabs.TabsList>

            <ScrollArea className="flex-1 mt-4 px-2">
              <div className="space-y-3 pb-6">
                {filteredSessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={cn(
                            "w-full text-left p-5 rounded-[1.5rem] border transition-all duration-300 relative overflow-hidden group",
                            selectedSessionId === session.id
                                ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-300 -translate-y-1"
                                : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-md"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <p className="font-black text-base tracking-tight">{session.firstName} {session.lastName}</p>
                            {session.status === 'graded' && <CheckCircle2 size={16} className="text-emerald-400" />}
                        </div>
                        <div className="flex items-center gap-3 mt-2 opacity-60 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Clock size={10} /> {new Date(session.createdAt!).toLocaleDateString()}</span>
                            <span className="bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-mono">{session.accessCode}</span>
                        </div>
                        {selectedSessionId === session.id && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500" />
                        )}
                    </button>
                ))}
              </div>
            </ScrollArea>
          </tabs.Tabs>
        </div>

        {/* MAIN GRADING AREA */}
        <card.Card className="flex-1 flex flex-col overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white border border-slate-100 relative">
          {selectedSessionId ? (
            submissionLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="relative">
                   <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                   <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" size={20} />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Analyzing Dossier...</p>
              </div>
            ) : (
              <>
                {/* STICKY HEADER SCORE BAR */}
                <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-white/90 backdrop-blur-xl sticky top-0 z-20">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-[1.2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">
                      {sessions?.find(s => s.id === selectedSessionId)?.firstName[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tighter leading-none">
                        {sessions?.find(s => s.id === selectedSessionId)?.firstName} {sessions?.find(s => s.id === selectedSessionId)?.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-emerald-500 text-white border-none px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5">
                          <TrendingUp size={12} /> OVERALL BAND: {scores.overall.toFixed(1)}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200 text-slate-400 text-[10px]">
                          Word count validated
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="rounded-xl text-slate-500 font-bold hover:bg-slate-50">Discard</Button>
                    <Button 
                      onClick={handleGrade} 
                      disabled={gradeMutation.isPending}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-10 h-12 font-black shadow-xl transition-all active:scale-95"
                    >
                      {gradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Publish Assessment
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="max-w-5xl mx-auto px-10 py-10 space-y-16">

                    {/* WRITING SECTION */}
                    <section className="space-y-8">
                      <SectionHeader icon={<PenTool size={20} />} title="Writing Submissions" />

                      <div className="grid gap-8">
                        {["writingTask1", "writingTask2"].map((taskKey) => {
                          const content = (submission?.answers as any)?.[taskKey];
                          const wordCount = content?.split(/\s+/).filter(Boolean).length || 0;
                          const target = taskKey === "writingTask1" ? 150 : 250;

                          return (
                            <div key={taskKey} className="group">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <ChevronRight size={14} /> {taskKey.replace(/([A-Z])/g, ' $1')}
                                </span>
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black",
                                  wordCount < target ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                  WORDS: {wordCount} / {target}+
                                </div>
                              </div>
                              <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-700 font-serif text-lg leading-[1.8] group-hover:bg-white group-hover:shadow-2xl group-hover:border-blue-100 transition-all duration-500 whitespace-pre-wrap relative italic">
                                {content || "Empty response."}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Info size={16} className="text-blue-400" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* SCORING MATRIX */}
                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* WRITING CRITERIA */}
                      <div className="p-8 rounded-[2.5rem] bg-blue-50/40 border border-blue-100/50 space-y-6">
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Award size={18} /> Writing Matrix (W)
                        </h4>
                        <div className="space-y-3">
                          <CriteriaInput label="Task Response" value={wCriteria.tr} onChange={(v) => setWCriteria({...wCriteria, tr: v})} />
                          <CriteriaInput label="Cohesion" value={wCriteria.cc} onChange={(v) => setWCriteria({...wCriteria, cc: v})} />
                          <CriteriaInput label="Lexical" value={wCriteria.lr} onChange={(v) => setWCriteria({...wCriteria, lr: v})} />
                          <CriteriaInput label="Grammar" value={wCriteria.gra} onChange={(v) => setWCriteria({...wCriteria, gra: v})} />
                        </div>
                        <div className="pt-4 border-t border-blue-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-blue-400 uppercase">Sub-total Writing</span>
                          <span className="text-2xl font-black text-blue-600">{scores.wBand.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* SPEAKING CRITERIA */}
                      <div className="p-8 rounded-[2.5rem] bg-emerald-50/40 border border-emerald-100/50 space-y-6">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <MessageSquare size={18} /> Speaking Matrix (S)
                        </h4>
                        <div className="space-y-3">
                          <CriteriaInput label="Fluency" color="emerald" value={sCriteria.fc} onChange={(v) => setSCriteria({...sCriteria, fc: v})} />
                          <CriteriaInput label="Lexical" color="emerald" value={sCriteria.lr} onChange={(v) => setSCriteria({...sCriteria, lr: v})} />
                          <CriteriaInput label="Grammar" color="emerald" value={sCriteria.gra} onChange={(v) => setSCriteria({...sCriteria, gra: v})} />
                          <CriteriaInput label="Pronunciation" color="emerald" value={sCriteria.pr} onChange={(v) => setSCriteria({...sCriteria, pr: v})} />
                        </div>
                        <div className="pt-4 border-t border-emerald-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">Sub-total Speaking</span>
                          <span className="text-2xl font-black text-emerald-600">{scores.sBand.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* AUTO-GRADED STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatBlock label="Listening" value={(submission?.grading as any)?.autoGraded?.listening?.score} total={40} band={scores.lBand} />
                      <StatBlock label="Reading" value={(submission?.grading as any)?.autoGraded?.reading?.score} total={40} band={scores.rBand} />
                      <StatBlock label="Writing" value={scores.wBand} isBand />
                      <StatBlock label="Speaking" value={scores.sBand} isBand />
                    </div>

                    {/* PROFESSIONAL FEEDBACK */}
                    <section className="space-y-4 pb-20">
                       <SectionHeader icon={<MessageSquare size={20} />} title="Professional Feedback" />
                        <Textarea 
                          className="min-h-[250px] rounded-[2rem] border-slate-100 p-8 text-lg font-serif leading-relaxed italic focus:ring-4 focus:ring-blue-500/10 bg-white shadow-inner"
                          placeholder="Provide actionable insights for the student..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 text-right font-medium">✨ Use professional, encouraging tone for IELTS candidates.</p>
                    </section>
                  </div>
                </ScrollArea>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <div className="p-10 rounded-full bg-slate-50 mb-6">
                <Clock size={60} strokeWidth={1} />
              </div>
              <p className="font-black uppercase tracking-[0.4em] text-xs">Awaiting Selection</p>
              <p className="text-[11px] font-medium mt-2">Select a dossier from the left to begin marking.</p>
            </div>
          )}
        </card.Card>
      </div>
    </AdminLayout>
  );
}

// --- HELPER COMPONENTS ---

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-900">
      <div className="p-2 rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <h4 className="text-sm font-black uppercase tracking-[0.2em]">{title}</h4>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function CriteriaInput({ label, value, onChange, color = "blue" }: { label: string, value: number, onChange: (v: number) => void, color?: "blue" | "emerald" }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100/50 group transition-all hover:border-blue-400 hover:shadow-lg">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <Input 
          type="number" min="0" max="9" step="0.5" 
          className={cn(
            "w-20 h-10 text-center font-black rounded-xl border-none text-lg",
            color === "blue" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
          )}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}

function StatBlock({ label, value = 0, total, band, isBand = false }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-white border border-slate-100 text-center shadow-sm hover:shadow-xl transition-shadow">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-slate-900">
          {isBand ? value.toFixed(1) : value}
          {!isBand && <span className="text-sm opacity-20 ml-1">/{total}</span>}
        </span>
        {!isBand && (
          <Badge className="mt-2 bg-slate-900 text-[9px] font-black">BAND: {band.toFixed(1)}</Badge>
        )}
      </div>
    </div>
  );
}