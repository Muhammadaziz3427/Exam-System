import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Badge,
  Input
} from "@/components/ui-kit";
import { useExams } from "@/hooks/use-exams";
import { useSessions } from "@/hooks/use-sessions";
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Activity, 
  ShieldCheck, 
  Search,
  Clock,
  Plus,
  Download,
  Zap,
  Wifi,
  Database,
  Cpu
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  // Ma'lumotlarni olish (Bo'sh massiv bilan defaultlash xatolarni oldini oladi)
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- O'ZGARTIRISH: Statuslarni sxemaga moslash ---
  // "Aktiv" deb hisoblanadigan barcha holatlar
  const activeSessions = sessions?.filter((s: any) => 
    ['active', 'in_progress'].includes(s.status)
  ) || [];

  // "Tugallangan" deb hisoblanadigan barcha holatlar
  const completedSessions = sessions?.filter((s: any) => 
    ['completed', 'pending_grading', 'graded'].includes(s.status)
  ) || [];

  const filteredSessions = sessions?.filter((s: any) => 
    s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.accessCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      description: "Hozir testda o'tirganlar"
    },
    { 
      label: "Tugallanganlar", 
      value: sessionsLoading ? "..." : completedSessions.length, 
      icon: CheckCircle, 
      color: "text-purple-600", 
      bg: "bg-purple-100",
      description: "Tugatgan va tekshirilganlar"
    },
    { 
      label: "Tizim Xavfsizligi", 
      value: "99.9%", 
      icon: ShieldCheck, 
      color: "text-amber-600", 
      bg: "bg-amber-100",
      description: "Anti-cheat tizimi faol"
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">

        {/* 1. System Status Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Admin Control</h2>
              <Badge className="bg-emerald-50 text-emerald-600 border-none animate-pulse">System Online</Badge>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Wifi size={14} className="text-emerald-500"/> API: Stable</span>
              <span className="flex items-center gap-1.5"><Database size={14} className="text-blue-500"/> DB: Connected</span>
              <span className="flex items-center gap-1.5"><Cpu size={14} className="text-purple-500"/> AI Engine: Ready</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/exams/new">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 h-12 font-bold flex gap-2">
                <Plus size={18} /> Yangi Imtihon
              </Button>
            </Link>
            <Button variant="outline" className="border-slate-200 text-slate-600 rounded-2xl px-6 h-12 font-bold flex gap-2">
              <Download size={18} /> Hisobotlar
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} strokeWidth={2.5} />
                  </div>
                  <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-bold text-[10px]">
                    LIVE
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Activity Table */}
          <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-slate-50 gap-4">
              <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-800">
                <Activity size={22} className="text-blue-600" />
                Live Monitoring
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Talabani izlash..." 
                  className="pl-9 h-10 bg-slate-50 border-none rounded-xl text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Student</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSessions.length > 0 ? (
                      filteredSessions.slice(0, 8).map((session: any) => (
                        <tr key={session.id} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                {session.studentName?.[0] || "U"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-none">{session.studentName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {session.accessCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge className={`rounded-lg px-2 py-0.5 font-bold text-[9px] uppercase border-none ${
                              ['in_progress', 'active'].includes(session.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {session.status}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-blue-600 text-[10px]">
                            {['in_progress', 'active'].includes(session.status) ? (
                              <span className="flex items-center justify-end gap-1.5 text-emerald-500">
                                <Zap size={12} className="fill-emerald-500" /> SECURE
                              </span>
                            ) : 'COMPLETED'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-slate-400 font-medium italic">
                          Hozircha ma'lumot topilmadi...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Right Column (Lockdown & Support) */}
          <div className="space-y-8">
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden">
               <CardContent className="space-y-8 text-center py-12">
                 <div className="inline-flex p-6 rounded-[2rem] bg-white/10 border border-white/10 shadow-2xl">
                   <Activity size={48} className="text-blue-400 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                   <h3 className="text-2xl font-black tracking-tight uppercase italic">Lockdown Active</h3>
                   <p className="text-slate-400 text-sm px-6 font-medium">AI monitoring is on duty.</p>
                 </div>
                 <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none h-14 rounded-2xl font-black text-lg">
                   Security Log
                 </Button>
               </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-white overflow-hidden">
               <CardContent className="p-8 space-y-4">
                 <p className="text-xs font-black uppercase tracking-widest text-blue-100">Help Desk</p>
                 <h4 className="text-xl font-bold leading-tight">Yordam kerakmi?</h4>
                 <Button className="w-full rounded-2xl font-black text-blue-800 h-11 bg-white hover:bg-blue-50 border-none transition-all">
                   Contact Devs
                 </Button>
               </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-12 py-6 text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
            Control Center v2.0 • Created & Developed by <span className="text-slate-900 font-bold italic">Muhammadaziz</span>
          </p>
        </footer>
      </div>
    </AdminLayout>
  );
}