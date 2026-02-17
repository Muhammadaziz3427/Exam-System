import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Headphones, AlertCircle, Flag } from "lucide-react";
import { Input } from "@/components/ui-kit";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ListeningComponentProps {
  audioUrl: string;
  onSectionComplete: () => void;
  examContent?: any;
  content?: any;
  answers: any;
  setAnswers: (answers: any) => void;
}

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

export function ListeningComponent({
  audioUrl,
  onSectionComplete,
  examContent,
  content,
  answers,
  setAnswers
}: ListeningComponentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  // MUHIM: content (listening bo'limi) berilgan bo'lishi kerak
  const listeningData = content || examContent?.listening;
  console.log("Listening data received:", listeningData);

  const collections = listeningData?.parts || listeningData?.sections || [];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const timer = setTimeout(() => {
      audio.play().catch(() => console.log("Auto-play blocked, waiting for interaction"));
    }, 3000);

    const handleFirstClick = () => {
      audio.play().catch(() => {});
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

  const handleAnswerChange = (qId: string, value: string | string[]) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const handleCheckboxChange = (qId: string, option: string, checked: boolean) => {
    const current: string[] = answers[qId] || [];
    const newValue = checked
      ? [...current, option]
      : current.filter((v: string) => v !== option);
    setAnswers({ ...answers, [qId]: newValue });
  };

  const renderQuestionInput = (q: any, qId: string) => {
    const type = q.type?.toLowerCase();

    if (type === 'tfng' || type === 'ynng') {
      const options = type === 'tfng' ? TFNG_OPTIONS : YNNG_OPTIONS;
      return (
        <div className="flex gap-4 flex-wrap">
          {options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name={qId}
                value={opt}
                checked={answers[qId] === opt}
                onChange={(e) => handleAnswerChange(qId, e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === 'multiple' && !Array.isArray(q.answer)) {
      const options = q.options || ["A", "B", "C", "D"];
      return (
        <div className="flex gap-4 flex-wrap">
          {options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name={qId}
                value={opt}
                checked={answers[qId] === opt}
                onChange={(e) => handleAnswerChange(qId, e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === 'multiple' && Array.isArray(q.answer)) {
      const options = q.options || ["A", "B", "C", "D", "E"];
      return (
        <div className="flex gap-4 flex-wrap">
          {options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={opt}
                checked={(answers[qId] || []).includes(opt)}
                onChange={(e) => handleCheckboxChange(qId, opt, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === 'matching') {
      const options = q.options || ["A", "B", "C", "D", "E", "F", "G", "H"];
      return (
        <select
          value={answers[qId] || ""}
          onChange={(e) => handleAnswerChange(qId, e.target.value)}
          className="w-40 h-10 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Select...</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <Input
        placeholder="Write your answer..."
        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/30"
        value={answers[qId] || ""}
        onChange={(e) => handleAnswerChange(qId, e.target.value)}
      />
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
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
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support audio.
          </audio>
        </Card>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-8 pb-24">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!listeningData ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Listening ma'lumotlari topilmadi.</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Ushbu imtihonda listening savollari mavjud emas.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {collections.map((section: any, sIdx: number) => {
                const questionsBefore = collections
                  .slice(0, sIdx)
                  .reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0);

                return (
                  <div key={`l-sec-${sIdx}`} className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50 rounded-r-lg">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                        Part {section.id || sIdx + 1}
                      </h3>
                      <p className="text-sm text-slate-500">Answer the questions based on the audio clip.</p>
                    </div>

                    {section.image && (
                      <div className="my-4">
                        <img
                          src={section.image}
                          alt={`Section ${sIdx + 1} diagram`}
                          className="max-w-full h-auto rounded-lg border shadow-sm"
                        />
                      </div>
                    )}

                    <div className="grid gap-4">
                      {section.questions?.map((q: any, qIdx: number) => {
                        const qGlobalIdx = questionsBefore + qIdx + 1;
                        const qId = `q-${qGlobalIdx}`;

                        return (
                          <div
                            key={qId}
                            id={`q-container-${qGlobalIdx}`}
                            className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex gap-4"
                          >
                            <span className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {qGlobalIdx}
                            </span>

                            <div className="flex-1 space-y-3">
                              <p className="text-slate-700 font-medium leading-relaxed">{q.text}</p>

                              {q.instruction && (
                                <p className="text-xs font-semibold text-blue-600 italic">{q.instruction}</p>
                              )}

                              {(q.imageUrl || q.image) && (
                                <img src={q.imageUrl || q.image} alt="" className="w-full max-w-md rounded border mb-2" />
                              )}

                              {renderQuestionInput(q, qId)}
                            </div>

                            <button
                              onClick={() => setReviewFlags({ ...reviewFlags, [qId]: !reviewFlags[qId] })}
                              className="pt-1"
                            >
                              <Flag
                                size={16}
                                className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200 hover:text-slate-400"}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center text-slate-400 text-xs italic border-t pt-8">
            End of Listening Questions. The test will automatically transition after transfer time.
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}