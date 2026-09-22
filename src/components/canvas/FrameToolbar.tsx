import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Copy, Trash2, Check, X, ChevronLeft, ChevronRight, Ellipsis, RotateCw, ClipboardCopy, Code2, Download } from 'lucide-react'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** The less-frequent actions on a frame; shared by the ⋯ menu here and the right-click menu. */
export type FrameActions = {
  onRegenerate: () => void
  onCopyHtml: () => void
  onViewCode: () => void
  onDownload: () => void
}

// The name + action row above a real (saved) screen frame: ‹ v3 › walks the screen's versions, the
// icons appear on hover. Stops pointer events from reaching the canvas so clicking an icon never
// also starts a frame drag.
export function FrameToolbar(props: FrameActions & {
  name: string
  hint?: string
  /** Where the screen stands in its versions; the arrows show once there is more than one. */
  version: { position: number; total: number }
  onStepVersion: (dir: -1 | 1) => Promise<unknown>
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
  const [busy, setBusy] = useState<'rename' | 'duplicate' | 'delete' | 'version' | null>(null)

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
    <div className="mb-2 flex h-7 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
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
      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
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
