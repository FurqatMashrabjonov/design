import { useState } from 'react'
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { runCritique, applyCritiqueFix } from '@/server/fns'
import type { CritiqueResult } from '@/app/Services/CritiqueService'

export function CritiquePanel(props: {
  selectedScreen: { id: string; name: string; html: string } | null
  projectId: string
  onRestored: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<CritiqueResult | null>(null)

  if (!props.selectedScreen) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <ShieldCheck className="mb-2 size-8 text-muted-foreground/60" />
        <p className="font-medium text-foreground">Design Jury (Critique Theater)</p>
        <p className="mt-1 text-xs">
          Select a screen on the canvas to audit it against 4 core design dimensions.
        </p>
      </div>
    )
  }

  async function handleRun() {
    if (!props.selectedScreen) return
    setLoading(true)
    try {
      const res = await runCritique({
        data: {
          screenId: props.selectedScreen.id,
          projectId: props.projectId,
        },
      })
      setResult(res)
      if (res.passed) {
        toast.success(`Screen cleared Design Jury with score ${res.composite}/10!`)
      } else {
        toast.warning(`Score: ${res.composite}/10. Review must-fix recommendations.`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Critique run failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyFix() {
    if (!props.selectedScreen || !result?.revisedHtml) return
    setApplying(true)
    try {
      await applyCritiqueFix({
        data: {
          screenId: props.selectedScreen.id,
          projectId: props.projectId,
          revisedHtml: result.revisedHtml,
        },
      })
      toast.success('Applied AI-revised improvements!')
      props.onRestored()
      setResult(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply fixes')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Design Jury Audit</h3>
          <p className="text-xs text-muted-foreground">
            Auditing <span className="font-medium text-foreground">{props.selectedScreen.name}</span>
          </p>
        </div>
        <Button size="sm" onClick={handleRun} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
              Auditing…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 size-3.5" />
              Run Jury
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4 rounded-xl border bg-card p-3.5 text-sm">
          {/* Composite Score Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Composite Score</span>
              <div className="text-2xl font-bold tracking-tight">
                {result.composite} <span className="text-xs font-normal text-muted-foreground">/ 10</span>
              </div>
            </div>
            <Badge variant={result.passed ? 'default' : 'destructive'} className="text-xs">
              {result.passed ? (
                <>
                  <CheckCircle2 className="mr-1 size-3" /> Shipped
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-1 size-3" /> Below Threshold (8.0)
                </>
              )}
            </Badge>
          </div>

          {/* 4 Dimension Scores */}
          <div className="space-y-2 text-xs">
            <DimensionRow label="Layout & Hierarchy (30%)" score={result.scores.layout} />
            <DimensionRow label="Brand & Tokens (25%)" score={result.scores.brandCompliance} />
            <DimensionRow label="Accessibility WCAG (25%)" score={result.scores.accessibility} />
            <DimensionRow label="Copy & Content (20%)" score={result.scores.copyQuality} />
          </div>

          {/* Must-Fix list */}
          {result.mustFix.length > 0 && (
            <div className="space-y-1.5 border-t pt-2.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertTriangle className="size-3" /> Must Fix ({result.mustFix.length})
              </span>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {result.mustFix.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions list */}
          {result.suggestions.length > 0 && (
            <div className="space-y-1.5 border-t pt-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Suggestions</span>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply revised HTML button if available */}
          {result.revisedHtml && (
            <div className="border-t pt-3">
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApplyFix}
                disabled={applying}
              >
                {applying ? (
                  <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="mr-1.5 size-3.5" />
                )}
                Apply AI Improved Version
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DimensionRow({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score * 10))
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
