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
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Section = 'listening' | 'reading' | 'writing';

const STORAGE_KEY = "ielts_exam_backup_v1";

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

// IELTS band conversion
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
  const [activePassageIdx, setActivePassageIdx] = useState(0); // for reading passages (0-based)
  const [activeWritingTask, setActiveWritingTask] = useState(0); // 0 for Task 1, 1 for Task 2
  const [currentPart, setCurrentPart] = useState(1); // part index within current section (1-based)
  const [currentQuestion, setCurrentQuestion] = useState(1); // global question number (1-40)

  // Answers store: listening: { [globalQNum: number]: any }, reading: { [globalQNum: number]: any }, writingTask1, writingTask2
  const [answers, setAnswers] = useState<any>({
    listening: {},
    reading: {},
    writingTask1: "",
    writingTask2: ""
  });

  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({}); // flags for listening and reading questions, key: `${section}-${globalQNum}`

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio progress
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0, percent: 0 });

  // Transfer time after listening
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const transferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useStartSession();
  const logViolation = useLogViolation();

  // ---------- Data preparation ----------
  const listeningParts = examContent?.sections?.listening?.parts || [];
  const readingPassages = examContent?.sections?.reading?.passages || [];
  const writingTasks = examContent?.sections?.writing?.tasks || [];

  // For bottom navigation, we need part definitions for each section
  // Listening: assume each part has 10 questions (or actual from examContent)
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

  // Reading: each passage has its own questions (1-13,14-26,27-40)
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

  // Writing: two tasks, each considered one "question" for navigation
  const writingPartDefs = [
    { partIndex: 1, label: "Part 1", start: 1, end: 1, count: 1 },
    { partIndex: 2, label: "Part 2", start: 2, end: 2, count: 1 },
  ];

  // Current part definitions based on section
  const currentPartDefs = useMemo(() => {
    if (currentSection === 'listening') return listeningPartDefs;
    if (currentSection === 'reading') return readingPartDefs;
    return writingPartDefs;
  }, [currentSection, listeningPartDefs, readingPartDefs]);

  // ---------- Navigation helpers ----------
  const switchToPart = (part: number) => {
    setCurrentPart(part);
    const def = currentPartDefs.find((d: any) => d.partIndex === part);
    if (def) {
      // Also update active passage/task index
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
    // Find which part contains this question
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

  // ---------- Timer logic ----------
  const setupSectionTimer = (section: Section, content: any) => {
    let minutes = 0;
    if (section === 'listening') {
      setTimeLeft(0);
      return;
    }
    if (section === 'reading') minutes = content?.sections?.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content?.sections?.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  };

  useEffect(() => {
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent]);

  // Main timer effect for reading and writing only
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

  // Audio ended => start transfer
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

  // Transfer countdown
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

  // Early next section
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

  // ---------- Bottom navigation indicator update ----------
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
  }, [answers, currentSection, currentPartDefs, reviewFlags]);

  // ---------- Score calculation ----------
  const calculateScores = () => {
    if (!examContent) return null;

    const listeningQuestions = listeningParts.flatMap((p: any) => p.questions || []);
    const readingQuestions = readingPassages.flatMap((p: any) => p.questions || []);

    let listeningCorrect = 0;
    let readingCorrect = 0;

    listeningQuestions.forEach((q: any, idx: number) => {
      const qNum = idx + 1;
      const userAnswer = answers.listening?.[qNum];
      const correct = q.correctAnswer;
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
        const correct = passageQuestions[qIdx]?.correctAnswer;
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

  // ---------- Helper functions ----------
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

  // Auto-save
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

  // Word count for writing
  const getWordCount = useMemo(() => {
    const text = activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2;
    if (!text) return 0;
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
  }, [answers.writingTask1, answers.writingTask2, activeWritingTask]);

  // ---------- Start screen ----------
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
      {/* HEADER - timer (faqat reading va writing) va tugmalar */}
      <header className="header">
        <div className="timer-container">
          {currentSection !== 'listening' && (
            <span className="timer-display">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
          {isTransferring && (
            <span className="ml-4 text-amber-600 font-bold">
              Transfer: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="header-icons flex items-center gap-4">
          {currentSection === 'listening' && isTransferring && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
              onClick={goToNextSection}
            >
              Next →
            </button>
          )}
          {currentSection === 'reading' && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
              onClick={goToNextSection}
            >
              Next →
            </button>
          )}
          {currentSection === 'writing' && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold transition"
              onClick={handleFinishClick}
            >
              Finish Exam
            </button>
          )}
        </div>
      </header>

      {/* AUDIO PLAYER – faqat listeningda, progress bar ko‘rinadi */}
      {currentSection === 'listening' && (
        <div className="audio-player-container">
          <audio
            ref={audioRef}
            src={examContent?.sections?.listening?.audioUrl}
            autoPlay
            preload="auto"
            style={{ display: 'none' }}
          />
          <div className="progress-container">
            <span id="current-time">{formatTime(audioProgress.currentTime)}</span>
            <div className="relative w-full h-1 bg-gray-300 rounded">
              <div 
                className="absolute top-0 left-0 h-1 bg-blue-600 rounded"
                style={{ width: `${audioProgress.percent}%` }}
              ></div>
            </div>
            <span id="total-duration">{formatTime(audioProgress.duration)}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="main-container" style={{ marginTop: currentSection === 'listening' ? '115px' : '60px' }}>
        {/* LEFT PANEL */}
        <div className="left-panel" style={{ height: 'calc(100vh - 60px - 80px)', overflowY: 'auto' }}>
          {currentSection === 'listening' ? (
            <ListeningComponent
              content={examContent?.sections?.listening}
              currentPart={currentPart}
              answers={answers.listening}
              setAnswers={(newAnswers: any) => setAnswers({ ...answers, listening: newAnswers })}
              reviewFlags={reviewFlags}
              setReviewFlags={setReviewFlags}
              currentSection="listening"
            />
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
              {/* LEFT PANEL: CONTENT (passage for reading, task for writing) */}
              <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100 min-w-[300px]">
                <div className="h-full flex flex-col">
                  {/* No extra tabs at the top - exactly like HTML */}
                  <ScrollArea className="flex-1 h-full">
                    <div
                      className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-300 selection:text-black"
                      onMouseUp={handleTextHighlight}
                    >
                      {currentSection === 'reading' ? (
                        <article>
                          {/* Reading uchun part header (HTML dagi kabi) */}
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
                          <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                            {readingPassages[activePassageIdx]?.content}
                          </div>
                        </article>
                      ) : (
                        // WRITING CONTENT – exact HTML from Writing.html
                        <div className="space-y-8">
                          {/* Writing uchun part header (HTML dagi kabi) */}
                          <div className="part-header">
                            <p><strong>Part {activeWritingTask + 1}</strong></p>
                            <p>
                              {activeWritingTask === 0
                                ? "You should spend about 20 minutes on this task. Write at least 150 words."
                                : "You should spend about 40 minutes on this task. Write at least 250 words."}
                            </p>
                          </div>
                          {activeWritingTask === 0 ? (
                            <div className="space-y-6">
                              <div className="task-prompt">
                                <p><strong>The provided chart illustrates the percentage of age of visitors from the UK to Spain in 1983 and in 2003.</strong></p>
                                <p><strong>Summarize the information by selecting and reporting the main points and make comparisons where relevant.</strong></p>
                              </div>
                              <div className="chart-container">
                                <img
                                  src="https://engnovatewebsitestorage.blob.core.windows.net/ielts-writing-task-1-images/a4139b6692197c1b"
                                  alt="Bar chart"
                                  className="max-w-full h-auto border border-gray-300 mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="instructions">
                                <p><strong>Write about the following topic:</strong></p>
                                <div className="task-prompt">
                                  <p><em><strong>In some countries, students pay their college or university fees, while in others, the government pays them.</strong></em></p>
                                  <p><em><strong>Do you think the advantages outweigh the disadvantages?</strong></em></p>
                                </div>
                                <p>Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p>
                              </div>
                            </div>
                          )}
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

              {/* RIGHT PANEL: QUESTIONS */}
              <ResizablePanel defaultSize={55} className="bg-[#f8fafc] min-w-[300px]">
                <ScrollArea className="h-full">
                  <div className="p-8 md:p-12 max-w-2xl mx-auto pb-32">
                    {currentSection === 'reading' ? (
                      <ReadingQuestions
                        passage={readingPassages[activePassageIdx]}
                        baseQNum={(() => {
                          let sum = 1;
                          for (let i = 0; i < activePassageIdx; i++) {
                            sum += readingPassages[i]?.questions?.length || 0;
                          }
                          return sum;
                        })()}
                        answers={answers.reading}
                        setAnswers={(newReading: any) => setAnswers({ ...answers, reading: newReading })}
                        reviewFlags={reviewFlags}
                        setReviewFlags={setReviewFlags}
                        currentSection="reading"
                      />
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

      {/* BOTTOM NAVIGATION – dinamik */}
      <nav className="nav-row perScorableItem" aria-label="Questions">
        {currentPartDefs.map((def: any) => (
          <div
            key={def.partIndex}
            className={`footer__questionWrapper___1tZ46 multiple ${currentPart === def.partIndex ? 'selected' : ''}`}
            role="tablist"
            data-section={currentSection}
            data-part-index={def.partIndex}
          >
            <button role="tab" className="footer__questionNo___3WNct" onClick={() => switchToPart(def.partIndex)}>
              <span>
                <span aria-hidden="true" className="section-prefix">Part </span>
                <span className="sectionNr" aria-hidden="true">{def.partIndex}</span>
                <span className="attemptedCount" aria-hidden="true">0 of {def.count}</span>
              </span>
            </button>
            <div className="footer__subquestionWrapper___9GgoP">
              {Array.from({ length: def.end - def.start + 1 }, (_, i) => def.start + i).map((q: number) => (
                <button
                  key={q}
                  data-section={currentSection}
                  data-q={q}
                  className={`subQuestion scorable-item ${currentQuestion === q ? 'active' : ''}`}
                  onClick={() => goToQuestion(q)}
                >
                  <span className="sr-only">Question {q}</span>
                  <span aria-hidden="true">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

// ========== LISTENING COMPONENT ==========
function ListeningComponent({ content, currentPart, answers = {}, setAnswers, reviewFlags, setReviewFlags, currentSection }: any) {
  const parts = content?.parts || [];

  const handleAnswerChange = (qNum: number, value: any) => {
    setAnswers({ ...answers, [qNum]: value });
  };

  const handleFlagToggle = (qNum: number) => {
    const key = `${currentSection}-${qNum}`;
    setReviewFlags((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  // Drag-drop state for part 3 (27-30)
  const [dragOptions] = useState([
    { letter: 'A', text: 'the realistic colours' },
    { letter: 'B', text: 'the sense of space' },
    { letter: 'C', text: 'the unusual interpretation of the theme' },
    { letter: 'D', text: 'the painting technique' },
    { letter: 'E', text: 'the variety of materials used' },
    { letter: 'F', text: 'the use of light and shade' }
  ]);

  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData("text/plain", letter);
    e.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
  };

  const handleDragOver = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(zoneId);
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverZone(null);
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = (e: React.DragEvent, qNum: number) => {
    e.preventDefault();
    const letter = e.dataTransfer.getData("text/plain");
    if (!letter) return;

    setAnswers({ ...answers, [qNum]: letter });
    setDragOverZone(null);
    e.currentTarget.classList.remove("drag-over");
  };

  const usedOptions = useMemo(() => {
    const used = new Set();
    if (answers) {
      for (let q = 27; q <= 30; q++) {
        if (answers[q]) used.add(answers[q]);
      }
    }
    return used;
  }, [answers]);

  const renderPart = () => {
    const partData = parts[currentPart - 1];
    if (!partData) return null;

    if (currentPart === 1) {
      return (
        <div className="space-y-4">
          <div className="border border-black p-6">
            <p className="text-center font-bold text-2xl mb-6">Music Alive Agency</p>
            <p className="italic mb-4">Example</p>
            {[1,2,3,4,5,6,7,8,9,10].map(qNum => {
              let label = '';
              if (qNum === 1) label = "Members' details are on a";
              else if (qNum === 2) label = "Type of music represented: modern music (";
              else if (qNum === 3) label = "Newsletter comes out once a";
              else if (qNum === 4) label = "Cost of adult membership: £";
              else if (qNum === 5) label = "Current number of members:";
              else if (qNum === 6) label = "Facilities include: rehearsal rooms and a";
              else if (qNum === 7) label = "There is no charge for";
              else if (qNum === 8) label = "- a recent";
              else if (qNum === 9) label = "Address: 707,";
              else if (qNum === 10) label = "Contact email: music.";

              return (
                <div key={qNum} id={`q-container-${currentSection}-${qNum}`} className="mb-2">
                  <p>
                    {label}
                    <input
                      type="text"
                      className="answer-input"
                      placeholder={String(qNum)}
                      value={answers[qNum] || ''}
                      onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                    />
                    {qNum === 2 && " and jazz)"}
                    {qNum === 7 && " advice"}
                    {qNum === 9 && " Street, Marbury"}
                    {qNum === 10 && "@bsu.co.uk"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (currentPart === 2) {
      return (
        <div className="space-y-8">
          <div>
            <p className="font-bold mb-2">Questions 11-14</p>
            <p className="mb-4">Choose the correct letter A, B or C.</p>
            <div className="space-y-4">
              {[11,12,13,14].map(qNum => {
                const q = partData.questions?.find((_: any, idx: number) => idx + 11 === qNum) || { text: '', options: ['A', 'B', 'C'] };
                return (
                  <div key={qNum} id={`q-container-${currentSection}-${qNum}`} className="space-y-2">
                    <p><strong>{qNum}</strong> {q.text}</p>
                    <div className="flex flex-col space-y-1">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q${qNum}`}
                            value={opt.charAt(0)}
                            checked={answers[qNum] === opt.charAt(0)}
                            onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                            className="w-4 h-4"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">Questions 15-20</p>
            <p className="mb-4">Label the map below. Write the correct letter, A-I, next to questions 15-20.</p>
            <div className="map-container mb-4">
              <img
                src="https://ia600906.us.archive.org/32/items/skrinshot-2025-08-12-202707-copy-copy-copy-copy-copy-copy/Skrinshot%202025-08-12%20202707%20-%20CopyCopyCopyCopyCopyCopy.png"
                alt="Map"
                className="w-full max-w-md mx-auto border border-gray-300"
              />
            </div>
            {[15,16,17,18,19,20].map(qNum => (
              <div key={qNum} id={`q-container-${currentSection}-${qNum}`} className="flex items-center gap-4 mb-2">
                <span className="font-bold w-8">{qNum}</span>
                <span className="flex-1">{partData.questions?.find((_: any, idx: number) => idx + 15 === qNum)?.text || ''}</span>
                <select
                  className="answer-select w-24"
                  value={answers[qNum] || ''}
                  onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                >
                  <option value="">Select</option>
                  {['A','B','C','D','E','F','G','H','I'].map(letter => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>
                <button onClick={() => handleFlagToggle(qNum)} className="ml-2">
                  <Flag size={18} className={reviewFlags[`${currentSection}-${qNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentPart === 3) {
      return (
        <div className="space-y-8">
          <div>
            <p className="font-bold mb-2">Questions 21-26</p>
            <p className="mb-4">Choose the correct answer.</p>
            <div className="space-y-4">
              {[21,22,23,24,25,26].map(qNum => {
                const q = partData.questions?.find((_: any, idx: number) => idx + 21 === qNum) || { text: '', options: ['A','B','C'] };
                return (
                  <div key={qNum} id={`q-container-${currentSection}-${qNum}`} className="space-y-2">
                    <p><strong>{qNum}</strong> {q.text}</p>
                    <div className="flex flex-col space-y-1">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q${qNum}`}
                            value={opt.charAt(0)}
                            checked={answers[qNum] === opt.charAt(0)}
                            onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                            className="w-4 h-4"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">Questions 27-30</p>
            <p className="mb-4">Which feature do the speakers identify as particularly interesting for each of the following exhibitions they saw?</p>
            <p>Choose FOUR answers from the box and write the correct letter, <strong>A-F</strong>, next to questions 27-30.</p>
            <div className="flex gap-8 mt-4">
              <div className="flex-1 space-y-2">
                {['On the Water', 'City Life', 'Faces', 'Moods'].map((exhibition, idx) => {
                  const qNum = 27 + idx;
                  return (
                    <div
                      key={idx}
                      id={`q-container-${currentSection}-${qNum}`}
                      className={`flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors ${dragOverZone === `zone-${qNum}` ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                      onDragOver={(e) => handleDragOver(e, `zone-${qNum}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, qNum)}
                    >
                      <span className="font-bold w-8">{qNum}</span>
                      <span className="flex-1">{exhibition}</span>
                      <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                        {answers[qNum] && (
                          <span className="font-bold text-blue-600">{answers[qNum]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="w-64 space-y-2 p-4 bg-gray-50 rounded border">
                <p className="font-bold text-sm mb-2">Drag options:</p>
                {dragOptions.map((opt, idx) => {
                  const isUsed = usedOptions.has(opt.letter);
                  return (
                    <div
                      key={idx}
                      draggable={!isUsed}
                      onDragStart={(e) => handleDragStart(e, opt.letter)}
                      onDragEnd={handleDragEnd}
                      className={`drag-item p-2 bg-white border rounded cursor-move hover:bg-gray-100 ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                      style={{ display: isUsed ? 'none' : 'block' }}
                    >
                      <strong>{opt.letter}</strong> {opt.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentPart === 4) {
      return (
        <div className="space-y-4">
          <div className="border border-black p-6">
            <p className="text-center font-bold text-2xl mb-6">The Mangrove Regeneration Project</p>
            <p><strong>Background:</strong></p>
            <p><strong>Mangrove forests:</strong></p>
            <ul className="list-none pl-5 space-y-2">
              <li id={`q-container-${currentSection}-31`}>
                • protect coastal areas from
                <input
                  type="text"
                  className="answer-input"
                  placeholder="31"
                  value={answers[31] || ''}
                  onChange={(e) => handleAnswerChange(31, e.target.value)}
                /> by the sea
              </li>
              <li>• are an important habitat for wildlife</li>
            </ul>
            <p><strong>Problems:</strong></p>
            <ul className="list-none pl-5 space-y-2">
              <li id={`q-container-${currentSection}-32`}>
                • mangroves had been used by farmers as
                <input
                  type="text"
                  className="answer-input"
                  placeholder="32"
                  value={answers[32] || ''}
                  onChange={(e) => handleAnswerChange(32, e.target.value)}
                />
              </li>
              <li id={`q-container-${currentSection}-33`}>
                • mangroves were poisoned by the use of
                <input
                  type="text"
                  className="answer-input"
                  placeholder="33"
                  value={answers[33] || ''}
                  onChange={(e) => handleAnswerChange(33, e.target.value)}
                />
              </li>
              <li id={`q-container-${currentSection}-34`}>
                • local people used the mangroves as a place to put their
                <input
                  type="text"
                  className="answer-input"
                  placeholder="34"
                  value={answers[34] || ''}
                  onChange={(e) => handleAnswerChange(34, e.target.value)}
                />
              </li>
            </ul>
            <p><strong>Actions taken to protect the mangroves:</strong></p>
            <ul className="list-none pl-5 space-y-2">
              <li id={`q-container-${currentSection}-35`}>
                • a barrier which was made of
                <input
                  type="text"
                  className="answer-input"
                  placeholder="35"
                  value={answers[35] || ''}
                  onChange={(e) => handleAnswerChange(35, e.target.value)}
                /> was constructed - but it failed
              </li>
              <li>• new mangroves had to be grown from seed</li>
              <li id={`q-container-${currentSection}-36`}>
                • the seeds of the
                <input
                  type="text"
                  className="answer-input"
                  placeholder="36"
                  value={answers[36] || ''}
                  onChange={(e) => handleAnswerChange(36, e.target.value)}
                /> mangrove were used
              </li>
            </ul>
            <p><strong>First set of seedlings:</strong></p>
            <ul className="list-none pl-5 space-y-2">
              <li id={`q-container-${currentSection}-37`}>
                • kept in small pots in a
                <input
                  type="text"
                  className="answer-input"
                  placeholder="37"
                  value={answers[37] || ''}
                  onChange={(e) => handleAnswerChange(37, e.target.value)}
                />
              </li>
              <li id={`q-container-${currentSection}-38`}>
                • Watered with
                <input
                  type="text"
                  className="answer-input"
                  placeholder="38"
                  value={answers[38] || ''}
                  onChange={(e) => handleAnswerChange(38, e.target.value)}
                /> rain water
              </li>
              <li>• planted out on south side of a small island</li>
              <li id={`q-container-${currentSection}-39`}>
                • at risk from the large
                <input
                  type="text"
                  className="answer-input"
                  placeholder="39"
                  value={answers[39] || ''}
                  onChange={(e) => handleAnswerChange(39, e.target.value)}
                /> population
              </li>
            </ul>
            <p><strong>Second set of seedlings:</strong></p>
            <ul className="list-none pl-5 space-y-2">
              <li>• planted in the seabed near established mangrove roots</li>
              <li id={`q-container-${currentSection}-40`}>
                • the young plants were destroyed in a
                <input
                  type="text"
                  className="answer-input"
                  placeholder="40"
                  value={answers[40] || ''}
                  onChange={(e) => handleAnswerChange(40, e.target.value)}
                />
              </li>
            </ul>
            <p><strong>Results:</strong> The first set of seedlings was successful</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {renderPart()}
    </div>
  );
}

// ========== READING QUESTIONS COMPONENT (TAKOMILLASHTIRILGAN) ==========
function ReadingQuestions({ passage, baseQNum, answers = {}, setAnswers, reviewFlags, setReviewFlags, currentSection }: any) {
  const questions = passage?.questions || [];

  const handleAnswerChange = (globalQNum: number, value: any) => {
    setAnswers({ ...answers, [globalQNum]: value });
  };

  const handleFlagToggle = (globalQNum: number) => {
    const key = `${currentSection}-${globalQNum}`;
    setReviewFlags((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {questions.map((q: any, idx: number) => {
        const globalQNum = baseQNum + idx;

        // Paragraph matching (1-5) – dropdown
        if (q.type === 'paragraph_matching') {
          return (
            <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="tf-question" data-q-start={globalQNum}>
              <div className="tf-question-line">
                <span className="tf-question-number">{globalQNum}</span>
                <span className="tf-question-text">{q.text}</span>
              </div>
              <div className="tf-options">
                <select
                  className="answer-select"
                  value={answers[globalQNum] || ''}
                  onChange={(e) => handleAnswerChange(globalQNum, e.target.value)}
                >
                  <option value="">Select</option>
                  {q.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        }

        // Flow-chart (6-10) – bir nechta input
        if (q.type === 'flow_chart') {
          if (idx === 0) {
            return (
              <div key={globalQNum} className="question" data-q-start={globalQNum}>
                <div className="question-prompt">
                  <p><strong>Questions {globalQNum}–{globalQNum + 4}</strong></p>
                  <p>Complete the flow-chart below. Write <strong>NO MORE THAN TWO WORDS</strong> from the text for each answer.</p>
                </div>
                <div className="summary-text" style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                  <p>
                    Synthetic gene grown in
                    <input
                      type="text"
                      className="answer-input"
                      autoComplete="off"
                      value={answers[globalQNum] || ''}
                      onChange={(e) => handleAnswerChange(globalQNum, e.target.value)}
                      placeholder={String(globalQNum)}
                    />
                    or
                    <input
                      type="text"
                      className="answer-input"
                      autoComplete="off"
                      value={answers[globalQNum+1] || ''}
                      onChange={(e) => handleAnswerChange(globalQNum+1, e.target.value)}
                      placeholder={String(globalQNum+1)}
                    />
                  </p>
                  <p>↓</p>
                  <p>
                    globules of
                    <input
                      type="text"
                      className="answer-input"
                      autoComplete="off"
                      value={answers[globalQNum+2] || ''}
                      onChange={(e) => handleAnswerChange(globalQNum+2, e.target.value)}
                      placeholder={String(globalQNum+2)}
                    />
                  </p>
                  <p>↓</p>
                  <p>
                    dissolved in
                    <input
                      type="text"
                      className="answer-input"
                      autoComplete="off"
                      value={answers[globalQNum+3] || ''}
                      onChange={(e) => handleAnswerChange(globalQNum+3, e.target.value)}
                      placeholder={String(globalQNum+3)}
                    />
                  </p>
                  <p>↓</p>
                  <p>
                    passed through
                    <input
                      type="text"
                      className="answer-input"
                      autoComplete="off"
                      value={answers[globalQNum+4] || ''}
                      onChange={(e) => handleAnswerChange(globalQNum+4, e.target.value)}
                      placeholder={String(globalQNum+4)}
                    />
                  </p>
                  <p>↓</p>
                  <p>to produce a solid fibre</p>
                </div>
              </div>
            );
          } else {
            return null; // faqat birinchi savol butun guruhni render qiladi
          }
        }

        // TRUE/FALSE/NOT GIVEN (11-13, 36-40)
        if (q.type === 'tfng') {
          return (
            <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="tf-question" data-q-start={globalQNum}>
              <div className="tf-question-line">
                <span className="tf-question-number">{globalQNum}</span>
                <span className="tf-question-text">{q.text}</span>
              </div>
              <div className="tf-options">
                {TFNG_OPTIONS.map(opt => (
                  <label key={opt} className="tf-option">
                    <input
                      type="radio"
                      name={`q-${globalQNum}`}
                      value={opt}
                      checked={answers[globalQNum] === opt}
                      onChange={() => handleAnswerChange(globalQNum, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        }

        // YES/NO/NOT GIVEN (14-18)
        if (q.type === 'ynng') {
          return (
            <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="tf-question" data-q-start={globalQNum}>
              <div className="tf-question-line">
                <span className="tf-question-number">{globalQNum}</span>
                <span className="tf-question-text">{q.text}</span>
              </div>
              <div className="tf-options">
                {YNNG_OPTIONS.map(opt => (
                  <label key={opt} className="tf-option">
                    <input
                      type="radio"
                      name={`q-${globalQNum}`}
                      value={opt}
                      checked={answers[globalQNum] === opt}
                      onChange={() => handleAnswerChange(globalQNum, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        }

        // Matching table (19-23, 27-32) – jadval
        if (q.type === 'matching_table' || q.type === 'matching_paragraph') {
          if (idx === 0) {
            const statements = q.statements || (q.type === 'matching_table'
              ? [
                  'Byron Reeves and Esther Thorson',
                  'Dafna Lemish',
                  'Robert D. McIlwraith',
                  'Tannis M. MacBeth Williams',
                  'Charles Winick'
                ]
              : [
                  'Appointments with an alternative practitioner',
                  'An alternative practitioner\'s description of the treatment',
                  'An alternative practitioner who has faith in what he does',
                  'the illness of patients convinced of alternative practice',
                  'Improvements of patients receiving alternative practice',
                  'Conventional medical doctors (who is aware of placebo)'
                ]);
            const options = q.options || ['A','B','C','D','E','F','G','H'];
            const numQuestions = statements.length;
            return (
              <div key={globalQNum} className="question" data-q-start={globalQNum}>
                <div className="question-prompt">
                  <p><strong>Questions {globalQNum}–{globalQNum + numQuestions - 1}</strong></p>
                  <p>{q.type === 'matching_table' ? 'Match each researcher with the correct statements.' : 'Match each description with the correct letter.'}</p>
                </div>
                <div className="table-container">
                  <table className="matching-table">
                    <thead>
                      <tr>
                        <th></th>
                        {options.map((opt: string) => <th key={opt}>{opt}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {statements.map((stmt: string, stmtIdx: number) => {
                        const currentGlobalQNum = globalQNum + stmtIdx;
                        return (
                          <tr key={stmtIdx}>
                            <td className="statement"><strong>{currentGlobalQNum}</strong> {stmt}</td>
                            {options.map((opt: string) => {
                              const isSelected = answers[currentGlobalQNum] === opt;
                              return (
                                <td
                                  key={opt}
                                  className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                                  data-question={`q-${currentGlobalQNum}`}
                                  data-value={opt}
                                  onClick={() => handleAnswerChange(currentGlobalQNum, opt)}
                                ></td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          } else {
            return null;
          }
        }

        // Multiple choice (24-26, 33-35)
        if (q.type === 'mcq') {
          return (
            <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="multi-choice-question" data-q-start={globalQNum}>
              <div className="question-prompt">
                <p><strong>{globalQNum}.</strong> {q.text}</p>
              </div>
              <div className="space-y-2">
                {q.options?.map((opt: string) => (
                  <div key={opt} className="multi-choice-option">
                    <label>
                      <input
                        type="radio"
                        name={`q-${globalQNum}`}
                        value={opt.charAt(0)}
                        checked={answers[globalQNum] === opt.charAt(0)}
                        onChange={() => handleAnswerChange(globalQNum, opt.charAt(0))}
                      />
                      <span>{opt}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Gap fill / sentence completion (masalan, 36-38, 1-3) – oddiy input
        if (q.type === 'gap_fill' || q.type === 'sentence_completion') {
          return (
            <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="question" data-q-start={globalQNum}>
              <div className="question-prompt">
                <p><strong>{globalQNum}</strong> {q.text}</p>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  className="answer-input"
                  placeholder="Javob..."
                  value={answers[globalQNum] || ''}
                  onChange={(e) => handleAnswerChange(globalQNum, e.target.value)}
                />
              </div>
            </div>
          );
        }

        // Agar type noma'lum bo'lsa, oddiy input ko'rsatamiz (default fallback)
        return (
          <div key={globalQNum} id={`q-container-${currentSection}-${globalQNum}`} className="question" data-q-start={globalQNum}>
            <div className="question-prompt">
              <p><strong>{globalQNum}</strong> {q.text}</p>
            </div>
            <div className="mt-2">
              <input
                type="text"
                className="answer-input"
                placeholder="Javob..."
                value={answers[globalQNum] || ''}
                onChange={(e) => handleAnswerChange(globalQNum, e.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}