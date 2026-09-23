import { ChevronRight, Info, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLOR_TOKENS, FONTS, isEmptyTheme, type ColorToken, type Theme } from '@/lib/theme-override'
import { cn } from '@/lib/utils'

const SWATCHES = ['#2952cc', '#e11d48', '#ea580c', '#16a34a', '#0d9488', '#7c3aed', '#db2777', '#111113']

const selectClass =
  'h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** UI-04: a section that folds away, so the panel is a list of decisions and not a wall. */
function Section(props: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <details open className="group border-t pt-3 first:border-t-0 first:pt-0">
      <summary className="mb-2 flex cursor-pointer list-none items-center justify-between text-muted-foreground marker:content-['']">
        <span className="flex items-center gap-1">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
          {props.title}
        </span>
        <span onClick={(e) => e.preventDefault()}>{props.action}</span>
      </summary>
      <div className="space-y-2 pb-1">{props.children}</div>
    </details>
  )
}

export function ThemePanel(props: {
  theme: Theme
  /** The design system's own accent, shown while no override is set. */
  baseAccent: string
  /** The design system's own token values (`--bg` → `#fff`), shown while a token is not overridden. */
  base: Map<string, string>
  onChange: (theme: Theme) => void
  /** UI-04: show a theme on the canvas without saving it; null puts the saved one back. */
  onPreview?: (theme: Theme | null) => void
}) {
  const { theme } = props
  const set = (patch: Partial<Theme>) => {
    const next = { ...theme, ...patch }
    for (const k of Object.keys(next) as (keyof Theme)[]) if (next[k] === undefined) delete next[k]
    props.onChange(next)
  }
  const accent = theme.accent ?? props.baseAccent
  const setColor = (id: ColorToken, hex: string | undefined) => {
    const colors = { ...theme.colors, [id]: hex }
    if (!hex) delete colors[id]
    set({ colors: Object.keys(colors).length ? colors : undefined })
  }
  const baseRadius = parseInt(props.base.get('--radius-md') ?? '', 10)
  const PRESET_MD = { sharp: 4, soft: 16, round: 24 } as const
  const radiusPx = theme.radiusPx ?? (theme.radius ? PRESET_MD[theme.radius] : Number.isFinite(baseRadius) ? Math.min(40, baseRadius) : 12)
  const radiusChanged = theme.radiusPx !== undefined || theme.radius !== undefined

  return (
    <div className="space-y-5 text-sm">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Theme</h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={isEmptyTheme(theme)} onClick={() => props.onChange({})}>
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Restyles every screen instantly — nothing is regenerated.</p>
      </div>

      <Section title="Accent">
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Accent ${c}`}
              onClick={() => set({ accent: c })}
              onPointerEnter={() => props.onPreview?.({ ...theme, accent: c })}
              onPointerLeave={() => props.onPreview?.(null)}
              className={cn('size-7 rounded-full border transition-transform hover:scale-110', accent === c && 'ring-2 ring-ring ring-offset-2')}
              style={{ background: c }}
            />
          ))}
          <label className="relative ml-1 flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border" title="Custom colour">
            <input
              type="color"
              value={accent}
              onChange={(e) => set({ accent: e.target.value })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Custom accent colour"
            />
            <span className="size-full" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
          </label>
        </div>
        <div className="font-mono text-xs text-muted-foreground">{accent}</div>
      </Section>

      <Section title="Colours">
        <ul className="space-y-1">
          {COLOR_TOKENS.map(({ id, label, hint }) => {
            const own = props.base.get(`--${id}`)
            const value = theme.colors?.[id]
            const shown = value ?? own ?? ''
            return (
              <li key={id} className="flex items-center gap-2" title={hint}>
                <label className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-md border" title={`${label} colour`}>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(shown) ? shown : '#000000'}
                    onChange={(e) => setColor(id, e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label={`${label} colour`}
                  />
                  <span className="block size-full" style={{ background: shown || 'transparent' }} />
                </label>
                <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                  {label}
                  <Info className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
                  <span className="sr-only">{hint}</span>
                </span>
                <span className={cn('max-w-24 truncate font-mono text-xs', value ? 'text-foreground' : 'text-muted-foreground')} title={shown}>
                  {shown}
                </span>
                <button
                  type="button"
                  onClick={() => setColor(id, undefined)}
                  disabled={!value}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:invisible"
                  title="Back to the design system's colour"
                  aria-label={`Reset ${label}`}
                >
                  <RotateCcw className="size-3" />
                </button>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section
        title="Corners"
        action={
          <button
            type="button"
            onClick={() => set({ radius: undefined, radiusPx: undefined })}
            disabled={!radiusChanged}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Default
          </button>
        }
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={radiusPx}
            onChange={(e) => set({ radiusPx: Number(e.target.value), radius: undefined })}
            className="h-2 flex-1 cursor-pointer accent-primary"
            aria-label="Corner radius"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{radiusPx}px</span>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['round', 'squircle'] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => set({ shape: shape === 'squircle' ? 'squircle' : undefined })}
              className={cn(
                'h-8 rounded-md text-xs capitalize transition-colors',
                (theme.shape ?? 'round') === shape ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              title={shape === 'squircle' ? 'Smooth iOS-style corners where the browser supports them; round corners elsewhere' : undefined}
            >
              {shape}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Fonts">
        <FontSelect label="Heading font" value={theme.headingFont} onChange={(v) => set({ headingFont: v })} />
        <FontSelect label="Body font" value={theme.bodyFont} onChange={(v) => set({ bodyFont: v })} />
      </Section>
    </div>
  )
}

function FontSelect(props: { label: string; value?: string; onChange: (id: string | undefined) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-muted-foreground">
        {props.label}
        <select className={cn(selectClass, 'mt-2 text-foreground')} value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value || undefined)}>
          <option value="">Design system default</option>
          <optgroup label="Sans">
            {FONTS.filter((f) => f.kind === 'sans').map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Serif">
            {FONTS.filter((f) => f.kind === 'serif').map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
    </div>
  )
}
