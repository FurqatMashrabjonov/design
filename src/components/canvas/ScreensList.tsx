import { Layers } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground hover:text-foreground" aria-label={`Screens (${props.screens.length})`}>
              <Layers />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Screens · {props.screens.length}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="left" align="start" className="w-60">
        {props.screens.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No screens yet</div>}
        {props.screens.map((s) => (
          <DropdownMenuItem
            key={s.id}
            className={s.id === props.selected ? 'bg-accent' : ''}
            onSelect={() => props.onSelect(s.id)}
          >
            <span className="truncate">{s.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
