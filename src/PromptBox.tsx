import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUp, ImagePlus, Square, X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PromptBox(props: {
  placeholder: string
  extra?: ReactNode
  onSubmit: (prompt: string, images?: string[]) => Promise<void>
  /** LLM-02: show the paperclip. Off where an attachment would have nowhere to go (the dashboard). */
  attachments?: boolean
  /**
   * CHAT-01: true while anything runs (a planned run, an edit, the automatic check) — the send
   * button is then the Stop button. Comes from the page, not from this box's own request, because
   * a run started from the dashboard never went through this box.
   */
  running?: boolean
  /** Stops whatever is running; Esc does the same. */
  onStop?: () => void
  /** CHAT-03: what was typed while something ran. It is sent when the run ends. */
  queued?: string | null
  onQueue?: (prompt: string | null) => void
  /** CHAT-04: ↑ in an empty box brings the last prompt back. */
  lastPrompt?: string
  /** Lets a suggestion chip fill the box. Changing `key` re-applies the same text. */
  fill?: { text: string; key: number }
  /** UI-10: `hero` is the landing's big box — larger type, a labelled lime button, a raised shadow. */
  variant?: 'default' | 'hero'
  /** The hero button's words. */
  submitLabel?: string
  /** What the box starts with (the landing restores a prompt kept for after sign-in). */
  defaultValue?: string
  /** A quiet note beside the send button. */
  hint?: ReactNode
  /** Accessible name of the text box. */
  label?: string
}) {
  const hero = props.variant === 'hero'
  const [prompt, setPrompt] = useState(props.defaultValue ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // LLM-02: reference pictures for the next message, as data URLs. They belong to that one request.
  const [images, setImages] = useState<string[]>([])
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function attach(files: FileList | null) {
    const picked = [...(files ?? [])].filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type)).slice(0, 2 - images.length)
    if (!picked.length) return
    setError('')
    const read = await Promise.all(
      picked.map(
        (f) =>
          new Promise<string | null>((resolve) => {
            if (f.size > 1_000_000) return resolve(null) // the server drops these anyway; say so here
            const r = new FileReader()
            r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
            r.onerror = () => resolve(null)
            r.readAsDataURL(f)
          }),
      ),
    )
    const ok = read.filter((d): d is string => Boolean(d))
    if (ok.length < picked.length) setError('An image over 1 MB was skipped — a screenshot is usually well under it.')
    setImages((was) => [...was, ...ok].slice(0, 2))
  }
  useEffect(() => {
    if (!props.fill) return
    setPrompt(props.fill.text)
    boxRef.current?.focus()
  }, [props.fill?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const running = Boolean(props.running || busy)

  async function submit() {
    const text = prompt.trim()
    if (!text) return
    if (running) {
      // Typed while something runs: it waits its turn instead of being refused.
      if (props.onQueue) {
        props.onQueue(text)
        setPrompt('')
      }
      return
    }
    // The box empties the moment the message is sent, as in every chat; it comes back only if the
    // send itself failed, so nothing typed is lost.
    setBusy(true)
    setError('')
    setPrompt('')
    const sent = images
    setImages([])
    try {
      await props.onSubmit(text, sent.length ? sent : undefined)
    } catch (e) {
      setImages(sent)
      setPrompt(text)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        'border bg-card text-card-foreground transition-shadow duration-(--duration-base) ease-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        hero ? 'rounded-xl p-3 shadow-3' : 'rounded-lg p-2.5 shadow-1',
      )}
    >
      {props.queued && (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs">
          <span className="shrink-0 font-medium text-muted-foreground">Queued</span>
          <span className="min-w-0 flex-1 truncate">{props.queued}</span>
          <button type="button" onClick={() => props.onQueue?.(null)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Cancel the queued message" title="Cancel">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {images.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {images.map((src, i) => (
            <span key={i} className="relative">
              <img src={src} alt={`Reference ${i + 1}`} className="size-12 rounded-md border object-cover" />
              <button
                type="button"
                onClick={() => setImages((was) => was.filter((_, k) => k !== i))}
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
                aria-label={`Remove reference ${i + 1}`}
                title="Remove"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Textarea
        data-prompt-input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        ref={boxRef}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter breaks the line — what every chat box does. Not while an IME is composing.
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape' && running && props.onStop) {
            e.preventDefault()
            props.onStop()
          } else if (e.key === 'ArrowUp' && !prompt && props.lastPrompt) {
            e.preventDefault()
            setPrompt(props.lastPrompt)
          }
        }}
        onPaste={(e) => {
          if (!props.attachments) return
          const files = [...e.clipboardData.files]
          if (files.length) {
            e.preventDefault()
            attach(e.clipboardData.files)
          }
        }}
        placeholder={props.placeholder}
        aria-label={props.label ?? 'Design prompt'}
        rows={3}
        maxLength={hero ? 2000 : undefined}
        className={cn('resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent', hero && 'px-2 text-base leading-relaxed md:text-base')}
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {props.attachments && (
            <>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { attach(e.target.files); e.target.value = '' }} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= 2}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                title={images.length >= 2 ? 'Two reference images is the limit' : 'Attach a reference image'}
                aria-label="Attach a reference image"
              >
                <ImagePlus className="size-4" />
              </button>
            </>
          )}
          {props.extra}
          {props.hint && <span className="px-1 text-xs text-muted-foreground">{props.hint}</span>}
        </div>
        {running && props.onStop ? (
          <Button type="button" size="icon-sm" className="shrink-0 rounded-full" onClick={props.onStop} title="Stop (Esc)" aria-label="Stop generating">
            <Square className="size-3 fill-current" />
          </Button>
        ) : hero ? (
          <Button type="submit" size="lg" className="shrink-0" disabled={!prompt.trim()}>
            {props.submitLabel ?? 'Send'} <ArrowUp />
          </Button>
        ) : (
          <Button type="submit" size="icon-sm" className="shrink-0 rounded-full" disabled={!prompt.trim()} aria-label={running ? 'Queue' : 'Send'} title={running ? 'Send when the current run ends' : 'Send'}>
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  )
}
