import { useEffect, useState } from "react";

export function ListeningComponent({ content, currentPart, answers = {}, setAnswers }: any) {
  const parts = content?.parts || [];

  const handleAnswerChange = (globalNum: number, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [globalNum]: value }));
  };

  // Drag & Drop state and functions (for Part 3)
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
          return {
            ...prev,
            [globalNum]: optionLetter,
            [Number(otherZone)]: currentAnswer
          };
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(answers)]);

  const getGlobalNum = (partIdx: number, qIdx: number) => {
    let count = 0;
    for (let i = 0; i < partIdx; i++) {
      count += parts[i]?.questions?.length || 0;
    }
    return count + qIdx + 1;
  };

  // ---------- Part 1 ----------
  const renderPart1 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    return (
      <div className="question">
        <div className="question-prompt">
          <p><strong>Questions 1-10</strong></p>
          <p>Complete the notes below.</p>
          <p>Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.</p>
        </div>
        <div style={{ border: '1px solid #000000', padding: '15px' }}>
          <p className="centered-title">Music Alive Agency</p>
          <p style={{ fontStyle: 'italic', marginBottom: '15px' }}>Example</p>
          <p><strong>Contact person:</strong> Jim Granley</p>
          {questions.map((q: any, qIdx: number) => {
            const globalNum = getGlobalNum(pIdx, qIdx);
            const parts = q.text.split('_____');
            return (
              <div key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '8px' }}>
                <p>
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
                        />
                      )}
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------- Part 2 ----------
  const renderPart2 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    const radioQ = questions.slice(0, 4); // 11-14
    const mapQ = questions.slice(4);       // 15-20

    return (
      <div className="questions-container">
        <div className="question">
          <div className="question-prompt">
            <p><strong>Questions 11-14</strong></p>
            <p>Choose the correct letter A, B or C.</p>
            <p className="centered-title">Information for participants in the Albany fishing competition</p>
          </div>
          <div className="single-choice-container">
            {radioQ.map((q: any, qIdx: number) => {
              const globalNum = getGlobalNum(pIdx, qIdx);
              return (
                <div key={globalNum} className="single-choice" id={`q-container-${globalNum}`} style={{ marginBottom: '15px' }}>
                  <p><strong>{globalNum}</strong> {q.text}</p>
                  {q.options?.map((opt: string) => (
                    <label key={opt} style={{ display: 'block', marginLeft: '20px' }}>
                      <input
                        type="radio"
                        name={`q-${globalNum}`}
                        value={opt.charAt(0)}
                        checked={answers[globalNum] === opt.charAt(0)}
                        onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                      />&nbsp;&nbsp;{opt}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="question">
          <div className="question-prompt">
            <p><strong>Questions 15-20</strong></p>
            <p>Label the map below.</p>
            <p>Write the correct letter, <strong>A-I</strong>, next to questions 15-20.</p>
            <p className="centered-title">Albany Fishing Competition Map</p>
            <div className="map-container">
              <img
                src={part.image || "https://ia600906.us.archive.org/32/items/skrinshot-2025-08-12-202707-copy-copy-copy-copy-copy-copy/Skrinshot%202025-08-12%20202707%20-%20CopyCopyCopyCopyCopyCopy.png"}
                alt="Map"
                style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc', margin: '20px 0' }}
              />
            </div>
          </div>
          <div className="questions-container">
            {mapQ.map((q: any, qIdx: number) => {
              const globalNum = getGlobalNum(pIdx, qIdx + 4);
              return (
                <div key={globalNum} className="matching-question-item" id={`q-container-${globalNum}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="question-text" style={{ marginRight: '10px', width: '200px' }}><strong>{globalNum}</strong> {q.text}</span>
                  <select
                    className="answer-select"
                    value={answers[globalNum] || ''}
                    onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                    style={{ width: '80px' }}
                  >
                    <option value="">Select...</option>
                    {['A','B','C','D','E','F','G','H','I'].map(letter => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Part 3 ----------
  const renderPart3 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    const radioQ = questions.slice(0, 6); // 21-26
    const dragQ = questions.slice(6);      // 27-30
    const dragOptions = part.dragOptions || [];

    return (
      <div className="questions-container">
        <div className="question">
          <div className="question-prompt">
            <p><strong>Questions 21-26</strong></p>
            <p>Choose the correct answer.</p>
            <p className="centered-title">Preparing for the end-of-year art exhibition</p>
          </div>
          <div className="single-choice-container">
            {radioQ.map((q: any, qIdx: number) => {
              const globalNum = getGlobalNum(pIdx, qIdx);
              return (
                <div key={globalNum} className="single-choice" id={`q-container-${globalNum}`} style={{ marginBottom: '15px' }}>
                  <p><strong>{globalNum}</strong> {q.text}</p>
                  {q.options?.map((opt: string) => (
                    <label key={opt} style={{ display: 'block', marginLeft: '20px' }}>
                      <input
                        type="radio"
                        name={`q-${globalNum}`}
                        value={opt.charAt(0)}
                        checked={answers[globalNum] === opt.charAt(0)}
                        onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                      />&nbsp;&nbsp;{opt}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="question">
          <div className="question-prompt">
            <p><strong>Questions 27-30</strong></p>
            <p>Which feature do the speakers identify as particularly interesting for each of the following exhibitions they saw?</p>
            <p>Choose FOUR answers from the box and write the correct letter, <strong>A-F</strong>, next to questions 27-30.</p>
          </div>
          <div className="drag-drop-container" style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div className="questions-container" style={{ flex: 1 }}>
              {dragQ.map((q: any, qIdx: number) => {
                const globalNum = getGlobalNum(pIdx, qIdx + 6);
                return (
                  <div key={globalNum} className="matching-question-item" style={{ marginBottom: '10px' }}>
                    <div className="question-line" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="question-text" style={{ flex: 1 }}>{q.text}</span>
                      <div
                        className={`summary-drop-zone ${answers[globalNum] ? 'filled' : ''}`}
                        data-question={`q${globalNum}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnZone(e, globalNum)}
                        style={{ border: '2px dashed #ccc', padding: '4px 8px', minWidth: '80px', textAlign: 'center', cursor: 'pointer' }}
                      >
                        <span>{globalNum}</span>
                        {answers[globalNum] && <span className="font-bold text-blue-600 ml-1">{answers[globalNum]}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="drag-options-container" style={{ width: '250px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Drag options:</p>
              {dragOptions.map((opt: any, idx: number) => {
                const isUsed = usedOptions.has(opt.letter);
                return (
                  <div
                    key={idx}
                    draggable={!isUsed}
                    onDragStart={(e) => handleDragStart(e, opt)}
                    onDragEnd={handleDragEnd}
                    className={`drag-item ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{
                      display: isUsed ? 'none' : 'block',
                      padding: '8px',
                      marginBottom: '5px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'move'
                    }}
                    data-value={opt.letter}
                  >
                    <strong>{opt.letter}</strong> {opt.text}
                  </div>
                );
              })}
              {dragQ.map((q: any, qIdx: number) => {
                const globalNum = getGlobalNum(pIdx, qIdx + 6);
                if (answers[globalNum]) {
                  return (
                    <div key={`return-${globalNum}`} style={{ fontSize: '12px', color: '#2563eb', marginTop: '5px', cursor: 'pointer' }} onClick={() => returnOptionToList(answers[globalNum])}>
                      ↻ Return {answers[globalNum]}
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

  // ---------- Part 4 ----------
  const renderPart4 = (part: any, pIdx: number) => {
    const questions = part.questions || [];
    return (
      <div className="question">
        <div className="question-prompt">
          <p><strong>Questions 31-40</strong></p>
          <p>Complete the notes below.</p>
          <p>Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.</p>
        </div>
        <div style={{ border: '1px solid #000000', padding: '15px', listStyleType: 'none' }}>
          <p className="centered-title">The Mangrove Regeneration Project</p>
          <p><strong>Background:</strong></p>
          <p><strong>Mangrove forests:</strong></p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
            {questions.slice(0,1).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx);
              const parts = q.text.split('_____');
              return (
                <li key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '5px' }}>
                  •&nbsp;&nbsp; protect coastal areas from 
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
                        />
                      )}
                    </span>
                  ))}
                  {' '}by the sea
                </li>
              );
            })}
            <li>•&nbsp;&nbsp; are an important habitat for wildlife</li>
          </ul>
          <p><strong>Problems:</strong></p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
            {questions.slice(1,4).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 1);
              const parts = q.text.split('_____');
              return (
                <li key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '5px' }}>
                  •&nbsp;&nbsp;
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
                        />
                      )}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
          <p><strong>Actions taken to protect the mangroves:</strong></p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
            {questions.slice(4,6).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 4);
              const parts = q.text.split('_____');
              return (
                <li key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '5px' }}>
                  •&nbsp;&nbsp;
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
                        />
                      )}
                    </span>
                  ))}
                </li>
              );
            })}
            <li>•&nbsp;&nbsp; new mangroves had to be grown from seed</li>
          </ul>
          <p><strong>First set of seedlings:</strong></p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
            {questions.slice(6,10).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 6);
              const parts = q.text.split('_____');
              return (
                <li key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '5px' }}>
                  •&nbsp;&nbsp;
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
                        />
                      )}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
          <p><strong>Second set of seedlings:</strong></p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
            {questions.slice(10,11).map((q: any, idx: number) => {
              const globalNum = getGlobalNum(pIdx, idx + 10);
              const parts = q.text.split('_____');
              return (
                <li key={globalNum} id={`q-container-${globalNum}`} style={{ marginBottom: '5px' }}>
                  •&nbsp;&nbsp;
                  {parts.map((part: string, i: number) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <input
                          type="text"
                          className="answer-input"
                          placeholder={String(globalNum)}
                          value={answers[globalNum] || ''}
                          onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                          style={{ margin: '0 4px' }}
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