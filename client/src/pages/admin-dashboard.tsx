import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
// Har bir komponent o'z faylidan import qilinishi shart
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExams } from "@/hooks/use-exams";
import { useSessions } from "@/hooks/use-sessions";
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Activity, 
  ShieldCheck, 
  Search,
  Plus, 
  Download, 
  Zap, 
  Wifi, 
  Database, 
  Cpu,
  Sparkles,
  PenTool,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  // Ma'lumotlarni olish
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Soatni yangilab turish
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- STATISTIKA LOGIKASI ---
  const activeSessions = useMemo(() => 
    (sessions || []).filter((s: any) => ['active', 'in_progress'].includes(s.status)), 
    [sessions]
  );

  const completedSessions = useMemo(() => 
    (sessions || []).filter((s: any) => ['completed', 'pending_grading', 'graded'].includes(s.status)),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const list = sessions || [];
    if (!searchTerm) return list;
    return list.filter((s: any) => 
      s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.accessCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sessions, searchTerm]);

  // Sortlash: Eng yangi sessiyalar tepada turadi
  const sortedSessions = useMemo(() => 
    [...filteredSessions].sort((a: any, b: any) => 
      new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    ), [filteredSessions]
  );

  const stats = [
    { 
      label: "Jami Imtihonlar", 
      value: examsLoading ? "..." : (exams?.length || 0), 
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
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">

        {/* 1. HEADER & CONTROL PANEL */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Admin Boshqaruvi</h2>
              <Badge className="bg-emerald-50 text-emerald-600 border-none animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Tizim Online
              </Badge>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Wifi size={14} className="text-emerald-500"/> API: Barqaror</span>
              <span className="flex items-center gap-1.5"><Database size={14} className="text-blue-500"/> DB: Ulangan</span>
              <span className="flex items-center gap-1.5"><Cpu size={14} className="text-purple-500"/> AI: Tayyor</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetchSessions()} 
              className="rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw size={20} className={sessionsLoading ? "animate-spin" : ""} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 h-12 font-bold flex gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Plus size={18} /> Yangi Imtihon <ChevronDown size={14} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                <DropdownMenuItem 
                  onClick={() => setLocation("/admin/ai-builder")}
                  className="cursor-pointer flex items-center gap-2 p-3 rounded-lg focus:bg-purple-50 focus:text-purple-700 font-medium"
                >
                  <Sparkles size={16} className="text-purple-500" />
                  <span>AI Orqali (Yangi)</span>
                  <Badge className="ml-auto text-[10px] bg-purple-100 text-purple-600">NEW</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLocation("/admin/exams/code-builder")}
                  className="cursor-pointer flex items-center gap-2 p-3 rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium"
                >
                  <Database size={16} className="text-blue-500" />
                  <span>Code Bilan Yaratish</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLocation("/admin/exams/new")}
                  className="cursor-pointer flex items-center gap-2 p-3 rounded-lg focus:bg-slate-50 font-medium"
                >
                  <PenTool size={16} className="text-slate-500" />
                  <span>Qo'lda Yaratish</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="border-slate-200 text-slate-600 rounded-2xl px-6 h-12 font-bold flex gap-2">
              <Download size={18} /> Hisobotlar
            </Button>
          </div>
        </div>

        {/* 2. STATISTIKA KARTALARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-none shadow-xl rounded-3xl overflow-hidden bg-white hover:-translate-y-1 transition-transform duration-300">
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
                  <p className="text-[10px] text-slate-400 truncate">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 3. ASOSIY JADVAL */}
          <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-slate-50 gap-4 bg-white sticky top-0 z-10">
              <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-800">
                <Activity size={22} className="text-blue-600" />
                Jonli Monitoring
                <span className="text-sm font-normal text-slate-400 ml-2 hidden sm:inline">
                  | {currentTime.toLocaleTimeString()}
                </span>
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Ism yoki ID bo'yicha izlash..." 
                  className="pl-9 h-10 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-100 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="overflow-x-auto h-full max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Talaba</th>
                      <th className="px-8 py-4">Holati</th>
                      <th className="px-8 py-4 text-right">Ball / Natija</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessionsLoading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                         <tr key={i}>
                           <td className="px-8 py-5"><Skeleton className="h-10 w-40 rounded-xl" /></td>
                           <td className="px-8 py-5"><Skeleton className="h-6 w-20 rounded-lg" /></td>
                           <td className="px-8 py-5"><Skeleton className="h-6 w-10 ml-auto rounded-lg" /></td>
                         </tr>
                       ))
                    ) : sortedSessions.length > 0 ? (
                      sortedSessions.slice(0, 15).map((session: any) => (
                        <tr 
                          key={session.id} 
                          className="hover:bg-blue-50/30 transition-all cursor-pointer group"
                          onClick={() => setLocation(`/admin/sessions/${session.id}`)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${
                                ['active', 'in_progress'].includes(session.status) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {session.studentName?.[0]?.toUpperCase() || "U"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                                  {session.studentName || "Noma'lum"}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                  ID: {session.accessCode} • <span className="font-medium normal-case">{session.startTime ? new Date(session.startTime).toLocaleDateString() : 'Boshlanmagan'}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge className={`rounded-lg px-2.5 py-1 font-bold text-[9px] uppercase border-none ${
                              ['in_progress', 'active'].includes(session.status) ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 
                              session.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {session.status?.replace('_', ' ') || 'unknown'}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-blue-600 text-[10px]">
                            {['in_progress', 'active'].includes(session.status) ? (
                              <span className="flex items-center justify-end gap-1.5 text-emerald-500">
                                <Zap size={12} className="fill-emerald-500" /> ONLINE
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {session.score ? `${session.score} BALL` : 'YAKUNLANDI'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-16 text-slate-400 font-medium italic">
                          <div className="flex flex-col items-center gap-2">
                             <Search size={30} className="opacity-20" />
                             Ma'lumotlar mavjud emas...
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 4. O'NG TOMON PANEL */}
          <div className="space-y-8">
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

               <CardContent className="space-y-8 text-center py-12 relative z-10">
                 <div className="inline-flex p-6 rounded-[2rem] bg-white/10 border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                   <Activity size={48} className="text-blue-400 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                   <h3 className="text-2xl font-black tracking-tight uppercase italic">Lockdown Faol</h3>
                   <p className="text-slate-400 text-sm px-6 font-medium">AI monitoringi {activeSessions.length} sessiyani nazorat qilmoqda.</p>
                 </div>
                 <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none h-14 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-blue-600/50">
                   Xavfsizlik Logini Ko'rish
                 </Button>
               </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-purple-800 text-white overflow-hidden relative">
               <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
               <CardContent className="p-8 space-y-4 relative z-10">
                 <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-100">Help Desk</p>
                    <Users size={18} className="text-indigo-200" />
                 </div>
                 <h4 className="text-xl font-bold leading-tight">Texnik yordam kerakmi?</h4>
                 <p className="text-xs text-indigo-100/80">Muammo yuzaga kelsa, ma'muriyat bilan bog'laning.</p>
                 <Button className="w-full rounded-2xl font-black text-indigo-900 h-11 bg-white hover:bg-indigo-50 border-none transition-all mt-2">
                   Yordam Olish
                 </Button>
               </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-12 py-6 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
            Control Center v2.0 • Tizim egasi: <span className="text-slate-900 font-bold">Yursinaliyev Muhammadaziz</span>
          </p>
        </footer>
      </div>
    </AdminLayout>
  );
}