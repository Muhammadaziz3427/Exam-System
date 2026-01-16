import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Label, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui-kit";
import { useExams, useCreateExam } from "@/hooks/use-exams";
import { Plus, Loader2, BookOpen, Headset, PenTool, Trash2, ListChecks, Type, CheckCircle2, Map as MapIcon, HelpCircle } from "lucide-react";

interface Question {
  id: number;
  type: string; // 'mcq' | 'gap_fill' | 'tfng' | 'matching' | 'map'
  text: string;
  options: string[];
  answer: string;
  instruction: string;
}

const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 p-8 relative">
        {children}
        <button onClick={() => onOpenChange(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-2xl">✕</button>
      </div>
    </div>
  );
};

export default function AdminExams() {
  const { data: exams, isLoading } = useExams();
  const createExam = useCreateExam();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("180");
  const [readingPassage, setReadingPassage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [mapImageUrl, setMapImageUrl] = useState(""); // Map savollari uchun rasm

  const [readingQuestions, setReadingQuestions] = useState<Question[]>([]);
  const [listeningQuestions, setListeningQuestions] = useState<Question[]>([]);
  const [writingTask1, setWritingTask1] = useState({ content: "", image: "" });
  const [writingTask2, setWritingTask2] = useState({ content: "" });

  const addQuestion = (section: 'reading' | 'listening', type: string) => {
    let instruction = "";
    // Savol turiga qarab standart ko'rsatmalar
    switch (type) {
      case 'tfng': instruction = "Do the following statements agree with the information given in the text?"; break;
      case 'gap_fill': instruction = "Complete the sentences below. Choose NO MORE THAN TWO WORDS."; break;
      case 'matching': instruction = "Match the correct heading with the paragraphs."; break;
      case 'map': instruction = "Label the map/diagram below."; break;
      default: instruction = "Choose the correct letter, A, B, C or D.";
    }

    const newQ: Question = { 
      id: Date.now(), 
      type, 
      text: "", 
      options: (type === 'mcq' || type === 'matching' || type === 'map') ? ["", "", "", ""] : [], 
      answer: "",
      instruction
    };

    if (section === 'reading') setReadingQuestions([...readingQuestions, newQ]);
    else setListeningQuestions([...listeningQuestions, newQ]);
  };

  const removeQuestion = (section: 'reading' | 'listening', id: number) => {
    if (section === 'reading') setReadingQuestions(readingQuestions.filter(q => q.id !== id));
    else setListeningQuestions(listeningQuestions.filter(q => q.id !== id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = {
      reading: { passage: readingPassage, questions: readingQuestions },
      listening: { audioUrl, mapImage: mapImageUrl, questions: listeningQuestions },
      writing: { tasks: [
        { type: "task1", content: writingTask1.content, image: writingTask1.image },
        { type: "task2", content: writingTask2.content }
      ]}
    };
    await createExam.mutateAsync({ title, timeLimit: parseInt(timeLimit), content: finalContent, isPublished: true });
    setIsModalOpen(false);
  };

  const QuestionItem = ({ q, idx, section }: { q: Question, idx: number, section: 'reading' | 'listening' }) => (
    <div className="p-5 border-2 border-slate-100 rounded-xl bg-slate-50/50 space-y-4 relative mb-4">
      <div className="flex justify-between items-center">
        <Badge className="bg-blue-600 uppercase">{q.type.replace('_', ' ')}</Badge>
        <Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={() => removeQuestion(section, q.id)}>
          <Trash2 size={16} />
        </Button>
      </div>

      <Input placeholder="Instruction" value={q.instruction} onChange={e => {
        const n = section === 'reading' ? [...readingQuestions] : [...listeningQuestions];
        n[idx].instruction = e.target.value;
        section === 'reading' ? setReadingQuestions(n) : setListeningQuestions(n);
      }} className="font-medium italic text-slate-600" />

      <Input placeholder="Question Text" value={q.text} onChange={e => {
        const n = section === 'reading' ? [...readingQuestions] : [...listeningQuestions];
        n[idx].text = e.target.value;
        section === 'reading' ? setReadingQuestions(n) : setListeningQuestions(n);
      }} />

      {(q.type === 'mcq' || q.type === 'matching' || q.type === 'map') && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt, oIdx) => (
            <Input key={oIdx} placeholder={`Option ${String.fromCharCode(65+oIdx)}`} value={opt} onChange={e => {
              const n = section === 'reading' ? [...readingQuestions] : [...listeningQuestions];
              n[idx].options[oIdx] = e.target.value;
              section === 'reading' ? setReadingQuestions(n) : setListeningQuestions(n);
            }} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
        <CheckCircle2 size={16} className="text-blue-600" />
        <Input 
          className="border-none bg-transparent focus-visible:ring-0 placeholder:text-blue-300 text-blue-800 font-bold" 
          placeholder={q.type === 'tfng' ? "Correct Answer (TRUE/FALSE/NOT GIVEN)" : "Correct Answer"} 
          value={q.answer} 
          onChange={e => {
            const n = section === 'reading' ? [...readingQuestions] : [...listeningQuestions];
            n[idx].answer = e.target.value;
            section === 'reading' ? setReadingQuestions(n) : setListeningQuestions(n);
          }} 
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">IELTS Exam Builder</h2>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600"><Plus className="mr-2" /> New Exam</Button>
      </div>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="flex gap-4 border-b pb-4">
            <Input placeholder="Exam Title" value={title} onChange={e => setTitle(e.target.value)} required className="text-xl font-bold" />
            <Input className="w-32 text-center" type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
          </div>

          <Tabs defaultValue="reading">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="reading"><BookOpen className="mr-2" size={16}/> Reading</TabsTrigger>
              <TabsTrigger value="listening"><Headset className="mr-2" size={16}/> Listening</TabsTrigger>
              <TabsTrigger value="writing"><PenTool className="mr-2" size={16}/> Writing</TabsTrigger>
            </TabsList>

            <TabsContent value="reading" className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <Textarea className="min-h-[200px]" placeholder="Passage content..." value={readingPassage} onChange={e => setReadingPassage(e.target.value)} />
              <div className="flex gap-2 sticky top-0 bg-white py-2 border-b">
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('reading', 'tfng')}><CheckCircle2 size={14} className="mr-1" /> TFNG</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('reading', 'gap_fill')}><Type size={14} className="mr-1" /> Gap Fill</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('reading', 'mcq')}><ListChecks size={14} className="mr-1" /> MCQ</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('reading', 'matching')}><HelpCircle size={14} className="mr-1" /> Matching</Button>
              </div>
              {readingQuestions.map((q, idx) => <QuestionItem key={q.id} q={q} idx={idx} section="reading" />)}
            </TabsContent>

            <TabsContent value="listening" className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Audio URL" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
                <Input placeholder="Map/Diagram Image URL" value={mapImageUrl} onChange={e => setMapImageUrl(e.target.value)} />
              </div>
              <div className="flex gap-2 sticky top-0 bg-white py-2 border-b">
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('listening', 'gap_fill')}><Type size={14} className="mr-1" /> Gap Fill</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('listening', 'mcq')}><ListChecks size={14} className="mr-1" /> MCQ</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('listening', 'map')}><MapIcon size={14} className="mr-1" /> Map/Labeling</Button>
              </div>
              {listeningQuestions.map((q, idx) => <QuestionItem key={q.id} q={q} idx={idx} section="listening" />)}
            </TabsContent>

            <TabsContent value="writing" className="space-y-4">
               {/* Writing qismi o'z holicha qoldi */}
               <Card className="p-4 bg-slate-50 border-dashed border-2">
                 <Label className="text-blue-600 font-bold mb-2 block text-sm italic">TASK 1 (Report/Letter)</Label>
                 <Input className="mb-2" placeholder="Task 1 Image URL" value={writingTask1.image} onChange={e => setWritingTask1({...writingTask1, image: e.target.value})} />
                 <Textarea placeholder="Task 1 Prompt..." value={writingTask1.content} onChange={e => setWritingTask1({...writingTask1, content: e.target.value})} />
               </Card>
               <Card className="p-4 bg-slate-50 border-dashed border-2">
                 <Label className="text-blue-600 font-bold mb-2 block text-sm italic">TASK 2 (Essay)</Label>
                 <Textarea className="min-h-[150px]" placeholder="Task 2 Essay Topic..." value={writingTask2.content} onChange={e => setWritingTask2({content: e.target.value})} />
               </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 px-8" disabled={createExam.isPending}>
              {createExam.isPending ? <Loader2 className="animate-spin mr-2" /> : "Publish Exam"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}