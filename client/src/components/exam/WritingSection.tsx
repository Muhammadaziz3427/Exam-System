import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface WritingSectionProps {
  data: any;
  answers: any;
  onChange: (answers: any) => void;
}

export default function WritingSection({ data, answers, onChange }: WritingSectionProps) {
  const task = data?.tasks?.[0] || { prompt: "Task 1: Describe the following chart..." };
  const text = answers["writing-task1"] || "";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <ScrollArea className="h-full border-r border-[#e0e0e0]">
          <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-[#2b78c5]">Writing Task 1</h1>
            <div className="bg-[#f8f9fa] p-6 rounded-lg border border-[#e0e0e0] text-lg text-gray-800 leading-relaxed">
              {task.prompt}
            </div>
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full flex flex-col bg-[#fcfcfc] p-8 space-y-4">
          <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Your Answer</label>
          <Textarea 
            className="flex-1 bg-white border-[#e0e0e0] focus-visible:ring-[#2b78c5] text-lg p-6 resize-none"
            placeholder="Start writing here..."
            value={text}
            onChange={(e) => onChange({ "writing-task1": e.target.value })}
            data-testid="textarea-writing"
          />
          <div className="flex justify-between items-center text-sm font-medium text-gray-500 bg-white border border-[#e0e0e0] px-4 py-2 rounded">
            <span>Word count: <span className="text-[#2b78c5] font-bold" data-testid="text-word-count">{wordCount}</span></span>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
