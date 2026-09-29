import { useState } from 'react'
import { copyText } from '@/lib/clipboard'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// CODE-03: a screen's code, exactly as the React export ships it (the imports it forgot written in), read-only
// with one Copy. No syntax highlighting — a monospace <pre> covers "grab this" and "what did it write".
export function CodeDialog(props: { screen: { name: string; code: string } | null; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={!!props.screen} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[82vh] flex-col sm:max-w-3xl">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="min-w-0">
            <DialogTitle className="truncate">{props.screen?.name}</DialogTitle>
            <DialogDescription className="text-xs">React + Konsta UI · the same file the React export contains</DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mr-6 shrink-0"
            onClick={async () => {
              if (!props.screen) return
              if (await copyText(props.screen.code, 'Code copied')) {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogHeader>
        <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre">{props.screen?.code}</pre>
      </DialogContent>
    </Dialog>
  )
}
