import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter"; // useLocation qo'shildi
import { useEffect } from "react"; // useEffect qo'shildi
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileSearch, GraduationCap, MessageSquare, PenTool, LayoutDashboard, ChevronRight } from "lucide-react";
import { AssessmentBreakdown } from "@/components/AssessmentBreakdown";
import { Badge } from "@/components/ui/badge";

export default function StudentDetailedResults() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation(); // Navigatsiya uchun

  const { data: session, isLoading: sessionLoading } = useQuery<any>({
    queryKey: [`/api/sessions/${id}`],
    enabled: !!id,
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<any>({
    queryKey: [`/api/sessions/${id}/submission`],
    enabled: !!id,
  });

  const { data: exam, isLoading: examLoading } = useQuery<any>({
    queryKey: [`/api/exams/${session?.examId}`],
    enabled: !!session?.examId,
  });

  // AVTOMATIK YO'NALTIRISH (REDIRECT) MANTIQI
  useEffect(() => {
    if (!sessionLoading && session) {
      // 1. Agar test hali davom etayotgan bo'lsa, natijalar sahifasiga ruxsat bermaslik
      if (session.status === "active") {
        setLocation(`/exam/${id}`);
      }

      // 2. Agar test tugagan bo'lsa va siz uni chiqarib yubormoqchi bo'lsangiz:
      // (Masalan, test tugashi bilan Dashboardga yuborish)
      /* if (session.status === "completed") {
         setLocation("/"); 
      } 
      */
    }
  }, [session, sessionLoading, id, setLocation]);

  if (sessionLoading || submissionLoading || examLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Natijalar tahlil qilinmoqda...</p>
      </div>
    );
  }

  if (!session || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <FileSearch className="text-red-500 size-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Natija topilmadi</h1>
        <p className="text-slate-500 mt-2 max-w-sm">Ushbu sessiya uchun batafsil ma'lumotlar hali shakllantirilmagan yoki mavjud emas.</p>
      </div>
    );
  }

  const assessment = submission?.grading?.advancedAssessment;
  const advancedAnalysis = submission?.grading?.advanced_analysis;

  const hasAssessment = assessment && 
    (assessment.writing?.task1?.taskResponse !== undefined || 
     assessment.speaking?.fluency !== undefined ||
     assessment.diagnosticFeedback);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* TOP HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <GraduationCap className="text-white size-7" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">IELTS Performance Report</h1>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                Candidate: <span className="text-blue-600 font-bold">{session.studentName}</span>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex border-slate-200 text-slate-500 gap-1 px-3 py-1">
            <LayoutDashboard size={14} /> Overall Analysis
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* L&R SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-4 w-1 bg-purple-500 rounded-full" />
            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-[0.15em]">Automated Analysis</h2>
          </div>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Tabs defaultValue="listening" className="w-full">
                <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-3">
                    <FileSearch className="text-purple-500 size-6" />
                    <h3 className="text-lg font-bold text-slate-800">Listening & Reading</h3>
                  </div>
                  <TabsList className="bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="listening" className="rounded-lg px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Listening</TabsTrigger>
                    <TabsTrigger value="reading" className="rounded-lg px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Reading</TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-6">
                  <TabsContent value="listening" className="mt-0 focus-visible:outline-none">
                    <AssessmentBreakdown examContent={exam?.content} answers={submission?.answers} section="listening" />
                  </TabsContent>
                  <TabsContent value="reading" className="mt-0 focus-visible:outline-none">
                    <AssessmentBreakdown examContent={exam?.content} answers={submission?.answers} section="reading" />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* W&S SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-4 w-1 bg-blue-500 rounded-full" />
            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-[0.15em]">Expert Evaluation</h2>
          </div>

          {hasAssessment ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Writing Card */}
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl"><PenTool className="text-blue-600 size-5" /></div>
                    <CardTitle className="text-lg font-bold">Writing Assessment</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {['task1', 'task2'].map((task) => (
                    <div key={task} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{task === 'task1' ? 'Task 1 Report' : 'Task 2 Essay'}</span>
                        <div className="h-[1px] flex-1 mx-4 bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'taskResponse', label: 'Task Response' },
                          { id: 'coherenceCohesion', label: 'Coherence & Cohesion' },
                          { id: 'lexicalResource', label: 'Lexical Resource' },
                          { id: 'grammaticalRange', label: 'Grammatical Range' }
                        ].map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="text-sm font-semibold text-slate-600">{c.label}</span>
                            <span className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-bold text-blue-700 shadow-sm border border-slate-200/50">
                              {assessment.writing?.[task]?.[c.id] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Speaking Card */}
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl"><MessageSquare className="text-emerald-600 size-5" /></div>
                    <CardTitle className="text-lg font-bold">Speaking Assessment</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2 mb-6">
                    {[
                      { id: 'fluency', label: 'Fluency & Coherence' },
                      { id: 'lexicalResource', label: 'Lexical Resource' },
                      { id: 'grammaticalRange', label: 'Grammatical Range' },
                      { id: 'pronunciation', label: 'Pronunciation' }
                    ].map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-emerald-50/20">
                        <span className="text-sm font-bold text-slate-700">{c.label}</span>
                        <span className="text-xl font-black text-emerald-600">{assessment.speaking?.[c.id] || 0}</span>
                      </div>
                    ))}
                  </div>

                  {advancedAnalysis?.speaking && (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <h4 className="text-[10px] font-black text-emerald-700 uppercase mb-3 tracking-widest">Feedback</h4>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium italic">
                        "{typeof advancedAnalysis.speaking === 'string' ? advancedAnalysis.speaking : 'Batafsil tahlil mavjud'}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Diagnostic Feedback (Full Width) */}
              <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <GraduationCap className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Expert Diagnostic Feedback</h3>
                      <p className="text-slate-400 text-xs">Overall strengths and areas for improvement</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-slate-200 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                    {assessment.diagnosticFeedback || "No additional feedback provided."}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Pending State */
            <Card className="border-none shadow-sm bg-white rounded-3xl p-12">
              <CardContent className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-500 size-10" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-black text-slate-900">Assessment in Progress</h3>
                  <p className="text-slate-500 mt-2">
                    Writing va Speaking qismlari bizning mutaxassislarimiz tomonidan ko'rib chiqilmoqda. 
                    Natijalar tayyor bo'lishi bilan sizga xabar beriladi.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}