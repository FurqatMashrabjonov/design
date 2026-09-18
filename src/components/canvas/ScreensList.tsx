import { Layers, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ScreensList(props: {
  screens: { id: string; name: string }[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="absolute left-4 top-4 z-10 gap-2 rounded-full bg-background shadow-sm">
          <Layers className="size-4" />
          Screens ({props.screens.length})
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {props.screens.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No screens yet</div>}
        {props.screens.map((s) => (
          <DropdownMenuItem
            key={s.id}
            className={s.id === props.selected ? 'bg-accent' : ''}
            onSelect={() => props.onSelect(s.id)}
          >
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
