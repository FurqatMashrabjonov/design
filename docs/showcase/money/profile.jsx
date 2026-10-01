import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, ListButton, Toggle, Toast, Button } from 'konsta/react'
import { Copy, Check, ShieldCheck, Bell, Link2, PiggyBank, LifeBuoy, Briefcase, Landmark, Gem } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Tile, Ring, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const OWNER = { name: 'Lucas Moreau', role: 'Designer · Paris', plan: 'Metal', iban: 'FR76 3000 4012 3400 0098 7654 321' }
const CARDS = [
  { id: 'virtual', name: 'Coral virtual card', last4: '4821', network: 'Visa · Online', spent: 386.2, limit: 1500, from: '#ff8a6b', to: '#ff5e62' },
  { id: 'metal', name: 'Black metal card', last4: '0937', network: 'Mastercard World Elite', spent: 1240, limit: 3000, from: '#3a3a3c', to: '#0b0b0c' },
]
const STATS = [
  { label: 'Balance', value: '€18.4k', sub: 'Main account', color: null },
  { label: 'Income', value: '+€4.8k', sub: 'This week', color: C.income },
  { label: 'Tax pot', value: '€4,120', sub: '25% set aside', color: C.software },
]

const eur = (n) => '€' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })

function MiniCard({ c }) {
  return (
    <div className="w-12 h-8 rounded-md relative shadow-sm" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
      <span className="absolute bottom-0.5 right-1 text-[11px] font-semibold text-white/90">{c.last4}</span>
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [copied, setCopied] = useState(false)
  const [notify, setNotify] = useState(true)
  const [faceId, setFaceId] = useState(true)

  const copy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      <div className="flex flex-col items-center text-center px-4 pt-2 pb-4 vs-rise">
        <Avatar name={OWNER.name} size={88} />
        <div className="text-title2 mt-3">{OWNER.name}</div>
        <div className="text-subhead text-black/55 dark:text-white/55">{OWNER.role}</div>
        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-2 border border-line text-footnote font-semibold">
          <Gem className="w-3.5 h-3.5 text-primary" /> {OWNER.plan} plan
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4">
        {STATS.map((s, i) => (
          <div key={s.label} className="bg-card rounded-card p-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
            <div className="text-headline mt-1 truncate" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
            <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{s.sub}</div>
          </div>
        ))}
      </div>

      <BlockTitle>Account</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="IBAN"
          subtitle={<span className="text-footnote font-mono tracking-tight text-black/55 dark:text-white/55">{OWNER.iban}</span>}
          media={<Tile color="#0a84ff"><Landmark className="w-4 h-4 text-white" /></Tile>}
          after={
            <Button clear small inline rounded onClick={copy} className="!w-11 !h-11 !p-0">
              {copied ? <Check className="w-5 h-5 vs-bounce" /> : <Copy className="w-5 h-5" />}
            </Button>
          }
        />
        <ListItem
          link
          title="Business details"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Freelance brand designer · Paris 11e</span>}
          media={<Tile color="#636366"><Briefcase className="w-4 h-4 text-white" /></Tile>}
          onClick={() => nav.push('card-detail')}
        />
      </List>

      <BlockTitle>Cards</BlockTitle>
      <List strong inset dividers>
        {CARDS.map((c) => (
          <ListItem
            key={c.id}
            link
            onClick={() => nav.push('card-detail', { id: c.id })}
            media={<MiniCard c={c} />}
            title={<span className="truncate">{c.name}</span>}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">•• {c.last4} · {c.network}</span>}
            after={
              <div className="flex items-center gap-2">
                <span className="text-footnote text-black/55 dark:text-white/55">{eur(c.spent)}</span>
                <Ring value={c.spent / c.limit} size={28} stroke={4} />
              </div>
            }
          />
        ))}
      </List>

      <BlockTitle>Settings</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Face ID & passcode"
          media={<Tile color="#34c759"><ShieldCheck className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={faceId} onChange={() => setFaceId(!faceId)} />}
        />
        <ListItem
          title="Notifications"
          media={<Tile color="#ff3b30"><Bell className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={notify} onChange={() => setNotify(!notify)} />}
        />
        <ListItem
          link
          title="Linked accounts"
          media={<Tile color="#5e5ce6"><Link2 className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-subhead text-black/55 dark:text-white/55">2</span>}
        />
        <ListItem
          link
          title="Tax pot"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">€4,120 set aside</span>}
          media={<Tile color={C.income} tinted><PiggyBank className="w-4 h-4" style={{ color: C.income }} /></Tile>}
          after={
            <span className="px-2 py-0.5 rounded-full text-footnote font-semibold" style={{ background: tint(C.income, 20) }}>
              25%
            </span>
          }
        />
        <ListItem
          link
          title="Help & support"
          media={<Tile color="#ff9500"><LifeBuoy className="w-4 h-4 text-white" /></Tile>}
        />
      </List>

      <List strong inset>
        <ListButton className="text-red-500" onClick={() => nav.reset('home')}>Sign out</ListButton>
      </List>

      <Block className="text-center text-caption1 text-black/55 dark:text-white/55 !mt-2">
        Atelier Bank · Metal member · Version 3.4
      </Block>

      <Toast position="center" opened={copied}>
        <div className="flex items-center gap-2"><Check className="w-4 h-4" /> IBAN copied</div>
      </Toast>

      <AppTabbar active="profile" />
    </Page>
  )
}
