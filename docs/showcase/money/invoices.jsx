import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Button, Toast, Toggle } from 'konsta/react'
import { Plus, FileText, BellRing, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useNav, AppTabbar, Tile, Meter, CountUp, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const STATUS = {
  Paid: { color: '#22c55e', icon: CheckCircle2 },
  Pending: { color: C.income, icon: Clock },
  Overdue: { color: '#ef4444', icon: AlertCircle },
}

const INVOICES = [
  { id: 'INV-2026-043', client: 'Atelier Lumière', amount: 5200, status: 'Pending', when: 'Due 15 Oct · in 14 days' },
  { id: 'INV-2026-044', client: 'Bloom Cosmetics', amount: 3200, status: 'Pending', when: 'Due 22 Oct · in 21 days' },
  { id: 'INV-2026-037', client: 'Café Ribot', amount: 1700, status: 'Overdue', when: 'Due 12 Sep · 19 days late' },
  { id: 'INV-2026-038', client: 'Nordwind GmbH', amount: 2500, status: 'Overdue', when: 'Due 20 Sep · 11 days late' },
  { id: 'INV-2026-041', client: 'Studio Nomade', amount: 4800, status: 'Paid', when: 'Paid on 30 Sep' },
  { id: 'INV-2026-039', client: 'Maison Verlaine', amount: 2350, status: 'Paid', when: 'Paid on 18 Sep' },
]

const eur = (n) => '€' + n.toLocaleString('en-US')
const TABS = ['Paid', 'Pending', 'Overdue']

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('Pending')
  const [reminders, setReminders] = useState(true)
  const [toast, setToast] = useState(false)
  const list = INVOICES.filter((i) => i.status === tab)
  const total = list.reduce((s, i) => s + i.amount, 0)

  const create = () => {
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Invoices"
        right={<Link iconOnly onClick={create}><Plus className="w-6 h-6" /></Link>} />

      <div className="px-4 pt-2">
        <div className="bg-card rounded-card p-5 vs-rise">
          <div className="text-footnote text-black/55 dark:text-white/55">Outstanding</div>
          <div className="text-figure mt-1"><CountUp to={12600} format={eur} /></div>
          <div className="text-subhead text-black/55 dark:text-white/55 mt-1">Across 4 open invoices</div>
          <div className="flex gap-1 mt-4 h-2 rounded-full overflow-hidden">
            <div style={{ width: '66.7%', background: STATUS.Pending.color }} />
            <div style={{ width: '33.3%', background: STATUS.Overdue.color }} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {['Pending', 'Overdue'].map((s) => (
              <button key={s} onClick={() => setTab(s)}
                className="text-left rounded-2xl p-3 min-h-[44px]" style={{ background: tint(STATUS[s].color, 12) }}>
                <div className="flex items-center gap-1.5 text-footnote text-black/60 dark:text-white/60">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS[s].color }} />{s}
                </div>
                <div className="text-title3 mt-1">{s === 'Pending' ? '€8,400' : '€4,200'}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Block className="!mt-6 !mb-2">
        <Segmented strong rounded>
          {TABS.map((t) => (
            <SegmentedButton key={t} rounded active={tab === t} onClick={() => setTab(t)}>{t}</SegmentedButton>
          ))}
        </Segmented>
      </Block>

      <BlockTitle className="flex justify-between">
        <span>{tab}</span>
        <span className="text-footnote font-normal text-black/55 dark:text-white/55">{eur(total)}</span>
      </BlockTitle>
      <List strong inset dividers>
        {list.map((inv, i) => {
          const st = STATUS[inv.status]
          return (
            <ListItem key={inv.id}
              className="vs-rise" style={{ animationDelay: `${i * 60}ms` }}
              media={<Tile color={st.color} tinted size={44}><span className="text-headline" style={{ color: st.color }}>{inv.client[0]}</span></Tile>}
              title={<span className="text-headline truncate">{inv.client}</span>}
              subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{inv.id}</span>}
              text={<span className="text-footnote text-black/55 dark:text-white/55">{inv.when}</span>}
              after={
                <div className="flex flex-col items-end gap-1">
                  <span className="text-headline text-black dark:text-white">{eur(inv.amount)}</span>
                  <span className="text-caption1 font-semibold px-2 py-0.5 rounded-full text-black/80 dark:text-white/90"
                    style={{ background: tint(st.color, 20) }}>{inv.status}</span>
                </div>
              } />
          )
        })}
      </List>

      <div className="px-4 mt-2">
        <Button large rounded onClick={create}>
          <FileText className="w-5 h-5 mr-2" /> Create invoice
        </Button>
      </div>

      <BlockTitle>Getting paid</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Auto reminders" subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Nudge clients 3 days after due</span>}
          media={<Tile color={C.workspace}><BellRing className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={reminders} onChange={() => setReminders(!reminders)} />} />
        <ListItem title="Paid in September" media={<Tile color="#22c55e"><CheckCircle2 className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-headline" style={{ color: '#16a34a' }}>€7,150</span>} />
      </List>
      <div className="px-8 -mt-2">
        <Meter value={7150 / (7150 + 12600)} color="#22c55e" />
        <div className="text-footnote text-black/55 dark:text-white/55 mt-2">36% of billed work since September has landed in your account.</div>
      </div>

      <Toast opened={toast} position="center">New invoice draft started</Toast>
      <AppTabbar active="invoices" />
    </Page>
  )
}
