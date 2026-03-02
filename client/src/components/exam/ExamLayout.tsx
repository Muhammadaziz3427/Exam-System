import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ExamHeader from "./ExamHeader";
import ExamFooter from "./ExamFooter";
import ListeningSection from "./ListeningSection";
import ReadingSection from "./ReadingSection";
import WritingSection from "./WritingSection";
import { apiRequest } from "@/lib/queryClient";

interface ExamLayoutProps {
  exam: any;
  sessionId: number;
}

export default function ExamLayout({ exam, sessionId }: ExamLayoutProps) {
  const [currentSection, setCurrentSection] = useState<"listening" | "reading" | "writing">("listening");
  const [answers, setAnswers] = useState<any>({ listening: {}, reading: {}, writing: {} });
  const [timeLeft, setTimeLeft] = useState(exam.timeLimit * 60);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNextSection = () => {
    if (currentSection === "listening") setCurrentSection("reading");
    else if (currentSection === "reading") setCurrentSection("writing");
    else handleFinish();
  };

  const handleFinish = async () => {
    try {
      await apiRequest("POST", `/api/test-results/submit`, {
        sessionId,
        answers,
      });
      toast({ title: "Exam Finished", description: "Your answers have been submitted." });
      setLocation("/test-completed");
    } catch (error) {
      toast({ title: "Submission Failed", variant: "destructive" });
    }
  };

  const updateAnswers = (section: string, sectionAnswers: any) => {
    setAnswers((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], ...sectionAnswers },
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <ExamHeader 
        title={`IELTS ${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}`} 
        timeLeft={timeLeft} 
      />
      
      <main className="flex-1 overflow-hidden relative">
        {currentSection === "listening" && (
          <ListeningSection 
            data={exam.content.listening} 
            answers={answers.listening}
            onChange={(vals) => updateAnswers("listening", vals)}
          />
        )}
        {currentSection === "reading" && (
          <ReadingSection 
            data={exam.content.reading} 
            answers={answers.reading}
            onChange={(vals) => updateAnswers("reading", vals)}
          />
        )}
        {currentSection === "writing" && (
          <WritingSection 
            data={exam.content.writing} 
            answers={answers.writing}
            onChange={(vals) => updateAnswers("writing", vals)}
          />
        )}
      </main>

      <ExamFooter 
        currentSection={currentSection}
        answers={answers[currentSection]}
        onNext={handleNextSection}
        isLast={currentSection === "writing"}
      />
    </div>
  );
}
