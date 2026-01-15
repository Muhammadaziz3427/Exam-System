import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, Button, Input, Label, Badge, Select } from "@/components/ui-kit"; // Assume Select exists or use HTML select
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useExams } from "@/hooks/use-exams";
import { Loader2, RefreshCw, UserPlus, AlertCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminSessions() {
  const { data: sessions, isLoading, refetch } = useSessions();
  const { data: exams } = useExams();
  const createSession = useCreateSession();

  const { data: allViolations } = useQuery({
    queryKey: ['/api/violations'],
    queryFn: async () => {
      const res = await fetch('/api/violations');
      return res.json();
    },
    refetchInterval: 5000 // Poll every 5s
  });

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
                    const session = sessions?.find(s => s.id === v.sessionId);
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
    </AdminLayout>
  );
}
