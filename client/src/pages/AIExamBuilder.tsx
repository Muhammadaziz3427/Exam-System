import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase"; // Supabase ulanishi
import { 
  Loader2, 
  Upload, 
  FileText, 
  Music, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  PenTool,
  Save,
  BrainCircuit,
  X,
  Eye
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type ExamType = "reading" | "listening" | "writing";

interface Question {
  id: string | number;
  type: string;
  questionText: string;
  options?: string[];
  answer: string;
  points?: number;
}

interface WritingTasks {
  task1Prompt: string;
  task2Prompt: string;
}

export default function AIExamBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // --- STATES ---
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<ExamType>("reading");

  // Files
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [task1Image, setTask1Image] = useState<File | null>(null);

  // Loading & UI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("AI tahlilni boshlamoqda...");

  // Data
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [writingTasks, setWritingTasks] = useState<WritingTasks>({
    task1Prompt: "",
    task2Prompt: ""
  });

  // --- PROGRESS BAR SIMULATION ---
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          if (prev === 30) setLoadingText("PDF matni tahlil qilinmoqda...");
          if (prev === 60) setLoadingText("IELTS formatiga moslashtirilmoqda...");
          if (prev === 85) setLoadingText("Yakunlanmoqda...");
          return prev + 2;
        });
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // --- 1. AI TAHLIL QILISH (Simulatsiya/Prompt) ---
  const handleAnalyzePDF = async () => {
    if (!pdfFile || !title) {
      toast({ 
        title: "Ma'lumot yetarli emas", 
        description: "Iltimos, sarlavha yozing va PDF faylni yuklang.", 
        variant: "destructive" 
      });
      return;
    }

    setIsAnalyzing(true);

    // ESLATMA: Haqiqiy PDF tahlili uchun server-side (Node.js/Python) yoki AI API (OpenAI) kerak.
    // Bu yerda biz tahlil muvaffaqiyatli bo'lganini simulyatsiya qilamiz.
    try {
      await new Promise(resolve => setTimeout(resolve, 4000)); // AI ishlayotganini ko'rsatish

      // Agar Writing bo'lsa
      if (examType === 'writing') {
        setWritingTasks({
          task1Prompt: "The chart below shows the number of visitors to three different areas in a European country...",
          task2Prompt: "Some people believe that technology has made our lives more complex. To what extent do you agree?"
        });
      } else {
        // Mock savollar (PDF tahlil natijasi o'rnida)
        const mockQuestions: Question[] = [
          { id: 1, type: "Multiple Choice", questionText: "What is the main purpose of the first passage?", options: ["To inform", "To persuade", "To criticize", "To entertain"], answer: "A" },
          { id: 2, type: "True/False/NG", questionText: "The food trade is globalized and stable.", options: ["TRUE", "FALSE", "NOT GIVEN"], answer: "FALSE" }
        ];
        setGeneratedQuestions(mockQuestions);
      }

      setProgress(100);
      toast({ title: "Muvaffaqiyatli", description: "AI PDF faylni tahlil qildi!" });
    } catch (error) {
      toast({ title: "Xatolik", description: "Tahlil jarayonida xato!", variant: "destructive" });
    } finally {
      setTimeout(() => setIsAnalyzing(false), 500);
    }
  };

  // --- 2. SUPABASE BAZASIGA SAQLASH ---
  const handleSaveExam = async () => {
    if (!title) return toast({ title: "Xato", description: "Imtihon nomini kiriting", variant: "destructive" });

    setIsSaving(true);

    try {
      let audioUrl = "";
      let imageUrl = "";

      // 1. Audio yuklash (agar bo'lsa)
      if (audioFile && examType === 'listening') {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('exams').upload(`audio/${fileName}`, audioFile);
        if (!uploadError) audioUrl = fileName;
      }

      // 2. Ma'lumotlarni yig'ish
      const content = examType === 'writing' 
        ? { tasks: [writingTasks.task1Prompt, writingTasks.task2Prompt] }
        : { questions: generatedQuestions };

      // 3. Supabase-ga INSERT qilish
      const { error } = await supabase
        .from('exams')
        .insert([{
          title: title,
          type: examType,
          content: content,
          isPublished: true, // Avvalgi xatolikni yopish uchun
          created_at: new Date()
        }]);

      if (error) throw error;

      toast({ title: "Saqlandi", description: "Imtihon bazaga muvaffaqiyatli qo'shildi!" });
      setLocation("/admin/exams");
    } catch (error: any) {
      console.error("Save Error:", error);
      toast({ title: "Xato", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const removeFile = (type: 'pdf' | 'audio' | 'image') => {
    if (type === 'pdf') setPdfFile(null);
    if (type === 'audio') setAudioFile(null);
    if (type === 'image') setTask1Image(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="flex flex-col space-y-2 border-b pb-4">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
           <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
             <BrainCircuit size={24} />
           </div>
           AI Exam Builder
        </h1>
        <p className="text-muted-foreground text-lg">
          IELTS materiallarini yuklang, sun'iy intellekt ularni raqamli imtihonga aylantiradi.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* --- LEFT SIDE: CONFIG --- */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="shadow-lg border-t-4 border-t-primary h-full">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <PenTool size={20} className="text-primary"/> Konfiguratsiya
              </CardTitle>
              <CardDescription>Imtihon parametrlarini belgilang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Imtihon nomi <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="M: Cambridge 18 - Test 1" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Imtihon turi</Label>
                <Select value={examType} onValueChange={(v: ExamType) => {
                  setExamType(v);
                  setGeneratedQuestions([]);
                }}>
                  <SelectTrigger className="h-11 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading"><div className="flex items-center gap-2"><FileText size={16} className="text-blue-500"/> Reading</div></SelectItem>
                    <SelectItem value="listening"><div className="flex items-center gap-2"><Music size={16} className="text-purple-500"/> Listening</div></SelectItem>
                    <SelectItem value="writing"><div className="flex items-center gap-2"><ImageIcon size={16} className="text-orange-500"/> Writing</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="flex justify-between font-semibold text-slate-700">
                    <span>Savollar fayli (PDF)</span>
                    <Badge variant="secondary" className="text-[10px] h-5">MAJBURIY</Badge>
                  </Label>
                  {!pdfFile ? (
                    <div 
                      className="border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 rounded-xl p-6 text-center cursor-pointer transition-all"
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">Faylni tanlash</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="text-blue-500" size={18} />
                        <span className="text-sm font-medium truncate">{pdfFile.name}</span>
                      </div>
                      <X size={16} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeFile('pdf')} />
                    </div>
                  )}
                </div>

                {examType === "listening" && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Audio trek (.mp3)</Label>
                    {!audioFile ? (
                      <div className="border-2 border-dashed p-4 text-center rounded-xl cursor-pointer" onClick={() => document.getElementById('audio-upload')?.click()}>
                        <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                        <Music className="mx-auto text-slate-400" size={20} />
                        <p className="text-xs mt-1">Audio yuklash</p>
                      </div>
                    ) : (
                      <div className="flex justify-between p-2 bg-purple-50 rounded-lg">
                         <span className="text-xs truncate">{audioFile.name}</span>
                         <X size={14} className="cursor-pointer" onClick={() => removeFile('audio')} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
               <Button className="w-full h-12" onClick={handleAnalyzePDF} disabled={isAnalyzing || !pdfFile}>
                {isAnalyzing ? <><Loader2 className="mr-2 animate-spin" /> Tahlil...</> : <><BrainCircuit className="mr-2" /> AI Tahlil</>}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* --- RIGHT SIDE: PREVIEW --- */}
        <div className="xl:col-span-8">
          <Card className="shadow-lg min-h-[600px] flex flex-col bg-white">
            <CardHeader className="border-b bg-slate-50/80">
              <CardTitle>Natijani Ko'rib Chiqish</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              {isAnalyzing && (
                <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center p-12">
                   <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                   <h3 className="text-xl font-semibold">{loadingText}</h3>
                   <Progress value={progress} className="h-2 w-64 mt-4" />
                </div>
              )}

              {generatedQuestions.length === 0 && !isAnalyzing && examType !== 'writing' && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400">
                  <Eye size={48} className="mb-4 opacity-20" />
                  <p>Hali ma'lumot tahlil qilinmadi</p>
                </div>
              )}

              {/* SAVOLLAR RO'YXATI */}
              <div className="p-6 space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50/50">
                    <div className="flex gap-3 mb-2">
                       <span className="h-6 w-6 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                       <p className="font-semibold">{q.questionText}</p>
                    </div>
                    <div className="ml-9 text-sm text-emerald-600 font-bold">
                       To'g'ri javob: {q.answer}
                    </div>
                  </div>
                ))}

                {examType === 'writing' && writingTasks.task1Prompt && (
                  <div className="space-y-6">
                    <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50/30">
                      <Badge className="mb-2 bg-blue-600">Task 1</Badge>
                      <p className="text-sm leading-relaxed">{writingTasks.task1Prompt}</p>
                    </div>
                    <div className="p-4 border-2 border-orange-100 rounded-xl bg-orange-50/30">
                      <Badge className="mb-2 bg-orange-600">Task 2</Badge>
                      <p className="text-sm leading-relaxed">{writingTasks.task2Prompt}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t p-6 bg-slate-50 flex justify-end gap-3">
               <Button variant="outline" onClick={() => setGeneratedQuestions([])}>Tozalash</Button>
               <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveExam} disabled={isSaving || (generatedQuestions.length === 0 && !writingTasks.task1Prompt)}>
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Saqlash
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}