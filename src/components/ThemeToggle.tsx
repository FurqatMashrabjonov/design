import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export const THEME_KEY = 'od:theme'

/** UI-25: light ↔ dark cross-fades the studio's colours for a moment instead of snapping. */
export function applyDark(dark: boolean) {
  const root = document.documentElement
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!calm) root.classList.add('od-theme-switch')
  root.classList.toggle('dark', dark)
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  } catch {}
  if (!calm) setTimeout(() => root.classList.remove('od-theme-switch'), 260)
}

/** UI-06: one button, two states. Dark or light — the choice is saved, nothing else to decide. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false)

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])

  function toggle() {
    const next = !dark
    applyDark(next)
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground hover:text-foreground', className)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
