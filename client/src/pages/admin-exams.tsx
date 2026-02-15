import { useState, useEffect } from "react";
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
  | 'sentence_completion'   // Sentence completion with input text
  | 'table_completion'      // Table completion with input text
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
  coordinates?: { x: number, y: number }[]; // Diagramma ustidagi input joylashuvi (bir nechta labels uchun)
  headingList?: string[]; // Matching Headings uchun maxsus
  tableHeaders?: string[]; // Table completion uchun sarlavhalar
  tableRows?: string[][]; // Table completion uchun satrlar (tez tuzish uchun)
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
  { value: 'sentence_completion', label: 'Sentence Completion', icon: lucideReact.Type },
  { value: 'table_completion', label: 'Table Completion', icon: lucideReact.Table },
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

const FileUploader = ({ onUpload, accept, isLoading, iconOnly = false, label = "Upload" }: any) => {
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
        <div className={`bg-white hover:bg-blue-50 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600 transition-all rounded-xl flex items-center justify-center ${iconOnly ? 'h-full w-full' : 'h-14 w-full gap-3 shadow-sm'}`}>
           {isLoading ? <lucideReact.Loader2 className="animate-spin text-blue-600" size={20}/> : <lucideReact.Upload size={20} />}
           {!iconOnly && <span className="text-xs font-black uppercase tracking-wide">{label}</span>}
        </div>
    </div>
  );
};

const AudioPreview = ({ url }: { url: string }) => (
    <div className="p-5 bg-white rounded-2xl border border-slate-100 flex items-center gap-5 shadow-sm">
      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
        <lucideReact.Play size={24} fill="currentColor" className="ml-1" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Master Audio File (MP3)</p>
             {url && <uiKit.Badge variant="outline" className="bg-emerald-50 text-[9px] text-emerald-600 border-emerald-200 font-bold">READY TO PLAY</uiKit.Badge>}
        </div>
        {url ? (
          <audio controls key={url} className="h-8 w-full block accent-blue-600 custom-audio-player">
            <source src={url} type="audio/mpeg" />
          </audio>
        ) : (
          <p className="text-xs text-slate-400 italic font-medium">Please upload the master audio file (approx 30-40mins).</p>
        )}
      </div>
    </div>
);

