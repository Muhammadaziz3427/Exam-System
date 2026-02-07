import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Headphones, AlertCircle } from "lucide-react";

interface ListeningComponentProps {
  audioUrl: string;
  onSectionComplete: () => void;
}

export function ListeningComponent({ audioUrl, onSectionComplete }: ListeningComponentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120); // 2 minutes
  const [error, setError] = useState<string | null>(null);

  // MANZILNI TO'G'RILASH:
  // Agar audioUrl allaqachon "/uploads/" bilan boshlansa, uni o'zini qoldiramiz.
  // Aks holda boshiga qo'shib qo'yamiz.
  const fullAudioPath = audioUrl?.startsWith('/uploads/') 
    ? audioUrl 
    : `/uploads/${audioUrl}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const startAudio = () => {
      audio.play().catch(err => {
        console.log("Auto-play prevented, waiting for interaction", err);
      });
    };

    // IELTS Logic: 3 soniyadan keyin avtomatik ijro
    const timer = setTimeout(startAudio, 3000);

    const handleFirstClick = () => {
      startAudio();
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsTransferring(true);
    };

    const handleError = () => {
      setError("Audio faylni yuklab bo'lmadi. Manzil noto'g'ri yoki fayl o'chirilgan.");
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleFirstClick);
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (isTransferring) {
      const timer = setInterval(() => {
        setTransferTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onSectionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTransferring, onSectionComplete]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-full animate-pulse">
              <Headphones size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Listening Section</h2>
              <p className="text-sm opacity-70">Audio will play only once. Do not refresh the page.</p>
            </div>
          </div>
          {error && (
            <Badge variant="destructive" className="flex gap-1">
              <AlertCircle size={14} /> Error
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono opacity-50">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} key={audioUrl} preload="auto">
          <source src={fullAudioPath} type="audio/mpeg" />
          <source src={fullAudioPath} type="audio/wav" />
          Your browser does not support the audio element.
        </audio>
      </Card>

      {error && (
        <p className="text-red-500 text-center text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">
          {error} <br/> 
          <span className="text-[10px] font-mono">Path: {fullAudioPath}</span>
        </p>
      )}

      {isTransferring && (
        <Card className="p-6 border-amber-200 bg-amber-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="animate-bounce border-amber-200 text-amber-700">Transfer Time</Badge>
              <p className="text-amber-900 font-medium">
                Audio finished. You have {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')} to check your answers.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="prose prose-slate max-w-none">
        <p className="text-slate-500 italic text-center">
          {isTransferring 
            ? "Review your answers carefully before the next section starts." 
            : "The listening test has started. Follow the instructions in the audio."}
        </p>
      </div>
    </div>
  );
}