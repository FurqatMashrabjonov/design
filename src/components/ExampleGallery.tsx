import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EXAMPLES, exampleShot, type Example } from '@/content/examples'

// The landing's examples: each prototype as a card (its prompt and three screens); a click opens every screen of it,
// full size, in a row you scroll. Pictures only — the screens as they were drawn (see content/examples.ts).
export function ExampleGallery() {
  const [open, setOpen] = useState<Example | null>(null)
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setOpen(ex)}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-1 transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex justify-center gap-2 bg-background/60 px-4 pt-5">
              {ex.screens.slice(0, 3).map((sc, i) => (
                <img
                  key={sc.slug}
                  src={exampleShot(ex.id, sc.slug, 'sm')}
                  alt={`${ex.name} — ${sc.name}`}
                  loading="lazy"
                  width={440}
                  height={952}
                  className={`w-[30%] rounded-t-[14px] border border-b-0 border-border object-cover object-top shadow-2 ${i === 1 ? '' : 'mt-4'} aspect-[390/600]`}
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col border-t border-border p-5">
              <p className="flex items-center justify-between gap-2 font-medium">
                {ex.name}
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors group-hover:text-foreground">
                  {ex.screens.length} screens <ArrowRight className="size-3.5" />
                </span>
              </p>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">“{ex.prompt}”</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-5 sm:max-w-[min(1200px,calc(100%-2rem))] sm:p-7">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{open.name}</DialogTitle>
                <DialogDescription className="line-clamp-4 max-w-3xl leading-relaxed sm:line-clamp-none">
                  <span className="font-medium text-foreground">The prompt:</span> “{open.prompt}”
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 sm:-mx-7 sm:px-7">
                {open.screens.map((sc) => (
                  <figure key={sc.slug} className="m-0 shrink-0 snap-start">
                    <img src={exampleShot(open.id, sc.slug)} alt={`${open.name} — ${sc.name}`} width={780} height={1688} className="w-[240px] rounded-[30px] border border-border shadow-2 sm:w-[260px]" />
                    <figcaption className="mt-2 text-center text-xs text-muted-foreground">{sc.name}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Exactly as drawn from this one prompt — not edited.</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
