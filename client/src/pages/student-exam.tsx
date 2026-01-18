import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge, Input } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Clock, 
  ShieldCheck, 
  Headphones, 
  BookOpen, 
  PenTool, 
  Flag, 
  CheckCircle2, 
  ChevronRight,
  Minus,
  Plus 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ListeningComponent } from "@/components/ListeningComponent";
import { ScrollArea } from "@/components/ui/scroll-area"; 
import { useToast } from "@/hooks/use-toast";

type Section = 'listening' | 'reading' | 'writing';

export default function StudentExam() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [hasStarted, setHasStarted] = useState(false);
  const [examContent, setExamContent] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState<Section>('listening');
  const [timeLeft, setTimeLeft] = useState(0);
  const [email, setEmail] = useState("");

  // --- Qo'shimcha UI State-lar ---
  const [zoom, setZoom] = useState(100); 
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [activeWritingTask, setActiveWritingTask] = useState(0); 
  const [answers, setAnswers] = useState<any>({
    listening: {},
    reading: {},
    writingTask1: "",
    writingTask2: ""
  });
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  const startSession = useStartSession();
  const submitAnswers = useSubmitAnswers();
  const logViolation = useLogViolation();

  // Timer sozlamalari
  const setupSectionTimer = (section: Section, content: any) => {
    let minutes = 60; 
    if (section === 'listening') minutes = content.listening?.duration || 40;
    if (section === 'reading') minutes = content.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  };

  // Yakuniy topshirish
  const handleFinalSubmit = async (autoSubmit: boolean = false) => {
    if (autoSubmit) {
      console.log("Time is up. Submitting automatically...");
    }

    await submitAnswers.mutateAsync({ 
      id: sessionId, 
      answers, 
      email, 
      isFinal: true, 
      status: "submitted" 
    });
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    toast({ title: "Completed", description: "Your exam has been submitted." });
    setLocation("/");
  };

  // Avtomatik bo'limdan bo'limga o'tish
  const handleSectionAutoTransition = () => {
    if (currentSection === 'listening') setCurrentSection('reading');
    else if (currentSection === 'reading') setCurrentSection('writing');
    else handleFinalSubmit(true);
  };

  // Timer effekti
  useEffect(() => {
    if (!hasStarted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSectionAutoTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, timeLeft, currentSection]);

  useEffect(() => {
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent]);

  // Xavfsizlik: Tab o'zgarishini kuzatish
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted) {
        logViolation.mutate({ id: sessionId, type: "tab_switch" });
        toast({
          title: "SECURITY WARNING",
          description: "Tab switching is forbidden. This violation is recorded.",
          variant: "destructive"
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasStarted, sessionId, logViolation, toast]);

  // Avtomatik saqlash (20 soniya)
  const lastSavedAnswers = useRef(JSON.stringify(answers));
  useEffect(() => {
    const autoSave = setInterval(() => {
      const currentAnswers = JSON.stringify(answers);
      if (hasStarted && currentAnswers !== lastSavedAnswers.current) {
        apiRequest("PATCH", `/api/sessions/${sessionId}/progress`, { answers });
        lastSavedAnswers.current = currentAnswers;
      }
    }, 20000); 
    return () => clearInterval(autoSave);
  }, [answers, hasStarted, sessionId]);

  // Imtihonni boshlash oqimi
  const startExamFlow = async () => {
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      const exam = await examRes.json();

      setExamContent(exam.content);
      setupSectionTimer('listening', exam.content);
      setHasStarted(true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load exam.", variant: "destructive" });
    }
  };

  // Kirish ekrani
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-3xl max-w-lg w-full text-center shadow-2xl border-t-8 border-[#2c3e50]">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">IELTS Mock Test</h1>
          <p className="text-slate-500 mb-8 font-medium">Full-screen and monitored environment.</p>
          <Input 
            placeholder="Enter Candidate Email" 
            className="h-14 text-center text-lg mb-4 rounded-xl border-2" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <Button className="w-full h-16 text-xl font-bold bg-[#2c3e50] hover:bg-slate-800 rounded-xl" onClick={startExamFlow} disabled={!email.includes("@")}>
            Start Test
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none font-sans">
      <header className="h-14 bg-[#2c3e50] text-white flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-600 px-3 py-1 text-sm font-black uppercase tracking-tighter border-none">IELTS Official</Badge>
          <div className="h-4 w-[1px] bg-slate-600" />
          <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-widest">
            {currentSection === 'listening' && <Headphones size={14}/>}
            {currentSection === 'reading' && <BookOpen size={14}/>}
            {currentSection === 'writing' && <PenTool size={14}/>}
            {currentSection}
          </div>
        </div>

        {/* Zoom va Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md border border-white/10">
            <button onClick={() => setZoom(Math.max(80, zoom - 10))} className="p-1 hover:bg-white/10 rounded transition-colors"><Minus size={14}/></button>
            <span className="text-[10px] font-mono w-10 text-center font-bold">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1 hover:bg-white/10 rounded transition-colors"><Plus size={14}/></button>
          </div>

          <div className={`flex items-center gap-3 px-6 py-1.5 rounded-md border ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-black/20 border-white/10 text-blue-400'}`}>
            <Clock size={20} />
            <span className="font-mono text-2xl font-bold tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <Button variant="destructive" size="sm" className="font-bold px-6" onClick={() => confirm("Finish exam?") && handleFinalSubmit()}>
          Finish Test
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        {currentSection === 'listening' ? (
          <ListeningComponent 
            audioUrl={examContent?.listening?.audioUrl} 
            onSectionComplete={() => setCurrentSection('reading')} 
          />
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100">
              <div className="h-full flex flex-col">
                <div className="h-12 bg-slate-50 border-b flex items-center px-4">
                  {currentSection === 'reading' ? (
                    <div className="flex gap-1">
                      {examContent?.reading?.passages?.map((_: any, idx: number) => (
                        <button key={idx} onClick={() => setActivePassageIdx(idx)} className={`px-6 h-12 text-xs font-black transition-all ${activePassageIdx === idx ? 'bg-white border-t-4 border-t-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                          PASSAGE {idx + 1}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => setActiveWritingTask(0)} className={`px-6 h-12 text-xs font-black transition-all ${activeWritingTask === 0 ? 'bg-white border-t-4 border-t-blue-600 text-blue-600' : 'text-slate-400'}`}>TASK 1</button>
                      <button onClick={() => setActiveWritingTask(1)} className={`px-6 h-12 text-xs font-black transition-all ${activeWritingTask === 1 ? 'bg-white border-t-4 border-t-blue-600 text-blue-600' : 'text-slate-400'}`}>TASK 2</button>
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-200" style={{ fontSize: `${zoom}%` }}>
                    {currentSection === 'reading' ? (
                      <article>
                        <h2 className="text-3xl font-black mb-8 text-slate-900 leading-tight">{examContent?.reading?.passages[activePassageIdx]?.title}</h2>
                        <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                          {examContent?.reading?.passages[activePassageIdx]?.content}
                        </div>
                      </article>
                    ) : (
                      <div className="space-y-8">
                         <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-100 relative">
                            <Badge className="absolute -top-3 left-6 bg-blue-600 border-none">Writing Task {activeWritingTask + 1}</Badge>
                            {activeWritingTask === 0 && examContent?.writing?.tasks[0]?.image && (
                              <img src={examContent.writing.tasks[0].image} alt="Task diagram" className="w-full mb-6 rounded-lg border shadow-sm bg-white p-2" />
                            )}
                            <p className="text-xl font-medium text-slate-800 italic leading-relaxed">
                              "{examContent?.writing?.tasks[activeWritingTask]?.content}"
                            </p>
                         </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 hover:bg-blue-500 transition-colors" />

            <ResizablePanel defaultSize={55} className="bg-[#f8fafc]">
              <ScrollArea className="h-full">
                <div className="p-12 max-w-2xl mx-auto">
                  {currentSection === 'reading' ? (
                    <div className="space-y-6">
                      {examContent?.reading?.passages[activePassageIdx]?.questions?.map((q: any, i: number) => {
                        const qGlobalIdx = i + 1 + (activePassageIdx * 13);
                        const qId = `q-${qGlobalIdx}`;
                        return (
                          <div key={q.id} className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-blue-200 group">
                            <div className="flex gap-4">
                              <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">{qGlobalIdx}</span>
                              <div className="flex-1 space-y-4">
                                <p className="font-bold text-slate-700">{q.text}</p>
                                <Input 
                                  className="h-12 text-lg border-2 focus:border-blue-500 bg-slate-50/50" 
                                  value={answers.reading[qId] || ""}
                                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [qId]: e.target.value}})}
                                />
                              </div>
                              <button onClick={() => setReviewFlags({...reviewFlags, [qId]: !reviewFlags[qId]})}>
                                <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200 group-hover:text-slate-400"} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col space-y-4">
                       <div className="flex justify-between items-center mb-2">
                         <Badge className="bg-slate-900 px-4 py-1 font-mono text-sm border-none">
                            WORDS: {
                               activeWritingTask === 0 
                               ? (answers.writingTask1?.trim() ? answers.writingTask1.trim().split(/\s+/).length : 0)
                               : (answers.writingTask2?.trim() ? answers.writingTask2.trim().split(/\s+/).length : 0)
                            }
                         </Badge>
                       </div>
                       <Textarea 
                         className="min-h-[500px] p-10 text-xl leading-[1.8] font-serif border-2 border-slate-200 rounded-3xl focus:border-blue-600 shadow-inner bg-white resize-none"
                         placeholder="Type your essay..."
                         value={activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2}
                         onPaste={(e) => e.preventDefault()}
                         onContextMenu={(e) => e.preventDefault()}
                         onChange={(e) => {
                           const key = activeWritingTask === 0 ? 'writingTask1' : 'writingTask2';
                           setAnswers({...answers, [key]: e.target.value});
                         }}
                       />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      <footer className="h-16 bg-white border-t flex items-center px-8 justify-between shadow-sm z-50">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {Array.from({ length: 40 }).map((_, i) => {
              const qNum = i + 1;
              const qId = `q-${qNum}`;
              const hasAns = (currentSection === 'reading' && answers.reading[qId]) || 
                             (currentSection === 'listening' && answers.listening[qId]);
              const isFlagged = reviewFlags[qId];

              return (
                <div key={i} className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold border-2 relative transition-all ${
                  hasAns ? 'bg-[#2c3e50] border-[#2c3e50] text-white' : 'bg-white border-slate-100 text-slate-400'
                }`}>
                  {qNum}
                  {isFlagged && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase">
            <CheckCircle2 size={16} /> Saved
          </div>
          {currentSection !== 'writing' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => setCurrentSection(currentSection === 'listening' ? 'reading' : 'writing')}>
              Next Section <ChevronRight className="ml-2" size={16}/>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}