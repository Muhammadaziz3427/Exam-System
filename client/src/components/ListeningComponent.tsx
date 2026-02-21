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

    switch (q.type) {
      case 'gap_fill':
        return (
          <div key={qId} id={`q-container-${globalNum}`} className="mb-2">
            <p>
              {q.text.split('_____').map((part: string, i: number, arr: string[]) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <input
                      type="text"
                      className="answer-input"
                      placeholder={String(globalNum)}
                      value={answers[qId] || ''}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                    />
                  )}
                </span>
              ))}
            </p>
          </div>
        );

      case 'mcq_single':
        return (
          <div key={qId} id={`q-container-${globalNum}`} className="space-y-2">
            <p><strong>{globalNum}.</strong> {q.text}</p>
            <div className="flex flex-col space-y-1">
              {q.options?.map((opt: string) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${globalNum}`}
                    value={opt.charAt(0)}
                    checked={answers[qId] === opt.charAt(0)}
                    onChange={(e) => handleAnswerChange(qId, e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            <button onClick={() => handleFlagToggle(qId)} className="ml-2">
              <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
            </button>
          </div>
        );

      case 'mcq_multi':
        return (
          <div key={qId} id={`q-container-${globalNum}`} className="space-y-2">
            <p><strong>{globalNum}.</strong> {q.text}</p>
            <div className="flex flex-col space-y-1">
              {q.options?.map((opt: string) => {
                const optionLetter = opt.charAt(0);
                const isChecked = Array.isArray(answers[qId]) && answers[qId].includes(optionLetter);
                return (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={optionLetter}
                      checked={isChecked}
                      onChange={(e) => handleCheckboxChange(qId, optionLetter, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            <button onClick={() => handleFlagToggle(qId)} className="ml-2">
              <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
            </button>
          </div>
        );

      case 'matching':
        // For matching, we assume q.options is the list of draggable options,
        // and q.targets is the list of target descriptions (e.g., exhibition names).
        // If not provided, fallback to simple dropdown.
        if (q.targets && q.options) {
          const usedOptions = getUsedOptions(parts[partIndex]?.questions || []);
          return (
            <div key={qId} id={`q-container-${globalNum}`} className="flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors"
                 onDragOver={(e) => handleDragOver(e, qId)}
                 onDragLeave={handleDragLeave}
                 onDrop={(e) => handleDrop(e, qId)}>
              <span className="font-bold w-8">{globalNum}</span>
              <span className="flex-1">{q.targets[qIdx] || q.text}</span>
              <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                {answers[qId] && <span className="font-bold text-blue-600">{answers[qId]}</span>}
              </div>
            </div>
          );
        } else {
          // Fallback to select dropdown if no drag-drop info
          return (
            <div key={qId} id={`q-container-${globalNum}`} className="flex items-center gap-4 mb-2">
              <span className="font-bold w-8">{globalNum}</span>
              <span className="flex-1">{q.text}</span>
              <select
                className="answer-select w-24"
                value={answers[qId] || ''}
                onChange={(e) => handleAnswerChange(qId, e.target.value)}
              >
                <option value="">Select</option>
                {q.options?.map((opt: string) => (
                  <option key={opt} value={opt.charAt(0)}>{opt}</option>
                ))}
              </select>
              <button onClick={() => handleFlagToggle(qId)} className="ml-2">
                <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
              </button>
            </div>
          );
        }

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {isTransferring && (
        <div className="w-full bg-amber-50 p-2 text-center text-sm font-medium">
          Transfer Time: {Math.floor(transferTimeLeft / 60)}:{String(transferTimeLeft % 60).padStart(2, '0')}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!listeningData ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Listening ma'lumotlari topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-12 p-8 pb-32">
          {parts.map((part: any, pIdx: number) => (
            <div
              key={pIdx}
              className={`space-y-6 ${pIdx + 1 === currentPart ? '' : 'hidden'}`}
              style={{ display: pIdx + 1 === currentPart ? 'block' : 'none' }}
            >
              {/* Part header */}
              <div className="border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50 rounded-r-lg">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {part.title || `Part ${pIdx + 1}`}
                </h3>
                {part.instruction && (
                  <p className="text-sm text-slate-500">{part.instruction}</p>
                )}
              </div>

              {/* Part image (for maps, diagrams) */}
              {part.image && (
                <div className="my-4">
                  <img
                    src={part.image}
                    alt={`Part ${pIdx + 1} visual`}
                    className="max-w-full h-auto rounded-lg border shadow-sm"
                  />
                </div>
              )}

              {/* Questions */}
              <div className="space-y-6">
                {part.questions?.map((q: any, qIdx: number) => renderQuestion(q, pIdx, qIdx))}
              </div>

              {/* If part has its own draggable options box (for matching across multiple questions) */}
              {part.dragOptions && (
                <div className="w-64 space-y-2 p-4 bg-gray-50 rounded border">
                  <p className="font-bold text-sm mb-2">Drag options:</p>
                  {part.dragOptions.map((opt: any, idx: number) => {
                    const used = getUsedOptions(part.questions);
                    const isUsed = used.has(opt.letter);
                    return (
                      <div
                        key={idx}
                        draggable={!isUsed}
                        onDragStart={(e) => handleDragStart(e, opt.letter)}
                        onDragEnd={handleDragEnd}
                        className={`drag-item p-2 bg-white border rounded cursor-move hover:bg-gray-100 ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ display: isUsed ? 'none' : 'block' }}
                      >
                        <strong>{opt.letter}</strong> {opt.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}