import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ChatWindow } from './ChatWindow';
import { SvgInspector } from './SvgInspector';
import { SvgPreview } from './SvgPreview';
import { AnimationTimeline } from './AnimationTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MainContent() {
  return (
    <div className="flex-1 flex flex-col">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Chat Window and SVG Preview */}
        <ResizablePanel defaultSize={75} minSize={30}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Chat / Selector Tabs */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full flex flex-col">
                <Tabs defaultValue="chat" className="h-full flex flex-col">
                  <div className="px-2 pt-2">
                    <TabsList>
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="selector">Selector</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="chat" className="flex-1 min-h-0">
                    <ChatWindow />
                  </TabsContent>
                  <TabsContent value="selector" className="flex-1 min-h-0">
                    <SvgInspector />
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* SVG Preview */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <SvgPreview />
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
  );
}
