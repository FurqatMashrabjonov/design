import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { parseHeightMessage, withHeightProbe } from '@/lib/frame-height'
import { getSystem } from '../server/fns'
import { PENDING_PROMPT } from '../Landing'
import { BRAND, SitePage } from '@/components/SiteChrome'
import { Button } from '@/components/ui/button'

// MKT-06: one design system — its style card in full, and the palette drawn from its own tokens
// (the same sample the canvas shows), so the page proves the claim instead of describing it.
export const Route = createFileRoute('/systems/$id')({
  loader: ({ params }) => getSystem({ data: params.id }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? 'Design system'} — ${BRAND}` },
      { name: 'description', content: loaderData?.description || `The ${loaderData?.name} design system: tokens, type and components every generated screen shares.` },
    ],
  }),
  component: System,
})

function System() {
  const s = Route.useLoaderData()
  const navigate = useNavigate()
  // The style card is a short markdown card: headings, bullets, plain lines. Rendering those three
  // shapes is the whole job — a markdown dependency for one page would not pay for itself.
  const lines = s.card.split('\n')
  return (
    <SitePage className="max-w-5xl">
      <Link to="/systems" className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        ← Design systems
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">{s.name}</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">{s.category}</p>
        </div>
        <Button
          size="lg"
          className="font-semibold"
          onClick={() => {
            try {
              sessionStorage.setItem(PENDING_PROMPT, `A mobile app in the ${s.name} style`)
            } catch {}
            navigate({ to: '/' })
          }}
        >
          Design an app in this style
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3 text-sm leading-relaxed">
          {lines.map((line, i) => {
            const t = line.trim()
            if (!t) return null
            if (t.startsWith('#')) return <h2 key={i} className="pt-4 text-base font-semibold">{t.replace(/^#+\s*/, '')}</h2>
            if (t.startsWith('- ') || t.startsWith('* '))
              return (
                <p key={i} className="flex gap-2 text-muted-foreground">
                  <span aria-hidden>·</span>
                  <span>{t.slice(2)}</span>
                </p>
              )
            return <p key={i} className="text-muted-foreground">{t}</p>
          })}
        </div>
        <SampleFrame name={s.name} html={s.sample} />
      </div>
    </SitePage>
  )
}

// UI-16: the palette sample measures itself (the canvas's height probe) instead of sitting in a
// fixed 640px box that clipped its last card. The iframe stays sandboxed; only its own messages count.
const SAMPLE_MIN = 320
function SampleFrame({ name, html }: { name: string; html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(640)
  const src = useMemo(() => withHeightProbe(html, 'ds-sample', SAMPLE_MIN), [html])
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return
      const msg = parseHeightMessage(e.data, SAMPLE_MIN)
      if (msg?.frameId === 'ds-sample') setHeight(msg.height)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return (
    <iframe
      ref={ref}
      title={`${name} palette`}
      srcDoc={src}
      sandbox="allow-scripts"
      style={{ height }}
      className="w-full rounded-xl border border-border bg-card shadow-2 lg:w-[520px]"
    />
  )
}
