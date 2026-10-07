import { useState } from 'react'
import { Page, Navbar, Block, Button, Link } from 'konsta/react'
import { AppTabbar, PlanCompare, Medal } from '@od/kit'
export default function Screen() {
  const [yearly, setYearly] = useState(true)
  return (
    <Page className="pb-32">
      <Navbar large title="Premium" />
      <div className="flex flex-col items-center text-center px-6 pt-2 pb-4"><Medal emoji="👑" size={72} /><div className="text-title2 font-bold mt-3">Stillora Premium</div><div className="text-subhead opacity-60 mt-1">Everything for a calmer mind, every day.</div></div>
      <PlanCompare plans={['Free', 'Premium']} rows={[
        { label: 'Daily meditation', free: true, pro: true },
        { label: 'Sleep stories', free: '3', pro: 'All 140' },
        { label: 'Offline listening', free: false, pro: true },
        { label: 'Breathing coach', free: false, pro: true },
        { label: 'Progress insights', free: 'Week', pro: 'All time' },
      ]} />
      <Block className="!mt-6">
        <div className="flex gap-2 mb-3">
          {[['Yearly', '$39.99 · save 45%', true], ['Monthly', '$5.99', false]].map(([t, p, y]) => (
            <button key={t} type="button" onClick={() => setYearly(y)} className="flex-1 rounded-2xl p-3 text-left bg-card" style={{ outline: yearly === y ? '2px solid var(--color-primary)' : '1px solid rgba(120,120,128,.25)' }}><div className="text-headline">{t}</div><div className="text-footnote opacity-60">{p}</div></button>
          ))}
        </div>
        <Button large rounded>Start 7-day free trial</Button>
        <div className="text-caption1 opacity-60 text-center mt-3">Cancel anytime · <Link>Restore purchase</Link></div>
      </Block>
      <AppTabbar active="plans" />
    </Page>
  )
}
