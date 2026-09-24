import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, ImageIcon, Loader2, Sparkles, Trash2, Type } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ElementInfo = { label: string; textEditable: boolean; isPhoto: boolean; photoQuery: string }

// Floats under the selected element: ask the AI to change just this, or change it by hand.
// Everything but the AI field is instant and free (lib/element-ops.ts on the server).
export function ElementPanel(props: {
  info: ElementInfo | null
  busy: boolean
  onAsk: (instruction: string) => void
  onEditText: () => void
  onAction: (action: 'duplicate' | 'up' | 'down' | 'delete') => void
  onReplacePhoto: (query: string) => void
}) {
  const [mode, setMode] = useState<'ask' | 'photo'>('ask')
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setMode('ask')
    setValue('')
  }, [props.info?.label])

  const submit = () => {
    const v = value.trim()
    if (!v || props.busy) return
    if (mode === 'photo') props.onReplacePhoto(v)
    else props.onAsk(v)
    setValue('')
    setMode('ask')
  }

  const tool = (title: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={props.busy}
      onClick={onClick}
      className={cn('flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40', danger && 'hover:bg-destructive/10 hover:text-destructive')}
    >
      {icon}
    </button>
  )

  return (
    <div className="w-[320px] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg" onKeyDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
        <span className="truncate text-xs font-medium text-muted-foreground">{props.info?.label ?? 'Element'}</span>
        <div className="flex shrink-0 items-center">
          {props.info?.textEditable && tool('Edit text (or double-click it)', <Type className="size-4" />, props.onEditText)}
          {props.info?.isPhoto &&
            tool('Replace photo', <ImageIcon className="size-4" />, () => {
              setMode('photo')
              setValue(props.info?.photoQuery ?? '')
              setTimeout(() => input.current?.select(), 0)
            })}
          {tool('Duplicate', <Copy className="size-4" />, () => props.onAction('duplicate'))}
          {tool('Move up', <ArrowUp className="size-4" />, () => props.onAction('up'))}
          {tool('Move down', <ArrowDown className="size-4" />, () => props.onAction('down'))}
          {tool('Delete', <Trash2 className="size-4" />, () => props.onAction('delete'), true)}
        </div>
      </div>
      <form
        className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {props.busy ? <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" /> : mode === 'photo' ? <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />}
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setMode('ask')
              setValue('')
            }
          }}
          disabled={props.busy}
          placeholder={mode === 'photo' ? 'Describe the photo you want…' : 'Ask AI to change this…'}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          aria-label={mode === 'photo' ? 'Photo description' : 'Change this element'}
        />
      </form>
    </div>
  )
}
