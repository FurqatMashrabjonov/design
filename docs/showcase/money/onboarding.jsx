import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Wifi, Check, FileText } from 'lucide-react'
import { useNav, Glow, Dots, Hero, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const CORAL = '#ff7a5c'
const PAID = '#30d158'

const SPEND = [
  { key: 'workspace', name: 'Workspace', amount: 960.0 },
  { key: 'software', name: 'Software', amount: 742.3 },
  { key: 'travel', name: 'Travel', amount: 688.5 },
  { key: 'food', name: 'Food', amount: 612.4 },
  { key: 'transport', name: 'Transport', amount: 237.6 },
]
const SPEND_TOTAL = SPEND.reduce((s, c) => s + c.amount, 0)

function donutGradient() {
  let acc = 0
  const stops = SPEND.map((c) => {
    const from = (acc / SPEND_TOTAL) * 360
    acc += c.amount
    const to = (acc / SPEND_TOTAL) * 360
    return `${C[c.key]} ${from + 1}deg ${to - 1}deg, transparent ${to - 1}deg ${to}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}

function CardsArt() {
  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
      <Glow color={CORAL} size={260} opacity={0.35} />
      <div className="relative w-64 flex flex-col gap-4 vs-float">
        <Hero
          color="#3a3a3f"
          to="#0d0d10"
          className="w-60 h-28 rounded-[22px] -rotate-2 flex flex-col justify-between shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-footnote font-semibold tracking-widest opacity-80">METAL</span>
            <Wifi className="w-5 h-5 rotate-90 opacity-80" />
          </div>
          <div className="flex items-end justify-between gap-2">
            <span className="text-headline tracking-widest">•• 0937</span>
            <span className="text-caption1 font-semibold opacity-80">Mastercard</span>
          </div>
        </Hero>
        <Hero
          color={CORAL}
          to="#ff9f86"
          className="w-60 self-end rounded-[22px] rotate-2 flex flex-col gap-2 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-footnote font-semibold tracking-widest">ATELIER</span>
            <span className="text-caption2 font-semibold opacity-80">VIRTUAL</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-caption1 opacity-80">Balance</span>
            <span className="text-headline">€18,420.65</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <span className="text-headline tracking-widest">•• 4821</span>
            <span className="text-headline font-bold italic">VISA</span>
          </div>
        </Hero>
      </div>
    </div>
  )
}

function InvoiceArt() {
  return (
    <div className="relative w-72 h-64 mx-auto flex items-center justify-center">
      <Glow color={PAID} size={240} opacity={0.3} />
      <div className="absolute w-60 h-56 rounded-card rotate-6 bg-card-2" />
      <div className="relative w-64 bg-card rounded-card shadow-xl p-4 -rotate-2 vs-float">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: tint(C.income, 18) }}>
            <FileText className="w-5 h-5" style={{ color: C.income }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-headline truncate">Studio Nomade</div>
            <div className="text-caption1 text-black/55 dark:text-white/55">INV-2026-041</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-card-2 w-full" />
          <div className="h-2 rounded-full bg-card-2 w-4/5" />
          <div className="h-2 rounded-full bg-card-2 w-3/5" />
        </div>
        <div className="mt-4 pt-3 border-t border-line flex items-end justify-between">
          <div>
            <div className="text-caption1 text-black/55 dark:text-white/55">Amount</div>
            <div className="text-title2">€4,800.00</div>
          </div>
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-footnote font-semibold vs-bounce"
            style={{ background: tint(PAID, 18), color: '#248a3d' }}
          >
            <Check className="w-4 h-4" />
            Paid
          </div>
        </div>
        <div className="mt-2 text-caption2 text-black/55 dark:text-white/55">Paid on 30 Sep</div>
      </div>
    </div>
  )
}

function DonutArt() {
  return (
    <div className="relative w-72 h-64 mx-auto flex flex-col items-center justify-center">
      <Glow color={C.software} size={240} opacity={0.3} />
      <div className="relative vs-float">
        <div className="w-48 h-48 rounded-full p-5" style={{ background: donutGradient() }}>
          <div className="w-full h-full rounded-full bg-page flex flex-col items-center justify-center">
            <div className="text-caption1 text-black/55 dark:text-white/55">September</div>
            <div className="text-title3">€3,240.80</div>
            <div className="text-caption2 text-black/55 dark:text-white/55">spent</div>
          </div>
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
        {SPEND.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 text-caption1 text-black/55 dark:text-white/55">
            <span className="w-2 h-2 rounded-full" style={{ background: C[c.key] }} />
            {c.name}
          </div>
        ))}
      </div>
    </div>
  )
}

const SLIDES = [
  {
    title: "Your studio's bank,\nin your pocket",
    text: 'Hold euros, run a coral virtual card and a metal card, and keep your tax pot set aside.',
    art: <CardsArt />,
  },
  {
    title: 'Get paid\nfaster',
    text: 'Send invoices from your account and watch them flip to Paid the moment clients settle.',
    art: <InvoiceArt />,
  },
  {
    title: 'See where\nevery euro goes',
    text: 'Spending sorted by workspace, software, travel and more — month by month, at a glance.',
    art: <DonutArt />,
  },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1
  return (
    <Page className="flex flex-col">
      <div className="flex justify-end items-end px-4 pt-14 h-24">
        {!last && <Link onClick={() => setI(SLIDES.length - 1)}>Skip</Link>}
      </div>
      <div key={i} className="flex-1 flex flex-col justify-center vs-rise">
        {s.art}
        <Block className="text-center !mt-10">
          <h1 className="text-large-title whitespace-pre-line">{s.title}</h1>
          <p className="mt-4 text-body opacity-60">{s.text}</p>
        </Block>
      </div>
      <div className="mb-6">
        <Dots count={SLIDES.length} active={i} />
      </div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.reset('home') : setI(i + 1))}>
          {last ? 'Get started' : 'Continue'}
        </Button>
        <div className="text-center mt-4 text-subhead">
          <span className="opacity-60">Already have an account? </span>
          <Link onClick={() => nav.reset('home')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}
