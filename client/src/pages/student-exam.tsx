import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useStartSession } from "@/hooks/use-sessions";
import { ExamLayout } from "@/components/ExamLayout";
import { ListeningComponent } from "@/components/ListeningComponent";
import { ReadingComponent } from "@/components/ReadingComponent";
import { Textarea } from "@/components/ui/textarea";

export default function StudentExam() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [hasStarted, setHasStarted] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [email, setEmail] = useState("");
  
  const [section, setSection] = useState<"Listening" | "Reading" | "Writing">("Listening");
  const [currentPart, setCurrentPart] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // Default 30 mins
  const [writingContent, setWritingContent] = useState({ task1: "", task2: "" });

  const startSession = useStartSession();

  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (hasStarted && timeLeft === 0) {
      handleNextSession();
    }
  }, [hasStarted, timeLeft]);

  const startExamFlow = async () => {
    if (!email.includes("@")) {
      toast({ title: "Email required", description: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setIsLoadingContent(true);
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(`/api/exams/${session.examId}`);
      if (!examRes.ok) throw new Error("Exam not found");
      const exam = await examRes.json();
      setExamData(exam);
      setHasStarted(true);
      // Initialize time based on section
      setTimeLeft(1800); // Listening
    } catch (err) {
      toast({ title: "Error", description: "Could not load exam materials.", variant: "destructive" });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleNextSession = () => {
    if (section === "Listening") {
      setSection("Reading");
      setCurrentPart(1);
      setTimeLeft(3600); // 60 mins for Reading
    } else if (section === "Reading") {
      setSection("Writing");
      setCurrentPart(1);
      setTimeLeft(3600); // 60 mins for Writing
    } else {
      handleFinishExam();
    }
  };

  const handleFinishExam = async () => {
    try {
      const payload = {
        sessionId,
        answers,
        writing: writingContent,
        isReviewed: false,
      };
      await apiRequest("POST", "/api/test-results/submit", payload);
      setLocation("/test-completed");
    } catch (err) {
      toast({ title: "Submission Error", description: "Could not submit exam.", variant: "destructive" });
    }
  };

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl border-t-8 border-[#2b78c5]">
          <h1 className="text-2xl font-black text-slate-900 mb-6">IELTS Computer-Delivered</h1>
          <div className="space-y-4">
            <Input 
              placeholder="Your Email" 
              className="h-12 border-[#e0e0e0]" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <Button 
              className="w-full h-14 bg-[#2b78c5] text-white hover:bg-[#2361a0]" 
              onClick={startExamFlow} 
              disabled={isLoadingContent}
            >
              {isLoadingContent ? "Loading..." : "Start Exam"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const answeredNumbers = Object.keys(answers).map(k => parseInt(k.replace(/^\D+/g, ''))).filter(n => !isNaN(n));

  return (
    <ExamLayout
      section={section}
      timeLeft={timeLeft}
      totalQuestions={40}
      answeredQuestions={answeredNumbers}
      currentQuestion={currentPart}
      onQuestionClick={(num) => {
        // Simple logic for part navigation
        if (num <= 10) setCurrentPart(1);
        else if (num <= 20) setCurrentPart(2);
        else if (num <= 30) setCurrentPart(3);
        else setCurrentPart(4);
      }}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {section === "Listening" && (
            <ListeningComponent 
              content={examData.listening} 
              currentPart={currentPart} 
              answers={answers} 
              setAnswers={setAnswers} 
            />
          )}
          
          {section === "Reading" && (
            <div className="flex h-full">
              <div className="w-1/2 overflow-y-auto p-6 border-r border-[#e0e0e0] leading-relaxed">
                <h2 className="text-2xl font-bold mb-4">{examData.reading?.passages[currentPart-1]?.title}</h2>
                <div dangerouslySetInnerHTML={{ __html: examData.reading?.passages[currentPart-1]?.text }} />
              </div>
              <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
                <ReadingComponent 
                  passage={examData.reading?.passages[currentPart-1]}
                  baseQNum={(currentPart-1) * 13 + 1}
                  answers={answers}
                  setAnswers={setAnswers}
                  reviewFlags={{}}
                  setReviewFlags={() => {}}
                  currentSection="reading"
                />
              </div>
            </div>
          )}

          {section === "Writing" && (
            <div className="flex h-full">
              <div className="w-1/2 overflow-y-auto p-6 border-r border-[#e0e0e0]">
                <h2 className="text-2xl font-bold mb-4">Writing Task {currentPart}</h2>
                <div dangerouslySetInnerHTML={{ __html: currentPart === 1 ? examData.writing?.task1Prompt : examData.writing?.task2Prompt }} />
              </div>
              <div className="w-1/2 p-6 bg-gray-50 flex flex-col">
                <Textarea 
                  className="flex-1 p-4 text-lg border-[#e0e0e0] focus:ring-[#2b78c5]"
                  value={currentPart === 1 ? writingContent.task1 : writingContent.task2}
                  onChange={(e) => setWritingContent(prev => ({
                    ...prev,
                    [currentPart === 1 ? 'task1' : 'task2']: e.target.value
                  }))}
                  placeholder="Type your essay here..."
                />
                <div className="mt-2 text-sm text-gray-500 font-mono">
                  Word Count: {(currentPart === 1 ? writingContent.task1 : writingContent.task2).trim().split(/\s+/).filter(Boolean).length}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#e0e0e0] flex justify-end gap-4 bg-white">
          {section === "Writing" && currentPart === 1 ? (
             <Button onClick={() => setCurrentPart(2)} className="bg-[#2b78c5]">Next Task</Button>
          ) : (
            <Button 
              onClick={section === "Writing" && currentPart === 2 ? handleFinishExam : handleNextSession} 
              className="bg-[#2b78c5]"
            >
              {section === "Writing" && currentPart === 2 ? "Finish Exam" : "Next Session"}
            </Button>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
