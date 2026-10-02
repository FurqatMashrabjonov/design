import { Page, Button, Link } from 'konsta/react'
import { Wallet, PieChart, Bell, ShieldCheck } from 'lucide-react'
import { useNav, Tile, tint } from '@od/kit'

const C = { spend: '#0a84ff', budget: '#30d158', alerts: '#ff9f0a', safe: '#5e5ce6' }

// The promise as a big title, three concrete benefits, one action. A single calm page — no slides.
const BENEFITS = [
  { icon: PieChart, color: C.spend, title: 'See where it goes', text: 'Every card and account in one feed, sorted into categories for you.' },
  { icon: Wallet, color: C.budget, title: 'Budgets that adjust', text: 'Set a monthly limit; we pace it day by day and warn you early.' },
  { icon: Bell, color: C.alerts, title: 'No surprise bills', text: 'A heads-up three days before every subscription renews.' },
]

export default function Screen() {
  const nav = useNav()
  return (
    <Page className="flex flex-col">
      <div className="flex-1 px-6 pt-20">
        <div className="vs-rise"><Tile color={C.safe} size={56}><ShieldCheck className="size-7" /></Tile></div>
        <h1 className="mt-6 text-large-title leading-tight vs-rise" style={{ animationDelay: '60ms' }}>
          Your money,
          <br />
          finally clear
        </h1>
        <p className="mt-3 text-body opacity-60 vs-rise" style={{ animationDelay: '120ms' }}>Two minutes to set up. Read-only access, encrypted end to end.</p>
        <div className="mt-10 space-y-6">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="flex gap-4 vs-rise" style={{ animationDelay: `${180 + i * 70}ms` }}>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: tint(b.color, 16), color: b.color }}>
                <b.icon className="size-6" />
              </span>
              <span>
                <span className="block text-headline">{b.title}</span>
                <span className="mt-0.5 block text-subhead opacity-60">{b.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 pb-12 pt-6">
        <Button large rounded onClick={() => nav.push('home')}>Connect an account</Button>
        <p className="mt-4 text-center text-footnote opacity-60">
          By continuing you agree to the <Link onClick={() => nav.push('terms')}>Terms</Link>.
        </p>
      </div>
    </Page>
  )
}
