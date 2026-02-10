import { AdminLayout } from "@/components/layout/AdminLayout";
import * as uiKit from "@/components/ui-kit";
import { useSessions } from "@/hooks/use-sessions";
import { useState, useMemo } from "react"; // useEffect olib tashlandi
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  FileSearch, 
  Search, 
  Headphones, 
  BookOpen, 
  PenTool, 
  Mic2, 
  BarChart3, 
  Trash2, 
  AlertTriangle 
} from "lucide-react"; 
// Ishlatilmagan ChevronRight, CheckCircle2, XCircle, Clock, Save olib tashlandi

export function AdminDetailedAssessment() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const { toast } = useToast();

  const { data: submission, isLoading: submissionLoading } = useQuery<any>({
    queryKey: [`/api/sessions/${selectedSessionId}/submission`],
    enabled: !!selectedSessionId,
  });

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  // --- O'CHIRISH MUTATSIYASI ---
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSessionId(null);
      toast({
        title: "O'chirildi",
        description: "Sessiya muvaffaqiyatli o'chirildi.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "O'chirishda xatolik yuz berdi.",
        variant: "destructive",
      });
    }
  });

  // O'chirishni tasdiqlash funksiyasi (AlertDialog xatosi uchun muqobil)
  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`${name}ning barcha natijalarini o'chirib tashlamoqchimisiz?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter((s: any) => 
      s.studentName?.toLowerCase().includes(term) || s.accessCode?.toLowerCase().includes(term)
    );
  }, [searchTerm, sessions]);

  if (sessionsLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-blue-600 size-10" />
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Admin Explorer</h2>
            <p className="text-slate-500 font-medium">Result Management</p>
          </div>

          {selectedSession && (
             <div className="flex items-center gap-4">
                <div className="bg-blue-50 px-6 py-2 rounded-2xl border border-blue-100 text-center">
                   <p className="text-[10px] font-black text-blue-400 uppercase">Overall Band</p>
                   <p className="text-xl font-black text-blue-700">{selectedSession?.overallBand || "N/A"}</p>
                </div>

                <uiKit.Button 
                  variant="destructive" 
                  className="h-12 rounded-2xl gap-2 px-6 font-bold shadow-lg shadow-red-100 transition-all hover:scale-105 active:scale-95"
                  onClick={() => handleDelete(selectedSession.id, selectedSession.studentName)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="animate-spin size-4" /> : <Trash2 size={18} />}
                  Delete Session
                </uiKit.Button>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <uiKit.Card className="lg:col-span-3 border-none shadow-xl rounded-[2.5rem] bg-white h-[82vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <uiKit.Input 
                  placeholder="Search student..." 
                  className="pl-11 rounded-2xl h-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredSessions.map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full text-left p-5 rounded-[1.5rem] transition-all ${
                    selectedSessionId === session.id 
                      ? "bg-slate-900 text-white shadow-xl scale-[1.02]" 
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="font-bold text-sm truncate">{session.studentName}</div>
                  <div className="text-[10px] opacity-60 mt-1 uppercase">{session.accessCode}</div>
                </button>
              ))}
            </div>
          </uiKit.Card>

          {/* Results Area */}
          <div className="lg:col-span-9">
            {!selectedSessionId ? (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                <FileSearch size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold">Select a student from the sidebar</p>
              </div>
            ) : submissionLoading ? (
              <div className="h-full flex items-center justify-center bg-white rounded-[3rem]">
                <Loader2 className="animate-spin size-12 text-blue-600" />
              </div>
            ) : (
              <uiKit.Tabs defaultValue="overview" className="w-full space-y-6">
                <uiKit.TabsList className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 flex gap-2 h-auto w-fit">
                  <uiKit.TabsTrigger value="overview" className="px-6 py-3 rounded-2xl font-bold">
                    <BarChart3 size={18} className="mr-2" /> Overview
                  </uiKit.TabsTrigger>
                  <uiKit.TabsTrigger value="listening" className="px-6 py-3 rounded-2xl font-bold">
                    <Headphones size={18} className="mr-2" /> L
                  </uiKit.TabsTrigger>
                  <uiKit.TabsTrigger value="reading" className="px-6 py-3 rounded-2xl font-bold">
                    <BookOpen size={18} className="mr-2" /> R
                  </uiKit.TabsTrigger>
                  <uiKit.TabsTrigger value="writing" className="px-6 py-3 rounded-2xl font-bold">
                    <PenTool size={18} className="mr-2" /> W
                  </uiKit.TabsTrigger>
                  <uiKit.TabsTrigger value="speaking" className="px-6 py-3 rounded-2xl font-bold">
                    <Mic2 size={18} className="mr-2" /> S
                  </uiKit.TabsTrigger>
                </uiKit.TabsList>

                <uiKit.TabsContent value="overview">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {['listening', 'reading', 'writing', 'speaking'].map(m => (
                        <div key={m} className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50">
                           <p className="text-xs font-black uppercase text-slate-400 mb-2">{m}</p>
                           <p className="text-4xl font-black text-slate-900">
                             {submission?.grading?.[m]?.bandScore || "0.0"}
                           </p>
                        </div>
                      ))}
                   </div>
                </uiKit.TabsContent>

                <uiKit.TabsContent value="writing">
                   <div className="space-y-6">
                      {['task1', 'task2'].map(task => (
                        <uiKit.Card key={task} className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white">
                           <div className="flex justify-between items-center mb-6">
                              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">{task} Response</h4>
                              <uiKit.Badge variant="outline" className="rounded-xl px-4 py-1 border-blue-100 text-blue-600 font-bold">
                                Band: {submission?.grading?.advancedAssessment?.writing?.[task]?.overall || "N/A"}
                              </uiKit.Badge>
                           </div>
                           <p className="text-lg font-serif text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-8 rounded-3xl border border-slate-100 italic">
                             {submission?.answers?.[task] || "No content found."}
                           </p>
                        </uiKit.Card>
                      ))}
                   </div>
                </uiKit.TabsContent>
              </uiKit.Tabs>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDetailedAssessment;