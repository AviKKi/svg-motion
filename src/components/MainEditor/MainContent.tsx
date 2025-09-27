import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ChatWindow } from './ChatWindow'
import { SvgPreview } from './SvgPreview'
import { AnimationTimeline } from './AnimationTimeline'

interface MainContentProps {
  svgFile: File | null
  selectedSampleSvg: string | null
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSampleSvgSelect: (svgPath: string) => void
  onClearSvg: () => void
}

export function MainContent({ 
  svgFile, 
  selectedSampleSvg, 
  onFileChange, 
  onSampleSvgSelect, 
  onClearSvg 
}: MainContentProps) {
  return (
    <div className="flex-1 flex flex-col">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Chat Window and SVG Preview */}
        <ResizablePanel defaultSize={75} minSize={30}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Chat Window */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <ChatWindow />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* SVG Preview */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <SvgPreview
                svgFile={svgFile}
                selectedSampleSvg={selectedSampleSvg}
                onFileChange={onFileChange}
                onSampleSvgSelect={onSampleSvgSelect}
                onClearSvg={onClearSvg}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Animation Timeline */}
        <ResizablePanel defaultSize={25} minSize={15}>
          <AnimationTimeline />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
