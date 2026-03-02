import { Button } from "@/components/ui/button";

interface ExamFooterProps {
  currentSection: string;
  answers: any;
  onNext: () => void;
  isLast: boolean;
}

export default function ExamFooter({ currentSection, answers, onNext, isLast }: ExamFooterProps) {
  const totalQuestions = 40; // IELTS standard
  const questionNumbers = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  return (
    <footer className="h-[80px] border-t border-[#e0e0e0] flex items-center px-6 bg-white shrink-0 z-10 gap-6">
      <div className="flex-1 overflow-x-auto no-scrollbar py-2">
        <div className="flex gap-2 min-w-max">
          {questionNumbers.map((num) => {
            const isAnswered = answers[`q-${num}`] !== undefined && answers[`q-${num}`] !== "";
            // Simplified logic for "Current" would need more state, using simple logic here
            return (
              <div
                key={num}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors
                  ${isAnswered ? "bg-gray-600 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-500 hover:border-[#2b78c5]"}
                `}
                data-testid={`question-circle-${num}`}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>
      <Button 
        onClick={onNext}
        className="bg-[#2b78c5] hover:bg-[#2361a0] text-white px-8 font-bold"
        data-testid="button-next-session"
      >
        {isLast ? "Finish Exam" : "Next Session"}
      </Button>
    </footer>
  );
}
