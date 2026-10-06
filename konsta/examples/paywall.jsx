import { useState } from 'react'
import { Page, Sheet, Block, Button, Link } from 'konsta/react'
import { X, Check, Sparkles, ChartColumn, Bell, Users } from 'lucide-react'
import { useNav, Glow, Tile, tint, gradient } from '@od/kit'

const C = { gold: '#f5a524', violet: '#7c5cff' }
const BENEFITS = [
  { icon: ChartColumn, title: 'Deep insights', text: 'Trends across months, not just this week' },
  { icon: Bell, title: 'Smart reminders', text: 'Nudges at the moment you usually slip' },
  { icon: Users, title: 'Group challenges', text: 'Unlimited challenges with friends' },
  { icon: Sparkles, title: 'Every theme', text: 'Twelve looks for the app and its widgets' },
]
const PLANS = [
  { id: 'year', title: 'Yearly', price: '$39.99', per: '$3.33 / month', badge: 'Save 45%' },
  { id: 'month', title: 'Monthly', price: '$5.99', per: 'per month' },
]

// A paywall: a modal screen, so the open page sheet is the screen. One promise, four benefits, two plans with the
// better one chosen, one button that says what happens, and the small print a real paywall carries.
export default function Screen() {
  const nav = useNav()
  const [plan, setPlan] = useState('year')
  return (
    <Page>
      <Sheet className="pb-safe h-[calc(100%-3rem)] overflow-y-auto" opened onBackdropClick={() => nav.pop()}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-56" style={{ background: gradient(C.violet, C.gold), opacity: 0.18 }} />
          <div className="relative flex justify-end px-3 pt-3"><Link iconOnly onClick={() => nav.pop()}><X className="w-5 h-5" /></Link></div>
          <div className="relative flex flex-col items-center text-center px-6 pt-2 vs-rise">
            <div className="relative">
              <Glow color={C.gold} size={180} opacity={0.55} />
              <div className="relative w-20 h-20 rounded-[26px] flex items-center justify-center text-4xl shadow-lg" style={{ background: gradient(C.gold, C.violet) }}>👑</div>
            </div>
            <div className="text-title1 mt-5">Stridewell Premium</div>
            <div className="text-subhead opacity-70 mt-1.5">Everything you need to keep the streak alive.</div>
          </div>
        </div>

        <Block className="!mt-6 space-y-4">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="flex items-center gap-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Tile tinted color={C.violet} size={40}><b.icon className="w-5 h-5" style={{ color: C.violet }} /></Tile>
              <div><div className="text-headline">{b.title}</div><div className="text-footnote opacity-60">{b.text}</div></div>
            </div>
          ))}
        </Block>

        <div className="px-4 space-y-3">
          {PLANS.map((p) => {
            const on = plan === p.id
            return (
              <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                className="w-full flex items-center gap-3 rounded-2xl p-4 text-left transition active:scale-[.99] bg-card"
                style={{ outline: on ? `2px solid ${C.violet}` : '1px solid rgba(120,120,128,.25)', background: on ? tint(C.violet, 10) : undefined }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: on ? C.violet : 'transparent', border: on ? 'none' : '2px solid rgba(120,120,128,.4)' }}>{on && <Check className="w-4 h-4 text-white" strokeWidth={3} />}</span>
                <span className="flex-1"><span className="text-headline">{p.title}</span><span className="block text-footnote opacity-60">{p.per}</span></span>
                <span className="text-right"><span className="text-headline">{p.price}</span>{p.badge && <span className="block mt-1 text-caption1 font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: C.gold }}>{p.badge}</span>}</span>
              </button>
            )
          })}
        </div>

        <Block className="!mt-6 !mb-4">
          <Button large rounded onClick={() => nav.pop()}>Start 7-day free trial</Button>
          <div className="text-caption1 opacity-60 text-center mt-3">Then {plan === 'year' ? '$39.99 a year' : '$5.99 a month'}. Cancel anytime in Settings.</div>
          <div className="flex justify-center gap-5 mt-3 text-caption1"><Link>Restore purchase</Link><Link>Terms</Link><Link>Privacy</Link></div>
        </Block>
      </Sheet>
    </Page>
  )
}
