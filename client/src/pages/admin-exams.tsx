import { useState, useCallback } from "react";
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
import { 
  X, Upload, Loader2, Play, Trash2, CheckCircle2, Plus, Layers, 
  Clock, Headset, BookOpen, PenTool, Type, CheckSquare, List, 
  AlignLeft, Image as ImageIcon, MoreHorizontal, Save, GripVertical, AlertCircle
} from "lucide-react";

// --- TYPES & INTERFACES ---

type QuestionType = 
  | 'mcq' | 'gap_fill' | 'tfng' | 'ynng' 
  | 'matching_headings' | 'matching_features' 
  | 'diagram' | 'short_answer'
  | 'matching_info' | 'summary_completion' | 'selection_list'; // Yangi qo'shilganlar

interface Question {
  id: number | string;
  type: QuestionType; 
  text: string;
  options?: string[]; 
  answer: string | string[]; // Selection list uchun array bo'lishi mumkin
  instruction: string;
  imageUrl?: string;
  headingList?: string[]; 
  paragraphs?: string[]; // Matching info uchun: ["A", "B", "C", "D"]
}

interface ListeningPart {
  id: number;
  title?: string;
  questions: Question[];
}

interface Passage {
  id: number | string;
  title: string;
  content: string;
  questions: Question[];
}

interface WritingTask {
  type: 'task1' | 'task2';
  content: string;
  image?: string;
  wordLimit: string;
}

// --- CONSTANTS ---

const QUESTION_TYPES: { value: QuestionType; label: string; icon: any }[] = [
  { value: 'gap_fill', label: 'Completion (Gap Fill)', icon: Type },
  { value: 'mcq', label: 'Multiple Choice', icon: CheckSquare },
  { value: 'tfng', label: 'True / False / Not Given', icon: CheckCircle2 },
  { value: 'ynng', label: 'Yes / No / Not Given', icon: CheckCircle2 },
  { value: 'matching_headings', label: 'Matching Headings', icon: List },
  { value: 'matching_features', label: 'Matching Features', icon: AlignLeft },
  { value: 'diagram', label: 'Diagram Labeling', icon: ImageIcon },
  { value: 'short_answer', label: 'Short Answer', icon: MoreHorizontal },
];

// --- HELPER COMPONENTS ---

const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
             <div className="h-3 w-3 rounded-full bg-red-500"/>
             <div className="h-3 w-3 rounded-full bg-amber-500"/>
             <div className="h-3 w-3 rounded-full bg-green-500"/>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {children}
        </div>
      </div>
    </div>
  );
};

const FileUploader = ({ onUpload, accept, isLoading, iconOnly = false }: { onUpload: (file: File) => void, accept: string, isLoading?: boolean, iconOnly?: boolean }) => {
  return (
    <div className="relative group h-full w-full cursor-pointer">
        <input 
          type="file" 
          accept={accept} 
          disabled={isLoading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
          }}
        />
        <div className={`bg-slate-50 hover:bg-blue-50 border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-600 transition-all rounded-xl flex items-center justify-center ${iconOnly ? 'h-full w-full' : 'h-12 w-full gap-2'}`}>
           {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />}
           {!iconOnly && <span className="text-xs font-bold uppercase tracking-wide">Upload</span>}
        </div>
    </div>
  );
};

const AudioPreview = ({ url }: { url: string }) => (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
        <Play size={24} fill="currentColor" className="ml-1" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Master Audio Track</p>
             {url && <Badge variant="outline" className="bg-white text-[9px] text-emerald-600 border-emerald-200">Ready</Badge>}
        </div>
        {url ? (
          <audio controls key={url} className="h-8 w-full block accent-blue-600">
            <source src={url} type="audio/mpeg" />
            Audio not supported.
          </audio>
        ) : (
          <p className="text-xs text-slate-400 italic font-medium">No audio file uploaded yet.</p>
        )}
      </div>
    </div>
);

// --- QUESTION EDITOR COMPONENT ---

