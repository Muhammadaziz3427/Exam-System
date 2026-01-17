import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge, Input } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, AlertOctagon, Mail, Flag, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ListeningComponent } from "@/components/ListeningComponent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function StudentExam() {
  // --- 1. HOOKLAR VA O'ZGARUVCHILAR ---
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  const [hasStarted, setHasStarted] = useState(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [examContent, setExamContent] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [email, setEmail] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [currentSection, setCurrentSection] = useState<'listening' | 'reading' | 'writing'>('listening');

  const [answers, setAnswers] = useState<any>({
    listening: {},
    reading: {},
    writing: ""
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [highlights, setHighlights] = useState<Record<number, string[]>>({});

  const startSession = useStartSession();
  const submitAnswers = useSubmitAnswers();
  const logViolation = useLogViolation();

  // --- 3. AUTO-SAVE ---
  useEffect(() => {
    if (!hasStarted) return;

    const autoSaveInterval = setInterval(() => {
      submitAnswers.mutate({ 
        id: sessionId, 
        answers, 
        isFinal: false,
        status: "active",
        currentSection,
        remainingTime: timeLeft
      });
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasStarted, answers, sessionId]);

  // --- 4. HIGHLIGHTING ---
  const handleHighlight = (passageId: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    setHighlights(prev => ({
      ...prev,
      [passageId]: [...(prev[passageId] || []), text]
    }));
    selection.removeAllRanges();
  };

  // --- 2. XAVFSIZLIK (LOCKDOWN) FUNKSIYALARI ---

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setViolationCount((prev: number) => {
        const newCount = prev + 1;
        logViolation.mutate({ id: sessionId, type: "tab_switch" });

        if (newCount >= 2) {
          handleCheatTermination("Tab switching (Cheating attempt)");
          return newCount;
        } else {
          alert("DIQQAT: Tabni almashtirish taqiqlanadi! Keyingi urinishda imtihon bekor qilinadi.");
          return newCount;
        }
      });
    }
  };

  const handleBlur = () => {
    if (hasStarted) {
      setViolationCount((prev: number) => {
        const newCount = prev + 1;
        logViolation.mutate({ id: sessionId, type: "window_blur" as any });

        if (newCount >= 2) {
          handleCheatTermination("Window Blur (Cheating attempt)");
          return newCount;
        } else {
          alert("STERN WARNING: Do not leave the exam window! This violation has been logged.");
          return newCount;
        }
      });
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && hasStarted) {
      setViolationCount((prev: number) => {
        const newCount = prev + 1;
        logViolation.mutate({ id: sessionId, type: "fullscreen_exit" });

        if (newCount >= 2) {
          handleCheatTermination("Exiting Fullscreen (Cheating attempt)");
          return newCount;
        } else {
          alert("DIQQAT: Fullscreen rejimidan chiqmang!");
          return newCount;
        }
      });
    }
  };

  const handleCheatTermination = async (reason: string) => {
    try {
      await submitAnswers.mutateAsync({ 
        id: sessionId, 
        answers: answers, 
        isFinal: true,
        status: "blocked", 
        notes: `Terminated due to: ${reason}`
      });
      cleanupAndExit(`Xavfsizlik qoidasi buzildi: ${reason}`);
    } catch (err) {
      setLocation("/");
    }
  };

  const cleanupAndExit = (message: string) => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen();
    localStorage.removeItem("student_session");
    alert(message);
    setLocation("/");
  };

  // --- 3. IMTIHONNI BOSHLASH ---
  const handleInitialClick = () => {
    if (!email || !email.includes("@")) {
      setShowEmailModal(true);
    } else {
      startExamFlow();
    }
  };

  const startExamFlow = async () => {
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      await document.documentElement.requestFullscreen();

      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      const exam = await examRes.json();

      // Check for saved state
      if (session.status === "in_progress") {
        const subRes = await fetch(`/api/sessions/${sessionId}/submission`);
        if (subRes.ok) {
          const submission = await subRes.json();
          setAnswers(submission.answers || { listening: {}, reading: {}, writing: "" });
        }
        if (session.currentSection) setCurrentSection(session.currentSection as any);
        if (session.remainingTime !== null) {
          setTimeLeft(session.remainingTime);
        } else {
          setTimeLeft(exam.timeLimit * 60);
        }
      } else {
        setTimeLeft(exam.timeLimit * 60);
      }

      setExamContent(exam.content);
      setHasStarted(true);
      setShowEmailModal(false);
    } catch (err) {
      alert("Testni boshlashda xatolik yuz berdi.");
    }
  };

  // --- 4. EFFEKTLAR (TIMER & LISTENERS) ---
  useEffect(() => {
    if (hasStarted) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("blur", handleBlur);
      document.addEventListener("fullscreenchange", handleFullscreenChange);

      // Real-time session status check
      const statusCheck = setInterval(async () => {
        try {
          const res = await fetch(`/api/sessions/${sessionId}`);
          if (res.ok) {
            const session = await res.json();
            if (session.status === "completed" || session.status === "blocked") {
              cleanupAndExit("Session Ended: The administrator has terminated this session.");
            }
          }
        } catch (err) {
          console.error("Status check failed", err);
        }
      }, 5000);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (currentSection === 'listening') {
              setCurrentSection('reading');
              setTimeLeft(3600); // Reset for next section or use actual exam limit
              return 3600;
            } else if (currentSection === 'reading') {
              setCurrentSection('writing');
              setTimeLeft(3600); // Reset for next section
              return 3600;
            } else {
              handleFinalSubmit(true);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        clearInterval(statusCheck);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("blur", handleBlur);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }
  }, [hasStarted, answers, currentSection]);

  const handleFinalSubmit = async (auto = false) => {
    await submitAnswers.mutateAsync({ 
      id: sessionId, 
      answers, 
      email,
      isFinal: true,
      status: "submitted" 
    });
    cleanupAndExit(auto ? "Vaqt tugadi! Imtihon topshirildi." : "Imtihon muvaffaqiyatli topshirildi.");
  };

  // --- 5. RENDER QISMI ---
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center space-y-6">
          <AlertOctagon className="mx-auto text-amber-500" size={48} />
          <h2 className="text-2xl font-bold">Secure Exam Environment</h2>
          <Button className="w-full py-6 text-lg" onClick={handleInitialClick}>
            Enter Fullscreen & Start
          </Button>

          <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="text-blue-600" size={20} /> Email manzilingiz
                </DialogTitle>
              </DialogHeader>
              <Input 
                placeholder="email@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <DialogFooter>
                <Button onClick={startExamFlow} disabled={!email.includes("@")}>Tasdiqlash</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-primary text-primary-foreground flex items-center justify-between px-6 shadow-xl border-b border-white/10 z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight">{email}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Assessment Section: {currentSection}</span>
          </div>
          {violationCount > 0 && (
            <Badge variant="destructive" className="animate-pulse shadow-lg border-white/20">
              Integrity Alert: {violationCount}
            </Badge>
          )}
        </div>

        <div className={`flex items-center gap-4 text-3xl font-bold px-6 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 shadow-inner ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          <Clock size={28} strokeWidth={2.5} />
          <span className="font-mono tabular-nums">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold px-6"
          onClick={() => handleFinalSubmit(false)}
        >
          Submit Examination
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentSection === 'listening' ? (
          <ListeningComponent 
            audioUrl={examContent?.listening?.audioUrl || ""} 
            onSectionComplete={() => setCurrentSection('reading')}
          />
        ) : currentSection === 'reading' ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} className="overflow-y-auto bg-card border-r">
              <div onMouseUp={() => handleHighlight(0)} className="max-w-4xl mx-auto p-12">
                <div className="mb-10 flex items-center justify-between border-b pb-6">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Reading Passage</h2>
                  <Badge variant="outline" className="font-bold uppercase tracking-widest text-xs">Section 2</Badge>
                </div>
                {examContent?.reading?.passages?.map((p: any, i: number) => (
                  <div key={i} className="mb-12">
                    <h3 className="text-2xl font-bold mb-6 text-foreground/80">{p.title}</h3>
                    <div className="relative">
                      <p className="reading-passage whitespace-pre-wrap">{p.content}</p>
                      <div className="mt-8 flex flex-wrap gap-2">
                        {highlights[i]?.map((h, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm font-medium rounded-lg">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="w-1.5 bg-border hover:bg-primary transition-colors" />
            <ResizablePanel defaultSize={50} className="overflow-y-auto bg-background/50">
              <div className="max-w-3xl mx-auto p-12">
                <div className="mb-10 border-b pb-6">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Questions</h2>
                </div>
                <div className="space-y-10">
                  {examContent?.reading?.passages?.map((p: any) => 
                    p.questions?.map((q: any) => (
                      <div key={q.id} className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start gap-4">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                            {q.id}
                          </span>
                          <div className="flex-1 space-y-6">
                            <p className="text-lg font-medium leading-relaxed text-foreground/90">{q.text}</p>
                            {q.type === 'mcq' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {q.options?.map((opt: string) => (
                                  <label key={opt} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border transition-all hover:border-primary group-hover:shadow-sm ${
                                    answers.reading[q.id] === opt 
                                      ? "bg-primary/5 border-primary ring-1 ring-primary" 
                                      : "bg-background hover:bg-secondary/20 border-border"
                                  }`}>
                                    <input 
                                      type="radio" 
                                      className="sr-only"
                                      name={`q-${q.id}`} 
                                      value={opt}
                                      checked={answers.reading[q.id] === opt}
                                      onChange={(e) => setAnswers({
                                        ...answers, 
                                        reading: { ...answers.reading, [q.id]: e.target.value }
                                      })}
                                    />
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      answers.reading[q.id] === opt ? "border-primary bg-primary" : "border-muted-foreground/30"
                                    }`}>
                                      {answers.reading[q.id] === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-base font-medium">{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <Input 
                                className="h-14 text-lg border-border focus:border-primary focus:ring-primary/20 bg-background/50 rounded-xl"
                                placeholder="Type your answer here..."
                                value={answers.reading[q.id] || ""}
                                onChange={(e) => setAnswers({
                                  ...answers, 
                                  reading: { ...answers.reading, [q.id]: e.target.value }
                                })}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-12 flex justify-center pb-12">
                  <Button size="lg" className="h-14 px-12 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setCurrentSection('writing')}>
                    Proceed to Writing Assessment
                  </Button>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : currentSection === 'writing' ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} className="overflow-y-auto bg-card">
              <div className="p-12 max-w-2xl mx-auto space-y-10">
                <div className="border-b pb-6">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Writing Tasks</h2>
                </div>
                <div className="space-y-8">
                  {examContent?.writing?.tasks?.map((t: any, i: number) => (
                    <div key={i} className="bg-background/80 p-8 rounded-2xl border border-border shadow-sm space-y-6">
                       <Badge className="px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full">Part {i+1}</Badge>
                       <p className="text-xl leading-relaxed text-foreground/90 font-medium italic">"{t.content}"</p>
                       <div className="h-1 w-20 bg-primary/20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="w-1.5 bg-border" />
            <ResizablePanel defaultSize={55} className="bg-background flex flex-col p-8">
               <div className="flex justify-between items-center mb-6 px-4">
                 <h3 className="font-bold text-muted-foreground uppercase tracking-[0.2em] text-xs">Examination Response Area</h3>
                 <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/20 text-primary font-bold px-4 py-2 rounded-xl text-sm">
                      Word Count: {answers.writing?.trim() ? answers.writing.trim().split(/\s+/).filter(Boolean).length : 0}
                    </Badge>
                 </div>
               </div>
               <div className="flex-1 rounded-3xl border border-primary/20 bg-card shadow-2xl overflow-hidden relative group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                 <Textarea 
                  className="h-full w-full p-10 text-xl leading-relaxed bg-transparent border-none focus-visible:ring-0 resize-none font-serif placeholder:text-muted-foreground/30 selection:bg-primary/10" 
                  placeholder="Your composition begins here..."
                  value={answers.writing}
                  spellCheck={false}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => setAnswers({...answers, writing: e.target.value})}
                 />
               </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full flex items-center justify-center flex-col space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="p-12 rounded-full bg-primary/5 border border-primary/10">
                <ShieldCheck size={80} className="text-primary opacity-20" />
             </div>
             <div className="text-center space-y-2">
               <h3 className="text-2xl font-bold text-foreground">Security Validation Complete</h3>
               <p className="text-muted-foreground italic">Transitioning to {currentSection} module...</p>
             </div>
             <Button size="lg" className="h-14 px-12 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setCurrentSection(currentSection === 'reading' ? 'writing' : 'writing')}>
               Resume Examination
             </Button>
          </div>
        )}
      </main>

      {/* Question Palette */}
      <footer className="h-24 bg-card border-t border-border/50 flex items-center px-10 gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
        <div className="flex items-center gap-6 border-r border-border/50 pr-8">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Answered</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">For Review</span>
             </div>
          </div>
        </div>

        <ScrollArea className="flex-1 h-16">
          <div className="flex gap-3 py-2 items-center">
            {Array.from({ length: 40 }).map((_, i) => {
              const qId = `q-${i + 1}`;
              const isAnswered = answers.listening[qId] || answers.reading[qId] || (currentSection === 'writing' && answers.writing.length > 50);
              const isFlagged = flaggedQuestions[qId];

              return (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-palette-${i + 1}`}
                        className={`w-11 h-11 p-0 font-bold rounded-xl transition-all duration-300 border-2 ${
                          isFlagged 
                            ? "bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-100 shadow-sm shadow-amber-200" 
                            : isAnswered 
                              ? "bg-primary/10 border-primary text-primary hover:bg-primary/20 shadow-sm shadow-primary/10" 
                              : "border-border hover:border-primary/30 hover:bg-secondary/20"
                        }`}
                        onClick={() => {
                          setFlaggedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
                        }}
                      >
                        {i + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-foreground text-background font-bold rounded-lg border-none shadow-xl">
                      <p>Item {i + 1} {isFlagged ? "• Flagged for Review" : ""}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-4 border-l border-border/50 pl-8">
           <Button 
            variant="ghost" 
            size="lg"
            className={`gap-3 font-bold rounded-2xl transition-all ${flaggedQuestions[`q-1`] ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "hover:bg-primary/5 text-muted-foreground hover:text-primary"}`}
            onClick={() => {
              const currentQ = `q-1`; // Simplified for now
              setFlaggedQuestions(prev => ({ ...prev, [currentQ]: !prev[currentQ] }));
            }}
          >
            <Flag size={20} className={flaggedQuestions[`q-1`] ? "fill-amber-500 text-amber-500" : ""} />
            Review Mark
          </Button>
        </div>
      </footer>
    </div>
  );
}