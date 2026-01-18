import { useState } from "react";
import { useLocation, Link } from "wouter";
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
  CheckCircle2,
  Pencil,
  Clock
} from "lucide-react";

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
  const updateExam = useUpdateExam(); // Add this hook
  const deleteExam = useDeleteExam();
  const [, setLocation] = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null); // Track which exam is being edited
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

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Exam Creator <span className="text-blue-600">Pro</span></h2>
          <p className="text-slate-500 font-medium">Manage and create IELTS mock tests</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-slate-900 hover:bg-black text-white rounded-full px-8 h-12">
          <Plus className="mr-2" size={20} /> Create New Exam
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <div className="p-6 border-b bg-slate-50/50">
          <h3 className="font-bold flex items-center gap-2"><Layers size={18}/> Active Exams ({exams?.length || 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-slate-50/50 text-xs font-black uppercase text-slate-400">
                <th className="p-4">Test Title</th>
                <th className="p-4 text-center">Duration</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams?.map((exam: any) => (
                <tr key={exam.id} className="border-b hover:bg-slate-50 transition-all group">
                  <td className="p-4">
                    <div className="font-bold text-slate-700">{exam.title}</div>
                    <div className="text-[10px] text-slate-400">ID: {exam.id}</div>
                  </td>
                  <td className="p-4 text-center text-slate-500 font-medium">{exam.timeLimit} min</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {/* Link orqali navigatsiya (Eng xavfsiz yo'l) */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-600 border-blue-100 hover:bg-blue-50"
                      onClick={() => openEditModal(exam)}
                    >
                      <Pencil size={14} className="mr-2"/> Edit
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:bg-red-50" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm("Are you sure you want to delete this exam?")) {
                          deleteExam.mutate(exam.id);
                        }
                      }}
                    >
                      <Trash2 size={14}/>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) resetForm(); }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-2xl font-black">{editingExam ? "Edit Exam" : "Create New Exam"}</h3>
            <Badge variant="outline" className="text-blue-600 border-blue-200">{editingExam ? "Update Mode" : "Draft Mode"}</Badge>
          </div>

          <div className="space-y-2">
            <Label className="uppercase text-[10px] font-black text-slate-400">Exam Title</Label>
            <Input placeholder="Cambridge IELTS 18 - Test 1" value={title} onChange={e => setTitle(e.target.value)} required className="h-14 text-xl font-bold border-2 focus:border-blue-600 rounded-xl" />
          </div>

          <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border">
            <div>
              <Label className="text-[10px] font-bold">Listening (min)</Label>
              <Input type="number" value={listeningTime} onChange={e => setListeningTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold">Reading (min)</Label>
              <Input type="number" value={readingTime} onChange={e => setReadingTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold">Writing (min)</Label>
              <Input type="number" value={writingTime} onChange={e => setWritingTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold">Review (min)</Label>
              <Input type="number" value={listeningReviewTime} onChange={e => setListeningReviewTime(e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-200 transition-all" disabled={createExam.isPending || updateExam.isPending}>
             {(createExam.isPending || updateExam.isPending) ? <Loader2 className="animate-spin mr-2" /> : null}
             {(createExam.isPending || updateExam.isPending) ? "SAVING..." : editingExam ? "UPDATE EXAM" : "PUBLISH COMPLETE EXAM"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}