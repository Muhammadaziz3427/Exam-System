import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Clock } from "lucide-react";
import type { ExamSession, Submission } from "@shared/schema";

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // User contextni olish
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(userStr) : null;

  // Barcha sessionlarni yuklash
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
  });

  // Tanlangan sessionning javoblarini yuklash
  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/sessions", selectedSessionId, "submission"],
    enabled: !!selectedSessionId,
  });

  const [writingScore, setWritingScore] = useState<string>("0");
  const [speakingScore, setSpeakingScore] = useState<string>("0");
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    if (submission) {
      const g = submission.grading as any;
      setWritingScore(g?.writing?.score?.toString() || "0");
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

  // IELTS Rounding mantiqi: 6.25 -> 6.5, 6.75 -> 7.0
  const calculateOverall = (l: number, r: number, w: number, s: number) => {
    const avg = (l + r + w + s) / 4;
    return (Math.round(avg * 2) / 2).toFixed(1);
  };

  const handleGrade = () => {
    if (!selectedSessionId || !submission) return;

    const w = parseFloat(writingScore) || 0;
    const s = parseFloat(speakingScore) || 0;

    const currentGrading = submission.grading as any;
    const auto = currentGrading?.autoGraded || {};

    // Listening va Readingni band scorega o'girish (taxminiy 40 talik tizimda)
    const lRaw = auto.listening?.score || 0;
    const rRaw = auto.reading?.score || 0;

    // Oddiy konvertatsiya (aslida IELTS jadvali murakkabroq, lekin bu mock uchun yetarli)
    const lBand = Math.min(9, Math.max(0, (lRaw / 40) * 9));
    const rBand = Math.min(9, Math.max(0, (rRaw / 40) * 9));

    const overall = calculateOverall(lBand, rBand, w, s);

    const updatedGrading = {
      ...currentGrading,
      writing: { feedback, score: w },
      speaking: { score: s },
      feedback: feedback
    };

    gradeMutation.mutate({
      id: selectedSessionId,
      grading: updatedGrading,
      scores: {
        writingScore: w.toString(),
        speakingScore: s.toString(),
        readingScore: lBand.toFixed(1),
        listeningScore: rBand.toFixed(1),
        overallBand: overall,
        status: 'graded'
      }
    });
  };

  if (sessionsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8 h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);

  return (
    <AdminLayout>
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        {/* Chap taraf: Studentlar ro'yxati */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Imtihon topshirganlar</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {sessions?.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSessionId === session.id ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{session.firstName} {session.lastName}</span>
                      <Badge variant={session.status === 'graded' ? 'default' : 'secondary'}>
                        {session.status === 'graded' ? 'Tekshirilgan' : 'Kutilmoqda'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">ID: {session.accessCode}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* O'ng taraf: Tekshirish paneli */}
        <Card className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
          {selectedSessionId ? (
            submissionLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <CardTitle>O'quvchi: {selectedSession?.firstName} {selectedSession?.lastName}</CardTitle>
                  <Button onClick={handleGrade} disabled={gradeMutation.isPending}>
                    {gradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Natijani saqlash
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-md font-bold mb-2">Writing Task Javobi:</h3>
                        <div className="p-4 rounded-md bg-slate-50 border whitespace-pre-wrap text-sm leading-relaxed">
                          {(submission?.answers as any)?.writing || "Insho yozilmagan."}
                        </div>
                      </section>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-blue-600">Writing Band (0-9)</label>
                          <Input type="number" min="0" max="9" step="0.5" value={writingScore} onChange={(e) => setWritingScore(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-blue-600">Speaking Band (0-9)</label>
                          <Input type="number" min="0" max="9" step="0.5" value={speakingScore} onChange={(e) => setSpeakingScore(e.target.value)} />
                        </div>
                      </div>

                      <section className="space-y-2">
                        <h3 className="text-sm font-bold">O'qituvchi Feedbacki:</h3>
                        <Textarea className="min-h-[120px]" placeholder="Feedback yozing..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                      </section>

                      <section className="p-4 border rounded-lg bg-green-50/50">
                        <h3 className="text-xs font-bold uppercase text-green-700 mb-3">Avtomatik hisoblangan (Listening & Reading):</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Listening To'g'ri javoblar</p>
                            <p className="text-lg font-bold">{(submission?.grading as any)?.autoGraded?.listening?.score || 0} / 40</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reading To'g'ri javoblar</p>
                            <p className="text-lg font-bold">{(submission?.grading as any)?.autoGraded?.reading?.score || 0} / 40</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-10 w-10 mb-2 opacity-20" />
              <p>Tekshirish uchun o'quvchini tanlang</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}