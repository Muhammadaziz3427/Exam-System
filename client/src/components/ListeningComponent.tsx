import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Headphones, AlertCircle, Flag } from "lucide-react";

interface ListeningComponentProps {
  audioUrl: string;
  onSectionComplete: () => void;
  examContent?: any;
  content?: any;
  answers?: any;
  setAnswers: (answers: any) => void;
  currentPart: number;
  reviewFlags?: Record<string, boolean>;
  setReviewFlags?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function ListeningComponent({
  audioUrl,
  onSectionComplete,
  examContent,
  content,
  answers = {},
  setAnswers,
  currentPart,
  reviewFlags = {},
  setReviewFlags = () => {},
}: ListeningComponentProps) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  const listeningData = content || examContent?.listening;
  const parts = listeningData?.parts || listeningData?.sections || [];

  useEffect(() => {
    if (isTransferring) {
      const timer = setInterval(() => {
        setTransferTimeLeft((prev: number) => {
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

  // Universal answer handler
  const handleAnswerChange = (qId: string, value: string | string[], isMulti: boolean = false) => {
    setAnswers((prev: any) => ({ ...prev, [qId]: value }));
  };

  // For checkbox multi-select
  const handleCheckboxChange = (qId: string, option: string, checked: boolean) => {
    const current = Array.isArray(answers[qId]) ? answers[qId] : [];
    let newValue;
    if (checked) {
      newValue = [...current, option];
    } else {
      newValue = current.filter((v: string) => v !== option);
    }
    newValue.sort();
    handleAnswerChange(qId, newValue, true);
  };

  const handleFlagToggle = (qId: string) => {
    setReviewFlags((prev: Record<string, boolean>) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Drag & drop functions (for matching type)
  const handleDragStart = (e: React.DragEvent, optionLetter: string) => {
    e.dataTransfer.setData("text/plain", optionLetter);
    e.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
  };

  const handleDragOver = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(zoneId);
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverZone(null);
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    const optionLetter = e.dataTransfer.getData("text/plain");
    if (!optionLetter) return;

    const existingAnswer = answers[questionId];
    if (existingAnswer) {
      const otherZone = Object.keys(answers).find(key => answers[key] === optionLetter);
      if (otherZone) {
        setAnswers((prev: any) => ({
          ...prev,
          [questionId]: optionLetter,
          [otherZone]: existingAnswer
        }));
      } else {
        setAnswers((prev: any) => ({ ...prev, [questionId]: optionLetter }));
      }
    } else {
      setAnswers((prev: any) => ({ ...prev, [questionId]: optionLetter }));
    }

    setDragOverZone(null);
    e.currentTarget.classList.remove("drag-over");
  };

  // Helper to compute used options for matching questions
  const getUsedOptions = (partQuestions: any[]) => {
    const used = new Set<string>();
    partQuestions.forEach((q: any) => {
      if (q.type === 'matching' && answers[q.id]) {
        used.add(answers[q.id]);
      }
    });
    return used;
  };

  // Render a single question based on its type
  const renderQuestion = (q: any, partIndex: number, qIdx: number) => {
    const qId = q.id || `q-${partIndex + 1}-${qIdx + 1}`;
    const globalNum = (() => {
      let count = 0;
      for (let i = 0; i < partIndex; i++) {
        count += parts[i]?.questions?.length || 0;
      }
      return count + qIdx + 1;
    })();

    const isAnswered = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';

    switch (q.type) {
      case 'gap_fill':
      case 'completion':
      case 'note':
      case 'short_answer':
        return (
          <div key={qId} id={`q-container-listening-${globalNum}`} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
            <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border text-sm font-bold transition-all ${isAnswered ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 group-hover:border-blue-300'}`}>
              {globalNum}
            </span>
            <div className="flex-1 pt-1">
              <p className="text-slate-700 leading-relaxed mb-2">
                {q.text.split('_____').map((part: string, i: number, arr: string[]) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <input
                        type="text"
                        className="mx-1 px-2 py-0.5 border-b-2 border-slate-300 focus:border-blue-500 bg-transparent outline-none transition-all w-32 text-blue-700 font-medium"
                        placeholder="..."
                        value={answers[qId] || ''}
                        onChange={(e) => handleAnswerChange(qId, e.target.value)}
                        data-testid={`input-q-${globalNum}`}
                      />
                    )}
                  </span>
                ))}
              </p>
            </div>
            <button onClick={() => handleFlagToggle(qId)} className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Review later">
              <Flag size={16} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-300"} />
            </button>
          </div>
        );

      case 'mcq_single':
      case 'multiple':
        return (
          <div key={qId} id={`q-container-listening-${globalNum}`} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group">
            <div className="flex items-start gap-3 mb-4">
               <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border text-sm font-bold transition-all ${isAnswered ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {globalNum}
              </span>
              <p className="text-slate-800 font-semibold pt-1">{q.text || q.questionText}</p>
              <button onClick={() => handleFlagToggle(qId)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <Flag size={16} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-300"} />
              </button>
            </div>
            <div className="grid gap-2 ml-11">
              {q.options?.map((opt: string, idx: number) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = answers[qId] === letter;
                return (
                  <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name={`q-listening-${globalNum}`}
                      value={letter}
                      checked={isSelected}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                      className="hidden"
                    />
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full border text-xs font-bold ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-300 text-slate-500'}`}>
                      {letter}
                    </span>
                    <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-600'}`}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'matching':
        return (
          <div key={qId} id={`q-container-listening-${globalNum}`} 
               className={`flex items-center gap-4 p-3 rounded-xl border transition-all group ${dragOverZone === qId ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-200'}`}
               onDragOver={(e) => handleDragOver(e, qId)}
               onDragLeave={handleDragLeave}
               onDrop={(e) => handleDrop(e, qId)}>
            <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border text-sm font-bold transition-all ${isAnswered ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
              {globalNum}
            </span>
            <span className="flex-1 text-slate-700 font-medium">{q.text}</span>
            <div className={`w-12 h-10 flex items-center justify-center rounded-lg border-2 transition-all ${answers[qId] ? 'bg-blue-50 border-blue-400 shadow-inner' : 'bg-slate-50 border-dashed border-slate-300'}`}>
              {answers[qId] && <span className="font-black text-blue-700 text-lg">{answers[qId]}</span>}
            </div>
            <button onClick={() => handleFlagToggle(qId)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Flag size={16} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-300"} />
            </button>
          </div>
        );

      default:
        return (
          <div key={qId} id={`q-container-listening-${globalNum}`} className="flex items-center gap-4 p-2 border-b border-slate-100">
             <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border text-sm font-bold ${isAnswered ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
              {globalNum}
            </span>
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Javobingizni kiriting"
              value={answers[qId] || ''}
              onChange={(e) => handleAnswerChange(qId, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {isTransferring && (
        <div className="w-full bg-amber-50 p-3 text-center text-sm font-black text-amber-700 border-b border-amber-100 animate-pulse flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          TRANSFER TIME: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
        </div>
      )}

      {error && (
        <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!listeningData ? (
        <div className="text-center py-20">
          <p className="text-slate-400 font-medium">Listening material is being prepared...</p>
        </div>
      ) : (
        <div className="space-y-12 p-10">
          {parts.map((part: any, pIdx: number) => (
            <div
              key={pIdx}
              className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${pIdx + 1 === currentPart ? 'block' : 'hidden'}`}
            >
              {/* Part header - IELTS Style */}
              <div className="mb-10 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1 rounded-md tracking-tighter">
                    SECTION {pIdx + 1}
                  </Badge>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {part.title || `Questions ${pIdx === 0 ? '1-10' : pIdx === 1 ? '11-20' : pIdx === 2 ? '21-30' : '31-40'}`}
                  </h3>
                </div>
                {part.instruction && (
                  <p className="text-slate-500 font-medium italic bg-slate-50 p-3 rounded-lg border-l-4 border-slate-200">
                    {part.instruction}
                  </p>
                )}
              </div>

              {/* Part image (for maps, diagrams) */}
              {part.image && (
                <div className="my-8 flex justify-center">
                  <div className="relative p-2 bg-white rounded-2xl shadow-xl border border-slate-200 ring-8 ring-slate-50/50">
                    <img
                      src={part.image}
                      alt={`Section ${pIdx + 1} Visual`}
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Questions Container */}
              <div className="grid gap-6 max-w-3xl mx-auto">
                {part.questions?.map((q: any, qIdx: number) => renderQuestion(q, pIdx, qIdx))}
              </div>

              {/* Draggable options box */}
              {part.dragOptions && (
                <div className="mt-12 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Available Options</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {part.dragOptions.map((opt: any, idx: number) => {
                      const used = getUsedOptions(part.questions);
                      const isUsed = used.has(opt.letter);
                      return (
                        <div
                          key={idx}
                          draggable={!isUsed}
                          onDragStart={(e) => handleDragStart(e, opt.letter)}
                          onDragEnd={handleDragEnd}
                          className={`group flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-xl cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-blue-300 ${isUsed ? 'opacity-20 grayscale pointer-events-none' : 'border-slate-200 shadow-sm'}`}
                        >
                          <span className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg font-black text-sm group-hover:bg-blue-600 transition-colors">
                            {opt.letter}
                          </span>
                          <span className="font-bold text-slate-700">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}