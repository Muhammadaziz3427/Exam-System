import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea, Badge } from "@/components/ui-kit";
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

// --- QUESTION RENDERER ---
function QuestionRenderer({ q, answer, onChange }: { q: any, answer: any, onChange: (val: any) => void }) {
  if (q.type === 'gap_fill') {
    const parts = q.text.split('[___]');
    return (
      <div className="leading-loose text-lg">
        {parts.map((part: string, i: number) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                className="mx-2 px-2 py-1 border-b-2 border-slate-300 focus:border-primary outline-none min-w-[80px] bg-slate-50 transition-colors"
                value={(answer as string[])?.[i] || ""}
                onChange={(e) => {
                  const newAnswers = Array.isArray(answer) ? [...answer] : [];
                  newAnswers[i] = e.target.value;
                  onChange(newAnswers);
                }}
              />
            )}
          </span>
        ))}
      </div>
    );
  }

  if (q.type === 'map_labeling') {
    return (
      <div className="space-y-6">
        <div className="relative inline-block border rounded-lg overflow-hidden bg-white shadow-sm">
          <img src={q.imageUrl} alt="Map/Diagram" className="max-w-full h-auto" />
          {q.coordinates?.map((coord: any, i: number) => (
            <div
              key={i}
              className="absolute w-6 h-6 bg-primary text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white shadow-md font-bold"
              style={{ left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%, -50%)' }}
              title={coord.label}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.coordinates?.map((coord: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full font-bold text-slate-500 text-sm">{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 mb-1">{coord.label}</p>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border rounded-md focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Enter label..."
                  value={(answer as Record<string, string>)?.[coord.label] || ""}
                  onChange={(e) => {
                    const newAnswers = typeof answer === 'object' && answer !== null ? { ...answer } : {};
                    newAnswers[coord.label] = e.target.value;
                    onChange(newAnswers);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {q.options?.map((opt: string) => (
        <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="radio"
            name={`q-${q.id}`}
            className="w-4 h-4 text-primary"
            checked={answer === opt}
            onChange={() => onChange(opt)}
          />
          <span className="text-slate-700">{opt}</span>
        </label>
      ))}
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

  const handleVisibilityChangeOld = () => {
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
    
    // Use a more modern approach for highlighting if possible, 
    // but for the sake of the requirement "Text Highlighter tool", 
    // execCommand is a quick way to show visual feedback in this demo.
    document.execCommand('backColor', false, '#fef08a'); // yellow-200
    setShowHighlightBtn(null);
  };

  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  const toggleFlag = (index: number) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(index)) {
      newFlagged.delete(index);
    } else {
      newFlagged.add(index);
    }
    setFlaggedQuestions(newFlagged);
  };

  const handleSubmit = async (isFinal = false) => {
    await submitAnswers.mutateAsync({ id: sessionId, answers, isFinal: true });
    // Cleanup listeners
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen();
    localStorage.removeItem("student_session");
    // Show a neutral message instead of scores
    alert(isFinal ? "Time is up! Your exam has been auto-submitted and is now under review." : "Test Submitted Successfully! Your results will be available after admin approval.");
    setLocation("/");
  };

  // Writing Word Counter
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const [violationCount, setViolationCount] = useState(0);

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setViolationCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 2) {
          handleSubmit(true);
          alert("Security violation detected (2nd attempt). Exam terminated.");
        } else {
          alert("WARNING: Tab switching is strictly prohibited. Your attempt has been logged.");
        }
        return newCount;
      });
      logViolation.mutate({ id: sessionId, type: "tab_switch" });
    }
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
  
  // Calculate answered status for footer
  const getIsAnswered = (index: number) => {
    // This logic depends on how questions are indexed in answers
    // For simplicity in this mock, we'll check if any answer exists for that index
    return answers.listening[index + 1] !== undefined || 
           answers.reading[index + 1] !== undefined ||
           (currentSection === 'writing' && answers.writing.length > 0);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-secondary text-secondary-foreground flex items-center justify-between px-6 shadow-md z-10 border-b border-secondary/20">
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">
            {session.firstName ? `${session.firstName} ${session.lastName}` : (session.studentName || "Student")}
          </span>
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
      <main className="flex-1 overflow-hidden relative" onMouseUp={handleSelection}>
        {showHighlightBtn && (
          <Button
            size="sm"
            className="fixed z-50 bg-primary shadow-lg"
            style={{ left: showHighlightBtn.x, top: showHighlightBtn.y }}
            onClick={applyHighlight}
          >
            Highlight
          </Button>
        )}

        {currentSection === 'listening' && (
          <div className="h-full flex flex-col items-center p-8 overflow-y-auto space-y-8">
            <div className="max-w-4xl w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Listening Section</h2>
                    <p className="text-slate-500 text-sm">Audio will play. Answer the questions as you listen.</p>
                  </div>
                </div>
                <div className="bg-slate-100 px-4 py-2 rounded-lg">
                  <audio 
                    controls 
                    className="h-10" 
                    onPlay={() => {
                      // Logic to track audio plays if needed
                    }}
                  >
                    <source src={examContent.listening?.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>

              <div className="space-y-8 py-4">
                {examContent.listening?.questions?.map((q: any) => (
                  <div key={q.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <p className="font-bold text-slate-900 text-lg">{q.id}. {q.type === 'gap_fill' ? "Complete the gaps below:" : q.text}</p>
                    <QuestionRenderer 
                      q={q} 
                      answer={answers.listening[q.id]} 
                      onChange={(val) => setAnswers(prev => ({
                        ...prev,
                        listening: { ...prev.listening, [q.id]: val }
                      }))}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8">
                <Button size="lg" className="px-12" onClick={nextSection}>Finish Listening & Continue</Button>
              </div>
            </div>
          </div>
        )}

        {currentSection === 'reading' && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto p-8 bg-white prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold mb-4">Reading Passage</h2>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {examContent.reading?.passage || "No passage content available."}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto p-8 bg-slate-50">
                <h3 className="text-xl font-bold mb-6">Questions</h3>
                <div className="space-y-8">
                  {examContent.reading?.passages?.map((passage: any) => (
                    <div key={passage.id} className="space-y-6">
                      <h4 className="font-bold text-lg text-slate-700 border-b pb-2">{passage.title}</h4>
                      {passage.questions?.map((q: any) => (
                        <div key={q.id} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <p className="font-bold text-slate-900">{q.id || q.text}. {q.type === 'gap_fill' ? "Complete the gaps:" : q.text}</p>
                          <QuestionRenderer 
                            q={q} 
                            answer={answers.reading[q.id]} 
                            onChange={(val) => setAnswers(prev => ({
                              ...prev,
                              reading: { ...prev.reading, [q.id]: val }
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {/* Fallback for legacy structure */}
                  {!examContent.reading?.passages && examContent.reading?.questions?.map((q: any) => (
                    <div key={q.id} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <p className="font-medium text-slate-900">{q.id}. {q.text}</p>
                      <QuestionRenderer 
                        q={q} 
                        answer={answers.reading[q.id]} 
                        onChange={(val) => setAnswers(prev => ({
                          ...prev,
                          reading: { ...prev.reading, [q.id]: val }
                        }))}
                      />
                    </div>
                  ))}
                  <Button className="w-full mt-8" onClick={nextSection}>Continue to Writing</Button>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {currentSection === 'writing' && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto p-8 bg-white space-y-8">
                <h2 className="text-2xl font-bold">Writing Section</h2>
                {examContent.writing?.tasks?.map((task: any, idx: number) => (
                  <div key={idx} className="space-y-6 border-b pb-8 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase tracking-wider">
                        {task.type === 'task1' ? 'Task 1' : 'Task 2'}
                      </Badge>
                    </div>
                    
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {task.content || "No writing prompt available."}
                      </p>
                    </div>

                    {task.image && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                        <img 
                          src={task.image} 
                          alt="Writing Task Illustration" 
                          className="w-full h-auto object-contain max-h-[400px]"
                        />
                      </div>
                    )}

                    {task.prompts && task.prompts.length > 0 && (
                      <div className="space-y-2">
                        {task.prompts.map((p: string, pIdx: number) => (
                          <p key={pIdx} className="text-slate-600 italic border-l-4 border-primary/20 pl-4 py-1">
                            {p}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col p-8 bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Your Response</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 shadow-sm">
                    Word Count: <span className="text-primary">{getWordCount(answers.writing)}</span>
                  </div>
                </div>
                <Textarea
                  className="flex-1 bg-white border-slate-200 focus:ring-primary text-lg leading-relaxed p-6"
                  placeholder="Type your response here..."
                  value={answers.writing}
                  onChange={(e) => setAnswers(prev => ({ ...prev, writing: e.target.value }))}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      {/* Question Navigation Footer */}
      <footer className="h-24 bg-secondary text-secondary-foreground border-t border-secondary/20 flex items-center px-6 gap-4">
        <div className="text-xs font-bold uppercase tracking-tighter w-24 leading-tight opacity-70">Question Navigation</div>
        <div className="flex-1 flex gap-1.5 overflow-x-auto py-2 no-scrollbar">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const index = i + 1;
            const isAnswered = getIsAnswered(i);
            const isFlagged = flaggedQuestions.has(index);
            
            return (
              <div 
                key={i}
                onClick={() => toggleFlag(index)}
                className={`min-w-[36px] h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all cursor-pointer border-2 relative ${
                  isAnswered 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-secondary/30 text-white/40 border-white/5 hover:border-white/20'
                }`}
              >
                {index}
                {isFlagged && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-secondary shadow-sm" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className="w-4 h-4 bg-primary rounded-sm shadow-sm" />
            <span className="opacity-80">Answered</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className="w-4 h-4 bg-secondary/30 border border-white/10 rounded-sm" />
            <span className="opacity-80">Unanswered</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className="w-4 h-4 bg-amber-400 rounded-full shadow-sm" />
            <span className="opacity-80">Flagged</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
