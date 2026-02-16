import { useState, useEffect, FormEvent } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as lucideReact from "lucide-react";
import { supabase } from "@/lib/supabase";          // singleton client
import { AICreatorCard } from "@/components/AICreatorCard";

// ---------- TYPES ----------
type QuestionType =
  | 'mcq_single' | 'mcq_multi' | 'sentence_completion' | 'table_completion'
  | 'tfng' | 'ynng' | 'matching_headings' | 'matching_features'
  | 'diagram_labeling' | 'short_answer' | 'gap_fill';

interface Question {
  id: number | string;
  type: QuestionType;
  text: string;
  options?: string[];
  answer: string | string[];
  instruction: string;
  imageUrl?: string;
  coordinates?: { x: number; y: number }[];
  headingList?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
}

interface ListeningPart {
  id: number;
  title: string;
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

const QUESTION_TYPES: { value: QuestionType; label: string; icon: any }[] = [
  { value: 'mcq_single', label: 'Multiple Choice (Single)', icon: lucideReact.CheckCircle2 },
  { value: 'mcq_multi', label: 'Multiple Choice (Multi)', icon: lucideReact.CheckSquare },
  { value: 'sentence_completion', label: 'Sentence Completion', icon: lucideReact.Type },
  { value: 'table_completion', label: 'Table Completion', icon: lucideReact.Table },
  { value: 'tfng', label: 'True / False / Not Given', icon: lucideReact.AlertCircle },
  { value: 'ynng', label: 'Yes / No / Not Given', icon: lucideReact.AlertCircle },
  { value: 'matching_headings', label: 'Matching Headings', icon: lucideReact.List },
  { value: 'matching_features', label: 'Matching Features', icon: lucideReact.Layers },
  { value: 'diagram_labeling', label: 'Map / Diagram Labeling', icon: lucideReact.Image },
  { value: 'short_answer', label: 'Short Answer Question', icon: lucideReact.MoreHorizontal },
  { value: 'gap_fill', label: 'Gap Fill', icon: lucideReact.Edit3 },
];

// ---------- MODAL ----------
const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col relative animate-in zoom-in-95 duration-300 border border-slate-200">
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-20 rounded-t-[2rem]">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
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

// ---------- FILE UPLOADER ----------
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
        {isLoading ? <lucideReact.Loader2 className="animate-spin text-blue-600" size={20} /> : <lucideReact.Upload size={20} />}
        {!iconOnly && <span className="text-xs font-black uppercase tracking-wide">{label}</span>}
      </div>
    </div>
  );
};

// ---------- AUDIO PREVIEW ----------
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

