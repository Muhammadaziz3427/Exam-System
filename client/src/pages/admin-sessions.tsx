import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, Button, Input, Label, Badge } from "@/components/ui-kit"; 
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { Loader2, RefreshCw, UserPlus, AlertCircle, Clock, Eye, Bold, Italic, Send, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminSessions() {
  const { data: sessions, isLoading, refetch } = useSessions();
  const { data: exams } = useExams();
  const createSession = useCreateSession();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const { toast } = useToast();

  const { data: allViolations } = useQuery({
    queryKey: ['/api/violations'],
    queryFn: async () => {
      const res = await fetch('/api/violations');
      return res.json();
    },
    refetchInterval: 5000 // Poll every 5s
  });

  const handleWritingFormatting = (type: 'bold' | 'italic') => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      if (type === 'bold') span.style.fontWeight = 'bold';
      if (type === 'italic') span.style.fontStyle = 'italic';
      span.className = type === 'bold' ? 'text-primary' : 'text-secondary';
      range.surroundContents(span);
    }
  };

  // Generator State
  const [studentName, setStudentName] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;

    // Generate random secure code
    const randomCode = `TEST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const randomPass = Math.random().toString(36).slice(-8);

    await createSession.mutateAsync({
      studentName,
      examId: parseInt(selectedExamId),
      accessCode: randomCode,
      password: randomPass
    });
    
    setStudentName("");
    alert(`Generated!\nCode: ${randomCode}\nPassword: ${randomPass}`);
  };

  const handleRelease = async (sessionId: number) => {
    setIsReleasing(true);
    try {
      await apiRequest("POST", `/api/sessions/${sessionId}/release`, {});
      toast({
        title: "Results Released",
        description: "The results have been approved and emailed to the student.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSubmission(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to release results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <AdminLayout>
       <div className="flex flex-col lg:flex-row gap-6">
         {/* Left Column: Generator and Active List */}
         <div className="flex-1 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <UserPlus size={24} />
                  <h3 className="text-lg font-bold">Generate Access</h3>
                </div>
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Student Name</Label>
                    <Input value={studentName} onChange={(e: any) => setStudentName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Exam</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={selectedExamId}
                      onChange={(e: any) => setSelectedExamId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Exam --</option>
                      {exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full" disabled={createSession.isPending}>
                      {createSession.isPending ? "Generating..." : "Generate Code"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold">Live Monitor</h2>
             <Button variant="outline" size="sm" onClick={() => refetch()}>
               <RefreshCw size={14} className="mr-2" /> Refresh
             </Button>
           </div>

           {isLoading ? (
             <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
           ) : (
             <div className="space-y-4">
               {sessions?.map((session: any) => (
                 <div 
                    key={session.id} 
                    className={`
                      p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between
                      ${session.status === 'in_progress' ? 'border-l-4 border-l-green-500 ring-1 ring-green-100' : ''}
                    `}
                 >
                   <div>
                     <div className="flex items-center gap-2">
                       <h4 className="font-bold text-slate-900">{session.studentName}</h4>
                       <Badge variant={
                         session.status === 'in_progress' ? 'success' : 
                         session.status === 'completed' ? 'secondary' : 'warning'
                       }>
                         {session.status.replace('_', ' ')}
                       </Badge>
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">
                       Exam ID: {session.examId} • Code: <span className="font-mono bg-slate-100 px-1 rounded">{session.accessCode}</span>
                     </p>
                   </div>
                   
                   <div className="flex items-center gap-2">
                     {session.status === 'in_progress' && (
                       <span className="flex items-center gap-1 text-green-600 font-medium animate-pulse text-xs mr-4">
                         <span className="w-2 h-2 rounded-full bg-green-600"/>
                         Active Now
                       </span>
                     )}
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => setSelectedSubmission(session)}
                     >
                       <Eye size={16} />
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>

         {/* Right Column: Violation Stream */}
         <div className="w-full lg:w-80">
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6 text-destructive">
                  <AlertCircle size={20} />
                  <h3 className="text-lg font-bold">Violations</h3>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {allViolations?.length === 0 && (
                    <p className="text-center text-slate-400 text-sm italic py-8">No violations recorded.</p>
                  )}
                  {allViolations?.map((v: any) => {
                    const session = sessions?.find((s: any) => s.id === v.sessionId);
                    return (
                      <div key={v.id} className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-red-900">{session?.studentName || "Unknown"}</span>
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                            <Clock size={10} />
                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-red-700 uppercase tracking-tight">
                          {v.type.replace('_', ' ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
         </div>
       </div>

       {selectedSubmission && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Submission: {selectedSubmission.studentName}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Writing Task Response</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleWritingFormatting('bold')} className="gap-1">
                        <Bold size={14} /> Bold
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleWritingFormatting('italic')} className="gap-1">
                        <Italic size={14} /> Italic
                      </Button>
                    </div>
                  </div>
                  <div 
                    className="bg-white p-6 rounded border font-serif text-lg leading-relaxed min-h-[300px] whitespace-pre-wrap focus:outline-none"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    Select student text and use the tools above to highlight errors. This editor allows bolding and italicizing parts of the student's writing to provide clear feedback.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 border-l-4 border-l-primary">
                    <h4 className="font-bold mb-1 text-sm text-slate-500 uppercase tracking-wider">Listening Score</h4>
                    <p className="text-3xl font-bold text-slate-900">-- / 40</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-primary">
                    <h4 className="font-bold mb-1 text-sm text-slate-500 uppercase tracking-wider">Reading Score</h4>
                    <p className="text-3xl font-bold text-slate-900">{selectedSubmission.readingScore || "--"} / 40</p>
                  </Card>
                </div>

                {selectedSubmission.status === 'graded' && !selectedSubmission.resultsReleased && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={() => handleRelease(selectedSubmission.id)} 
                      disabled={isReleasing}
                      className="gap-2"
                    >
                      {isReleasing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Approve & Release Results
                    </Button>
                  </div>
                )}

                {selectedSubmission.resultsReleased && (
                  <div className="flex items-center gap-2 text-green-600 font-medium justify-center p-4 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle size={20} />
                    Results have been released and emailed
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
    </AdminLayout>
  );
}
