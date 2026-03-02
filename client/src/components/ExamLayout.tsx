import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HelpCircle, EyeOff } from "lucide-react";

interface ExamLayoutProps {
  section: "Listening" | "Reading" | "Writing";
  timeLeft: number;
  totalQuestions: number;
  answeredQuestions: number[];
  currentQuestion: number;
  onQuestionClick: (num: number) => void;
  children: ReactNode;
}

export function ExamLayout({
  section,
  timeLeft,
  totalQuestions,
  answeredQuestions,
  currentQuestion,
  onQuestionClick,
  children,
}: ExamLayoutProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-black selection:bg-blue-100">
      {/* Header */}
      <header className="h-[60px] border-b border-[#e0e0e0] flex items-center justify-between px-6 bg-white sticky top-0 z-10">
        <div className="text-lg font-bold text-[#2b78c5]">IELTS {section}</div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 px-4 py-1 rounded font-mono text-xl border border-[#e0e0e0]">
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <HelpCircle className="w-4 h-4 mr-2" /> Help
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <EyeOff className="w-4 h-4 mr-2" /> Hide
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Footer Nav-Row */}
      <footer className="h-[80px] border-t border-[#e0e0e0] bg-white flex items-center px-6 sticky bottom-0 z-10 overflow-x-auto">
        <div className="flex gap-2 items-center">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
            const isAnswered = answeredQuestions.includes(num);
            const isCurrent = currentQuestion === num;
            
            return (
              <button
                key={num}
                onClick={() => onQuestionClick(num)}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors",
                  isCurrent 
                    ? "border-[#2b78c5] bg-[#2b78c5] text-white" 
                    : isAnswered 
                      ? "border-gray-600 bg-gray-600 text-white" 
                      : "border-[#e0e0e0] bg-white text-gray-600 hover:border-[#2b78c5]"
                )}
                data-testid={`button-question-${num}`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