// ---------- QUESTION EDITOR ----------
const QuestionEditor = ({ q, idx, onUpdate, onRemove, isUploading, handleFileUpload }: {
  q: Question;
  idx: number;
  onUpdate: <K extends keyof Question>(field: K, value: Question[K]) => void;
  onRemove: () => void;
  isUploading: boolean;
  handleFileUpload: any;
}) => {
  const handleTypeChange = (newType: QuestionType) => {
    let defaultInstruction = q.instruction;
    let defaultOptions: string[] | undefined;
    switch (newType) {
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
    if (defaultOptions) onUpdate('options', defaultOptions);
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
        <uiKit.Button variant="ghost" size="sm" onClick={onRemove} className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl transition-colors"><lucideReact.Trash2 size={18} /></uiKit.Button>
      </div>

      <div className="space-y-5">
        {/* Matching headings / features */}
        {(q.type === 'matching_headings' || q.type === 'matching_features') && (
          <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 border-dashed space-y-4">
            <div className="flex justify-between items-center">
              <uiKit.Label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><lucideReact.Layers size={14} /> Draggable Options List</uiKit.Label>
              <uiKit.Badge className="bg-indigo-100 text-indigo-600 border-none">Student drags these</uiKit.Badge>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(q.type === 'matching_headings' ? (q.headingList || []) : (q.options || [])).map((h, hIdx) => (
                <div key={hIdx} className="flex gap-2 items-center group/heading">
                  <span className="text-xs font-black text-indigo-400 w-6 text-right">
                    {q.type === 'matching_headings' ? ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][hIdx] : String.fromCharCode(65 + hIdx)}
                  </span>
                  <uiKit.Input
                    value={h}
                    onChange={e => {
                      const field = q.type === 'matching_headings' ? 'headingList' : 'options';
                      const list = q.type === 'matching_headings' ? (q.headingList || []) : (q.options || []);
                      const newList = [...list];
                      newList[hIdx] = e.target.value;
                      onUpdate(field, newList);
                    }}
                    placeholder="Option text..."
                    className="h-9 bg-white text-sm shadow-sm border-indigo-100"
                  />
                  <button onClick={() => {
                    const field = q.type === 'matching_headings' ? 'headingList' : 'options';
                    const list = q.type === 'matching_headings' ? (q.headingList || []) : (q.options || []);
                    const newList = [...list];
                    newList.splice(hIdx, 1);
                    onUpdate(field, newList);
                  }} className="h-6 w-6 text-indigo-300 hover:text-red-500 transition-colors"><lucideReact.X size={14} /></button>
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

        {/* Diagram labeling */}
        {q.type === 'diagram_labeling' && (
          <div className="flex flex-col md:flex-row gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-full md:w-48 h-48 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group/img">
              {q.imageUrl ? <img src={q.imageUrl} className="w-full h-full object-contain" alt="Diagram" /> : <div className="text-center text-slate-400"><lucideReact.Image className="mx-auto mb-2 opacity-50" /> <span className="text-[10px] font-bold uppercase">No Image</span></div>}
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
                    } catch { }
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

        {/* Regular question text (for most types) */}
        {!['diagram_labeling', 'matching_headings', 'matching_features'].includes(q.type) && (
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

        {/* MCQ options */}
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
                  <button onClick={() => { const n = [...(q.options || [])]; n.splice(oIdx, 1); onUpdate('options', n); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"><lucideReact.X size={16} /></button>
                </div>
              );
            })}
            <uiKit.Button variant="ghost" size="sm" onClick={() => onUpdate('options', [...(q.options || []), ""])} className="text-xs text-blue-600 hover:bg-blue-50 w-max pl-0 ml-11 font-bold">+ Add Option</uiKit.Button>
          </div>
        )}

        {/* Completion / gap fill */}
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

        {/* Correct answer */}
        <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border ${q.answer ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} mt-4`}>
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full ${q.answer ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}><lucideReact.CheckCircle2 size={14} /></div>
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

// ---------- MAIN COMPONENT ----------
export default function AdminExams() {
  const queryClient = useQueryClient();

  // --- STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'json'>('manual');
  const [importJson, setImportJson] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Exam fields
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("30");
  const [listeningReviewTime, setListeningReviewTime] = useState("2");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
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
  const { data: exams, isLoading: examsLoading } = useQuery({
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
  });

  const deleteExam = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  const saveFromJson = useMutation({
    mutationFn: async () => {
      let jsonContent;
      try {
        jsonContent = JSON.parse(importJson);
      } catch {
        throw new Error("Invalid JSON format");
      }
      const examData = {
        title,
        content: jsonContent,
        timeLimit: jsonContent.listening?.duration + jsonContent.reading?.timeLimit + jsonContent.writing?.timeLimit || 150,
        isPublished: true,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('exams').insert([examData]).select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setIsModalOpen(false);
      setImportJson("");
    },
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

  // Auto calculate total time
  useEffect(() => {
    setTotalTime(+listeningTime + +readingTime + +writingTime);
  }, [listeningTime, readingTime, writingTime]);

  // Validation
  const validateExam = () => {
    const errors = [];
    if (!title) errors.push("Exam title is required.");
    if (listeningParts.flatMap(p => p.questions).length === 0) errors.push("Listening section must have at least one question.");
    if (passages.flatMap(p => p.questions).length === 0) errors.push("Reading section must have at least one question.");
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
    setActiveTab('manual');
    setImportJson("");
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

  const calculateGlobalIdx = (section: 'listening' | 'reading', groupIdx: number, qIdx: number) => {
    let count = 0;
    if (section === 'listening') {
      for (let i = 0; i < groupIdx; i++) count += listeningParts[i].questions.length;
    } else {
      for (let i = 0; i < groupIdx; i++) count += passages[i].questions.length;
    }
    return count + qIdx + 1;
  };

  // Question management helpers
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

  // Preview component
  const ExamPreview = () => (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-black text-slate-900">{title}</h2>
      <p className="text-slate-500">Total Time: {totalTime} minutes</p>
      {/* Listening */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Listening ({listeningTime} min + {listeningReviewTime} min review)</h3>
        {audioUrl && <AudioPreview url={audioUrl} />}
        {listeningParts.map((part, pIdx) => (
          <div key={pIdx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">{part.title}</h4>
            {part.questions.map((q, qIdx) => (
              <div key={qIdx} className="mt-2 text-sm">{q.text}</div>
            ))}
          </div>
        ))}
      </section>
      {/* Reading */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Reading ({readingTime} min)</h3>
        {passages.map((psg, pIdx) => (
          <div key={pIdx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">{psg.title}</h4>
            <p className="text-slate-600 text-sm">{psg.content.substring(0, 200)}...</p>
            {psg.questions.map((q, qIdx) => (
              <div key={qIdx} className="mt-2 text-sm">{q.text}</div>
            ))}
          </div>
        ))}
      </section>
      {/* Writing */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold">Writing ({writingTime} min)</h3>
        {writingTasks.map((task, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-bold">Task {idx + 1} ({task.wordLimit} words min)</h4>
            <p className="text-sm">{task.content}</p>
            {task.image && <img src={task.image} alt="Task Image" className="mt-2 max-w-full" />}
          </div>
        ))}
      </section>
      <uiKit.Button onClick={() => setIsPreviewMode(false)} className="w-full">Close Preview</uiKit.Button>
    </div>
  );

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        throw new Error("Function not implemented.");
    }

  // --- RENDER ---
  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Exam Management</h1>
            <p className="text-slate-500 font-medium">Create, edit and manage IELTS computer-delivered exams.</p>
          </div>
          <uiKit.Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl shadow-slate-200 flex gap-3 items-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <lucideReact.Plus size={20} />
            CREATE NEW EXAM
          </uiKit.Button>
        </header>

        {/* Exams list with loading indicator */}
        {examsLoading ? (
          <div className="flex justify-center py-12">
            <lucideReact.Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams?.map((exam: any) => (
              <uiKit.Card key={exam.id} className="p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-lg mb-2 truncate">{exam.title}</h3>
                <p className="text-slate-500 text-sm mb-4">ID: {exam.id}</p>
                <div className="flex gap-2">
                  <uiKit.Button variant="ghost" size="sm" onClick={() => handleEdit(exam)} className="flex-1 text-blue-600">
                    Edit
                  </uiKit.Button>
                  <uiKit.Button variant="ghost" size="sm" onClick={() => deleteExam.mutate(exam.id)} disabled={deleteExam.isPending} className="flex-1 text-red-500">
                    Delete
                  </uiKit.Button>
                </div>
              </uiKit.Card>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
          {isPreviewMode ? (
            <ExamPreview />
          ) : (
            <form onSubmit={handleSubmit} className="p-8 max-w-5xl mx-auto space-y-8">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-slate-900 mb-2">{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h2>
                <p className="text-slate-400 font-medium">Configure your exam content and settings below.</p>
              </div>

              {/* Tab navigation */}
              <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm mb-8 flex gap-2">
                <button type="button" onClick={() => setActiveTab('manual')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                  Manual
                </button>
                <button type="button" onClick={() => setActiveTab('ai')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                  AI Generate (PDF)
                </button>
                <button type="button" onClick={() => setActiveTab('json')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'json' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                  JSON Import
                </button>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <uiKit.Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Exam Title</uiKit.Label>
                <uiKit.Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. IELTS Academic Practice Test #12" className="h-14 px-6 rounded-2xl border-slate-200 text-lg font-bold focus:border-blue-500 transition-all bg-white" />
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 font-bold text-sm mb-2">Please fix the following errors:</p>
                  <ul className="list-disc pl-5 text-red-500 text-xs space-y-1">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Tab content */}
              {activeTab === 'json' && (
                <div className="space-y-4">
                  <uiKit.Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">JSON Content</uiKit.Label>
                  <uiKit.Textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='{ "listening": { ... }, "reading": { ... } }' className="min-h-[400px] font-mono text-sm p-6 rounded-2xl border-slate-200" />
                  <uiKit.Button type="button" onClick={() => saveFromJson.mutate()} disabled={saveFromJson.isPending || !title || !importJson} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                    {saveFromJson.isPending ? 'Saving...' : 'SAVE FROM JSON'}
                  </uiKit.Button>
                </div>
              )}

              {activeTab === 'ai' && (
                <AICreatorCard />
              )}

              {activeTab === 'manual' && (
                <div className="space-y-8">
                  {/* Time settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Listening (min)</uiKit.Label>
                      <uiKit.Input type="number" value={listeningTime} onChange={e => setListeningTime(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Listening Review (min)</uiKit.Label>
                      <uiKit.Input type="number" value={listeningReviewTime} onChange={e => setListeningReviewTime(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Reading (min)</uiKit.Label>
                      <uiKit.Input type="number" value={readingTime} onChange={e => setReadingTime(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Writing (min)</uiKit.Label>
                      <uiKit.Input type="number" value={writingTime} onChange={e => setWritingTime(e.target.value)} className="mt-1" />
                    </div>
                  </div>

                  {/* Audio upload */}
                  <div className="space-y-2">
                    <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Master Audio File (MP3)</uiKit.Label>
                    <div className="flex items-center gap-4">
                      <FileUploader accept="audio/mpeg" onUpload={async (f: File) => { const url = await handleFileUpload(f, 'audio'); setAudioUrl(url); }} isLoading={isUploading} label="Upload Audio" />
                      {audioUrl && <span className="text-sm text-emerald-600 font-medium truncate flex-1">{audioUrl.split('/').pop()}</span>}
                    </div>
                  </div>

                  {/* Listening Parts */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800">Listening Sections</h3>
                      <uiKit.Button type="button" variant="outline" size="sm" onClick={() => addPart('listening')} className="text-xs">
                        + Add Part
                      </uiKit.Button>
                    </div>
                    {listeningParts.map((part, pIdx) => (
                      <div key={part.id} className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
                        <div className="flex items-center gap-4">
                          <uiKit.Input value={part.title} onChange={e => updatePartTitle('listening', pIdx, e.target.value)} className="font-bold text-lg w-64" />
                          <uiKit.Button type="button" variant="ghost" size="sm" onClick={() => removePart('listening', pIdx)} className="text-red-400 hover:text-red-600">
                            <lucideReact.Trash2 size={18} />
                          </uiKit.Button>
                        </div>
                        {part.questions.map((q, qIdx) => (
                          <QuestionEditor
                            key={q.id}
                            q={q}
                            idx={calculateGlobalIdx('listening', pIdx, qIdx) - 1}
                            onUpdate={(field, value) => updateQuestion('listening', pIdx, qIdx, field, value)}
                            onRemove={() => removeQuestion('listening', pIdx, qIdx)}
                            isUploading={isUploading}
                            handleFileUpload={handleFileUpload}
                          />
                        ))}
                        <uiKit.Button type="button" variant="ghost" onClick={() => addQuestion('listening', pIdx)} className="text-blue-600 text-sm">
                          + Add Question
                        </uiKit.Button>
                      </div>
                    ))}
                  </div>

                  {/* Reading Passages */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800">Reading Passages</h3>
                      <uiKit.Button type="button" variant="outline" size="sm" onClick={() => addPart('reading')} className="text-xs">
                        + Add Passage
                      </uiKit.Button>
                    </div>
                    {passages.map((psg, pIdx) => (
                      <div key={psg.id} className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
                        <div className="flex items-center gap-4">
                          <uiKit.Input value={psg.title} onChange={e => updatePartTitle('reading', pIdx, e.target.value)} className="font-bold text-lg w-64" />
                          <uiKit.Button type="button" variant="ghost" size="sm" onClick={() => removePart('reading', pIdx)} className="text-red-400 hover:text-red-600">
                            <lucideReact.Trash2 size={18} />
                          </uiKit.Button>
                        </div>
                        <div>
                          <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Passage Content</uiKit.Label>
                          <uiKit.Textarea value={psg.content} onChange={e => { const n = [...passages]; n[pIdx].content = e.target.value; setPassages(n); }} rows={6} className="mt-1" placeholder="Paste the reading passage here..." />
                        </div>
                        {psg.questions.map((q, qIdx) => (
                          <QuestionEditor
                            key={q.id}
                            q={q}
                            idx={calculateGlobalIdx('reading', pIdx, qIdx) - 1}
                            onUpdate={(field, value) => updateQuestion('reading', pIdx, qIdx, field, value)}
                            onRemove={() => removeQuestion('reading', pIdx, qIdx)}
                            isUploading={isUploading}
                            handleFileUpload={handleFileUpload}
                          />
                        ))}
                        <uiKit.Button type="button" variant="ghost" onClick={() => addQuestion('reading', pIdx)} className="text-blue-600 text-sm">
                          + Add Question
                        </uiKit.Button>
                      </div>
                    ))}
                  </div>

                  {/* Writing Tasks */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800">Writing Tasks</h3>
                    {writingTasks.map((task, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
                        <h4 className="font-bold">Task {idx + 1} (min {task.wordLimit} words)</h4>
                        <div>
                          <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Prompt</uiKit.Label>
                          <uiKit.Textarea value={task.content} onChange={e => { const n = [...writingTasks]; n[idx].content = e.target.value; setWritingTasks(n); }} rows={4} className="mt-1" placeholder="Enter writing task prompt..." />
                        </div>
                        {idx === 0 && (
                          <div>
                            <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Image/Chart URL (optional)</uiKit.Label>
                            <uiKit.Input value={task.image || ''} onChange={e => { const n = [...writingTasks]; n[idx].image = e.target.value; setWritingTasks(n); }} placeholder="https://..." className="mt-1" />
                          </div>
                        )}
                        <div>
                          <uiKit.Label className="text-xs font-bold uppercase text-slate-400">Word Limit</uiKit.Label>
                          <uiKit.Input value={task.wordLimit} onChange={e => { const n = [...writingTasks]; n[idx].wordLimit = e.target.value; setWritingTasks(n); }} className="mt-1 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 pt-6">
                    <uiKit.Button type="button" onClick={handlePreview} className="flex-1 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold">
                      Preview
                    </uiKit.Button>
                    <uiKit.Button type="submit" className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg">
                      {editingExamId ? 'UPDATE EXAM' : 'SAVE EXAM'}
                    </uiKit.Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}