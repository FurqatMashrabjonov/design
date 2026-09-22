import { useEffect, useState, type ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

// Left of the canvas, where Sleek and Stitch put the conversation. Collapses to a rail; the choice
// is remembered per browser.
export function Sidebar(props: {
  chat: ReactNode
  theme: ReactNode
  tab: string
  onTabChange: (tab: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('od:sidebar') === 'collapsed')
    } catch {}
  }, [])
  const toggle = (next: boolean) => {
    setCollapsed(next)
    try {
      localStorage.setItem('od:sidebar', next ? 'collapsed' : 'open')
    } catch {}
  }

  if (collapsed)
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-r bg-background py-3">
        <button type="button" onClick={() => toggle(false)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Show the chat" aria-label="Show the chat">
          <PanelLeftOpen className="size-4" />
        </button>
      </aside>
    )

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r bg-background">
      <Tabs value={props.tab} onValueChange={props.onTabChange} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="mx-3 mt-3 flex items-center justify-between">
          <TabsList className="w-fit">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>
          <button type="button" onClick={() => toggle(true)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Hide the panel" aria-label="Hide the panel">
            <PanelLeftClose className="size-4" />
          </button>
        </div>
        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          {props.chat}
        </TabsContent>
        <TabsContent value="theme" className="min-h-0 flex-1">
          <ScrollArea className="h-full p-3">{props.theme}</ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
