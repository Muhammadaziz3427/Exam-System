import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Headphones, AlertCircle, Flag } from "lucide-react";
import { Input } from "@/components/ui-kit"; // Input qo'shildi
import { ScrollArea } from "@/components/ui/scroll-area";

interface ListeningComponentProps {
  audioUrl: string;
  onSectionComplete: () => void;
  // Savollar va javoblar uchun yangi propslar
  examContent?: any; 
  answers: any;
  setAnswers: (answers: any) => void;
}

export function ListeningComponent({ 
  audioUrl, 
  onSectionComplete, 
  examContent, 
  answers, 
  setAnswers 
}: ListeningComponentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120); // 2 minutes
  const [error, setError] = useState<string | null>(null);
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  const fullAudioPath = audioUrl?.startsWith('/uploads/') 
    ? audioUrl 
    : `/uploads/${audioUrl}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const startAudio = () => {
      audio.play().catch(err => {
        console.log("Auto-play prevented", err);
      });
    };

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
    <div className="h-full flex flex-col bg-white">
      {/* Audio Player qismi - Tepada qotib turadi */}
      <div className="w-full bg-slate-50 border-b p-4 z-10">
        <Card className="max-w-4xl mx-auto p-4 bg-slate-900 text-white border-none shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-full animate-pulse">
                <Headphones size={18} />
              </div>
              <div>
                <h2 className="text-md font-bold">Listening Section</h2>
                <p className="text-[10px] opacity-70">Audio plays once. Focus on the questions below.</p>
              </div>
            </div>
            {isTransferring && (
               <Badge className="bg-amber-500 animate-bounce">
                Transfer Time: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
               </Badge>
            )}
          </div>

          <div className="space-y-1">
            <Progress value={progress} className="h-1.5 bg-slate-800" />
            <div className="flex justify-between text-[10px] font-mono opacity-50">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          <audio ref={audioRef} key={audioUrl} preload="auto">
            <source src={fullAudioPath} type="audio/mpeg" />
            Your browser does not support audio.
          </audio>
        </Card>
      </div>

      {/* Savollar qismi - Scroll bo'ladigan joy */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-8 pb-24">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Listening savollarini render qilish (Section 1-4) */}
            {examContent?.listening?.sections?.map((section: any, sIdx: number) => (
              <div key={`l-sec-${sIdx}`} className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    Section {sIdx + 1}
                  </h3>
                  <p className="text-sm text-slate-500">Questions {sIdx * 10 + 1} - {sIdx * 10 + 10}</p>
                </div>

                <div className="grid gap-4">
                  {section.questions?.map((q: any, qIdx: number) => {
                    const qGlobalIdx = (sIdx * 10) + (qIdx + 1);
                    const qId = `q-${qGlobalIdx}`;

                    return (
                      <div 
                        key={qId} 
                        id={`q-container-${qGlobalIdx}`}
                        className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex gap-4"
                      >
                        <span className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {qGlobalIdx}
                        </span>

                        <div className="flex-1 space-y-3">
                          <p className="text-slate-700 font-medium leading-relaxed">{q.text}</p>
                          <Input 
                            placeholder="Write your answer..."
                            className="h-10 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={answers.listening[qId] || ""}
                            onChange={(e) => setAnswers({
                              ...answers,
                              listening: { ...answers.listening, [qId]: e.target.value }
                            })}
                          />
                        </div>

                        <button 
                          onClick={() => setReviewFlags({...reviewFlags, [qId]: !reviewFlags[qId]})}
                          className="pt-1"
                        >
                          <Flag 
                            size={16} 
                            className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-300 hover:text-slate-400"} 
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-slate-400 text-xs italic">
            End of Listening Questions. Ensure all answers are filled.
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}