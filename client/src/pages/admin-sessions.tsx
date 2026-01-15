import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, Button, Input, Label, Badge, Select } from "@/components/ui-kit"; // Assume Select exists or use HTML select
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";

export default function AdminSessions() {
  const { data: sessions, isLoading, refetch } = useSessions();
  const { data: exams } = useExams();
  const createSession = useCreateSession();

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

  return (
    <AdminLayout>
       <div className="flex flex-col md:flex-row gap-6">
         {/* Generator Panel */}
         <div className="w-full md:w-1/3">
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <UserPlus size={24} />
                  <h3 className="text-lg font-bold">Generate Access</h3>
                </div>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Student Name</Label>
                    <Input value={studentName} onChange={e => setStudentName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Exam</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={selectedExamId}
                      onChange={e => setSelectedExamId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Exam --</option>
                      {exams?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createSession.isPending}>
                    {createSession.isPending ? "Generating..." : "Generate Code"}
                  </Button>
                </form>
              </CardContent>
            </Card>
         </div>

         {/* Monitor Panel */}
         <div className="w-full md:w-2/3">
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
               {sessions?.map((session) => (
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
                   
                   <div className="text-right text-xs text-slate-500">
                     {session.status === 'in_progress' && (
                       <span className="flex items-center gap-1 text-green-600 font-medium animate-pulse">
                         <span className="w-2 h-2 rounded-full bg-green-600"/>
                         Active Now
                       </span>
                     )}
                   </div>
                 </div>
               ))}
               
               {sessions?.length === 0 && (
                 <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                   No sessions created yet.
                 </div>
               )}
             </div>
           )}
         </div>
       </div>
    </AdminLayout>
  );
}
