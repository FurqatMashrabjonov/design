import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Play, Trash2, ChevronRight, Share2, Ellipsis, FileCode2, FolderArchive, ClipboardCopy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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

export function TopBar(props: {
  name: string
  /** Renames the project from the breadcrumb; the new name is shown once it resolves. */
  onRename: (name: string) => Promise<void>
  device: string
  designSystem: string
  /** The selected screen, which the per-screen export items act on; null disables them. */
  screenName: string | null
  onDownloadScreen: () => void
  onCopyScreenHtml: () => void
  onDownloadApp: () => void
  onShare: () => void
  onDeleteProject: () => Promise<void>
  onPreview: () => void
  /** False until the project has a drawn screen. */
  hasScreens: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Projects › name, where the name is a text field that looks like text until it is focused. The
  // draft exists only while editing; otherwise the field shows the saved name (so an undo shows up).
  const [draft, setDraft] = useState<string | null>(null)
  async function commitName() {
    const name = (draft ?? '').trim()
    setDraft(null)
    if (name && name !== props.name) await props.onRename(name).catch(() => {})
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <Link to="/" className="shrink-0 rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={draft ?? props.name}
          onFocus={() => setDraft(props.name)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setDraft(props.name) // blurring now commits the unchanged name, i.e. nothing
              requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
            }
          }}
          maxLength={80}
          size={Math.max(4, (draft ?? props.name).length)}
          aria-label="Project name"
          title="Rename the project"
          className="min-w-0 truncate rounded bg-transparent px-1.5 py-1 font-semibold outline-none hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-primary/30"
        />
      </nav>
      <Badge variant="secondary" className="font-normal capitalize">
        {props.device}
      </Badge>
      <Badge variant="secondary" className="font-normal capitalize">
        {props.designSystem}
      </Badge>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={props.onPreview} disabled={!props.hasScreens} title="Open a clickable full-page preview">
          <Play className="size-4" />
          Preview
        </Button>
        <Button variant="outline" size="sm" onClick={props.onShare} disabled={!props.hasScreens} title="Copy a link to the preview">
          <Share2 className="size-4" />
          Share
        </Button>
        {/* Works with nothing selected: the whole app is always exportable. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={!props.hasScreens}>
              <Download className="size-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={props.onDownloadApp}>
              <FolderArchive /> Whole app (.zip)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{props.screenName ?? 'Select a screen for these'}</DropdownMenuLabel>
            <DropdownMenuItem disabled={!props.screenName} onSelect={props.onDownloadScreen}>
              <FileCode2 /> This screen (.html)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!props.screenName} onSelect={props.onCopyScreenHtml}>
              <ClipboardCopy /> Copy HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="More project actions" title="More">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{props.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the whole project and all its screens. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault()
                setDeleting(true)
                try {
                  await props.onDeleteProject() // navigates away on success
                } finally {
                  setDeleting(false)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
