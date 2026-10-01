import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button, Toggle, Range, Dialog, DialogButton, Toast } from 'konsta/react'
import { Eye, EyeOff, Snowflake, Gauge, ScanFace, Globe, Nfc, Copy } from 'lucide-react'
import { useNav, Meter, Tile, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const CARD = {
  name: 'Black metal card',
  holder: 'LUCAS MOREAU',
  last4: '0937',
  network: 'Mastercard World Elite',
  kind: 'Physical',
  limit: 3000,
  spent: 1240,
  number: '5412 7534 8810 0937',
  expiry: '09/29',
  cvv: '418',
}

const TXNS = [
  { id: 'kitsune', name: 'Café Kitsuné Palais Royal', emoji: '☕', cat: 'food', amount: -8.4, when: 'Today, 09:12' },
  { id: 'wework', name: 'WeWork La Fayette', emoji: '🏢', cat: 'workspace', amount: -320, when: 'Mon 28 Sep' },
  { id: 'uber', name: 'Uber', emoji: '🚗', cat: 'transport', amount: -18.6, when: 'Sat 26 Sep' },
  { id: 'sncf', name: 'SNCF Paris→Lyon', emoji: '🚄', cat: 'travel', amount: -89, when: 'Fri 25 Sep' },
  { id: 'celeste', name: 'Le Mary Celeste', emoji: '🍷', cat: 'food', amount: -62.5, when: 'Fri 25 Sep' },
]

const eur = (n) => `${n < 0 ? '−' : '+'}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const eur0 = (n) => `€${n.toLocaleString('en-GB')}`
const cap = (s) => s[0].toUpperCase() + s.slice(1)

function CardArt({ shown, frozen }) {
  return (
    <div
      className="relative w-full aspect-[1.586] rounded-[24px] overflow-hidden p-5 flex flex-col justify-between text-white shadow-2xl transition-all duration-300"
      style={{ background: 'linear-gradient(135deg, #3a3a3e 0%, #18181a 45%, #050505 100%)', filter: frozen ? 'grayscale(1) brightness(0.8)' : 'none' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.10) 45%, transparent 60%)' }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-headline tracking-wide">Atelier</div>
          <div className="text-caption2 uppercase tracking-[0.2em] opacity-60">Metal</div>
        </div>
        <Nfc className="w-6 h-6 opacity-70" />
      </div>
      <div className="relative">
        <div className="w-10 h-7 rounded-md mb-3" style={{ background: 'linear-gradient(135deg,#e8d6a3,#a88b4a)' }} />
        <div className="text-title3 font-mono tracking-widest">{shown ? CARD.number : `•••• •••• •••• ${CARD.last4}`}</div>
      </div>
      <div className="relative flex items-end justify-between">
        <div className="flex gap-5">
          <div>
            <div className="text-caption2 uppercase opacity-50">Holder</div>
            <div className="text-footnote font-semibold tracking-wide">{CARD.holder}</div>
          </div>
          <div>
            <div className="text-caption2 uppercase opacity-50">Expires</div>
            <div className="text-footnote font-semibold font-mono">{shown ? CARD.expiry : '••/••'}</div>
          </div>
          <div>
            <div className="text-caption2 uppercase opacity-50">CVV</div>
            <div className="text-footnote font-semibold font-mono">{shown ? CARD.cvv : '•••'}</div>
          </div>
        </div>
        <div className="flex">
          <div className="w-7 h-7 rounded-full" style={{ background: '#eb001b' }} />
          <div className="w-7 h-7 rounded-full -ml-3" style={{ background: '#f79e1b', opacity: 0.9 }} />
        </div>
      </div>
      {frozen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <Snowflake className="w-10 h-10" />
          <div className="text-headline mt-2">Card frozen</div>
        </div>
      )}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [shown, setShown] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [limit, setLimit] = useState(CARD.limit)
  const [online, setOnline] = useState(true)
  const [contactless, setContactless] = useState(true)
  const [pinOpen, setPinOpen] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }
  const left = Math.max(limit - CARD.spent, 0)

  return (
    <Page className="pb-10">
      <Navbar title={`Metal •• ${CARD.last4}`} left={<NavbarBackLink showText={false} onClick={nav.pop} />} />

      <div className="px-4 pt-4 vs-rise">
        <CardArt shown={shown} frozen={frozen} />
        <div className="text-center mt-4">
          <div className="text-headline">{CARD.name}</div>
          <div className="text-subhead text-black/55 dark:text-white/55">
            {CARD.network} · {CARD.kind} · <span className={frozen ? 'text-sky-500' : 'text-green-600 dark:text-green-400'}>{frozen ? 'Frozen' : 'Active'}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button large rounded className="flex-1" onClick={() => setShown(!shown)}>
            <span className="flex items-center gap-2">{shown ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}{shown ? 'Hide details' : 'Show details'}</span>
          </Button>
          {shown && (
            <Button inline large rounded tonal className="!w-14 shrink-0 vs-bounce" onClick={() => flash('Card number copied')}>
              <Copy className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-6">
        {[['Spent', eur0(CARD.spent), 'this month'], ['Limit', eur0(limit), 'monthly'], ['Left', eur0(left), 'to spend']].map(([k, v, u], i) => (
          <div key={k} className="bg-card rounded-card p-3 text-center vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">{k}</div>
            <div className={`text-headline ${i === 2 ? 'text-primary' : ''}`}>{v}</div>
            <div className="text-caption2 text-black/55 dark:text-white/55">{u}</div>
          </div>
        ))}
      </div>

      <BlockTitle>Card settings</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Freeze card"
          subtitle={frozen ? 'All payments are blocked' : 'Temporarily block payments'}
          media={<Tile color="#0a84ff"><Snowflake className="w-4 h-4" /></Tile>}
          after={<Toggle checked={frozen} onChange={() => { setFrozen(!frozen); flash(frozen ? 'Card unfrozen' : 'Card frozen') }} />}
        />
        <ListItem
          title="Monthly spending limit"
          media={<Tile color="#34c759"><Gauge className="w-4 h-4" /></Tile>}
          after={<span className="text-headline text-primary">{eur0(limit)}</span>}
          text={
            <div className="pt-2 pr-1">
              <div className="text-footnote text-black/55 dark:text-white/55 mb-2">{eur0(CARD.spent)} spent of {eur0(limit)}</div>
              <Meter value={Math.min(CARD.spent / limit, 1)} height={6} />
              <Range className="mt-2" min={1500} max={6000} step={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
            </div>
          }
        />
        <ListItem
          link
          title="View PIN"
          media={<Tile color="#5e5ce6"><ScanFace className="w-4 h-4" /></Tile>}
          after={<span className="text-subhead text-black/55 dark:text-white/55">Face ID</span>}
          onClick={() => setPinOpen(true)}
        />
        <ListItem
          title="Online payments"
          media={<Tile color="#ff9f0a"><Globe className="w-4 h-4" /></Tile>}
          after={<Toggle checked={online} onChange={() => setOnline(!online)} />}
        />
        <ListItem
          title="Contactless"
          media={<Tile color="#30b0c7"><Nfc className="w-4 h-4" /></Tile>}
          after={<Toggle checked={contactless} onChange={() => setContactless(!contactless)} />}
        />
      </List>

      <BlockTitle>Recent on this card</BlockTitle>
      <List strong inset dividers>
        {TXNS.map((t, i) => (
          <ListItem
            key={t.id}
            link
            className="vs-rise"
            style={{ animationDelay: `${i * 60}ms` }}
            title={<span className="truncate block max-w-[170px]">{t.name}</span>}
            subtitle={<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C[t.cat] }} />{cap(t.cat)} · {t.when}</span>}
            media={<Tile tinted color={C[t.cat]} size={40}><span className="text-xl">{t.emoji}</span></Tile>}
            after={<span className="text-headline">{eur(t.amount)}</span>}
            onClick={() => nav.push('transaction-detail', { id: t.id })}
          />
        ))}
      </List>

      <Block className="text-center !mt-2">
        <div className="text-footnote text-black/55 dark:text-white/55">Charged to Main account · FR76 •••• 4321</div>
      </Block>

      <Dialog
        opened={pinOpen}
        onBackdropClick={() => setPinOpen(false)}
        title="View PIN"
        content={
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: tint('#5e5ce6', 18) }}>
              <ScanFace className="w-8 h-8" style={{ color: '#5e5ce6' }} />
            </div>
            <div>Confirm it's you with Face ID to see the PIN for the card ending {CARD.last4}.</div>
          </div>
        }
        buttons={
          <>
            <DialogButton onClick={() => setPinOpen(false)}>Cancel</DialogButton>
            <DialogButton strong onClick={() => { setPinOpen(false); flash('PIN shown for 10 seconds') }}>Use Face ID</DialogButton>
          </>
        }
      />

      <Toast opened={!!toast} position="center">{toast}</Toast>
    </Page>
  )
}
