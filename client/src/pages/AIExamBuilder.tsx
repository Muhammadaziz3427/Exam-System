import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Textarea qo'shildi
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Upload, 
  FileText, 
  Music, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, // Rasm ikonka
  PenTool,
  Save
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function AIExamBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // --- STATES ---
  const [title, setTitle] = useState("");
  // Type ga 'writing' qo'shildi
  const [examType, setExamType] = useState<"reading" | "listening" | "writing">("reading");

  // Files
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [task1Image, setTask1Image] = useState<File | null>(null); // Writing Task 1 rasm uchun

  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  // Writing uchun maxsus state (agar PDF dan o'qimasa, qo'lda yozish uchun)
  const [writingTasks, setWritingTasks] = useState({
    task1Prompt: "",
    task2Prompt: ""
  });

  // --- 1. AI TAHLIL QILISH (PDF) ---
  const handleAnalyzePDF = async () => {
    if (!pdfFile || !title) {
      toast({ title: "Diqqat", description: "Sarlavha va PDF faylni kiriting", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("type", examType); // AI ga qaysi tur ekanligini aytamiz

    try {
      // API endpointingizga so'rov (backend logikasi shunga mos bo'lishi kerak)
      const res = await fetch("/api/exams/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("AI tahlilida xatolik");

      const data = await res.json();

      if (examType === 'writing') {
        // Agar writing bo'lsa, promptlarni alohida statega olamiz
        setWritingTasks({
          task1Prompt: data.task1 || "Write a report describing the information in the chart...",
          task2Prompt: data.task2 || "Write an essay on the following topic..."
        });
        toast({ title: "Muvaffaqiyatli", description: "Writing mavzulari aniqlandi!" });
      } else {
        // Reading/Listening
        setGeneratedQuestions(data.questions);
        toast({ title: "Muvaffaqiyatli", description: `AI ${data.questions.length} ta savolni ajratib oldi!` });
      }

    } catch (error) {
      toast({ title: "Xato", description: "PDF-ni o'qib bo'lmadi yoki server xatosi", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- 2. BAZAGA SAQLASH ---
  const handleSaveExam = async () => {
    if (!title) return toast({ title: "Xato", description: "Imtihon nomini kiriting", variant: "destructive" });

    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("type", examType);

    // Fayllarni qo'shish
    if (pdfFile) formData.append("pdf", pdfFile); // Asosiy manba
    if (audioFile && examType === 'listening') formData.append("audio", audioFile);
    if (task1Image && examType === 'writing') formData.append("task1Image", task1Image);

    // Ma'lumotlarni JSON shaklida qo'shish
    let contentPayload = [];
    if (examType === 'writing') {
      contentPayload = [
        { id: 1, type: 'task_1', questionText: writingTasks.task1Prompt },
        { id: 2, type: 'task_2', questionText: writingTasks.task2Prompt }
      ];
    } else {
      contentPayload = generatedQuestions;
    }

    formData.append("questions", JSON.stringify(contentPayload));

    try {
      const res = await fetch("/api/exams/save", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Saqlashda xatolik");

      toast({ title: "Saqlandi", description: "Imtihon muvaffaqiyatli yaratildi!" });
      setLocation("/admin/exams");
    } catch (error) {
      toast({ title: "Xato", description: "Imtihonni saqlab bo'lmadi", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
           <Badge variant="outline" className="h-8 w-8 p-0 flex justify-center items-center bg-primary text-primary-foreground rounded-lg">AI</Badge> 
           Exam Builder
        </h1>
        <p className="text-muted-foreground">PDF yoki rasmlarni yuklang, AI sizga to'liq IELTS formatidagi testni tayyorlab beradi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- CHAP TOMON: SOZLAMALAR --- */}
        <Card className="lg:col-span-1 h-fit shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool size={18} /> Sozlamalar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* 1. Nomi */}
            <div className="space-y-2">
              <Label>Imtihon nomi</Label>
              <Input 
                placeholder="Masalan: Cambridge 18 - Test 1" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-muted/30"
              />
            </div>

            {/* 2. Turi */}
            <div className="space-y-2">
              <Label>Imtihon turi</Label>
              <Select value={examType} onValueChange={(v: any) => setExamType(v)}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading"><div className="flex items-center gap-2"><FileText size={14}/> Reading</div></SelectItem>
                  <SelectItem value="listening"><div className="flex items-center gap-2"><Music size={14}/> Listening</div></SelectItem>
                  <SelectItem value="writing"><div className="flex items-center gap-2"><ImageIcon size={14}/> Writing</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Fayl Yuklash mantiqlari */}
            <div className="space-y-4 pt-2 border-t">

              {/* PDF Upload - Hamma tur uchun kerak (savollarni o'qish uchun) */}
              <div className="space-y-2">
                <Label className="flex justify-between">
                  <span>Savollar fayli (PDF)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Majburiy</span>
                </Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:bg-accent/50 ${pdfFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                  <input 
                    id="pdf-upload" 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                  <FileText className={`mx-auto h-8 w-8 mb-2 ${pdfFile ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium block truncate">
                    {pdfFile ? pdfFile.name : "PDF faylni tanlang"}
                  </span>
                </div>
              </div>

              {/* Listening Audio Upload */}
              {examType === "listening" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Audio trek (.mp3)</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${audioFile ? 'border-green-500 bg-green-50' : 'border-muted-foreground/25'}`}
                    onClick={() => document.getElementById('audio-upload')?.click()}
                  >
                    <input 
                      id="audio-upload" 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    />
                    <Music className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs block truncate">
                      {audioFile ? audioFile.name : "Audio yuklash"}
                    </span>
                  </div>
                </div>
              )}

              {/* Writing Task 1 Image Upload */}
              {examType === "writing" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Task 1 Diagramma/Rasm</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${task1Image ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/25'}`}
                    onClick={() => document.getElementById('task1-upload')?.click()}
                  >
                    <input 
                      id="task1-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => setTask1Image(e.target.files?.[0] || null)}
                    />
                    {task1Image ? (
                        <div className="relative h-20 w-full">
                            <img src={URL.createObjectURL(task1Image)} alt="Preview" className="h-full w-full object-contain" />
                        </div>
                    ) : (
                        <>
                            <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs block">Rasm yuklash (Task 1)</span>
                        </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button 
              className="w-full font-bold" 
              onClick={handleAnalyzePDF} 
              disabled={isAnalyzing || !pdfFile}
              variant="secondary"
            >
              {isAnalyzing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tahlil qilinmoqda...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> AI Tahlilni Boshlash</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* --- O'NG TOMON: PREVIEW --- */}
        <Card className="lg:col-span-2 shadow-lg min-h-[500px] flex flex-col">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Imtihon Ko'rinishi</CardTitle>
                    <CardDescription>Generatsiya qilingan savollar shu yerda ko'rinadi</CardDescription>
                </div>
                {examType !== 'writing' && (
                    <Badge variant="secondary" className="text-xs">
                        {generatedQuestions.length} ta savol
                    </Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-6">

            {/* Loading State */}
            {isAnalyzing && (
              <div className="space-y-6 py-12 px-8">
                <div className="space-y-2 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Hujjat o'rganilmoqda...</h3>
                    <p className="text-sm text-muted-foreground">AI savol turlarini (TFNG, Multiple Choice, Matching) aniqlayapti.</p>
                </div>
                <Progress value={66} className="w-full h-2" />
              </div>
            )}

            {/* Empty State */}
            {!isAnalyzing && generatedQuestions.length === 0 && examType !== 'writing' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 min-h-[300px]">
                <div className="bg-muted p-4 rounded-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p>PDF yuklang va tahlil tugmasini bosing</p>
              </div>
            )}

            {/* WRITING PREVIEW & EDIT */}
            {!isAnalyzing && examType === 'writing' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-bold text-blue-700">Writing Task 1</Label>
                        <Badge variant="outline">150 words</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {task1Image && (
                              <div className="md:col-span-1 border rounded-lg overflow-hidden bg-slate-50">
                                  <img src={URL.createObjectURL(task1Image)} alt="Task 1" className="w-full h-auto object-cover" />
                              </div>
                          )}
                          <Textarea 
                              className={`md:col-span-${task1Image ? '2' : '3'} min-h-[120px]`}
                              placeholder="Task 1 topshirig'i (Prompt)... Masalan: The chart below shows..."
                              value={writingTasks.task1Prompt}
                              onChange={(e) => setWritingTasks({...writingTasks, task1Prompt: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-bold text-orange-700">Writing Task 2</Label>
                        <Badge variant="outline">250 words</Badge>
                      </div>
                      <Textarea 
                          className="min-h-[120px] text-base"
                          placeholder="Task 2 Essay mavzusi... Masalan: Some people believe that..."
                          value={writingTasks.task2Prompt}
                          onChange={(e) => setWritingTasks({...writingTasks, task2Prompt: e.target.value})}
                      />
                  </div>
               </div>
            )}

            {/* READING / LISTENING PREVIEW */}
            {!isAnalyzing && generatedQuestions.length > 0 && examType !== 'writing' && (
              <div className="space-y-4">
                <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {generatedQuestions.map((q, idx) => (
                    <div key={idx} className="group p-4 border rounded-xl bg-card hover:bg-accent/5 transition-colors relative">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {q.id || idx + 1}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider opacity-70">
                                {q.type || "General"}
                            </Badge>
                        </div>
                      </div>

                      <p className="text-sm font-medium leading-relaxed mb-3 pl-8 text-foreground/90">{q.questionText}</p>

                      {/* Options (Multiple Choice uchun) */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 mb-3">
                          {q.options.map((opt: string, i: number) => (
                            <div key={i} className="text-xs p-2 bg-muted/40 rounded-md border border-transparent hover:border-muted-foreground/20 flex items-center gap-2">
                                <span className="font-bold text-muted-foreground">{String.fromCharCode(65 + i)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="ml-8 pt-2 flex items-center gap-2">
                        <div className="flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            Answer: {q.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
          <div className="p-6 border-t bg-muted/10">
            <Button 
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20" 
                onClick={handleSaveExam}
                disabled={isSaving || (examType !== 'writing' && generatedQuestions.length === 0)}
            >
                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Imtihonni Tasdiqlash va Saqlash
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}