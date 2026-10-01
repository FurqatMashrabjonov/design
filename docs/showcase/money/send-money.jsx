import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, BlockTitle, List, ListInput, Button, Toast, Link } from 'konsta/react'
import { Delete, Landmark, PenLine, ChevronDown, Check, Search } from 'lucide-react'
import { useNav, Avatar, Tile, Confetti } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const CONTACTS = [
  { id: 'camille', name: 'Camille Laurent', short: 'Camille', color: '#6366f1' },
  { id: 'hugo', name: 'Hugo Bernard', short: 'Hugo', color: '#0ea5e9' },
  { id: 'ines', name: 'Inès Dubois', short: 'Inès', color: '#14b8a6' },
  { id: 'theo', name: 'Théo Martin', short: 'Théo', color: '#64748b' },
  { id: 'sarah', name: 'Sarah Cohen', short: 'Sarah', color: '#a855f7' },
]
const BALANCE = 18420.65
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del']

const fmt = (n) => `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Screen() {
  const nav = useNav()
  const [to, setTo] = useState('camille')
  const [amt, setAmt] = useState('450')
  const [note, setNote] = useState('Moodboard shoot — split')
  const [sent, setSent] = useState(false)

  const value = Number(amt || '0')
  const over = value > BALANCE
  const person = CONTACTS.find((c) => c.id === to)

  const press = (k) => {
    if (k === 'del') return setAmt((a) => a.slice(0, -1))
    setAmt((a) => {
      if (k === '.' && a.includes('.')) return a
      if (a.includes('.') && a.split('.')[1].length >= 2) return a
      if (a === '0' && k !== '.') return k
      if (a.replace('.', '').length >= 7) return a
      return (a === '' && k === '.') ? '0.' : a + k
    })
  }

  const [whole, dec = ''] = amt.split('.')
  const wholeFmt = Number(whole || '0').toLocaleString('en-GB')
  const decShown = amt.includes('.') ? dec.padEnd(2, '0') : '00'

  return (
    <Page className="pb-40">
      <Navbar
        title="Send money"
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly><Search className="w-6 h-6" /></Link>}
      />

      <BlockTitle className="!mb-2">To</BlockTitle>
      <div className="flex gap-4 overflow-x-auto px-4 pb-1">
        {CONTACTS.map((c, i) => {
          const on = c.id === to
          return (
            <button
              key={c.id}
              onClick={() => setTo(c.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16 vs-rise"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`relative rounded-full p-0.5 ${on ? 'ring-2 ring-primary' : ''}`}>
                <Avatar name={c.name} color={c.color} size={52} />
                {on && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-line vs-bounce">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className={`text-caption1 truncate w-full text-center ${on ? 'font-semibold text-primary' : 'text-black/60 dark:text-white/60'}`}>{c.short}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center mt-6 px-4 vs-rise">
        <div className="text-subhead text-black/55 dark:text-white/55 truncate max-w-full">Sending to {person.name}</div>
        <div className={`mt-1 flex items-baseline font-bold tracking-tight ${over ? 'text-red-500' : ''}`}>
          <span className="text-title1 mr-1 opacity-70">€</span>
          <span className="text-figure" style={{ fontSize: 56, lineHeight: 1.05 }}>{wholeFmt}</span>
          <span className="text-title1 opacity-50">.{decShown}</span>
        </div>
        {over && <div className="text-footnote text-red-500 mt-1">More than your available balance</div>}

        <button className="mt-4 flex items-center gap-2 rounded-full bg-card pl-1.5 pr-3 py-1.5 border border-line">
          <Tile color={C.income} size={28}><Landmark className="w-4 h-4" /></Tile>
          <span className="text-subhead text-black/55 dark:text-white/55">From</span>
          <span className="text-subhead font-semibold">Main account</span>
          <span className="text-subhead text-black/55 dark:text-white/55">{fmt(BALANCE)}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </button>
      </div>

      <List strong inset className="!my-5">
        <ListInput
          label="Note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's it for?"
          clearButton
          onClear={() => setNote('')}
          media={<PenLine className="w-5 h-5 opacity-60" />}
        />
      </List>

      <div className="grid grid-cols-3 gap-2 px-6">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-14 rounded-card flex items-center justify-center text-title2 font-medium active:bg-card-2 transition-colors"
            aria-label={k === 'del' ? 'Delete' : k}
          >
            {k === 'del' ? <Delete className="w-6 h-6" /> : k}
          </button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-8 bg-page border-t border-line">
        <Button
          large
          rounded
          disabled={value <= 0 || over}
          onClick={() => setSent(true)}
        >
          Send {fmt(value)}
        </Button>
        <div className="text-caption1 text-center mt-2 text-black/55 dark:text-white/55">Instant SEPA transfer · no fee on Metal</div>
      </div>

      <Confetti run={sent} />
      <Toast
        opened={sent}
        position="center"
        button={<Button clear small inline onClick={() => { setSent(false); nav.reset('home') }}>Done</Button>}
      >
        <span className="text-subhead">Sent {fmt(value)} to {person.short}</span>
      </Toast>
    </Page>
  )
}
