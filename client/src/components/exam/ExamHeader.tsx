import { Button } from "@/components/ui/button";
import { HelpCircle, EyeOff } from "lucide-react";

interface ExamHeaderProps {
  title: string;
  timeLeft: number;
}

export default function ExamHeader({ title, timeLeft }: ExamHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header className="h-[60px] border-b border-[#e0e0e0] flex items-center justify-between px-6 bg-white shrink-0 z-10">
      <h1 className="text-lg font-bold text-[#2b78c5]">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-xl font-mono font-bold bg-[#f5f5f5] px-4 py-1 rounded border border-[#e0e0e0]">
          {formatTime(timeLeft)}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <HelpCircle className="w-4 h-4 mr-2" /> Help
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <EyeOff className="w-4 h-4 mr-2" /> Hide
          </Button>
        </div>
      </div>
    </header>
  );
}
