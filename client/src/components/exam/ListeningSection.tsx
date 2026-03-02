import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ListeningSectionProps {
  data: any;
  answers: any;
  onChange: (answers: any) => void;
}

export default function ListeningSection({ data, answers, onChange }: ListeningSectionProps) {
  if (!data) return <div className="p-8">No listening data found.</div>;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto p-12 space-y-8">
        {data.audioUrl && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#e0e0e0] sticky top-0 z-10">
            <audio controls className="w-full">
              <source src={data.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}
        
        {/* Placeholder for actual IELTS questions - this would be dynamically generated based on type */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold border-b-2 border-[#2b78c5] pb-2">Section 1</h2>
          <p className="text-gray-600 italic">Questions 1-10: Choose the correct letter, A, B or C.</p>
          
          {/* Example Question */}
          <div className="space-y-4">
            <p className="font-medium">1. What is the speaker's main purpose?</p>
            <RadioGroup 
              value={answers["q-1"]} 
              onValueChange={(val) => onChange({ "q-1": val })}
              className="space-y-2"
            >
              {["To complain", "To inquire", "To suggest"].map((opt, i) => (
                <div key={i} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded transition-colors">
                  <RadioGroupItem value={opt} id={`q1-opt${i}`} />
                  <Label htmlFor={`q1-opt${i}`} className="cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
