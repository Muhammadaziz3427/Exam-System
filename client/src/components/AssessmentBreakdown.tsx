import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: string;
  type: string;
  answer: string;
}

interface AssessmentBreakdownProps {
  examContent: any;
  answers: any;
  section: "listening" | "reading";
}

export function AssessmentBreakdown({ examContent, answers, section }: AssessmentBreakdownProps) {
  if (!examContent || !answers) return null;

  const sectionAnswers = answers[section] || {};
  let allQuestions: Question[] = [];

  if (section === "listening") {
    allQuestions = examContent.listening?.questions || [];
  } else {
    examContent.reading?.passages?.forEach((passage: any) => {
      allQuestions = [...allQuestions, ...(passage.questions || [])];
    });
  }

  // Question Type Mapping & Accuracy
  const statsByType = allQuestions.reduce((acc: any, q) => {
    const type = q.type || "Other";
    if (!acc[type]) acc[type] = { correct: 0, total: 0 };
    
    const studentAnswer = String(sectionAnswers[q.id] || "").trim().toLowerCase();
    const correctAnswer = String(q.answer || "").trim().toLowerCase();
    
    acc[type].total++;
    if (studentAnswer === correctAnswer && studentAnswer !== "") {
      acc[type].correct++;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              Accuracy by Question Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(statsByType).map(([type, stats]: [string, any]) => {
              const percentage = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize">{type.replace("_", " ")}</span>
                    <span>{stats.correct}/{stats.total} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Correction Key
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-16 text-[10px] font-bold uppercase">No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Answer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Correct</TableHead>
                  <TableHead className="w-12 text-center text-[10px] font-bold uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allQuestions.map((q, index) => {
                  const studentAnswer = sectionAnswers[q.id] || "-";
                  const correctAnswer = q.answer;
                  const isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
                  
                  return (
                    <TableRow key={q.id} className="hover:bg-white transition-colors">
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="text-xs truncate max-w-[100px]" title={String(studentAnswer)}>
                        {studentAnswer}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">
                        {correctAnswer}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCorrect ? (
                          <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="size-4 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
