import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Play, Trash2, ChevronRight, Share2, Ellipsis, FileCode2, FolderArchive, ClipboardCopy, PenTool, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountMenu } from '@/components/AccountMenu'
import { CreditsBadge } from '@/credits'
import { THEME_KEY } from '@/components/ThemeToggle'
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
  /** FIG-06: every screen (or the selected ones) as Figma layers. */
  onCopyFigma: () => void
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
  // The light/dark switch moved into ⋯ (UI-13); same key and class as ThemeToggle.
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  function toggleDark() {
    document.documentElement.classList.toggle('dark', !dark)
    try {
      localStorage.setItem(THEME_KEY, dark ? 'light' : 'dark')
    } catch {}
    setDark(!dark)
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background pr-3 pl-2">
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
          className="min-w-0 truncate rounded bg-transparent px-1.5 py-1 font-semibold outline-none hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-ring/40"
        />
      </nav>
      {/* UI-13: six controls at most — the rest lives in ⋯ and the account menu. */}
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={props.onShare} disabled={!props.hasScreens} title="Copy a link to the preview">
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={props.onPreview} disabled={!props.hasScreens} title="Open a clickable full-page preview">
          <Play className="size-4" />
          Preview
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
            <DropdownMenuItem onSelect={props.onCopyFigma}>
              <PenTool /> Copy all screens to Figma
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              <span className="capitalize">{props.designSystem.replace(/-/g, ' ')}</span> · <span className="capitalize">{props.device}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={toggleDark}>
              {dark ? <Sun /> : <Moon />} {dark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Visible but quiet: no border, just the count. */}
        <div className="[&>span]:border-transparent [&>span:not(.text-destructive)]:text-muted-foreground">
          <CreditsBadge />
        </div>
        <AccountMenu />
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
              variant="destructive"
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
