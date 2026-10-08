import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Block, List, ListItem, Sheet, Dialog, DialogButton, Button, Toast } from 'konsta/react'
import { Ellipsis, Coffee, CreditCard, Tag, Receipt, Users, Repeat, Flag, FileText, ChevronRight } from 'lucide-react'
import { useNav, Tile, Meter } from '@od/kit'

// EXM-01: a money detail (one transaction, a transfer, a bill), built the way the banks build theirs: the merchant's
// icon and name centred over the one big signed amount, the status and the exact time; then the facts as rows in
// grouped lists (category, card, fee, reference); what this merchant costs this month; the actions a bank gives —
// split, repeat, receipt, report — each one answering with a sheet, a dialog or a toast. No chart, no hero colour:
// the amount is the hero.
const T = { name: 'Blue Bottle Coffee', amount: -6.4, status: 'Completed', when: 'Today, 08:42', category: 'Coffee', card: 'Main ·· 4821', fee: 0, ref: 'TXN-2610-08-4A7F', month: { visits: 6, spent: 38.4, budget: 60 } }
const money = (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toFixed(2)}`

export default function Screen() {
  const nav = useNav()
  const [split, setSplit] = useState(false)
  const [report, setReport] = useState(false)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const ACTIONS = [
    [Users, 'Split', () => setSplit(true)],
    [Repeat, 'Repeat', () => say('Repeat set up for next month')],
    [Receipt, 'Receipt', () => say('Receipt saved to Files')],
    [Flag, 'Report', () => setReport(true)],
  ]
  return (
    <Page className="pb-12">
      <Navbar transparent title="" left={<NavbarBackLink onClick={() => nav.pop()} />} right={<Link iconOnly onClick={() => say('More options')} aria-label="More"><Ellipsis className="w-6 h-6" /></Link>} />

      <div className="flex flex-col items-center px-6 pt-2 text-center vs-rise">
        <Tile tinted color="#ff9f0a" size={72}><Coffee className="w-9 h-9" /></Tile>
        <div className="mt-4 text-headline">{T.name}</div>
        <div className="mt-1 text-figure tabular-nums">{money(T.amount)}</div>
        <div className="mt-1 text-subhead opacity-60">{T.status} · {T.when}</div>
      </div>

      <div className="mx-4 mt-6 grid grid-cols-4 gap-2">
        {ACTIONS.map(([I, label, go]) => (
          <button key={label} onClick={go} className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl bg-card text-footnote font-medium active:scale-[.97] transition"><I className="w-5 h-5" />{label}</button>
        ))}
      </div>

      <List strong inset dividers className="!mt-6">
        <ListItem title="Category" after={T.category} link linkProps={{ onClick: () => say('Change category') }} media={<Tile tinted color="#ff9f0a" size={32}><Tag className="w-4 h-4" /></Tile>} />
        <ListItem title="Paid with" after={T.card} link linkProps={{ onClick: () => nav.push('card') }} media={<Tile tinted color="#0a84ff" size={32}><CreditCard className="w-4 h-4" /></Tile>} />
        <ListItem title="Fee" after={T.fee ? money(-T.fee) : 'No fee'} media={<Tile tinted color="#30d158" size={32}><Receipt className="w-4 h-4" /></Tile>} />
        <ListItem title="Reference" after={<span className="text-footnote tabular-nums opacity-60">{T.ref}</span>} media={<Tile tinted color="#8e8e93" size={32}><FileText className="w-4 h-4" /></Tile>} />
      </List>

      <button onClick={() => nav.push('merchant')} className="mx-4 mt-6 block w-[calc(100%-2rem)] rounded-[22px] bg-card p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-headline">At {T.name.split(' ')[0]} {T.name.split(' ')[1]} this month</span><ChevronRight className="w-5 h-5 opacity-40" />
        </div>
        <div className="mt-1 text-subhead opacity-60">{T.month.visits} visits · <b className="text-ink opacity-100">${T.month.spent.toFixed(2)}</b> of ${T.month.budget} coffee budget</div>
        <div className="mt-3"><Meter value={T.month.spent / T.month.budget} color="#ff9f0a" /></div>
      </button>

      <Block>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="min-h-12 w-full rounded-2xl bg-card px-4 text-body outline-none placeholder:opacity-50" />
      </Block>

      <Sheet opened={split} onBackdropClick={() => setSplit(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Split {money(T.amount).slice(1)}</h3>
        <List strong inset>
          <ListItem title="Mina Reyes" after="$3.20" link linkProps={{ onClick: () => say('Mina selected') }} />
          <ListItem title="Add someone" link linkProps={{ onClick: () => nav.push('contacts') }} />
        </List>
        <Block><Button large rounded onClick={() => { setSplit(false); say('Request for $3.20 sent to Mina') }}>Request $3.20</Button></Block>
      </Sheet>
      <Dialog opened={report} onBackdropClick={() => setReport(false)} title="Report this transaction?" content="We’ll freeze the card ending 4821 while we look into it."
        buttons={<><DialogButton onClick={() => setReport(false)}>Cancel</DialogButton><DialogButton strong onClick={() => { setReport(false); say('Reported · card frozen') }}>Report</DialogButton></>} />
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
