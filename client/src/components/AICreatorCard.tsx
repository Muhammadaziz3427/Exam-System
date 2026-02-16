import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Music, ImagePlus, Sparkles, 
  Loader2, CheckCircle2, Trash2, BrainCircuit,
  Type, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface ExtractedQuestion {
  id: number;
  questionText: string;
  options?: string[];
  answer: string;
  type: string; // "multiple-choice", "true-false", "fill-in"
}

export function AICreatorCard() {
  const { toast } = useToast();
  const [sectionType, setSectionType] = useState<"reading" | "listening">("reading");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [images, setImages] = useState<FileList | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedQuestion[]>([]);
  const [examTitle, setExamTitle] = useState("");

  // 1. PDF-ni AI orqali tahlil qilish mutatsiyasi (oldincha saqlangan, chunki AI server-side bo'lishi mumkin)
  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("type", sectionType);

      const res = await fetch("/api/exams/analyze-pdf", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("AI tahlilida xatolik yuz berdi");
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.questions);
      toast({
        title: "Tahlil yakunlandi",
        description: `AI ${data.questions.length} ta savolni aniqladi.`,
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "PDF-ni o'qib bo'lmadi. Fayl formatini tekshiring.",
        variant: "destructive",
      });
    },
  });

  // 2. Tayyor imtihonni bazaga saqlash mutatsiyasi (Supabase ga o'tkazilgan)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Fayllarni Supabase Storage ga yuklash
      let audioUrl = null;
      let imageUrls = [];

      if (audioFile) {
        const { data: audioData, error: audioError } = await supabase.storage
          .from('ielts-assets')
          .upload(`audio/${Date.now()}_${audioFile.name}`, audioFile);
        if (audioError) throw audioError;
        const { data: publicAudioUrl } = supabase.storage.from('ielts-assets').getPublicUrl(audioData.path);
        audioUrl = publicAudioUrl.publicUrl;
      }

      if (images) {
        for (const img of Array.from(images)) {
          const { data: imgData, error: imgError } = await supabase.storage
            .from('ielts-assets')
            .upload(`images/${Date.now()}_${img.name}`, img);
          if (imgError) throw imgError;
          const { data: publicImgUrl } = supabase.storage.from('ielts-assets').getPublicUrl(imgData.path);
          imageUrls.push(publicImgUrl.publicUrl);
        }
      }

      // Exam ma'lumotlarini tayyorlash
      const examData = {
        title: examTitle,
        content: {
          [sectionType]: {
            questions: extractedData.map((q, idx) => ({
              ...q,
              imageUrl: imageUrls[idx] || null  // Har bir savolga mos rasm (agar bo'lsa)
            })),
            audioUrl: audioUrl || null  // Listening uchun audio
          }
        },
        timeLimit: sectionType === 'reading' ? 60 : 30,  // Misol, haqiqiy qiymatni qo'ying
        isPublished: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('exams').insert([examData]).select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast({ title: "Muvaffaqiyatli", description: "Imtihon bazaga saqlandi!" });
      // Reset state
      setExtractedData([]);
      setPdfFile(null);
      setAudioFile(null);
      setImages(null);
      setExamTitle("");
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message || "Saqlashda xato yuz berdi", variant: "destructive" });
    },
  });

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      analyzeMutation.mutate(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">

      {/* CHAP TOMON: SOZLAMALAR VA YUKLASH */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <BrainCircuit size={24} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black italic">AI Generator</CardTitle>
                <CardDescription className="text-slate-400 text-xs uppercase font-bold tracking-tighter">
                  IELTS Smart Builder
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {/* Bo'limni tanlash */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Test turi</Label>
              <Tabs value={sectionType} onValueChange={(v: any) => setSectionType(v)} className="w-full">
                <TabsList className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="reading" className="rounded-lg font-bold text-xs uppercase">Reading</TabsTrigger>
                  <TabsTrigger value="listening" className="rounded-lg font-bold text-xs uppercase">Listening</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Imtihon nomi */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imtihon nomi</Label>
              <div className="relative">
                <Input 
                  placeholder="Masalan: Cambridge 18 Test 1" 
                  className="pl-10 h-12 rounded-xl border-slate-100 focus:ring-blue-500"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                />
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
            </div>

            <hr className="border-slate-50" />

            {/* PDF yuklash (AI) */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Savollar manbasi (PDF)</Label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-6 transition-all ${pdfFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 hover:border-blue-200'}`}>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handlePdfUpload}
                  disabled={analyzeMutation.isPending}
                />
                <div className="flex flex-col items-center text-center gap-2">
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  ) : pdfFile ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  ) : (
                    <FileText className="h-10 w-10 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  )}
                  <p className="text-xs font-bold text-slate-500">
                    {analyzeMutation.isPending ? "AI tahlil qilmoqda..." : pdfFile ? pdfFile.name : "PDF faylni yuklang"}
                  </p>
                </div>
              </div>
            </div>

            {/* Media yuklash (Qo'lda) */}
            <div className="grid grid-cols-1 gap-4">
              {sectionType === "listening" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Audio fayl</Label>
                  <div className="flex gap-2">
                    <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="rounded-xl flex-1" />
                    <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                      <Music size={18} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Diagrammalar/Rasmlar</Label>
                <div className="flex gap-2">
                  <Input type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} className="rounded-xl flex-1" />
                  <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <ImagePlus size={18} />
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
              disabled={saveMutation.isPending || extractedData.length === 0}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
              TESTNI SAQLASH
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* O'NG TOMON: AI NATIJASI (PREVIEW) */}
      <div className="lg:col-span-2">
        <Card className="h-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                <Sparkles className="text-blue-500 fill-blue-500" size={20} />
                AI-Extracted Content
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Savollarni tekshiring va tahrirlang</p>
            </div>
            {extractedData.length > 0 && (
              <Badge className="bg-blue-600 px-4 py-1.5 rounded-full font-black italic shadow-md shadow-blue-100">
                {extractedData.length} Savol topildi
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 p-8">
            {extractedData.length > 0 ? (
              <div className="space-y-4">
                {extractedData.map((q, index) => (
                  <div key={index} className="group p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-6 w-6 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center italic">
                            #{q.id}
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold border-slate-200">
                            {q.type}
                          </Badge>
                        </div>
                        <p className="font-bold text-slate-800 leading-tight mb-4">{q.questionText}</p>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {q.options.map((opt, i) => (
                              <div key={i} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
                                <span className="font-bold mr-2">{String.fromCharCode(65 + i)})</span> {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-emerald-500 italic">Correct Answer:</span>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-black">{q.answer}</span>
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 rounded-xl" onClick={() => {
                        const newData = [...extractedData];
                        newData.splice(index, 1);
                        setExtractedData(newData);
                      }}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 animate-pulse rounded-full" />
                  <BrainCircuit size={100} strokeWidth={1} className="relative z-10 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-black text-xl uppercase tracking-tighter">Hech narsa yo'q</h4>
                  <p className="text-sm font-bold">PDF yuklang va AI sehrini ko'ring</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}