import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useStartSession, useSubmitAnswers, useLogViolation } from "@/hooks/use-sessions";
import { Button, Textarea } from "@/components/ui-kit";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "react-resizable-panels";
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
    if (currentSection === 'listening') setCurrentSection('reading');
    else if (currentSection === 'reading') setCurrentSection('writing');
  };

  const handleSubmit = async (isFinal = false) => {
    await submitAnswers.mutateAsync({ id: sessionId, answers, isFinal: true });
    // Cleanup listeners
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen();
    alert("Test Submitted Successfully!");
    setLocation("/");
  };

  if (!hasStarted) return <LockdownModal onStart={handleStart} />;
  if (!examContent) return <div className="p-10 text-center">Loading exam content...</div>;

  // --- RENDER SECTIONS ---
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md z-10">
        <div className="font-bold text-lg tracking-wide">CD-IELTS Mock</div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full font-mono text-xl text-amber-400">
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" onClick={() => handleSubmit(true)}>
            Finish Test
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* LISTENING */}
        {currentSection === 'listening' && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in">
            <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
              <h2 className="text-3xl font-bold mb-4 text-primary">Listening Section</h2>
              <p className="text-slate-500 mb-8">
                Audio will play automatically. Answer the questions as you listen.
                Once the audio ends, you will have 2 minutes to check answers before moving to Reading.
              </p>
              
              {/* Hidden controls, auto-play */}
              <audio 
                src={examContent.listening.audioUrl} 
                autoPlay 
                className="w-full mb-8" 
                controlsList="nodownload noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                // In production, we'd hide controls via CSS or custom player to prevent seeking
              />

              <div className="text-left space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {examContent.listening.questions.map((q: any, i: number) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium mb-3">{i + 1}. {q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded cursor-pointer">
                          <input 
                            type="radio" 
                            name={q.id} 
                            value={opt}
                            onChange={(e) => setAnswers(prev => ({
                              ...prev,
                              listening: { ...prev.listening, [q.id]: e.target.value }
                            }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t mt-6">
                <Button onClick={nextSection} className="w-full text-lg">
                  Submit Listening & Start Reading
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* READING */}
        {currentSection === 'reading' && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30} className="bg-white p-8 overflow-y-auto border-r scroll-smooth">
              <div className="max-w-2xl mx-auto reading-passage">
                <h3 className="text-xl font-bold mb-4 font-sans text-slate-400 uppercase tracking-widest text-xs">Passage</h3>
                <h2 className="text-3xl font-serif font-bold mb-6 text-slate-900">The Origins of Technology</h2>
                <div className="prose prose-lg text-slate-800">
                  {/* Mock content injection */}
                  <p>{examContent.reading.passage}</p>
                  <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                  <p className="mt-4">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                  {/* Repeat content for scrolling effect */}
                  <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={50} minSize={30} className="bg-slate-50 p-8 overflow-y-auto">
               <div className="max-w-xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">Questions</h3>
                   <Button size="sm" onClick={nextSection}>Finish Reading</Button>
                 </div>
                 <div className="space-y-6">
                   {/* Mock questions if none in content */}
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                       <p className="font-medium mb-2">Question {i}</p>
                       <p className="text-sm text-slate-500 mb-3">According to paragraph 2, what is the main reason for...</p>
                       <Textarea placeholder="Type your answer here..." className="bg-slate-50 border-0" />
                     </div>
                   ))}
                 </div>
               </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* WRITING */}
        {currentSection === 'writing' && (
          <div className="h-full flex flex-col p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-10">
            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
              <div className="bg-slate-50 p-6 border-b">
                <h3 className="font-bold text-slate-900 mb-2">Writing Task 2</h3>
                <p className="text-slate-600">
                  {examContent.writing.prompts[0]}
                </p>
              </div>
              <div className="flex-1 relative">
                <textarea 
                  className="w-full h-full p-8 resize-none focus:outline-none text-lg leading-relaxed font-serif"
                  placeholder="Start typing your essay here..."
                  value={answers.writing}
                  onChange={(e) => setAnswers(prev => ({ ...prev, writing: e.target.value }))}
                  spellCheck={false}
                />
                <div className="absolute bottom-4 right-4 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                  Word Count: {answers.writing.trim().split(/\s+/).filter(Boolean).length}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="lg" className="px-8" onClick={() => handleSubmit(true)}>
                Submit Final Exam <FileCheck className="ml-2" size={18} />
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