const QuestionEditor = ({ q, idx, onUpdate, onRemove, isUploading, handleFileUpload }: { 
    q: Question, idx: number, onUpdate: (field: keyof Question, value: any) => void, onRemove: () => void, isUploading: boolean, handleFileUpload: any 
}) => {

    // Auto-update instruction based on type change
    const handleTypeChange = (newType: QuestionType) => {
      let defaultInstruction = q.instruction;
      let defaultOptions = q.options;

      switch(newType) {
        case 'tfng': defaultInstruction = "Do the following statements agree with the information given in the passage?"; defaultOptions = ["TRUE", "FALSE", "NOT GIVEN"]; break;
        case 'ynng': defaultInstruction = "Do the following statements agree with the claims of the writer?"; defaultOptions = ["YES", "NO", "NOT GIVEN"]; break;
        case 'mcq': defaultInstruction = "Choose the correct letter, A, B, C or D."; defaultOptions = ["", "", "", ""]; break;
        case 'matching_headings': defaultInstruction = "Choose the correct heading for each paragraph from the list of headings below."; break;
        case 'gap_fill': defaultInstruction = "Write NO MORE THAN TWO WORDS for each answer."; break;
        case 'diagram': defaultInstruction = "Label the diagram below. Write NO MORE THAN TWO WORDS."; break;
      }
      onUpdate('type', newType); 
      onUpdate('instruction', defaultInstruction);
      if (defaultOptions.length > 0) onUpdate('options', defaultOptions);
    };

    return (
      <div className="group relative pl-4 border-l-4 border-slate-200 hover:border-blue-500 bg-white hover:bg-slate-50 transition-all duration-300 py-4 pr-2 rounded-r-xl mb-4">

        {/* Header: Type Selector & Delete */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
             <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs shadow-md">
                {idx + 1}
             </div>
             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                 <select 
                    className="w-full text-xs font-bold uppercase bg-white border border-slate-200 rounded-lg px-2 py-2 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    value={q.type} 
                    onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                 >
                   {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                 </select>
                 <Input 
                   value={q.instruction} 
                   onChange={e => onUpdate('instruction', e.target.value)} 
                   className="h-9 text-[11px] text-slate-500 border-transparent bg-transparent focus:bg-white focus:border-slate-200 italic"
                   placeholder="Instruction..."
                 />
             </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 rounded-lg transition-colors"><Trash2 size={16}/></Button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 ml-11">

            {/* MATCHING HEADINGS SPECIAL UI */}
            {q.type === 'matching_headings' && (
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/60 space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">List of Headings</Label>
                    <Badge variant="outline" className="border-amber-200 text-amber-600 bg-white text-[9px]">Roman Numerals (i, ii...)</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {(q.headingList || [""]).map((h, hIdx) => (
                      <div key={hIdx} className="flex gap-2 items-center group/heading">
                        <span className="text-xs font-serif font-bold text-amber-500 w-6 text-right italic">{['i','ii','iii','iv','v','vi','vii','viii','ix','x'][hIdx]}.</span>
                        <Input 
                          value={h} 
                          onChange={e => { const newList = [...(q.headingList || [])]; newList[hIdx] = e.target.value; onUpdate('headingList', newList); }} 
                          placeholder={`Heading ${hIdx + 1}`} 
                          className="h-8 bg-white text-sm"
                        />
                         <Button size="sm" variant="ghost" onClick={() => { const newList = [...(q.headingList || [])]; newList.splice(hIdx, 1); onUpdate('headingList', newList); }} className="h-6 w-6 p-0 text-amber-300 hover:text-red-500 opacity-0 group-hover/heading:opacity-100"><X size={12}/></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => onUpdate('headingList', [...(q.headingList || []), ""])} className="w-full mt-2 text-[10px] border-dashed border-amber-300 text-amber-600 hover:bg-amber-100 bg-transparent">+ Add Heading Option</Button>
                </div>
              </div>
            )}

            {/* DIAGRAM SPECIAL UI */}
            {q.type === 'diagram' && (
               <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-24 h-24 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden relative">
                      {q.imageUrl ? <img src={q.imageUrl} className="w-full h-full object-cover" alt="Diagram" /> : <ImageIcon className="text-slate-300" />}
                      <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity">
                          <FileUploader iconOnly accept="image/*" onUpload={async (f) => { const url = await handleFileUpload(f, 'image'); onUpdate('imageUrl', url); }} isLoading={isUploading} />
                      </div>
                  </div>
                  <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Diagram Context / Title</Label>
                      <Input placeholder="e.g. Structure of a leaf" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="bg-white" />
                  </div>
               </div>
            )}

            {/* QUESTION TEXT INPUT */}
            {q.type !== 'diagram' && (
                <div className="space-y-1">
                    {q.type === 'matching_headings' ? (
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Target:</span>
                             <Input placeholder="e.g. Paragraph A" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-bold w-1/2" />
                        </div>
                    ) : (
                        <Textarea 
                          placeholder="Enter the question text here..." 
                          value={q.text} 
                          onChange={e => onUpdate('text', e.target.value)} 
                          className="min-h-[50px] resize-none text-sm leading-relaxed bg-transparent border-slate-200 focus:bg-white transition-colors"
                        />
                    )}
                </div>
            )}

            {/* MCQ OPTIONS */}
            {q.type === 'mcq' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                       <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border cursor-pointer transition-colors ${q.answer === String.fromCharCode(65 + oIdx) ? 'bg-green-500 text-white border-green-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`} 
                            onClick={() => onUpdate('answer', String.fromCharCode(65 + oIdx))}>
                           {String.fromCharCode(65 + oIdx)}
                       </div>
                       <Input value={opt} onChange={e => { const n = [...q.options]; n[oIdx] = e.target.value; onUpdate('options', n); }} className="h-8 text-sm" placeholder="Option text..." />
                       <button onClick={() => { const n = [...q.options]; n.splice(oIdx,1); onUpdate('options', n); }} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => onUpdate('options', [...q.options, ""])} className="text-xs border-dashed text-slate-400 h-8">+ Add Option</Button>
               </div>
            )}

            {/* ANSWER KEY INPUT */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${q.answer ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <CheckCircle2 size={16} className={q.answer ? "text-emerald-500" : "text-slate-300"} />
                <span className="text-[10px] font-black uppercase text-slate-400 w-16">Answer:</span>

                {['tfng', 'ynng'].includes(q.type) ? (
                    <div className="flex gap-2">
                        {q.options.map(opt => (
                            <button key={opt} type="button" 
                                onClick={() => onUpdate('answer', opt)}
                                className={`px-3 py-1 rounded text-[10px] font-bold border transition-all ${q.answer === opt ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                ) : (
                    <Input 
                        className="h-7 border-none bg-transparent font-bold text-slate-800 focus-visible:ring-0 p-0 placeholder:font-normal" 
                        placeholder="Enter correct answer..." 
                        value={q.answer} 
                        onChange={e => onUpdate('answer', e.target.value)} 
                    />
                )}
            </div>
        </div>
      </div>
    );
};

// --- MAIN PAGE COMPONENT ---

export default function AdminExams() {
  const { data: exams, isLoading } = useExams();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("10");

  const [audioUrl, setAudioUrl] = useState("");
  const [listeningParts, setListeningParts] = useState<ListeningPart[]>([
    { id: 1, questions: [] }, { id: 2, questions: [] }, { id: 3, questions: [] }, { id: 4, questions: [] },
  ]);

  const [passages, setPassages] = useState<Passage[]>([
    { id: 1, title: "Passage 1", content: "", questions: [] }
  ]);

  const [writingTasks, setWritingTasks] = useState<WritingTask[]>([
    { type: "task1", content: "", image: "", wordLimit: "150" },
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  // Handlers
  const handleFileUpload = async (file: File, type: 'image' | 'audio'): Promise<string> => {
    const isAudio = type === 'audio';
    const limitMB = isAudio ? 100 : 10;

    if (file.size > limitMB * 1024 * 1024) {
      alert(`File too large! Max: ${limitMB}MB`);
      return "";
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Simulate API call or Replace with real API
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch (e) {
      console.error(e);
      // alert("Upload failed (Mock Mode)"); 
      return URL.createObjectURL(file); // Fallback for demo
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setEditingExamId(null);
    setTitle("");
    setListeningTime("40"); setReadingTime("60"); setWritingTime("60"); setListeningReviewTime("10");
    setAudioUrl("");
    setListeningParts([{ id: 1, questions: [] }, { id: 2, questions: [] }, { id: 3, questions: [] }, { id: 4, questions: [] }]);
    setPassages([{ id: 1, title: "Passage 1", content: "", questions: [] }]);
    setWritingTasks([{ type: "task1", content: "", image: "", wordLimit: "150" }, { type: "task2", content: "", wordLimit: "250" }]);
  };

  const handleEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    const c = exam.content;

    if (c.listening) {
        setListeningTime(String(c.listening.duration || 40));
        setListeningReviewTime(String(c.listening.reviewTime || 10));
        setAudioUrl(c.listening.audioUrl || "");
        setListeningParts(c.listening.parts || []);
    }
    if (c.reading) {
        setReadingTime(String(c.reading.timeLimit || 60));
        setPassages(c.reading.passages || []);
    }
    if (c.writing) {
        setWritingTime(String(c.writing.timeLimit || 60));
        setWritingTasks(c.writing.tasks || []);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    const examData = {
      title,
      timeLimit: (+listeningTime) + (+readingTime) + (+writingTime),
      content: {
        listening: { audioUrl, duration: +listeningTime, reviewTime: +listeningReviewTime, parts: listeningParts },
        reading: { timeLimit: +readingTime, passages },
        writing: { timeLimit: +writingTime, tasks: writingTasks }
      },
      isPublished: true
    };

    try {
      if (editingExamId) await updateExam.mutateAsync({ id: editingExamId, ...examData });
      else await createExam.mutateAsync(examData);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  // Generic Logic for Adding Questions
  const addQuestion = (section: 'listening' | 'reading', index: number) => {
    const newQ: Question = { 
      id: Date.now() + Math.random(), 
      type: 'gap_fill', 
      text: "", 
      options: [], 
      answer: "", 
      instruction: "Write NO MORE THAN TWO WORDS for each answer." 
    };

    if (section === 'listening') {
        const n = [...listeningParts];
        n[index].questions.push(newQ);
        setListeningParts(n);
    } else {
        const n = [...passages];
        n[index].questions.push(newQ);
        setPassages(n);
    }
  };

  // Helper to update specific questions
  const updateQuestion = (section: 'listening' | 'reading', groupIdx: number, qIdx: number, field: keyof Question, value: any) => {
      if (section === 'listening') {
          const n = [...listeningParts];
          (n[groupIdx].questions[qIdx] as any)[field] = value;
          setListeningParts(n);
      } else {
          const n = [...passages];
          (n[groupIdx].questions[qIdx] as any)[field] = value;
          setPassages(n);
      }
  };

  const removeQuestion = (section: 'listening' | 'reading', groupIdx: number, qIdx: number) => {
      if (section === 'listening') {
          const n = [...listeningParts];
          n[groupIdx].questions.splice(qIdx, 1);
          setListeningParts(n);
      } else {
          const n = [...passages];
          n[groupIdx].questions.splice(qIdx, 1);
          setPassages(n);
      }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Exam<span className="text-blue-600">Studio</span>.</h2>
          <p className="text-slate-500 font-medium text-lg">Professional IELTS Assessment Builder</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-slate-900 hover:bg-blue-600 text-white rounded-2xl px-8 h-14 font-bold shadow-xl shadow-slate-200 transition-all flex items-center gap-2">
          <Plus size={20} strokeWidth={3} /> Create New Exam
        </Button>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
        <div className="p-0">
          {isLoading ? (
             <div className="p-32 flex flex-col items-center justify-center text-slate-300 gap-4">
                 <Loader2 className="animate-spin" size={48}/>
                 <p className="font-bold text-sm tracking-widest uppercase">Loading Library...</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-8 text-[11px] font-black uppercase tracking-widest text-slate-400">Title</th>
                  <th className="p-8 text-[11px] font-black uppercase tracking-widest text-slate-400">Configuration</th>
                  <th className="p-8 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-8"></th>
                </tr>
              </thead>
              <tbody>
                {exams?.map((exam: any) => (
                  <tr key={exam.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                    <td className="p-8">
                        <span className="font-bold text-slate-800 text-lg block">{exam.title}</span>
                        <span className="text-xs text-slate-400 font-medium">ID: #{exam.id}</span>
                    </td>
                    <td className="p-8">
                        <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-500 font-bold">{exam.timeLimit} mins</Badge>
                            {exam.content?.listening?.audioUrl && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border border-blue-100"><Headset size={10} className="mr-1"/> Audio</Badge>}
                        </div>
                    </td>
                    <td className="p-8">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                            <span className="text-xs font-bold text-emerald-600 uppercase">Published</span>
                        </div>
                    </td>
                    <td className="p-8 text-right">
                        <Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-6" onClick={() => handleEdit(exam)}>Edit</Button>
                    </td>
                  </tr>
                ))}
                {(!exams || exams.length === 0) && (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic">No exams found. Create your first one!</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* --- MODAL --- */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto pb-20">

            {/* Header Section */}
            <div className="grid grid-cols-12 gap-8 items-start">
               <div className="col-span-12 lg:col-span-8 space-y-4">
                  <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Assessment Name</Label>
                  <Input 
                    placeholder="e.g. Cambridge IELTS 19 - Test 1" 
                    value={title} onChange={e => setTitle(e.target.value)} required 
                    className="h-20 text-3xl font-black border-2 border-slate-100 focus:border-blue-600 rounded-[1.5rem] px-8 shadow-sm bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300" 
                  />
               </div>
               <div className="col-span-12 lg:col-span-4 bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                      <Clock size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Timings (Min)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      {[{l:'Listening', v:listeningTime, s:setListeningTime}, {l:'Reading', v:readingTime, s:setReadingTime}, {l:'Writing', v:writingTime, s:setWritingTime}, {l:'Review', v:listeningReviewTime, s:setListeningReviewTime}].map((item, i) => (
                          <div key={i} className="bg-white/10 rounded-xl p-3 px-4 flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-slate-400 mb-1">{item.l}</span>
                              <input type="number" className="bg-transparent border-none text-xl font-black p-0 w-full focus:ring-0 text-white" value={item.v} onChange={(e) => item.s(e.target.value)} />
                          </div>
                      ))}
                  </div>
               </div>
            </div>

            <Tabs defaultValue="listening" className="w-full">
                <TabsList className="w-full justify-start gap-4 bg-transparent p-0 mb-8 border-b border-slate-100 pb-1">
                    {[
                        {val:'listening', icon: Headset, label: 'Listening'},
                        {val:'reading', icon: BookOpen, label: 'Reading'},
                        {val:'writing', icon: PenTool, label: 'Writing'}
                    ].map(tab => (
                        <TabsTrigger key={tab.val} value={tab.val} className="px-8 py-4 rounded-t-2xl border-b-4 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-slate-50 data-[state=active]:text-blue-700 text-slate-400 font-bold text-lg gap-3 transition-all">
                            <tab.icon size={20} strokeWidth={2.5}/> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* --- LISTENING TAB --- */}
                <TabsContent value="listening" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-8 border-blue-100 bg-blue-50/30 rounded-[2rem]">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 space-y-2 w-full">
                                <Label className="text-xs font-black text-blue-600 uppercase tracking-widest">Main Audio Track</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://..." className="pl-10 bg-white border-blue-200 h-12 rounded-xl" />
                                        <div className="absolute left-3 top-3.5 text-blue-300"><Headset size={18}/></div>
                                    </div>
                                    <div className="w-12 h-12">
                                        <FileUploader iconOnly accept="audio/*" onUpload={async (f) => { const url = await handleFileUpload(f, 'audio'); setAudioUrl(url); }} isLoading={isUploading} />
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/3">
                                <AudioPreview url={audioUrl} />
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {listeningParts.map((part, pIdx) => (
                            <div key={part.id} className="flex flex-col bg-white border border-slate-200 shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-slate-900 h-8 px-4 rounded-lg text-xs tracking-widest">PART {pIdx + 1}</Badge>
                                        <span className="text-xs font-bold text-slate-400">{part.questions.length} Questions</span>
                                    </div>
                                    <Button size="sm" onClick={() => addQuestion('listening', pIdx)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-200 font-bold text-xs px-4 h-9">
                                        <Plus size={16} className="mr-1"/> Add Question
                                    </Button>
                                </div>
                                <div className="p-6 space-y-2 h-[600px] overflow-y-auto">
                                    {part.questions.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-xl m-4">
                                            <Headset size={32} />
                                            <p className="text-xs font-bold uppercase">No Questions Yet</p>
                                        </div>
                                    ) : part.questions.map((q, qIdx) => (
                                        <QuestionEditor 
                                            key={q.id} q={q} idx={qIdx} isUploading={isUploading} handleFileUpload={handleFileUpload}
                                            onUpdate={(k, v) => updateQuestion('listening', pIdx, qIdx, k, v)}
                                            onRemove={() => removeQuestion('listening', pIdx, qIdx)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* --- READING TAB --- */}
                <TabsContent value="reading" className="space-y-16 animate-in slide-in-from-bottom-4 duration-500">
                    {passages.map((psg, pIdx) => (
                        <div key={psg.id} className="group relative bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
                             {/* Passage Toolbar */}
                             <div className="bg-slate-900 text-white p-6 px-10 flex justify-between items-center">
                                 <div className="flex items-center gap-4">
                                     <span className="font-black text-2xl tracking-tighter text-slate-500 group-hover:text-white transition-colors">0{pIdx + 1}</span>
                                     <div className="h-8 w-[1px] bg-white/20"/>
                                     <Input 
                                        value={psg.title} onChange={e => { const n = [...passages]; n[pIdx].title = e.target.value; setPassages(n); }}
                                        className="bg-transparent border-none text-white font-bold text-lg placeholder:text-slate-600 focus:ring-0 w-[300px]"
                                        placeholder="Passage Title..."
                                     />
                                 </div>
                                 <Button variant="ghost" onClick={() => { if(confirm('Delete Passage?')) { const n = [...passages]; n.splice(pIdx, 1); setPassages(n); } }} className="text-slate-500 hover:text-red-400"><Trash2 size={20}/></Button>
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-2 h-[800px]">
                                 {/* Content Editor */}
                                 <div className="p-8 border-r border-slate-100 bg-slate-50/30 flex flex-col">
                                     <Label className="mb-4 text-xs font-black uppercase text-slate-400 flex items-center gap-2"><AlignLeft size={14}/> Passage Text</Label>
                                     <Textarea 
                                        className="flex-1 bg-white border-slate-200 focus:border-blue-400 rounded-2xl p-6 text-lg font-serif leading-8 resize-none shadow-inner"
                                        placeholder="Paste the reading passage content here..."
                                        value={psg.content}
                                        onChange={e => { const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n); }}
                                     />
                                 </div>

                                 {/* Questions Editor */}
                                 <div className="flex flex-col bg-white">
                                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                                         <h4 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><List size={16} className="text-blue-500"/> Questions</h4>
                                         <Button size="sm" onClick={() => addQuestion('reading', pIdx)} className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200 border-none">
                                            + Add Question
                                         </Button>
                                     </div>
                                     <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                        {psg.questions.map((q, qIdx) => (
                                            <QuestionEditor 
                                                key={q.id} q={q} idx={qIdx} isUploading={isUploading} handleFileUpload={handleFileUpload}
                                                onUpdate={(k, v) => updateQuestion('reading', pIdx, qIdx, k, v)}
                                                onRemove={() => removeQuestion('reading', pIdx, qIdx)}
                                            />
                                        ))}
                                        <div className="h-20"/>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    ))}

                    <Button onClick={() => setPassages([...passages, { id: Date.now(), title: "", content: "", questions: [] }])} variant="outline" className="w-full h-24 rounded-[2rem] border-4 border-dashed border-slate-200 text-slate-400 font-black text-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all gap-3">
                        <Plus size={32} strokeWidth={3} /> ADD NEW READING PASSAGE
                    </Button>
                </TabsContent>

                {/* --- WRITING TAB --- */}
                <TabsContent value="writing" className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4 duration-500">
                    {writingTasks.map((task, idx) => (
                        <div key={idx} className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 flex flex-col relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-2 ${idx === 0 ? 'bg-amber-400' : 'bg-purple-400'}`}/>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-black text-2xl text-slate-800">Task {idx + 1}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{idx === 0 ? 'Report / Letter' : 'Essay'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">Min Words:</span>
                                    <Input 
                                        className="w-16 h-8 text-center font-bold bg-slate-100 border-none" 
                                        value={task.wordLimit} 
                                        onChange={e => { const n = [...writingTasks]; n[idx].wordLimit = e.target.value; setWritingTasks(n); }}
                                    />
                                </div>
                            </div>

                            {idx === 0 && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                    <div className="w-24 h-24 bg-white rounded-xl border border-amber-200 flex items-center justify-center relative overflow-hidden group">
                                         {task.image ? <img src={task.image} className="w-full h-full object-cover" alt="Task 1" /> : <ImageIcon className="text-amber-300"/>}
                                         <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <FileUploader iconOnly accept="image/*" onUpload={async (f) => { const url = await handleFileUpload(f, 'image'); const n = [...writingTasks]; n[0].image = url; setWritingTasks(n); }} isLoading={isUploading} />
                                         </div>
                                    </div>
                                    <div className="flex-1 py-2">
                                        <p className="text-xs font-bold text-amber-700 uppercase mb-1">Visual Reference</p>
                                        <p className="text-[10px] text-amber-600/70 leading-relaxed">Upload the chart, graph, or diagram for Task 1 here. Candidates will see this image alongside the prompt.</p>
                                    </div>
                                </div>
                            )}

                            <Textarea 
                                className="flex-1 min-h-[400px] bg-slate-50 border-slate-200 rounded-2xl p-6 text-lg font-medium resize-none focus:bg-white transition-colors"
                                placeholder={`Enter the prompt for Task ${idx+1}...`}
                                value={task.content}
                                onChange={e => { const n = [...writingTasks]; n[idx].content = e.target.value; setWritingTasks(n); }}
                            />
                        </div>
                    ))}
                </TabsContent>
            </Tabs>

            {/* Footer Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-50 flex justify-center shadow-2xl">
                <div className="w-full max-w-6xl flex justify-between items-center">
                    <Button type="button" variant="ghost" className="text-slate-400 hover:text-red-500 font-bold" onClick={() => setIsModalOpen(false)}>Discard Changes</Button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase text-slate-400">Total Duration</p>
                            <p className="font-bold text-slate-800">{(+listeningTime) + (+readingTime) + (+writingTime)} Minutes</p>
                        </div>
                        <Button type="submit" disabled={createExam.isPending || updateExam.isPending} className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-10 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-105 transition-all">
                            {createExam.isPending || updateExam.isPending ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={20}/> {editingExamId ? 'Update Exam' : 'Publish Exam'}</>}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}