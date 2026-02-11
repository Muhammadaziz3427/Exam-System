import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, UserPlus, Trash2, Copy, Search, 
  Users, ShieldCheck, Eye, EyeOff, CheckCircle2 
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Parolni ko'rsatish/yashirish uchun kichik komponent
const PasswordCell = ({ password }: { password: string }) => {
  const [show, setShow] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(password);
    toast({ title: "Copied!", description: "Password copied to clipboard." });
  };

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100 min-w-[100px] text-xs">
        {show ? password : "••••••••"}
      </span>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-slate-400" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy}>
        <Copy className="h-3.5 w-3.5 text-slate-400" />
      </Button>
    </div>
  );
};

export default function AdminTeachers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: teachers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
  });

  // Filtrlash mantiqi
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter(t => 
      t.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/teachers/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ 
        title: "Account Ready!", 
        description: "New teacher has been successfully onboarded." 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ title: "Account Removed", variant: "destructive" });
    },
  });

  // Yuklanish holati (Skeleton)
  const renderSkeletons = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manage Instructors</h1>
            <p className="text-slate-500 font-medium">Create and monitor teacher access accounts.</p>
          </div>
          <Button 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-xl"
            onClick={() => generateMutation.mutate()} 
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-5 w-5" />
            )}
            Generate Account
          </Button>
        </div>

        {/* STATS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900/50 uppercase">Total Teachers</p>
                <p className="text-2xl font-black text-blue-900">{teachers?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          {/* Qo'shimcha stat-kartalar qo'shish mumkin */}
        </div>

        {/* MAIN CONTENT */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Teacher Directory</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search by username..." 
                  className="pl-10 bg-slate-50 border-none focus-visible:ring-blue-500 rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">{renderSkeletons()}</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px] font-bold text-slate-700">Instructor</TableHead>
                    <TableHead className="font-bold text-slate-700">Access Credentials</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Date Joined</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {teacher.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{teacher.username}</span>
                            <Badge variant="secondary" className="w-fit text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-100">
                              ACTIVE
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PasswordCell password={teacher.password} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-slate-500">
                          {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          onClick={() => {
                            if (window.confirm("Bu akkauntni o'chirishni tasdiqlaysizmi?")) {
                              deleteMutation.mutate(teacher.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredTeachers.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Users size={32} />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">No teachers found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search or generate a new account.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FOOTER */}
        <footer className="py-8 flex flex-col items-center justify-center space-y-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] tracking-[0.2em] uppercase">
            <CheckCircle2 size={12} />
            Secure Admin Infrastructure
          </div>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
            Developed by <span className="text-slate-900">Yursinaliyev Muhammadaziz</span> | yursinaliyevm@gmail.com
          </p>
        </footer>
      </div>
    </AdminLayout>
  );
}