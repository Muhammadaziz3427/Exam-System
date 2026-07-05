import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge, Input } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Play,
  Settings,
  FileText
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ListeningComponent } from "@/components/ListeningComponent";
import { ReadingComponent } from "@/components/ReadingComponent";

type Section = 'listening' | 'reading' | 'writing';

const STORAGE_KEY = "ielts_exam_backup_v1";

const calculateBand = (score: number): number => {
  if (score >= 39) return 9.0;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8.0;
  if (score >= 32) return 7.5;
  if (score >= 30) return 7.0;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6.0;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5.0;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4.0;
  if (score >= 8) return 3.5;
  if (score >= 6) return 3.0;
  if (score >= 4) return 2.5;
  if (score >= 2) return 2.0;
  if (score === 1) return 1.5;
  return 0;
};

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [currentSection, setCurrentSection] = useState<Section>('listening');
  const [timeLeft, setTimeLeft] = useState(0);
  const [email, setEmail] = useState("");
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [activeWritingTask, setActiveWritingTask] = useState(0);
  const [currentPart, setCurrentPart] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(1);

  const [answers, setAnswers] = useState<any>({
    listening: {},
    reading: {},
    writingTask1: "",
    writingTask2: ""
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [key in Section]?: number[] }>({
    listening: [],
    reading: [],
    writing: []
  });
  const [showTime, setShowTime] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const transferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useStartSession();
  const logViolation = useLogViolation();

  // Phase 2 UI States
  const [theme, setTheme] = useState<'standard' | 'dark' | 'yellow'>('standard');
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'xlarge'>('standard');
  const [showSettings, setShowSettings] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

  const [contextMenu, setContextMenu] = useState<{show: boolean, x: number, y: number}>({ show: false, x: 0, y: 0 });
  
  // Apply theme classes to root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-standard', 'theme-dark', 'theme-yellow', 'text-size-standard', 'text-size-large', 'text-size-xlarge');
    root.classList.add(`theme-${theme}`, `text-size-${fontSize}`);
  }, [theme, fontSize]);

  const listeningParts = examContent?.listening?.parts || [];
  const readingPassages = examContent?.reading?.passages || [];
  const writingTasks = examContent?.writing?.tasks || [];

  const listeningPartDefs = useMemo(() => {
    const counts = listeningParts.map((p: any) => p.questions?.length || 10);
    let start = 1;
    return counts.map((count: number, idx: number) => ({
      partIndex: idx + 1,
      label: `Part ${idx + 1}`,
      start,
      end: start + count - 1,
      count,
    }));
  }, [listeningParts]);

  const readingPartDefs = useMemo(() => {
    const counts = readingPassages.map((p: any) => p.questions?.length || 0);
    let start = 1;
    return counts.map((count: number, idx: number) => ({
      partIndex: idx + 1,
      label: `Part ${idx + 1}`,
      start,
      end: start + count - 1,
      count,
    }));
  }, [readingPassages]);

  const writingPartDefs = [
    { partIndex: 1, label: "Part 1", start: 1, end: 1, count: 1 },
    { partIndex: 2, label: "Part 2", start: 2, end: 2, count: 1 },
  ];

  const currentPartDefs = useMemo(() => {
    if (currentSection === 'listening') return listeningPartDefs;
    if (currentSection === 'reading') return readingPartDefs;
    return writingPartDefs;
  }, [currentSection, listeningPartDefs, readingPartDefs]);

  const switchToPart = (part: number) => {
    setCurrentPart(part);
    const def = currentPartDefs.find((d: any) => d.partIndex === part);
    if (def) {
      if (currentSection === 'reading') {
        setActivePassageIdx(part - 1);
      } else if (currentSection === 'writing') {
        setActiveWritingTask(part - 1);
      }
      goToQuestion(def.start);
    }
  };

  const goToQuestion = (qNum: number) => {
    setCurrentQuestion(qNum);
    const def = currentPartDefs.find((d: any) => qNum >= d.start && qNum <= d.end);
    if (def && def.partIndex !== currentPart) {
      setCurrentPart(def.partIndex);
      if (currentSection === 'reading') {
        setActivePassageIdx(def.partIndex - 1);
      } else if (currentSection === 'writing') {
        setActiveWritingTask(def.partIndex - 1);
      }
    }
    scrollToQuestion(qNum);
    updateActiveQuestionInNav(qNum);
  };

  const scrollToQuestion = (qNum: number) => {
    const element = document.getElementById(`q-container-${currentSection}-${qNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTimeout(() => {
        const retryElement = document.getElementById(`q-container-${currentSection}-${qNum}`);
        if (retryElement) {
          retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const updateActiveQuestionInNav = (qNum: number) => {
    document.querySelectorAll('.subQuestion').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.subQuestion[data-section="${currentSection}"][data-q="${qNum}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  };

  const setupSectionTimer = (section: Section, content: any) => {
    let minutes = 0;
    if (section === 'listening') {
      setTimeLeft(0);
      return;
    }
    if (section === 'reading') minutes = content?.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content?.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  };

  useEffect(() => {
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent]);

  useEffect(() => {
    if (!hasStarted || timeLeft <= 0 || currentSection === 'listening') return;
    if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    mainTimerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          if (mainTimerRef.current) clearInterval(mainTimerRef.current);
          handleSectionAutoTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    };
  }, [hasStarted, currentSection, timeLeft]);

  const handleSectionAutoTransition = () => {
    if (transferTimerRef.current) {
      clearInterval(transferTimerRef.current);
      transferTimerRef.current = null;
    }
    setIsTransferring(false);

    if (currentSection === 'listening') {
      setCurrentSection('reading');
      toast({ title: "Transfer Time Ended", description: "Moving to Reading section." });
    } else if (currentSection === 'reading') {
      setCurrentSection('writing');
      toast({ title: "Time's Up", description: "Moving to Writing section." });
    } else {
      setShowTimeUpModal(true);
      setTimeout(() => {
        setShowTimeUpModal(false);
        handleFinalSubmit(true);
      }, 4000);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasStarted || currentSection !== 'listening') return;

    const handleEnded = () => {
      setIsTransferring(true);
      setTransferTimeLeft(120);
      setAudioPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [hasStarted, currentSection]);

  useEffect(() => {
    if (!isTransferring) return;
    transferTimerRef.current = setInterval(() => {
      setTransferTimeLeft((prev: number) => {
        if (prev <= 1) {
          if (transferTimerRef.current) clearInterval(transferTimerRef.current);
          setIsTransferring(false);
          handleSectionAutoTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (transferTimerRef.current) clearInterval(transferTimerRef.current);
    };
  }, [isTransferring]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const updateNavIndicators = () => {
      const partDefs = currentPartDefs;
      partDefs.forEach((def: any) => {
        for (let q = def.start; q <= def.end; q++) {
          const btn = document.querySelector(`.subQuestion[data-section="${currentSection}"][data-q="${q}"]`);
          if (!btn) continue;

          let isAnswered = false;
          if (currentSection === 'listening') {
            const answer = answers.listening?.[q];
            isAnswered = answer !== undefined && answer !== null && answer !== '';
          } else if (currentSection === 'reading') {
            const answer = answers.reading?.[q];
            isAnswered = answer !== undefined && answer !== null && answer !== '';
          } else {
            const text = q === 1 ? answers.writingTask1 : answers.writingTask2;
            if (text) {
              const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
              const minWords = q === 1 ? 150 : 250;
              isAnswered = words >= minWords;
            }
          }

          if (isAnswered) {
            btn.classList.add('answered');
          } else {
            btn.classList.remove('answered');
          }
        }
      });

      partDefs.forEach((def: any) => {
        let answered = 0;
        for (let q = def.start; q <= def.end; q++) {
          if (currentSection === 'listening') {
            if (answers.listening?.[q] !== undefined && answers.listening[q] !== '') answered++;
          } else if (currentSection === 'reading') {
            if (answers.reading?.[q] !== undefined && answers.reading[q] !== '') answered++;
          } else {
            const text = q === 1 ? answers.writingTask1 : answers.writingTask2;
            if (text) {
              const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
              const minWords = q === 1 ? 150 : 250;
              if (words >= minWords) answered++;
            }
          }
        }
        const wrapper = document.querySelector(`.footer__questionWrapper___1tZ46[data-section="${currentSection}"][data-part-index="${def.partIndex}"]`);
        if (wrapper) {
          const countSpan = wrapper.querySelector('.attemptedCount');
          if (countSpan) {
            countSpan.textContent = `${answered} of ${def.count}`;
          }
        }
      });
    };

    updateNavIndicators();
  }, [answers, currentSection, currentPartDefs]);

  const calculateScores = () => {
    if (!examContent) return null;

    const listeningQuestions = listeningParts.flatMap((p: any) => p.questions || []);
    const readingQuestions = readingPassages.flatMap((p: any) => p.questions || []);

    let listeningCorrect = 0;
    let readingCorrect = 0;

    listeningQuestions.forEach((q: any, idx: number) => {
      const qNum = idx + 1;
      const userAnswer = answers.listening?.[qNum];
      const correct = q.answer;
      if (userAnswer && correct) {
        if (userAnswer.toString().trim().toLowerCase() === correct.toString().trim().toLowerCase()) listeningCorrect++;
      }
    });

    let readingGlobalBase = 1;
    for (let p = 0; p < readingPassages.length; p++) {
      const passageQuestions = readingPassages[p]?.questions || [];
      for (let qIdx = 0; qIdx < passageQuestions.length; qIdx++) {
        const globalNum = readingGlobalBase + qIdx;
        const userAnswer = answers.reading?.[globalNum];
        const correct = passageQuestions[qIdx]?.answer;
        if (userAnswer && correct) {
          if (userAnswer.toString().trim().toLowerCase() === correct.toString().trim().toLowerCase()) readingCorrect++;
        }
      }
      readingGlobalBase += passageQuestions.length;
    }

    const totalCorrect = listeningCorrect + readingCorrect;
    const overallBand = calculateBand(totalCorrect);

    return {
      listening: { correct: listeningCorrect, total: listeningQuestions.length },
      reading: { correct: readingCorrect, total: readingQuestions.length },
      overallBand
    };
  };

  const toggleReview = (qNum: number) => {
    setFlaggedQuestions(prev => {
      const sectionFlags = prev[currentSection] || [];
      if (sectionFlags.includes(qNum)) {
        return { ...prev, [currentSection]: sectionFlags.filter(q => q !== qNum) };
      } else {
        return { ...prev, [currentSection]: [...sectionFlags, qNum] };
      }
    });
  };

  const handleFinalSubmit = async (autoSubmit: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (autoSubmit) toast({ title: "Vaqt tugadi", description: "Javoblar avtomatik yuborilmoqda..." });

      const scores = calculateScores();

      await apiRequest("POST", `/api/sessions/${sessionId}/submit`, {
        answers,
        scores,
        isFinal: true
      });

      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      localStorage.removeItem(STORAGE_KEY);
      if (stream) stream.getTracks().forEach(track => track.stop());
      toast({
        title: "Imtihon yakunlandi",
        description: "Javoblar saqlandi. Natijalar email orqali yuboriladi. Bosh sahifaga yo'naltirilmoqda...",
        className: "bg-green-600 text-white",
        duration: 5000
      });
      setTimeout(() => { setHasStarted(false); setLocation("/"); }, 5000);
    } catch (err) {
      setIsSubmitting(false);
      toast({ title: "Xatolik", description: "Javoblarni saqlashda muammo bo'ldi.", variant: "destructive" });
    }
  };

  const handleFinishClick = () => {
    if (currentSection !== 'writing') {
      toast({ title: "Cannot finish yet", description: "You must complete all sections before finishing the test.", variant: "destructive" });
      return;
    }
    if (window.confirm("Imtihonni yakunlamoqchimisiz? Bu amalni qaytarib bo'lmaydi.")) {
      handleFinalSubmit();
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return "";
    return path.startsWith('http') ? path : `/uploads/${path}`;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (currentSection !== 'reading') return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.preventDefault();
      setContextMenu({ show: true, x: e.clientX, y: e.clientY });
    }
  };

  const applyHighlight = (remove: boolean = false) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setContextMenu({ show: false, x: 0, y: 0 });
      return;
    }
    
    try {
      if (remove) {
        document.execCommand('removeFormat', false, '');
      } else {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.className = "cdi-highlighted-text";
        range.surroundContents(span);
      }
      selection.removeAllRanges();
    } catch (e) {}
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  // Close context menu on outside click
  useEffect(() => {
    const closeMenu = () => setContextMenu(prev => ({...prev, show: false}));
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const checkCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 15 } });
      setStream(mediaStream);
      setCameraReady(true);
    } catch (err) {
      toast({ title: "Camera Error", description: "Imtihonni boshlash uchun kameraga ruxsat bering.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!hasStarted || !cameraReady) return;
    const pulseInterval = setInterval(() => {
      apiRequest("POST", `/api/sessions/${sessionId}/camera-pulse`, { isActive: true }).catch(() => {});
    }, 10000);
    return () => clearInterval(pulseInterval);
  }, [hasStarted, cameraReady, sessionId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted) {
        logViolation.mutate({ id: sessionId, type: "tab_switch" });
        toast({ title: "DIQQAT: XAVFSIZLIK OGOHLANTIRISHI", description: "Tabni almashtirish taqiqlanadi.", variant: "destructive", duration: 3000 });
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted) {
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasStarted, sessionId, logViolation, toast]);

  const lastSavedAnswers = useRef(JSON.stringify(answers));

  useEffect(() => {
    if (hasStarted) localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers, hasStarted]);

  useEffect(() => {
    const autoSave = setInterval(() => {
      const currentAnswers = JSON.stringify(answers);
      if (hasStarted && currentAnswers !== lastSavedAnswers.current) {
        apiRequest("PATCH", `/api/sessions/${sessionId}/progress`, { answers }).catch(console.error);
        lastSavedAnswers.current = currentAnswers;
      }
    }, 20000);
    return () => clearInterval(autoSave);
  }, [answers, hasStarted, sessionId]);

  const getWordCount = useMemo(() => {
    const text = activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2;
    if (!text) return 0;
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
  }, [answers.writingTask1, answers.writingTask2, activeWritingTask]);

  const baseQNum = readingPartDefs[activePassageIdx]?.start || 1;

  const startExamFlow = async () => {
    if (!email.includes("@")) {
      toast({ title: "Email xato", description: "To'g'ri email kiriting", variant: "destructive" });
      return;
    }
    setIsLoadingContent(true);
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) {}
      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      if (!examRes.ok) throw new Error("Exam content not found");
      const exam = await examRes.json();
      setExamContent(exam.content);
      const backup = localStorage.getItem(STORAGE_KEY);
      if (backup) { try { setAnswers(JSON.parse(backup)); } catch(e) {} }
      setupSectionTimer('listening', exam.content);
      setHasStarted(true);
    } catch (err) {
      toast({ title: "Xatolik", description: "Materiallarni yuklab bo'lmadi.", variant: "destructive" });
    } finally {
      setIsLoadingContent(false);
    }
  };

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

      {/* TIME UP MODAL */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl mx-4">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Vaqt tugadi!</h2>
            <p className="text-slate-500 mb-6">Imtihon avtomatik ravishda yuborilmoqda...</p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full animate-[shrink_4s_linear_forwards]" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      )}

      <header className="cdi-header">
        <div className="cdi-header-left">
          <div className="candidate-info">
            <span className="candidate-name">{email.split('@')[0]}</span>
          </div>
          <div className="test-info">
            <span className="test-name">IELTS {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}</span>
          </div>
        </div>
        <div className="cdi-header-center">
          {isTransferring ? (
            <div className="timer-block">
              <span className="timer-label text-amber-600">Transfer Time</span>
              <span className="timer-value text-amber-600">
                {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          ) : currentSection !== 'listening' ? (
            <div className="timer-block">
              {showTime ? (
                <span className={`timer-value ${timeLeft < 300 ? 'timer-flash text-red-600' : ''}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              ) : (
                <span className="timer-value text-slate-400">--:--</span>
              )}
              <div className="timer-controls">
                <button onClick={() => setShowTime(!showTime)} className="timer-toggle-btn">
                  {showTime ? 'Hide Time' : 'Show Time'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="cdi-header-right">
          {currentSection === 'listening' && (
            <button className="cdi-icon-btn" title="Volume">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            </button>
          )}
          {currentSection === 'reading' && (
            <button className="cdi-icon-btn" title="Notes" onClick={() => setShowNotes(!showNotes)}>
              <FileText size={20} />
            </button>
          )}
          <button className="cdi-icon-btn" title="Settings" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
          <button className="cdi-icon-btn" title="Help">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </button>
          {currentSection === 'writing' && (
            <button
              className="cdi-finish-btn"
              onClick={handleFinishClick}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Finish Exam"}
            </button>
          )}
        </div>
      </header>

      {/* SECTION TABS */}
      <div className="cdi-section-tabs-container">
        <div className="cdi-section-tabs">
          <div className={`cdi-tab ${currentSection === 'listening' ? 'active' : 'completed'}`}>
            Listening {currentSection !== 'listening' && '✓'}
          </div>
          <div className={`cdi-tab ${currentSection === 'reading' ? 'active' : (currentSection === 'writing' ? 'completed' : '')}`}>
            Reading {currentSection === 'writing' && '✓'}
          </div>
          <div className={`cdi-tab ${currentSection === 'writing' ? 'active' : ''}`}>
            Writing
          </div>
        </div>
      </div>

      {/* SETTINGS DROPDOWN */}
      {showSettings && (
        <div className="cdi-settings-dropdown">
          <h4>Settings</h4>
          <div className="cdi-settings-row">
            <label>Text size</label>
            <div className="cdi-settings-options">
              <button className={`cdi-setting-btn ${fontSize === 'standard' ? 'active' : ''}`} onClick={() => setFontSize('standard')}>Standard</button>
              <button className={`cdi-setting-btn ${fontSize === 'large' ? 'active' : ''}`} onClick={() => setFontSize('large')}>Large</button>
              <button className={`cdi-setting-btn ${fontSize === 'xlarge' ? 'active' : ''}`} onClick={() => setFontSize('xlarge')}>Extra Large</button>
            </div>
          </div>
          <div className="cdi-settings-row">
            <label>Colours</label>
            <div className="cdi-settings-options">
              <button className={`cdi-setting-btn ${theme === 'standard' ? 'active' : ''}`} onClick={() => setTheme('standard')}>Standard</button>
              <button className={`cdi-setting-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
              <button className={`cdi-setting-btn ${theme === 'yellow' ? 'active' : ''}`} onClick={() => setTheme('yellow')}>Yellow on Black</button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(false)} className="mt-2">OK</Button>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu.show && (
        <div className="cdi-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="cdi-context-menu-item" onClick={() => applyHighlight(false)}>
            Highlight
          </div>
          <div className="cdi-context-menu-item" onClick={() => applyHighlight(true)}>
            Clear Highlight
          </div>
        </div>
      )}

      {/* NOTES PANEL */}
      {showNotes && (
        <div className="cdi-notes-panel">
          <div className="cdi-notes-header">
            <span>Notes</span>
            <button className="cdi-notes-close" onClick={() => setShowNotes(false)}>×</button>
          </div>
          <textarea
            className="cdi-notes-textarea"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Type your notes here..."
            spellCheck={false}
          />
        </div>
      )}

      {/* HIDDEN AUDIO ELEMENT — always mounted while listening */}
      {currentSection === 'listening' && (
        <audio
          ref={audioRef}
          src={examContent?.listening?.audioUrl}
          preload="auto"
          style={{ display: 'none' }}
        />
      )}

      {/* AUDIO MODAL — full-screen dark overlay before audio starts (IELTS standard) */}
      {currentSection === 'listening' && showAudioModal && !isTransferring && (
        <div className="audio-modal-overlay">
          <div className="audio-modal-content">
            <div className="audio-modal-icon">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <p>Quloqchinlaringizni kiyib, "Audio boshlash" tugmasini bosing.</p>
            <p className="warning">⚠ Audio bir marta ijro etiladi va to'xtatib bo'lmaydi.</p>
            <button
              data-testid="button-play-audio"
              className="modal-play-btn"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.play().then(() => {
                    setAudioPlaying(true);
                    setShowAudioModal(false);
                  }).catch(() => {
                    setAudioPlaying(true);
                    setShowAudioModal(false);
                  });
                } else {
                  setShowAudioModal(false);
                }
              }}
            >
              ▶&nbsp; Audio boshlash
            </button>
          </div>
        </div>
      )}

      {/* AUDIO STATUS BAR — shown while audio is playing or transfer time */}
      {currentSection === 'listening' && !showAudioModal && (
        <div className="audio-player-container">
          {isTransferring ? (
            <div className="flex items-center justify-center gap-3 py-1 w-full">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-amber-600 font-bold text-sm">
                Audio tugadi — Javoblaringizni ko'rib chiqing. Qolgan vaqt: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-1 w-full">
              <div className="flex gap-1 items-end h-5">
                {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-600 rounded-full animate-pulse"
                    style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-blue-600 font-bold text-sm">Audio ijro etilmoqda — tabni yopmang</span>
            </div>
          )}
        </div>
      )}

      <main className="main-container" style={{ marginTop: (currentSection === 'listening' && !showAudioModal) ? '115px' : '60px' }}>
        <div className="left-panel" style={{ height: 'calc(100vh - 60px - 80px)', overflowY: 'auto' }}>
          {currentSection === 'listening' ? (
            <ListeningComponent
              content={examContent?.listening}
              currentPart={currentPart}
              answers={answers.listening}
              setAnswers={(updater: any) => {
                if (typeof updater === 'function') {
                  setAnswers((prev: any) => ({ ...prev, listening: updater(prev.listening) }));
                } else {
                  setAnswers((prev: any) => ({ ...prev, listening: updater }));
                }
              }}
            />
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
              <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100 min-w-[300px]">
                <div className="h-full flex flex-col">
                  <ScrollArea className="flex-1 h-full">
                    <div
                      className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-300 selection:text-black cdi-scaled-text"
                      onContextMenu={handleContextMenu}
                    >
                      {currentSection === 'reading' ? (
                        <article>
                          <div className="part-header mb-4">
                            <p><strong>Part {activePassageIdx + 1}</strong></p>
                            <p>
                              Read the text and answer questions{' '}
                              {activePassageIdx === 0 ? '1-13' : activePassageIdx === 1 ? '14-26' : '27-40'}.
                            </p>
                          </div>
                          <h2 className="text-3xl font-black mb-8 text-slate-900 leading-tight">
                            {readingPassages[activePassageIdx]?.title}
                          </h2>
                          {readingPassages[activePassageIdx]?.image && (
                            <img
                              src={getImageUrl(readingPassages[activePassageIdx].image)}
                              alt="Visual"
                              className="w-full mb-6 rounded-lg border shadow-sm"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div className="font-serif">
                            {readingPassages[activePassageIdx]?.content?.split(/\n\n+/).map((para: string, i: number) => (
                              <p key={i} className="mb-4">
                                <span className="cdi-paragraph-label">{String.fromCharCode(65 + i)}</span>
                                {para}
                              </p>
                            ))}
                          </div>
                        </article>
                      ) : (
                        <div className="space-y-8">
                          {writingTasks.map((task: any, idx: number) => (
                            <div
                              key={idx}
                              style={{ display: activeWritingTask === idx ? 'block' : 'none' }}
                            >
                              <div className="part-header">
                                <p><strong>Task {idx + 1}</strong></p>
                                <p>
                                  {idx === 0
                                    ? "You should spend about 20 minutes on this task. Write at least 150 words."
                                    : "You should spend about 40 minutes on this task. Write at least 250 words."}
                                </p>
                              </div>
                              <div className="task-prompt">
                                <p><strong>{task.content}</strong></p>
                                {task.image && (
                                  <div className="chart-container mt-4">
                                    <img
                                      src={task.image}
                                      alt={`Task ${idx + 1} diagram`}
                                      className="max-w-full h-auto border border-gray-300 mx-auto"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-start gap-2 text-slate-500 text-sm mt-4">
                                <AlertTriangle size={16} />
                                <p>Eslatma: Javoblaringizni o'ng tomondagi maydonga yozing.</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="w-2 hover:bg-blue-500 transition-colors" />

              <ResizablePanel defaultSize={55} className="bg-[#f8fafc] min-w-[300px]">
                <ScrollArea className="h-full">
                  <div className="p-8 md:p-12 max-w-2xl mx-auto pb-32">
                    {currentSection === 'reading' ? (
                      <ReadingComponent
                        passage={readingPassages[activePassageIdx]}
                        baseQNum={baseQNum}
                        answers={answers.reading}
                        setAnswers={(updater: any) => {
                          if (typeof updater === 'function') {
                            setAnswers((prev: any) => ({ ...prev, reading: updater(prev.reading) }));
                          } else {
                            setAnswers((prev: any) => ({ ...prev, reading: updater }));
                          }
                        }}
                      />
                    ) : (
                        <div className="h-full flex flex-col space-y-0">
                          <div className="flex justify-between items-center mb-2 sticky top-0 bg-[#f8fafc] py-2 z-10">
                            <h3 className="font-bold text-slate-700">Writing Response Area</h3>
                            <Badge className={`${getWordCount < (activeWritingTask === 0 ? 150 : 250) ? 'bg-orange-500' : 'bg-green-600'} px-4 py-1 font-mono text-sm border-none transition-colors`}>
                              WORDS: {getWordCount}
                            </Badge>
                          </div>
                          
                          <div className="cdi-writing-toolbar">
                            <button className="cdi-toolbar-btn" onClick={() => document.execCommand('cut')}>✂ Cut</button>
                            <button className="cdi-toolbar-btn" onClick={() => document.execCommand('copy')}>📋 Copy</button>
                            <button className="cdi-toolbar-btn" onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                document.execCommand('insertText', false, text);
                              } catch(e) {
                                document.execCommand('paste');
                              }
                            }}>📌 Paste</button>
                            <button className="cdi-toolbar-btn" onClick={() => document.execCommand('undo')}>↩ Undo</button>
                            <button className="cdi-toolbar-btn" onClick={() => document.execCommand('redo')}>↪ Redo</button>
                          </div>
                          
                          <Textarea
                            id="writing-textarea"
                            className="flex-1 p-8 text-xl leading-[1.8] font-serif border-2 border-slate-300 border-t-0 rounded-b-2xl focus:border-blue-600 focus:outline-none shadow-inner bg-white resize-y"
                            style={{ minHeight: '500px' }}
                            placeholder="Start writing your response here..."
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
        </div>
      </main>

      {currentSection === 'writing' ? (
        <div className="cdi-bottom-bar">
          <nav className="cdi-nav-row" aria-label="Questions">
            {writingPartDefs.map((def: any) => {
              const text = def.partIndex === 1 ? answers.writingTask1 : answers.writingTask2;
              const words = text ? text.trim().split(/\s+/).filter((w: string) => w.length > 0).length : 0;
              const minWords = def.partIndex === 1 ? 150 : 250;
              const isCompleted = words >= minWords;
              return (
                <button
                  key={def.partIndex}
                  className={`cdi-nav-btn ${currentPart === def.partIndex ? 'active' : ''} ${isCompleted ? 'answered' : ''}`}
                  onClick={() => switchToPart(def.partIndex)}
                >
                  {def.label}
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        <div className="cdi-bottom-bar">
          <div className="cdi-review-section">
            <label className="cdi-review-label">
              <input 
                type="checkbox" 
                checked={flaggedQuestions[currentSection]?.includes(currentQuestion) || false}
                onChange={() => toggleReview(currentQuestion)}
              />
              <span className="checkbox-text">Review</span>
            </label>
          </div>
          <nav className="cdi-nav-row" aria-label="Questions">
            {currentPartDefs.map((def: any) => (
              <div key={def.partIndex} className={`cdi-part-group footer__questionWrapper___1tZ46`} data-section={currentSection} data-part-index={def.partIndex}>
                <div className="cdi-part-header">
                  <span className="cdi-part-header-title">Part {def.partIndex}</span>
                  <span className="cdi-part-header-count attemptedCount">
                    0 of {def.count}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: def.end - def.start + 1 }, (_, i) => def.start + i).map((q: number) => {
                    const isFlagged = flaggedQuestions[currentSection]?.includes(q);
                    return (
                      <button
                        key={q}
                        data-section={currentSection}
                        data-q={q}
                        className={`cdi-nav-btn ${currentQuestion === q ? 'active' : ''} ${isFlagged ? 'flagged' : ''} scorable-item subQuestion`}
                        onClick={() => goToQuestion(q)}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="cdi-nav-arrows">
            <button className="cdi-arrow-btn" onClick={() => {
              if (currentQuestion > 1) goToQuestion(currentQuestion - 1);
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="cdi-arrow-btn" onClick={() => {
              const maxQ = currentPartDefs[currentPartDefs.length - 1]?.end || 40;
              if (currentQuestion < maxQ) goToQuestion(currentQuestion + 1);
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
