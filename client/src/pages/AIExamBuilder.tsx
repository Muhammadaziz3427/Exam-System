import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area"; // Agar ScrollArea komponenti bo'lmasa, oddiy div ishlatamiz

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
  const [progress, setProgress] = useState(0); // Progress bar uchun
  const [loadingText, setLoadingText] = useState("AI tahlilni boshlamoqda...");

  // Data
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [writingTasks, setWritingTasks] = useState<WritingTasks>({
    task1Prompt: "",
    task2Prompt: ""
  });

  // --- PROGRESS BAR SIMULATION ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Har xil bosqichda matnni o'zgartirish
          if (prev === 30) setLoadingText("PDF matni o'qilmoqda...");
          if (prev === 60) setLoadingText("Savollar ajratib olinmoqda...");
          if (prev === 80) setLoadingText("Javoblar tekshirilmoqda...");
          return prev + Math.random() * 10;
        });
      }, 800);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // --- 1. AI TAHLIL QILISH (PDF) ---
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
    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("type", examType);

    try {
      const res = await fetch("/api/exams/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("AI tahlilida xatolik yuz berdi");

      const data = await res.json();
      setProgress(100); // Tugatish

      if (examType === 'writing') {
        setWritingTasks({
          task1Prompt: data.task1 || "Write a report describing the information in the chart...",
          task2Prompt: data.task2 || "Write an essay on the following topic..."
        });
        toast({ title: "Muvaffaqiyatli", description: "Writing mavzulari aniqlandi!" });
      } else {
        const questions = data.questions || [];
        setGeneratedQuestions(questions);
        toast({ 
          title: "Muvaffaqiyatli", 
          description: `AI ${questions.length} ta savolni ajratib oldi!` 
        });
      }

    } catch (error) {
      console.error("PDF Analysis Error:", error);
      toast({ 
        title: "Xatolik", 
        description: "PDF-ni o'qib bo'lmadi. Fayl shikastlanmaganligini tekshiring.", 
        variant: "destructive" 
      });
    } finally {
      setTimeout(() => setIsAnalyzing(false), 500); // 100% ni ko'rsatish uchun biroz kutish
    }
  };

  // --- 2. BAZAGA SAQLASH ---
  const handleSaveExam = async () => {
    if (!title) return toast({ title: "Xato", description: "Imtihon nomini kiriting", variant: "destructive" });

    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("type", examType);

    if (audioFile && examType === 'listening') {
      formData.append("audio", audioFile);
    }

    if (task1Image && examType === 'writing') {
      formData.append("images", task1Image);
    }

    let contentPayload: any = {};
    if (examType === 'writing') {
      contentPayload = {
        writing: {
          tasks: [
            { type: 'task1', content: writingTasks.task1Prompt },
            { type: 'task2', content: writingTasks.task2Prompt }
          ]
        }
      };
    } else {
      // Reading & Listening uchun
      contentPayload = { 
         questions: generatedQuestions,
         totalQuestions: generatedQuestions.length 
      };
    }

    formData.append("questions", JSON.stringify(contentPayload));

    try {
      const res = await fetch("/api/exams/save", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Saqlashda xatolik");

      toast({ title: "Saqlandi", description: "Imtihon muvaffaqiyatli bazaga qo'shildi!" });
      setLocation("/admin/exams");
    } catch (error) {
      console.error("Save Error:", error);
      toast({ title: "Xato", description: "Imtihonni saqlab bo'lmadi", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- HELPER: FILE REMOVE ---
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

        {/* --- CHAP TOMON: SOZLAMALAR (4 Columns) --- */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="shadow-lg border-t-4 border-t-primary h-full">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <PenTool size={20} className="text-primary"/> Konfiguratsiya
              </CardTitle>
              <CardDescription>Imtihon parametrlarini belgilang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              {/* Title Input */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Imtihon nomi <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="M: Cambridge 18 - Test 1" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Type Select */}
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
                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label className="flex justify-between font-semibold text-slate-700">
                    <span>Savollar fayli (PDF)</span>
                    <Badge variant="secondary" className="text-[10px] h-5">MAJBURIY</Badge>
                  </Label>

                  {!pdfFile ? (
                    <div 
                      className="border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 rounded-xl p-6 text-center cursor-pointer transition-all group"
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                      <div className="h-12 w-12 bg-slate-100 group-hover:bg-white rounded-full flex items-center justify-center mx-auto mb-3 transition-colors shadow-sm">
                         <Upload className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 group-hover:text-primary">Faylni tanlash uchun bosing</p>
                      <p className="text-xs text-slate-400 mt-1">faqat .pdf formatda</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-blue-900 truncate">{pdfFile.name}</p>
                          <p className="text-xs text-blue-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFile('pdf')}>
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Audio Upload (Listening only) */}
                {examType === "listening" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                    <Label className="font-semibold text-slate-700">Audio trek (.mp3)</Label>
                    {!audioFile ? (
                      <div 
                        className="border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl p-4 text-center cursor-pointer transition-all"
                        onClick={() => document.getElementById('audio-upload')?.click()}
                      >
                         <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                         <div className="flex items-center justify-center gap-2 text-slate-500 hover:text-purple-600">
                            <Music size={18} /> <span className="text-sm font-medium">Audio yuklash</span>
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Music size={20} />
                          </div>
                          <div className="truncate">
                             <p className="text-sm font-bold text-purple-900 truncate">{audioFile.name}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile('audio')}><X size={16} /></Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Task 1 Image Upload (Writing only) */}
                {examType === "writing" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                    <Label className="font-semibold text-slate-700">Task 1 Rasm/Diagramma</Label>
                    {!task1Image ? (
                      <div 
                        className="border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-4 text-center cursor-pointer transition-all"
                        onClick={() => document.getElementById('task1-upload')?.click()}
                      >
                         <input id="task1-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setTask1Image(e.target.files?.[0] || null)} />
                         <div className="flex items-center justify-center gap-2 text-slate-500 hover:text-orange-600">
                            <ImageIcon size={18} /> <span className="text-sm font-medium">Rasm yuklash</span>
                         </div>
                      </div>
                    ) : (
                      <div className="relative group rounded-lg overflow-hidden border border-orange-200">
                        <img src={URL.createObjectURL(task1Image)} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 right-2">
                           <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeFile('image')}><X size={12} /></Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                           <p className="text-xs text-white text-center truncate">{task1Image.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6">
               <Button 
                className="w-full font-bold h-12 text-base shadow-md" 
                onClick={handleAnalyzePDF} 
                disabled={isAnalyzing || !pdfFile}
              >
                {isAnalyzing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Tahlil qilinmoqda...</>
                ) : (
                  <><BrainCircuit className="mr-2 h-5 w-5" /> AI Tahlilni Boshlash</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* --- O'NG TOMON: PREVIEW (8 Columns) --- */}
        <div className="xl:col-span-8">
          <Card className="shadow-lg min-h-[600px] flex flex-col border-none bg-white">
            <CardHeader className="border-b bg-slate-50/80 px-8 py-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl text-slate-800">Natijani Ko'rib Chiqish</CardTitle>
                  <CardDescription>Generatsiya qilingan savollar shu yerda ko'rinadi</CardDescription>
                </div>
                {examType !== 'writing' && generatedQuestions.length > 0 && (
                  <Badge variant="outline" className="px-3 py-1 text-sm bg-white border-primary/20 text-primary shadow-sm">
                    {generatedQuestions.length} ta savol
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 relative bg-slate-50/30">

              {/* LOADING STATE */}
              {isAnalyzing && (
                <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-12 space-y-8 animate-in fade-in">
                   <div className="relative">
                     <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                       <span className="font-bold text-lg text-primary">{Math.round(progress)}%</span>
                     </div>
                   </div>
                   <div className="w-full max-w-md space-y-2 text-center">
                      <h3 className="text-xl font-semibold text-slate-800">{loadingText}</h3>
                      <Progress value={progress} className="h-2 w-full" />
                      <p className="text-sm text-slate-500">Bu jarayon bir necha soniya vaqt olishi mumkin.</p>
                   </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {!isAnalyzing && generatedQuestions.length === 0 && examType !== 'writing' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60 min-h-[400px]">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center shadow-inner">
                    <Eye className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium text-slate-900">Preview maydoni bo'sh</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Chap tomondagi panel orqali PDF faylni yuklang va "Tahlilni Boshlash" tugmasini bosing.</p>
                  </div>
                </div>
              )}

              {/* WRITING EDITOR */}
              {!isAnalyzing && examType === 'writing' && (
                 <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Task 1 */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                         <Label className="text-lg font-bold text-blue-700 flex items-center gap-2"><div className="w-2 h-6 bg-blue-600 rounded-full"></div> Writing Task 1</Label>
                         <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none">~150 words</Badge>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {task1Image && (
                             <div className="md:col-span-1 border rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                                <img src={URL.createObjectURL(task1Image)} alt="Task 1" className="w-full h-full object-cover min-h-[150px]" />
                             </div>
                          )}
                          <Textarea 
                             className={`${task1Image ? 'md:col-span-2' : 'md:col-span-3'} min-h-[150px] text-base resize-none focus-visible:ring-blue-500/20`}
                             placeholder="Task 1 prompt (The chart below shows...)"
                             value={writingTasks.task1Prompt}
                             onChange={(e) => setWritingTasks({...writingTasks, task1Prompt: e.target.value})}
                          />
                       </div>
                    </div>

                    {/* Task 2 */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                         <Label className="text-lg font-bold text-orange-700 flex items-center gap-2"><div className="w-2 h-6 bg-orange-600 rounded-full"></div> Writing Task 2</Label>
                         <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-none">~250 words</Badge>
                       </div>
                       <Textarea 
                          className="min-h-[150px] text-base resize-none focus-visible:ring-orange-500/20"
                          placeholder="Task 2 Essay prompt (Some people believe that...)"
                          value={writingTasks.task2Prompt}
                          onChange={(e) => setWritingTasks({...writingTasks, task2Prompt: e.target.value})}
                       />
                    </div>
                 </div>
              )}

              {/* QUESTIONS LIST (READING/LISTENING) */}
              {!isAnalyzing && generatedQuestions.length > 0 && examType !== 'writing' && (
                <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar max-h-[600px]">
                  {generatedQuestions.map((q, idx) => (
                    <div key={idx} className="group p-5 border border-slate-200 rounded-2xl bg-white hover:shadow-md hover:border-primary/30 transition-all duration-300">

                      {/* Question Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 group-hover:bg-primary group-hover:text-white transition-colors">
                                {q.id || idx + 1}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-50">
                                {q.type || "General"}
                            </Badge>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-base font-medium leading-relaxed mb-4 pl-10 text-slate-800">{q.questionText}</p>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10 mb-4">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`text-sm p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                                opt.startsWith(q.answer) || opt === q.answer // Oddiy tekshirish, keyinchalik murakkabroq qilish mumkin
                                ? "bg-green-50 border-green-200 text-green-900 font-medium" 
                                : "bg-slate-50 border-transparent text-slate-600"
                            }`}>
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    opt.startsWith(q.answer) || opt === q.answer 
                                    ? "bg-green-200 text-green-800"
                                    : "bg-slate-200 text-slate-500"
                                }`}>{String.fromCharCode(65 + i)}</span> 
                                {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Correct Answer Badge */}
                      <div className="ml-10 flex items-center gap-2">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-100/50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            To'g'ri javob: <span className="ml-1 text-emerald-900">{q.answer}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </CardContent>

            {/* ACTION FOOTER */}
            <CardFooter className="p-6 border-t bg-slate-50">
              <div className="w-full flex justify-end gap-4">
                <Button variant="outline" onClick={() => setGeneratedQuestions([])} disabled={isSaving || generatedQuestions.length === 0}>
                  Tozalash
                </Button>
                <Button 
                    size="lg"
                    className="min-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold" 
                    onClick={handleSaveExam}
                    disabled={isSaving || (examType !== 'writing' && generatedQuestions.length === 0)}
                >
                    {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                    Imtihonni Saqlash
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}