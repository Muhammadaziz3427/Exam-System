import { useState } from "react";
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
  Pencil,
  Clock,
  Settings2,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";

// --- TYPES & INTERFACES ---
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

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
  const [passages, setPassages] = useState([{ id: Date.now(), title: "Passage 1", content: "", image: "", questions: [] as any[] }]);
  const [listeningQuestions, setListeningQuestions] = useState([] as any[]);
  const [writingTasks, setWritingTasks] = useState([
    { type: "task1", content: "", image: "", wordLimit: "150" },
    { type: "task2", content: "", wordLimit: "250" }
  ]);

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, idx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field + (idx !== undefined ? `-${idx}` : ""));
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.filename) {
        if (field === "audioUrl") {
          setAudioUrl(data.filename);
        } else if (field === "passageImage" && idx !== undefined) {
          const newP = [...passages];
          newP[idx].image = data.filename;
          setPassages(newP);
        } else if (field === "writingImage") {
          const nt = [...writingTasks];
          nt[0].image = data.filename;
          setWritingTasks(nt);
        }
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploadingField(null);
    }
  };

  const openEditModal = (exam: any) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setAudioUrl(exam.content.listening.audioUrl || "");
    setListeningTime(exam.content.listening.duration.toString());
    setListeningReviewTime(exam.content.listening.reviewTime?.toString() || "5");
    setReadingTime(exam.content.reading.timeLimit.toString());
    setWritingTime(exam.content.writing.timeLimit.toString());
    setPassages(exam.content.reading.passages.map((p: any) => ({ ...p, image: p.image || "" })));
    setListeningQuestions(exam.content.listening.questions || []);
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
    setPassages([{ id: Date.now(), title: "Passage 1", content: "", image: "", questions: [] as any[] }]);
    setListeningQuestions([]);
    setWritingTasks([
      { type: "task1", content: "", image: "", wordLimit: "150" },
      { type: "task2", content: "", wordLimit: "250" }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = {
      listening: { 
        audioUrl: audioUrl.trim(), 
        duration: parseInt(listeningTime) || 40, 
        reviewTime: parseInt(listeningReviewTime) || 5, 
        questions: listeningQuestions 
      },
      reading: { 
        timeLimit: parseInt(readingTime) || 60, 
        passages 
      },
      writing: { 
        timeLimit: parseInt(writingTime) || 60, 
        tasks: writingTasks 
      }
    };

    const examData = { 
      title, 
      timeLimit: (parseInt(listeningTime) || 40) + (parseInt(readingTime) || 60) + (parseInt(writingTime) || 60), 
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
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 font-bold">IELTS CORE</Badge>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Exam <span className="text-blue-600">Studio</span></h2>
          <p className="text-slate-500 font-medium mt-2">Create and refine high-quality IELTS assessments.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
          <Plus className="mr-2" size={20} /> New Exam
        </Button>
      </div>

      {/* EXAM LIST */}
      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
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
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ID: #{exam.id}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <Badge className="bg-slate-100 text-slate-600 border-none font-bold px-3 py-1">
                      <Clock size={12} className="mr-2"/> {exam.timeLimit} Minutes
                    </Badge>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openEditModal(exam)}>
                        <Pencil size={14} className="mr-2"/> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-xl text-red-400 hover:bg-red-50" onClick={() => confirm("Delete?") && deleteExam.mutate(exam.id)}>
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

      {/* MODAL */}
      <Modal open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) resetForm(); }}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <header className="flex justify-between items-center bg-slate-900 -m-8 mb-8 p-8 rounded-t-[1.5rem] text-white">
            <h3 className="text-2xl font-black">{editingExam ? "Refine Assessment" : "Architect New Exam"}</h3>
            <Badge className="bg-blue-600">{editingExam ? "EDIT MODE" : "CREATION MODE"}</Badge>
          </header>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-2xl mb-8">
              <TabsTrigger value="settings" className="rounded-xl font-bold"><Settings2 size={16} className="mr-2"/>Settings</TabsTrigger>
              <TabsTrigger value="listening" className="rounded-xl font-bold"><Headset size={16} className="mr-2"/>Listening</TabsTrigger>
              <TabsTrigger value="reading" className="rounded-xl font-bold"><BookOpen size={16} className="mr-2"/>Reading</TabsTrigger>
              <TabsTrigger value="writing" className="rounded-xl font-bold"><PenTool size={16} className="mr-2"/>Writing</TabsTrigger>
            </TabsList>

            {/* SETTINGS */}
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400">Assessment Name</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required className="h-16 text-2xl font-black rounded-2xl px-6" />
              </div>
              <div className="grid grid-cols-4 gap-6 bg-slate-50 p-6 rounded-[2rem]">
                {[{L: listeningTime, SL: setListeningTime, n: "Listening"}, {L: readingTime, SL: setReadingTime, n: "Reading"}, {L: writingTime, SL: setWritingTime, n: "Writing"}, {L: listeningReviewTime, SL: setListeningReviewTime, n: "L-Review"}].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">{item.n} (min)</Label>
                    <Input type="number" value={item.L} onChange={e => item.SL(e.target.value)} />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* LISTENING */}
            <TabsContent value="listening" className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Label className="font-bold mb-2 block text-blue-600">Audio Source</Label>
                <div className="flex gap-2">
                  <Input 
                    type="file" 
                    accept="audio/*" 
                    onChange={(e) => handleFileUpload(e, "audioUrl")}
                    className="flex-1"
                  />
                  {uploadingField === "audioUrl" && <Loader2 className="animate-spin" />}
                </div>
                <p className="text-xs text-slate-400 mt-2">Current file: {audioUrl || "None"}</p>
                {audioUrl && (
                  <audio controls className="w-full mt-4" key={audioUrl}>
                    <source src={`/uploads/${audioUrl}`} />
                  </audio>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-sm uppercase">Listening Questions</h4>
                  <Button type="button" size="sm" onClick={() => setListeningQuestions([...listeningQuestions, { question: "", answer: "" }])}>
                    <Plus size={14} className="mr-2"/> Add Row
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {listeningQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2 bg-white p-2 rounded-xl border">
                      <span className="w-8 flex items-center justify-center font-bold text-slate-300">{idx + 1}</span>
                      <Input placeholder="Question Text" className="flex-1" value={q.question} onChange={e => {
                        const newQ = [...listeningQuestions];
                        newQ[idx].question = e.target.value;
                        setListeningQuestions(newQ);
                      }} />
                      <Input placeholder="Correct Answer" className="w-40 border-emerald-100" value={q.answer} onChange={e => {
                        const newQ = [...listeningQuestions];
                        newQ[idx].answer = e.target.value;
                        setListeningQuestions(newQ);
                      }} />
                      <Button type="button" variant="ghost" className="text-red-400" onClick={() => setListeningQuestions(listeningQuestions.filter((_, i) => i !== idx))}>
                        <Trash2 size={14}/>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* READING */}
            <TabsContent value="reading" className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {passages.map((psg, idx) => (
                <div key={psg.id} className="p-6 border-2 border-slate-100 rounded-[2rem] space-y-4 relative bg-white">
                  <Badge className="absolute -top-3 left-6">Passage {idx + 1}</Badge>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-4">
                      <Input placeholder="Passage Title" value={psg.title} onChange={e => {
                        const newP = [...passages]; newP[idx].title = e.target.value; setPassages(newP);
                      }} className="font-bold border-none bg-slate-50 h-12" />
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "passageImage", idx)} className="text-xs" />
                        {uploadingField === `passageImage-${idx}` && <Loader2 className="animate-spin" size={16} />}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">File: {psg.image || "None"}</p>
                    </div>
                    {psg.image && <div className="w-32 h-32 rounded-xl overflow-hidden border"><img src={`/uploads/${psg.image}`} className="w-full h-full object-cover" /></div>}
                  </div>
                  <Textarea placeholder="Content..." className="min-h-[200px]" value={psg.content} onChange={e => {
                    const newP = [...passages]; newP[idx].content = e.target.value; setPassages(newP);
                  }} />
                  <Button type="button" variant="ghost" className="text-red-400 w-full" onClick={() => setPassages(passages.filter((p) => p.id !== psg.id))}>Remove Passage</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setPassages([...passages, { id: Date.now(), title: "", content: "", image: "", questions: [] }])} className="w-full border-dashed h-16 rounded-2xl">
                <Plus className="mr-2"/> Add Passage
              </Button>
            </TabsContent>

            {/* WRITING */}
            <TabsContent value="writing" className="grid grid-cols-2 gap-6">
               {writingTasks.map((task, idx) => (
                 <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] space-y-4">
                    <div className="flex justify-between items-center font-black text-xs uppercase text-slate-400">
                      <span>Task {idx + 1} Prompt</span>
                      <Badge variant="outline">{task.wordLimit} words</Badge>
                    </div>
                    {idx === 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "writingImage")} className="text-xs" />
                          {uploadingField === "writingImage" && <Loader2 className="animate-spin" size={16} />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">File: {task.image || "None"}</p>
                        {task.image && <img src={`/uploads/${task.image}`} className="h-24 rounded-lg border bg-white p-1 object-contain" />}
                      </div>
                    )}
                    <Textarea className="min-h-[250px] bg-white rounded-xl shadow-inner" placeholder="Prompt details..." value={task.content} onChange={e => {
                      const nt = [...writingTasks]; nt[idx].content = e.target.value; setWritingTasks(nt);
                    }} />
                 </div>
               ))}
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-8 h-14 font-bold text-slate-400">Discard</Button>
            <Button type="submit" className="flex-1 h-14 bg-slate-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl transition-all" disabled={createExam.isPending || updateExam.isPending}>
              { (createExam.isPending || updateExam.isPending) ? <Loader2 className="animate-spin" /> : (editingExam ? "SAVE CHANGES" : "PUBLISH NOW") }
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}