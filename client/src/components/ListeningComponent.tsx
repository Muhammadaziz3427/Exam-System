import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Headphones, AlertCircle, Flag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ListeningComponentProps {
  audioUrl: string;
  onSectionComplete: () => void;
  examContent?: any;
  content?: any;
  answers: any;
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
  answers,
  setAnswers,
  currentPart,
  reviewFlags = {},
  setReviewFlags = () => {},
}: ListeningComponentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTimeLeft, setTransferTimeLeft] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());

  const listeningData = content || examContent?.listening;
  const parts = listeningData?.parts || listeningData?.sections || [];

  // Drag options for Part 3 (27–30)
  const dragOptions = [
    { letter: 'A', text: 'the realistic colours' },
    { letter: 'B', text: 'the sense of space' },
    { letter: 'C', text: 'the unusual interpretation of the theme' },
    { letter: 'D', text: 'the painting technique' },
    { letter: 'E', text: 'the variety of materials used' },
    { letter: 'F', text: 'the use of light and shade' }
  ];

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

  const handleAnswerChange = (qId: string, value: string | string[]) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const handleFlagToggle = (qId: string) => {
    setReviewFlags((prev: Record<string, boolean>) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Drag & drop functions – full matching with swap
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

    // If the drop zone already has an answer, swap or move it back
    const existingAnswer = answers[questionId];
    if (existingAnswer) {
      // Find which zone currently holds this option (if any)
      const otherZone = Object.keys(answers).find(key => answers[key] === optionLetter);
      if (otherZone) {
        // Swap: put the existing answer into the other zone, and new answer here
        setAnswers((prev: any) => ({
          ...prev,
          [questionId]: optionLetter,
          [otherZone]: existingAnswer
        }));
      } else {
        // Option was unused, just replace
        setAnswers((prev: any) => ({ ...prev, [questionId]: optionLetter }));
      }
    } else {
      // Empty zone, just drop
      setAnswers((prev: any) => ({ ...prev, [questionId]: optionLetter }));
    }

    setDragOverZone(null);
    e.currentTarget.classList.remove("drag-over");
  };

  // Compute used options based on answers
  useEffect(() => {
    const used = new Set<string>();
    Object.keys(answers).forEach(key => {
      if (key.startsWith('q-') && answers[key] && dragOptions.some(opt => opt.letter === answers[key])) {
        used.add(answers[key]);
      }
    });
    setUsedOptions(used);
  }, [answers]);

  // Global question number calculator
  const getGlobalQuestionNumber = (partIndex: number, questionIndex: number) => {
    let count = 0;
    for (let i = 0; i < partIndex; i++) {
      count += parts[i]?.questions?.length || 0;
    }
    return count + questionIndex + 1;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Audio player – untouched */}
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
          ) : (
            <div className="space-y-12">
              {parts.map((part: any, pIdx: number) => (
                <div
                  key={pIdx}
                  className="space-y-6"
                  style={{ display: pIdx + 1 === currentPart ? 'block' : 'none' }}
                >
                  {/* Part header */}
                  <div className="border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50 rounded-r-lg">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Part {part.id || pIdx + 1}
                    </h3>
                    <p className="text-sm text-slate-500">Answer the questions based on the audio clip.</p>
                  </div>

                  {part.image && (
                    <div className="my-4">
                      <img
                        src={part.image}
                        alt={`Part ${pIdx + 1} diagram`}
                        className="max-w-full h-auto rounded-lg border shadow-sm"
                      />
                    </div>
                  )}

                  {/* PART 1 – form fill (exact HTML structure) */}
                  {pIdx === 0 && (
                    <div className="space-y-4">
                      <div className="border border-black p-6">
                        <p className="text-center font-bold text-2xl mb-6">Music Alive Agency</p>
                        <p className="italic mb-4">Example</p>
                        <p><strong>Contact person:</strong> Jim Granley</p>
                        <p>
                          Members' details are on a
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 0)}`}
                            className="answer-input"
                            placeholder="1"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 0)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 0)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          Type of music represented: modern music (
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 1)}`}
                            className="answer-input"
                            placeholder="2"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 1)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 1)}`, e.target.value)}
                          /> and jazz)
                        </p>
                        <p>
                          Newsletter comes out once a
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 2)}`}
                            className="answer-input"
                            placeholder="3"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 2)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 2)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          Cost of adult membership: £
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 3)}`}
                            className="answer-input"
                            placeholder="4"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 3)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 3)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          Current number of members:
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 4)}`}
                            className="answer-input"
                            placeholder="5"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 4)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 4)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          Facilities include: rehearsal rooms and a
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 5)}`}
                            className="answer-input"
                            placeholder="6"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 5)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 5)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          There is no charge for
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 6)}`}
                            className="answer-input"
                            placeholder="7"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 6)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 6)}`, e.target.value)}
                          /> advice
                        </p>
                        <p>To become a member, send</p>
                        <p>- a letter with contact details</p>
                        <p>
                          - a recent
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 7)}`}
                            className="answer-input"
                            placeholder="8"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 7)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 7)}`, e.target.value)}
                          />
                        </p>
                        <p>
                          Address: 707,
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 8)}`}
                            className="answer-input"
                            placeholder="9"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 8)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 8)}`, e.target.value)}
                          /> Street, Marbury
                        </p>
                        <p>
                          Contact email: music.
                          <input
                            type="text"
                            id={`q-${getGlobalQuestionNumber(pIdx, 9)}`}
                            className="answer-input"
                            placeholder="10"
                            value={answers[`q-${getGlobalQuestionNumber(pIdx, 9)}`] || ''}
                            onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 9)}`, e.target.value)}
                          />@bsu.co.uk
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PART 2 – radio + map select */}
                  {pIdx === 1 && (
                    <div className="space-y-8">
                      <div>
                        <p className="font-bold mb-2">Questions 11-14</p>
                        <p className="mb-4">Choose the correct letter A, B or C.</p>
                        <div className="space-y-4">
                          {part.questions?.slice(0, 4).map((q: any, qIdx: number) => {
                            const globalQNum = getGlobalQuestionNumber(pIdx, qIdx);
                            return (
                              <div key={qIdx} className="space-y-2">
                                <p><strong>{globalQNum}</strong> {q.text}</p>
                                <div className="flex flex-col space-y-1">
                                  {q.options?.map((opt: string) => (
                                    <label key={opt} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`q-${globalQNum}`}
                                        value={opt.charAt(0)}
                                        checked={answers[`q-${globalQNum}`] === opt.charAt(0)}
                                        onChange={(e) => handleAnswerChange(`q-${globalQNum}`, e.target.value)}
                                        className="w-4 h-4"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="font-bold mb-2">Questions 15-20</p>
                        <p className="mb-4">Label the map below. Write the correct letter, A-I, next to questions 15-20.</p>
                        <div className="map-container mb-4">
                          <img
                            src="https://ia600906.us.archive.org/32/items/skrinshot-2025-08-12-202707-copy-copy-copy-copy-copy-copy/Skrinshot%202025-08-12%20202707%20-%20CopyCopyCopyCopyCopyCopy.png"
                            alt="Map"
                            className="w-full max-w-md mx-auto border border-gray-300"
                          />
                        </div>
                        {part.questions?.slice(4).map((q: any, qIdx: number) => {
                          const globalQNum = getGlobalQuestionNumber(pIdx, qIdx + 4);
                          return (
                            <div key={qIdx} className="flex items-center gap-4 mb-2">
                              <span className="font-bold w-8">{globalQNum}</span>
                              <span className="flex-1">{q.text}</span>
                              <select
                                className="answer-select w-24"
                                value={answers[`q-${globalQNum}`] || ''}
                                onChange={(e) => handleAnswerChange(`q-${globalQNum}`, e.target.value)}
                              >
                                <option value="">Select</option>
                                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(letter => (
                                  <option key={letter} value={letter}>{letter}</option>
                                ))}
                              </select>
                              <button onClick={() => handleFlagToggle(`q-${globalQNum}`)} className="ml-2">
                                <Flag size={18} className={reviewFlags[`q-${globalQNum}`] ? "text-orange-500 fill-orange-500" : "text-slate-200"} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PART 3 – radio + drag-drop */}
                  {pIdx === 2 && (
                    <div className="space-y-8">
                      <div>
                        <p className="font-bold mb-2">Questions 21-26</p>
                        <p className="mb-4">Choose the correct answer.</p>
                        <div className="space-y-4">
                          {part.questions?.slice(0, 6).map((q: any, qIdx: number) => {
                            const globalQNum = getGlobalQuestionNumber(pIdx, qIdx);
                            return (
                              <div key={qIdx} className="space-y-2">
                                <p><strong>{globalQNum}</strong> {q.text}</p>
                                <div className="flex flex-col space-y-1">
                                  {q.options?.map((opt: string) => (
                                    <label key={opt} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`q-${globalQNum}`}
                                        value={opt.charAt(0)}
                                        checked={answers[`q-${globalQNum}`] === opt.charAt(0)}
                                        onChange={(e) => handleAnswerChange(`q-${globalQNum}`, e.target.value)}
                                        className="w-4 h-4"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="font-bold mb-2">Questions 27-30</p>
                        <p className="mb-4">Which feature do the speakers identify as particularly interesting for each of the following exhibitions they saw?</p>
                        <p>Choose FOUR answers from the box and write the correct letter, <strong>A-F</strong>, next to questions 27-30.</p>
                        <div className="flex gap-8 mt-4">
                          <div className="flex-1 space-y-2">
                            {['On the Water', 'City Life', 'Faces', 'Moods'].map((exhibition, idx) => {
                              const globalQNum = getGlobalQuestionNumber(pIdx, idx + 6);
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-4 p-2 border-2 border-dashed rounded min-h-[50px] transition-colors ${dragOverZone === `q-${globalQNum}` ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                                  onDragOver={(e) => handleDragOver(e, `q-${globalQNum}`)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, `q-${globalQNum}`)}
                                >
                                  <span className="font-bold w-8">{globalQNum}</span>
                                  <span className="flex-1">{exhibition}</span>
                                  <div className="w-24 h-8 flex items-center justify-center bg-gray-50 border rounded">
                                    {answers[`q-${globalQNum}`] && (
                                      <span className="font-bold text-blue-600">{answers[`q-${globalQNum}`]}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="w-64 space-y-2 p-4 bg-gray-50 rounded border">
                            <p className="font-bold text-sm mb-2">Drag options:</p>
                            {dragOptions.map((opt, idx) => {
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
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PART 4 – bullet list with inline inputs (exact HTML) */}
                  {pIdx === 3 && (
                    <div className="space-y-4">
                      <div className="border border-black p-6">
                        <p className="text-center font-bold text-2xl mb-6">The Mangrove Regeneration Project</p>
                        <p><strong>Background:</strong></p>
                        <p><strong>Mangrove forests:</strong></p>
                        <ul className="list-none pl-5 space-y-2">
                          <li>
                            • protect coastal areas from
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 0)}`}
                              className="answer-input"
                              placeholder="31"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 0)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 0)}`, e.target.value)}
                            /> by the sea
                          </li>
                          <li>• are an important habitat for wildlife</li>
                        </ul>
                        <p><strong>Problems:</strong></p>
                        <ul className="list-none pl-5 space-y-2">
                          <li>
                            • mangroves had been used by farmers as
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 1)}`}
                              className="answer-input"
                              placeholder="32"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 1)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 1)}`, e.target.value)}
                            />
                          </li>
                          <li>
                            • mangroves were poisoned by the use of
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 2)}`}
                              className="answer-input"
                              placeholder="33"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 2)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 2)}`, e.target.value)}
                            />
                          </li>
                          <li>
                            • local people used the mangroves as a place to put their
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 3)}`}
                              className="answer-input"
                              placeholder="34"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 3)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 3)}`, e.target.value)}
                            />
                          </li>
                        </ul>
                        <p><strong>Actions taken to protect the mangroves:</strong></p>
                        <ul className="list-none pl-5 space-y-2">
                          <li>
                            • a barrier which was made of
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 4)}`}
                              className="answer-input"
                              placeholder="35"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 4)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 4)}`, e.target.value)}
                            /> was constructed - but it failed
                          </li>
                          <li>• new mangroves had to be grown from seed</li>
                          <li>
                            • the seeds of the
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 5)}`}
                              className="answer-input"
                              placeholder="36"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 5)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 5)}`, e.target.value)}
                            /> mangrove were used
                          </li>
                        </ul>
                        <p><strong>First set of seedlings:</strong></p>
                        <ul className="list-none pl-5 space-y-2">
                          <li>
                            • kept in small pots in a
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 6)}`}
                              className="answer-input"
                              placeholder="37"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 6)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 6)}`, e.target.value)}
                            />
                          </li>
                          <li>
                            • Watered with
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 7)}`}
                              className="answer-input"
                              placeholder="38"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 7)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 7)}`, e.target.value)}
                            /> rain water
                          </li>
                          <li>• planted out on south side of a small island</li>
                          <li>
                            • at risk from the large
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 8)}`}
                              className="answer-input"
                              placeholder="39"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 8)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 8)}`, e.target.value)}
                            /> population
                          </li>
                        </ul>
                        <p><strong>Second set of seedlings:</strong></p>
                        <ul className="list-none pl-5 space-y-2">
                          <li>• planted in the seabed near established mangrove roots</li>
                          <li>
                            • the young plants were destroyed in a
                            <input
                              type="text"
                              id={`q-${getGlobalQuestionNumber(pIdx, 9)}`}
                              className="answer-input"
                              placeholder="40"
                              value={answers[`q-${getGlobalQuestionNumber(pIdx, 9)}`] || ''}
                              onChange={(e) => handleAnswerChange(`q-${getGlobalQuestionNumber(pIdx, 9)}`, e.target.value)}
                            />
                          </li>
                        </ul>
                        <p><strong>Results:</strong> The first set of seedlings was successful</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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