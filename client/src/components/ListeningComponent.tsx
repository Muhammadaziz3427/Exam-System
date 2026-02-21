import { useEffect, useState, useRef } from "react";
import { Flag } from "lucide-react";

export function ListeningComponent({ content, currentPart, answers = {}, setAnswers, reviewFlags, setReviewFlags, currentSection }: any) {
  const parts = content?.parts || [];

  // ========== Answer handlers ==========
  const handleAnswerChange = (qId: string, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [qId]: value }));
  };

  const handleFlagToggle = (qId: string) => {
    setReviewFlags((prev: Record<string, boolean>) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // ========== Drag & Drop state and functions ==========
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

  const handleDropOnZone = (e: React.DragEvent, qId: string, zoneIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (!draggedItem) return;

    const optionLetter = draggedItem.letter;
    const currentAnswer = answers[qId];

    // Agar zonada allaqachon javob bo‘lsa, uni almashtiramiz (swap) yoki qaytaramiz
    if (currentAnswer) {
      // Boshqa zona bu variantni ishlatganmi?
      const otherZone = Object.keys(answers).find(key => answers[key] === optionLetter && key !== qId);
      if (otherZone) {
        // Swap: ikkala zonaning javoblarini almashtir
        setAnswers((prev: any) => ({
          ...prev,
          [qId]: optionLetter,
          [otherZone]: currentAnswer
        }));
      } else {
        // Zona to‘ldirilgan, yangi variantni qo‘yamiz
        setAnswers((prev: any) => ({ ...prev, [qId]: optionLetter }));
      }
    } else {
      // Zona bo‘sh, variantni joylashtir
      setAnswers((prev: any) => ({ ...prev, [qId]: optionLetter }));
    }

    // Drag tugadi
    setDraggedItem(null);
  };

  const returnOptionToList = (optLetter: string) => {
    // Zonadagi variantni o‘chirish va ro‘yxatga qaytarish
    const qIdToClear = Object.keys(answers).find(key => answers[key] === optLetter);
    if (qIdToClear) {
      setAnswers((prev: any) => {
        const newAnswers = { ...prev };
        delete newAnswers[qIdToClear];
        return newAnswers;
      });
    }
  };

  // UsedOptions ni hisoblash
  useEffect(() => {
    const used = new Set<string>();
    Object.values(answers).forEach((val: any) => {
      if (typeof val === 'string' && val.length === 1) used.add(val);
    });
    setUsedOptions(used);
  }, [answers]);

  // ========== Global question number helper ==========
  const getGlobalNum = (partIdx: number, qIdx: number) => {
    let count = 0;
    for (let i = 0; i < partIdx; i++) {
      count += parts[i]?.questions?.length || 0;
    }
    return count + qIdx + 1;
  };

  // ========== Render functions for each part ==========

  // Part 1: Music Alive Agency form (gap_fill)
  const renderPart1 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    return (
      <div key="part1" className="space-y-4">
        <div className="border border-black p-6">
          <p className="text-center font-bold text-2xl mb-6">Music Alive Agency</p>
          <p className="italic mb-4">Example</p>
          {questions.map((q: any, qIdx: number) => {
            const qId = q.id || `q-${pIdx + 1}-${qIdx + 1}`;
            const globalNum = getGlobalNum(pIdx, qIdx);
            const parts = q.text.split('_____');
            return (
              <div key={qId} id={`q-container-${globalNum}`} className="mb-2">
                <p>
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                <button onClick={() => handleFlagToggle(qId)} className="ml-2">
                  <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Part 2: Radio 11-14 + Map dropdown 15-20
  const renderPart2 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    const radioQuestions = questions.slice(0, 4);  // 11-14
    const mapQuestions = questions.slice(4);       // 15-20

    return (
      <div key="part2" className="space-y-8">
        {/* 11-14 Radio */}
        <div>
          <p className="font-bold mb-2">Questions 11-14</p>
          <p className="mb-4">Choose the correct letter A, B or C.</p>
          <div className="space-y-4">
            {radioQuestions.map((q: any, qIdx: number) => {
              const qId = q.id || `q-${pIdx + 1}-${qIdx}`;
              const globalNum = getGlobalNum(pIdx, qIdx);
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
            })}
          </div>
        </div>

        {/* Map and dropdowns 15-20 */}
        <div>
          <p className="font-bold mb-2">Questions 15-20</p>
          <p className="mb-4">Label the map below. Write the correct letter, A-I, next to questions 15-20.</p>
          <div className="map-container mb-4">
            <img
              src={part.image || "https://ia600906.us.archive.org/32/items/skrinshot-2025-08-12-202707-copy-copy-copy-copy-copy-copy/Skrinshot%202025-08-12%20202707%20-%20CopyCopyCopyCopyCopyCopy.png"}
              alt="Map"
              className="w-full max-w-md mx-auto border border-gray-300"
            />
          </div>
          {mapQuestions.map((q: any, qIdx: number) => {
            const globalNum = getGlobalNum(pIdx, qIdx + 4);
            const qId = q.id || `q-${pIdx + 1}-${qIdx + 4}`;
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
                  {['A','B','C','D','E','F','G','H','I'].map(letter => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>
                <button onClick={() => handleFlagToggle(qId)} className="ml-2">
                  <Flag size={18} className={reviewFlags[qId] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Part 3: Radio 21-26 + Drag-drop 27-30
  const renderPart3 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    const radioQuestions = questions.slice(0, 6);  // 21-26
    const dragQuestions = questions.slice(6);       // 27-30 (matching)
    const dragOptions = part.dragOptions || [];

    return (
      <div key="part3" className="space-y-8">
        {/* 21-26 Radio */}
        <div>
          <p className="font-bold mb-2">Questions 21-26</p>
          <p className="mb-4">Choose the correct answer.</p>
          <div className="space-y-4">
            {radioQuestions.map((q: any, qIdx: number) => {
              const qId = q.id || `q-${pIdx + 1}-${qIdx}`;
              const globalNum = getGlobalNum(pIdx, qIdx);
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
            })}
          </div>
        </div>

        {/* 27-30 Drag-drop */}
        <div>
          <p className="font-bold mb-2">Questions 27-30</p>
          <p className="mb-4">Which feature do the speakers identify as particularly interesting for each of the following exhibitions they saw?</p>
          <p>Choose FOUR answers from the box and write the correct letter, <strong>A-F</strong>, next to questions 27-30.</p>
          <div className="flex gap-8 mt-4">
            <div className="flex-1 space-y-2">
              {dragQuestions.map((q: any, qIdx: number) => {
                const globalNum = getGlobalNum(pIdx, qIdx + 6);
                const qId = q.id || `q-${pIdx + 1}-${qIdx + 6}`;
                return (
                  <div
                    key={qId}
                    id={`q-container-${globalNum}`}
                    className={`flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors ${answers[qId] ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnZone(e, qId, qIdx)}
                  >
                    <span className="font-bold w-8">{globalNum}</span>
                    <span className="flex-1">{q.text}</span>
                    <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                      {answers[qId] && <span className="font-bold text-blue-600">{answers[qId]}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-64 space-y-2 p-4 bg-gray-50 rounded border">
              <p className="font-bold text-sm mb-2">Drag options:</p>
              {dragOptions.map((opt: any, idx: number) => {
                const isUsed = usedOptions.has(opt.letter);
                return (
                  <div
                    key={idx}
                    draggable={!isUsed}
                    onDragStart={(e) => handleDragStart(e, opt)}
                    onDragEnd={handleDragEnd}
                    className={`drag-item p-2 bg-white border rounded cursor-move hover:bg-gray-100 ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ display: isUsed ? 'none' : 'block' }}
                  >
                    <strong>{opt.letter}</strong> {opt.text}
                  </div>
                );
              })}
              {/* Click handler to return option from zone to list */}
              {dragQuestions.map((q: any, qIdx: number) => {
                const qId = q.id || `q-${pIdx + 1}-${qIdx + 6}`;
                if (answers[qId]) {
                  return (
                    <div key={`return-${qId}`} className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={() => returnOptionToList(answers[qId])}>
                      ↻ Return {answers[qId]}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Part 4: Bullet list with gap_fill
  const renderPart4 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    return (
      <div key="part4" className="space-y-4">
        <div className="border border-black p-6">
          <p className="text-center font-bold text-2xl mb-6">The Mangrove Regeneration Project</p>
          <p><strong>Background:</strong></p>
          <p><strong>Mangrove forests:</strong></p>
          <ul className="list-none pl-5 space-y-2">
            {questions.slice(0,2).map((q: any, qIdx: number) => {
              const globalNum = getGlobalNum(pIdx, qIdx);
              const qId = q.id || `q-${pIdx + 1}-${qIdx}`;
              const parts = q.text.split('_____');
              return (
                <li key={qId} id={`q-container-${globalNum}`}>
                  • {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                </li>
              );
            })}
            <li>• are an important habitat for wildlife</li>
          </ul>
          <p><strong>Problems:</strong></p>
          <ul className="list-none pl-5 space-y-2">
            {questions.slice(2,5).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 2);
              const qId = q.id || `q-${pIdx + 1}-${idx + 2}`;
              const parts = q.text.split('_____');
              return (
                <li key={qId} id={`q-container-${globalNum}`}>
                  • {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                </li>
              );
            })}
          </ul>
          <p><strong>Actions taken to protect the mangroves:</strong></p>
          <ul className="list-none pl-5 space-y-2">
            {questions.slice(5,8).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 5);
              const qId = q.id || `q-${pIdx + 1}-${idx + 5}`;
              const parts = q.text.split('_____');
              return (
                <li key={qId} id={`q-container-${globalNum}`}>
                  • {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                </li>
              );
            })}
            <li>• new mangroves had to be grown from seed</li>
          </ul>
          <p><strong>First set of seedlings:</strong></p>
          <ul className="list-none pl-5 space-y-2">
            {questions.slice(8,12).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 8);
              const qId = q.id || `q-${pIdx + 1}-${idx + 8}`;
              const parts = q.text.split('_____');
              return (
                <li key={qId} id={`q-container-${globalNum}`}>
                  • {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                </li>
              );
            })}
          </ul>
          <p><strong>Second set of seedlings:</strong></p>
          <ul className="list-none pl-5 space-y-2">
            {questions.slice(12,13).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 12);
              const qId = q.id || `q-${pIdx + 1}-${idx + 12}`;
              const parts = q.text.split('_____');
              return (
                <li key={qId} id={`q-container-${globalNum}`}>
                  • {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
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
                </li>
              );
            })}
          </ul>
          <p><strong>Results:</strong> The first set of seedlings was successful</p>
        </div>
      </div>
    );
  };

  // ========== Main render ==========
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
              className={`space-y-6 ${pIdx + 1 === currentPart ? '' : 'hidden'}`}
              style={{ display: pIdx + 1 === currentPart ? 'block' : 'none' }}
            >
              {/* Part header */}
              <div className="part-header">
                <p><strong>Part {pIdx + 1}</strong></p>
                <p>Listen and answer questions {pIdx === 0 ? '1–10' : pIdx === 1 ? '11–20' : pIdx === 2 ? '21–30' : '31–40'}.</p>
              </div>

              {/* Render specific part */}
              {pIdx === 0 && renderPart1(part, pIdx)}
              {pIdx === 1 && renderPart2(part, pIdx)}
              {pIdx === 2 && renderPart3(part, pIdx)}
              {pIdx === 3 && renderPart4(part, pIdx)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}