import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Clock, Sun, Moon } from "lucide-react";
import type { ExamSession, Submission } from "@shared/schema";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
  
  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} data-testid="button-theme-toggle">
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userData = user?.user || user;
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
    meta: {
      headers: {
        "x-user-context": JSON.stringify(userData)
      }
    }
  } as any);

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
      await apiRequest("POST", `/api/sessions/${id}/grade`, { grading, scores });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Success", description: "Grading saved successfully" });
    },
  });

  const calculateOverall = (l: number, r: number, w: number, s: number) => {
    const avg = (l + r + w + s) / 4;
    // IELTS rounding: rounds to nearest 0.5
    return (Math.round(avg * 2) / 2).toFixed(1);
  };

  const handleGrade = () => {
    if (!selectedSessionId || !submission) return;
    
    const w = parseFloat(writingScore) || 0;
    const s = parseFloat(speakingScore) || 0;

    const grading = {
      ...submission.grading as any,
      writing: { feedback, score: w },
      speaking: { score: s },
      feedback: feedback
    };

    // Calculate band scores from auto-graded sections
    // Standard IELTS conversion approx: (raw / total) * 9
    const auto = grading.autoGraded || {};
    const l = (auto.listening?.score / (auto.listening?.total || 40)) * 9 || 0;
    const r = (auto.reading?.score / (auto.reading?.total || 40)) * 9 || 0;

    const overall = calculateOverall(l, r, w, s);

    gradeMutation.mutate({
      id: selectedSessionId,
      grading,
      scores: {
        writingScore: w.toString(),
        speakingScore: s.toString(),
        readingScore: l.toFixed(1),
        listeningScore: r.toFixed(1),
        overallBand: overall,
        status: 'graded'
      }
    });
  };

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 bg-background">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Teacher Portal</h1>
            </div>
            <ThemeToggle />
          </header>
          
          <main className="flex-1 overflow-hidden p-6">
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Sessions List */}
              <Card className="col-span-4 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle>Submissions</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      {sessions?.map((session) => (
                        <div
                          key={session.id}
                          data-testid={`card-session-${session.id}`}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedSessionId === session.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-accent"
                          }`}
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium" data-testid={`text-student-name-${session.id}`}>
                              {session.firstName} {session.lastName}
                            </span>
                            <Badge variant={session.status === 'graded' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {session.accessCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Grading Area */}
              <Card className="col-span-8 flex flex-col overflow-hidden">
                {selectedSessionId ? (
                  submissionLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                        <CardTitle>Grading: {selectedSession?.firstName} {selectedSession?.lastName}</CardTitle>
                        <Button 
                          data-testid="button-save-grades"
                          onClick={handleGrade}
                          disabled={gradeMutation.isPending}
                        >
                          {gradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Grades
                        </Button>
                      </CardHeader>
                      <CardContent className="flex-1 p-0">
                        <ScrollArea className="h-full p-6">
                          <div className="space-y-6 pb-20">
                            {/* Writing Content */}
                            <section>
                              <h3 className="text-lg font-semibold mb-2">Writing Essay</h3>
                              <div className="p-4 rounded-md bg-muted whitespace-pre-wrap min-h-[200px]" data-testid="text-essay-content">
                                {(submission?.answers as any)?.writing || "No essay submitted."}
                              </div>
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Writing Band Score (0-9)</label>
                                <Input 
                                  data-testid="input-writing-score"
                                  type="number" 
                                  min="0" 
                                  max="9" 
                                  step="0.5"
                                  value={writingScore}
                                  onChange={(e) => setWritingScore(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Speaking Band Score (0-9)</label>
                                <Input 
                                  data-testid="input-speaking-score"
                                  type="number" 
                                  min="0" 
                                  max="9" 
                                  step="0.5"
                                  value={speakingScore}
                                  onChange={(e) => setSpeakingScore(e.target.value)}
                                />
                              </div>
                            </div>

                            <section>
                              <h3 className="text-lg font-semibold mb-2">Teacher Feedback</h3>
                              <Textarea 
                                data-testid="input-feedback"
                                placeholder="Enter feedback for the student..."
                                className="min-h-[150px]"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                              />
                            </section>

                            {/* Auto Graded Results */}
                            <section className="p-4 border rounded-lg bg-muted/50">
                              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Automatic Scores</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Listening (Raw)</p>
                                  <p className="text-xl font-bold" data-testid="text-listening-score">
                                    {(submission?.grading as any)?.autoGraded?.listening?.score || 0} / {(submission?.grading as any)?.autoGraded?.listening?.total || 0}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Reading (Raw)</p>
                                  <p className="text-xl font-bold" data-testid="text-reading-score">
                                    {(submission?.grading as any)?.autoGraded?.reading?.score || 0} / {(submission?.grading as any)?.autoGraded?.reading?.total || 0}
                                  </p>
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
                    <Clock className="h-12 w-12 mb-4 opacity-20" />
                    <p>Select a student submission to begin grading</p>
                  </div>
                )}
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
