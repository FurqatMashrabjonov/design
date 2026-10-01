import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EXAMPLES, exampleShot, type Example } from '@/content/examples'
import { LoadingImage } from '@/components/LoadingImage'
import { DeviceFrame } from '@/components/DeviceFrame'
import { DEVICES } from '@/lib/devices'

// The landing's examples: each prototype as a card (its prompt and three screens); a click opens every screen of it
// in a row you scroll. The screens are pictures (see content/examples.ts) on the studio's own iPhone 18 Pro Max —
// bezel, Dynamic Island, status bar and home indicator drawn by DeviceFrame, which the pictures were made to fit.
const PHONE = DEVICES.find((d) => d.id === 'iphone-18-pro-max')!

function Phone({ ex, slug, name, scale, size }: { ex: Example; slug: string; name: string; scale: number; size: 'sm' | 'full' }) {
  return (
    <DeviceFrame device={PHONE} scale={scale} dark={ex.dark}>
      <LoadingImage src={exampleShot(ex.id, slug, size)} alt={`${ex.name} — ${name}`} width={PHONE.w} height={PHONE.h} imgClassName="object-top" style={{ width: PHONE.w, height: PHONE.h }} />
    </DeviceFrame>
  )
}

export function ExampleGallery() {
  const [open, setOpen] = useState<Example | null>(null)
  return (
    <>
      {/* A row to swipe on a phone (nine cards stacked were 3 000px of scrolling), a grid from sm up. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setOpen(ex)}
            className="group flex w-[82%] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-1 transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {/* On a phone the card is narrower than three phones at 0.2: the row is zoomed down rather than clipped. */}
            <div className="flex items-start justify-center gap-2.5 bg-background/60 px-3 pt-5 pb-4 max-sm:[zoom:0.8]">
              {ex.screens.slice(0, 3).map((sc, i) => (
                <div key={sc.slug} className={i === 1 ? '' : 'mt-4'}>
                  <Phone ex={ex} slug={sc.slug} name={sc.name} scale={0.2} size="sm" />
                </div>
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
        <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-5 sm:max-w-[min(1240px,calc(100%-2rem))] sm:p-7">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{open.name}</DialogTitle>
                <DialogDescription className="line-clamp-4 max-w-3xl leading-relaxed sm:line-clamp-none">
                  <span className="font-medium text-foreground">The prompt:</span> “{open.prompt}”
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pt-1 pb-3 sm:-mx-7 sm:px-7">
                {open.screens.map((sc) => (
                  <figure key={sc.slug} className="m-0 shrink-0 snap-start">
                    <Phone ex={open} slug={sc.slug} name={sc.name} scale={0.54} size="full" />
                    <figcaption className="mt-3 text-center text-xs text-muted-foreground">{sc.name}</figcaption>
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
