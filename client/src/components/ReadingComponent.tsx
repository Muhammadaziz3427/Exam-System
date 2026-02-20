import React from 'react';
import { Flag } from 'lucide-react';

interface ReadingComponentProps {
  passageIdx: number; // 0,1,2 – Part 1,2,3
  baseQNum: number;   // global question number start
  answers: Record<number, any>;
  setAnswers: (answers: any) => void;
  reviewFlags: Record<string, boolean>;
  setReviewFlags: (flags: any) => void;
  currentSection: string;
}

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

export function ReadingComponent({
  passageIdx,
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

  // Part 1 (questions 1-13)
  const renderPart1 = () => {
    return (
      <div className="space-y-6">
        {/* Questions 1-5: paragraph matching (dropdown) */}
        <div className="question" data-q-start={baseQNum} data-q-end={baseQNum + 4}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum}–{baseQNum + 4}</strong></p>
            <p>The text has nine sections</p>
            <p>Which paragraph contains the following information?</p>
          </div>
          {[1,2,3,4,5].map((localNum) => {
            const globalNum = baseQNum + localNum - 1;
            const texts = [
              "a comparison of the ways two materials are used to replace silk-producing glands",
              "predictions regarding the availability of the synthetic silk",
              "ongoing research into other synthetic materials",
              "the research into the part of the spider that manufactures silk",
              "the possible application of the silk in civil engineering"
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
                <div className="tf-question-line">
                  <span className="tf-question-number">{globalNum}</span>
                  <span className="tf-question-text">{texts[localNum-1]}</span>
                </div>
                <div className="tf-options">
                  <select
                    className="answer-select"
                    value={answers[globalNum] || ''}
                    onChange={(e) => handleAnswerChange(globalNum, e.target.value)}
                  >
                    <option value="">Select</option>
                    {['A','B','C','D','E','F','G','H','I'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
                    <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Questions 6-10: flow-chart */}
        <div className="question" data-q-start={baseQNum + 5} data-q-end={baseQNum + 9}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 5}–{baseQNum + 9}</strong></p>
            <p>Complete the flow-chart below. Write <strong>NO MORE THAN TWO WORDS</strong> from the text for each answer.</p>
          </div>
          <div className="summary-text" style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
            <p>
              Synthetic gene grown in
              <input
                type="text"
                className="answer-input"
                autoComplete="off"
                value={answers[baseQNum + 5] || ''}
                onChange={(e) => handleAnswerChange(baseQNum + 5, e.target.value)}
                placeholder={String(baseQNum + 5)}
              />
              or
              <input
                type="text"
                className="answer-input"
                autoComplete="off"
                value={answers[baseQNum + 6] || ''}
                onChange={(e) => handleAnswerChange(baseQNum + 6, e.target.value)}
                placeholder={String(baseQNum + 6)}
              />
            </p>
            <p>↓</p>
            <p>
              globules of
              <input
                type="text"
                className="answer-input"
                autoComplete="off"
                value={answers[baseQNum + 7] || ''}
                onChange={(e) => handleAnswerChange(baseQNum + 7, e.target.value)}
                placeholder={String(baseQNum + 7)}
              />
            </p>
            <p>↓</p>
            <p>
              dissolved in
              <input
                type="text"
                className="answer-input"
                autoComplete="off"
                value={answers[baseQNum + 8] || ''}
                onChange={(e) => handleAnswerChange(baseQNum + 8, e.target.value)}
                placeholder={String(baseQNum + 8)}
              />
            </p>
            <p>↓</p>
            <p>
              passed through
              <input
                type="text"
                className="answer-input"
                autoComplete="off"
                value={answers[baseQNum + 9] || ''}
                onChange={(e) => handleAnswerChange(baseQNum + 9, e.target.value)}
                placeholder={String(baseQNum + 9)}
              />
            </p>
            <p>↓</p>
            <p>to produce a solid fibre</p>
          </div>
        </div>

        {/* Questions 11-13: TRUE/FALSE/NOT GIVEN */}
        <div className="question" data-q-start={baseQNum + 10} data-q-end={baseQNum + 12}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 10}–{baseQNum + 12}</strong></p>
            <p>Do the following statements agree with the information given in the text?</p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li><strong>TRUE</strong> if the statement is true</li>
              <li><strong>FALSE</strong> if the statement is false</li>
              <li><strong>NOT GIVEN</strong> if the information is not given in the passage</li>
            </ul>
          </div>
          {[11,12,13].map((localNum, idx) => {
            const globalNum = baseQNum + 10 + idx;
            const texts = [
              "Biosilk has already replaced nylon in parachute manufacture.",
              "The spider produces silk of varying strengths.",
              "Lewis and Dorsch co-operated in the synthetic production of silk"
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
                <div className="tf-question-line">
                  <span className="tf-question-number">{globalNum}</span>
                  <span className="tf-question-text">{texts[idx]}</span>
                </div>
                <div className="tf-options">
                  {TFNG_OPTIONS.map(opt => (
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
          })}
        </div>
      </div>
    );
  };

  // Part 2 (questions 14-26)
  const renderPart2 = () => {
    return (
      <div className="space-y-6">
        {/* Questions 14-18: YES/NO/NOT GIVEN */}
        <div className="question" data-q-start={baseQNum} data-q-end={baseQNum + 4}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum}–{baseQNum + 4}</strong></p>
            <p>Do the following statements agree with the claims of the writer in the text?</p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li><strong>TRUE</strong> if the statement is true</li>
              <li><strong>FALSE</strong> if the statement is false</li>
              <li><strong>NOT GIVEN</strong> if the information is not given in the passage</li>
            </ul>
          </div>
          {[14,15,16,17,18].map((localNum, idx) => {
            const globalNum = baseQNum + idx;
            const texts = [
              "Study shows that males are more likely to be addicted to TV than females.",
              "Greater improvements in mood are experienced after watching TV than playing sports.",
              "TV addiction works in similar ways as drugs.",
              "It is reported that people's satisfaction is in proportion to the time they spend watching TV.",
              "Middle-class viewers are more likely to feel guilty about watching TV than the poor."
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
                <div className="tf-question-line">
                  <span className="tf-question-number">{globalNum}</span>
                  <span className="tf-question-text">{texts[idx]}</span>
                </div>
                <div className="tf-options">
                  {YNNG_OPTIONS.map(opt => (
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
          })}
        </div>

        {/* Questions 19-23: Matching table */}
        <div className="question" data-q-start={baseQNum + 5} data-q-end={baseQNum + 9}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 5}–{baseQNum + 9}</strong></p>
            <p>Match each researcher with the correct statements.</p>
            <p><strong>List of Statements</strong><br />
              <strong>A</strong> Audiences would get hypnotized from viewing too much television.<br />
              <strong>B</strong> People have been sensitive to the TV signals since a younger age.<br />
              <strong>C</strong> People are less likely to accomplish their work with television.<br />
              <strong>D</strong> A handful of studies have attempted to study other types of media addiction.<br />
              <strong>E</strong> The addictive power of television could probably minimize the problems.<br />
              <strong>F</strong> Various media formal characters stimulate people's reaction on the screen.<br />
              <strong>G</strong> People who believe themselves to be TV addicts are less likely to join in the group activities.<br />
              <strong>H</strong> It is hard for people to accept life without a TV at the beginning.
            </p>
          </div>
          <div className="table-container">
            <table className="matching-table">
              <thead>
                <tr>
                  <th></th>
                  {['A','B','C','D','E','F','G','H'].map(opt => <th key={opt}>{opt}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  'Byron Reeves and Esther Thorson',
                  'Dafna Lemish',
                  'Robert D. McIlwraith',
                  'Tannis M. MacBeth Williams',
                  'Charles Winick'
                ].map((stmt, stmtIdx) => {
                  const globalNum = baseQNum + 5 + stmtIdx;
                  return (
                    <tr key={stmtIdx}>
                      <td className="statement"><strong>{globalNum}</strong> {stmt}</td>
                      {['A','B','C','D','E','F','G','H'].map(opt => {
                        const isSelected = answers[globalNum] === opt;
                        return (
                          <td
                            key={opt}
                            className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                            data-question={`q-${globalNum}`}
                            data-value={opt}
                            onClick={() => handleAnswerChange(globalNum, opt)}
                          ></td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 24-26: Multiple choice */}
        <div className="question" data-q-start={baseQNum + 10} data-q-end={baseQNum + 12}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 10}–{baseQNum + 12}</strong></p>
            <p>Choose the correct answer.</p>
          </div>
          {[24,25,26].map((localNum, idx) => {
            const globalNum = baseQNum + 10 + idx;
            const texts = [
              "People in the industrialized world",
              "When compared with light viewers, heavy viewers",
              "Which of the following statements is true about the family experiment?"
            ];
            const options = [
              ["A devote ten hours watching TV on average", "B spend more time on TV than other entertainment", "C call themselves TV addicts.", "D enjoy working best."],
              ["A like playing sport more than reading.", "B feel relaxed after watching TV.", "C spend more time in daydreaming.", "D are more easily bored while waiting in line."],
              ["A Not all subjects participate in the experiment for free.", "B There has been complete gathered data.", "C People are prevented from other activities during the experiment.", "D People can not adapt to the situation until the end."]
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="multi-choice-question" data-q-start={globalNum}>
                <div className="question-prompt">
                  <p><strong>{globalNum}.</strong> {texts[idx]}</p>
                </div>
                <div className="space-y-2">
                  {options[idx].map((opt) => (
                    <div key={opt} className="multi-choice-option">
                      <label>
                        <input
                          type="radio"
                          name={`q-${globalNum}`}
                          value={opt.charAt(0)}
                          checked={answers[globalNum] === opt.charAt(0)}
                          onChange={() => handleAnswerChange(globalNum, opt.charAt(0))}
                        />
                        <span>{opt}</span>
                      </label>
                    </div>
                  ))}
                  <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
                    <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Part 3 (questions 27-40)
  const renderPart3 = () => {
    return (
      <div className="space-y-6">
        {/* Questions 27-32: Matching table */}
        <div className="question" data-q-start={baseQNum} data-q-end={baseQNum + 5}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum}–{baseQNum + 5}</strong></p>
            <p>Use the information in the passage to match the deed (listed A-H) with people below.</p>
            <p><strong>NB</strong> You may use any letter more than once</p>
            <p>
              <strong>A</strong> Should easily be understood<br />
              <strong>B</strong> Should improve by itself<br />
              <strong>C</strong> Should not involve any mysticism<br />
              <strong>D</strong> Ought to last a minimum length of time.<br />
              <strong>E</strong> Needs to be treated at the right time.<br />
              <strong>F</strong> Should give more recognition.<br />
              <strong>G</strong> Can earn valuable money.<br />
              <strong>H</strong> Do not rely on any specific treatment
            </p>
          </div>
          <div className="table-container">
            <table className="matching-table">
              <thead>
                <tr>
                  <th></th>
                  {['A','B','C','D','E','F','G','H'].map(opt => <th key={opt}>{opt}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  'Appointments with an alternative practitioner',
                  'An alternative practitioner\'s description of the treatment',
                  'An alternative practitioner who has faith in what he does',
                  'the illness of patients convinced of alternative practice',
                  'Improvements of patients receiving alternative practice',
                  'Conventional medical doctors (who is aware of placebo)'
                ].map((stmt, stmtIdx) => {
                  const globalNum = baseQNum + stmtIdx;
                  return (
                    <tr key={stmtIdx}>
                      <td className="statement"><strong>{globalNum}</strong> {stmt}</td>
                      {['A','B','C','D','E','F','G','H'].map(opt => {
                        const isSelected = answers[globalNum] === opt;
                        return (
                          <td
                            key={opt}
                            className={`clickable-cell ${isSelected ? 'selected' : ''}`}
                            data-question={`q-${globalNum}`}
                            data-value={opt}
                            onClick={() => handleAnswerChange(globalNum, opt)}
                          ></td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 33-35: Multiple choice */}
        <div className="question" data-q-start={baseQNum + 6} data-q-end={baseQNum + 8}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 6}–{baseQNum + 8}</strong></p>
            <p>Choose the correct answer.</p>
          </div>
          {[33,34,35].map((localNum, idx) => {
            const globalNum = baseQNum + 6 + idx;
            const texts = [
              "In the fifth paragraph, the writer uses the example of anger and sadness to illustrate that:",
              "Research on pain control attracts most of the attention because",
              "Fabrizio Benedetti's research on endorphins indicates that"
            ];
            const options = [
              ["A People's feeling could affect their physical behaviour", "B Scientists don't understand how the mind influences the body.", "C Research on the placebo effect is very limited", "D How placebo achieves its effect is yet to be understood."],
              ["A Scientists have discovered that endorphins can help to reduce pain.", "B Only a limited number of researchers gain relevant experience", "C Pain reducing agents might also be involved in the placebo effect.", "D Patients often experience pain and like to complain about it"],
              ["A They are widely used to regulate pain.", "B They can be produced by willful thoughts", "C They can be neutralized by introducing naloxone.", "D Their pain-relieving effects do not last long enough."]
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="multi-choice-question" data-q-start={globalNum}>
                <div className="question-prompt">
                  <p><strong>{globalNum}.</strong> {texts[idx]}</p>
                </div>
                <div className="space-y-2">
                  {options[idx].map((opt) => (
                    <div key={opt} className="multi-choice-option">
                      <label>
                        <input
                          type="radio"
                          name={`q-${globalNum}`}
                          value={opt.charAt(0)}
                          checked={answers[globalNum] === opt.charAt(0)}
                          onChange={() => handleAnswerChange(globalNum, opt.charAt(0))}
                        />
                        <span>{opt}</span>
                      </label>
                    </div>
                  ))}
                  <button onClick={() => handleFlagToggle(globalNum)} className="ml-2">
                    <Flag size={18} className={reviewFlags[`${currentSection}-${globalNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Questions 36-40: TRUE/FALSE/NOT GIVEN */}
        <div className="question" data-q-start={baseQNum + 9} data-q-end={baseQNum + 13}>
          <div className="question-prompt">
            <p><strong>Questions {baseQNum + 9}–{baseQNum + 13}</strong></p>
            <p>Do the following statements agree with the information given in the text?</p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li><strong>TRUE</strong> if the statement is true</li>
              <li><strong>FALSE</strong> if the statement is false</li>
              <li><strong>NOT GIVEN</strong> if the information is not given in the passage</li>
            </ul>
          </div>
          {[36,37,38,39,40].map((localNum, idx) => {
            const globalNum = baseQNum + 9 + idx;
            const texts = [
              "There is enough information for scientists to fully understand the placebo effect.",
              "A London based researcher discovered that red pills should be taken off the market.",
              "People's preference for brands would also have an effect on their healing.",
              "Medical doctors have a range of views of the newly introduced drug of chlorpromazine.",
              "Alternative practitioners are seldom known for applying the placebo effect."
            ];
            return (
              <div key={globalNum} id={`q-container-${currentSection}-${globalNum}`} className="tf-question" data-q-start={globalNum}>
                <div className="tf-question-line">
                  <span className="tf-question-number">{globalNum}</span>
                  <span className="tf-question-text">{texts[idx]}</span>
                </div>
                <div className="tf-options">
                  {TFNG_OPTIONS.map(opt => (
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
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {passageIdx === 0 && renderPart1()}
      {passageIdx === 1 && renderPart2()}
      {passageIdx === 2 && renderPart3()}
    </div>
  );
}