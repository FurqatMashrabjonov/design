import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  device: string
  designSystem: string
  onExport?: () => void
  onDeleteProject: () => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Button variant="ghost" size="icon" className="size-8" asChild>
        <Link to="/">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <h1 className="truncate text-sm font-semibold">{props.name}</h1>
      <Badge variant="secondary" className="font-normal capitalize">
        {props.device}
      </Badge>
      <Badge variant="secondary" className="font-normal capitalize">
        {props.designSystem}
      </Badge>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={props.onExport} disabled={!props.onExport}>
          <Download className="size-4" />
          Export
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" />
        </Button>
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
