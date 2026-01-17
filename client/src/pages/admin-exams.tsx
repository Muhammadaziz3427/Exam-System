import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  Card, 
  Button, 
  Input, 
  Textarea, 
  Label, 
  Badge, 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui-kit";
import { useExams, useCreateExam } from "@/hooks/use-exams";
import * as lucideReact from "lucide-react";

// --- INTERFACES ---
interface Question {
  id: number;
  type: 'mcq' | 'gap_fill' | 'tfng' | 'ynng' | 'matching_headings' | 'matching_features' | 'diagram' | 'short_answer'; 
  text: string;
  options: string[];
  answer: string;
  instruction: string;
  imageUrl?: string; // Listening diagrammalar uchun rasm URL
}

interface Passage {
  id: number;
  title: string;
  content: string;
  questions: Question[];
}

// --- CONSTANTS: IELTS QUESTION TYPES ---
const QUESTION_TYPES = [
  { value: 'gap_fill', label: 'Sentence/Summary Completion (Gap Fill)', icon: lucideReact.Type },
  { value: 'mcq', label: 'Multiple Choice (A, B, C...)', icon: lucideReact.CheckSquare },
  { value: 'tfng', label: 'True / False / Not Given', icon: lucideReact.CheckCircle2 },
  { value: 'ynng', label: 'Yes / No / Not Given', icon: lucideReact.CheckCircle2 },
  { value: 'matching_headings', label: 'Matching Headings (i, ii, iii...)', icon: lucideReact.List },
  { value: 'matching_features', label: 'Matching Features (Names, Dates...)', icon: lucideReact.AlignLeft },
  { value: 'diagram', label: 'Diagram/Map Labeling', icon: lucideReact.Image },
  { value: 'short_answer', label: 'Short Answer Questions', icon: lucideReact.MoreHorizontal },
];

