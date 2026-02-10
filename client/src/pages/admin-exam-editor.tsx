import { useState, useEffect } from "react";
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
type QuestionType = 'mcq' | 'gap_fill' | 'tfng' | 'ynng' | 'matching_headings' | 'matching_features' | 'diagram' | 'short_answer';

interface Question {
  id: string | number;
  type: QuestionType;
  text: string;
  options: string[];
  answer: string;
  instruction: string;
  imageUrl?: string;
  headingList?: string[];
}

interface ListeningPart {
  id: number;
  questions: Question[];
}

interface Passage {
  id: number | string;
  title: string;
  content: string;
  questions: Question[];
}

interface WritingTask {
  type: string;
  content: string;
  image?: string;
  wordLimit: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'gap_fill', label: 'Sentence Completion (Gap Fill)' },
  { value: 'mcq', label: 'Multiple Choice (A, B, C...)' },
  { value: 'tfng', label: 'True / False / Not Given' },
  { value: 'ynng', label: 'Yes / No / Not Given' },
  { value: 'matching_headings', label: 'Matching Headings (i, ii, iii...)' },
  { value: 'matching_features', label: 'Matching Features' },
  { value: 'diagram', label: 'Diagram/Map Labeling' },
  { value: 'short_answer', label: 'Short Answer Questions' },
];

