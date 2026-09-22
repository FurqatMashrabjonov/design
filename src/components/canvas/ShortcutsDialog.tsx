import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// The `?` sheet. One list, kept in step with the handlers in routes/p.$projectId.tsx and Canvas.tsx.
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Screens',
    keys: [
      ['Click', 'Select a screen; click again to pick an element'],
      ['⇧ click', 'Add to / remove from the selection'],
      ['Drag on empty canvas', 'Rubber-band select (⇧ adds)'],
      ['Esc', 'Step out: element, then screen'],
      ['← →', 'Previous / next screen'],
      ['⌫ / Delete', 'Delete the selected screen'],
      ['⌘ D', 'Duplicate the selected screen'],
      ['⌘ Z / ⇧ ⌘ Z', 'Undo / redo'],
    ],
  },
  {
    title: 'Canvas',
    keys: [
      ['V / H', 'Select tool / hand tool'],
      ['Space (hold)', 'Hand while held'],
      ['⌘ 0', 'Fit every screen'],
      ['⌘ 1', 'Zoom to 100%'],
      ['⇧ 1', 'Zoom to the selected screen'],
      ['⌘ scroll', 'Zoom at the pointer'],
    ],
  },
  {
    title: 'Chat',
    keys: [
      ['/', 'Focus the prompt'],
      ['Enter', 'Send · ⇧ Enter for a new line'],
      ['?', 'This list'],
    ],
  },
]

export function ShortcutsDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {g.keys.map(([k, what]) => (
                  <div key={k} className="contents">
                    <dt>
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                    </dt>
                    <dd className="text-muted-foreground">{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
