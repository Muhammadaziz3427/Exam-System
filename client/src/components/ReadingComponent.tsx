import React from 'react';
import { Flag } from 'lucide-react';

interface ReadingComponentProps {
  passage: any;
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
  if (!passage || !passage.questions) {
    return <div className="p-4 text-center text-slate-500">No questions available for this passage.</div>;
  }

  const handleAnswerChange = (globalQNum: number, value: any) => {
    setAnswers({ ...answers, [globalQNum]: value });
  };

  const handleFlagToggle = (globalQNum: number) => {
    const key = `${currentSection}-${globalQNum}`;
    setReviewFlags((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderGapFill = (q: any, globalNum: number) => {
    const hasBlank = q.text.includes('_____');
    return (
      <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
        <div className="tf-question-line">
          <span className="tf-question-number">{globalNum}</span>
          <span className="tf-question-text">
            {hasBlank ? (
              q.text.split('_____').map((part: string, i: number, arr: string[]) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <input
                      type="text"
                      className="answer-input"
                      placeholder="_____"
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
                  className="answer-input ml-2"
                  placeholder="Answer"
                  value={answers[globalNum] || ''}
                  onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                />
              </>
            )}
          </span>
        </div>
        <div className="tf-options">
          <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
            <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
          </button>
        </div>
      </div>
    );
  };

  const renderMcqSingle = (q: any, globalNum: number) => {
    return (
      <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="multi-choice-question" data-q-start={globalNum}>
        <div className="question-prompt">
          <p><strong>{globalNum}.</strong> {q.text}</p>
        </div>
        <div className="space-y-2">
          {q.options?.map((opt: string) => {
            const letter = opt.charAt(0);
            return (
              <div key={opt} className="multi-choice-option">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${globalNum}`}
                    value={letter}
                    checked={answers[globalNum] === letter}
                    onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                    className="w-4 h-4"
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
  };

  const renderTfng = (q: any, globalNum: number) => {
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
  };

  const renderMatchingHeadings = (q: any, globalNum: number) => {
    const options = q.options || q.headingList || [];
    return (
      <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
        <div className="tf-question-line">
          <span className="tf-question-number">{globalNum}</span>
          <span className="tf-question-text">{q.text}</span>
        </div>
        <div className="tf-options">
          <select
            className="answer-select"
            value={answers[globalNum] || ''}
            onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
          >
            <option value="">Select</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt.charAt(0)}>{opt}</option>
            ))}
          </select>
          <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
            <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
          </button>
        </div>
      </div>
    );
  };

  const renderMatchingFeaturesTable = (questions: any[], startNum: number) => {
    const options = questions[0]?.options || [];
    if (options.length === 0) return null;

    return (
      <div key="matching-table" className="table-container">
        <table className="matching-table">
          <thead>
            <tr>
              <th></th>
              {options.map((opt: string) => (
                <th key={opt}>{opt.charAt(0)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => {
              const globalNum = startNum + idx;
              return (
                <tr key={globalNum}>
                  <td className="statement">
                    <strong>{globalNum}</strong> {q.text}
                  </td>
                  {options.map((opt: string) => {
                    const letter = opt.charAt(0);
                    const isSelected = answers[globalNum] === letter;
                    return (
                      <td
                        key={letter}
                        className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                        data-question={`q-${globalNum}`}
                        data-value={letter}
                        onClick={() => handleAnswerChange(globalNum, letter)}
                      ></td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Group matching_features together
  const grouped: { [key: string]: any[] } = {};
  passage.questions.forEach((q: any) => {
    if (!grouped[q.type]) grouped[q.type] = [];
    grouped[q.type].push(q);
  });

  const renderedSections: JSX.Element[] = [];
  let currentIdx = 0;

  if (grouped['matching_features']?.length > 0) {
    renderedSections.push(
      renderMatchingFeaturesTable(grouped['matching_features'], baseQNum + currentIdx)
    );
    currentIdx += grouped['matching_features'].length;
  }

  for (let i = 0; i < passage.questions.length; i++) {
    const q = passage.questions[i];
    if (q.type === 'matching_features') continue;

    const globalNum = baseQNum + i;

    switch (q.type) {
      case 'gap_fill':
        renderedSections.push(renderGapFill(q, globalNum));
        break;
      case 'mcq_single':
        renderedSections.push(renderMcqSingle(q, globalNum));
        break;
      case 'tfng':
      case 'ynng':
        renderedSections.push(renderTfng(q, globalNum));
        break;
      case 'matching_headings':
        renderedSections.push(renderMatchingHeadings(q, globalNum));
        break;
      default:
        renderedSections.push(
          <div key={globalNum} className="text-red-500 p-2">
            Unknown question type: {q.type}
          </div>
        );
    }
  }

  return <div className="space-y-6">{renderedSections}</div>;
}