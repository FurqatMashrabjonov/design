import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Play, Trash2, ChevronLeft, Share2, FileCode2, FolderArchive, ClipboardCopy, PenTool, Moon, Sun, Menu, Pencil, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AccountMenu } from '@/components/AccountMenu'
import { CreditsBadge } from '@/credits'
import { applyDark } from '@/components/ThemeToggle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
  onShortcuts?: () => void
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
    applyDark(!dark)
    setDark(!dark)
  }

  const nameRef = useRef<HTMLInputElement>(null)
  // UI-21: no bar — the project's name and its actions float over the canvas, as in Stitch, so the
  // screens get the whole window. Project actions live in ☰; the screen's own in its selection bar.
  const pill = 'pointer-events-auto flex h-11 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-2'
  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-3">
      <div className={cn(pill, 'min-w-0')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-lg" aria-label="Project menu">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem asChild>
              <Link to="/">
                <ChevronLeft /> All projects
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTimeout(() => nameRef.current?.focus(), 0)}>
              <Pencil /> Rename project
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!props.hasScreens} onSelect={props.onShare}>
              <Share2 /> Copy preview link
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!props.hasScreens} onSelect={props.onDownloadApp}>
              <FolderArchive /> Download the app (.zip)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!props.hasScreens} onSelect={props.onCopyFigma}>
              <PenTool /> Copy all screens to Figma
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggleDark}>
              {dark ? <Sun /> : <Moon />} {dark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            {props.onShortcuts && (
              <DropdownMenuItem onSelect={props.onShortcuts}>
                <Keyboard /> Keyboard shortcuts <DropdownMenuShortcut>?</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              <span className="capitalize">{props.designSystem.replace(/-/g, ' ')}</span> · <span className="capitalize">{props.device}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={nameRef}
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
          size={Math.max(4, Math.min(40, (draft ?? props.name).length))}
          aria-label="Project name"
          title="Rename the project"
          className="min-w-0 truncate rounded-md bg-transparent px-2 py-1 text-md font-semibold outline-none hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
        <div className={pill}>
          <Button variant="ghost" size="sm" onClick={props.onPreview} disabled={!props.hasScreens} title="Open a clickable full-page preview">
            <Play /> Preview
          </Button>
          <Button variant="ghost" size="sm" onClick={props.onShare} disabled={!props.hasScreens} title="Copy a link to the preview">
            <Share2 /> Share
          </Button>
          {/* Works with nothing selected: the whole app is always exportable. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={!props.hasScreens} className="font-semibold">
                <Download /> Export
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
        </div>
        <div className={cn(pill, 'gap-1.5 pr-1.5 pl-2.5 [&>div>span]:border-transparent')}>
          <div className="[&>span:not(.text-destructive)]:text-muted-foreground">
            <CreditsBadge />
          </div>
          <AccountMenu />
        </div>
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
