import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function PromptBox(props: {
  placeholder: string
  extra?: ReactNode
  onSubmit: (prompt: string) => Promise<void>
  /** Shown instead of Send while a request runs; stops it. */
  onStop?: () => void
  /** Lets a suggestion chip fill the box. Changing `key` re-applies the same text. */
  fill?: { text: string; key: number }
}) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!props.fill) return
    setPrompt(props.fill.text)
    boxRef.current?.focus()
  }, [props.fill?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await props.onSubmit(prompt)
      setPrompt('')
    } catch (e) {
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
      className="rounded-xl border bg-card p-2.5 shadow-sm"
    >
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
          }
        }}
        placeholder={props.placeholder}
        aria-label="Design prompt"
        rows={3}
        className="resize-none border-0 p-1 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">{props.extra}</div>
        {busy && props.onStop ? (
          <Button type="button" size="icon" variant="outline" className="size-8 shrink-0 rounded-full" onClick={props.onStop} title="Stop generating" aria-label="Stop generating">
            <Square className="size-3 fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="size-8 shrink-0 rounded-full" disabled={busy || !prompt.trim()} aria-label="Send">
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  )
}
