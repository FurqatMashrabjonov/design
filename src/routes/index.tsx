import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getHome, createProject } from '../server/fns'
import { PromptBox } from '../PromptBox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  component: Home,
})

function Home() {
  const { projects, designSystems } = Route.useLoaderData()
  const navigate = useNavigate()
  const [device, setDevice] = useState('desktop')
  const [designSystem, setDesignSystem] = useState('minimal')

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">What do you want to design?</h1>
      <p className="mb-8 text-muted-foreground">Describe an app. A planner scopes 3–5 screens and designs all of them.</p>

      <PromptBox
        placeholder="A fintech app to track balance, transactions, and spending by category"
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
          const { id } = await createProject({ data: { device, designSystem } })
          navigate({ to: '/p/$projectId', params: { projectId: id }, search: { brief: prompt } })
        }}
      />

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
