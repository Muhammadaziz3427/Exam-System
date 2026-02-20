function ListeningComponent({ content, currentPart, answers = {}, setAnswers, reviewFlags, setReviewFlags, currentSection }: any) {
  const parts = content?.parts || [];

  const handleAnswerChange = (qId: string, value: any, isMulti: boolean = false) => {
    setAnswers((prev: any) => ({ ...prev, [qId]: value }));
  };

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

  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const used = new Set<string>();
    Object.keys(answers).forEach(key => {
      if (key.startsWith('q-') && answers[key]) {
        used.add(answers[key]);
      }
    });
    setUsedOptions(used);
  }, [answers]);

  const getGlobalQuestionNumber = (partIndex: number, questionIndex: number) => {
    let count = 0;
    for (let i = 0; i < partIndex; i++) {
      count += parts[i]?.questions?.length || 0;
    }
    return count + questionIndex + 1;
  };

  const renderQuestion = (q: any, partIndex: number, qIdx: number) => {
    const qId = q.id || `q-${partIndex + 1}-${qIdx + 1}`;
    const globalNum = getGlobalQuestionNumber(partIndex, qIdx);

    switch (q.type) {
      case 'gap_fill':
        const hasBlank = q.text.includes('_____');
        return (
          <div key={qId} id={`q-container-${globalNum}`} className="mb-2">
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
                        value={answers[qId] || ''}
                        onChange={(e) => handleAnswerChange(qId, e.target.value)}
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
                    value={answers[qId] || ''}
                    onChange={(e) => handleAnswerChange(qId, e.target.value)}
                  />
                </>
              )}
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
        if (q.targets) {
          const targetText = q.targets[qIdx] || q.text;
          return (
            <div
              key={qId}
              id={`q-container-${globalNum}`}
              className={`flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors ${dragOverZone === qId ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              onDragOver={(e) => handleDragOver(e, qId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, qId)}
            >
              <span className="font-bold w-8">{globalNum}</span>
              <span className="flex-1">{targetText}</span>
              <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                {answers[qId] && <span className="font-bold text-blue-600">{answers[qId]}</span>}
              </div>
            </div>
          );
        } else {
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
              <div className="border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50 rounded-r-lg">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {part.title || `Part ${pIdx + 1}`}
                </h3>
                {part.instruction && <p className="text-sm text-slate-500">{part.instruction}</p>}
              </div>

              {part.image && (
                <div className="my-4">
                  <img
                    src={part.image}
                    alt={`Part ${pIdx + 1}`}
                    className="max-w-full h-auto rounded-lg border shadow-sm"
                  />
                </div>
              )}

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