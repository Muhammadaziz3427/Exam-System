import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileSearch } from "lucide-react";
import { AssessmentBreakdown } from "@/components/AssessmentBreakdown";

export default function StudentDetailedResults() {
  const { id } = useParams<{ id: string }>();

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

  if (sessionLoading || submissionLoading || examLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin size-8 text-primary" />
      </div>
    );
  }

  if (!session || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Result Not Found</h1>
        <p className="text-slate-500 mt-2">We couldn't find the detailed results for this session.</p>
      </div>
    );
  }

  const assessment = submission?.grading?.advancedAssessment;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detailed Performance Report</h1>
          <p className="text-slate-500 font-medium">Student: {session.studentName}</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Automated Assessment Breakdown */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileSearch className="text-purple-500" />
                Listening & Reading Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="listening" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                  <TabsTrigger value="listening" className="rounded-md px-8">Listening</TabsTrigger>
                  <TabsTrigger value="reading" className="rounded-md px-8">Reading</TabsTrigger>
                </TabsList>
                <TabsContent value="listening" className="mt-6">
                  <AssessmentBreakdown 
                    examContent={exam?.content} 
                    answers={submission?.answers} 
                    section="listening" 
                  />
                </TabsContent>
                <TabsContent value="reading" className="mt-6">
                  <AssessmentBreakdown 
                    examContent={exam?.content} 
                    answers={submission?.answers} 
                    section="reading" 
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Writing & Speaking Feedback */}
          {assessment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Writing Feedback */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                  <CardTitle className="text-xl font-bold border-l-4 border-blue-500 pl-3">Writing Assessment</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {['task1', 'task2'].map((task) => (
                    <div key={task} className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-bold uppercase text-xs text-slate-500 tracking-wider">
                        {task === 'task1' ? 'Task 1' : 'Task 2'}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'taskResponse', label: 'Task Response' },
                          { id: 'coherenceCohesion', label: 'Coherence & Cohesion' },
                          { id: 'lexicalResource', label: 'Lexical Resource' },
                          { id: 'grammaticalRange', label: 'Grammatical Range' }
                        ].map((criteria) => (
                          <div key={criteria.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-200/50 last:border-0">
                            <span className="text-slate-600 font-medium">{criteria.label}</span>
                            <span className="font-bold text-slate-900">{assessment.writing?.[task]?.[criteria.id] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Speaking Feedback */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                  <CardTitle className="text-xl font-bold border-l-4 border-emerald-500 pl-3">Speaking Assessment</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    {[
                      { id: 'fluency', label: 'Fluency' },
                      { id: 'lexicalResource', label: 'Lexical Resource' },
                      { id: 'grammaticalRange', label: 'Grammatical Range' },
                      { id: 'pronunciation', label: 'Pronunciation' }
                    ].map((criteria) => (
                      <div key={criteria.id} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                        <span className="text-slate-600 font-medium">{criteria.label}</span>
                        <span className="font-bold text-lg text-slate-900">{assessment.speaking?.[criteria.id] || 0}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostic Feedback */}
              <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                  <CardTitle className="text-xl font-bold border-l-4 border-amber-500 pl-3">Diagnostic Feedback</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {assessment.diagnosticFeedback || "No additional feedback provided."}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
