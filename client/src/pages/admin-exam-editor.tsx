import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Barcha importlar pastda ishlatilgan
import { 
  Plus, 
  Trash, 
  ArrowLeft, 
  Save, 
  BookOpen, 
  ListChecks, 
  Type, 
  HelpCircle 
} from "lucide-react";

type QuestionType = "multiple_choice" | "tfng" | "gap_fill" | "map_labeling";

interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string | string[];
  imageUrl?: string;
  instruction?: string;
}

interface Passage {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

function TypeButton({ label, onClick, icon: Icon }: { label: string, onClick: () => void, icon: any }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="hover:bg-blue-50">
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Button>
  );
}

export default function AdminReadingEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [passages, setPassages] = useState<Passage[]>([]);
  const [examTitle, setExamTitle] = useState("");

  const { data: exam, isLoading } = useQuery<any>({
    queryKey: ["/api/exams", id],
    enabled: !!id && id !== "new",
  });

  useEffect(() => {
    if (exam) {
      setExamTitle(exam.title);
      const content = exam.content as any;
      setPassages(content.reading?.passages || []);
    }
  }, [exam]);

  const mutation = useMutation({
    mutationFn: async (updatedExam: any) => {
      if (id === "new") {
        return apiRequest("POST", "/api/exams", updatedExam);
      } else {
        return apiRequest("PATCH", `/api/exams/${id}`, updatedExam);
      }
    },
    onSuccess: () => {
      toast({ title: "Muvaffaqiyatli saqlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      setLocation("/admin/exams");
    },
  });

  const addPassage = () => {
    const newPassage: Passage = {
      id: Math.random().toString(36).substring(2, 9),
      title: "Yangi Passage",
      content: "",
      questions: [],
    };
    setPassages([...passages, newPassage]);
  };

  const updatePassage = (index: number, field: keyof Passage, value: any) => {
    const newPassages = [...passages];
    newPassages[index] = { ...newPassages[index], [field]: value };
    setPassages(newPassages);
  };

  const addQuestion = (passageIndex: number, type: QuestionType) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      questionText: "",
      options: type === "multiple_choice" ? ["A", "B", "C", "D"] : [],
      correctAnswer: type === "tfng" ? "True" : "",
    };
    const newPassages = [...passages];
    newPassages[passageIndex].questions.push(newQuestion);
    setPassages(newPassages);
  };

  const removeQuestion = (passageIndex: number, qIndex: number) => {
    const newPassages = [...passages];
    newPassages[passageIndex].questions.splice(qIndex, 1);
    setPassages(newPassages);
  };

  const updateQuestion = (pIdx: number, qIdx: number, field: keyof Question, value: any) => {
    const newPassages = [...passages];
    newPassages[pIdx].questions[qIdx] = { ...newPassages[pIdx].questions[qIdx], [field]: value };
    setPassages(newPassages);
  };

  const handleSave = () => {
    const content = exam?.content || { listening: {}, writing: {} };
    mutation.mutate({
      title: examTitle,
      timeLimit: exam?.timeLimit || 60,
      content: {
        ...content,
        reading: { passages },
      },
    });
  };

  if (isLoading) return <div className="p-8 text-center">Yuklanmoqda...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 py-2 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/exams")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Reading Editor</h1>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" /> Saqlash
        </Button>
      </div>

      {/* Exam Info */}
      <Card>
        <CardHeader><CardTitle>Imtihon ma'lumotlari</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="exam-title">Imtihon nomi</Label>
            <Input 
              id="exam-title"
              value={examTitle} 
              onChange={(e) => setExamTitle(e.target.value)} 
              placeholder="Masalan: IELTS Mock Test #1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Passages */}
      {passages.map((passage, pIndex) => (
        <Card key={passage.id} className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
            <div className="flex items-center gap-2 flex-1">
              <BookOpen className="w-5 h-5 text-blue-600" /> {/* BookOpen ishlatildi */}
              <Input 
                value={passage.title} 
                onChange={(e) => updatePassage(pIndex, "title", e.target.value)}
                className="text-lg font-bold border-none bg-transparent focus-visible:ring-0 px-0 h-auto"
                placeholder="Passage title..."
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:bg-red-50"
              onClick={() => setPassages(passages.filter((_, i) => i !== pIndex))}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>Passage matni</Label>
              <Textarea 
                value={passage.content} 
                onChange={(e) => updatePassage(pIndex, "content", e.target.value)}
                className="min-h-[300px] font-serif text-base"
                placeholder="Matnni shu yerga kiriting..."
              />
            </div>

            {/* Questions Section */}
            <div className="border-t pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-green-600" /> Savollar
                </h3>
                <div className="flex flex-wrap gap-2">
                  <TypeButton label="MCQ" icon={ListChecks} onClick={() => addQuestion(pIndex, "multiple_choice")} />
                  <TypeButton label="T/F/NG" icon={HelpCircle} onClick={() => addQuestion(pIndex, "tfng")} />
                  <TypeButton label="Gap Fill" icon={Type} onClick={() => addQuestion(pIndex, "gap_fill")} />
                </div>
              </div>

              <div className="space-y-6">
                {passage.questions.map((q, qIndex) => (
                  <div key={q.id} className="p-5 border-2 rounded-xl bg-white shadow-sm relative group">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <Badge variant="secondary" className="capitalize">{q.type.replace('_', ' ')}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                        onClick={() => removeQuestion(pIndex, qIndex)}
                      >
                        <Trash className="w-4 h-4 mr-1" /> Savolni o'chirish
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Savol matni</Label>
                        <Input 
                          value={q.questionText} 
                          onChange={(e) => updateQuestion(pIndex, qIndex, "questionText", e.target.value)} 
                          placeholder="Savolni kiriting..."
                        />
                      </div>

                      {q.type === "gap_fill" && (
                        <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-100">
                          <Label className="text-blue-800">To'g'ri javoblar (vergul bilan ajrating)</Label>
                          <Input 
                            className="bg-white"
                            placeholder="apple, banana"
                            value={Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
                            onChange={(e) => {
                              const vals = e.target.value.split(",").map(v => v.trim());
                              updateQuestion(pIndex, qIndex, "correctAnswer", vals);
                            }}
                          />
                          <p className="text-xs text-blue-600 italic">Eslatma: Talaba kiritgan javob bu yerdagi variantlardan biri bilan mos kelishi kerak.</p>
                        </div>
                      )}

                      {/* Multiple Choice Options qo'shish qismi bu yerda bo'lishi mumkin */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full py-10 border-dashed border-2 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all" onClick={addPassage}>
        <Plus className="w-5 h-5 mr-2" /> Yangi Passage Qo'shish
      </Button>
    </div>
  );
}