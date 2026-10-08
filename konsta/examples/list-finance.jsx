import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Segmented, SegmentedButton, Block, List, ListItem, Sheet, Button, Toast } from 'konsta/react'
import { Search, SlidersHorizontal, Download, Coffee, ShoppingBag, Car, Briefcase, Music, Utensils, Home, ArrowDownLeft } from 'lucide-react'
import { useNav, Tile, Bars } from '@od/kit'

// EXM-01: a money list (transactions, activity, a statement), built the way the banks build theirs: a search and a
// filter in the header, a segment for the kind (All · Spent · Received), one summary card for the month — the figure,
// the change against last month, the daily bars — then the rows grouped by day with the day's total on the right.
// Each row: a tinted icon for the category, the name, the time and category, the signed amount in tabular figures
// (income green), a pending one greyed. Tapping a row opens its detail; the download icon offers the statement.
const C = { food: '#ff9f0a', shop: '#bf5af2', travel: '#0a84ff', pay: '#30d158', home: '#5e5ce6', fun: '#ff375f' }
const DAYS = [
  { day: 'Today', total: -24.6, items: [
    { id: 't1', name: 'Blue Bottle', when: '08:42 · Coffee', amount: -6.4, icon: Coffee, color: C.food },
    { id: 't2', name: 'Uber', when: '07:55 · Transport', amount: -18.2, icon: Car, color: C.travel, pending: true },
  ] },
  { day: 'Yesterday', total: 4161.01, items: [
    { id: 't3', name: 'Salary · Northwind', when: '06:00 · Income', amount: 4250, icon: Briefcase, color: C.pay },
    { id: 't4', name: 'Arket', when: '18:20 · Shopping', amount: -89, icon: ShoppingBag, color: C.shop },
    { id: 't5', name: 'Spotify', when: '12:00 · Subscription', amount: -10.99, icon: Music, color: C.fun },
    { id: 't6', name: 'Mina Reyes', when: '09:14 · Received', amount: 11, icon: ArrowDownLeft, color: C.pay },
  ] },
  { day: 'Mon, 6 Oct', total: -1312.5, items: [
    { id: 't7', name: 'Rent · Oakwood', when: '09:00 · Home', amount: -1250, icon: Home, color: C.home },
    { id: 't8', name: 'Nopalito', when: '20:35 · Dining', amount: -62.5, icon: Utensils, color: C.food },
  ] },
]
const money = (n, sign = true) => `${n < 0 ? '−' : sign ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Screen() {
  const nav = useNav()
  const [kind, setKind] = useState('all')
  const [statement, setStatement] = useState(false)
  const [toast, setToast] = useState(null)
  const show = (t) => (kind === 'all' ? true : kind === 'in' ? t.amount > 0 : t.amount < 0)
  const groups = DAYS.map((d) => ({ ...d, items: d.items.filter(show) })).filter((d) => d.items.length)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Transactions" subtitle="Main · USD"
        left={<NavbarBackLink onClick={() => nav.pop()} />}
        right={<><Link iconOnly onClick={() => nav.push('search')} aria-label="Search"><Search className="w-6 h-6" /></Link><Link iconOnly onClick={() => setStatement(true)} aria-label="Statement"><Download className="w-6 h-6" /></Link></>} />

      <Block className="!my-3">
        <Segmented strong rounded>
          <SegmentedButton active={kind === 'all'} onClick={() => setKind('all')}>All</SegmentedButton>
          <SegmentedButton active={kind === 'out'} onClick={() => setKind('out')}>Spent</SegmentedButton>
          <SegmentedButton active={kind === 'in'} onClick={() => setKind('in')}>Received</SegmentedButton>
        </Segmented>
      </Block>

      <button onClick={() => nav.push('insights')} className="mx-4 block w-[calc(100%-2rem)] rounded-[22px] bg-card p-4 text-left vs-rise">
        <div className="flex items-baseline justify-between">
          <span className="text-subhead opacity-60">Spent in October</span>
          <span className="text-footnote text-green-700 dark:text-green-400">−12% vs September</span>
        </div>
        <div className="mt-0.5 text-title1 tabular-nums">$1,448.09</div>
        <div className="mt-3"><Bars values={[42, 18, 96, 1312, 25, 71, 24]} labels={['T', 'W', 'T', 'F', 'S', 'M', 'T']} height={56} /></div>
      </button>

      {groups.map((g) => (
        <div key={g.day}>
          <div className="mx-4 mt-6 mb-2 flex items-baseline justify-between">
            <h2 className="text-headline">{g.day}</h2>
            <span className="text-footnote tabular-nums opacity-60">{money(g.items.reduce((n, t) => n + t.amount, 0), false)}</span>
          </div>
          <List strong inset dividers>
            {g.items.map((t) => (
              <ListItem key={t.id} link linkProps={{ onClick: () => nav.push('transaction', { id: t.id }) }}
                media={<Tile tinted color={t.color} size={40}><t.icon className="w-5 h-5" /></Tile>}
                title={t.name} subtitle={t.pending ? `${t.when} · Pending` : t.when}
                after={<span className={`text-body tabular-nums ${t.pending ? 'opacity-50' : t.amount > 0 ? 'text-green-700 dark:text-green-400' : ''}`}>{money(t.amount)}</span>} />
            ))}
          </List>
        </div>
      ))}
      <Block className="text-center"><Button rounded tonal inline className="!px-6" onClick={() => say('September loaded')}>Load September</Button></Block>

      <Sheet opened={statement} onBackdropClick={() => setStatement(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Statement</h3>
        <List strong inset>
          <ListItem title="Period" after="October 2026" link linkProps={{ onClick: () => say('Pick a period') }} />
          <ListItem title="Format" after="PDF" link linkProps={{ onClick: () => say('PDF or CSV') }} />
        </List>
        <Block><Button large rounded onClick={() => { setStatement(false); say('Statement sent to your email') }}>Download statement</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
