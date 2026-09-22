import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Copy, Trash2, Check, X, ChevronLeft, ChevronRight, Ellipsis, RotateCw, ClipboardCopy, Code2, Download, GripVertical, ThumbsUp, ThumbsDown, TriangleAlert } from 'lucide-react'
import type { AuditFinding } from '@/lib/render-audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const AUDIT_LABEL: Record<AuditFinding['rule'], string> = {
  overflow: 'Runs off the screen',
  'clipped-text': 'Text is cut off',
  'small-target': 'Tap target under 44px',
  'low-contrast': 'Text too faint',
  overlap: 'Text overlaps',
}

/** The only place a frame can be dragged from (Canvas looks for data-canvas-handle). */
export function FrameHandle() {
  return (
    <span data-canvas-handle className="-ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/70 hover:bg-muted hover:text-foreground active:cursor-grabbing" title="Drag to move" aria-label="Drag to move">
      <GripVertical className="size-3.5" />
    </span>
  )
}

/** The less-frequent actions on a frame; shared by the ⋯ menu here and the right-click menu. */
export type FrameActions = {
  onRegenerate: () => void
  onCopyHtml: () => void
  onViewCode: () => void
  onDownload: () => void
}

// The name + action row above a real (saved) screen frame: ⠿ drags it, ‹ v3 › walks the screen's
// versions, the icons appear on hover. Pointer events stop here (except from the handle) so clicking
// an icon never reaches the canvas.
export function FrameToolbar(props: FrameActions & {
  name: string
  hint?: string
  /** Where the screen stands in its versions; the arrows show once there is more than one. */
  version: { position: number; total: number }
  onStepVersion: (dir: -1 | 1) => Promise<unknown>
  /** 👍/👎 on this screen (FB-01); pressing the current one clears it. */
  rating: 'up' | 'down' | null
  onRate: (value: 'up' | 'down' | null) => Promise<unknown>
  /** Render-audit findings for this screen (EYE-01); the chip lists them. */
  audit?: AuditFinding[]
  /** One edit that fixes the findings that point at an element (EYE-02). */
  onFixAudit?: () => void
  // Rename and delete-confirm are controlled — the right-click context menu's items start the
  // same states, so there's one edit box and one confirm dialog regardless of entry point.
  editing: boolean
  onStartRename: () => void
  onCancelRename: () => void
  onRename: (name: string) => Promise<void>
  onDuplicate: () => Promise<void>
  deleteConfirming: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
  onDelete: () => Promise<void>
}) {
  const [draft, setDraft] = useState(props.name)
  const [busy, setBusy] = useState<'rename' | 'duplicate' | 'delete' | 'version' | 'rate' | null>(null)

  // Re-seed the draft each time editing starts (also covers the context menu's "Rename" entry point).
  useEffect(() => {
    if (props.editing) setDraft(props.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editing])

  async function guard(kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) {
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    const name = draft.trim()
    if (!name || name === props.name) {
      props.onCancelRename()
      return
    }
    await guard('rename', () => props.onRename(name))
  }

  if (props.editing) {
    return (
      <div className="mb-2 flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          value={draft}
          disabled={busy === 'rename'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') props.onCancelRename()
          }}
          className="h-7 text-sm"
        />
        <Button size="icon" variant="ghost" className="size-7 shrink-0" disabled={busy === 'rename'} onClick={save}>
          <Check className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={props.onCancelRename}>
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  const v = props.version
  return (
    <div className="mb-2 flex h-7 items-center gap-1" onPointerDown={(e) => !(e.target instanceof Element && e.target.closest('[data-canvas-handle]')) && e.stopPropagation()}>
      <FrameHandle />
      <span className="truncate text-sm font-medium text-muted-foreground" title={props.hint}>
        {props.name}
      </span>
      {v.total > 1 && (
        <span className="ml-1 flex shrink-0 items-center text-xs tabular-nums text-muted-foreground" title={`Version ${v.position} of ${v.total}`}>
          <Button size="icon" variant="ghost" className="size-6" title="Previous version" aria-label="Previous version" disabled={busy === 'version' || v.position <= 1} onClick={() => guard('version', () => props.onStepVersion(-1))}>
            <ChevronLeft className="size-3.5" />
          </Button>
          v{v.position}
          <Button size="icon" variant="ghost" className="size-6" title="Next version" aria-label="Next version" disabled={busy === 'version' || v.position >= v.total} onClick={() => guard('version', () => props.onStepVersion(1))}>
            <ChevronRight className="size-3.5" />
          </Button>
        </span>
      )}
      {props.audit && props.audit.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ml-1 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-amber-600 hover:bg-muted dark:text-amber-400" title="Problems found in the rendered screen">
              <TriangleAlert className="size-3.5" />
              {props.audit.length}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {props.onFixAudit && props.audit.some((f) => f.id) && (
              <>
                <DropdownMenuItem onSelect={props.onFixAudit} className="font-medium">
                  <Check /> Fix {props.audit.filter((f) => f.id).length === 1 ? 'it' : `these ${props.audit.filter((f) => f.id).length}`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {props.audit.slice(0, 12).map((f, i) => (
              <DropdownMenuItem key={i} className="flex-col items-start gap-0" onSelect={(e) => e.preventDefault()}>
                <span className="text-xs font-medium">{AUDIT_LABEL[f.rule]}</span>
                <span className="w-full truncate text-xs text-muted-foreground">{f.detail}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className={cn('ml-auto flex items-center gap-0.5 transition-opacity group-hover:opacity-100 has-[[data-state=open]]:opacity-100', props.rating ? 'opacity-100' : 'opacity-0')}>
        {(['up', 'down'] as const).map((v) => {
          const Icon = v === 'up' ? ThumbsUp : ThumbsDown
          const on = props.rating === v
          return (
            <Button
              key={v}
              size="icon"
              variant="ghost"
              className={cn('size-6 shrink-0', on ? 'text-primary' : '', props.rating && !on && 'hidden group-hover:inline-flex')}
              title={v === 'up' ? 'Good design' : 'Not good'}
              aria-label={v === 'up' ? 'Good design' : 'Not good'}
              aria-pressed={on}
              onClick={() => guard('rate', () => props.onRate(on ? null : v))}
            >
              <Icon className={cn('size-3.5', on && 'fill-current')} />
            </Button>
          )
        })}
        <Button size="icon" variant="ghost" className="size-6 shrink-0" title="Rename" onClick={props.onStartRename}>
          <Pencil className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-6 shrink-0" title="Duplicate" disabled={busy === 'duplicate'} onClick={() => guard('duplicate', props.onDuplicate)}>
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0 text-destructive hover:text-destructive"
          title="Delete"
          disabled={busy === 'delete'}
          onClick={props.onRequestDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="size-6 shrink-0" title="More" aria-label="More actions">
              <Ellipsis className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={props.onRegenerate}>
              <RotateCw /> Regenerate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={props.onCopyHtml}>
              <ClipboardCopy /> Copy HTML
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onViewCode}>
              <Code2 /> View code
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onDownload}>
              <Download /> Download HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={props.deleteConfirming} onOpenChange={(open) => !open && props.onCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{props.name}"?</AlertDialogTitle>
            <AlertDialogDescription>The screen leaves the canvas. ⌘Z brings it back, with its history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault()
                await guard('delete', props.onDelete)
                props.onCancelDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
