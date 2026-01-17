import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, ChangeEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Clock, PenTool, MessageSquare, Award, CheckCircle2, User } from "lucide-react";
import type { ExamSession, Submission } from "@shared/schema";

interface WritingCriteria {
  tr: number;
  cc: number;
  lr: number;
  gra: number;
}

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/sessions", selectedSessionId, "submission"],
    enabled: !!selectedSessionId,
  });

  const [wCriteria, setWCriteria] = useState<WritingCriteria>({ tr: 0, cc: 0, lr: 0, gra: 0 });
  const [speakingScore, setSpeakingScore] = useState<string>("0");
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    if (submission) {
      const g = submission.grading as any;
      const adv = g?.advancedAssessment?.writing?.task2 || {};
      setWCriteria({
        tr: adv.taskResponse || 0,
        cc: adv.coherenceCohesion || 0,
        lr: adv.lexicalResource || 0,
        gra: adv.grammaticalRange || 0
      });
      setSpeakingScore(g?.speaking?.score?.toString() || "0");
      setFeedback(g?.writing?.feedback || g?.feedback || "");
    }
  }, [submission]);

  const gradeMutation = useMutation({
    mutationFn: async ({ id, grading, scores }: { id: number, grading: any, scores: any }) => {
      const res = await apiRequest("POST", `/api/sessions/${id}/grade`, { grading, scores });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Muvaffaqiyatli", description: "Ballar saqlandi va hisoblandi." });
    },
  });

  const handleGrade = () => {
    if (!selectedSessionId || !submission) return;

    const wAvg = (wCriteria.tr + wCriteria.cc + wCriteria.lr + wCriteria.gra) / 4;
    const wFinal = Math.round(wAvg * 2) / 2;
    const s = parseFloat(speakingScore) || 0;

    const currentGrading = submission.grading as any;
    const auto = currentGrading?.autoGraded || {};

    const lBand = Math.min(9, Math.max(0, ((auto.listening?.score || 0) / 40) * 9));
    const rBand = Math.min(9, Math.max(0, ((auto.reading?.score || 0) / 40) * 9));

    const overall = ((lBand + rBand + wFinal + s) / 4);
    const overallRounded = (Math.round(overall * 2) / 2).toFixed(1);

    const updatedGrading = {
      ...currentGrading,
      advancedAssessment: {
        writing: { 
          task2: { 
            taskResponse: wCriteria.tr, 
            coherenceCohesion: wCriteria.cc, 
            lexicalResource: wCriteria.lr, 
            grammaticalRange: wCriteria.gra 
          } 
        },
        speaking: { score: s }
      },
      writing: { feedback, score: wFinal },
      speaking: { score: s },
      feedback: feedback
    };

    gradeMutation.mutate({
      id: selectedSessionId,
      grading: updatedGrading,
      scores: {
        writingScore: wFinal.toString(),
        speakingScore: s.toString(),
        readingScore: rBand.toFixed(1),
        listeningScore: lBand.toFixed(1),
        overallBand: overallRounded,
        status: 'graded'
      }
    });
  };

  if (sessionsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
      </AdminLayout>
    );
  }

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">

        {/* LEFT: SESSION LIST */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Imtihonlar</h2>
            <Badge variant="outline" className="bg-white">{sessions?.length || 0}</Badge>
          </div>

          <Card className="flex-1 overflow-hidden border-slate-200 shadow-sm rounded-2xl">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {sessions?.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedSessionId === session.id 
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" 
                      : "bg-white border-slate-100 hover:border-blue-300 text-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm leading-tight">{session.firstName} {session.lastName}</span>
                      {session.status === 'graded' && <CheckCircle2 size={14} className={selectedSessionId === session.id ? "text-blue-200" : "text-emerald-500"} />}
                    </div>
                    <p className={`text-[11px] font-mono ${selectedSessionId === session.id ? "text-blue-100" : "text-slate-400"}`}>
                      {session.accessCode}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* RIGHT: GRADING PANEL */}
        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl bg-white border-none">
          {selectedSessionId ? (
            submissionLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm text-slate-400 animate-pulse">Ma'lumotlar yuklanmoqda...</p>
              </div>
            ) : (
              <>
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 leading-tight">{selectedSession?.firstName} {selectedSession?.lastName}</h3>
                      <p className="text-xs text-slate-500 font-medium italic">Sessiya ID: #{selectedSession?.id}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleGrade} 
                    disabled={gradeMutation.isPending} 
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-100"
                  >
                    {gradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Natijani Saqlash
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-8 space-y-10">

                      {/* WRITING RESPONSE */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                          <PenTool size={20} className="stroke-[2.5px]" />
                          <h3 className="font-black uppercase text-xs tracking-[0.2em]">Writing Submission</h3>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-800 text-lg leading-relaxed font-serif shadow-inner min-h-[300px]">
                          {(submission?.answers as any)?.writing || "Talaba tomonidan insho yozilmagan."}
                        </div>
                      </section>

                      {/* GRADING GRID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Writing Criteria */}
                        <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 space-y-5">
                          <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                            <Award size={16}/> Writing Band Scores
                          </h4>
                          <div className="space-y-4">
                            <CriteriaInput label="Task Response" value={wCriteria.tr} onChange={(v) => setWCriteria({...wCriteria, tr: v})} />
                            <CriteriaInput label="Coherence & Cohesion" value={wCriteria.cc} onChange={(v) => setWCriteria({...wCriteria, cc: v})} />
                            <CriteriaInput label="Lexical Resource" value={wCriteria.lr} onChange={(v) => setWCriteria({...wCriteria, lr: v})} />
                            <CriteriaInput label="Grammatical Range" value={wCriteria.gra} onChange={(v) => setWCriteria({...wCriteria, gra: v})} />
                          </div>
                        </div>

                        {/* Speaking & Auto Scores */}
                        <div className="space-y-6">
                          <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                              <MessageSquare size={16}/> Speaking Assessment
                            </h4>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Overall Speaking Band</label>
                              <Input 
                                type="number" 
                                min="0" max="9" step="0.5" 
                                className="h-12 text-lg font-bold rounded-xl border-emerald-200 focus:ring-emerald-500 bg-white" 
                                value={speakingScore} 
                                onChange={(e) => setSpeakingScore(e.target.value)} 
                              />
                            </div>
                          </div>

                          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/60 flex items-center justify-around text-center">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Listening</p>
                              <p className="text-xl font-black text-slate-700">{(submission?.grading as any)?.autoGraded?.listening?.score || 0}<span className="text-xs text-slate-400">/40</span></p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Reading</p>
                              <p className="text-xl font-black text-slate-700">{(submission?.grading as any)?.autoGraded?.reading?.score || 0}<span className="text-xs text-slate-400">/40</span></p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FEEDBACK SECTION */}
                      <section className="space-y-4 pb-10">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MessageSquare size={20} className="stroke-[2.5px]" />
                          <h3 className="font-black uppercase text-xs tracking-[0.2em]">Detailed Feedback</h3>
                        </div>
                        <Textarea 
                          className="min-h-[200px] rounded-3xl bg-white border-slate-200 p-6 text-base shadow-sm focus:ring-blue-500" 
                          placeholder="Talaba uchun xatolar ustida ishlash bo'yicha tavsiyalar yozing..." 
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
            <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50/30">
              <Clock className="h-20 w-20 mb-6 opacity-20" />
              <p className="text-lg font-bold text-slate-400">Tekshirishni boshlash uchun o'quvchini tanlang</p>
              <p className="text-sm text-slate-300">Chap tarafdagi ro'yxatdan foydalaning</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

function CriteriaInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white border border-blue-100/50 shadow-sm">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <Input 
          type="number" 
          min="0" max="9" step="0.5" 
          className="w-16 h-9 text-center font-bold border-none bg-blue-50 text-blue-700 rounded-lg focus:ring-0"
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
        />
      </div>
    </div>
  );
}