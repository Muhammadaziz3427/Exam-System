import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  // 1. Dastlabki tekshiruv
  if (!examContent || !answers) return null;

  const sectionAnswers = answers[section] || {};
  let allQuestions: Question[] = [];

  // 2. Savollarni to'g'ri yig'ish (Listening Parts va Reading Passages bo'yicha)
  if (section === "listening") {
    // Admin panelingizda listening savollari parts[] ichida keladi
    examContent.listening?.parts?.forEach((part: any) => {
      if (part.questions) {
        allQuestions = [...allQuestions, ...part.questions];
      }
    });
  } else {
    // Reading savollari passages[] ichida keladi
    examContent.reading?.passages?.forEach((passage: any) => {
      if (passage.questions) {
        allQuestions = [...allQuestions, ...passage.questions];
      }
    });
  }

  // 3. Savol turlari bo'yicha statistikani hisoblash
  const statsByType = allQuestions.reduce((acc: any, q) => {
    const type = q.type || "Other";
    if (!acc[type]) acc[type] = { correct: 0, total: 0 };

    const studentAnswer = String(sectionAnswers[q.id] || "").trim().toLowerCase();

    // Gap Fill uchun bir nechta variantni tekshirish (masalan: "the airport / airport")
    const correctVariants = String(q.answer || "")
      .split('/')
      .map(v => v.trim().toLowerCase());

    acc[type].total++;

    // Agar talaba javobi variantlardan biriga mos kelsa
    if (studentAnswer !== "" && correctVariants.includes(studentAnswer)) {
      acc[type].correct++;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* accuracy by type card */}
        <Card className="border-none shadow-sm bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              Accuracy by Question Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(statsByType).map(([type, stats]: [string, any]) => {
              const percentage = Math.round((stats.correct / stats.total) * 100) || 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="capitalize">{type.replace("_", " ")}</span>
                    <span className="text-slate-500">
                      {stats.correct}/{stats.total} ({percentage}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1.5 bg-slate-200" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* correction key card */}
        <Card className="border-none shadow-sm bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Correction Key
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto border-t border-slate-100">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 text-[10px] font-black uppercase">No.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Your Answer</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Correct Key</TableHead>
                  <TableHead className="w-10 text-center text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allQuestions.map((q, index) => {
                  const studentAnswerRaw = sectionAnswers[q.id] || "-";
                  const studentAnswer = String(studentAnswerRaw).trim().toLowerCase();

                  // Slash bilan ajratilgan variantlarni tekshirish mantiqi
                  const correctVariants = String(q.answer || "")
                    .split('/')
                    .map(v => v.trim().toLowerCase());

                  const isCorrect = studentAnswer !== "-" && correctVariants.includes(studentAnswer);

                  return (
                    <TableRow key={q.id} className="hover:bg-white transition-colors h-11 border-b border-slate-100">
                      <TableCell className="font-mono text-[11px] font-bold text-slate-400 py-1">
                        {index + 1}
                      </TableCell>
                      <TableCell className={`text-[12px] py-1 font-medium ${isCorrect ? 'text-slate-700' : 'text-red-500 font-bold'}`}>
                        {studentAnswerRaw === "" ? "-" : studentAnswerRaw}
                      </TableCell>
                      <TableCell className="text-[12px] py-1 font-bold text-emerald-600">
                        {q.answer}
                      </TableCell>
                      <TableCell className="text-center py-1">
                        {isCorrect ? (
                          <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="size-4 text-red-400 mx-auto" />
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