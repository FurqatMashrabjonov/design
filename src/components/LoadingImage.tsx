import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// UI-31: every picture the studio shows over the network. Until it arrives its box is a shimmer in the studio's
// tokens (the same one a waiting frame uses), so a slow connection shows a page taking shape, never empty boxes or a
// broken-image icon with its alt text. It fades in when loaded, is retried twice with a growing pause (a deploy, a
// dropped packet), and after that stays a quiet block — or hands over to `onFail` (the dashboard falls back to the
// live frame). The box is the wrapper: size, corners and borders go on `className`; the picture fills it.
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'className' | 'style' | 'onLoad' | 'onError'> & {
  src: string
  className?: string
  style?: CSSProperties
  /** Extra classes for the <img> itself (object-position and the like). */
  imgClassName?: string
  retries?: number
  onFail?: () => void
}

export function LoadingImage({ src, className, style, imgClassName, retries = 2, onFail, loading = 'lazy', ...img }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    setState('loading')
    setAttempt(0)
  }, [src])
  // A picture already in the browser's cache can finish before React listens (server-rendered pages).
  useEffect(() => {
    const el = ref.current
    if (el?.complete && el.naturalWidth > 0) setState('loaded')
  }, [src, attempt])
  useEffect(() => {
    if (state !== 'failed') return
    onFail?.()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const url = attempt ? `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}` : src
  return (
    <span className={cn('od-img relative block overflow-hidden', className)} style={style} data-state={state}>
      {state !== 'failed' && (
        <img
          ref={ref}
          key={url}
          src={url}
          loading={loading}
          decoding="async"
          draggable={false}
          {...img}
          className={cn('block size-full object-cover', imgClassName)}
          onLoad={() => setState('loaded')}
          onError={() => {
            if (attempt >= retries) return setState('failed')
            setTimeout(() => setAttempt((a) => a + 1), 700 * (attempt + 1))
          }}
        />
      )}
    </span>
  )
}
