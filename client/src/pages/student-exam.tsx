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
import { ListeningComponent } from "@/components/ListeningComponent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Section = 'listening' | 'reading' | 'writing';

const STORAGE_KEY = "ielts_exam_backup_v1";

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

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

  // Audio progress
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0, percent: 0 });

  // Transfer time after listening
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const transferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useStartSession();
  const logViolation = useLogViolation();

  // Total questions (listening + reading)
  const totalQuestions = useMemo(() => {
    if (!examContent) return 40;
    const listeningCount = examContent?.sections?.listening?.parts?.reduce((acc: number, part: any) => acc + (part.questions?.length || 0), 0) || 0;
    const readingCount = examContent?.sections?.reading?.passages?.reduce((acc: number, passage: any) => acc + (passage.questions?.length || 0), 0) || 0;
    return listeningCount + readingCount;
  }, [examContent]);

  const getImageUrl = (path: string) => {
    if (!path) return "";
    return path.startsWith('http') ? path : `/uploads/${path}`;
  };

  const scrollToQuestion = (qNum: number) => {
    const element = document.getElementById(`q-container-${qNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTimeout(() => {
        const retryElement = document.getElementById(`q-container-${qNum}`);
        if (retryElement) {
          retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
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

  const setupSectionTimer = (section: Section, content: any) => {
    let minutes = 60;
    if (section === 'listening') minutes = content?.sections?.listening?.duration || 30;
    if (section === 'reading') minutes = content?.sections?.reading?.timeLimit || 60;
    if (section === 'writing') minutes = content?.sections?.writing?.timeLimit || 60;
    setTimeLeft(minutes * 60);
  };

  // Main timer effect
  useEffect(() => {
    if (!hasStarted || timeLeft <= 0) return;
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
    // Clear any transfer timer
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
    if (examContent) setupSectionTimer(currentSection, examContent);
  }, [currentSection, examContent]);

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

  // Audio progress and ended event
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
      setTransferTimeLeft((prev) => {
        if (prev <= 1) {
          if (transferTimerRef.current) clearInterval(transferTimerRef.current);
          setIsTransferring(false);
          handleSectionAutoTransition(); // move to reading after transfer time ends
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

  // Go to next section early (Next Section button)
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

  // Update bottom navigation indicators (answered/active/flag)
  useEffect(() => {
    const updateNavIndicators = () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const btn = document.querySelector(`.subQuestion[data-q="${q}"]`);
        if (!btn) continue;

        const qId = `q-${q}`;
        const listeningParts = examContent?.sections?.listening?.parts || [];
        const listeningCount = listeningParts.reduce((acc: number, part: any) => acc + (part.questions?.length || 0), 0);
        const isListening = q <= listeningCount;
        const answer = isListening ? answers.listening?.[qId] : answers.reading?.[qId];
        const isAnswered = answer !== undefined && answer !== null && answer !== '';

        // answered class
        if (isAnswered) {
          btn.classList.add('answered');
        } else {
          btn.classList.remove('answered');
        }

        // flag dot
        const flagDot = btn.querySelector('.flag-dot');
        if (reviewFlags[qId]) {
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
    };

    updateNavIndicators();
  }, [answers, totalQuestions, examContent, reviewFlags]);

  // Score calculation
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

  const calculateScores = () => {
    if (!examContent) return null;

    const listeningParts = examContent?.sections?.listening?.parts || [];
    const listeningQuestions = listeningParts.flatMap((p: any) => p.questions || []);
    const readingPassages = examContent?.sections?.reading?.passages || [];
    const readingQuestions = readingPassages.flatMap((p: any) => p.questions || []);

    let listeningCorrect = 0;
    let readingCorrect = 0;

    listeningQuestions.forEach((q: any, idx: number) => {
      const qId = `q-${idx + 1}`; // listening questions are 1..N
      const userAnswer = answers.listening?.[qId];
      const correct = q.correctAnswer;
      if (userAnswer && correct) {
        const normUser = userAnswer.toString().trim().toLowerCase();
        const normCorrect = correct.toString().trim().toLowerCase();
        if (normUser === normCorrect) listeningCorrect++;
      }
    });

    const listeningCount = listeningQuestions.length;
    readingQuestions.forEach((q: any, idx: number) => {
      const qId = `q-${listeningCount + idx + 1}`;
      const userAnswer = answers.reading?.[qId];
      const correct = q.correctAnswer;
      if (userAnswer && correct) {
        const normUser = userAnswer.toString().trim().toLowerCase();
        const normCorrect = correct.toString().trim().toLowerCase();
        if (normUser === normCorrect) readingCorrect++;
      }
    });

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

  const getWordCount = useMemo(() => {
    const text = activeWritingTask === 0 ? answers.writingTask1 : answers.writingTask2;
    if (!text) return 0;
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
  }, [answers.writingTask1, answers.writingTask2, activeWritingTask]);

  const switchToPart = (part: number) => {
    setCurrentPart(part);
    const firstQuestion = (part - 1) * 10 + 1;
    goToQuestion(firstQuestion);
  };

  const goToQuestion = (qNum: number) => {
    setCurrentQuestion(qNum);
    let targetPart = 1;
    if (qNum > 10 && qNum <= 20) targetPart = 2;
    else if (qNum > 20 && qNum <= 30) targetPart = 3;
    else if (qNum > 30) targetPart = 4;
    if (targetPart !== currentPart) {
      setCurrentPart(targetPart);
    }
    scrollToQuestion(qNum);
    updateActiveQuestionInNav(qNum);
  };

  const updateActiveQuestionInNav = (qNum: number) => {
    document.querySelectorAll('.subQuestion').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.subQuestion[data-q="${qNum}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  };

  // Reading question renderer (to‘liq)
  const renderReadingQuestions = (passage: any, passageIdx: number, listeningCount: number) => {
    const questionsBefore = examContent.sections.reading.passages.slice(0, passageIdx).reduce((acc: number, curr: any) => acc + (curr.questions?.length || 0), 0);
    const baseQNum = listeningCount + questionsBefore;

    return passage.questions.map((q: any, i: number) => {
      const qGlobalIdx = baseQNum + i + 1;
      const qId = `q-${qGlobalIdx}`;

      if (q.type === 'paragraph_matching') {
        return (
          <div key={qId} id={`q-container-${qGlobalIdx}`} className="tf-question" data-q-start={qGlobalIdx}>
            <div className="tf-question-line">
              <span className="tf-question-number">{qGlobalIdx}</span>
              <span className="tf-question-text">{q.text}</span>
            </div>
            <div className="tf-options">
              <select
                className="answer-select"
                value={answers.reading?.[qId] || ''}
                onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [qId]: e.target.value}})}
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

      if (q.type === 'flow_chart') {
        return (
          <div key={qId} className="question" data-q-start={qGlobalIdx}>
            <div className="question-prompt">
              <p><strong>Questions {qGlobalIdx}–{qGlobalIdx + 4}</strong></p>
              <p>Complete the flow-chart below. Write <strong>NO MORE THAN TWO WORDS</strong> from the text for each answer.</p>
            </div>
            <div className="summary-text" style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
              <p>
                Synthetic gene grown in
                <input
                  type="text"
                  className="answer-input"
                  value={answers.reading?.[`q-${qGlobalIdx}`] || ''}
                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [`q-${qGlobalIdx}`]: e.target.value}})}
                  placeholder={String(qGlobalIdx)}
                />
                or
                <input
                  type="text"
                  className="answer-input"
                  value={answers.reading?.[`q-${qGlobalIdx+1}`] || ''}
                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [`q-${qGlobalIdx+1}`]: e.target.value}})}
                  placeholder={String(qGlobalIdx+1)}
                />
              </p>
              <p>↓</p>
              <p>
                globules of
                <input
                  type="text"
                  className="answer-input"
                  value={answers.reading?.[`q-${qGlobalIdx+2}`] || ''}
                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [`q-${qGlobalIdx+2}`]: e.target.value}})}
                  placeholder={String(qGlobalIdx+2)}
                />
              </p>
              <p>↓</p>
              <p>
                dissolved in
                <input
                  type="text"
                  className="answer-input"
                  value={answers.reading?.[`q-${qGlobalIdx+3}`] || ''}
                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [`q-${qGlobalIdx+3}`]: e.target.value}})}
                  placeholder={String(qGlobalIdx+3)}
                />
              </p>
              <p>↓</p>
              <p>
                passed through
                <input
                  type="text"
                  className="answer-input"
                  value={answers.reading?.[`q-${qGlobalIdx+4}`] || ''}
                  onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [`q-${qGlobalIdx+4}`]: e.target.value}})}
                  placeholder={String(qGlobalIdx+4)}
                />
              </p>
              <p>↓</p>
              <p>to produce a solid fibre</p>
            </div>
          </div>
        );
      }

      if (q.type === 'tfng') {
        return (
          <div key={qId} id={`q-container-${qGlobalIdx}`} className="tf-question" data-q-start={qGlobalIdx}>
            <div className="tf-question-line">
              <span className="tf-question-number">{qGlobalIdx}</span>
              <span className="tf-question-text">{q.text}</span>
            </div>
            <div className="tf-options">
              {TFNG_OPTIONS.map(opt => (
                <label key={opt} className="tf-option">
                  <input
                    type="radio"
                    name={qId}
                    value={opt}
                    checked={answers.reading?.[qId] === opt}
                    onChange={() => setAnswers({...answers, reading: {...answers.reading, [qId]: opt}})}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      if (q.type === 'ynng') {
        return (
          <div key={qId} id={`q-container-${qGlobalIdx}`} className="tf-question" data-q-start={qGlobalIdx}>
            <div className="tf-question-line">
              <span className="tf-question-number">{qGlobalIdx}</span>
              <span className="tf-question-text">{q.text}</span>
            </div>
            <div className="tf-options">
              {YNNG_OPTIONS.map(opt => (
                <label key={opt} className="tf-option">
                  <input
                    type="radio"
                    name={qId}
                    value={opt}
                    checked={answers.reading?.[qId] === opt}
                    onChange={() => setAnswers({...answers, reading: {...answers.reading, [qId]: opt}})}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      if (q.type === 'matching_table') {
        const statements = q.statements || [
          'Byron Reeves and Esther Thorson',
          'Dafna Lemish',
          'Robert D. McIlwraith',
          'Tannis M. MacBeth Williams',
          'Charles Winick'
        ];
        const options = q.options || ['A','B','C','D','E','F','G','H'];
        return (
          <div key={qId} className="question" data-q-start={qGlobalIdx}>
            <div className="question-prompt">
              <p><strong>Questions {qGlobalIdx}–{qGlobalIdx + 4}</strong></p>
              <p>Match each researcher with the correct statements.</p>
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
                  {statements.map((stmt: string, idx: number) => {
                    const qNum = qGlobalIdx + idx;
                    return (
                      <tr key={idx}>
                        <td className="statement"><strong>{qNum}</strong> {stmt}</td>
                        {options.map((opt: string) => {
                          const isSelected = answers.reading?.[`q-${qNum}`] === opt;
                          return (
                            <td
                              key={opt}
                              className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                              data-question={`q-${qNum}`}
                              data-value={opt}
                              onClick={() => setAnswers({...answers, reading: {...answers.reading, [`q-${qNum}`]: opt}})}
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
      }

      if (q.type === 'mcq') {
        return (
          <div key={qId} id={`q-container-${qGlobalIdx}`} className="multi-choice-question" data-q-start={qGlobalIdx}>
            <div className="question-prompt">
              <p><strong>{qGlobalIdx}.</strong> {q.text}</p>
            </div>
            <div className="space-y-2">
              {q.options?.map((opt: string) => (
                <div key={opt} className="multi-choice-option">
                  <label>
                    <input
                      type="radio"
                      name={qId}
                      value={opt.charAt(0)}
                      checked={answers.reading?.[qId] === opt.charAt(0)}
                      onChange={() => setAnswers({...answers, reading: {...answers.reading, [qId]: opt.charAt(0)}})}
                    />
                    <span>{opt}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (q.type === 'matching_paragraph') {
        const statements = q.statements || [
          'Appointments with an alternative practitioner',
          'An alternative practitioner\'s description of the treatment',
          'An alternative practitioner who has faith in what he does',
          'the illness of patients convinced of alternative practice',
          'Improvements of patients receiving alternative practice',
          'Conventional medical doctors (who is aware of placebo)'
        ];
        const options = q.options || ['A','B','C','D','E','F','G','H'];
        return (
          <div key={qId} className="question" data-q-start={qGlobalIdx}>
            <div className="question-prompt">
              <p><strong>Questions {qGlobalIdx}–{qGlobalIdx + 5}</strong></p>
              <p>Match each description with the correct letter.</p>
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
                  {statements.map((stmt: string, idx: number) => {
                    const qNum = qGlobalIdx + idx;
                    return (
                      <tr key={idx}>
                        <td className="statement"><strong>{qNum}</strong> {stmt}</td>
                        {options.map((opt: string) => {
                          const isSelected = answers.reading?.[`q-${qNum}`] === opt;
                          return (
                            <td
                              key={opt}
                              className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                              data-question={`q-${qNum}`}
                              data-value={opt}
                              onClick={() => setAnswers({...answers, reading: {...answers.reading, [`q-${qNum}`]: opt}})}
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
      }

      // Default fallback
      return (
        <div key={qId} id={`q-container-${qGlobalIdx}`} className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
          <div className="flex gap-4">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{qGlobalIdx}</span>
            <div className="flex-1 space-y-4">
              <div className="font-bold text-slate-700">{q.text}</div>
              <Input
                className="h-12 text-lg border-2 focus:border-blue-500"
                placeholder="Javob..."
                value={answers.reading?.[qId] || ''}
                onChange={(e) => setAnswers({...answers, reading: {...answers.reading, [qId]: e.target.value}})}
              />
            </div>
            <button onClick={() => setReviewFlags({...reviewFlags, [qId]: !reviewFlags[qId]})}>
              <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
            </button>
          </div>
        </div>
      );
    });
  };

  const handleFinishClick = () => {
    if (currentSection !== 'writing') {
      toast({ title: "Cannot finish yet", description: "You must complete all sections before finishing the test.", variant: "destructive" });
      return;
    }
    handleFinalSubmit();
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
      {/* HEADER - timer va Next Section tugmasi */}
      <header className="header">
        <div className="timer-container">
          <span className="timer-display">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
          {isTransferring && (
            <span className="ml-4 text-amber-600 font-bold">
              Transfer: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="header-icons flex items-center gap-4">
          {(isTransferring || currentSection === 'reading') && currentSection !== 'writing' && (
            <button
              className="next-section-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
              onClick={goToNextSection}
            >
              Next Section →
            </button>
          )}
        </div>
      </header>

      {/* AUDIO PLAYER – yagona */}
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
              audioUrl={examContent?.sections?.listening?.audioUrl}
              onSectionComplete={() => setCurrentSection('reading')}
              answers={answers.listening}
              setAnswers={(val: any) => setAnswers({...answers, listening: val})}
              currentPart={currentPart}
              reviewFlags={reviewFlags}
              setReviewFlags={setReviewFlags}
            />
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
              {/* LEFT PANEL: CONTENT */}
              <ResizablePanel defaultSize={45} className="bg-white border-r-4 border-slate-100 min-w-[300px]">
                <div className="h-full flex flex-col">
                  <div className="h-12 bg-slate-50 border-b flex items-center px-4 overflow-x-auto no-scrollbar shrink-0">
                    {currentSection === 'reading' ? (
                      <div className="flex gap-1">
                        {examContent?.sections?.reading?.passages?.map((_: any, idx: number) => (
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
                        {examContent?.sections?.writing?.tasks?.map((_: any, idx: number) => (
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
                    <div
                      className="p-12 max-w-3xl mx-auto select-text selection:bg-yellow-300 selection:text-black"
                      onMouseUp={handleTextHighlight}
                    >
                      {currentSection === 'reading' ? (
                        <article>
                          <h2 className="text-3xl font-black mb-8 text-slate-900 leading-tight">
                            {examContent?.sections?.reading?.passages?.[activePassageIdx]?.title}
                          </h2>
                          {examContent?.sections?.reading?.passages?.[activePassageIdx]?.image && (
                            <img
                              src={getImageUrl(examContent.sections.reading.passages[activePassageIdx].image)}
                              alt="Visual"
                              className="w-full mb-6 rounded-lg border shadow-sm"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div className="text-xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                            {examContent?.sections?.reading?.passages?.[activePassageIdx]?.content}
                          </div>
                        </article>
                      ) : (
                        // WRITING CONTENT
                        <div className="space-y-8">
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
                      <div className="space-y-6">
                        {examContent?.sections?.reading?.passages?.[activePassageIdx]?.questions?.length > 0 ? (
                          renderReadingQuestions(
                            examContent.sections.reading.passages[activePassageIdx],
                            activePassageIdx,
                            examContent?.sections?.listening?.parts?.reduce((acc: number, part: any) => acc + (part.questions?.length || 0), 0) || 0
                          )
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

      {/* BOTTOM NAVIGATION */}
      <nav className="nav-row perScorableItem" aria-label="Questions">
        {/* Part 1 */}
        <div className={`footer__questionWrapper___1tZ46 multiple ${currentPart === 1 ? 'selected' : ''}`} role="tablist">
          <button role="tab" className="footer__questionNo___3WNct" onClick={() => switchToPart(1)}>
            <span>
              <span aria-hidden="true" className="section-prefix">Part </span>
              <span className="sectionNr" aria-hidden="true">1</span>
              <span className="attemptedCount" aria-hidden="true">0 of 10</span>
            </span>
          </button>
          <div className="footer__subquestionWrapper___9GgoP">
            {[1,2,3,4,5,6,7,8,9,10].map(q => (
              <button 
                key={q} 
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

        {/* Part 2 */}
        <div className={`footer__questionWrapper___1tZ46 multiple ${currentPart === 2 ? 'selected' : ''}`} role="tablist">
          <button role="tab" className="footer__questionNo___3WNct" onClick={() => switchToPart(2)}>
            <span>
              <span aria-hidden="true" className="section-prefix">Part </span>
              <span className="sectionNr" aria-hidden="true">2</span>
              <span className="attemptedCount" aria-hidden="true">0 of 10</span>
            </span>
          </button>
          <div className="footer__subquestionWrapper___9GgoP">
            {[11,12,13,14,15,16,17,18,19,20].map(q => (
              <button 
                key={q} 
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

        {/* Part 3 */}
        <div className={`footer__questionWrapper___1tZ46 multiple ${currentPart === 3 ? 'selected' : ''}`} role="tablist">
          <button role="tab" className="footer__questionNo___3WNct" onClick={() => switchToPart(3)}>
            <span>
              <span aria-hidden="true" className="section-prefix">Part </span>
              <span className="sectionNr" aria-hidden="true">3</span>
              <span className="attemptedCount" aria-hidden="true">0 of 10</span>
            </span>
          </button>
          <div className="footer__subquestionWrapper___9GgoP">
            {[21,22,23,24,25,26,27,28,29,30].map(q => (
              <button 
                key={q} 
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

        {/* Part 4 */}
        <div className={`footer__questionWrapper___1tZ46 multiple ${currentPart === 4 ? 'selected' : ''}`} role="tablist">
          <button role="tab" className="footer__questionNo___3WNct" onClick={() => switchToPart(4)}>
            <span>
              <span aria-hidden="true" className="section-prefix">Part </span>
              <span className="sectionNr" aria-hidden="true">4</span>
              <span className="attemptedCount" aria-hidden="true">0 of 10</span>
            </span>
          </button>
          <div className="footer__subquestionWrapper___9GgoP">
            {[31,32,33,34,35,36,37,38,39,40].map(q => (
              <button 
                key={q} 
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

        {/* Finish Test tugmasi – faqat Writingda ishlaydi */}
        <button
          id="deliver-button"
          aria-label="Finish Test"
          className="footer__deliverButton___3FM07"
          onClick={handleFinishClick}
        >
          <i className="fa fa-check" aria-hidden="true"></i>
          <span>Finish Test</span>
        </button>
      </nav>
    </div>
  );
}