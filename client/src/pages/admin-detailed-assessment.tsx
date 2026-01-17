import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from "@/components/ui-kit";
import { useSessions } from "@/hooks/use-sessions";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function AdminDetailedAssessment() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: [`/api/sessions/${selectedSessionId}/submission`],
    enabled: !!selectedSessionId,
  });

  const [assessment, setAssessment] = useState<any>({
    writing: {
      task1: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 },
      task2: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 }
    },
    speaking: { fluency: 0, lexicalResource: 0, grammaticalRange: 0, pronunciation: 0 },
    diagnosticFeedback: ""
  });

  useEffect(() => {
    if (submission?.grading?.advancedAssessment) {
      setAssessment(submission.grading.advancedAssessment);
    } else {
      setAssessment({
        writing: {
          task1: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 },
          task2: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 }
        },
        speaking: { fluency: 0, lexicalResource: 0, grammaticalRange: 0, pronunciation: 0 },
        diagnosticFeedback: ""
      });
    }
  }, [submission]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/sessions/${selectedSessionId}/advanced-assessment`, { assessment: data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${selectedSessionId}/submission`] });
      toast({ title: "Muvaffaqiyatli", description: "Assessment saqlandi" });
    }
  });

  const handleScoreChange = (module: string, task: string | null, criterion: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAssessment((prev: any) => {
      const next = { ...prev };
      if (task) {
        next[module][task][criterion] = numValue;
      } else {
        next[module][criterion] = numValue;
      }
      return next;
    });
  };

  const handleFeedbackChange = (value: string) => {
    setAssessment((prev: any) => ({ ...prev, diagnosticFeedback: value }));
  };

  if (sessionsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Detailed Assessment</h2>
          <p className="text-slate-500 font-medium">Advanced grading based on official IELTS criteria.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Talabalar</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {sessions.map((session: any) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setAssessment(null); // Reset to trigger re-init or just use useEffect
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedSessionId === session.id ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold">{session.studentName}</div>
                    <div className="text-[10px] opacity-70">{session.accessCode}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            {!selectedSessionId ? (
              <Card className="h-full flex items-center justify-center p-12 border-dashed border-2">
                <p className="text-slate-400 font-medium">Baholash uchun talabani tanlang</p>
              </Card>
            ) : submissionLoading ? (
              <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                      {selectedSession?.studentName} - Grading
                    </CardTitle>
                    <Button 
                      onClick={() => mutation.mutate(assessment)} 
                      disabled={mutation.isPending}
                      className="gap-2"
                    >
                      {mutation.isPending ? <Loader2 className="animate-spin size-4" /> : <Save size={16} />}
                      Saqlash
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-8 p-6">
                    {/* Writing Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-black border-l-4 border-blue-500 pl-3">Writing Assessment</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['task1', 'task2'].map((task) => (
                          <div key={task} className="space-y-3 p-4 bg-slate-50 rounded-xl">
                            <h4 className="font-bold uppercase text-xs text-slate-500 tracking-wider">
                              {task === 'task1' ? 'Task 1' : 'Task 2'}
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {[
                                { id: 'taskResponse', label: 'Task Response' },
                                { id: 'coherenceCohesion', label: 'Coherence & Cohesion' },
                                { id: 'lexicalResource', label: 'Lexical Resource' },
                                { id: 'grammaticalRange', label: 'Grammatical Range' }
                              ].map((criteria) => (
                                <div key={criteria.id} className="flex items-center justify-between gap-4">
                                  <label className="text-sm font-medium text-slate-700">{criteria.label}</label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    className="w-20 bg-white"
                                    value={assessment?.writing?.[task]?.[criteria.id] || 0}
                                    onChange={(e) => handleScoreChange('writing', task, criteria.id, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Speaking Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-black border-l-4 border-emerald-500 pl-3">Speaking Assessment</h3>
                      <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'fluency', label: 'Fluency' },
                          { id: 'lexicalResource', label: 'Lexical Resource' },
                          { id: 'grammaticalRange', label: 'Grammatical Range' },
                          { id: 'pronunciation', label: 'Pronunciation' }
                        ].map((criteria) => (
                          <div key={criteria.id} className="flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-slate-700">{criteria.label}</label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="9"
                              className="w-20 bg-white"
                              value={assessment?.speaking?.[criteria.id] || 0}
                              onChange={(e) => handleScoreChange('speaking', null, criteria.id, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-black border-l-4 border-amber-500 pl-3">Diagnostic Feedback</h3>
                      <Textarea
                        placeholder="Talaba uchun mustaqil feedback kiriting..."
                        className="min-h-[150px] bg-slate-50 border-none resize-none"
                        value={assessment?.diagnosticFeedback || ""}
                        onChange={(e) => handleFeedbackChange(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
