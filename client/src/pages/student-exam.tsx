import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  Plus,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ListeningComponent } from "@/components/ListeningComponent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; 
import { useToast } from "@/hooks/use-toast";

type Section = 'listening' | 'reading' | 'writing';

// LocalStorage kaliti
const STORAGE_KEY = "ielts_exam_backup_v1";

export default function StudentExam() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [hasStarted, setHasStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [examContent, setExamContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSession = useStartSession();
  const logViolation = useLogViolation();

  // --- Utility Functions ---

  const getImageUrl = (path: string) => {
    if (!path) return "";
    return path.startsWith('http') ? path : `/uploads/${path}`;
  };

  const scrollToQuestion = (qNum: number) => {
    // Scroll area ichidagi elementni topish
    const element = document.getElementById(`q-container-${qNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // --- Highlight Logic (Sariq rang) ---
  const handleTextHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    // Faqat Reading sectionda ishlashi uchun
    if (currentSection !== 'reading') return;

    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.backgroundColor = "#fde047"; // Yellow-300 (Tailwind)
      span.style.color = "#000";
      // Oddiy highlight qilish (faqat text node ichida bo'lsa)
      // Murakkab HTML strukturalarni buzmaslik uchun try-catch
      range.surroundContents(span);
      selection.removeAllRanges();
    } catch (e) {
      // Agar tanlov bir nechta blok elementlarni qamrab olsa, browser xato beradi.
      // Bunday holda biz shunchaki e'tiborsiz qoldiramiz yoki oddiy CSS selection ishlaydi.
      console.log("Highlight complex range skipped");
    }
  };

  // --- Camera Logic ---

  const checkCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: 15 } 
      });
      setStream(mediaStream);
      setCameraReady(true);
    } catch (err) {
      toast({ 
        title: "Camera Error", 
        description: "Imtihonni boshlash uchun kameraga ruxsat bering.", 
        variant: "destructive" 
      });
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasStarted, cameraReady]);

  // --- Security & Monitoring ---

  useEffect(() => {
    if (!hasStarted || !cameraReady) return;
    const pulseInterval = setInterval(() => {
      apiRequest("POST", `/api/sessions/${sessionId}/camera-pulse`, { isActive: true })
        .catch(() => {}); 
    }, 10000);
    return () => clearInterval(pulseInterval);
  }, [hasStarted, cameraReady, sessionId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted) {
        logViolation.mutate({ id: sessionId, type: "tab_switch" });
        toast({
          title: "DIQQAT: XAVFSIZLIK OGOHLANTIRISHI",
          description: "Tabni almashtirish taqiqlanadi.",
          variant: "destructive",
          duration: 3000
        });
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasStarted, sessionId, logViolation, toast]);

  // --- Timer Logic ---

  const setupSectionTimer = (section: Section, content: any) => {
    let minutes = 60; 
    if (section === 'listening') minutes = content?.listening?.duration || 30;
    if (section === 'reading') minutes = content?.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content?.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  };

  useEffect(() => {
    if (!hasStarted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSectionAutoTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, currentSection, timeLeft]);

  const handleSectionAutoTransition = () => {
    if (currentSection === 'listening') {
      setCurrentSection('reading');
      toast({ title: "Time's Up", description: "Moving to Reading section." });
    } else if (currentSection === 'reading') {
      setCurrentSection('writing');
      toast({ title: "Time's Up", description: "Moving to Writing section." });
    } else {
      handleFinalSubmit(true);
    }
  };

  useEffect(() => {
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent]);

  // --- Persistence ---
  const lastSavedAnswers = useRef(JSON.stringify(answers));

  useEffect(() => {
    if (hasStarted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }, [answers, hasStarted]);

  useEffect(() => {
    const autoSave = setInterval(() => {
      const currentAnswers = JSON.stringify(answers);
      if (hasStarted && currentAnswers !== lastSavedAnswers.current) {
        apiRequest("PATCH", `/api/sessions/${sessionId}/progress`, { answers })
          .catch(console.error);
        lastSavedAnswers.current = currentAnswers;
      }
    }, 20000); 
    return () => clearInterval(autoSave);
  }, [answers, hasStarted, sessionId]);

  // --- Submission & Finish ---

  const handleFinalSubmit = async (autoSubmit: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (autoSubmit) {
        toast({ title: "Vaqt tugadi", description: "Javoblar avtomatik yuborilmoqda..." });
      }

      await apiRequest("POST", `/api/sessions/${sessionId}/submit`, { 
        answers, 
        isFinal: true 
      });

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      localStorage.removeItem(STORAGE_KEY);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      toast({ 
        title: "Imtihon yakunlandi", 
        description: "Javoblar saqlandi. Bosh sahifaga yo'naltirilmoqda...",
        className: "bg-green-600 text-white",
        duration: 3000
      });

      // Bosh sahifaga yo'naltirish (Javoblarni ko'rsatmasdan)
      setTimeout(() => {
        setHasStarted(false); 
        setLocation("/"); 
      }, 2000);

    } catch (err) {
      setIsSubmitting(false);
      toast({ 
        title: "Xatolik", 
        description: "Javoblarni saqlashda muammo bo'ldi.", 
        variant: "destructive" 
      });
    }
  };

  // --- Init ---

  const startExamFlow = async () => {
    if (!email.includes("@")) {
        toast({ title: "Email xato", description: "To'g'ri email kiriting", variant: "destructive" });
        return;
    }
    setIsLoadingContent(true);
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) { console.warn("Fullscreen error"); }

      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      if (!examRes.ok) throw new Error("Exam content not found");
      const exam = await examRes.json();
      setExamContent(exam.content);

      const backup = localStorage.getItem(STORAGE_KEY);
      if (backup) {
         try { setAnswers(JSON.parse(backup)); } catch(e) {}
      }

      setupSectionTimer('listening', exam.content);
      setHasStarted(true);
    } catch (err) {
      toast({ title: "Xatolik", description: "Materiallarni yuklab bo'lmadi.", variant: "destructive" });
    } finally {
        setIsLoadingContent(false);
    }
  };

  const getWordCount = useMemo(() => {
     const text = activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2;
     if (!text) return 0;
     return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
  }, [answers.writingTask1, answers.writingTask2, activeWritingTask]);


  // --- Render Screens ---

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl border-t-8 border-[#2c3e50]">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">IELTS Mock Test</h1>
          <p className="text-slate-500 mb-6 text-sm">Xavfsizlik tizimi faol.</p>

          {!cameraReady ? (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
                <p className="text-slate-400 text-sm">Kamerani tekshirish...</p>
              </div>
              <Button className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700" onClick={checkCamera}>
                Kamerani ishga tushirish
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg relative">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-green-500 w-3 h-3 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <Input 
                placeholder="Email manzilingiz" 
                className="h-12 text-center text-lg rounded-xl border-2" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <Button 
                className="w-full h-14 text-lg font-bold bg-[#2c3e50] hover:bg-[#1a252f]" 
                onClick={startExamFlow} 
                disabled={!email.includes("@") || isLoadingContent}
              >
                {isLoadingContent ? <Loader2 className="animate-spin mr-2" /> : "Imtihonni Boshlash"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!examContent) {
      return (
        <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none font-sans" translate="no">
      {/* HEADER */}
      <header className="h-14 bg-[#e4e9f0] text-[#2c3e50] flex items-center justify-between px-6 z-50 shadow-sm shrink-0 border-b border-slate-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#2c3e50] font-bold text-sm uppercase tracking-tight">
            {currentSection === 'listening' && <Headphones size={18} className="text-blue-700"/>}
            {currentSection === 'reading' && <BookOpen size={18} className="text-blue-700"/>}
            {currentSection === 'writing' && <PenTool size={18} className="text-blue-700"/>}
            <span className="font-black">IELTS {currentSection}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-1 bg-white/50 p-1 rounded-md border border-slate-300">
            <button onClick={() => setZoom(Math.max(80, zoom - 10))} className="p-1 hover:bg-white rounded transition-colors text-slate-600"><Minus size={14}/></button>
            <span className="text-xs font-bold w-12 text-center text-slate-700">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1 hover:bg-white rounded transition-colors text-slate-600"><Plus size={14}/></button>
          </div>

          <div className={`flex items-center gap-3 px-8 py-1 rounded-md border-2 transition-all duration-300 ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-white border-blue-600 text-blue-700'}`}>
            <Clock size={20} strokeWidth={3} />
            <span className="font-mono text-2xl font-black tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <ShieldCheck size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tighter leading-tight">Secure<br/>Session</span>
          </div>
        </div>

        <Button variant="outline" size="sm" className="font-bold px-6 border-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
            onClick={() => { if(confirm("Tugatmoqchimisiz?")) handleFinalSubmit(); }}>
          Finish Test
        </Button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {currentSection === 'listening' ? (
          <ListeningComponent 
            content={examContent?.listening} 
            audioUrl={examContent?.listening?.audioUrl}
            onSectionComplete={() => setCurrentSection('reading')} 
            answers={answers.listening} 
            setAnswers={(val: any) => setAnswers({...answers, listening: val})} 
          />
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
            {/* LEFT PANEL: CONTENT (Reading Passage) */}
            <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100 min-w-[300px]">
              <div className="h-full flex flex-col">
                <div className="h-12 bg-slate-50 border-b flex items-center px-4 overflow-x-auto no-scrollbar shrink-0">
                  {currentSection === 'reading' ? (
                    <div className="flex gap-1">
                      {examContent?.reading?.passages?.map((_: any, idx: number) => (
                        <button 
                            key={`passage-btn-${idx}`} 
                            onClick={() => setActivePassageIdx(idx)} 
                            className={`px-6 h-12 text-xs font-black transition-all border-b-2 ${activePassageIdx === idx ? 'bg-white border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                          PASSAGE {idx + 1}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 1].map((idx) => (
                          <button 
                            key={`task-btn-${idx}`}
                            onClick={() => setActiveWritingTask(idx)} 
                            className={`px-6 h-12 text-xs font-black transition-all border-b-2 ${activeWritingTask === idx ? 'bg-white border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                        >
                            TASK {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 h-full">
                  {/* Highlight ishlaydigan joy: selection:bg-yellow-300 */}
                  <div 
                    className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-300 selection:text-black" 
                    style={{ fontSize: `${zoom}%` }}
                    onMouseUp={handleTextHighlight} 
                  >
                    {currentSection === 'reading' ? (
                      <article>
                        <h2 className="text-3xl font-black mb-8 text-slate-900 leading-tight">{examContent?.reading?.passages?.[activePassageIdx]?.title}</h2>
                        {examContent?.reading?.passages?.[activePassageIdx]?.image && (
                          <img 
                            src={getImageUrl(examContent.reading.passages[activePassageIdx].image)} 
                            alt="Visual" 
                            className="w-full mb-6 rounded-lg border shadow-sm"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                          {examContent?.reading?.passages?.[activePassageIdx]?.content}
                        </div>
                      </article>
                    ) : (
                      // WRITING CONTENT
                      <div className="space-y-8">
                          <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-100 relative">
                            <Badge className="absolute -top-3 left-6 bg-blue-600 border-none">Writing Task {activeWritingTask + 1}</Badge>
                            {examContent?.writing?.tasks?.[activeWritingTask]?.image && (
                              <img 
                                src={getImageUrl(examContent.writing.tasks[activeWritingTask].image)} 
                                alt="Task diagram" 
                                className="w-full mb-6 rounded-lg border shadow-sm bg-white p-2"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <p className="text-xl font-medium text-slate-800 italic leading-relaxed whitespace-pre-line">
                              {examContent?.writing?.tasks?.[activeWritingTask]?.content}
                            </p>
                          </div>
                          <div className="flex items-start gap-2 text-slate-500 text-sm">
                            <AlertTriangle size={16} />
                            <p>Eslatma: Javoblaringizni o'ng tomondagi maydonga yozing.</p>
                          </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 hover:bg-blue-500 transition-colors" />

            {/* RIGHT PANEL: QUESTIONS (Fixed Scrolling) */}
            <ResizablePanel defaultSize={55} className="bg-[#f8fafc] min-w-[300px]">
              <ScrollArea className="h-full">
                <div className="p-8 md:p-12 max-w-2xl mx-auto pb-32">
                  {currentSection === 'reading' ? (
                    <div className="space-y-6">
                      {/* Check if questions exist */}
                      {examContent?.reading?.passages?.[activePassageIdx]?.questions?.length > 0 ? (
                        examContent.reading.passages[activePassageIdx].questions.map((q: any, i: number) => {
                          const questionsBefore = examContent.reading.passages.slice(0, activePassageIdx).reduce((acc: number, curr: any) => acc + (curr.questions?.length || 0), 0);
                          const qGlobalIdx = questionsBefore + i + 1;
                          const qId = `q-${qGlobalIdx}`;

                          return (
                            <div key={qId} id={`q-container-${qGlobalIdx}`} className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-blue-200 group transition-all">
                              <div className="flex gap-4">
                                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">{qGlobalIdx}</span>
                                <div className="flex-1 space-y-4">
                                  <div className="font-bold text-slate-700" dangerouslySetInnerHTML={{ __html: q?.text || "Savol matni yo'q" }}></div>

                                  {/* Savol turiga qarab input chiqarish mumkin. Hozircha oddiy input */}
                                  <Input 
                                      className="h-12 text-lg border-2 focus:border-blue-500 bg-slate-50/50" 
                                      placeholder="Javobingiz..."
                                      value={answers.reading[qId] || ""} 
                                      onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [qId]: e.target.value}})} 
                                  />
                                </div>
                                <button 
                                  onClick={() => setReviewFlags({...reviewFlags, [qId]: !reviewFlags[qId]})}
                                  title="Flag for review"
                                >
                                  <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200 group-hover:text-slate-400"} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-slate-400 py-10">Ushbu matn uchun savollar yuklanmadi.</div>
                      )}
                    </div>
                  ) : (
                    // WRITING INPUT
                    <div className="h-full flex flex-col space-y-4">
                        <div className="flex justify-between items-center mb-2 sticky top-0 bg-[#f8fafc] py-2 z-10">
                          <h3 className="font-bold text-slate-700">Writing Response Area</h3>
                          <Badge className={`${getWordCount < (activeWritingTask === 0 ? 150 : 250) ? 'bg-orange-500' : 'bg-green-600'} px-4 py-1 font-mono text-sm border-none transition-colors`}>
                            WORDS: {getWordCount}
                          </Badge>
                        </div>
                        <Textarea 
                            className="min-h-[500px] p-8 text-xl leading-[1.8] font-serif border-2 border-slate-200 rounded-2xl focus:border-blue-600 shadow-inner bg-white resize-y" 
                            placeholder="Type your response here..."
                            value={activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2} 
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

      {/* FOOTER NAVIGATOR (Independent Scrolling Fix) */}
      <footer className="h-16 bg-white border-t flex items-center px-4 md:px-8 justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 shrink-0">
        <div className="flex items-center gap-6 shrink-0">
          <div className="w-12 h-8 bg-black rounded border border-white/20 overflow-hidden relative">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-4 overflow-hidden">
            {currentSection !== 'writing' && (
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 hidden md:block">Navigator</span>
                  {/* ScrollArea: Bu yerda 'orientation' atributini olib tashlaymiz */}
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-1.5 px-1 py-1">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const qNum = i + 1;
                        const qId = `q-${qNum}`;
                        const hasAns = (currentSection === 'reading' && answers.reading?.[qId]) || 
                                       (currentSection === 'listening' && answers.listening?.[qId]);
                        const isFlagged = reviewFlags[qId];

                        return (
                          <button 
                            key={`nav-q-${i}`} 
                            onClick={() => scrollToQuestion(qNum)} 
                            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold border-2 relative transition-colors
                              ${hasAns ? 'bg-[#2c3e50] border-[#2c3e50] text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400'}
                            `}
                          >
                            {qNum}
                            {isFlagged && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />}
                          </button>
                        );
                      })}
                    </div>
                    {/* ScrollBar: Bu yerda orientation="horizontal" qolishi shart */}
                    <ScrollBar orientation="horizontal" className="h-2" />
                  </ScrollArea>
                </div>
            )}
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded">
            <CheckCircle2 size={14} /> Saved
          </div>
          {currentSection !== 'writing' ? (
            <Button 
                className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md shadow-emerald-200" 
                onClick={() => setCurrentSection(currentSection === 'listening' ? 'reading' : 'writing')}
            >
              Next Section <ChevronRight className="ml-1" size={16}/>
            </Button>
          ) : (
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700 font-bold" 
                onClick={() => {
                    if (confirm("Testni yakunlaysizmi?")) handleFinalSubmit();
                }}
              >
                  Submit Exam
              </Button>
          )}
        </div>
      </footer>
      {/* FOOTER NAVIGATION (CDI STYLE) */}
      <footer className="h-14 bg-[#e4e9f0] border-t border-slate-300 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {Array.from({ length: 40 }).map((_, i) => {
            const qNum = i + 1;
            const qId = `q-${qNum}`;
            const isAnswered = answers.listening[qId] || answers.reading[qId];
            const isReview = reviewFlags[qId];
            
            return (
              <button
                key={qNum}
                onClick={() => scrollToQuestion(qNum)}
                className={`w-8 h-8 rounded-sm text-[10px] font-bold flex items-center justify-center transition-all border-b-2
                  ${isReview ? 'bg-orange-500 text-white border-orange-700 shadow-inner' : 
                    isAnswered ? 'bg-blue-700 text-white border-blue-900' : 
                    'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
              >
                {qNum}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-700 rounded-sm"/> Answered</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-300 rounded-sm"/> Unanswered</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded-sm"/> Review</div>
        </div>
      </footer>
    </div>
  );
}