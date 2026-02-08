import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  const [cameraReady, setCameraReady] = useState(false);
  const [examContent, setExamContent] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [currentSection, setCurrentSection] = useState<Section>('listening');
  const [timeLeft, setTimeLeft] = useState(0);
  const [email, setEmail] = useState("");
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

  // URL generatsiyasi uchun xavfsiz funksiya
  const getResourceUrl = useCallback((path: string) => {
    if (!path) return "";
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\/+/, '');
    return `${window.location.origin}/${cleanPath.startsWith('uploads/') ? cleanPath : 'uploads/' + cleanPath}`;
  }, []);

  // READING NAVIGATSIYASI (MUKAMMAL)
  const scrollToQuestion = useCallback((qNum: number) => {
    if (currentSection === 'reading' && examContent?.reading?.passages) {
      let cumulativeQuestions = 0;
      let targetPassageIdx = 0;

      // Savol qaysi passage'da ekanini topish
      for (let i = 0; i < examContent.reading.passages.length; i++) {
        const qCount = examContent.reading.passages[i].questions?.length || 13;
        if (qNum <= cumulativeQuestions + qCount) {
          targetPassageIdx = i;
          break;
        }
        cumulativeQuestions += qCount;
      }

      // Agar boshqa passage bo'lsa, unga o'tish
      if (activePassageIdx !== targetPassageIdx) {
        setActivePassageIdx(targetPassageIdx);
      }

      // DOM render bo'lishi uchun kichik delay bilan scroll qilish
      setTimeout(() => {
        const element = document.getElementById(`q-container-${qNum}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      const element = document.getElementById(`q-container-${qNum}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSection, examContent, activePassageIdx]);

  const checkCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraReady(true);
    } catch (err) {
      toast({ title: "Camera Error", description: "Iltimos, kameraga ruxsat bering!", variant: "destructive" });
    }
  };

  const setupSectionTimer = useCallback((section: Section, content: any) => {
    let minutes = 60; 
    if (section === 'listening') minutes = content?.listening?.duration || 40;
    if (section === 'reading') minutes = content?.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content?.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  }, []);

  const handleFinalSubmit = async (autoSubmit: boolean = false) => {
    try {
      if (autoSubmit) toast({ title: "Vaqt tugadi", description: "Javoblar yuborilmoqda..." });

      await submitAnswers.mutateAsync({ 
        id: sessionId, 
        answers, 
        email, 
        isFinal: true, 
        status: "submitted" 
      });

      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setHasStarted(false);
      setLocation("/"); 
    } catch (err) {
      toast({ title: "Xatolik", description: "Saqlashda muammo yuz berdi.", variant: "destructive" });
    }
  };

  const handleSectionAutoTransition = useCallback(() => {
    if (currentSection === 'listening') setCurrentSection('reading');
    else if (currentSection === 'reading') setCurrentSection('writing');
    else handleFinalSubmit(true);
  }, [currentSection]);

  // Timer useEffect
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
  }, [hasStarted, timeLeft, handleSectionAutoTransition]);

  // Section Timer Trigger
  useEffect(() => {
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent, setupSectionTimer]);

  // Visibility Check (Tab Switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted) {
        logViolation.mutate({ id: sessionId, type: "tab_switch" });
        toast({ title: "DIQQAT!", description: "Boshqa tabga o'tish taqiqlangan!", variant: "destructive" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasStarted, sessionId, logViolation, toast]);

  // Auto-save logic
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

  const startExamFlow = async () => {
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      const exam = await examRes.json();
      setExamContent(exam.content);
      setupSectionTimer('listening', exam.content);
      setHasStarted(true);
    } catch (err) {
      toast({ title: "Xatolik", description: "Imtihon ma'lumotlarini yuklashda xato.", variant: "destructive" });
    }
  };

  // Word Count Helper
  const getWordCount = (text: string) => text?.trim() ? text.trim().split(/\s+/).length : 0;

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl border-t-8 border-[#2c3e50]">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">IELTS Mock Test</h1>
          <p className="text-slate-500 mb-6 text-sm">Security monitor is active. Camera access required.</p>
          {!cameraReady ? (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
                <p className="text-slate-400 text-sm">Kamera kutilmoqda...</p>
              </div>
              <Button className="w-full h-14 text-lg font-bold bg-blue-600" onClick={checkCamera}>Kamerani yoqish</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              <Input placeholder="Candidate Email Address" className="h-12 text-center text-lg rounded-xl border-2" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button className="w-full h-14 text-lg font-bold bg-[#2c3e50]" onClick={startExamFlow} disabled={!email.includes("@")}>Testni boshlash</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none font-sans" onContextMenu={(e) => e.preventDefault()} translate="no">
      <header className="h-14 bg-[#2c3e50] text-white flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-600 px-3 py-1 text-sm font-black uppercase tracking-tighter border-none">IELTS Test Room</Badge>
          <div className="h-4 w-[1px] bg-slate-600" />
          <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-widest">
            {currentSection === 'listening' && <Headphones size={14}/>}
            {currentSection === 'reading' && <BookOpen size={14}/>}
            {currentSection === 'writing' && <PenTool size={14}/>}
            {currentSection}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md border border-white/10">
            <button onClick={() => setZoom(Math.max(80, zoom - 10))} className="p-1 hover:bg-white/10 rounded transition-colors"><Minus size={14}/></button>
            <span className="text-[10px] font-mono w-10 text-center font-bold">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1 hover:bg-white/10 rounded transition-colors"><Plus size={14}/></button>
          </div>

          <div className={`flex items-center gap-3 px-6 py-1.5 rounded-md border transition-colors ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-black/20 border-white/10 text-blue-400'}`}>
            <Clock size={20} />
            <span className="font-mono text-2xl font-bold tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <Button variant="destructive" size="sm" className="font-bold px-6" onClick={() => confirm("Finish test?") && handleFinalSubmit()}>Finish</Button>
      </header>

      <main className="flex-1 overflow-hidden">
        {currentSection === 'listening' ? (
          <ListeningComponent 
            audioUrl={getResourceUrl(examContent?.listening?.audioUrl)} 
            onSectionComplete={() => setCurrentSection('reading')} 
            answers={answers}
            setAnswers={setAnswers}
            examContent={examContent}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100">
              <div className="h-full flex flex-col">
                <div className="h-12 bg-slate-50 border-b flex items-center px-4">
                  {currentSection === 'reading' ? (
                    <div className="flex gap-1">
                      {examContent?.reading?.passages?.map((_: any, idx: number) => (
                        <button key={`p-tab-${idx}`} onClick={() => setActivePassageIdx(idx)} className={`px-6 h-12 text-xs font-black transition-all ${activePassageIdx === idx ? 'bg-white border-t-4 border-t-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
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
                  <div className="p-12 max-w-3xl mx-auto" style={{ fontSize: `${zoom}%` }}>
                    {currentSection === 'reading' ? (
                      <article>
                        <h2 className="text-3xl font-black mb-8 text-slate-900 leading-tight">{examContent?.reading?.passages?.[activePassageIdx]?.title}</h2>
                        {examContent?.reading?.passages?.[activePassageIdx]?.image && (
                          <div className="w-full mb-8 rounded-2xl border-4 border-slate-100 shadow-sm bg-white p-4">
                            <img src={getResourceUrl(examContent.reading.passages[activePassageIdx].image)} className="w-full h-auto object-contain rounded-lg" alt="Visual" />
                          </div>
                        )}
                        <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">{examContent?.reading?.passages?.[activePassageIdx]?.content}</div>
                      </article>
                    ) : (
                      <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-100 relative">
                        <Badge className="absolute -top-3 left-6 bg-blue-600">Writing Task {activeWritingTask + 1}</Badge>
                        {activeWritingTask === 0 && examContent?.writing?.tasks?.[0]?.image && (
                          <div className="w-full mb-6 rounded-lg border shadow-sm bg-white p-2">
                            <img src={getResourceUrl(examContent.writing.tasks[0].image)} className="w-full h-auto object-contain" alt="Task diagram" />
                          </div>
                        )}
                        <p className="text-xl font-medium text-slate-800 italic leading-relaxed">"{examContent?.writing?.tasks?.[activeWritingTask]?.content}"</p>
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
                  {currentSection === 'reading' && (
                    <div className="space-y-6">
                      {examContent?.reading?.passages?.[activePassageIdx]?.questions?.map((q: any, i: number) => {
                        // Global indeks hisoblash (IELTS 1-40)
                        let qGlobalIdx = 1;
                        for (let pIdx = 0; pIdx < activePassageIdx; pIdx++) {
                          qGlobalIdx += examContent.reading.passages[pIdx].questions?.length || 0;
                        }
                        qGlobalIdx += i;
                        const qId = `q-${qGlobalIdx}`;

                        return (
                          <div key={qId} id={`q-container-${qGlobalIdx}`} className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-blue-200">
                            <div className="flex gap-4">
                              <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">{qGlobalIdx}</span>
                              <div className="flex-1 space-y-4">
                                <p className="font-bold text-slate-700">{q?.text || "Question"}</p>
                                <Input 
                                  className="h-12 text-lg border-2 focus:border-blue-500 bg-slate-50/50" 
                                  value={answers.reading[qId] || ""}
                                  onChange={(e) => setAnswers({
                                    ...answers, 
                                    reading: {...answers.reading, [qId]: e.target.value}
                                  })}
                                />
                              </div>
                              <button onClick={() => setReviewFlags({...reviewFlags, [qId]: !reviewFlags[qId]})}>
                                <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {currentSection === 'writing' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Badge className="bg-slate-900 px-4 py-1 font-mono text-sm">
                          WORDS: {activeWritingTask === 0 ? getWordCount(answers.writingTask1) : getWordCount(answers.writingTask2)}
                        </Badge>
                      </div>
                      <Textarea 
                        className="min-h-[500px] p-10 text-xl leading-[1.8] font-serif border-2 rounded-3xl focus:border-blue-600 shadow-inner bg-white resize-none"
                        placeholder="Compose your response here..."
                        value={activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2}
                        onPaste={(e) => e.preventDefault()}
                        spellCheck={false}
                        onChange={(e) => setAnswers({...answers, [activeWritingTask === 0 ? 'writingTask1' : 'writingTask2']: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      <footer className="h-16 bg-white border-t flex items-center px-8 justify-between z-50">
        <div className="w-12 h-8 bg-black rounded border border-white/20 overflow-hidden shrink-0">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </div>

        <div className="flex items-center gap-3 overflow-hidden mx-4 flex-1 justify-center">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 scroll-smooth">
            {Array.from({ length: 40 }).map((_, i) => {
              const qNum = i + 1;
              const qId = `q-${qNum}`;
              const hasAns = (currentSection === 'reading' && answers.reading?.[qId]) || 
                             (currentSection === 'listening' && answers.listening?.[qId]);

              return (
                <button 
                  key={`nav-${qNum}`} 
                  onClick={() => scrollToQuestion(qNum)} 
                  className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold border-2 relative transition-all active:scale-90 ${
                    hasAns ? 'bg-[#2c3e50] border-[#2c3e50] text-white' : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  {qNum}
                  {reviewFlags[qId] && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase">
            <CheckCircle2 size={16} /> Auto-Saved
          </div>
          {currentSection !== 'writing' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCurrentSection(currentSection === 'listening' ? 'reading' : 'writing')}>
              Next <ChevronRight size={16}/>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}