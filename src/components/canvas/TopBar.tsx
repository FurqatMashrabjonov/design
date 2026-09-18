import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function TopBar(props: { name: string; device: string; designSystem: string; onExport?: () => void }) {
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
      </div>
    </header>
  )
}
