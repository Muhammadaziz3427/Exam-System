import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, CheckCheck, Plus, BookOpen, Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: number;
  title: string;
  content_type?: string;
  time_limit?: number;
}

interface CreatedSession {
  accessCode: string;
  password: string;
}

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePassword() {
  return Math.random().toString(36).substring(2, 10);
}

export default function AdminExams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openExamId, setOpenExamId] = useState<number | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "password" | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const createSession = useMutation({
    mutationFn: async ({ examId, name, email }: { examId: number; name: string; email: string }) => {
      const accessCode = generateAccessCode();
      const password = generatePassword();
      await apiRequest("POST", "/api/sessions/generate", {
        examId,
        studentName: name,
        email: email || null,
        accessCode,
        password,
        status: "created",
        is_used: false,
      });
      return { accessCode, password };
    },
    onSuccess: (data) => {
      setCreatedSession(data);
      setStudentName("");
      setStudentEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Sessiya yaratishda xatolik",
        variant: "destructive",
      });
    },
  });

  const importExam = useMutation({
    mutationFn: async (content: string) => {
      const parsed = JSON.parse(content);
      const title = parsed.title || "Imported Exam";
      await apiRequest("POST", "/api/exams/import", {
        title,
        content: parsed.content || parsed
      });
    },
    onSuccess: () => {
      toast({ title: "Muvaffaqiyatli", description: "Imtihon import qilindi", className: "bg-green-600 text-white" });
      setIsImportModalOpen(false);
      setImportJsonText("");
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message || "Import qilishda xatolik", variant: "destructive" });
    }
  });

  function closeModal() {
    setOpenExamId(null);
    setStudentName("");
    setStudentEmail("");
    setCreatedSession(null);
  }

  function copyToClipboard(text: string, field: "code" | "password") {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Imtihonlar</h1>
            <p className="text-sm text-slate-500 mt-1">Har bir imtihon uchun yangi sessiya yarating va talabaga kodni bering.</p>
          </div>
          <uiKit.Button onClick={() => setIsImportModalOpen(true)} className="gap-2 bg-[#2c3e50] hover:bg-[#1a252f]">
            <Plus size={16} /> Import JSON
          </uiKit.Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            <span>Yuklanmoqda...</span>
          </div>
        ) : !exams || exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BookOpen size={40} className="mb-4 opacity-40" />
            <p className="font-medium">Hech qanday imtihon topilmadi</p>
            <p className="text-sm mt-1">Imtihonlar developer tomonidan qo'shiladi.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                data-testid={`card-exam-${exam.id}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div>
                  <h3 className="font-semibold text-slate-800" data-testid={`text-exam-title-${exam.id}`}>{exam.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ID: {exam.id}
                    {exam.content_type ? ` · ${exam.content_type.toUpperCase()}` : " · JSON"}
                    {exam.time_limit ? ` · ${exam.time_limit} daqiqa` : ""}
                  </p>
                </div>
                <uiKit.Button
                  data-testid={`button-create-session-${exam.id}`}
                  onClick={() => { setOpenExamId(exam.id); setCreatedSession(null); }}
                  className="shrink-0 gap-2"
                >
                  <Plus size={16} />
                  Sessiya yaratish
                </uiKit.Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {openExamId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Yangi sessiya</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {exams?.find(e => e.id === openExamId)?.title}
                </p>
              </div>
              <button
                onClick={closeModal}
                data-testid="button-close-modal"
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {createdSession ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Sessiya muvaffaqiyatli yaratildi</p>
                    <p className="text-sm text-emerald-700">Quyidagi ma'lumotlarni talabaga bering.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Kirish kodi</p>
                        <p className="text-2xl font-black text-slate-800 tracking-widest mt-0.5" data-testid="text-access-code">
                          {createdSession.accessCode}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(createdSession.accessCode, "code")}
                        data-testid="button-copy-code"
                        className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        {copiedField === "code" ? <CheckCheck size={18} className="text-emerald-500" /> : <Copy size={18} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Parol</p>
                        <p className="text-2xl font-black text-slate-800 tracking-widest mt-0.5" data-testid="text-password">
                          {createdSession.password}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(createdSession.password, "password")}
                        data-testid="button-copy-password"
                        className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        {copiedField === "password" ? <CheckCheck size={18} className="text-emerald-500" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  <uiKit.Button
                    variant="outline"
                    className="w-full"
                    onClick={closeModal}
                    data-testid="button-done"
                  >
                    Yopish
                  </uiKit.Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <uiKit.Label htmlFor="student-name">Talaba ismi <span className="text-red-400">*</span></uiKit.Label>
                    <uiKit.Input
                      id="student-name"
                      data-testid="input-student-name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Masalan: Alisher Karimov"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <uiKit.Label htmlFor="student-email">Email (ixtiyoriy)</uiKit.Label>
                    <uiKit.Input
                      id="student-email"
                      data-testid="input-student-email"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="example@mail.com"
                    />
                  </div>

                  <uiKit.Button
                    className="w-full gap-2"
                    disabled={!studentName.trim() || createSession.isPending}
                    onClick={() => createSession.mutate({ examId: openExamId, name: studentName.trim(), email: studentEmail.trim() })}
                    data-testid="button-submit-create-session"
                  >
                    {createSession.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Yaratilmoqda...</>
                    ) : (
                      <><Plus size={16} /> Sessiya yaratish</>
                    )}
                  </uiKit.Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-bold text-slate-800 text-lg">JSON fayldan import qilish</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <uiKit.Textarea 
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="JSON formatidagi imtihon ma'lumotlarini bu yerga joylashtiring..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0 flex justify-end gap-3">
              <uiKit.Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Bekor qilish</uiKit.Button>
              <uiKit.Button 
                onClick={() => {
                  try {
                    JSON.parse(importJsonText);
                    importExam.mutate(importJsonText);
                  } catch(e) {
                    toast({ title: "Xato", description: "Yaroqsiz JSON format", variant: "destructive" });
                  }
                }}
                disabled={importExam.isPending || !importJsonText.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importExam.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Import qilish
              </uiKit.Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
