import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Copy, Trash2, Check, X } from 'lucide-react'
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

// The hover-reveal name + action row above a real (saved) screen frame. Stops pointer events from
// reaching the canvas so clicking an icon never also starts a frame drag.
export function FrameToolbar(props: {
  name: string
  hint?: string
  onRename: (name: string) => Promise<void>
  onDuplicate: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.name)
  const [busy, setBusy] = useState<'rename' | 'duplicate' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    const name = draft.trim()
    if (!name || name === props.name) {
      setEditing(false)
      setDraft(props.name)
      return
    }
    setBusy('rename')
    try {
      await props.onRename(name)
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (editing) {
    return (
      <div className="mb-2 flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          value={draft}
          disabled={busy === 'rename'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setEditing(false)
              setDraft(props.name)
            }
          }}
          className="h-7 text-sm"
        />
        <Button size="icon" variant="ghost" className="size-7 shrink-0" disabled={busy === 'rename'} onClick={save}>
          <Check className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          onClick={() => {
            setEditing(false)
            setDraft(props.name)
          }}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-2 flex h-7 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
      <span className="truncate text-sm font-medium text-muted-foreground" title={props.hint}>
        {props.name}
      </span>
      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          title="Rename"
          onClick={() => {
            setDraft(props.name)
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          title="Duplicate"
          disabled={busy === 'duplicate'}
          onClick={async () => {
            setBusy('duplicate')
            try {
              await props.onDuplicate()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : String(e))
            } finally {
              setBusy(null)
            }
          }}
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0 text-destructive hover:text-destructive"
          title="Delete"
          disabled={busy === 'delete'}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{props.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the screen and its edit history. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault()
                setBusy('delete')
                try {
                  await props.onDelete()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : String(err))
                } finally {
                  setBusy(null)
                  setConfirmDelete(false)
                }
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
