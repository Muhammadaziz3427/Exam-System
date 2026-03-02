import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReadingSectionProps {
  data: any;
  answers: any;
  onChange: (answers: any) => void;
}

export default function ReadingSection({ data, answers, onChange }: ReadingSectionProps) {
  if (!data) return <div className="p-8">No reading data found.</div>;

  const passage = data.passages?.[0] || {};

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <ScrollArea className="h-full border-r border-[#e0e0e0]">
          <div className="p-8 prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold mb-6">{passage.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: passage.content }} className="text-lg leading-relaxed text-gray-800" />
          </div>
        </ScrollArea>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      <ResizablePanel defaultSize={50} minSize={30}>
        <ScrollArea className="h-full bg-[#fcfcfc]">
          <div className="p-8 space-y-8">
            <h2 className="text-2xl font-bold border-b-2 border-[#2b78c5] pb-2">Questions</h2>
            <p className="text-gray-600 italic">Questions 1-5: Complete the table below.</p>
            
            {/* Table Example with Clickable Cells as requested */}
            <div className="border border-[#e0e0e0] rounded overflow-hidden bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f5]">
                    <th className="border border-[#e0e0e0] p-3 text-left">Category</th>
                    <th className="border border-[#e0e0e0] p-3 text-left">Feature</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#e0e0e0] p-3">Location</td>
                    <td 
                      className={`border border-[#e0e0e0] p-3 cursor-pointer transition-colors ${answers["q-1"] ? "bg-[#2b78c5]/10 font-bold text-[#2b78c5]" : "hover:bg-gray-50"}`}
                      onClick={() => onChange({ "q-1": "SelectedValue" })}
                    >
                      {answers["q-1"] || "Click to select"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
