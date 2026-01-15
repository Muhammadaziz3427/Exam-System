import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Clock, AlertOctagon, Maximize2, FileCheck } from "lucide-react";

// --- HOOK FOR FETCHING SESSION DIRECTLY (Custom since not in standard hook file yet) ---
function useSessionData(id: number) {
  // Fetch session to get examId
  // Fetch exam content
  // Combine them
  // This is a simplification. In real app, /api/sessions/:id/start might return everything.
  // We'll assume we can get exam content once started.
  return useQuery({
    queryKey: ['session-full', id],
    queryFn: async () => {
      // 1. Get Session Status
      // NOTE: We might need a specific endpoint that returns session + exam content securely
      // For this demo, we'll chain requests or assume the start endpoint does it.
      // Let's assume start returns the session, and we fetch exam separately.
      
      // Since we don't have a specific endpoint for "get session details + exam", we will improvise
      // We'll rely on the "Start" mutation to trigger the flow.
      return null;
    },
    enabled: false
  });
}

// --- LOCKDOWN COMPONENT ---
function LockdownModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertOctagon size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Exam Environment Security</h2>
          <p className="text-slate-500 mt-2">
            This exam is monitored. Switching tabs, exiting fullscreen, or minimizing the window will be logged as a violation.
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-700 space-y-2 border border-slate-200">
          <p>• Your screen will go full-screen.</p>
          <p>• Do not attempt to copy/paste text.</p>
          <p>• Audio will play automatically once.</p>
        </div>
        <Button size="lg" className="w-full gap-2 text-lg" onClick={onStart}>
          <Maximize2 size={20} />
          Enter Fullscreen & Start
        </Button>
      </div>
    </div>
  );
}

// --- MAIN EXAM COMPONENT ---
export default function StudentExam() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  
  const [hasStarted, setHasStarted] = useState(false);
  const [examContent, setExamContent] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState<'listening' | 'reading' | 'writing'>('listening');
  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins default
  
  // Answers State
  const [answers, setAnswers] = useState<Record<string, any>>({
    listening: {},
    reading: {},
    writing: ""
  });

  const startSession = useStartSession();
  const submitAnswers = useSubmitAnswers();
  const logViolation = useLogViolation();

  // --- INITIALIZATION ---
  const handleStart = async () => {
    try {
      // 1. Request Fullscreen
      await document.documentElement.requestFullscreen();
      
      // 2. Call API to start
      const session = await startSession.mutateAsync(sessionId);
      
      // 3. Fetch Exam Content (In a real app, this would be cleaner)
      const examRes = await fetch(buildUrl(api.exams.get.path, { id: session.examId }));
      const exam = await examRes.json();
      
      setExamContent(exam.content);
      setTimeLeft(exam.timeLimit * 60);
      setHasStarted(true);

      // 4. Listen for violations
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleFullscreenChange);

    } catch (err) {
      console.error("Failed to start", err);
      alert("Could not enter secure mode. Please try again.");
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      logViolation.mutate({ id: sessionId, type: "tab_switch" });
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      logViolation.mutate({ id: sessionId, type: "fullscreen_exit" });
    }
  };

  // --- AUTO SAVE & TIMER ---
  useEffect(() => {
    if (!hasStarted) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const saver = setInterval(() => {
      submitAnswers.mutate({ id: sessionId, answers, isFinal: false });
    }, 20000); // 20s auto-save

    return () => {
      clearInterval(timer);
      clearInterval(saver);
    };
  }, [hasStarted, answers]); // Depend on answers to save latest

  // --- NAVIGATION ---
  const nextSection = () => {
    if (currentSection === 'listening') {
      setCurrentSection('reading');
      // Prevent going back
      window.history.pushState(null, "", window.location.href);
    }
    else if (currentSection === 'reading') {
      setCurrentSection('writing');
      window.history.pushState(null, "", window.location.href);
    }
  };

  // Add back button prevention
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  const [highlights, setHighlights] = useState<{start: number, end: number, text: string}[]>([]);
  const [showHighlightBtn, setShowHighlightBtn] = useState<{x: number, y: number} | null>(null);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setShowHighlightBtn({
        x: rect.left + window.scrollX + (rect.width / 2),
        y: rect.top + window.scrollY - 40
      });
    } else {
      setShowHighlightBtn(null);
    }
  };

  const applyHighlight = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString();
    // In a real app, we'd wrap with a span. For this mock, we'll just track it
    // or use a more robust highlighter library.
    // For now, let's just alert or use a simple visual cue.
    document.execCommand('backColor', false, 'yellow');
    setShowHighlightBtn(null);
  };

  const handleSubmit = async (isFinal = false) => {
    await submitAnswers.mutateAsync({ id: sessionId, answers, isFinal: true });
    // Cleanup listeners
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen();
    localStorage.removeItem("student_session");
    alert(isFinal ? "Time is up! Your exam has been auto-submitted." : "Test Submitted Successfully!");
    setLocation("/");
  };

  if (!hasStarted) return <LockdownModal onStart={handleStart} />;
  if (!examContent) return <div className="p-10 text-center">Loading exam content...</div>;

  const session = JSON.parse(localStorage.getItem("student_session") || "{}");

  // --- RENDER SECTIONS ---
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalQuestions = 40;
  const answeredCount = Object.keys(answers.listening).length + Object.keys(answers.reading).length + (answers.writing ? 1 : 0);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-secondary text-secondary-foreground flex items-center justify-between px-6 shadow-md z-10 border-b border-secondary/20">
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">{session.studentName || "Student"}</span>
          <span className="text-xs opacity-80 uppercase tracking-wider">IELTS Mock: {examContent.title || "Examination"}</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded font-mono text-2xl ${timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-secondary/50 text-white border border-white/20'}`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" onClick={() => handleSubmit(false)}>
            Finish Test
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        ...
      </main>

      {/* Question Navigation Footer */}
      <footer className="h-20 bg-secondary text-secondary-foreground border-t border-secondary/20 flex items-center px-6 gap-4">
        <div className="text-xs font-bold uppercase tracking-tighter w-24 leading-tight opacity-70">Question Navigation</div>
        <div className="flex-1 flex gap-1 overflow-x-auto py-2 no-scrollbar">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const isAnswered = i < answeredCount;
            return (
              <div 
                key={i} 
                className={`min-w-[32px] h-8 flex items-center justify-center rounded-sm text-xs font-bold transition-colors border ${
                  isAnswered 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-secondary/30 text-white/50 border-white/10'
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-secondary/30 border border-white/10 rounded-sm" />
            <span>Not Answered</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