const QuestionEditor = ({ q, idx, onUpdate, onRemove, isUploading, handleFileUpload }: { 
    q: Question, idx: number, onUpdate: (field: keyof Question, value: any) => void, onRemove: () => void, isUploading: boolean, handleFileUpload: any 
}) => {
    const handleTypeChange = (newType: QuestionType) => {
      let defaultInstruction = q.instruction;
      let defaultOptions: string[] | undefined = undefined;
      switch(newType) {
        case 'tfng': 
          defaultInstruction = "Do the following statements agree with the information given in the passage?"; 
          defaultOptions = ["TRUE", "FALSE", "NOT GIVEN"]; 
          break;
        case 'ynng': 
          defaultInstruction = "Do the following statements agree with the claims of the writer?"; 
          defaultOptions = ["YES", "NO", "NOT GIVEN"]; 
          break;
        case 'mcq_single': 
          defaultInstruction = "Choose the correct letter, A, B, C or D."; 
          defaultOptions = ["", "", "", ""]; 
          break;
        case 'mcq_multi': 
          defaultInstruction = "Choose TWO letters, A-E."; 
          defaultOptions = ["", "", "", "", ""]; 
          break;
        case 'matching_headings': 
          defaultInstruction = "Choose the correct heading for each paragraph from the list of headings below."; 
          defaultOptions = ["", "", ""];
          break;
        case 'matching_features':
          defaultInstruction = "Match each statement with the correct person/category.";
          defaultOptions = ["", "", ""];
          break;
        case 'sentence_completion': 
          defaultInstruction = "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer."; 
          break;
        case 'table_completion': 
          defaultInstruction = "Complete the table below. Write NO MORE THAN TWO WORDS for each answer."; 
          break;
        case 'diagram_labeling': 
          defaultInstruction = "Label the diagram below. Write NO MORE THAN TWO WORDS for each answer."; 
          break;
        case 'short_answer':
          defaultInstruction = "Answer the questions below. Write NO MORE THAN TWO WORDS for each answer.";
          break;
      }
      onUpdate('type', newType); 
      onUpdate('instruction', defaultInstruction);
      if (defaultOptions && defaultOptions.length > 0) onUpdate('options', defaultOptions);
      if (newType === 'table_completion') {
        onUpdate('tableHeaders', []);
        onUpdate('tableRows', [[]]);
      }
      if (newType === 'diagram_labeling') {
        onUpdate('coordinates', []);
      }
    };
    return (
      <div className="relative pl-0 md:pl-4 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 p-6 rounded-2xl mb-6 group">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
             <div className="flex flex-col items-center gap-1">
                 <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg shadow-md">
                   {idx + 1}
                 </div>
                 <span className="text-[9px] font-bold text-slate-300 uppercase">Q-ID</span>
             </div>

             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Question Type</uiKit.Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {QUESTION_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => handleTypeChange(t.value)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1 ${q.type === t.value ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'}`}
                          title={t.label}
                        >
                          <t.icon size={16} />
                          <span className="text-[8px] font-bold uppercase truncate w-full text-center">{t.label.split('(')[0]}</span>
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Instruction (Visible to Student)</uiKit.Label>
                    <uiKit.Input 
                      value={q.instruction} 
                      onChange={e => onUpdate('instruction', e.target.value)} 
                      className="h-[38px] text-xs font-medium text-slate-600 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                 </div>
             </div>
          </div>
          <uiKit.Button variant="ghost" size="sm" onClick={onRemove} className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl transition-colors"><lucideReact.Trash2 size={18}/></uiKit.Button>
        </div>
        <div className="space-y-5">
            {(q.type === 'matching_headings' || q.type === 'matching_features') && (
              <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 border-dashed space-y-4">
                <div className="flex justify-between items-center">
                    <uiKit.Label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><lucideReact.Layers size={14}/> Draggable Options List</uiKit.Label>
                    <uiKit.Badge className="bg-indigo-100 text-indigo-600 border-none">Student drags these</uiKit.Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {(q.headingList || q.options || [""]).map((h, hIdx) => (
                      <div key={hIdx} className="flex gap-2 items-center group/heading">
                        <span className="text-xs font-black text-indigo-400 w-6 text-right">{q.type === 'matching_headings' ? ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][hIdx] : String.fromCharCode(65 + hIdx)}</span>
                        <uiKit.Input 
                          value={h} 
                          onChange={e => { 
                             const field = q.type === 'matching_headings' ? 'headingList' : 'options';
                             const list = q.type === 'matching_headings' ? (q.headingList || []) : (q.options || []);
                             const newList = [...list]; 
                             newList[hIdx] = e.target.value; 
                             onUpdate(field, newList); 
                          }} 
                          placeholder={`Option text...`} 
                          className="h-9 bg-white text-sm shadow-sm border-indigo-100"
                        />
                         <button onClick={() => { 
                             const field = q.type === 'matching_headings' ? 'headingList' : 'options';
                             const list = q.type === 'matching_headings' ? (q.headingList || []) : (q.options || []);
                             const newList = [...list]; 
                             newList.splice(hIdx, 1); 
                             onUpdate(field, newList); 
                         }} className="h-6 w-6 text-indigo-300 hover:text-red-500 transition-colors"><lucideReact.X size={14}/></button>
                      </div>
                    ))}
                    <uiKit.Button size="sm" variant="ghost" onClick={() => {
                        const field = q.type === 'matching_headings' ? 'headingList' : 'options';
                        const list = q.type === 'matching_headings' ? (q.headingList || []) : (q.options || []);
                        onUpdate(field, [...list, ""]);
                    }} className="w-full text-[10px] text-indigo-500 hover:bg-indigo-100 font-bold border border-dashed border-indigo-300 bg-white">+ ADD OPTION</uiKit.Button>
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-200">
                    <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Question Target (e.g., "Paragraph A")</uiKit.Label>
                    <uiKit.Input placeholder="e.g. Paragraph A" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="font-bold w-full md:w-1/2 bg-white" />
                </div>
              </div>
            )}
            {q.type === 'diagram_labeling' && (
               <div className="flex flex-col md:flex-row gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-full md:w-48 h-48 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group/img">
                      {q.imageUrl ? <img src={q.imageUrl} className="w-full h-full object-contain" alt="Diagram" /> : <div className="text-center text-slate-400"><lucideReact.Image className="mx-auto mb-2 opacity-50"/> <span className="text-[10px] font-bold uppercase">No Image</span></div>}
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <FileUploader iconOnly label="Change" accept="image/*" onUpload={async (f: any) => { const url = await handleFileUpload(f, 'image'); onUpdate('imageUrl', url); }} isLoading={isUploading} />
                      </div>
                  </div>
                  <div className="flex-1 space-y-4">
                      <div>
                        <uiKit.Label className="text-[10px] uppercase font-bold text-slate-400">Diagram Context / Title</uiKit.Label>
                        <uiKit.Input placeholder="e.g. Structure of a leaf" value={q.text} onChange={e => onUpdate('text', e.target.value)} className="bg-white font-bold text-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <uiKit.Label className="text-[10px] uppercase font-bold text-slate-400">Label Coordinates (x,y for each label)</uiKit.Label>
                        <uiKit.Textarea 
                          placeholder="e.g. [{x:10, y:20}, {x:30, y:40}]" 
                          value={JSON.stringify(q.coordinates || [])} 
                          onChange={e => {
                            try {
                              onUpdate('coordinates', JSON.parse(e.target.value));
                            } catch {} // Invalid JSON ni e'tiborsiz qoldir
                          }} 
                          className="min-h-[80px] resize-none text-sm leading-relaxed bg-white border-slate-200 focus:border-blue-400 transition-colors shadow-sm rounded-xl p-3"
                        />
                      </div>
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-700 leading-relaxed">
                          <strong className="block mb-1">CDI Note:</strong> 
                          Coordinates are relative to the image (0-100%). Student inputs will be placed at these positions.
                      </div>
                  </div>
               </div>
            )}
            {!['diagram_labeling', 'matching_headings'].includes(q.type) && (
                <div className="space-y-2">
                   <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Question Text</uiKit.Label>
                   <uiKit.Textarea 
                     placeholder="Enter the question text here..." 
                     value={q.text} 
                     onChange={e => onUpdate('text', e.target.value)} 
                     className="min-h-[60px] resize-none text-sm leading-relaxed bg-white border-slate-200 focus:border-blue-400 transition-colors shadow-sm rounded-xl p-3"
                   />
                </div>
            )}
            {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
               <div className="grid grid-cols-1 gap-3 pl-2 border-l-2 border-slate-100">
                  {(q.options || []).map((opt, oIdx) => {
                    const optionLetter = String.fromCharCode(65 + oIdx);
                    const isSelected = q.type === 'mcq_single' 
                      ? q.answer === optionLetter 
                      : (Array.isArray(q.answer) && q.answer.includes(optionLetter));

                    return (
                      <div key={oIdx} className="flex items-center gap-3 group/opt">
                          <div 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border cursor-pointer transition-all ${isSelected ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-110' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-500'}`} 
                            onClick={() => {
                                if (q.type === 'mcq_single') {
                                  onUpdate('answer', optionLetter);
                                } else {
                                  const currentAnswers = Array.isArray(q.answer) ? [...q.answer] : [];
                                  const index = currentAnswers.indexOf(optionLetter);
                                  if (index > -1) currentAnswers.splice(index, 1);
                                  else currentAnswers.push(optionLetter);
                                  onUpdate('answer', currentAnswers);
                                }
                            }}>
                             {optionLetter}
                          </div>
                          <uiKit.Input value={opt} onChange={e => { const n = [...(q.options || [])]; n[oIdx] = e.target.value; onUpdate('options', n); }} className="h-10 text-sm bg-slate-50 focus:bg-white" placeholder="Option text..." />
                          <button onClick={() => { const n = [...(q.options || [])]; n.splice(oIdx,1); onUpdate('options', n); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"><lucideReact.X size={16}/></button>
                      </div>
                    );
                  })}
                  <uiKit.Button variant="ghost" size="sm" onClick={() => onUpdate('options', [...(q.options||[]), ""])} className="text-xs text-blue-600 hover:bg-blue-50 w-max pl-0 ml-11 font-bold">+ Add Option</uiKit.Button>
               </div>
            )}
            {(q.type === 'sentence_completion' || q.type === 'table_completion' || q.type === 'gap_fill') && (
                <div className="space-y-2">
                   <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Completion Text (with gaps like _____)</uiKit.Label>
                   <uiKit.Textarea 
                     placeholder="Enter the sentence or table text with blanks like _____ for gaps..." 
                     value={q.text} 
                     onChange={e => onUpdate('text', e.target.value)} 
                     className="min-h-[60px] resize-none text-sm leading-relaxed bg-white border-slate-200 focus:border-blue-400 transition-colors shadow-sm rounded-xl p-3"
                   />
                   {q.type === 'table_completion' && (
                     <div className="space-y-2">
                       <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Table Headers (comma separated)</uiKit.Label>
                       <uiKit.Input 
                         placeholder="Header1, Header2, Header3" 
                         value={(q.tableHeaders || []).join(', ')} 
                         onChange={e => onUpdate('tableHeaders', e.target.value.split(', ').filter(Boolean))} 
                         className="h-[38px] text-xs font-medium text-slate-600 bg-slate-50 border-slate-200 focus:bg-white"
                       />
                       <uiKit.Label className="text-[10px] font-bold uppercase text-slate-400">Table Rows (use | for cells, ; for new row)</uiKit.Label>
                       <uiKit.Textarea 
                         placeholder="Row1Cell1 | Row1Cell2; Row2Cell1 | Row2Cell2" 
                         value={(q.tableRows || []).map((row: string[]) => row.join(' | ')).join('; ')} 
                         onChange={e => onUpdate('tableRows', e.target.value.split('; ').map(row => row.split(' | ').filter(Boolean)))} 
                         className="min-h-[100px] resize-none text-sm leading-relaxed bg-white border-slate-200 focus:border-blue-400 transition-colors shadow-sm rounded-xl p-3"
                       />
                     </div>
                   )}
                </div>
            )}
            <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border ${q.answer ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} mt-4`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full ${q.answer ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}><lucideReact.CheckCircle2 size={14}/></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Correct Answer:</span>
                </div>
                {['tfng', 'ynng'].includes(q.type) ? (
                    <div className="flex gap-2">
                        {(q.options || []).map(opt => (
                            <button key={opt} type="button" 
                                onClick={() => onUpdate('answer', opt)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-wide ${q.answer === opt ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                ) : (
                    <uiKit.Input 
                        className="h-8 border-none bg-transparent font-bold text-emerald-900 focus-visible:ring-0 p-0 placeholder:font-normal placeholder:text-slate-400" 
                        placeholder={q.type === 'mcq_single' ? "Select option above" : "Enter correct answer text..."} 
                        value={Array.isArray(q.answer) ? q.answer.join(', ') : q.answer} 
                        onChange={e => onUpdate('answer', e.target.value)} 
                        disabled={q.type?.startsWith('mcq') ?? false}
                    />
                )}
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Exam Meta
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("30");
  const [listeningReviewTime, setListeningReviewTime] = useState("2");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");

  // Content States
  const [audioUrl, setAudioUrl] = useState("");
  const [listeningParts, setListeningParts] = useState<ListeningPart[]>([
    { id: 1, title: "Part 1", questions: [] },
    { id: 2, title: "Part 2", questions: [] },
    { id: 3, title: "Part 3", questions: [] },
    { id: 4, title: "Part 4", questions: [] },
  ]);
  const [passages, setPassages] = useState<Passage[]>([
    { id: 1, title: "Passage 1", content: "", questions: [] },
    { id: 2, title: "Passage 2", content: "", questions: [] },
    { id: 3, title: "Passage 3", content: "", questions: [] },
  ]);
  const [writingTasks, setWritingTasks] = useState<WritingTask[]>([
    { type: "task1", content: "", image: "", wordLimit: "150" }, 
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  // --- QUERIES & MUTATIONS ---
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createExam = useMutation({
    mutationFn: async (examData: any) => {
      const { data, error } = await supabase.from('exams').insert([examData]).select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => alert(err.message || "Error creating exam"),
  });

  const updateExam = useMutation({
    mutationFn: async ({ id, ...examData }: any) => {
      const { data, error } = await supabase.from('exams').update(examData).eq('id', id).select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => alert(err.message || "Error updating exam"),
  });

  const deleteExam = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => alert(err.message || "Error deleting exam"),
  });

  // --- HANDLE FILE UPLOAD ---
  const handleFileUpload = async (file: File, type: 'image' | 'audio'): Promise<string> => {
    const isAudio = type === 'audio';
    const limitMB = isAudio ? 100 : 10;
    if (file.size > limitMB * 1024 * 1024) {
      alert(`File too large! Max: ${limitMB}MB`);
      return "";
    }
    setIsUploading(true);
    try {
      const { data, error } = await supabase.storage.from('ielts-assets').upload(`uploads/${Date.now()}_${file.name}`, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('ielts-assets').getPublicUrl(data.path);
      return publicUrl.publicUrl;
    } catch (e) {
      console.error(e);
      alert("Upload failed. Please try again.");
      return "";
    } finally {
      setIsUploading(false);
    }
  };

  // --- Auto Calculate Total Time ---
  useEffect(() => {
    setTotalTime(+listeningTime + +readingTime + +writingTime);
  }, [listeningTime, readingTime, writingTime]);

  // --- Validation before Submit ---
  const validateExam = () => {
    const errors = [];
    if (!title) errors.push("Exam title is required.");
    if (listeningParts.flatMap(p => p.questions).length === 0) errors.push("Listening section must have questions.");
    if (passages.flatMap(p => p.questions).length === 0) errors.push("Reading section must have questions.");
    if (writingTasks.some(t => !t.content)) errors.push("Writing tasks must have prompts.");
    if (audioUrl === "" && listeningTime !== "0") errors.push("Audio file required for Listening.");
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const resetForm = () => {
    setEditingExamId(null);
    setTitle("");
    setListeningTime("30"); setListeningReviewTime("2"); setReadingTime("60"); setWritingTime("60");
    setAudioUrl("");
    setListeningParts([
      { id: 1, title: "Part 1", questions: [] },
      { id: 2, title: "Part 2", questions: [] },
      { id: 3, title: "Part 3", questions: [] },
      { id: 4, title: "Part 4", questions: [] },
    ]);
    setPassages([
      { id: 1, title: "Passage 1", content: "", questions: [] },
      { id: 2, title: "Passage 2", content: "", questions: [] },
      { id: 3, title: "Passage 3", content: "", questions: [] },
    ]);
    setWritingTasks([
      { type: "task1", content: "", image: "", wordLimit: "150" }, 
      { type: "task2", content: "", wordLimit: "250" }
    ]);
    setValidationErrors([]);
    setIsPreviewMode(false);
  };

  const handleEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    const c = exam.content;
    if (c.listening) {
        setListeningTime(String(c.listening.duration || 30));
        setListeningReviewTime(String(c.listening.reviewTime || 2));
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

  const handleDelete = async (id: number) => {
    if (confirm("Delete this exam?")) await deleteExam.mutateAsync(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateExam()) return;

    const examData = {
      title,
      content: {
        listening: { 
            audioUrl, 
            duration: +listeningTime, 
            reviewTime: +listeningReviewTime, 
            parts: listeningParts.map((part, pIdx) => ({
                ...part,
                id: pIdx + 1,
                questions: part.questions.map((q, qIdx) => ({
                    ...q,
                    globalIdx: calculateGlobalIdx('listening', pIdx, qIdx)
                }))
            }))
        },
        reading: { 
            timeLimit: +readingTime, 
            passages: passages.map((psg, psgIdx) => ({
                ...psg,
                id: psgIdx + 1,
                questions: psg.questions.map((q, qIdx) => ({
                    ...q,
                    globalIdx: calculateGlobalIdx('reading', psgIdx, qIdx)
                }))
            }))
        },
        writing: { 
            timeLimit: +writingTime, 
            tasks: writingTasks 
        }
      },
      timeLimit: totalTime,
      isPublished: true
    };
    try {
      if (editingExamId) await updateExam.mutateAsync({ id: editingExamId, ...examData });
      else await createExam.mutateAsync(examData);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error saving exam");
    }
  };

  const calculateGlobalIdx = (section: 'listening' | 'reading', groupIdx: number, qIdx: number) => {
    let count = 0;
    if (section === 'listening') {
      for (let i = 0; i < groupIdx; i++) {
        count += listeningParts[i].questions.length;
      }
    } else {
      for (let i = 0; i < groupIdx; i++) {
        count += passages[i].questions.length;
      }
    }
    return count + qIdx + 1;
  };

  const addQuestion = (section: 'listening' | 'reading', index: number) => {
    const newQ: Question = { 
      id: Date.now() + Math.random(), 
      type: 'sentence_completion', 
      text: "", 
      options: [], 
      answer: "", 
      instruction: "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer." 
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

  const addPart = (section: 'listening' | 'reading') => {
    if (section === 'listening') {
      setListeningParts([...listeningParts, { id: listeningParts.length + 1, title: `Part ${listeningParts.length + 1}`, questions: [] }]);
    } else {
      setPassages([...passages, { id: passages.length + 1, title: `Passage ${passages.length + 1}`, content: "", questions: [] }]);
    }
  };

  const removePart = (section: 'listening' | 'reading', index: number) => {
    if (section === 'listening') {
      const n = [...listeningParts];
      n.splice(index, 1);
      setListeningParts(n);
    } else {
      const n = [...passages];
      n.splice(index, 1);
      setPassages(n);
    }
  };

  const updatePartTitle = (section: 'listening' | 'reading', index: number, value: string) => {
    if (section === 'listening') {
      const n = [...listeningParts];
      n[index].title = value;
      setListeningParts(n);
    } else {
      const n = [...passages];
      n[index].title = value;
      setPassages(n);
    }
  };

  const handlePreview = () => {
    if (validateExam()) setIsPreviewMode(true);
  };

  const ExamPreview = () => (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-black text-slate-900">{title}</h2>
      <p className="text-slate-500">Total Time: {totalTime} minutes</p>
      {/* Listening Preview */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Listening ({listeningTime} min + {listeningReviewTime} min review)</h3>
        {audioUrl && <AudioPreview url={audioUrl} />}
        {listeningParts.map((part, pIdx) => (
          <div key={pIdx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">{part.title}</h4>
            {part.questions.map((q, qIdx) => (
              <div key={qIdx} className="mt-2">
                <p>{q.text}</p>
                {/* Simple preview of question */}
              </div>
            ))}
          </div>
        ))}
      </section>
      {/* Reading Preview */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Reading ({readingTime} min)</h3>
        {passages.map((psg, pIdx) => (
          <div key={pIdx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">{psg.title}</h4>
            <p className="text-slate-600">{psg.content.substring(0, 200)}...</p>
            {psg.questions.map((q, qIdx) => (
              <div key={qIdx} className="mt-2">
                <p>{q.text}</p>
              </div>
            ))}
          </div>
        ))}
      </section>
      {/* Writing Preview */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Writing ({writingTime} min)</h3>
        {writingTasks.map((task, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">Task {idx + 1} ({task.wordLimit} words min)</h4>
            <p>{task.content}</p>
            {task.image && <img src={task.image} alt="Task Image" className="mt-2 max-w-full" />}
          </div>
        ))}
      </section>
      <uiKit.Button onClick={() => setIsPreviewMode(false)} className="w-full">Close Preview</uiKit.Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-8 md:mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-blue-600 text-white font-black text-xs px-2 py-1 rounded uppercase tracking-widest">Admin Panel</div>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">CDI<span className="text-blue-600">Builder</span>.</h2>
          <p className="text-slate-500 font-medium text-lg mt-1">Create 100% real Computer-Delivered IELTS Mock Tests.</p>
        </div>
        <uiKit.Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-slate-900 hover:bg-blue-600 text-white rounded-2xl px-8 h-14 font-bold shadow-xl shadow-slate-200 hover:shadow-blue-200 transition-all flex items-center gap-3">
          <lucideReact.Plus size={20} strokeWidth={3} /> New Exam
        </uiKit.Button>
      </div>
      <uiKit.Card className="border-none shadow-xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <div className="p-0">
          {isLoading ? (
             <div className="p-32 flex flex-col items-center justify-center text-slate-300 gap-4">
                 <lucideReact.Loader2 className="animate-spin" size={48}/>
                 <p className="font-bold text-xs tracking-widest uppercase">Fetching Exams...</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="p-6 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Title</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Configuration</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody>
                {exams?.map((exam: any) => (
                  <tr key={exam.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                    <td className="p-6 pl-8">
                        <span className="font-bold text-slate-800 text-lg block">{exam.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ID: {exam.id} • Created: {new Date(exam.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="p-6">
                        <div className="flex gap-2">
                            <uiKit.Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600 font-bold">{exam.timeLimit} min Total</uiKit.Badge>
                            {exam.content?.listening?.audioUrl ? <uiKit.Badge variant="secondary" className="bg-blue-50 text-blue-600 border border-blue-100"><lucideReact.Headset size={10} className="mr-1"/> Audio Ready</uiKit.Badge> : <uiKit.Badge variant="outline" className="text-red-400 border-red-100 bg-red-50">No Audio</uiKit.Badge>}
                        </div>
                    </td>
                    <td className="p-6">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"/>
                            <span className="text-xs font-bold text-emerald-700 uppercase">{exam.isPublished ? "Published" : "Draft"}</span>
                        </div>
                    </td>
                    <td className="p-6 text-right">
                        <uiKit.Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-6" onClick={() => handleEdit(exam)}>Edit</uiKit.Button>
                        <uiKit.Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-6" onClick={() => handleDelete(exam.id)}>Delete</uiKit.Button>
                    </td>
                  </tr>
                ))}
                {(!exams || exams.length === 0) && (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic">No exams found. Create your first CDI exam!</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </uiKit.Card>
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleSubmit} className="px-8 pb-24 pt-8 max-w-7xl mx-auto min-h-full">
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl mb-6">
                <ul className="list-disc pl-5 text-red-600">
                  {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-12 gap-6 items-start mb-8">
               <div className="col-span-12 lg:col-span-7 space-y-4">
                  <uiKit.Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Assessment Name</uiKit.Label>
                  <uiKit.Input 
                    placeholder="e.g. Cambridge IELTS 19 - Test 1 (CDI Version)" 
                    value={title} onChange={e => setTitle(e.target.value)} required 
                    className="h-16 text-2xl font-black border-2 border-slate-200 focus:border-blue-600 rounded-2xl px-6 shadow-sm bg-white focus:bg-blue-50/20 transition-all placeholder:text-slate-300" 
                  />
               </div>
               <div className="col-span-12 lg:col-span-5 bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-300">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                      <lucideReact.Clock size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">CDI Timer Configuration (Mins)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white/10 rounded-xl p-3 flex flex-col items-center">
                          <span className="text-[9px] font-bold uppercase text-blue-300 mb-1">Audio</span>
                          <input type="number" min="0" className="bg-transparent border-none text-center text-lg font-black p-0 w-full focus:ring-0 text-white" value={listeningTime} onChange={(e) => setListeningTime(e.target.value)} />
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 flex flex-col items-center border border-dashed border-white/20">
                          <span className="text-[9px] font-bold uppercase text-amber-300 mb-1">Review</span>
                          <input type="number" min="0" className="bg-transparent border-none text-center text-lg font-black p-0 w-full focus:ring-0 text-white" value={listeningReviewTime} onChange={(e) => setListeningReviewTime(e.target.value)} />
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 flex flex-col items-center">
                          <span className="text-[9px] font-bold uppercase text-emerald-300 mb-1">Reading</span>
                          <input type="number" min="0" className="bg-transparent border-none text-center text-lg font-black p-0 w-full focus:ring-0 text-white" value={readingTime} onChange={(e) => setReadingTime(e.target.value)} />
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 flex flex-col items-center">
                          <span className="text-[9px] font-bold uppercase text-purple-300 mb-1">Writing</span>
                          <input type="number" min="0" className="bg-transparent border-none text-center text-lg font-black p-0 w-full focus:ring-0 text-white" value={writingTime} onChange={(e) => setWritingTime(e.target.value)} />
                      </div>
                  </div>
               </div>
            </div>

            {isPreviewMode ? (
              <ExamPreview />
            ) : (
              <uiKit.Tabs defaultValue="listening" className="w-full">
                <uiKit.TabsList className="w-full justify-start gap-4 bg-transparent p-0 mb-8 border-b border-slate-200">
                    {[
                        {val:'listening', icon: lucideReact.Headset, label: 'Listening'},
                        {val:'reading', icon: lucideReact.BookOpen, label: 'Reading'},
                        {val:'writing', icon: lucideReact.PenTool, label: 'Writing'}
                    ].map(tab => (
                        <uiKit.TabsTrigger key={tab.val} value={tab.val} className="px-6 py-3 rounded-t-xl border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 text-slate-400 font-bold text-base gap-2 transition-all">
                            <tab.icon size={18} strokeWidth={3}/> {tab.label}
                        </uiKit.TabsTrigger>
                    ))}
                </uiKit.TabsList>
                <uiKit.TabsContent value="listening" className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                    <uiKit.Card className="p-8 border-blue-100 bg-blue-50/40 rounded-[2rem]">
                        <div className="flex flex-col xl:flex-row gap-8 items-start">
                            <div className="flex-1 w-full space-y-3">
                                <uiKit.Label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><lucideReact.Headset size={14}/> Master Audio File</uiKit.Label>
                                <p className="text-xs text-slate-500 mb-2">Upload the single MP3 file containing audio for all 4 parts (approx 30-40 min).</p>
                                <div className="flex gap-3 h-14">
                                    <div className="flex-1 relative">
                                        <uiKit.Input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://..." className="pl-4 bg-white border-blue-200 h-full rounded-xl text-blue-600 font-medium" />
                                    </div>
                                    <div className="w-32">
                                        <FileUploader iconOnly={false} label="Upload MP3" accept="audio/*" onUpload={async (f: any) => { const url = await handleFileUpload(f, 'audio'); setAudioUrl(url); }} isLoading={isUploading} />
                                    </div>
                                </div>
                            </div>
                            <div className="w-full xl:w-1/3">
                                <AudioPreview url={audioUrl} />
                            </div>
                        </div>
                    </uiKit.Card>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {listeningParts.map((part, pIdx) => (
                            <div key={part.id} className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-[2rem] overflow-hidden h-[800px]">
                                <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                                    <uiKit.Input 
                                      value={part.title || ""} 
                                      onChange={e => updatePartTitle('listening', pIdx, e.target.value)} 
                                      placeholder="Part Title" 
                                      className="font-bold text-lg bg-transparent border-none focus:ring-0"
                                    />
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400">{part.questions.length} Questions</span>
                                        <uiKit.Button size="sm" onClick={() => addQuestion('listening', pIdx)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs px-4 h-9 shadow-blue-200 shadow-lg">
                                            <lucideReact.Plus size={16} className="mr-1"/> Add Question
                                        </uiKit.Button>
                                        {listeningParts.length > 1 && (
                                          <uiKit.Button variant="ghost" onClick={() => removePart('listening', pIdx)} className="text-red-500"><lucideReact.Trash2 size={16}/></uiKit.Button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                    {part.questions.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center"><lucideReact.Headset size={32} className="opacity-20"/></div>
                                            <p className="text-xs font-bold uppercase">No Questions Yet</p>
                                        </div>
                                    ) : part.questions.map((q, qIdx) => (
                                        <QuestionEditor 
                                            key={q.id} q={q} idx={calculateGlobalIdx('listening', pIdx, qIdx) - 1} isUploading={isUploading} handleFileUpload={handleFileUpload}
                                            onUpdate={(k, v) => updateQuestion('listening', pIdx, qIdx, k, v)}
                                            onRemove={() => removeQuestion('listening', pIdx, qIdx)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <uiKit.Button onClick={() => addPart('listening')} variant="outline" className="w-full h-16 border-dashed border-2 border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400">
                          <lucideReact.Plus size={20} /> Add Listening Part
                        </uiKit.Button>
                    </div>
                </uiKit.TabsContent>
                <uiKit.TabsContent value="reading" className="space-y-12 animate-in slide-in-from-bottom-2 duration-300">
                    {passages.map((psg, pIdx) => (
                        <div key={psg.id} className="bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                             <div className="bg-slate-900 text-white p-5 px-8 flex justify-between items-center">
                                 <div className="flex items-center gap-6">
                                     <span className="font-black text-3xl tracking-tighter text-slate-700 select-none">0{pIdx + 1}</span>
                                     <div className="h-8 w-[1px] bg-white/10"/>
                                     <uiKit.Input 
                                        value={psg.title} onChange={e => updatePartTitle('reading', pIdx, e.target.value)}
                                        className="bg-transparent border-none text-white font-bold text-lg placeholder:text-slate-600 focus:ring-0 w-[400px] p-0"
                                        placeholder="Enter Passage Title..."
                                     />
                                 </div>
                                 {passages.length > 1 && (
                                   <uiKit.Button variant="ghost" onClick={() => removePart('reading', pIdx)} className="text-slate-500 hover:text-red-400 hover:bg-white/5"><lucideReact.Trash2 size={20}/></uiKit.Button>
                                 )}
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-2 h-[850px]">
                                 <div className="h-full p-8 border-r border-slate-100 bg-slate-50 flex flex-col">
                                     <uiKit.Label className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><lucideReact.AlignLeft size={14}/> Passage Text / HTML</uiKit.Label>
                                     <uiKit.Textarea 
                                        className="flex-1 bg-white border-slate-200 focus:border-blue-400 rounded-2xl p-6 text-base font-serif leading-7 resize-none shadow-sm"
                                        placeholder="Paste the reading passage content here. HTML is supported for formatting."
                                        value={psg.content}
                                        onChange={e => { const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n); }}
                                     />
                                 </div>
                                 <div className="h-full flex flex-col bg-white overflow-hidden relative">
                                     <div className="p-4 px-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                                         <h4 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><lucideReact.List size={16} className="text-blue-500"/> Questions</h4>
                                         <uiKit.Button size="sm" onClick={() => addQuestion('reading', pIdx)} className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200 border-none">
Add Question
                                         </uiKit.Button>
                                     </div>
                                     <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
                                         {psg.questions.map((q, qIdx) => (
                                             <QuestionEditor 
                                                 key={q.id} q={q} idx={calculateGlobalIdx('reading', pIdx, qIdx) - 1} isUploading={isUploading} handleFileUpload={handleFileUpload}
                                                 onUpdate={(k, v) => updateQuestion('reading', pIdx, qIdx, k, v)}
                                                 onRemove={() => removeQuestion('reading', pIdx, qIdx)}
                                             />
                                         ))}
                                         <div className="h-24 flex items-center justify-center text-slate-300 text-xs font-medium uppercase tracking-widest border-t border-dashed border-slate-200 mt-8">
                                            End of Questions for Passage {pIdx + 1}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    ))}
                    <uiKit.Button onClick={() => addPart('reading')} variant="outline" className="w-full h-20 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-black text-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all gap-3">
                        <lucideReact.Plus size={24} strokeWidth={3} /> ADD NEW READING PASSAGE
                    </uiKit.Button>
                </uiKit.TabsContent>
                <uiKit.TabsContent value="writing" className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in slide-in-from-bottom-2 duration-300">
                    {writingTasks.map((task, idx) => (
                        <div key={idx} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 flex flex-col relative overflow-hidden group hover:border-blue-200 transition-colors">
                            <div className={`absolute top-0 left-0 w-full h-2 ${idx === 0 ? 'bg-amber-400' : 'bg-purple-400'}`