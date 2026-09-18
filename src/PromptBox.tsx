import { useState, type ReactNode } from 'react'

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
      className="rounded-xl border border-neutral-800 bg-neutral-900 p-3"
    >
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        placeholder={props.placeholder}
        aria-label="Design prompt"
        rows={4}
        disabled={busy}
        className="w-full resize-none bg-transparent outline-none placeholder:text-neutral-600"
      />
      <div className="flex items-center justify-between gap-2">
        <div>{props.extra}</div>
        <button
          disabled={busy || !prompt.trim()}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40"
        >
          {busy ? 'Designing… (up to a minute)' : 'Generate ⌘↵'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  )
}
