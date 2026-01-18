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
import { useExams, useCreateExam, useUpdateExam } from "@/hooks/use-exams";
import * as lucideReact from "lucide-react";

// --- INTERFACES ---
interface Question {
  id: number;
  type: 'mcq' | 'gap_fill' | 'tfng' | 'ynng' | 'matching_headings' | 'matching_features' | 'diagram' | 'short_answer'; 
  text: string;
  options: string[];
  answer: string;
  instruction: string;
  imageUrl?: string;
  headingList?: string[]; // Yangi: Matching Headings uchun
}

// Yangi: Listening bo'limlari uchun
interface ListeningPart {
  id: number;
  questions: Question[];
}

interface Passage {
  id: number;
  title: string;
  content: string;
  questions: Question[];
}

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

const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={() => onOpenChange(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-10">
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
  const updateExam = useUpdateExam();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("10");

  const [passages, setPassages] = useState<Passage[]>([
    { id: Date.now(), title: "Passage 1", content: "", questions: [] }
  ]);
  const [audioUrl, setAudioUrl] = useState("");

  const [listeningParts, setListeningParts] = useState<ListeningPart[]>([
    { id: 1, questions: [] },
    { id: 2, questions: [] },
    { id: 3, questions: [] },
    { id: 4, questions: [] },
  ]);

  const [writingTasks, setWritingTasks] = useState([
    { type: "task1", content: "", image: "", wordLimit: "150" },
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  const handleEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    const content = exam.content as any;
    
    if (content.listening) {
      setListeningTime(content.listening.duration?.toString() || "40");
      setListeningReviewTime(content.listening.reviewTime?.toString() || "10");
      setAudioUrl(content.listening.audioUrl || "");
      setListeningParts(content.listening.parts || [
        { id: 1, questions: [] }, { id: 2, questions: [] }, { id: 3, questions: [] }, { id: 4, questions: [] }
      ]);
    }

    if (content.reading) {
      setReadingTime(content.reading.timeLimit?.toString() || "60");
      setPassages(content.reading.passages || [{ id: Date.now(), title: "Passage 1", content: "", questions: [] }]);
    }

    if (content.writing) {
      setWritingTime(content.writing.timeLimit?.toString() || "60");
      setWritingTasks(content.writing.tasks || [
        { type: "task1", content: "", image: "", wordLimit: "150" },
        { type: "task2", content: "", wordLimit: "250" }
      ]);
    }
    
    setIsModalOpen(true);
  };

  const addQuestionGroup = (target: 'reading' | 'listening', pIdx: number) => {
    const newQ: Question = { 
      id: Date.now() + Math.random(), 
      type: 'gap_fill', 
      text: "", 
      options: [], 
      answer: "",
      instruction: "Write NO MORE THAN TWO WORDS for each answer.",
      imageUrl: ""
    };

    if (target === 'reading') {
      const newPassages = [...passages];
      newPassages[pIdx].questions.push(newQ);
      setPassages(newPassages);
    } else {
      const newParts = [...listeningParts];
      newParts[pIdx].questions.push(newQ);
      setListeningParts(newParts);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = {
      listening: { 
        audioUrl, 
        duration: parseInt(listeningTime),
        reviewTime: parseInt(listeningReviewTime),
        parts: listeningParts 
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
      if (editingExamId) {
        await updateExam.mutateAsync({
          id: editingExamId,
          title,
          timeLimit: parseInt(listeningTime) + parseInt(readingTime) + parseInt(writingTime),
          content: finalContent,
          isPublished: true
        });
      } else {
        await createExam.mutateAsync({ 
          title, 
          timeLimit: parseInt(listeningTime) + parseInt(readingTime) + parseInt(writingTime),
          content: finalContent, 
          isPublished: true 
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save exam", error);
    }
  };

  const resetForm = () => {
    setEditingExamId(null);
    setTitle("");
    setListeningTime("40");
    setReadingTime("60");
    setWritingTime("60");
    setListeningReviewTime("10");
    setPassages([{ id: Date.now(), title: "Passage 1", content: "", questions: [] }]);
    setListeningParts([{ id: 1, questions: [] }, { id: 2, questions: [] }, { id: 3, questions: [] }, { id: 4, questions: [] }]);
    setAudioUrl("");
    setWritingTasks([
      { type: "task1", content: "", image: "", wordLimit: "150" },
      { type: "task2", content: "", wordLimit: "250" }
    ]);
  };

  // --- AUDIO PREVIEW COMPONENT ---
  const AudioPreview = ({ url }: { url: string }) => (
    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
        <lucideReact.Play size={20} fill="currentColor" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Live Audio Preview</p>
        {url ? (
          <audio controls className="h-8 w-full">
            <source src={url} type="audio/mpeg" />
          </audio>
        ) : (
          <p className="text-xs text-slate-400 italic">No audio URL provided</p>
        )}
      </div>
    </div>
  );

  const QuestionItem = ({ q, idx, onUpdate, onRemove }: { q: Question, idx: number, onUpdate: any, onRemove: any }) => {
    const handleTypeChange = (newType: string) => {
      let defaultInstruction = "";
      let defaultOptions: string[] = [];
      switch(newType) {
        case 'tfng': defaultInstruction = "Do the following statements agree with the information given in the Reading Passage?"; defaultOptions = ["TRUE", "FALSE", "NOT GIVEN"]; break;
        case 'ynng': defaultInstruction = "Do the following statements agree with the claims of the writer?"; defaultOptions = ["YES", "NO", "NOT GIVEN"]; break;
        case 'mcq': defaultInstruction = "Choose the correct letter, A, B, C or D."; defaultOptions = ["", "", "", ""]; break;
        case 'matching_headings': defaultInstruction = "Choose the correct heading for each paragraph from the list of headings below."; break;
        case 'gap_fill': defaultInstruction = "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer."; break;
        case 'diagram': defaultInstruction = "Label the map/diagram below. Write NO MORE THAN TWO WORDS for each answer."; break;
        default: defaultInstruction = q.instruction;
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
              <select className="flex-1 text-xs font-black uppercase tracking-widest bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-blue-600 cursor-pointer" value={q.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {QUESTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <Input placeholder="Instruction..." value={q.instruction} onChange={e => onUpdate('instruction', e.target.value)} className="text-[11px] italic text-slate-500 bg-transparent border-none px-0 h-auto focus-visible:ring-0" />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-slate-300 hover:text-red-500 rounded-lg -mr-2"><lucideReact.Trash2 size={16}/></Button>
        </div>

        {/* Matching Headings - List of Headings bo'limi */}
        {q.type === 'matching_headings' && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
            <Label className="text-[10px] font-black text-amber-600 uppercase">List of Headings</Label>
            {(q.headingList || [""]).map((h, hIdx) => (
              <div key={hIdx} className="flex gap-2">
                <span className="text-xs font-bold text-amber-500 pt-2 w-6">{hIdx + 1}.</span>
                <Input value={h} onChange={e => {
                  const newList = [...(q.headingList || [])]; newList[hIdx] = e.target.value; onUpdate('headingList', newList);
                }} placeholder="Heading text..." className="h-9 bg-white" />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => onUpdate('headingList', [...(q.headingList || []), ""])} className="w-full text-[10px] font-bold border-amber-200 text-amber-600">+ Add Heading to List</Button>
          </div>
        )}

        {q.type === 'diagram' && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">Map / Diagram Image URL</Label>
            <Input placeholder="Paste image URL here..." value={q.imageUrl || ""} onChange={e => onUpdate('imageUrl', e.target.value)} className="bg-white" />
          </div>
        )}

        <div className="space-y-3">
          {q.type === 'matching_headings' ? (
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className="bg-slate-100">Paragraph</Badge>
                <Input placeholder="e.g. Paragraph A" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-bold bg-white" />
              </div>
          ) : (
            <Textarea placeholder="Question Text..." value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-medium bg-white min-h-[60px] text-sm" />
          )}
        </div>

        {q.type === 'mcq' && (
          <div className="space-y-2 pl-4 border-l-4 border-blue-100">
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-3">
                <span className="bg-slate-100 w-6 h-6 flex items-center justify-center rounded text-[10px] font-black">{String.fromCharCode(65 + oIdx)}</span>
                <Input placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} value={opt} onChange={e => {
                  const newOpts = [...q.options]; newOpts[oIdx] = e.target.value; onUpdate('options', newOpts);
                }} className="h-9 text-sm bg-white" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onUpdate('options', [...q.options, ""])} className="text-xs h-7">+ Add Option</Button>
          </div>
        )}

        <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-3 rounded-xl border border-emerald-100/50">
          <lucideReact.CheckCircle2 size={16} className="text-emerald-500" />
          <Input className="h-8 border-none bg-transparent font-black text-emerald-700 focus-visible:ring-0 text-sm" placeholder="Correct Answer" value={q.answer} onChange={e => onUpdate('answer', e.target.value)} />
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
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-black shadow-xl transition-all">
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
                    <td className="p-6 text-right">
                      <Button 
                        variant="ghost" 
                        className="rounded-xl font-bold text-blue-600"
                        onClick={() => handleEdit(exam)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleCreate} className="space-y-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-slate-900">{editingExamId ? 'Edit' : 'Create'} Exam</h2>
          </div>
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
                  <input type="number" value={t.val} onChange={(e: any) => t.set(e.target.value)} className="w-full bg-white/10 border-none rounded-xl h-10 text-white font-black text-center text-lg focus:ring-2 ring-blue-500 outline-none" />
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

            <TabsContent value="listening" className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase text-slate-400 ml-1">Cloud Audio Source (MP3 URL)</Label>
                    <Input placeholder="https://..." value={audioUrl} onChange={e => setAudioUrl(e.target.value)} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold shadow-inner" />
                  </div>
                  <AudioPreview url={audioUrl} />
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {listeningParts.map((part, pIdx) => (
                    <div key={pIdx} className="p-8 bg-white border border-slate-100 shadow-xl rounded-[2.5rem] space-y-6">
                      <div className="flex justify-between items-center">
                        <Badge className="bg-slate-900 px-4 py-1.5 rounded-lg font-black uppercase">Part {pIdx + 1}</Badge>
                        <Button type="button" onClick={() => addQuestionGroup('listening', pIdx)} className="rounded-xl bg-blue-600 text-white font-black">+ Add Question</Button>
                      </div>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {part.questions.map((q, qIdx) => (
                          <QuestionItem 
                            key={q.id} q={q} idx={qIdx} 
                            onUpdate={(key: string, val: any) => {
                              const n = [...listeningParts]; (n[pIdx].questions[qIdx] as any)[key] = val; setListeningParts(n);
                            }}
                            onRemove={() => {
                              const n = [...listeningParts]; n[pIdx].questions.splice(qIdx, 1); setListeningParts(n);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="reading" className="space-y-12">
              {passages.map((psg, pIdx) => (
                <div key={psg.id} className="grid grid-cols-1 xl:grid-cols-2 gap-10 p-10 bg-white border border-slate-100 shadow-2xl rounded-[2.5rem] relative">
                  <Badge className="absolute -top-4 left-10 bg-blue-600 h-9 px-6 rounded-xl font-black text-sm uppercase italic">Passage {pIdx + 1}</Badge>
                  <div className="space-y-6">
                    <Input placeholder="Heading" value={psg.title} onChange={e => {
                       const n = [...passages]; n[pIdx].title = e.target.value; setPassages(n);
                    }} className="font-black text-xl border-none bg-slate-50 h-14 rounded-2xl px-6" />
                    <Textarea className="min-h-[600px] leading-relaxed font-serif text-lg p-8 rounded-[2rem] bg-slate-50/50 border-none shadow-inner resize-y" value={psg.content} onChange={e => {
                       const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n);
                    }} />
                  </div>
                  <div className="space-y-6 bg-slate-50/80 p-8 rounded-[2.5rem] border border-slate-200/50 shadow-inner overflow-hidden max-h-[800px]">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase text-slate-400">Questions</h4>
                      <Button type="button" variant="outline" onClick={() => addQuestionGroup('reading', pIdx)} className="rounded-xl bg-white border-2 font-black text-blue-600">+ Add Question</Button>
                    </div>
                    <div className="overflow-y-auto pr-4 space-y-2 custom-scrollbar h-full">
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
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="ghost" className="w-full border-4 border-dashed h-24 rounded-[2.5rem] text-slate-400" onClick={() => setPassages([...passages, { id: Date.now(), title: "", content: "", questions: [] }])}>
                <lucideReact.Plus className="mr-2"/> Append Next Passage
              </Button>
            </TabsContent>

            <TabsContent value="writing" className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {writingTasks.map((task, idx) => (
                <div key={idx} className="p-10 bg-white border-none rounded-[3rem] shadow-2xl space-y-8 flex flex-col">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-slate-900 px-6 py-2 rounded-xl text-md font-black italic">WRITING TASK {idx + 1}</Badge>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">{task.wordLimit} Words Min</span>
                  </div>
                  {idx === 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Graphic Asset URL</Label>
                      <Input value={task.image} onChange={e => {
                        const n = [...writingTasks]; n[0].image = e.target.value; setWritingTasks(n);
                      }} placeholder="https://..." className="h-14 rounded-2xl bg-slate-50 border-none px-6 shadow-inner" />
                    </div>
                  )}
                  <Textarea className="min-h-[350px] text-xl font-medium bg-slate-50/50 border-none rounded-[2rem] p-8 shadow-inner" value={task.content} onChange={e => {
                    const n = [...writingTasks]; n[idx].content = e.target.value; setWritingTasks(n);
                  }} placeholder="Prompt..." />
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end items-center gap-6 pt-10 border-t-2 border-slate-100">
             <Button type="button" variant="ghost" className="font-black text-slate-400" onClick={() => { setIsModalOpen(false); resetForm(); }}>Discard</Button>
             <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-16 px-16 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all" disabled={createExam.isPending || updateExam.isPending}>
               {createExam.isPending || updateExam.isPending ? <lucideReact.Loader2 className="animate-spin" /> : (editingExamId ? 'UPDATE EXAM' : 'PUBLISH EXAM')}
             </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}