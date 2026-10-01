import { useState, useEffect } from 'react'
import { Page, Navbar, Link, BlockTitle, List, ListItem, Button } from 'konsta/react'
import { Images, Zap, ScanLine, Sparkles, Plus } from 'lucide-react'
import { useNav, AppTabbar, Photo, Meter, Tile, Glow, tint } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const RESULT = {
  name: 'Peace lily',
  latin: 'Spathiphyllum wallisii',
  emoji: '🌸',
  confidence: 0.94,
  photo: 'peace lily white flower',
}
const ALTERNATES = [
  { name: 'Anthurium', emoji: '🌺', pct: 0.04 },
  { name: 'Calla lily', emoji: '🌷', pct: 0.02 },
]

function Corner({ pos }) {
  const map = {
    tl: 'top-0 left-0 border-t-4 border-l-4 rounded-tl-[28px]',
    tr: 'top-0 right-0 border-t-4 border-r-4 rounded-tr-[28px]',
    bl: 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[28px]',
    br: 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-[28px]',
  }
  return <div className={`absolute w-10 h-10 border-white ${map[pos]}`} />
}

export default function Screen() {
  const nav = useNav()
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(true)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!scanning) return
    const t = setTimeout(() => { setScanning(false); setScanned(true) }, 1400)
    return () => clearTimeout(t)
  }, [scanning])

  const shoot = () => { setScanned(false); setScanning(true) }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Identify" subtitle="Point at a leaf or flower"
        right={<Link iconOnly onClick={() => setFlash(!flash)}><Zap className={`w-6 h-6 ${flash ? 'text-primary' : ''}`} /></Link>} />

      <div className="px-4 pt-2">
        <div className="relative overflow-hidden rounded-card bg-black">
          <Photo q="peace lily leaves closeup" className="w-full h-[380px]">
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative w-56 h-56 rounded-[28px] border border-white/40 ${scanning ? 'animate-pulse' : ''}`}>
                <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
                {scanning && <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-white/80 rounded-full" />}
              </div>
            </div>
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-footnote flex items-center gap-1.5">
                <ScanLine className="w-4 h-4" />
                {scanning ? 'Looking closely…' : 'Center a leaf in the frame'}
              </span>
            </div>
          </Photo>
        </div>

        <div className="flex items-center justify-between px-6 py-5">
          <button className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center" aria-label="Gallery">
            <Images className="w-6 h-6 opacity-70" />
          </button>
          <button onClick={shoot} aria-label="Scan"
            className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center active:scale-95 transition-transform">
            <span className="w-16 h-16 rounded-full bg-primary" />
          </button>
          <button onClick={() => setFlash(!flash)} aria-label="Flash"
            className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center">
            <Zap className={`w-6 h-6 ${flash ? 'text-primary' : 'opacity-70'}`} />
          </button>
        </div>
      </div>

      {scanned && (
        <>
          <div className="px-4 vs-rise">
            <div className="relative bg-card rounded-card p-4 overflow-hidden">
              <div className="absolute -top-20 -right-20 pointer-events-none"><Glow color={C.fertilize} size={200} opacity={0.25} /></div>
              <div className="relative flex gap-4 items-center">
                <Photo q={RESULT.photo} className="w-24 h-24 rounded-2xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-caption1 font-semibold" style={{ color: C.fertilize }}>
                    <Sparkles className="w-3.5 h-3.5" /> Best match
                  </div>
                  <div className="text-title2 truncate">{RESULT.name} {RESULT.emoji}</div>
                  <div className="text-subhead italic text-black/55 dark:text-white/55 truncate">{RESULT.latin}</div>
                </div>
              </div>
              <div className="relative mt-4">
                <div className="flex justify-between text-footnote mb-1.5">
                  <span className="text-black/55 dark:text-white/55">Confidence</span>
                  <span className="font-semibold" style={{ color: C.fertilize }}>94%</span>
                </div>
                <Meter value={RESULT.confidence} color={C.fertilize} height={8} />
              </div>
              <Button large rounded className="relative mt-5" onClick={() => nav.push('add-plant')}>
                <Plus className="w-5 h-5 mr-1.5" /> Add to my plants
              </Button>
            </div>
          </div>

          <BlockTitle>Could also be</BlockTitle>
          <List strong inset dividers>
            {ALTERNATES.map((a, i) => (
              <ListItem key={a.name} className="vs-rise" style={{ animationDelay: `${(i + 1) * 60}ms` }}
                title={a.name}
                media={<Tile tinted color={C.rotate} size={40}><span className="text-xl">{a.emoji}</span></Tile>}
                after={
                  <div className="w-20 flex flex-col items-end gap-1">
                    <span className="text-subhead font-semibold" style={{ color: C.rotate }}>{Math.round(a.pct * 100)}%</span>
                    <Meter value={a.pct * 5} color={C.rotate} height={4} />
                  </div>
                } />
            ))}
          </List>

          <div className="mx-4 mt-2 mb-4 rounded-card p-4 flex gap-3 items-start" style={{ background: tint(C.water, 14) }}>
            <ScanLine className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.water }} />
            <p className="text-footnote text-black/70 dark:text-white/70">
              Not quite right? Try again in soft daylight with one leaf filling the frame.
            </p>
          </div>
        </>
      )}

      {!scanned && (
        <div className="px-4">
          <div className="bg-card rounded-card p-6 text-center">
            <div className="text-5xl vs-float">🔍</div>
            <div className="text-headline mt-3">Hold still for a moment</div>
            <div className="text-subhead text-black/55 dark:text-white/55 mt-1">Leaflet is reading the leaf shape and veins.</div>
          </div>
        </div>
      )}

      <AppTabbar active="identify" />
    </Page>
  )
}
