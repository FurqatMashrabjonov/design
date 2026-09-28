import { Moon, Sun } from 'lucide-react'
import { ACCENTS, type AppTheme } from '@/lib/app-theme'
import { cn } from '@/lib/utils'

// The app's look, in three decisions Konsta already knows how to draw. Platform (the same screens as iOS or as
// Android / Material You) and light/dark are the ones people flip all the time, so they sit in the top bar
// (AppLookSwitch); the accent, from which Konsta derives every tint, shade and Material palette, is the panel.

/** iOS | Android and light | dark, side by side — the top bar of the canvas and of the preview. */
export function AppLookSwitch(props: { theme: AppTheme; onChange: (t: AppTheme) => void; className?: string }) {
  const { theme, onChange } = props
  const seg = (on: boolean) => cn('flex h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors duration-(--duration-fast)', on ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')
  return (
    <div className={cn('flex items-center gap-1', props.className)}>
      <div className="flex" role="radiogroup" aria-label="Platform">
        <button type="button" role="radio" aria-checked={theme.platform === 'ios'} title="Show the app as iOS" className={seg(theme.platform === 'ios')} onClick={() => onChange({ ...theme, platform: 'ios' })}>iOS</button>
        <button type="button" role="radio" aria-checked={theme.platform === 'material'} title="Show the app as Android (Material You)" className={seg(theme.platform === 'material')} onClick={() => onChange({ ...theme, platform: 'material' })}>Android</button>
      </div>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <div className="flex" role="radiogroup" aria-label="Appearance">
        <button type="button" role="radio" aria-checked={!theme.dark} aria-label="Light" title="Light" className={seg(!theme.dark)} onClick={() => onChange({ ...theme, dark: false })}><Sun className="size-4" /></button>
        <button type="button" role="radio" aria-checked={theme.dark} aria-label="Dark" title="Dark" className={seg(theme.dark)} onClick={() => onChange({ ...theme, dark: true })}><Moon className="size-4" /></button>
      </div>
    </div>
  )
}

export function ThemePanel(props: { theme: AppTheme; onChange: (t: AppTheme) => void }) {
  const { theme, onChange } = props
  return (
    <div className="space-y-6 text-sm">
      <section>
        <div className="mb-2 flex items-center justify-between text-muted-foreground">
          <span>Accent</span>
          <span className="font-mono text-xs uppercase">{theme.accent}</span>
        </div>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Accent">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={theme.accent === c}
              aria-label={c}
              onClick={() => onChange({ ...theme, accent: c })}
              className={cn('aspect-square rounded-full ring-offset-2 ring-offset-card transition-transform duration-(--duration-fast) hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', theme.accent === c && 'ring-2 ring-foreground')}
              style={{ background: c }}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          Custom
          <input type="color" value={theme.accent} onChange={(e) => onChange({ ...theme, accent: e.target.value })} className="h-7 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5" aria-label="Custom accent" />
        </label>
      </section>
    </div>
  )
}
