import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge, Input } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  ShieldCheck,
  Flag,
  Loader2,
  AlertTriangle,
  Headphones
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ReadingComponent } from "@/components/ReadingComponent";
import { ListeningComponent } from "@/components/ListeningComponent";

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

  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0, percent: 0 });
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const transferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useStartSession();
  const logViolation = useLogViolation();

  const listeningParts = examContent?.listening?.parts || [];
  const readingPassages = examContent?.reading?.passages || [];
  const writingTasks = examContent?.writing?.tasks || [];

  const listeningPartDefs = useMemo(() => {
    const counts = listeningParts.map((p: any) => p.questions?.length || 10);
    let start = 1;
    return counts.map((count: number, idx: number) => {
      const def = {
        partIndex: idx + 1,
        label: `Part ${idx + 1}`,
        start,
        end: start + count - 1,
        count,
      };
      start += count;
      return def;
    });
  }, [listeningParts]);

  const readingPartDefs = useMemo(() => {
    const counts = readingPassages.map((p: any) => p.questions?.length || 0);
    let start = 1;
    return counts.map((count: number, idx: number) => {
      const def = {
        partIndex: idx + 1,
        label: `Part ${idx + 1}`,
        start,
        end: start + count - 1,
        count,
      };
      start += count;
      return def;
    });
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
  }, [hasStarted, currentSection]);

  const handleSectionAutoTransition = () => {
    if (transferTimerRef.current) {
      clearInterval(transferTimerRef.current);
      transferTimerRef.current = null;
    }
    setIsTransferring(false);

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
    const audio = audioRef.current;
    if (!audio || !hasStarted || currentSection !== 'listening') return;

    const updateProgress = () => {
      setAudioProgress({
        currentTime: audio.currentTime,
        duration: audio.duration,
        percent: (audio.currentTime / audio.duration) * 100 || 0,
      });
    };

    const handleEnded = () => {
      setIsTransferring(true);
      setTransferTimeLeft(120);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
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

  const goToNextSection = () => {
    if (transferTimerRef.current) {
      clearInterval(transferTimerRef.current);
      transferTimerRef.current = null;
    }
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
    }
    setIsTransferring(false);
    handleSectionAutoTransition();
  };

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
            const partIndex = def.partIndex - 1;
            const qIdxInSection = q - def.start;
            const qId = examContent?.listening?.parts?.[partIndex]?.questions?.[qIdxInSection]?.id || `q-${def.partIndex}-${qIdxInSection + 1}`;
            const answer = answers.listening?.[qId];
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

          const flagKey = `${currentSection}-${q}`;
          const flagDot = btn.querySelector('.flag-dot');
          if (reviewFlags[flagKey]) {
            if (!flagDot) {
              const dot = document.createElement('span');
              dot.className = 'flag-dot';
              dot.style.position = 'absolute';
              dot.style.top = '-2px';
              dot.style.right = '-2px';
              dot.style.width = '8px';
              dot.style.height = '8px';
              dot.style.borderRadius = '50%';
              dot.style.backgroundColor = '#f97316';
              dot.style.border = '2px solid white';
              (btn as HTMLElement).style.position = 'relative';
              btn.appendChild(dot);
            }
          } else {
            if (flagDot) flagDot.remove();
          }
        }
      });

      partDefs.forEach((def: any) => {
        let answered = 0;
        for (let q = def.start; q <= def.end; q++) {
          if (currentSection === 'listening') {
            const partIndex = def.partIndex - 1;
            const qIdxInSection = q - def.start;
            const qId = examContent?.listening?.parts?.[partIndex]?.questions?.[qIdxInSection]?.id || `q-${def.partIndex}-${qIdxInSection + 1}`;
            if (answers.listening?.[qId] !== undefined && answers.listening[qId] !== '') answered++;
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
  }, [answers, currentSection, currentPartDefs, reviewFlags, examContent]);

  const calculateScores = () => {
    if (!examContent) return null;

    const listeningQuestions = listeningParts.flatMap((p: any) => p.questions || []);
    const readingQuestions = readingPassages.flatMap((p: any) => p.questions || []);

    let listeningCorrect = 0;
    let readingCorrect = 0;

    listeningParts.forEach((part: any, pIdx: number) => {
      part.questions?.forEach((q: any, qIdx: number) => {
        const qId = q.id || `q-${pIdx + 1}-${qIdx + 1}`;
        const userAnswer = answers.listening?.[qId];
        const correct = q.answer;
        if (userAnswer && correct) {
          if (userAnswer.toString().trim().toLowerCase() === correct.toString().trim().toLowerCase()) listeningCorrect++;
        }
      });
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
    handleFinalSubmit();
  };

  const getImageUrl = (path: string) => {
    if (!path) return "";
    return path.startsWith('http') ? path : `/uploads/${path}`;
  };

  const handleTextHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (currentSection !== 'reading') return;
    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.backgroundColor = "#fde047";
      span.style.color = "#000";
      range.surroundContents(span);
      selection.removeAllRanges();
    } catch (e) {}
  };

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
      <header className="header bg-white border-b px-6 h-[60px] flex items-center justify-between sticky top-0 z-50">
        <div className="timer-container">
          {currentSection !== 'listening' && (
            <div className="flex items-center gap-3">
              <div className={`px-4 py-1.5 rounded-full font-black text-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-widest text-[10px] font-black">
            {currentSection}
          </Badge>
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <Button
            size="sm"
            variant={currentSection === 'writing' ? 'default' : 'outline'}
            className="font-bold"
            onClick={currentSection === 'writing' ? handleFinishClick : goToNextSection}
          >
            {currentSection === 'writing' ? 'Finish Exam' : 'Next Section'}
          </Button>
        </div>
      </header>

      <main className="main-container bg-[#f4f7f9] flex-1 overflow-hidden" style={{ marginTop: '0' }}>
        <div className="h-full w-full">
          {currentSection === 'listening' ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-8 py-4 bg-white border-b shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Headphones size={20} className="text-blue-600" />
                    <span className="text-sm font-black uppercase tracking-wider">Listening Audio</span>
                  </div>
                  <audio 
                    ref={audioRef} 
                    src={getImageUrl(examContent?.listening?.audioUrl)} 
                    className="h-10 accent-blue-600"
                    controls
                  />
                </div>
                {isTransferring && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 animate-pulse">
                    <AlertTriangle size={18} />
                    <span className="text-sm font-black">TRANSFER TIME: {formatTime(transferTimeLeft)}</span>
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1 bg-[#f4f7f9]">
                <div className="max-w-4xl mx-auto py-10 px-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
                      <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 font-black px-3 py-1">
                        PART {currentPart} OF {listeningParts.length}
                      </Badge>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IELTS Computer Delivered</div>
                    </div>
                    <ListeningComponent
                      content={examContent?.listening}
                      currentPart={currentPart}
                      answers={answers.listening}
                      setAnswers={(newAnswers: any) => setAnswers((prev: any) => ({ ...prev, listening: newAnswers }))}
                      reviewFlags={reviewFlags}
                      setReviewFlags={setReviewFlags}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={45} className="bg-white border-r border-slate-200 min-w-[300px]">
                <ScrollArea className="h-full">
                  <div className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-300 selection:text-black" onMouseUp={handleTextHighlight}>
                    {currentSection === 'reading' ? (
                      <article>
                        <div className="mb-6 pb-6 border-b">
                          <p className="text-blue-600 font-black text-sm uppercase tracking-widest mb-1">Reading Passage {activePassageIdx + 1}</p>
                          <h2 className="text-3xl font-black text-slate-900 leading-tight">
                            {readingPassages[activePassageIdx]?.title}
                          </h2>
                        </div>
                        {readingPassages[activePassageIdx]?.image && (
                          <div className="mb-8 rounded-2xl overflow-hidden border shadow-lg ring-8 ring-slate-50">
                            <img src={getImageUrl(readingPassages[activePassageIdx].image)} alt="Visual" className="w-full h-auto" />
                          </div>
                        )}
                        <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                          {readingPassages[activePassageIdx]?.content}
                        </div>
                      </article>
                    ) : (
                      <div className="space-y-8">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-blue-600 font-black text-sm uppercase tracking-widest mb-2">Writing Task {activeWritingTask + 1}</p>
                          <p className="text-slate-600 font-bold italic">
                            {activeWritingTask === 0
                              ? "You should spend about 20 minutes on this task. Write at least 150 words."
                              : "You should spend about 40 minutes on this task. Write at least 250 words."}
                          </p>
                        </div>
                        
                        {writingTasks[activeWritingTask]?.prompt ? (
                          <div className="prose prose-slate max-w-none prose-xl font-serif text-slate-800" 
                               dangerouslySetInnerHTML={{ __html: writingTasks[activeWritingTask].prompt }} />
                        ) : (
                          <div className="text-xl font-serif text-slate-800 leading-relaxed">
                            {activeWritingTask === 0 ? (
                              <div className="space-y-6">
                                <p><strong>The provided chart illustrates the percentage of age of visitors from the UK to Spain in 1983 and in 2003.</strong></p>
                                <p><strong>Summarize the information by selecting and reporting the main points and make comparisons where relevant.</strong></p>
                                <img src="https://engnovatewebsitestorage.blob.core.windows.net/ielts-writing-task-1-images/a4139b6692197c1b" alt="Bar chart" className="max-w-full h-auto border rounded-xl shadow-sm" />
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <p><strong>Write about the following topic:</strong></p>
                                <div className="p-6 bg-white border-2 border-blue-100 rounded-2xl shadow-sm italic font-bold">
                                  In some countries, students pay their college or university fees, while in others, the government pays them. Do you think the advantages outweigh the disadvantages?
                                </div>
                                <p>Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle className="w-2 hover:bg-blue-500 transition-colors z-50" />

              <ResizablePanel defaultSize={55} className="bg-[#f8fafc] min-w-[300px]">
                <ScrollArea className="h-full">
                  <div className="p-8 md:p-12 max-w-2xl mx-auto pb-32">
                    {currentSection === 'reading' ? (
                      <ReadingComponent
                        passage={readingPassages[activePassageIdx]}
                        baseQNum={baseQNum}
                        answers={answers.reading}
                        setAnswers={(newReading) => setAnswers((prev: any) => ({ ...prev, reading: newReading }))}
                        reviewFlags={reviewFlags}
                        setReviewFlags={setReviewFlags}
                        currentSection="reading"
                      />
                    ) : (
                      <div className="h-full flex flex-col space-y-6">
                        <div className="flex justify-between items-center sticky top-0 bg-[#f8fafc]/80 backdrop-blur-sm py-4 z-10 border-b">
                          <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Response Area</h3>
                          <Badge className={`${getWordCount < (activeWritingTask === 0 ? 150 : 250) ? 'bg-orange-500' : 'bg-green-600'} px-4 py-1.5 font-mono text-xs border-none shadow-sm transition-all`}>
                            WORDS: {getWordCount}
                          </Badge>
                        </div>
                        <Textarea
                          className="min-h-[600px] p-10 text-xl leading-[1.8] font-serif border-2 border-slate-200 rounded-3xl focus:border-blue-600 shadow-inner bg-white resize-none transition-all outline-none"
                          placeholder="Type your response here..."
                          value={activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2}
                          spellCheck={false}
                          onChange={(e) => setAnswers((prev: any) => ({...prev, [activeWritingTask === 0 ? 'writingTask1' : 'writingTask2']: e.target.value}))}
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

      <nav className="nav-row bg-white border-t flex items-center h-[80px] px-4 overflow-x-auto gap-4" aria-label="Questions">
        {currentPartDefs.map((def: any) => (
          <div
            key={def.partIndex}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${currentPart === def.partIndex ? 'bg-blue-50 ring-1 ring-blue-100 shadow-sm' : 'hover:bg-slate-50'}`}
            data-section={currentSection}
            data-part-index={def.partIndex}
          >
            <button className="flex flex-col items-start min-w-[80px]" onClick={() => switchToPart(def.partIndex)}>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Part {def.partIndex}</span>
              <span className="attemptedCount text-xs text-slate-400 font-bold">0 of {def.count}</span>
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: def.end - def.start + 1 }, (_, i) => def.start + i).map((q: number) => (
                <button
                  key={q}
                  data-section={currentSection}
                  data-q={q}
                  className={`subQuestion w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all border-2 ${currentQuestion === q ? 'bg-slate-900 border-slate-900 text-white shadow-md transform -translate-y-0.5' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'}`}
                  onClick={() => goToQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
