import type { ReactNode } from 'react'
import { Pencil, Copy, RotateCw, ClipboardCopy, Code2, Download, Trash2, PenTool } from 'lucide-react'
import type { FrameActions } from './FrameToolbar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

// Right-click menu for a real (saved) screen frame — the same actions as the hover toolbar and its ⋯ menu.
export function FrameContextMenu(props: FrameActions & {
  children: ReactNode
  onRename: () => void
  onDuplicate: () => void
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
        <ContextMenuItem onSelect={props.onCopyFigma}>
          <PenTool /> Copy to Figma
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onViewCode}>
          <Code2 /> View code
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onDownload}>
          <Download /> Download HTML
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={props.onDelete}>
          <Trash2 /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
