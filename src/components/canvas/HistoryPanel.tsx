import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { getScreenVersions, restoreVersion } from '@/server/fns'
import type { ScreenVersionRow } from '@/app/Models/ScreenVersion'
import { Button } from '@/components/ui/button'

export function HistoryPanel(props: { screenId: string | null; onRestored: () => void }) {
  const [versions, setVersions] = useState<ScreenVersionRow[]>([])
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (!props.screenId) {
      setVersions([])
      return
    }
    getScreenVersions({ data: props.screenId }).then(setVersions)
  }, [props.screenId])

  async function reload() {
    if (props.screenId) setVersions(await getScreenVersions({ data: props.screenId }))
  }

  if (!props.screenId) return <p className="text-sm text-muted-foreground">Select a screen to see its edit history.</p>

  if (versions.length === 0) return <p className="text-sm text-muted-foreground">No past versions yet — edit this screen to start one.</p>

  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li key={v.id} className="rounded-lg border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{v.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.prompt}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(v.createdAt * 1000).toLocaleString()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={restoring === v.id}
              onClick={async () => {
                setRestoring(v.id)
                try {
                  await restoreVersion({ data: { screenId: v.screenId, versionId: v.id } })
                  await Promise.all([props.onRestored(), reload()])
                  toast.success(`Restored "${v.name}"`)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : String(e))
                } finally {
                  setRestoring(null)
                }
              }}
            >
              <RotateCcw className="size-3.5" />
              Restore
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