// --- MODAL COMPONENT (STABILIZED) ---
const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[95%] my-auto p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Ichkarini bossa yopilmasligi uchun
      >
        <button 
          type="button"
          onClick={() => onOpenChange(false)} 
          className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors z-[60]"
        >
          <lucideReact.X size={28} />
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
  const [isUploading, setIsUploading] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("10");
  const [audioUrl, setAudioUrl] = useState("");
  const [passages, setPassages] = useState<Passage[]>([]);
  const [listeningParts, setListeningParts] = useState<ListeningPart[]>([]);
  const [writingTasks, setWritingTasks] = useState<WritingTask[]>([]);

  const resetForm = () => {
    setEditingExamId(null);
    setTitle("");
    setListeningTime("40");
    setReadingTime("60");
    setWritingTime("60");
    setListeningReviewTime("10");
    setAudioUrl("");
    setPassages([{ id: "p1", title: "Passage 1", content: "", questions: [] }]);
    setListeningParts([
      { id: 1, questions: [] }, { id: 2, questions: [] }, 
      { id: 3, questions: [] }, { id: 4, questions: [] }
    ]);
    setWritingTasks([
      { type: "task1", content: "", image: "", wordLimit: "150" },
      { type: "task2", content: "", wordLimit: "250" }
    ]);
  };

  const handleEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    const c = exam.content;
    setListeningParts(c.listening?.parts || []);
    setAudioUrl(c.listening?.audioUrl || "");
    setListeningTime(c.listening?.duration?.toString() || "40");
    setPassages(c.reading?.passages || []);
    setReadingTime(c.reading?.timeLimit?.toString() || "60");
    setWritingTasks(c.writing?.tasks || []);
    setWritingTime(c.writing?.timeLimit?.toString() || "60");
    setIsModalOpen(true);
  };

  const addQuestion = (target: 'reading' | 'listening', pIdx: number) => {
    const newQ: Question = { 
      id: `q-${Date.now()}-${Math.random()}`, 
      type: 'gap_fill', 
      text: "", options: [], answer: "",
      instruction: "Write NO MORE THAN TWO WORDS."
    };
    if (target === 'reading') {
      const n = [...passages];
      n[pIdx].questions = [...n[pIdx].questions, newQ];
      setPassages(n);
    } else {
      const n = [...listeningParts];
      n[pIdx].questions = [...n[pIdx].questions, newQ];
      setListeningParts(n);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      title,
      timeLimit: Number(listeningTime) + Number(readingTime) + Number(writingTime),
      content: {
        listening: { audioUrl, duration: Number(listeningTime), reviewTime: Number(listeningReviewTime), parts: listeningParts },
        reading: { timeLimit: Number(readingTime), passages },
        writing: { timeLimit: Number(writingTime), tasks: writingTasks }
      },
      isPublished: true
    };
    try {
      if (editingExamId) await updateExam.mutateAsync({ id: editingExamId, ...finalData });
      else await createExam.mutateAsync(finalData);
      setIsModalOpen(false);
      resetForm();
    } catch (err) { console.error(err); }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black text-slate-900">Exam <span className="text-blue-600">Studio</span></h2>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-2xl font-bold text-white">
          <lucideReact.Plus className="mr-2"/> Create New Exam
        </Button>
      </div>

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-6 text-xs font-black uppercase text-slate-400">Title</th>
              <th className="p-6 text-xs font-black uppercase text-slate-400">Total Time</th>
              <th className="p-6 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {exams?.map((exam: any) => (
              <tr key={exam.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-6 font-bold text-slate-700">{exam.title}</td>
                <td className="p-6"><Badge variant="outline">{exam.timeLimit} min</Badge></td>
                <td className="p-6 text-right">
                  <Button variant="ghost" className="text-blue-600 font-bold" onClick={() => handleEdit(exam)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleSave} className="space-y-10">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase">Exam Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-16 text-2xl font-black rounded-2xl border-2 px-6" required placeholder="Cambridge IELTS 19..." />
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl grid grid-cols-4 gap-4 min-w-[400px]">
              {[{l:'Listen', v:listeningTime, s:setListeningTime}, {l:'Read', v:readingTime, s:setReadingTime}, {l:'Write', v:writingTime, s:setWritingTime}, {l:'Rev', v:listeningReviewTime, s:setListeningReviewTime}].map(i => (
                <div key={i.l} className="text-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">{i.l}</span>
                  <input type="number" value={i.v} onChange={e => i.s(e.target.value)} className="w-full bg-white/10 text-white text-center font-bold h-10 rounded-xl outline-none focus:ring-2 ring-blue-500" />
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="listening">
            <TabsList className="bg-slate-100 p-1.5 rounded-2xl mb-8">
              <TabsTrigger value="listening" className="px-8 py-3 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-blue-600">Listening</TabsTrigger>
              <TabsTrigger value="reading" className="px-8 py-3 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-blue-600">Reading</TabsTrigger>
              <TabsTrigger value="writing" className="px-8 py-3 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-blue-600">Writing</TabsTrigger>
            </TabsList>

            <TabsContent value="listening" className="space-y-8">
              <Input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="Paste Audio URL here..." className="h-14 rounded-xl shadow-inner" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {listeningParts.map((part, pIdx) => (
                  <div key={part.id} className="p-6 bg-slate-50 border rounded-3xl">
                    <div className="flex justify-between items-center mb-4"><Badge>Part {pIdx + 1}</Badge><Button type="button" size="sm" onClick={() => addQuestion('listening', pIdx)}>+ Question</Button></div>
                    {part.questions.map((q, qIdx) => (
                      <QuestionUI key={q.id} q={q} idx={qIdx} onUpdate={(k:any, v:any) => { const n = [...listeningParts]; (n[pIdx].questions[qIdx] as any)[k] = v; setListeningParts(n); }} onRemove={() => { const n = [...listeningParts]; n[pIdx].questions.splice(qIdx, 1); setListeningParts(n); }} />
                    ))}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reading" className="space-y-12">
              {passages.map((psg, pIdx) => (
                <div key={psg.id} className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-8 bg-white border rounded-[2.5rem] shadow-lg relative">
                  <Badge className="absolute -top-3 left-10">Passage {pIdx + 1}</Badge>
                  <div className="space-y-4">
                    <Input value={psg.title} onChange={e => { const n = [...passages]; n[pIdx].title = e.target.value; setPassages(n); }} className="font-black text-xl bg-slate-50 h-14 rounded-xl" placeholder="Title..." />
                    <Textarea className="min-h-[500px] text-lg leading-relaxed p-6 rounded-2xl font-serif" value={psg.content} onChange={e => { const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n); }} placeholder="Paste content..." />
                  </div>
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl max-h-[700px] overflow-y-auto">
                    <div className="flex justify-between items-center"><h4 className="font-bold">Questions</h4><Button type="button" size="sm" onClick={() => addQuestion('reading', pIdx)}>+ Add</Button></div>
                    {psg.questions.map((q, qIdx) => (
                      <QuestionUI key={q.id} q={q} idx={qIdx} onUpdate={(k:any, v:any) => { const n = [...passages]; (n[pIdx].questions[qIdx] as any)[k] = v; setPassages(n); }} onRemove={() => { const n = [...passages]; n[pIdx].questions.splice(qIdx, 1); setPassages(n); }} />
                    ))}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full h-20 rounded-3xl border-dashed" onClick={() => setPassages([...passages, { id: `p-${Date.now()}`, title: "", content: "", questions: [] }])}>+ Add Passage</Button>
            </TabsContent>

            <TabsContent value="writing" className="grid grid-cols-2 gap-8">
              {writingTasks.map((t, i) => (
                <div key={i} className="p-8 bg-white border rounded-3xl shadow-xl space-y-4">
                  <Badge className="bg-black">Task {i+1}</Badge>
                  {i === 0 && <Input placeholder="Task 1 Image URL..." value={t.image} onChange={e => { const n = [...writingTasks]; n[0].image = e.target.value; setWritingTasks(n); }} />}
                  <Textarea className="min-h-[400px] p-6 bg-slate-50 rounded-2xl" value={t.content} onChange={e => { const n = [...writingTasks]; n[i].content = e.target.value; setWritingTasks(n); }} />
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 border-t pt-8">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 h-16 px-12 rounded-2xl font-black text-xl text-white shadow-xl">
              {editingExamId ? 'UPDATE EXAM' : 'PUBLISH EXAM'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

function QuestionUI({ q, idx, onUpdate, onRemove }: any) {
  return (
    <div className="p-4 bg-white border rounded-2xl mb-4 space-y-3 shadow-sm relative group">
      <div className="flex justify-between items-center gap-2">
        <select value={q.type} onChange={e => onUpdate('type', e.target.value)} className="text-[10px] font-bold uppercase p-2 bg-slate-100 rounded-lg outline-none flex-1">
          {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500"><lucideReact.Trash2 size={16}/></button>
      </div>
      <Input value={q.instruction} onChange={e => onUpdate('instruction', e.target.value)} className="text-[10px] italic h-7 px-2 border-none bg-slate-50" placeholder="Instruction..." />
      <Textarea value={q.text} onChange={e => onUpdate('text', e.target.value)} className="text-sm h-20 p-3" placeholder="Question content..." />
      {q.type === 'mcq' && (
        <div className="grid grid-cols-2 gap-2">
          {[0,1,2,3].map(o => (
            <Input key={o} placeholder={`Option ${String.fromCharCode(65+o)}`} value={q.options[o] || ""} onChange={e => { const no = [...q.options]; no[o] = e.target.value; onUpdate('options', no); }} className="h-8 text-xs" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
        <lucideReact.CheckCircle2 className="text-emerald-500" size={14} />
        <Input value={q.answer} onChange={e => onUpdate('answer', e.target.value)} className="h-7 border-none bg-transparent text-xs font-bold text-emerald-700 focus-visible:ring-0" placeholder="Correct answer..." />
      </div>
    </div>
  );
}