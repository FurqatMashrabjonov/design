import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Link, Button, Chip } from 'konsta/react'
import { Bell, ArrowUpRight, ArrowDownLeft, Plus, TrendingUp, Wifi, Snowflake, PiggyBank } from 'lucide-react'
import { useNav, AppTabbar, CountUp, Avatar, Tile, Meter, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const CARDS = [
  { id: 'virtual', name: 'Coral virtual', last4: '4821', network: 'VISA', kind: 'Virtual · online', spent: 386.2, limit: 1500, bg: 'linear-gradient(135deg, #ff8a65 0%, #ff5e62 55%, #e84a6f 100%)' },
  { id: 'metal', name: 'Black metal', last4: '0937', network: 'Mastercard', kind: 'World Elite · physical', spent: 1240, limit: 3000, bg: 'linear-gradient(135deg, #3a3a3e 0%, #18181b 60%, #0b0b0d 100%)' },
]

const TX = [
  { id: 'kitsune', name: 'Café Kitsuné Palais Royal', emoji: '☕', cat: 'Food', color: C.food, amount: -8.4, when: 'Today, 09:12' },
  { id: 'nomade', name: 'Studio Nomade', emoji: '💼', cat: 'Income', color: C.income, amount: 4800, when: 'Yesterday' },
  { id: 'figma', name: 'Figma', emoji: '🎨', cat: 'Software', color: C.software, amount: -45, when: 'Yesterday' },
  { id: 'adobe', name: 'Adobe Creative Cloud', emoji: '🖌️', cat: 'Software', color: C.software, amount: -77.99, when: 'Mon 28 Sep' },
  { id: 'wework', name: 'WeWork La Fayette', emoji: '🏢', cat: 'Workspace', color: C.workspace, amount: -320, when: 'Mon 28 Sep' },
  { id: 'uber', name: 'Uber', emoji: '🚗', cat: 'Transport', color: C.transport, amount: -18.6, when: 'Sat 26 Sep' },
]

const eur = (n) => `${n < 0 ? '−' : '+'}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Screen() {
  const nav = useNav()
  const [hidden, setHidden] = useState(false)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Home" subtitle="Thursday, 1 October"
        left={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Lucas Moreau" color={C.software} size={32} /></Link>}
        right={<Link iconOnly><Bell className="w-6 h-6" /></Link>} />

      <div className="px-4 pt-2 vs-rise">
        <button onClick={() => setHidden(!hidden)} className="text-subhead text-black/55 dark:text-white/55">
          Total balance · Main account
        </button>
        <div className="text-figure mt-1 tabular-nums">
          {hidden ? '€ ••••••' : <>€<CountUp to={18420.65} format={(v) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Chip className="!text-footnote font-semibold" style={{ background: tint(C.income, 18) }}
            media={<TrendingUp className="w-4 h-4" style={{ color: C.income }} />}>
            +€4,800.00 this week
          </Chip>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
          <Button rounded onClick={() => nav.push('send-money')} className="!h-11">
            <ArrowUpRight className="w-5 h-5 mr-1" />Send
          </Button>
          <Button rounded tonal className="!h-11">
            <ArrowDownLeft className="w-5 h-5 mr-1" />Request
          </Button>
          <Button rounded tonal className="!h-11">
            <Plus className="w-5 h-5 mr-1" />Add
          </Button>
        </div>
      </div>

      <BlockTitle className="!mt-8 flex items-center justify-between !mb-2">
        <span>Cards</span>
        <span className="text-footnote font-normal text-black/55 dark:text-white/55">2 active</span>
      </BlockTitle>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2">
        {CARDS.map((c, i) => (
          <button key={c.id} onClick={() => nav.push('card-detail', { id: c.id })}
            className="snap-start shrink-0 w-[300px] text-left active:scale-[.98] transition vs-rise"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-[176px] rounded-[22px] p-4 flex flex-col justify-between text-white shadow-lg relative overflow-hidden"
              style={{ background: c.bg }}>
              <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-subhead font-semibold">Atelier</span>
                <Wifi className="w-5 h-5 rotate-90 opacity-80" />
              </div>
              <div className="w-10 h-7 rounded-md bg-white/30 relative" />
              <div className="flex items-end justify-between relative">
                <div>
                  <div className="text-caption1 opacity-80">{c.kind}</div>
                  <div className="text-headline tracking-widest">•• {c.last4}</div>
                </div>
                <span className="text-subhead font-bold italic">{c.network}</span>
              </div>
            </div>
            <div className="mt-2 px-1">
              <div className="flex justify-between text-footnote">
                <span className="text-black/55 dark:text-white/55">Spent this month</span>
                <span className="font-semibold">€{c.spent.toLocaleString('en-GB')} of €{c.limit.toLocaleString('en-GB')}</span>
              </div>
              <div className="mt-1.5"><Meter value={c.spent / c.limit} /></div>
            </div>
          </button>
        ))}
      </div>

      <BlockTitle className="!mt-6 flex items-center justify-between">
        <span>Latest transactions</span>
        <Link onClick={() => nav.reset('insights')} className="!text-[15px] !font-normal">See all</Link>
      </BlockTitle>
      <List strong inset dividers>
        {TX.map((t) => (
          <ListItem key={t.id} link
            linkProps={{ onClick: () => nav.push('transaction-detail', { id: t.id }) }}
            media={<span className="w-11 h-11 rounded-full flex items-center justify-center text-xl" style={{ background: tint(t.color, 18) }}>{t.emoji}</span>}
            title={<span className="truncate block max-w-[170px]">{t.name}</span>}
            subtitle={<span className="flex items-center gap-1.5 text-footnote">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="text-black/55 dark:text-white/55">{t.cat} · {t.when}</span>
            </span>}
            after={<span className="text-body font-semibold tabular-nums" style={t.amount > 0 ? { color: C.income } : undefined}>{eur(t.amount)}</span>} />
        ))}
      </List>

      <List strong inset>
        <ListItem
          media={<Tile color={C.income}><PiggyBank className="w-4 h-4 text-white" /></Tile>}
          title="Tax pot"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">25% set aside from income</span>}
          after={<span className="font-semibold tabular-nums">€4,120.00</span>} />
      </List>

      <AppTabbar active="home" />
    </Page>
  )
}
