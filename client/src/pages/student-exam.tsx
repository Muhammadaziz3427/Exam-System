import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useStartSession } from "@/hooks/use-sessions";
import ExamLayout from "@/components/exam/ExamLayout";

export default function StudentExam() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [hasStarted, setHasStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [email, setEmail] = useState("");

  const startSession = useStartSession();

  const startExamFlow = async () => {
    if (!email.includes("@")) {
      toast({ title: "Email required", description: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setIsLoadingContent(true);
    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { email });
      const session = await startSession.mutateAsync(sessionId);
      const examRes = await fetch(`/api/exams/${session.examId}`);
      if (!examRes.ok) throw new Error("Exam not found");
      const exam = await examRes.json();
      setExamData(exam);
      setHasStarted(true);
    } catch (err) {
      toast({ title: "Error", description: "Could not load exam materials.", variant: "destructive" });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const checkCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCameraReady(true);
    } catch (err) {
      toast({ title: "Camera Error", description: "Please allow camera access.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  if (hasStarted && examData) {
    return <ExamLayout exam={examData} sessionId={sessionId} />;
  }

  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl border-t-8 border-[#2b78c5]">
        <h1 className="text-2xl font-black text-slate-900 mb-6">IELTS Computer-Delivered</h1>

        {!cameraReady ? (
          <Button className="w-full h-14 bg-[#2b78c5] text-white hover:bg-[#2361a0]" onClick={checkCamera}>
            Check Camera
          </Button>
        ) : (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video rounded-xl bg-black" />
            <Input 
              placeholder="Your Email" 
              className="h-12 border-[#e0e0e0]" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <Button 
              className="w-full h-14 bg-[#2b78c5] text-white hover:bg-[#2361a0]" 
              onClick={startExamFlow} 
              disabled={isLoadingContent}
            >
              {isLoadingContent ? "Loading..." : "Start Exam"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
