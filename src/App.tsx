import { Settings, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

function App() {
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-4">
        <h1 className="text-xl font-semibold">SVG Motion</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Chat Window and SVG Preview */}
          <ResizablePanel defaultSize={75} minSize={30}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Chat Window */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full border-r bg-muted/10 flex items-center justify-center">
                  <span className="text-muted-foreground font-medium">Chat Window</span>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* SVG Preview */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full bg-muted/10 flex items-center justify-center">
                  <span className="text-muted-foreground font-medium">SVG Preview</span>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Animation Timeline */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <div className="h-full border-t bg-muted/10 flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Animation Timeline</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default App
