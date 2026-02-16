import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit"; // UI kutubxonangizdan
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as lucideReact from "lucide-react";
import { createClient } from '@supabase/supabase-js';

// Supabase client (client-side for queries, uploads server-side via API)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type QuestionType = 
  | 'mcq_single' // A, B, C, D (Radio)
  | 'mcq_multi'  // A, B, C, D, E (Checkbox)
  | 'gap_fill'   // Input text
  | 'tfng'       // True/False/Not Given
  | 'ynng'       // Yes/No/Not Given
  | 'matching_headings' // Drag & Drop Roman Numerals
  | 'matching_features' // Drag & Drop Names/Categories
  | 'diagram_labeling'  // Image + Input
  | 'short_answer';     // Short input

interface Question {
  id: number | string;
  type: QuestionType; 
  text: string; // Savol matni yoki Diagramma title'i
  options?: string[]; // MCQ variantlari yoki Matching uchun List
  answer: string | string[]; // To'g'ri javob
  instruction: string; // Masalan: "Write NO MORE THAN TWO WORDS"
  imageUrl?: string; // Diagramma yoki Map uchun rasm
  coordinates?: { x: number, y: number }; // Diagramma ustidagi input joylashuvi (Advanced)
  headingList?: string[]; // Matching Headings uchun maxsus
}

interface ListeningPart {
  id: number;
  title?: string;
  questions: Question[];
}

interface Passage {
  id: number | string;
  title: string;
  content: string; // HTML yoki Plain text
  questions: Question[];
}

interface WritingTask {
  type: 'task1' | 'task2';
  content: string;
  image?: string; // Task 1 uchun chart/graph
  wordLimit: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: any }[] = [
  { value: 'mcq_single', label: 'Multiple Choice (Single)', icon: lucideReact.CheckCircle2 },
  { value: 'mcq_multi', label: 'Multiple Choice (Multi)', icon: lucideReact.CheckSquare },
  { value: 'gap_fill', label: 'Sentence / Table Completion', icon: lucideReact.Type },
  { value: 'tfng', label: 'True / False / Not Given', icon: lucideReact.AlertCircle },
  { value: 'ynng', label: 'Yes / No / Not Given', icon: lucideReact.AlertCircle },
  { value: 'matching_headings', label: 'Matching Headings', icon: lucideReact.List },
  { value: 'matching_features', label: 'Matching Features (Drag & Drop)', icon: lucideReact.Layers },
  { value: 'diagram_labeling', label: 'Map / Diagram Labeling', icon: lucideReact.Image },
  { value: 'short_answer', label: 'Short Answer Question', icon: lucideReact.MoreHorizontal },
];

const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col relative animate-in zoom-in-95 duration-300 border border-slate-200">
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-20 rounded-t-[2rem]">
           <div className="flex items-center gap-4">
              <div className="flex gap-2">
                 <div className="h-3 w-3 rounded-full bg-red-400"/>
                 <div className="h-3 w-3 rounded-full bg-amber-400"/>
                 <div className="h-3 w-3 rounded-full bg-green-400"/>
              </div>
              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest border-l border-slate-200 pl-4">CDI Exam Builder</span>
           </div>
           <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500">
             <lucideReact.X size={24} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0 scroll-smooth bg-[#F8FAFC]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function AdminExams() {
  const queryClient = useQueryClient();

  // --- STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Exam Meta
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'json'>('manual');
  const [importJson, setImportJson] = useState("");

  // --- QUERIES & MUTATIONS ---
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const saveFromJson = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/exams/save-from-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, jsonContent: importJson })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setIsModalOpen(false);
      setImportJson("");
    }
  });

  const deleteExam = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams'] })
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Exam Management</h1>
            <p className="text-slate-500 font-medium">Create, edit and manage IELTS computer-delivered exams.</p>
          </div>
          <uiKit.Button 
            onClick={() => { setEditingExamId(null); setTitle(""); setIsModalOpen(true); }}
            className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl shadow-slate-200 flex gap-3 items-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <lucideReact.Plus size={20} />
            CREATE NEW EXAM
          </uiKit.Button>
        </header>

        <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
          <div className="p-8 max-w-5xl mx-auto">
             <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-slate-900 mb-2">{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h2>
                <p className="text-slate-400 font-medium">Configure your exam content and settings below.</p>
             </div>

             <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm mb-8 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >Manual</button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >AI Generate (PDF)</button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'json' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >JSON Import</button>
             </div>

             <div className="space-y-8">
                <div className="space-y-2">
                  <uiKit.Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Exam Title</uiKit.Label>
                  <uiKit.Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. IELTS Academic Practice Test #12" 
                    className="h-14 px-6 rounded-2xl border-slate-200 text-lg font-bold focus:border-blue-500 transition-all bg-white"
                  />
                </div>

                {activeTab === 'json' ? (
                  <div className="space-y-4">
                    <uiKit.Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">JSON Content</uiKit.Label>
                    <uiKit.Textarea 
                      value={importJson}
                      onChange={e => setImportJson(e.target.value)}
                      placeholder='{ "listening": { ... }, "reading": { ... } }'
                      className="min-h-[400px] font-mono text-sm p-6 rounded-2xl border-slate-200"
                    />
                    <uiKit.Button 
                      onClick={() => saveFromJson.mutate()}
                      disabled={saveFromJson.isPending || !title || !importJson}
                      className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      {saveFromJson.isPending ? 'Saving...' : 'SAVE FROM JSON'}
                    </uiKit.Button>
                  </div>
                ) : activeTab === 'ai' ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center bg-white/50">
                    <lucideReact.FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">AI PDF Analyzer</h3>
                    <p className="text-slate-400 text-sm mb-6">Upload a PDF exam to extract questions automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <p className="text-center text-slate-400">Manual editor content placeholder</p>
                  </div>
                )}
             </div>
          </div>
        </Modal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams?.map((exam: any) => (
            <uiKit.Card key={exam.id} className="p-6">
              <h3 className="font-bold text-lg mb-2">{exam.title}</h3>
              <p className="text-slate-500 text-sm mb-4">ID: {exam.id}</p>
              <uiKit.Button 
                variant="destructive" 
                size="sm" 
                onClick={() => deleteExam.mutate(exam.id)}
                disabled={deleteExam.isPending}
              >
                Delete
              </uiKit.Button>
            </uiKit.Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