// --- MODAL COMPONENT ---
const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 p-8 relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={() => onOpenChange(false)} 
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <lucideReact.X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default function AdminExams() {
  const { data: exams, isLoading } = useExams();
  const createExam = useCreateExam();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- GLOBAL EXAM STATE ---
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("10");

  const [passages, setPassages] = useState<Passage[]>([
    { id: Date.now(), title: "Passage 1", content: "", questions: [] }
  ]);
  const [audioUrl, setAudioUrl] = useState("");
  const [listeningQuestions, setListeningQuestions] = useState<Question[]>([]);
  const [writingTasks, setWritingTasks] = useState([
    { type: "task1", content: "", image: "", wordLimit: "150" },
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  // --- LOGIC: QUESTION BUILDER ---
  const addQuestionGroup = (target: 'reading' | 'listening', pIdx?: number) => {
    const newQ: Question = { 
      id: Date.now() + Math.random(), 
      type: 'gap_fill', 
      text: "", 
      options: [], 
      answer: "",
      instruction: "Write NO MORE THAN TWO WORDS for each answer.",
      imageUrl: ""
    };

    if (target === 'reading' && pIdx !== undefined) {
      const newPassages = [...passages];
      newPassages[pIdx].questions.push(newQ);
      setPassages(newPassages);
    } else {
      setListeningQuestions([...listeningQuestions, newQ]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = {
      listening: { 
        audioUrl, 
        duration: parseInt(listeningTime),
        reviewTime: parseInt(listeningReviewTime),
        questions: listeningQuestions 
      },
      reading: { 
        timeLimit: parseInt(readingTime),
        passages: passages 
      },
      writing: { 
        timeLimit: parseInt(writingTime),
        tasks: writingTasks 
      }
    };

    try {
      await createExam.mutateAsync({ 
        title, 
        timeLimit: parseInt(listeningTime) + parseInt(readingTime) + parseInt(writingTime),
        content: finalContent, 
        isPublished: true 
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create exam", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPassages([{ id: Date.now(), title: "Passage 1", content: "", questions: [] }]);
    setListeningQuestions([]);
    setAudioUrl("");
  };

  // --- SMART UI: QUESTION ITEM COMPONENT ---
  const QuestionItem = ({ q, idx, onUpdate, onRemove }: { q: Question, idx: number, onUpdate: any, onRemove: any }) => {

    const handleTypeChange = (newType: string) => {
      let defaultInstruction = "";
      let defaultOptions: string[] = [];

      switch(newType) {
        case 'tfng':
          defaultInstruction = "Do the following statements agree with the information given in the Reading Passage?";
          defaultOptions = ["TRUE", "FALSE", "NOT GIVEN"];
          break;
        case 'ynng':
          defaultInstruction = "Do the following statements agree with the claims of the writer?";
          defaultOptions = ["YES", "NO", "NOT GIVEN"];
          break;
        case 'mcq':
          defaultInstruction = "Choose the correct letter, A, B, C or D.";
          defaultOptions = ["", "", "", ""];
          break;
        case 'matching_headings':
          defaultInstruction = "Choose the correct heading for each paragraph from the list of headings below.";
          break;
        case 'gap_fill':
          defaultInstruction = "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.";
          break;
        case 'diagram':
          defaultInstruction = "Label the map/diagram below. Write NO MORE THAN TWO WORDS for each answer.";
          break;
        default:
          defaultInstruction = q.instruction;
      }

      onUpdate('type', newType);
      onUpdate('instruction', defaultInstruction);
      if (defaultOptions.length > 0) onUpdate('options', defaultOptions);
    };

    return (
      <div className="group p-5 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all space-y-4 mb-4 relative">
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-3">
              <Badge className="bg-slate-900 h-6 w-6 flex items-center justify-center p-0 rounded-full text-[10px]">{idx + 1}</Badge>
              <select 
                className="flex-1 text-xs font-black uppercase tracking-widest bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-blue-600 focus:ring-2 ring-blue-100 cursor-pointer"
                value={q.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                     {type.label}
                  </option>
                ))}
              </select>
            </div>
            <Input 
              placeholder="Instruction (e.g. Choose NO MORE THAN TWO WORDS)" 
              value={q.instruction} 
              onChange={e => onUpdate('instruction', e.target.value)} 
              className="text-[11px] italic text-slate-500 bg-transparent border-none px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300" 
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg -mr-2"><lucideReact.Trash2 size={16}/></Button>
        </div>

        {/* IMAGE UPLOAD FOR DIAGRAMS/MAPS (LISTENING & READING) */}
        {q.type === 'diagram' && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Map / Diagram Image URL</Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <lucideReact.Image className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                        placeholder="Paste image URL here..." 
                        value={q.imageUrl || ""} 
                        onChange={e => onUpdate('imageUrl', e.target.value)} 
                        className="pl-10 bg-white border-blue-100 focus:border-blue-500"
                    />
                </div>
            </div>
            {q.imageUrl && (
                <div className="mt-2 relative group w-full max-w-[200px] aspect-video rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    <img src={q.imageUrl} alt="Diagram preview" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => onUpdate('imageUrl', '')}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <lucideReact.X size={12}/>
                    </button>
                </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {q.type === 'matching_headings' ? (
             <div className="flex gap-2 items-center">
                <Badge variant="outline" className="bg-slate-100 whitespace-nowrap">Paragraph</Badge>
                <Input placeholder="e.g. Paragraph A" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-bold bg-white" />
             </div>
          ) : q.type === 'gap_fill' || q.type === 'short_answer' || q.type === 'diagram' ? (
             <div className="relative">
                <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1 block">Question Text (Use [...] for gap location)</Label>
                <Textarea 
                  placeholder={q.type === 'diagram' ? "e.g. Label 14 on the map represents the [...]" : "e.g. The first mechanism was invented in [...] by a German engineer."} 
                  value={q.text} 
                  onChange={e => onUpdate('text', e.target.value)} 
                  className="font-medium bg-white min-h-[60px] text-sm leading-relaxed" 
                />
             </div>
          ) : (
            <Input 
              placeholder="Question Statement / Text" 
              value={q.text} 
              onChange={e => onUpdate('text', e.target.value)} 
              className="font-bold border-slate-200 shadow-sm bg-white h-11" 
            />
          )}
        </div>

        {q.type === 'mcq' && (
          <div className="space-y-2 pl-4 border-l-4 border-blue-100">
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-3">
                  <span className="bg-slate-100 w-6 h-6 flex items-center justify-center rounded text-[10px] font-black text-slate-500 shrink-0">
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <Input 
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...q.options];
                      newOpts[oIdx] = e.target.value;
                      onUpdate('options', newOpts);
                    }} 
                    className="h-9 text-sm bg-white"
                  />
                  <Button 
                    type="button" size="sm" variant="ghost" 
                    onClick={() => {
                        const newOpts = q.options.filter((_, i) => i !== oIdx);
                        onUpdate('options', newOpts);
                    }}
                    className="h-6 w-6 p-0 text-slate-300 hover:text-red-500"
                  ><lucideReact.X size={12}/></Button>
                </div>
              ))}
            </div>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdate('options', [...q.options, ""])}
                className="text-xs h-7 ml-9 text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100"
            >+ Add Option</Button>
          </div>
        )}

        {(q.type === 'matching_features' || q.type === 'matching_headings') && (
           <div className="text-[10px] text-slate-400 bg-slate-100 p-2 rounded">
             Note: Ensure the list of options (Headings/People) is provided in the passage text or a separate description block.
           </div>
        )}

        <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-3 rounded-xl border border-emerald-100/50">
          <lucideReact.CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {(q.type === 'tfng' || q.type === 'ynng') ? (
             <select 
                value={q.answer} 
                onChange={e => onUpdate('answer', e.target.value)}
                className="h-8 bg-transparent font-black text-emerald-700 outline-none w-full text-sm"
             >
                <option value="" disabled>Select Correct Answer</option>
                {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
          ) : q.type === 'mcq' ? (
             <select 
                value={q.answer} 
                onChange={e => onUpdate('answer', e.target.value)}
                className="h-8 bg-transparent font-black text-emerald-700 outline-none w-full text-sm"
            >
                <option value="" disabled>Select Correct Letter</option>
                {q.options.map((_, i) => (
                    <option key={i} value={String.fromCharCode(65 + i)}>Option {String.fromCharCode(65 + i)}</option>
                ))}
            </select>
          ) : (
            <Input 
                className="h-8 border-none bg-transparent font-black text-emerald-700 placeholder:text-emerald-400/50 focus-visible:ring-0 text-sm" 
                placeholder={q.type === 'matching_headings' ? "Correct Heading (e.g. iv)" : "Correct Answer(s)"} 
                value={q.answer} 
                onChange={e => onUpdate('answer', e.target.value)} 
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Exam <span className="text-blue-600 italic">Studio</span></h2>
          <p className="text-slate-500 font-medium mt-1">Professional IELTS Test Builder</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-black shadow-xl shadow-blue-100 transition-all">
          <lucideReact.Plus className="mr-2" size={20} /> Create New Exam
        </Button>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-widest text-sm"><lucideReact.Layers size={20} className="text-blue-600"/> Current Exam Library</h3>
          <Badge className="bg-white text-slate-900 border-slate-200 px-4 py-1.5 rounded-full shadow-sm">{exams?.length || 0} Total</Badge>
        </div>
        <div className="p-0 overflow-x-auto">
          {isLoading ? (
             <div className="p-20 text-center"><lucideReact.Loader2 className="animate-spin mx-auto text-slate-300" size={40}/></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400">Exam Title</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400">Duration</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody>
                {exams?.map((exam: any) => (
                  <tr key={exam.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 font-bold text-slate-700">{exam.title}</td>
                    <td className="p-6"><Badge variant="outline" className="font-bold">{exam.timeLimit} min</Badge></td>
                    <td className="p-6"><Badge className="bg-emerald-500/10 text-emerald-600 border-none">Active</Badge></td>
                    <td className="p-6 text-right"><Button variant="ghost" className="rounded-xl font-bold text-blue-600">Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleCreate} className="space-y-10">
          <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Assessment Title</Label>
              <Input placeholder="e.g. Cambridge IELTS 18 - Academic Test 1" value={title} onChange={e => setTitle(e.target.value)} required className="h-16 text-2xl font-black border-2 focus:border-blue-600 rounded-[1.25rem] px-6 shadow-sm" />
            </div>
            <div className="col-span-12 lg:col-span-5 grid grid-cols-4 gap-4 bg-slate-900 p-5 rounded-[1.5rem] shadow-2xl">
              {[
                { label: 'Listening', val: listeningTime, set: setListeningTime },
                { label: 'Reading', val: readingTime, set: setReadingTime },
                { label: 'Writing', val: writingTime, set: setWritingTime },
                { label: 'L-Review', val: listeningReviewTime, set: setListeningReviewTime },
              ].map(t => (
                <div key={t.label} className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1"><lucideReact.Clock size={10}/> {t.label}</Label>
                  <input type="number" value={t.val} onChange={e => t.set(e.target.value)} className="w-full bg-white/10 border-none rounded-xl h-10 text-white font-black text-center text-lg focus:ring-2 ring-blue-500 outline-none" />
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="reading" className="w-full">
            <TabsList className="inline-flex p-1.5 bg-slate-100 rounded-[1.5rem] mb-10 border border-slate-200/50">
              <TabsTrigger value="listening" className="px-10 py-3.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-xl font-black transition-all flex gap-3 text-sm tracking-tight"><lucideReact.Headset size={20}/> Listening</TabsTrigger>
              <TabsTrigger value="reading" className="px-10 py-3.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-xl font-black transition-all flex gap-3 text-sm tracking-tight"><lucideReact.BookOpen size={20}/> Reading</TabsTrigger>
              <TabsTrigger value="writing" className="px-10 py-3.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-xl font-black transition-all flex gap-3 text-sm tracking-tight"><lucideReact.PenTool size={20}/> Writing</TabsTrigger>
            </TabsList>

            <TabsContent value="reading" className="space-y-12">
              {passages.map((psg, pIdx) => (
                <div key={psg.id} className="grid grid-cols-1 xl:grid-cols-2 gap-10 p-10 bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] relative">
                  <Badge className="absolute -top-4 left-10 bg-blue-600 h-9 px-6 rounded-xl font-black text-sm shadow-lg shadow-blue-200 uppercase tracking-widest italic">Passage {pIdx + 1}</Badge>
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Passage Heading</Label>
                       <Input placeholder="Enter the official title of the text..." value={psg.title} onChange={e => {
                         const n = [...passages]; n[pIdx].title = e.target.value; setPassages(n);
                       }} className="font-black text-xl border-none bg-slate-50 h-14 rounded-2xl px-6" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Reading Content</Label>
                       <Textarea placeholder="Paste the reading passage here..." className="min-h-[600px] leading-relaxed font-serif text-lg p-8 rounded-[2rem] bg-slate-50/50 border-none shadow-inner resize-y" value={psg.content} onChange={e => {
                         const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n);
                       }} />
                    </div>
                  </div>

                  <div className="space-y-6 bg-slate-50/80 p-8 rounded-[2.5rem] border border-slate-200/50 shadow-inner flex flex-col h-full">
                    <div className="flex justify-between items-center px-2">
                      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Questions ({psg.questions.length})</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => addQuestionGroup('reading', pIdx)} className="rounded-xl bg-white border-2 font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all">+ Add Question</Button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-4 space-y-2 custom-scrollbar max-h-[700px]">
                      {psg.questions.map((q, qIdx) => (
                        <QuestionItem 
                          key={q.id} q={q} idx={qIdx} 
                          onUpdate={(key: string, val: any) => {
                            const n = [...passages]; (n[pIdx].questions[qIdx] as any)[key] = val; setPassages(n);
                          }}
                          onRemove={() => {
                            const n = [...passages]; n[pIdx].questions.splice(qIdx, 1); setPassages(n);
                          }}
                        />
                      ))}
                      {psg.questions.length === 0 && (
                          <div className="text-center py-20 text-slate-400 italic">No questions added for this passage yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {passages.length < 3 && (
                <Button type="button" variant="ghost" className="w-full border-4 border-dashed h-24 rounded-[2.5rem] text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 font-black text-xl transition-all" onClick={() => setPassages([...passages, { id: Date.now(), title: "", content: "", questions: [] }])}>
                  <lucideReact.Plus className="mr-2"/> Append Next Passage
                </Button>
              )}
            </TabsContent>

            <TabsContent value="listening" className="space-y-10">
               <Card className="p-10 bg-white border-none shadow-2xl rounded-[3rem] space-y-8">
                  <div className="flex items-center gap-6 pb-8 border-b">
                     <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-300"><lucideReact.Headset size={40}/></div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 italic uppercase">Listening Master</h3>
                        <p className="text-slate-500 font-medium tracking-tight">Set your global audio and structure your sections</p>
                     </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase text-slate-400 ml-1">Cloud Audio Source (MP3 URL)</Label>
                    <Input placeholder="https://storage.googleapis.com/your-exam-audios/test-01.mp3" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold shadow-inner" />
                  </div>
                  <div className="space-y-6 pt-6">
                    <div className="flex justify-between items-center">
                       <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm underline decoration-blue-500 decoration-4 underline-offset-8">All Questions (1-40)</h4>
                       <Button type="button" onClick={() => addQuestionGroup('listening')} className="rounded-2xl bg-slate-900 font-black px-6 hover:bg-black transition-all">+ Add Question</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {listeningQuestions.map((q, idx) => (
                        <QuestionItem 
                          key={q.id} q={q} idx={idx} 
                          onUpdate={(key: string, val: any) => {
                            const n = [...listeningQuestions]; (n[idx] as any)[key] = val; setListeningQuestions(n);
                          }}
                          onRemove={() => setListeningQuestions(listeningQuestions.filter(i => i.id !== q.id))}
                        />
                      ))}
                    </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="writing" className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {writingTasks.map((task, idx) => (
                <div key={idx} className="p-10 bg-white border-none rounded-[3rem] shadow-2xl shadow-slate-200 space-y-8 flex flex-col">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-slate-900 px-6 py-2 rounded-xl text-md font-black italic tracking-tighter">WRITING TASK {idx + 1}</Badge>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest">{task.wordLimit} Words Minimum</span>
                  </div>
                  {idx === 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Graphic/Diagram Image Asset</Label>
                      <Input value={task.image} onChange={e => {
                        const n = [...writingTasks]; n[0].image = e.target.value; setWritingTasks(n);
                      }} placeholder="https://cdn.example.com/graphs/task1-diagram.jpg" className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-medium shadow-inner" />
                    </div>
                  )}
                  <div className="space-y-3 flex-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prompt / Question Context</Label>
                    <Textarea className="min-h-[350px] text-xl font-medium bg-slate-50/50 border-none rounded-[2rem] p-8 shadow-inner leading-relaxed" value={task.content} onChange={e => {
                      const n = [...writingTasks]; n[idx].content = e.target.value; setWritingTasks(n);
                    }} placeholder="Write the question background and prompt here..." />
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end items-center gap-6 pt-10 border-t-2 border-slate-100">
             <Button type="button" variant="ghost" className="font-black text-slate-400 hover:text-slate-900 px-8" onClick={() => setIsModalOpen(false)}>Discard</Button>
             <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 h-16 px-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" 
                disabled={createExam.isPending}
              >
               {createExam.isPending ? <lucideReact.Loader2 className="animate-spin" /> : "PUBLISH EXAM"}
             </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}