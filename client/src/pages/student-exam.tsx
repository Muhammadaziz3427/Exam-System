import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge, Input } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, AlertOctagon, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ListeningComponent } from "@/components/ListeningComponent";

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

  const startSession = useStartSession();
  const submitAnswers = useSubmitAnswers();
  const logViolation = useLogViolation();

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

      setExamContent(exam.content);
      setTimeLeft(exam.timeLimit * 60);
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
      document.addEventListener("fullscreenchange", handleFullscreenChange);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinalSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }
  }, [hasStarted, answers]);

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
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="font-bold text-blue-400">{email}</span>
            <span className="text-xs opacity-50 uppercase tracking-tighter">Section: {currentSection}</span>
          </div>
          {violationCount > 0 && (
            <Badge variant="destructive" className="animate-bounce">
              Violations: {violationCount}
            </Badge>
          )}
        </div>

        <div className={`flex items-center gap-3 text-2xl font-mono px-4 py-1 rounded bg-slate-800 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
          <Clock size={24} />
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>

        <Button variant="destructive" size="sm" onClick={() => handleFinalSubmit(false)}>Finish Test</Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentSection === 'listening' ? (
          <ListeningComponent 
            audioUrl={examContent?.listening?.audioUrl || ""} 
            onSectionComplete={() => setCurrentSection('reading')}
          />
        ) : currentSection === 'writing' ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} className="p-8 overflow-y-auto bg-white">
              <h2 className="text-2xl font-bold mb-6">Writing Task</h2>
              {examContent?.writing?.tasks?.map((t: any, i: number) => (
                <div key={i} className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-xl border mb-4 shadow-sm">
                   <Badge className="mb-2">Task {i+1}</Badge>
                   <p className="text-lg leading-relaxed">{t.content}</p>
                </div>
              ))}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} className="p-8 bg-slate-100 flex flex-col">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 uppercase tracking-widest">Your Answer</h3>
                 <Badge variant="outline" className="bg-white">
                   Words: {answers.writing.trim().split(/\s+/).filter(Boolean).length}
                 </Badge>
               </div>
               <Textarea 
                className="flex-1 p-6 text-lg shadow-inner bg-white focus:ring-2 focus:ring-blue-500 resize-none" 
                placeholder="Start typing your essay here..."
                value={answers.writing}
                onChange={(e) => setAnswers({...answers, writing: e.target.value})}
               />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full flex items-center justify-center flex-col space-y-4">
             <p className="text-slate-500 italic">Currently in {currentSection} section...</p>
             <Button size="lg" onClick={() => setCurrentSection(currentSection === 'reading' ? 'writing' : 'writing')}>
               Go to Next Section
             </Button>
          </div>
        )}
      </main>
    </div>
  );
}