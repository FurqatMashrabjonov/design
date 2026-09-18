import { useEffect, useRef, useState } from 'react'

const FRAME = {
  desktop: { width: 1440, height: 900, scale: 0.5 },
  mobile: { width: 390, height: 844, scale: 0.75 },
}

export function ScreenFrame(props: { html: string; title: string; device: string; zoom?: number; hint?: string }) {
  const f = FRAME[props.device as keyof typeof FRAME] ?? FRAME.desktop
  const scale = f.scale * (props.zoom ?? 1)
  // A new srcdoc reloads the iframe, so a streaming preview refreshes at most every 800ms
  const html = useThrottled(props.html, 800)

  return (
    <figure>
      <figcaption className="mb-2 text-sm text-neutral-400" title={props.hint}>
        {props.title}
      </figcaption>
      <div
        className="overflow-hidden rounded-lg border border-neutral-800 bg-white"
        style={{ width: f.width * scale, height: f.height * scale }}
      >
        {/* No allow-same-origin: generated JS must not reach this app's origin */}
        <iframe
          title={props.title}
          srcDoc={html}
          sandbox="allow-scripts"
          style={{ width: f.width, height: f.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}
        />
      </div>
    </figure>
  )
}

function useThrottled<T>(value: T, ms: number) {
  const [out, setOut] = useState(value)
  const last = useRef(0)
  useEffect(() => {
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
