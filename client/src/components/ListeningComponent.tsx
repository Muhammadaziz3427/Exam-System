import { useEffect, useState } from "react";

export function ListeningComponent({ content, currentPart, answers = {}, setAnswers }: any) {
  const parts = content?.parts || [];

  const handleAnswerChange = (globalNum: number, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [globalNum]: value }));
  };

  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());

  const handleDragStart = (e: React.DragEvent, opt: any) => {
    setDraggedItem(opt);
    e.dataTransfer.setData("text/plain", opt.letter);
    e.currentTarget.classList.add("dragging");
  };
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
    setDraggedItem(null);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drag-over");
  };
  const handleDropOnZone = (e: React.DragEvent, globalNum: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (!draggedItem) return;
    const optionLetter = draggedItem.letter;
    setAnswers((prev: any) => {
      const currentAnswer = prev[globalNum];
      if (currentAnswer) {
        const otherZone = Object.keys(prev).find(key => prev[Number(key)] === optionLetter && Number(key) !== globalNum);
        if (otherZone) {
          return { ...prev, [globalNum]: optionLetter, [Number(otherZone)]: currentAnswer };
        } else {
          return { ...prev, [globalNum]: optionLetter };
        }
      } else {
        return { ...prev, [globalNum]: optionLetter };
      }
    });
    setDraggedItem(null);
  };
  const returnOptionToList = (optLetter: string) => {
    setAnswers((prev: any) => {
      const globalNum = Object.keys(prev).find(key => prev[Number(key)] === optLetter);
      if (globalNum) {
        const newAnswers = { ...prev };
        delete newAnswers[Number(globalNum)];
        return newAnswers;
      }
      return prev;
    });
  };

  useEffect(() => {
    const used = new Set<string>();
    Object.values(answers).forEach((val: any) => {
      if (typeof val === 'string' && val.length === 1) used.add(val);
    });
    setUsedOptions(used);
  }, [answers]);

  const getGlobalNum = (partIdx: number, qIdx: number) => {
    let count = 0;
    for (let i = 0; i < partIdx; i++) {
      count += parts[i]?.questions?.length || 0;
    }
    return count + qIdx + 1;
  };

  const renderQuestion = (q: any, partIdx: number, qIdx: number) => {
    const globalNum = getGlobalNum(partIdx, qIdx);
    const part = parts[partIdx];

    switch (q.type) {
      case 'gap_fill':
        const hasBlank = q.text.includes('_____');
        return (
          <div key={globalNum} id={`q-container-listening-${globalNum}`} className="mb-2">
            <p>
              {hasBlank ? (
                q.text.split('_____').map((part: string, i: number, arr: string[]) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <input
                        type="text"
                        className="answer-input"
                        placeholder={String(globalNum)}
                        value={answers[globalNum] || ''}
                        onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                      />
                    )}
                  </span>
                ))
              ) : (
                <>
                  {q.text}
                  <input
                    type="text"
                    className="answer-input"
                    placeholder={String(globalNum)}
                    value={answers[globalNum] || ''}
                    onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                  />
                </>
              )}
            </p>
          </div>
        );
      case 'mcq_single':
        return (
          <div key={globalNum} id={`q-container-listening-${globalNum}`} className="space-y-2">
            <p><strong>{globalNum}.</strong> {q.text}</p>
            <div className="flex flex-col space-y-1">
              {q.options?.map((opt: string) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${globalNum}`}
                    value={opt.charAt(0)}
                    checked={answers[globalNum] === opt.charAt(0)}
                    onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'mcq_multi':
        return (
          <div key={globalNum} id={`q-container-listening-${globalNum}`} className="space-y-2">
            <p><strong>{globalNum}.</strong> {q.text}</p>
            <div className="flex flex-col space-y-1">
              {q.options?.map((opt: string) => {
                const letter = opt.charAt(0);
                const isChecked = Array.isArray(answers[globalNum]) && answers[globalNum].includes(letter);
                return (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={letter}
                      checked={isChecked}
                      onChange={(e) => {
                        const current = Array.isArray(answers[globalNum]) ? answers[globalNum] : [];
                        let newValue;
                        if (e.target.checked) {
                          newValue = [...current, letter];
                        } else {
                          newValue = current.filter((v: string) => v !== letter);
                        }
                        newValue.sort();
                        handleAnswerChange(globalNum, newValue);
                      }}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case 'map_select':
        return (
          <div key={globalNum} id={`q-container-listening-${globalNum}`} className="flex items-center gap-4 mb-2">
            <span className="font-bold w-8">{globalNum}</span>
            <span className="flex-1">{q.text}</span>
            <select
              className="answer-select w-24"
              value={answers[globalNum] || ''}
              onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
            >
              <option value="">Select</option>
              {q.options?.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'matching':
        if (part?.dragOptions) {
          return (
            <div
              key={globalNum}
              id={`q-container-listening-${globalNum}`}
              className={`flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors ${draggedItem ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnZone(e, globalNum)}
            >
              <span className="font-bold w-8">{globalNum}</span>
              <span className="flex-1">{q.text}</span>
              <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                {answers[globalNum] && <span className="font-bold text-blue-600">{answers[globalNum]}</span>}
              </div>
            </div>
          );
        } else {
          return (
            <div key={globalNum} id={`q-container-listening-${globalNum}`} className="flex items-center gap-4 mb-2">
              <span className="font-bold w-8">{globalNum}</span>
              <span className="flex-1">{q.text}</span>
              <select
                className="answer-select w-24"
                value={answers[globalNum] || ''}
                onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
              >
                <option value="">Select</option>
                {q.options?.map((opt: string) => (
                  <option key={opt} value={opt.charAt(0)}>{opt}</option>
                ))}
              </select>
            </div>
          );
        }
      default:
        return (
          <div key={globalNum} className="text-red-500 p-2">
            Unknown question type: {q.type}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {!content ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Listening ma'lumotlari topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-12 p-8 pb-32">
          {parts.map((part: any, pIdx: number) => (
            <div
              key={pIdx}
              id={`part-${pIdx + 1}`}
              className={`question-part ${pIdx + 1 === currentPart ? '' : 'hidden'}`}
            >
              <div className="part-header">
                <p><strong>Part {pIdx + 1}</strong></p>
                <p>Listen and answer questions {pIdx === 0 ? '1–10' : pIdx === 1 ? '11–20' : pIdx === 2 ? '21–30' : '31–40'}.</p>
              </div>
              <div className="space-y-6">
                {part.questions?.map((q: any, qIdx: number) => renderQuestion(q, pIdx, qIdx))}
              </div>
              {part.dragOptions && (
                <div className="w-64 space-y-2 p-4 bg-gray-50 rounded border">
                  <p className="font-bold text-sm mb-2">Drag options:</p>
                  {part.dragOptions.map((opt: any, idx: number) => {
                    const isUsed = usedOptions.has(opt.letter);
                    return (
                      <div
                        key={idx}
                        draggable={!isUsed}
                        onDragStart={(e) => handleDragStart(e, opt)}
                        onDragEnd={handleDragEnd}
                        className={`drag-item p-2 bg-white border rounded cursor-move hover:bg-gray-100 ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ display: isUsed ? 'none' : 'block' }}
                        data-value={opt.letter}
                      >
                        <strong>{opt.letter}</strong> {opt.text}
                      </div>
                    );
                  })}
                  {part.questions?.filter((q: any) => q.type === 'matching' && answers[getGlobalNum(pIdx, part.questions.indexOf(q))]).map((q: any, idx: number) => {
                    const globalNum = getGlobalNum(pIdx, part.questions.indexOf(q));
                    return (
                      <div key={`return-${globalNum}`} className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={() => returnOptionToList(answers[globalNum])}>
                        ↻ Return {answers[globalNum]}
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