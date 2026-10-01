import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link, Button, Toast } from 'konsta/react'
import { Share, Timer, Gauge, HeartPulse, Flame, Mountain, MapPin, Check } from 'lucide-react'
import { useNav, Photo, Bars, Meter, Medal, Tile, CountUp, Confetti, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const RUN = {
  type: 'Tempo Run', emoji: '🔥', date: 'Thu 1 Oct', km: 6.02, time: '34:41', pace: '5:46', hr: 162, hrMax: 178, kcal: 412, elev: '+38 m',
  route: 'Ribeira das Naus → Cais do Sodré', photo: 'Lisbon riverside running path', target: '5:45',
}
const SPLITS = [
  { km: '1', pace: '5:58', sec: 358 },
  { km: '2', pace: '5:47', sec: 347 },
  { km: '3', pace: '5:42', sec: 342 },
  { km: '4', pace: '5:44', sec: 344 },
  { km: '5', pace: '5:39', sec: 339 },
  { km: '0.02', pace: '5:36', sec: 336 },
]
const FASTEST = 4
const ZONES = [
  { z: 'Z1', name: 'Recovery', min: 3, color: '#94a3b8' },
  { z: 'Z2', name: 'Easy', min: 6, color: '#3b82f6' },
  { z: 'Z3', name: 'Aerobic', min: 11, color: '#10b981' },
  { z: 'Z4', name: 'Threshold', min: 12, color: '#f59e0b' },
  { z: 'Z5', name: 'Max', min: 3, color: '#ef4444' },
]
const ZONE_TOTAL = ZONES.reduce((s, z) => s + z.min, 0)
const ZONE_MAX = Math.max(...ZONES.map((z) => z.min))

export default function Screen() {
  const nav = useNav()
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(false)

  const save = () => {
    setSaved(true)
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  const stats = [
    { label: 'Time', value: RUN.time, unit: 'total', icon: Timer },
    { label: 'Pace', value: RUN.pace, unit: '/km avg', icon: Gauge },
    { label: 'Heart', value: RUN.hr, unit: 'bpm avg', icon: HeartPulse },
    { label: 'Energy', value: RUN.kcal, unit: 'kcal', icon: Flame },
  ]

  return (
    <Page className="pb-40">
      <Navbar
        title="Run Summary"
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly onClick={() => setToast(true)}><Share className="w-6 h-6" /></Link>}
      />

      <div className="px-4 mt-4 vs-rise">
        <Photo q={RUN.photo} className="w-full h-52 rounded-card relative overflow-hidden">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-lg" style={{ background: 'linear-gradient(135deg,#fcd34d,#f59e0b)', color: '#3b2a00' }}>
            <span>🏅</span>
            <span className="text-footnote font-semibold">Personal Best · Fastest 5K 28:41</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
            <div className="flex items-center gap-1.5 text-footnote opacity-90"><MapPin className="w-4 h-4" /><span className="truncate">{RUN.route}</span></div>
          </div>
        </Photo>
      </div>

      <div className="px-4 mt-5 flex items-end justify-between vs-rise" style={{ animationDelay: '60ms' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.tempo }} />
            <span className="text-subhead font-semibold" style={{ color: C.tempo }}>{RUN.type}</span>
            <span className="text-subhead text-black/55 dark:text-white/55">· {RUN.date}</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-figure"><CountUp to={RUN.km} format={(v) => v.toFixed(2)} /></span>
            <span className="text-title3 text-black/55 dark:text-white/55">km</span>
          </div>
        </div>
        <div className="text-right pb-1">
          <div className="text-caption1 text-black/55 dark:text-white/55">Target pace</div>
          <div className="text-headline">{RUN.target}/km</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 mt-4">
        {stats.map((s, i) => (
          <div key={s.label} className="bg-card rounded-card p-2.5 vs-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
            <s.icon className="w-4 h-4" style={{ color: C.tempo }} />
            <div className="text-headline mt-1.5 truncate">{s.value}</div>
            <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{s.unit}</div>
          </div>
        ))}
      </div>

      <BlockTitle>Splits per km</BlockTitle>
      <Block strong inset className="vs-rise" style={{ animationDelay: '360ms' }}>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-subhead text-black/55 dark:text-white/55">Fastest · km 5</span>
          <span className="text-subhead font-semibold" style={{ color: C.tempo }}>5:39 /km</span>
        </div>
        <Bars values={SPLITS.map((s) => 380 - s.sec)} color={C.tempo} labels={SPLITS.map((s) => s.km)} highlight={FASTEST} height={120} />
        <div className="grid grid-cols-6 mt-2 text-center">
          {SPLITS.map((s, i) => (
            <span key={s.km} className={`text-caption1 ${i === FASTEST ? 'font-bold' : 'text-black/55 dark:text-white/55'}`} style={i === FASTEST ? { color: C.tempo } : undefined}>{s.pace}</span>
          ))}
        </div>
        <div className="text-footnote text-black/55 dark:text-white/55 mt-3">Negative split — every tempo km faster than the first. Last 0.02 km partial.</div>
      </Block>

      <BlockTitle>Heart-rate zones</BlockTitle>
      <Block strong inset className="vs-rise" style={{ animationDelay: '420ms' }}>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
          {ZONES.map((z) => <div key={z.z} style={{ width: `${(z.min / ZONE_TOTAL) * 100}%`, background: z.color }} />)}
        </div>
        <div className="space-y-3">
          {ZONES.map((z) => (
            <div key={z.z} className="flex items-center gap-3">
              <span className="text-caption1 font-bold rounded-md px-1.5 py-0.5 w-9 text-center" style={{ background: tint(z.color, 20) }}>{z.z}</span>
              <span className="text-subhead w-20 truncate">{z.name}</span>
              <div className="flex-1"><Meter value={z.min / ZONE_MAX} color={z.color} /></div>
              <span className="text-subhead font-semibold w-14 text-right">{z.min} min</span>
            </div>
          ))}
        </div>
      </Block>

      <BlockTitle>Highlights</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Fastest 5K"
          subtitle="Previous best 29:30"
          media={<Medal emoji="🏅" size={44} />}
          after={<span className="text-headline" style={{ color: '#d99a00' }}>28:41</span>}
        />
        <ListItem title="Max heart rate" after={`${RUN.hrMax} bpm`} media={<Tile color={C.rest}><HeartPulse className="w-4 h-4" /></Tile>} />
        <ListItem title="Elevation gain" after={RUN.elev} media={<Tile color={C.longRun}><Mountain className="w-4 h-4" /></Tile>} />
      </List>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-line px-4 pt-3 pb-8 flex gap-3 z-20">
        <Button large rounded tonal className="!w-32" onClick={() => setToast(true)}>
          <Share className="w-5 h-5 mr-1.5" />Share
        </Button>
        <Button large rounded className="flex-1" onClick={save} disabled={saved}>
          {saved ? <span className="flex items-center gap-1.5 vs-bounce"><Check className="w-5 h-5" />Saved</span> : 'Save Run'}
        </Button>
      </div>

      <Confetti run={saved} />
      <Toast opened={toast} position="center" className="!bottom-28">
        {saved ? 'Run saved · base week 3: 11 of 25 km' : 'Share card ready'}
      </Toast>
    </Page>
  )
}
