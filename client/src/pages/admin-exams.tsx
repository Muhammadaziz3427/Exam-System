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

  const [gradingState, setGradingState] = useState({
    taskResponse: 0,
    cohesion: 0,
    vocabulary: 0,
    grammar: 0,
  });

  const calculateBandScore = (scores: typeof gradingState) => {
    const avg = (scores.taskResponse + scores.cohesion + scores.vocabulary + scores.grammar) / 4;
    return Math.round(avg * 2) / 2; // IELTS rounds to nearest 0.5
  };

  const bandScorePreview = calculateBandScore(gradingState);

  // Example of how we'd use this in a grading UI
  const GradingSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-xs font-bold uppercase text-slate-500">{label}</Label>
        <span className="text-sm font-mono font-bold text-primary">{value.toFixed(1)}</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="9" 
        step="0.5" 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
  
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
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold">Create New Exam</h3>
          <div className="bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
            <span className="text-xs font-medium text-primary">IELTS Standard</span>
          </div>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
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
            <div className="flex justify-between items-end">
              <Label>Exam Content (JSON Structure)</Label>
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {
                // Pre-fill a template if empty
                if (contentJson.length < 10) setContentJson(JSON.stringify({
                  listening: { audioUrl: "", questions: [{ id: 1, text: "Q1", options: ["A", "B"], answer: "A" }] },
                  reading: { passage: "", questions: [{ id: 1, text: "Q1", options: ["A", "B"], answer: "A" }] },
                  writing: { prompts: ["Prompt"] }
                }, null, 2));
              }}>Use Template</Button>
            </div>
            <Textarea 
              value={contentJson} 
              onChange={e => setContentJson(e.target.value)} 
              className="font-mono text-[10px] h-64 bg-slate-900 text-slate-300 focus-visible:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground">
              Ensure all questions have an "answer" field for auto-grading.
            </p>
          </div>

          {/* Teacher UI Polish Demo: Score Preview */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              Writing Grading Tool Preview
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <GradingSlider 
                label="Task Response" 
                value={gradingState.taskResponse} 
                onChange={(v) => setGradingState(p => ({ ...p, taskResponse: v }))} 
              />
              <GradingSlider 
                label="Cohesion" 
                value={gradingState.cohesion} 
                onChange={(v) => setGradingState(p => ({ ...p, cohesion: v }))} 
              />
              <GradingSlider 
                label="Vocabulary" 
                value={gradingState.vocabulary} 
                onChange={(v) => setGradingState(p => ({ ...p, vocabulary: v }))} 
              />
              <GradingSlider 
                label="Grammar" 
                value={gradingState.grammar} 
                onChange={(v) => setGradingState(p => ({ ...p, grammar: v }))} 
              />
            </div>
            <div className="pt-4 border-t flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Calculated Final Band:</span>
              <div className="text-2xl font-black text-primary bg-white px-4 py-1 rounded-lg border shadow-sm">
                {bandScorePreview.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createExam.isPending} className="px-8">
              {createExam.isPending ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
