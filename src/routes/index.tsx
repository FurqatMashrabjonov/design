import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getHome } from '../server/fns'
import { generate } from '../generate'
import { extractArtifact } from '../artifact'
import { frameSize } from '../canvas'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  component: Home,
})

const PREVIEW_WIDTH = 220

function Home() {
  const { projects, designSystems } = Route.useLoaderData()
  const navigate = useNavigate()
  const [device, setDevice] = useState('desktop')
  const [designSystem, setDesignSystem] = useState('minimal')
  const [live, setLive] = useState('')

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">What do you want to design?</h1>
      <p className="mb-8 text-muted-foreground">Describe a screen. Get a working UI.</p>

      <PromptBox
        placeholder="A fintech dashboard with balance, recent transactions and a spending chart"
        extra={
          <>
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger size="sm" aria-label="Device" className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>
            <Select value={designSystem} onValueChange={setDesignSystem}>
              <SelectTrigger size="sm" aria-label="Design system" className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {designSystems.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        onSubmit={async (prompt) => {
          try {
            const projectId = await generate({ prompt, device, designSystem }, setLive)
            navigate({ to: '/p/$projectId', params: { projectId } })
          } finally {
            setLive('')
          }
        }}
      />

      {live && (
        <div className="mt-8">
          <ScaledPreview html={extractArtifact(live).html} device={device} />
        </div>
      )}

      {projects.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Projects</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to="/p/$projectId" params={{ projectId: p.id }}>
                <Card className="gap-2 overflow-hidden py-0 transition-colors hover:border-primary/50">
                  {/* ponytail: no real screenshot — that needs server-side rendering (puppeteer or similar). Device-shaped placeholder for now. */}
                  <div className="flex h-28 items-center justify-center bg-muted/40">
                    <div
                      className="rounded-md border-2 bg-background"
                      style={
                        p.device === 'mobile' ? { width: 34, height: 60, borderRadius: 8 } : { width: 72, height: 46 }
                      }
                    />
                  </div>
                  <CardContent className="pb-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {p.device}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {p.design_system}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

// Scales a native-size ScreenFrame down to a fixed preview width.
function ScaledPreview(props: { html: string; device: string }) {
  const f = frameSize(props.device)
  const scale = PREVIEW_WIDTH / f.width
  return (
    <div style={{ width: PREVIEW_WIDTH, height: f.height * scale, overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <ScreenFrame html={props.html} title="Designing…" device={props.device} streaming />
      </div>
    </div>
  )
}
