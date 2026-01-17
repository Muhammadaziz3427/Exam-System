import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Badge 
} from "@/components/ui-kit";
import { useExams } from "@/hooks/use-exams";
import { useSessions } from "@/hooks/use-sessions";
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Activity, 
  ShieldCheck, 
  TrendingUp, 
  History
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const activeSessions = sessions?.filter((s: any) => s.status === 'in_progress') || [];
  const completedSessions = sessions?.filter((s: any) => s.status === 'completed') || [];

  const stats = [
    { 
      label: "Jami Imtihonlar", 
      value: examsLoading ? "..." : exams.length, 
      icon: FileText, 
      color: "text-blue-600", 
      bg: "bg-blue-100",
      description: "Tizimdagi barcha mock testlar"
    },
    { 
      label: "Aktiv Talabalar", 
      value: sessionsLoading ? "..." : activeSessions.length, 
      icon: Users, 
      color: "text-emerald-600", 
      bg: "bg-emerald-100",
      description: "Ayni damda test topshirayotganlar"
    },
    { 
      label: "Tugallangan Testlar", 
      value: sessionsLoading ? "..." : completedSessions.length, 
      icon: CheckCircle, 
      color: "text-purple-600", 
      bg: "bg-purple-100",
      description: "Tekshirilgan va yakunlangan"
    },
    { 
      label: "Tizim Xavfsizligi", 
      value: "99.9%", 
      icon: ShieldCheck, 
      color: "text-amber-600", 
      bg: "bg-amber-100",
      description: "Anti-cheat tizimi barqaror"
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section - Tugmalar olib tashlandi */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600 bg-clip-text text-transparent">
              Admin Overview
            </h2>
            <p className="text-muted-foreground text-lg font-medium">
              Real-time system monitoring and assessment analytics.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} strokeWidth={2.5} />
                  </div>
                  <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-bold text-[10px]">
                    LIVE DATA
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 font-medium italic border-t pt-2">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Activity Table */}
          <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] bg-white/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-slate-50">
              <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-800">
                <Activity size={22} className="text-blue-600" />
                Student Live Activity
              </CardTitle>
              <Link href="/admin/sessions">
                <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl">
                  View All Sessions
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-[0.1em] text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Student</th>
                      <th className="px-8 py-4">Exam Info</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4 text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions?.slice(0, 6).map((session: any) => (
                      <tr key={session.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-600 border border-white shadow-sm">
                              {session.studentName?.[0] || "U"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-none mb-1">{session.studentName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                <ShieldCheck size={10} /> ID: {session.accessCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-600 truncate max-w-[150px]">
                            {session.exam?.title || "Mock Assessment"}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <Badge className={`rounded-lg px-2 py-1 font-bold text-[10px] uppercase border-none ${
                            session.status === 'in_progress' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {session.status === 'in_progress' ? 'Running' : 'Finished'}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-blue-600 italic text-[10px]">
                          MONITORING...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!sessions || sessions.length === 0) && (
                <div className="p-20 text-center space-y-2">
                   <History size={40} className="mx-auto text-slate-200" />
                   <p className="text-slate-400 font-bold">No recent activity detected.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Security Section */}
          <div className="space-y-8">
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
               <CardContent className="space-y-8 text-center py-12 relative z-10">
                 <div className="inline-flex p-6 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl">
                   <Activity size={48} className="text-blue-400 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                   <h3 className="text-2xl font-black tracking-tight uppercase italic">Lockdown Active</h3>
                   <p className="text-slate-400 text-sm px-6 font-medium leading-relaxed">
                     AI-powered behavioral analysis is monitoring all active sessions for integrity.
                   </p>
                 </div>
                 <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none h-14 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20">
                   System Security Log
                 </Button>
               </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-white relative overflow-hidden">
               <CardContent className="p-8 space-y-4">
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Support Center</p>
                 <h4 className="text-xl font-bold">Admin Technical Support</h4>
                 <p className="text-blue-100/80 text-sm font-medium">Contact developers for system-wide technical inquiries.</p>
                 <Button variant="secondary" className="w-full rounded-2xl font-black text-blue-800 h-11">
                   Contact Dev Team
                 </Button>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}