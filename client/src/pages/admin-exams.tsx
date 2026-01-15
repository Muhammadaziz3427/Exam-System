import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Label, Badge } from "@/components/ui-kit";
import { useExams, useCreateExam } from "@/hooks/use-exams";
import { Plus, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog"; 

// Simple dialog component wrapper since we need basic functionality
const Modal = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95">
        {children}
        <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
      </div>
    </div>
  );
};

export default function AdminExams() {
  const { data: exams, isLoading } = useExams();
  const createExam = useCreateExam();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [contentJson, setContentJson] = useState(JSON.stringify({
    listening: { 
      audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", 
      questions: [
        { id: "l1", type: "mcq", text: "What is the main topic?", options: ["A", "B", "C"], answer: "A" }
      ]
    },
    reading: {
      passage: "Lorem ipsum dolor sit amet...",
      questions: []
    },
    writing: {
      prompts: ["Write about technology."]
    }
  }, null, 2));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedContent = JSON.parse(contentJson);
      await createExam.mutateAsync({
        title,
        timeLimit: parseInt(timeLimit),
        content: parsedContent,
        isPublished: true
      });
      setIsModalOpen(false);
      setTitle("");
      // Reset other fields...
    } catch (err) {
      alert("Invalid JSON format");
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Exam Management</h2>
          <p className="text-slate-500 mt-1">Create and manage test materials.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} />
          Create New Exam
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams?.map((exam) => (
            <Card key={exam.id} className="hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant={exam.isPublished ? "success" : "secondary"}>
                    {exam.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">ID: {exam.id}</span>
                </div>
                <CardTitle className="mt-2 group-hover:text-primary transition-colors">{exam.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500 mb-4">
                  Time Limit: {exam.timeLimit} minutes
                </div>
                <Button variant="outline" className="w-full">Edit Content</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <h3 className="text-xl font-bold mb-4">Create New Exam</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. IELTS Mock Test 4" />
            </div>
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Exam Content (JSON Structure)</Label>
            <Textarea 
              value={contentJson} 
              onChange={e => setContentJson(e.target.value)} 
              className="font-mono text-xs h-64"
              required
            />
            <p className="text-xs text-muted-foreground">
              Must include structure for listening, reading, and writing sections.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createExam.isPending}>
              {createExam.isPending ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
