import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ExamSession } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function TeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userData = user?.user || user;

  const { data: sessions, isLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/sessions"],
    meta: {
      headers: {
        "x-user-context": JSON.stringify(userData)
      }
    }
  } as any);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Tasks (Writing & Speaking)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Result Status</TableHead>
                      <TableHead>Scores (W/S)</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.firstName} {session.lastName}
                        </TableCell>
                        <TableCell>{session.email}</TableCell>
                        <TableCell>
                          <Badge variant={session.resultStatus === 'completed' ? 'default' : 'secondary'}>
                            {session.resultStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.writingScore || '-'} / {session.speakingScore || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className="cursor-pointer hover:opacity-80">Mark Now</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No tasks assigned yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
