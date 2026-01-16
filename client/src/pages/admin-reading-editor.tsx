import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash, ArrowLeft, Save, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuestionType = "multiple_choice" | "tfng" | "drag_drop";

interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string | string[];
}

interface Passage {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

export default function AdminReadingEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [examTitle, setExamTitle] = useState("");

  const { data: exam, isLoading } = useQuery({
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
      id: Math.random().toString(36).substr(2, 9),
      title: "New Passage",
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
      id: Math.random().toString(36).substr(2, 9),
      type,
      questionText: "",
      options: type === "multiple_choice" ? ["Option 1", "Option 2"] : [],
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

  const updateQuestion = (passageIndex: number, qIndex: number, field: keyof Question, value: any) => {
    const newPassages = [...passages];
    newPassages[passageIndex].questions[qIndex] = { 
      ...newPassages[passageIndex].questions[qIndex], 
      [field]: value 
    };
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

  if (isLoading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/exams")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Reading Editor</h1>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Saqlash
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imtihon ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Imtihon nomi</Label>
              <Input 
                value={examTitle} 
                onChange={(e) => setExamTitle(e.target.value)} 
                placeholder="Masalan: IELTS Mock Test" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {passages.map((passage, pIndex) => (
        <Card key={passage.id} className="relative">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex-1">
              <Input 
                value={passage.title} 
                onChange={(e) => updatePassage(pIndex, "title", e.target.value)}
                className="text-lg font-semibold border-none focus-visible:ring-0 px-0"
              />
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => {
              const newPassages = passages.filter((_, i) => i !== pIndex);
              setPassages(newPassages);
            }}>
              <Trash className="w-4 h-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Passage Content</Label>
              <Textarea 
                value={passage.content} 
                onChange={(e) => updatePassage(pIndex, "content", e.target.value)}
                className="min-h-[200px] mt-2"
                placeholder="Matnni shu yerga kiriting..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Savollar</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addQuestion(pIndex, "multiple_choice")}>
                    <Plus className="w-4 h-4 mr-1" /> Multiple Choice
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion(pIndex, "tfng")}>
                    <Plus className="w-4 h-4 mr-1" /> T/F/NG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion(pIndex, "drag_drop")}>
                    <Plus className="w-4 h-4 mr-1" /> Drag & Drop
                  </Button>
                </div>
              </div>

              {passage.questions.map((q, qIndex) => (
                <div key={q.id} className="p-4 border rounded-md bg-muted/30 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Label>Savol matni</Label>
                      <Input 
                        value={q.questionText} 
                        onChange={(e) => updateQuestion(pIndex, qIndex, "questionText", e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(pIndex, qIndex)}>
                      <Trash className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <Label>Variantlar</Label>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`} 
                            checked={q.correctAnswer === opt}
                            onChange={() => updateQuestion(pIndex, qIndex, "correctAnswer", opt)}
                          />
                          <Input 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIndex] = e.target.value;
                              updateQuestion(pIndex, qIndex, "options", newOpts);
                            }}
                          />
                          <Button variant="ghost" size="icon" onClick={() => {
                            const newOpts = q.options.filter((_, i) => i !== optIndex);
                            updateQuestion(pIndex, qIndex, "options", newOpts);
                          }}>
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="link" size="sm" onClick={() => {
                        updateQuestion(pIndex, qIndex, "options", [...q.options, `New Option`]);
                      }}>Add Option</Button>
                    </div>
                  )}

                  {q.type === "tfng" && (
                    <div className="w-48">
                      <Label>To'g'ri javob</Label>
                      <Select 
                        value={q.correctAnswer as string} 
                        onValueChange={(val) => updateQuestion(pIndex, qIndex, "correctAnswer", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="True">True</SelectItem>
                          <SelectItem value="False">False</SelectItem>
                          <SelectItem value="Not Given">Not Given</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {q.type === "drag_drop" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Savol matnida [[blank]] ishlating. Variantlarni pastda kiriting.</p>
                      <Label>To'g'ri javob (ketma-ket, vergul bilan)</Label>
                      <Input 
                        value={q.correctAnswer as string} 
                        onChange={(e) => updateQuestion(pIndex, qIndex, "correctAnswer", e.target.value)}
                        placeholder="javob1, javob2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addPassage}>
        <Plus className="w-4 h-4 mr-2" /> Passage qo'shish
      </Button>
    </div>
  );
}
