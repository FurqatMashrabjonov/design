import { Page, Button, Link } from 'konsta/react'
import { Flame, Moon } from 'lucide-react'
import { useNav, Ring, Bars, Hero, Glow, CountUp } from '@od/kit'

const C = { sleep: '#7b61ff', focus: '#00c49a', streak: '#ff9f0a' }

// A preview of the app itself: three tilted mini cards built from the kit (its hero figure, a chart, a streak),
// then a bold title and one action. The cards show what the app does; they are not clip art.
export default function Screen() {
  const nav = useNav()
  return (
    <Page className="flex flex-col">
      <div className="relative mx-auto mt-24 h-[360px] w-[330px]">
        <Glow color={C.sleep} size={340} opacity={0.45} />
        <div className="absolute left-0 top-6 w-44 -rotate-6 rounded-card bg-card p-4 shadow-xl vs-rise vs-float">
          <p className="text-footnote opacity-60">Last night</p>
          <div className="mt-2 flex items-center gap-3">
            <Ring value={0.86} size={64} stroke={8} color={C.sleep}><Moon className="size-5" style={{ color: C.sleep }} /></Ring>
            <div>
              <div className="text-title2"><CountUp to={7.4} format={(v) => v.toFixed(1)} />h</div>
              <div className="text-caption1 opacity-60">86% quality</div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-40 rotate-6 rounded-card bg-card p-4 shadow-xl vs-rise" style={{ animationDelay: '120ms' }}>
          <p className="text-footnote opacity-60">Focus this week</p>
          <div className="mt-2"><Bars values={[2, 3.5, 2.5, 4, 3, 4.5, 3.8]} color={C.focus} height={70} /></div>
        </div>
        <div className="absolute bottom-2 left-12 w-56 rotate-2 vs-rise" style={{ animationDelay: '240ms' }}>
          <Hero color={C.streak} to="#ff6b35" className="shadow-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white/25"><Flame className="size-5" /></span>
              <div>
                <div className="text-title3">12-day streak</div>
                <div className="text-subhead opacity-85">Your longest yet</div>
              </div>
            </div>
          </Hero>
        </div>
      </div>
      <div className="flex-1 px-6 pt-10 text-center">
        <h1 className="text-large-title leading-tight vs-rise" style={{ animationDelay: '300ms' }}>
          Rest well.
          <br />
          Do more.
        </h1>
        <p className="mt-3 text-body opacity-60 vs-rise" style={{ animationDelay: '360ms' }}>Sleep, focus and streaks in one quiet place — it learns your rhythm in a week.</p>
      </div>
      <div className="px-6 pb-12">
        <Button large rounded onClick={() => nav.push('today')}>Start tonight</Button>
        <p className="mt-4 text-center text-subhead"><Link onClick={() => nav.push('log-in')}>I already have an account</Link></p>
      </div>
    </Page>
  )
}
