import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-kit";
import { useExams } from "@/hooks/use-exams";
import { useSessions } from "@/hooks/use-sessions";
import { FileText, Users, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const { data: exams } = useExams();
  const { data: sessions } = useSessions();

  const activeSessions = sessions?.filter((s: any) => s.status === 'in_progress') || [];
  const completedSessions = sessions?.filter((s: any) => s.status === 'completed' || s.status === 'graded') || [];

  const stats = [
    { label: "Total Exams", value: exams?.length || 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Students", value: activeSessions.length, icon: Users, color: "text-green-500", bg: "bg-green-50" },
    { label: "Completed Tests", value: completedSessions.length, icon: CheckCircle, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Violations Flagged", value: 0, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" }, // Mock data
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 mt-2">Welcome back, Administrator.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500 italic">No recent activity logged.</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <div className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" />
                System Operational
              </div>
              <p className="text-sm text-slate-500 mt-2">Server latency: 24ms</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
