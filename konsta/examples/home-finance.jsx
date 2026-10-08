import { useState } from 'react'
import { Page, Navbar, Link, Segmented, SegmentedButton, Sheet, Block, Button, Toast } from 'konsta/react'
import { Search, BarChart3, Bell, Plus, ArrowUpRight, Ellipsis, ChevronDown, Coffee, Briefcase, Car, X } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Photo, Tile, AmountPad } from '@od/kit'

// EXM-01: a money home (banking, budgeting, investing), built the way the big neobanks build theirs: a calm page,
// not a gradient poster. A search, the accounts as segments, one white balance card with its two or three actions,
// the latest activity inside a card with "See all", then offers as photo cards. Amounts are signed, right-aligned,
// with tabular figures; Send opens a sheet with the amount pad.
const C = { food: '#ff9f0a', pay: '#30d158', travel: '#0a84ff' }
const ACCOUNTS = { main: { label: 'Main · USD', balance: '8,230', cents: '52' }, savings: { label: 'Savings · USD', balance: '4,250', cents: '00' } }
const RECENT = [
  { id: 't1', name: 'Blue Bottle', when: 'Today, 08:42', amount: '−$6.40', icon: Coffee, color: C.food },
  { id: 't2', name: 'Salary · Northwind', when: 'Today, 06:00', amount: '+$4,250.00', icon: Briefcase, color: C.pay, plus: true },
  { id: 't3', name: 'Uber', when: 'Yesterday, 22:15', amount: '−$18.20', icon: Car, color: C.travel },
]
const OFFERS = [
  { id: 'o1', title: '4% cashback on travel', photo: 'airport window plane sunrise' },
  { id: 'o2', title: 'Split bills with friends', photo: 'friends dinner table laughing' },
]

export default function Screen() {
  const nav = useNav()
  const [account, setAccount] = useState('main')
  const [send, setSend] = useState(false)
  const [amount, setAmount] = useState('')
  const [offers, setOffers] = useState(OFFERS)
  const [toast, setToast] = useState(null)
  const a = ACCOUNTS[account]
  const done = () => {
    setToast(`$${amount} sent`); setSend(false); setAmount('')
    setTimeout(() => setToast(null), 2200)
  }
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Home"
        left={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Jonah Reyes" photo="portrait man smiling denim shirt" size={32} /></Link>}
        right={<><Link iconOnly onClick={() => nav.push('insights')} aria-label="Insights"><BarChart3 className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.push('notifications')} aria-label="Notifications"><Bell className="w-6 h-6" /></Link></>} />

      <button onClick={() => nav.push('search')} className="mx-4 flex min-h-11 w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-black/[.06] px-3 text-left dark:bg-white/10">
        <Search className="w-4 h-4 opacity-55" /><span className="text-body opacity-55">Search</span>
      </button>

      <Block className="!my-4">
        <Segmented strong rounded>
          <SegmentedButton active={account === 'main'} onClick={() => setAccount('main')}>Accounts</SegmentedButton>
          <SegmentedButton active={account === 'savings'} onClick={() => setAccount('savings')}>Savings</SegmentedButton>
        </Segmented>
      </Block>

      <div className="mx-4 rounded-[22px] bg-card p-4 vs-rise">
        <button onClick={() => nav.push('accounts')} className="flex min-h-11 items-baseline gap-1">
          <span className="text-figure tabular-nums">${a.balance}<span className="text-title2">.{a.cents}</span></span>
          <ChevronDown className="w-5 h-5 self-center opacity-55" />
        </button>
        <div className="text-subhead opacity-60">{a.label}</div>
        <div className="mt-4 flex gap-2">
          <Button rounded tonal inline className="!px-4" onClick={() => nav.push('add-money')}><Plus className="w-4 h-4 mr-1" />Add money</Button>
          <Button rounded tonal inline className="!px-4" onClick={() => setSend(true)}><ArrowUpRight className="w-4 h-4 mr-1" />Send</Button>
          <Button rounded tonal inline className="!px-3" aria-label="More" onClick={() => nav.push('payments')}><Ellipsis className="w-4 h-4" /></Button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-headline">Transactions</span>
          <button onClick={() => nav.push('transactions')} className="-my-3 min-h-11 px-1 text-subhead text-primary">See all</button>
        </div>
        {RECENT.map((t) => (
          <button key={t.id} onClick={() => nav.push('transaction', { id: t.id })} className="flex min-h-14 w-full items-center gap-3 text-left">
            <Tile tinted color={t.color} size={40}><t.icon className="w-5 h-5" /></Tile>
            <span className="min-w-0 flex-1"><span className="block truncate text-body">{t.name}</span><span className="block text-footnote opacity-55">{t.when}</span></span>
            <span className={`text-body tabular-nums ${t.plus ? 'text-green-700 dark:text-green-400' : ''}`}>{t.amount}</span>
          </button>
        ))}
      </div>

      <h2 className="mx-4 mt-7 mb-3 text-title3">Suggested for you</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {offers.map((o) => (
          <button key={o.id} onClick={() => nav.push('offer', { id: o.id })} className="relative h-40 w-56 shrink-0 overflow-hidden rounded-[20px] text-left">
            <Photo q={o.photo} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute bottom-3 left-3 right-10 text-headline text-white">{o.title}</span>
            <span role="button" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); setOffers(offers.filter((x) => x.id !== o.id)) }} className="absolute right-1 top-1 grid size-11 place-items-center text-white"><X className="w-4 h-4" /></span>
          </button>
        ))}
      </div>

      <Sheet opened={send} onBackdropClick={() => setSend(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Send money</h3>
        <Block><AmountPad value={amount} onChange={setAmount} note={`From ${a.label}`} /></Block>
        <Block><Button large rounded disabled={!Number(amount)} onClick={done}>Send ${amount || '0'}</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="home" />
    </Page>
  )
}
