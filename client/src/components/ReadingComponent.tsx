import React from 'react';
import { Flag } from 'lucide-react';

interface Question {
  id: number;
  type: string;
  text: string;
  options?: string[];
  answer?: string | string[];
  instruction?: string;
  headingList?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
}

interface ReadingComponentProps {
  passage: {
    questions: Question[];
  };
  baseQNum: number;
  answers: Record<number, any>;
  setAnswers: (answers: any) => void;
  reviewFlags: Record<string, boolean>;
  setReviewFlags: (flags: any) => void;
  currentSection: string;
}

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

export function ReadingComponent({
  passage,
  baseQNum,
  answers = {},
  setAnswers,
  reviewFlags,
  setReviewFlags,
  currentSection
}: ReadingComponentProps) {
  const handleAnswerChange = (globalQNum: number, value: any) => {
    setAnswers({ ...answers, [globalQNum]: value });
  };

  const handleFlagToggle = (globalQNum: number) => {
    const key = `${currentSection}-${globalQNum}`;
    setReviewFlags((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  // Render a single question based on its type
  const renderQuestion = (q: Question, index: number) => {
    const globalNum = baseQNum + index;

    switch (q.type) {
      case 'tfng':
      case 'ynng':
        const options = q.type === 'tfng' ? TFNG_OPTIONS : YNNG_OPTIONS;
        return (
          <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
            <div className="tf-question-line">
              <span className="tf-question-number">{globalNum}</span>
              <span className="tf-question-text">{q.text}</span>
            </div>
            <div className="tf-options">
              {options.map(opt => (
                <label key={opt} className="tf-option">
                  <input
                    type="radio"
                    name={`q-${globalNum}`}
                    value={opt}
                    checked={answers[globalNum] === opt}
                    onChange={() => handleAnswerChange(globalNum, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
              <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
                <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
              </button>
            </div>
          </div>
        );

      case 'mcq_single':
      case 'mcq_multi':
        return (
          <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="multi-choice-question" data-q-start={globalNum}>
            <div className="question-prompt">
              <p><strong>{globalNum}.</strong> {q.text}</p>
            </div>
            <div className="space-y-2">
              {q.options?.map((opt) => {
                const letter = opt.charAt(0);
                const isChecked = q.type === 'mcq_single'
                  ? answers[globalNum] === letter
                  : (Array.isArray(answers[globalNum]) && answers[globalNum].includes(letter));
                return (
                  <div key={opt} className="multi-choice-option">
                    <label>
                      <input
                        type={q.type === 'mcq_single' ? 'radio' : 'checkbox'}
                        name={q.type === 'mcq_single' ? `q-${globalNum}` : undefined}
                        value={letter}
                        checked={isChecked}
                        onChange={(e) => {
                          if (q.type === 'mcq_single') {
                            handleAnswerChange(globalNum, letter);
                          } else {
                            const current = Array.isArray(answers[globalNum]) ? answers[globalNum] : [];
                            const newVal = e.target.checked
                              ? [...current, letter]
                              : current.filter((v: string) => v !== letter);
                            handleAnswerChange(globalNum, newVal);
                          }
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  </div>
                );
              })}
              <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
                <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
              </button>
            </div>
          </div>
        );

      case 'gap_fill':
      case 'sentence_completion':
        return (
          <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="gap-fill" data-q-start={globalNum}>
            <p>
              <span className="font-bold mr-2">{globalNum}.</span>
              {q.text.split('_____').map((part, i, arr) => (
                <React.Fragment key={i}>
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
                </React.Fragment>
              ))}
            </p>
            <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
              <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
            </button>
          </div>
        );

      case 'matching_features':
      case 'matching_headings':
        // Sizning matching table kodingiz – bu yerda soddaroq variant
        return (
          <div key={globalNum} className="matching-question">
            {/* Bu qismni sizning jadvalingizga moslab to‘ldirishingiz kerak */}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {passage?.questions?.map((q, idx) => renderQuestion(q, idx))}
    </div>
  );
}