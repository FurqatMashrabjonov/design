import type { ReactNode } from 'react'
import { Pencil, Copy, RotateCw, ClipboardCopy, Code2, History, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

// Right-click menu for a real (saved) screen frame — same actions as the hover toolbar plus the
// less-frequent ones (regenerate, copy HTML, view code, jump to history) that would clutter it.
export function FrameContextMenu(props: {
  children: ReactNode
  onRename: () => void
  onDuplicate: () => void
  onRegenerate: () => void
  onCopyHtml: () => void
  onViewCode: () => void
  onOpenHistory: () => void
  onDelete: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{props.children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={props.onRename}>
          <Pencil /> Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onDuplicate}>
          <Copy /> Duplicate
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onRegenerate}>
          <RotateCw /> Regenerate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={props.onCopyHtml}>
          <ClipboardCopy /> Copy HTML
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onViewCode}>
          <Code2 /> View code
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onOpenHistory}>
          <History /> Show history
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={props.onDelete}>
          <Trash2 /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
