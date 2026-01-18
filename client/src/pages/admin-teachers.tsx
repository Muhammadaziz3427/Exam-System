import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Copy } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminTeachers() {
  const { toast } = useToast();
  const { data: teachers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/teachers/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ title: "Account Generated", description: "New teacher account created successfully." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ title: "Account Deleted" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Manage Teachers</h1>
          <Button 
            data-testid="button-generate-teacher"
            onClick={() => generateMutation.mutate()} 
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Generate Teacher Account
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers?.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span data-testid={`text-username-${teacher.id}`}>{teacher.username}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(teacher.username)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span data-testid={`text-password-${teacher.id}`}>{teacher.password}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(teacher.password)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        data-testid={`button-delete-teacher-${teacher.id}`}
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this account?")) {
                            deleteMutation.mutate(teacher.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {teachers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No teacher accounts generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <footer className="mt-8 py-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
            Created & Developed by Yursinaliyev Muhammadaziz | yursinalivem@gmail.com
          </p>
        </footer>
      </div>
    </AdminLayout>
  );
}
