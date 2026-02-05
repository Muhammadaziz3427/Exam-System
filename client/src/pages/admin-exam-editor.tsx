import { useState } from "react";
// 1. Ishlatilmagan useLocation va Link olib tashlandi
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
import { useExams, useCreateExam, useUpdateExam, useDeleteExam } from "@/hooks/use-exams";
import { 
  Plus, 
  Loader2, 
  BookOpen, 
  Headset, 
  PenTool, 
  Trash2, 
  Layers,
  // 2. CheckCircle2 olib tashlandi
  Pencil,
  Clock,
  Settings2,
  Image as ImageIcon
} from "lucide-react";

// --- TYPES & INTERFACES ---
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

// --- MODAL COMPONENT ---
// Implicit any xatosi ModalProps orqali tuzatildi
const Modal = ({ open, onOpenChange, children }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-8 p-8 relative min-h-[80vh]">
        <button 
          onClick={() => onOpenChange(false)} 
          className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors text-2xl"
        >
          ✕
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
  const deleteExam = useDeleteExam();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  // --- FORM STATE ---
  const [title, setTitle] = useState("");
  const [listeningTime, setListeningTime] = useState("40");
  const [readingTime, setReadingTime] = useState("60");
  const [writingTime, setWritingTime] = useState("60");
  const [listeningReviewTime, setListeningReviewTime] = useState("5");
  const [audioUrl, setAudioUrl] = useState("");
  const [passages, setPassages] = useState([{ id: Date.now(), title: "Passage 1", content: "", questions: [] as any[] }]);
  const [listeningQuestions, setListeningQuestions] = useState([] as any[]);
  const [writingTasks, setWritingTasks] = useState([
    { type: "task1", content: "", image: "", wordLimit: "150" },
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  const openEditModal = (exam: any) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setAudioUrl(exam.content.listening.audioUrl || "");
    setListeningTime(exam.content.listening.duration.toString());
    setListeningReviewTime(exam.content.listening.reviewTime?.toString() || "5");
    setReadingTime(exam.content.reading.timeLimit.toString());
    setWritingTime(exam.content.writing.timeLimit.toString());
    setPassages(exam.content.reading.passages);
    setListeningQuestions(exam.content.listening.questions);
    setWritingTasks(exam.content.writing.tasks);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setTitle("");
    setListeningTime("40");
    setReadingTime("60");
    setWritingTime("60");
    setListeningReviewTime("5");
    setAudioUrl("");
    setPassages([{ id: Date.now(), title: "Passage 1", content: "", questions: [] as any[] }]);
    setListeningQuestions([]);
    setWritingTasks([
      { type: "task1", content: "", image: "", wordLimit: "150" },
      { type: "task2", content: "", wordLimit: "250" }
    ]);
  };

  const addPassage = () => {
    setPassages([...passages, { id: Date.now(), title: `Passage ${passages.length + 1}`, content: "", questions: [] }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = {
      listening: { audioUrl, duration: parseInt(listeningTime), reviewTime: parseInt(listeningReviewTime), questions: listeningQuestions },
      reading: { timeLimit: parseInt(readingTime), passages },
      writing: { timeLimit: parseInt(writingTime), tasks: writingTasks }
    };

    const examData = { 
      title, 
      timeLimit: parseInt(listeningTime) + parseInt(readingTime) + parseInt(writingTime), 
      content: finalContent, 
      isPublished: true 
    };

    if (editingExam) {
      await updateExam.mutateAsync({ id: editingExam.id, ...examData });
    } else {
      await createExam.mutateAsync(examData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3">Admin Panel</Badge>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Exam <span className="text-blue-600">Studio</span></h2>
          <p className="text-slate-500 font-medium mt-2">Create and refine high-quality IELTS assessments.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
          <Plus className="mr-2" size={20} /> New Exam
        </Button>
      </div>

      {/* EXAM LIST TABLE */}
      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-wider text-sm">
            <Layers size={20} className="text-blue-600"/> 
            Live Assessment Library
          </h3>
          <Badge variant="outline" className="rounded-full px-4 py-1">{exams?.length || 0} Exams Total</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                <th className="p-6">Exam Identity</th>
                <th className="p-6 text-center">Timing Info</th>
                <th className="p-6 text-right">Control</th>
              </tr>
            </thead>
            <tbody>
              {exams?.map((exam: any) => (
                <tr key={exam.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="font-black text-slate-700 text-lg">{exam.title}</div>
                    <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Published ID: #{exam.id}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <Badge className="bg-slate-100 text-slate-600 border-none font-bold px-3 py-1">
                      <Clock size={12} className="mr-2"/> {exam.timeLimit} Minutes
                    </Badge>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-slate-200 font-bold hover:bg-white hover:text-blue-600"
                        onClick={() => openEditModal(exam)}
                      >
                        <Pencil size={14} className="mr-2"/> Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm("Confirm deletion of this exam? This cannot be undone.")) {
                            deleteExam.mutate(exam.id);
                          }
                        }}
                      >
                        <Trash2 size={16}/>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MAIN EDIT/CREATE MODAL */}
      {/* 3. onOpenChange callback parametriga boolean turi berildi */}
      <Modal open={isModalOpen} onOpenChange={(open: boolean) => { setIsModalOpen(open); if(!open) resetForm(); }}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <header className="flex justify-between items-center bg-slate-900 -m-8 mb-8 p-8 rounded-t-[1.5rem] text-white">
            <div>
              <h3 className="text-2xl font-black">{editingExam ? "Refine Assessment" : "Architect New Exam"}</h3>
              <p className="text-slate-400 text-sm font-medium">Fill in the details below to deploy your test.</p>
            </div>
            <Badge className="bg-blue-600 text-white border-none px-4 py-2 rounded-xl text-sm font-black italic">
              {editingExam ? "SYNCING LIVE" : "READY TO PUBLISH"}
            </Badge>
          </header>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1.5 rounded-2xl mb-8">
              <TabsTrigger value="settings" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <Settings2 size={16} className="mr-2"/> Core Settings
              </TabsTrigger>
              <TabsTrigger value="listening" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <Headset size={16} className="mr-2"/> Listening
              </TabsTrigger>
              <TabsTrigger value="reading" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <BookOpen size={16} className="mr-2"/> Reading
              </TabsTrigger>
              <TabsTrigger value="writing" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <PenTool size={16} className="mr-2"/> Writing
              </TabsTrigger>
            </TabsList>

            {/* TAB: CORE SETTINGS */}
            <TabsContent value="settings" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Assessment Name</Label>
                <Input 
                  placeholder="e.g. Cambridge IELTS 18 - Academic Test 01" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  className="h-16 text-2xl font-black border-2 focus:border-blue-600 rounded-2xl px-6 shadow-sm" 
                />
              </div>

              <div className="grid grid-cols-4 gap-6 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                {[
                  { label: "Listening", state: listeningTime, set: setListeningTime },
                  { label: "Reading", state: readingTime, set: setReadingTime },
                  { label: "Writing", state: writingTime, set: setWritingTime },
                  { label: "L-Review", state: listeningReviewTime, set: setListeningReviewTime },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-blue-600/60 ml-1">{item.label} (min)</Label>
                    <Input 
                      type="number" 
                      value={item.state} 
                      onChange={e => item.set(e.target.value)} 
                      className="h-12 font-bold rounded-xl border-blue-100 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB: LISTENING */}
            <TabsContent value="listening" className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Label className="font-bold mb-2 block">Audio URL (CDN/Drive Link)</Label>
                <Input 
                   placeholder="https://your-audio-hosting.com/test-1.mp3" 
                   value={audioUrl} 
                   onChange={e => setAudioUrl(e.target.value)}
                   className="font-mono text-sm"
                />
                {audioUrl && (
                  <audio controls className="w-full mt-4 h-10">
                    <source src={audioUrl} type="audio/mpeg" />
                  </audio>
                )}
              </div>
              <p className="text-center text-slate-400 text-sm italic font-medium">Listening savollarini boshqarish paneli tez orada...</p>
            </TabsContent>

            {/* TAB: READING */}
            <TabsContent value="reading" className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {passages.map((psg, idx) => (
                <div key={psg.id} className="p-6 border-2 border-slate-100 rounded-[2rem] space-y-4 relative">
                  <Badge className="absolute -top-3 left-6 bg-white border-2 border-slate-100 text-slate-400">Passage {idx + 1}</Badge>
                  <Input 
                    placeholder="Passage Title" 
                    value={psg.title} 
                    onChange={e => {
                      const newP = [...passages];
                      newP[idx].title = e.target.value;
                      setPassages(newP);
                    }}
                    className="font-bold text-lg border-none bg-slate-50 rounded-xl"
                  />
                  <Textarea 
                    placeholder="Paste the passage text content here..." 
                    className="min-h-[200px] resize-none border-none bg-slate-50 rounded-xl p-4"
                    value={psg.content}
                    onChange={e => {
                      const newP = [...passages];
                      newP[idx].content = e.target.value;
                      setPassages(newP);
                    }}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addPassage} className="w-full border-2 border-dashed h-16 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200">
                <Plus size={18} className="mr-2"/> Add Another Passage
              </Button>
            </TabsContent>

            {/* TAB: WRITING */}
            <TabsContent value="writing" className="grid grid-cols-2 gap-6">
               {writingTasks.map((task, idx) => (
                 <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-tighter">Task {idx + 1} Prompt</h4>
                      <Badge className="bg-slate-200 text-slate-600 border-none">{task.wordLimit} Words</Badge>
                    </div>
                    {idx === 0 && (
                      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                        <ImageIcon size={18} className="text-slate-400"/>
                        <Input placeholder="Image URL (for Task 1)" value={task.image} onChange={e => {
                           const newT = [...writingTasks];
                           newT[0].image = e.target.value;
                           setWritingTasks(newT);
                        }} className="border-none h-8 text-xs font-mono"/>
                      </div>
                    )}
                    <Textarea 
                      className="min-h-[250px] bg-white border-none rounded-xl p-4 shadow-inner"
                      placeholder="Enter the writing prompt details..."
                      value={task.content}
                      onChange={e => {
                        const newT = [...writingTasks];
                        newT[idx].content = e.target.value;
                        setWritingTasks(newT);
                      }}
                    />
                 </div>
               ))}
            </TabsContent>
          </Tabs>

          {/* FOOTER ACTIONS */}
          <div className="flex gap-4 pt-6 border-t border-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-8 h-14 font-bold text-slate-400 hover:text-slate-600"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-14 bg-slate-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl transition-all disabled:opacity-50" 
              disabled={createExam.isPending || updateExam.isPending}
            >
                {(createExam.isPending || updateExam.isPending) ? (
                  <><Loader2 className="animate-spin mr-3" /> SECURING DATA...</>
                ) : (
                  editingExam ? "SAVE & UPDATE CONTENT" : "PUBLISH ASSESSMENT"
                )}
            </Button>
          </div>
        </form>
      </Modal>

      <footer className="mt-12 py-8 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
          Engineered for Professional IELTS Training | v2.4.0
        </p>
      </footer>
    </div>
  );
}