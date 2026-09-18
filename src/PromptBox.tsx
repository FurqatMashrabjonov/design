import { useState, type ReactNode } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function PromptBox(props: {
  placeholder: string
  extra?: ReactNode
  onSubmit: (prompt: string) => Promise<void>
}) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        placeholder={props.placeholder}
        aria-label="Design prompt"
        rows={3}
        disabled={busy}
        className="resize-none border-0 p-1 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">{props.extra}</div>
        <Button type="submit" size="icon" className="size-8 shrink-0 rounded-full" disabled={busy || !prompt.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  )
}
