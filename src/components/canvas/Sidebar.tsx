import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ReactNode } from 'react'

export function Sidebar(props: {
  chat: ReactNode
  config: ReactNode
  history: ReactNode
  tab: string
  onTabChange: (tab: string) => void
}) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l bg-background">
      <Tabs value={props.tab} onValueChange={props.onTabChange} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="mx-3 mt-3 w-fit self-start">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          {props.chat}
        </TabsContent>
        <TabsContent value="config" className="min-h-0 flex-1">
          <ScrollArea className="h-full p-3">{props.config}</ScrollArea>
        </TabsContent>
        <TabsContent value="history" className="min-h-0 flex-1">
          <ScrollArea className="h-full p-3">{props.history}</ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
