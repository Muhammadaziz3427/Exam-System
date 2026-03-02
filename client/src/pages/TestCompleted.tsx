import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function TestCompleted() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-none shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#2b78c5]">Test Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            Thank you for completing your IELTS mock exam. Your responses have been successfully submitted for grading.
          </p>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 text-left border border-blue-100">
            <strong>Note:</strong> Your results will be processed by your teacher. You can contact your administrator for feedback.
          </div>
          <Button 
            onClick={() => setLocation("/")} 
            className="w-full bg-[#2b78c5] hover:bg-[#2361a0]"
          >
            Return to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
