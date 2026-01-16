import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui-kit";
import { useExams } from "@/hooks/use-exams";
import { useSessions } from "@/hooks/use-sessions";
import { FileText, Users, AlertTriangle, CheckCircle, Activity, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  const { data: exams = [] } = useExams();
  const { data: sessions = [] } = useSessions();

  const activeSessions = sessions?.filter((s: any) => s.status === 'in_progress') || [];
  const stats = [
    { label: "Jami Imtihonlar", value: exams?.length || 0, icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Aktiv Talabalar", value: activeSessions.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Tugallangan Testlar", value: sessions?.length - activeSessions.length || 0, icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Xavfsizlik", value: "High", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 font-medium">Tizim holati haqida umumiy ma'lumot.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Activity size={18} className="text-blue-500" />
                Oxirgi harakatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {sessions?.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                        {session.studentName?.[0] || "S"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{session.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{session.accessCode}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 rounded-md ${session.status === 'in_progress' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Server Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center py-6">
               <div className="inline-block p-4 rounded-full bg-blue-500/10 mb-2">
                  <Activity size={40} className="text-blue-400 animate-pulse" />
               </div>
               <p className="text-xl font-black">All Systems Online</p>
               <p className="text-sm text-slate-400">Anti-cheat engine is actively monitoring all exam sessions.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}