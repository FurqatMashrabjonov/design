import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Pencil, Copy, Trash2, Check, X, ChevronLeft, ChevronRight, Ellipsis, RotateCw, ClipboardCopy, Code2, Download, GripVertical, ThumbsUp, ThumbsDown, PenTool, Play, Smartphone } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'


/** The only place a frame can be dragged from (Canvas looks for data-canvas-handle): the frame's name, or a grip. */
export function FrameHandle(props: { children?: ReactNode }) {
  if (props.children)
    return (
      <span data-canvas-handle className="flex min-w-0 cursor-grab items-center rounded px-0.5 active:cursor-grabbing" title="Drag to move">
        {props.children}
      </span>
    )
  return (
    <span data-canvas-handle className="-ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/70 hover:bg-muted hover:text-foreground active:cursor-grabbing" title="Drag to move" aria-label="Drag to move">
      <GripVertical className="size-4" />
    </span>
  )
}

/** The less-frequent actions on a frame; shared by the ⋯ menu here and the right-click menu. */
export type FrameActions = {
  onRegenerate: () => void
  onCopyHtml: () => void
  /** FIG-02: copy the screen as layers for Figma (paste with ⌘V). */
  onCopyFigma: () => void
  onViewCode: () => void
  onDownload: () => void
  /** Opens the clickable preview at this screen. */
  onPreview: () => void
}

// The name + action row above a real (saved) screen frame: ⠿ drags it, ‹ v3 › walks the screen's
// versions, the icons appear on hover. Pointer events stop here (except from the handle) so clicking
// an icon never reaches the canvas.
export function FrameToolbar(props: FrameActions & {
  name: string
  hint?: string
  /** UI-03: a selected frame keeps its actions out; the others show them on hover. */
  selected?: boolean
  /** Where the screen stands in its versions; the arrows show once there is more than one. */
  version: { position: number; total: number }
  onStepVersion: (dir: -1 | 1) => Promise<unknown>
  /** 👍/👎 on this screen (FB-01); pressing the current one clears it. */
  rating: 'up' | 'down' | null
  onRate: (value: 'up' | 'down' | null) => Promise<unknown>
  /** One edit that fixes the findings that point at an element (EYE-02). */
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
      // A fixed width: above a selected frame the row is as wide as its content, where w-full is nothing.
      <div className="od-rise flex h-10 w-72 items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-2" onPointerDown={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          value={draft}
          disabled={busy === 'rename'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') props.onCancelRename()
          }}
          className="h-8 min-w-0 flex-1 text-sm"
          aria-label="Screen name"
        />
        <Button size="icon-sm" variant="ghost" className="shrink-0" disabled={busy === 'rename'} onClick={save} aria-label="Save name">
          <Check />
        </Button>
        <Button size="icon-sm" variant="ghost" className="shrink-0" onClick={props.onCancelRename} aria-label="Cancel rename">
          <X />
        </Button>
      </div>
    )
  }

  const v = props.version
  const versions = v.total > 1 && (
    <span className="flex shrink-0 items-center text-xs tabular-nums text-muted-foreground" title={`Version ${v.position} of ${v.total}`}>
      <Button size="icon-sm" variant="ghost" className="size-7" aria-label="Previous version" disabled={busy === 'version' || v.position <= 1} onClick={() => guard('version', () => props.onStepVersion(-1))}>
        <ChevronLeft />
      </Button>
      <span className="min-w-6 text-center">v{v.position}</span>
      <Button size="icon-sm" variant="ghost" className="size-7" aria-label="Next version" disabled={busy === 'version' || v.position >= v.total} onClick={() => guard('version', () => props.onStepVersion(1))}>
        <ChevronRight />
      </Button>
    </span>
  )

  // Not selected: the name alone, as in Figma — the frame is a thing to click, not a row of buttons.
  if (!props.selected)
    return (
      <div className="flex h-7 items-center gap-1 overflow-hidden" onPointerDown={(e) => !(e.target instanceof Element && e.target.closest('[data-canvas-handle]')) && e.stopPropagation()}>
        <Smartphone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <FrameHandle>
          <span className="truncate text-md font-medium text-muted-foreground group-hover:text-foreground" title={props.hint ? `${props.name}\n\n${props.hint}` : props.name} onDoubleClick={props.onStartRename}>
            {props.name}
          </span>
        </FrameHandle>
        {v.total > 1 && <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/80">v{v.position}</span>}
      </div>
    )

  // UI-20: selected, the frame gets its actions as a bar kept at screen size above it — whatever the
  // zoom, every action is one click away and 32px big (before: 24px icons that hid below 220px).
  return (
    <div
      className="od-rise flex h-10 w-max max-w-[min(640px,90vw)] items-center gap-0.5 rounded-lg border border-border bg-card p-1 text-foreground shadow-2"
      onPointerDown={(e) => !(e.target instanceof Element && e.target.closest('[data-canvas-handle]')) && e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <Smartphone className="ml-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <FrameHandle>
        <span className="max-w-56 truncate px-1.5 text-md font-medium" title={props.hint ? `${props.name}\n\n${props.hint}` : props.name} onDoubleClick={props.onStartRename}>
          {props.name}
        </span>
      </FrameHandle>
      {versions}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
      <BarButton label="Preview this screen" onClick={props.onPreview}><Play /></BarButton>
      <BarButton label="View code" onClick={props.onViewCode}><Code2 /></BarButton>
      <BarButton label="Copy to Figma" onClick={props.onCopyFigma}><PenTool /></BarButton>
      <BarButton label="Download HTML" onClick={props.onDownload}><Download /></BarButton>
      <BarButton label="Regenerate" onClick={props.onRegenerate}><RotateCw /></BarButton>
      <BarButton label="Duplicate" disabled={busy === 'duplicate'} onClick={() => guard('duplicate', props.onDuplicate)}><Copy /></BarButton>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="More actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>More</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={props.onStartRename}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onCopyHtml}>
            <ClipboardCopy /> Copy HTML
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => guard('rate', () => props.onRate(props.rating === 'up' ? null : 'up'))}>
            <ThumbsUp className={cn(props.rating === 'up' && 'fill-current')} /> Good design
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => guard('rate', () => props.onRate(props.rating === 'down' ? null : 'down'))}>
            <ThumbsDown className={cn(props.rating === 'down' && 'fill-current')} /> Not good
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={busy === 'delete'} onSelect={props.onRequestDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={props.deleteConfirming} onOpenChange={(open) => !open && props.onCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{props.name}"?</AlertDialogTitle>
            <AlertDialogDescription>The screen leaves the canvas. ⌘Z brings it back, with its history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
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

function BarButton(props: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={props.label} disabled={props.disabled} onClick={props.onClick} className="text-muted-foreground hover:text-foreground">
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  )
}
