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
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">System Overview</h2>
          <p className="text-muted-foreground text-lg">Centralized monitoring and administration portal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="admin-card">
              <CardContent className="p-6 flex items-center gap-5">
                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shadow-sm`}>
                  <stat.icon size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <CardTitle className="text-xl flex items-center gap-3 font-bold">
                <Activity size={20} className="text-primary" />
                Live Assessment Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary font-semibold hover:bg-primary/5">View All Activity</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {sessions?.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary/50 transition-all border border-transparent hover:border-border/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                        {session.studentName?.[0] || "S"}
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{session.studentName}</p>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <ShieldCheck size={12} /> {session.accessCode}
                        </p>
                      </div>
                    </div>
                    <Badge variant={session.status === 'in_progress' ? 'default' : 'secondary'} className="px-3 py-1 font-semibold rounded-full shadow-xs">
                      {session.status === 'in_progress' ? 'Active Exam' : session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 rotate-12 transition-transform group-hover:scale-110">
              <ShieldCheck size={160} />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-xs font-bold text-primary-foreground/70 uppercase tracking-[0.2em] mb-2">Security Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center py-10 relative z-10">
               <div className="inline-flex p-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-inner mb-2">
                  <Activity size={48} className="text-white animate-pulse" />
               </div>
               <div className="space-y-2">
                 <p className="text-2xl font-bold tracking-tight">Lockdown Mode Active</p>
                 <p className="text-sm text-primary-foreground/80 leading-relaxed px-4">
                   Proprietary anti-cheat engine is actively monitoring biometric and behavioral markers.
                 </p>
               </div>
               <Button variant="outline" className="w-full bg-white/5 border-white/20 hover:bg-white/10 backdrop-blur-sm font-bold">
                 System Security Log
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}