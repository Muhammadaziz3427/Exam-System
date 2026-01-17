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
import { 
  Plus, 
  Loader2, 
  BookOpen, 
  Headset, 
  PenTool, 
  Trash2, 
  ListChecks, 
  Type, 
  Map as MapIcon, 
  Eye, 
  Calendar,
  Clock,
  Layers
} from "lucide-react";

// --- INTERFACES ---
interface Question {
  id: number;
  type: string; 
  text: string;
  options: string[];
  answer: string;
  instruction: string;
}

interface Passage {
  id: number;
  title: string;
  content: string;
  questions: Question[];
}

const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 p-8 relative">
        <button onClick={() => onOpenChange(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-2xl">✕</button>
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

  // ALOHIDA TAYMERLAR (IELTS Standarti boyicha)
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("5"); // Audio tugagandan keyin tekshirish vaqti

  // SECTIONS STATE
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
    const type = 'gap_fill'; // Default type
    const newQ: Question = { 
      id: Date.now(), 
      type, 
      text: "", 
      options: [], 
      answer: "",
      instruction: "Write NO MORE THAN TWO WORDS for each answer."
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

    await createExam.mutateAsync({ 
      title, 
      timeLimit: parseInt(listeningTime) + parseInt(readingTime) + parseInt(writingTime), // Total duration
      content: finalContent, 
      isPublished: true 
    });
    setIsModalOpen(false);
  };

  // --- UI: QUESTION ITEM COMPONENT ---
  const QuestionItem = ({ q, idx, onUpdate, onRemove }: any) => (
    <div className="group p-4 border border-slate-200 rounded-xl bg-slate-50/30 hover:bg-white hover:shadow-md transition-all space-y-3 mb-3 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-900 text-[10px]">{idx + 1}</Badge>
          <select 
            className="text-[10px] font-bold uppercase tracking-wider bg-transparent border-none outline-none text-blue-600"
            value={q.type}
            onChange={(e) => onUpdate('type', e.target.value)}
          >
            <option value="gap_fill">Gap Fill</option>
            <option value="mcq">MCQ</option>
            <option value="tfng">TFNG (True/False)</option>
            <option value="matching">Matching Headings</option>
            <option value="map">Map Labeling</option>
          </select>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14}/></Button>
      </div>

      <Input placeholder="Instruction (e.g. Choose NO MORE THAN TWO WORDS)" value={q.instruction} onChange={e => onUpdate('instruction', e.target.value)} className="text-xs italic border-dashed" />
      <Input placeholder="Question Text" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-medium" />

      {(q.type === 'mcq' || q.type === 'matching' || q.type === 'map') && (
        <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-blue-100">
          {['A', 'B', 'C', 'D'].map((label, oIdx) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">{label}</span>
              <Input 
                placeholder={`Option ${label}`} 
                value={q.options[oIdx] || ""} 
                onChange={e => {
                  const newOpts = [...q.options];
                  newOpts[oIdx] = e.target.value;
                  onUpdate('options', newOpts);
                }} 
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
        <CheckCircle2 size={14} className="text-emerald-600" />
        <Input className="h-8 border-none bg-transparent font-bold text-emerald-700 placeholder:text-emerald-300" placeholder="Correct Answer(s)" value={q.answer} onChange={e => onUpdate('answer', e.target.value)} />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Exam Creator <span className="text-blue-600">Pro</span></h2>
          <p className="text-slate-500 font-medium">Professional IELTS Mock Test Construction Kit</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-black text-white rounded-full px-8 h-12">
          <Plus className="mr-2" size={20} /> Create New Exam
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          {/* Jadval qismi avvalgi kod bilan bir xil */}
          <div className="p-6 border-b bg-slate-50/50">
            <h3 className="font-bold flex items-center gap-2"><Layers size={18}/> Active Exams</h3>
          </div>
          <table className="w-full">
             {/* ... Table logic ... */}
          </table>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleCreate} className="space-y-8">
          {/* TOP HEADER: TITLE & TIMERS */}
          <div className="grid grid-cols-12 gap-6 pb-6 border-b">
            <div className="col-span-6 space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Exam Identity</Label>
              <Input placeholder="e.g. Cambridge IELTS 18 - Test 1" value={title} onChange={e => setTitle(e.target.value)} required className="h-14 text-xl font-bold border-2 focus:border-blue-600 rounded-xl" />
            </div>
            <div className="col-span-6 grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border">
               {[
                 { label: 'Listening', val: listeningTime, set: setListeningTime },
                 { label: 'Reading', val: readingTime, set: setReadingTime },
                 { label: 'Writing', val: writingTime, set: setWritingTime },
                 { label: 'L-Review', val: listeningReviewTime, set: setListeningReviewTime },
               ].map(t => (
                 <div key={t.label} className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1"><Clock size={10}/> {t.label}</Label>
                   <Input type="number" value={t.val} onChange={e => t.set(e.target.value)} className="h-10 font-bold text-center" />
                 </div>
               ))}
            </div>
          </div>

          <Tabs defaultValue="reading" className="w-full">
            <TabsList className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl mb-8">
              <TabsTrigger value="listening" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 font-bold"><Headset size={18}/> Listening</TabsTrigger>
              <TabsTrigger value="reading" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 font-bold"><BookOpen size={18}/> Reading</TabsTrigger>
              <TabsTrigger value="writing" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 font-bold"><PenTool size={18}/> Writing</TabsTrigger>
            </TabsList>

            {/* READING SECTION: PASSAGE BASED */}
            <TabsContent value="reading" className="space-y-10">
              {passages.map((psg, pIdx) => (
                <div key={psg.id} className="grid grid-cols-2 gap-8 p-6 bg-white border-2 border-slate-100 rounded-3xl relative">
                  <Badge className="absolute -top-3 left-8 bg-blue-600 h-7 px-4">Passage {pIdx + 1}</Badge>

                  {/* Left: Content */}
                  <div className="space-y-4">
                    <Input placeholder="Passage Title (e.g. The Rise of AI)" value={psg.title} onChange={e => {
                      const n = [...passages]; n[pIdx].title = e.target.value; setPassages(n);
                    }} className="font-black text-lg border-none bg-slate-50 rounded-xl" />
                    <Textarea placeholder="Paste passage text here..." className="min-h-[400px] leading-relaxed font-serif text-base" value={psg.content} onChange={e => {
                      const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n);
                    }} />
                  </div>

                  {/* Right: Questions */}
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-black text-sm uppercase tracking-tighter text-slate-400">Questions for Passage {pIdx + 1}</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => addQuestionGroup('reading', pIdx)} className="rounded-full bg-white">+ Add Question</Button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
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
              {passages.length < 3 && (
                <Button type="button" variant="ghost" className="w-full border-2 border-dashed h-20 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-200" onClick={() => setPassages([...passages, { id: Date.now(), title: "", content: "", questions: [] }])}>
                  + Add Next Passage
                </Button>
              )}
            </TabsContent>

            {/* LISTENING SECTION */}
            <TabsContent value="listening" className="space-y-6">
               <div className="flex gap-4 p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                  <div className="flex-1 space-y-2">
                    <Label className="font-bold">Audio File (MP3 URL)</Label>
                    <Input placeholder="https://cloud-storage.com/audio-test-1.mp3" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
                  </div>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center">
                     <h3 className="font-black text-xl">Listening Questions (All Sections)</h3>
                     <Button type="button" onClick={() => addQuestionGroup('listening')} className="rounded-full">+ Add Question Block</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
            </TabsContent>

            {/* WRITING SECTION */}
            <TabsContent value="writing" className="grid grid-cols-2 gap-8">
              {writingTasks.map((task, idx) => (
                <div key={idx} className="p-8 bg-white border-2 border-slate-100 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b pb-4">
                    <Badge className="bg-slate-900 px-4 py-1">Writing Task {idx + 1}</Badge>
                    <span className="text-xs font-bold text-slate-400 italic">Recommended: {task.wordLimit} words</span>
                  </div>
                  {idx === 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Diagram/Map Image URL (For Task 1)</Label>
                      <Input value={task.image} onChange={e => {
                        const n = [...writingTasks]; n[0].image = e.target.value; setWritingTasks(n);
                      }} placeholder="https://..." />
                    </div>
                  )}
                  <Label className="text-[10px] font-black uppercase">Question Prompt</Label>
                  <Textarea className="min-h-[200px] text-lg font-medium bg-slate-50 border-none" value={task.content} onChange={e => {
                    const n = [...writingTasks]; n[idx].content = e.target.value; setWritingTasks(n);
                  }} />
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {/* ACTIONS */}
          <div className="flex justify-end items-center gap-4 pt-8 border-t">
             <Button type="button" variant="ghost" className="font-bold" onClick={() => setIsModalOpen(false)}>Discard Draft</Button>
             <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-14 px-12 rounded-2xl font-black text-lg shadow-xl shadow-blue-200" disabled={createExam.isPending}>
               {createExam.isPending ? <Loader2 className="animate-spin" /> : "PUBLISH COMPLETE EXAM"}
             </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}