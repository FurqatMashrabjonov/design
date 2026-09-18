import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Read-only view of a screen's raw HTML. No syntax highlighting — a plain <pre> is enough for
// "let me grab this" or "let me check what it actually generated", which covers the real use cases.
export function CodeDialog(props: { screen: { name: string; html: string } | null; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false)

  return (
    <Dialog open={!!props.screen} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle className="truncate">{props.screen?.name}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="mr-6 shrink-0"
            onClick={async () => {
              if (!props.screen) return
              try {
                await navigator.clipboard.writeText(props.screen.html)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                toast.error('Could not copy — clipboard access was blocked')
              }
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogHeader>
        <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
          {props.screen?.html}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
