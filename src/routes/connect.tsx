import { useEffect, useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Copy, Check, KeyRound, Trash2 } from 'lucide-react'
import { createApiKey, getSession, listApiKeys, revokeApiKey } from '../server/fns'
import { BrandLink } from '@/components/SiteChrome'
import { AccountMenu } from '@/components/AccountMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// MCP-01: connect a coding agent (Claude Code, Cursor, Codex…) to Screenspell over MCP with a personal API key.
// The key is shown once, at creation; the list shows only its first characters.

export const Route = createFileRoute('/connect')({
  beforeLoad: async ({ location }) => {
    const { user } = await getSession()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user }
  },
  loader: () => listApiKeys(),
  head: () => ({ meta: [{ title: 'Connect an AI agent' }] }),
  component: ConnectPage,
})

const day = (s: number) => new Date(s * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })

function CopyBlock({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="relative mt-2 rounded-lg border bg-muted/50 p-3 pr-11 font-mono text-sm break-all">
      {text}
      <Button size="icon" variant="ghost" className="absolute right-1.5 top-1.5 size-8" aria-label="Copy"
        onClick={() => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}>
        {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}

function ConnectPage() {
  const { keys } = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The server renders the public address; the browser swaps in its own after hydration (dev, previews).
  const [url, setUrl] = useState('https://screenspell.app/api/mcp')
  useEffect(() => setUrl(`${window.location.origin}/api/mcp`), [])
  const key = fresh ?? 'ss_your_key'
  const card = 'rounded-xl border bg-card p-6 shadow-1'

  const create = async () => {
    setError(null)
    try {
      const r = await createApiKey({ data: { name: name || 'Claude Code' } })
      setFresh(r.key)
      setName('')
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a key')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <BrandLink />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Projects</Link>
        <h1 className="mt-3 text-3xl">Connect an AI agent</h1>
        <p className="mt-2 text-muted-foreground">Let Claude Code, Cursor or any MCP client design apps in Screenspell, read a screen’s code and picture, and download the whole app as a React project. Generation uses your credits, as in the studio.</p>

        <section className={`${card} mt-6`} aria-label="API keys">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5" /> 1. Make a key</h2>
          <div className="mt-4 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Claude Code on my laptop" maxLength={60} aria-label="Key name" />
            <Button onClick={create}>Create key</Button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {fresh && (
            <div className="mt-4">
              <p className="text-sm font-medium">Copy it now — it won’t be shown again.</p>
              <CopyBlock text={fresh} />
            </div>
          )}
          {keys.length > 0 && (
            <ul className="mt-5 divide-y border-t">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{k.name}</div>
                    <div className="text-muted-foreground"><span className="font-mono">{k.prefix}…</span> · made {day(k.createdAt)} · {k.lastUsedAt ? `used ${day(k.lastUsedAt)}` : 'never used'}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => { await revokeApiKey({ data: { id: k.id } }); if (fresh?.startsWith(k.prefix)) setFresh(null); await router.invalidate() }}>
                    <Trash2 className="size-4" /> Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} mt-4`} aria-label="Add to your agent">
          <h2 className="text-lg font-semibold">2. Add it to your agent</h2>
          <p className="mt-3 text-sm text-muted-foreground">Claude Code:</p>
          <CopyBlock text={`claude mcp add --transport http screenspell ${url} --header "Authorization: Bearer ${key}"`} />
          <p className="mt-4 text-sm text-muted-foreground">Cursor, Windsurf and others (mcp.json):</p>
          <CopyBlock text={JSON.stringify({ mcpServers: { screenspell: { url, headers: { Authorization: `Bearer ${key}` } } } })} />
        </section>

        <section className={`${card} mt-4`} aria-label="Try it">
          <h2 className="text-lg font-semibold">3. Ask</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>“Design a habit tracker app in Screenspell, then build it here from its screens.”</li>
            <li>“List my Screenspell apps and export the newest as a React project.”</li>
            <li>“Make the Today screen of my fitness app darker and add a streak card.”</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
