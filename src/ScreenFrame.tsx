import { useEffect, useRef, useState, type ReactNode } from 'react'
import { frameSize } from './canvas'
import { cn } from '@/lib/utils'

// Renders at native pixel size (1440x900 / 390x844) — the canvas's own transform handles zoom.
export function ScreenFrame(props: {
  html: string
  title: string
  device: string
  hint?: string
  selected?: boolean
  streaming?: boolean
  // Swaps the plain text label for a custom row (FrameToolbar) — only real saved screens get one;
  // the live-streaming and plan-preview frames keep the default.
  label?: ReactNode
}) {
  const f = frameSize(props.device)
  // A new srcdoc reloads the iframe, so a streaming preview refreshes at most every 800ms
  const html = useThrottled(props.html, props.streaming ? 800 : 0)

  return (
    <figure className="group" style={{ width: f.width }}>
      {props.label ?? (
        <figcaption
          className="mb-2 flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground"
          title={props.hint}
        >
          {props.streaming && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary" />}
          {props.title}
        </figcaption>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow',
          props.selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        )}
        style={{ width: f.width, height: f.height }}
      >
        {/* No allow-same-origin: generated JS must not reach this app's origin. pointer-events-none: clicks drive canvas drag, not the page inside. */}
        <iframe
          title={props.title}
          srcDoc={html}
          sandbox="allow-scripts"
          className="pointer-events-none"
          style={{ width: f.width, height: f.height }}
        />
      </div>
    </figure>
  )
}

function useThrottled<T>(value: T, ms: number) {
  const [out, setOut] = useState(value)
  const last = useRef(0)
  useEffect(() => {
    if (ms <= 0) {
      setOut(value)
      return
    }
    const t = setTimeout(
      () => {
        last.current = Date.now()
        setOut(value)
      },
      Math.max(0, last.current + ms - Date.now()),
    )
    return () => clearTimeout(t)
  }, [value, ms])
  return out
}
