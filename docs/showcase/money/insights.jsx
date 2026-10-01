import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton } from 'konsta/react'
import { TrendingUp, Info } from 'lucide-react'
import { useNav, AppTabbar, Bars, Tile, CountUp, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const TOTAL = 3240.8
const LAST = 2880.4
const CATEGORIES = [
  { id: 'workspace', name: 'Workspace', emoji: '🏢', amount: 960.0 },
  { id: 'software', name: 'Software', emoji: '💻', amount: 742.3 },
  { id: 'travel', name: 'Travel', emoji: '✈️', amount: 688.5 },
  { id: 'food', name: 'Food', emoji: '🍽️', amount: 612.4 },
  { id: 'transport', name: 'Transport', emoji: '🚕', amount: 237.6 },
]
const MERCHANTS = [
  { id: 'wework', name: 'WeWork La Fayette', emoji: '🏢', cat: 'workspace', total: 960.0, count: 3 },
  { id: 'sncf', name: 'SNCF', emoji: '🚄', cat: 'travel', total: 412.0, count: 4 },
  { id: 'adobe', name: 'Adobe', emoji: '🖌️', cat: 'software', total: 233.97, count: 3 },
  { id: 'kitsune', name: 'Café Kitsuné', emoji: '☕', cat: 'food', total: 96.6, count: 12 },
  { id: 'uber', name: 'Uber', emoji: '🚗', cat: 'transport', total: 148.2, count: 9 },
]

const eur = (n) => '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Donut({ selected, onSelect }) {
  const size = 210
  const stroke = 24
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const gap = 4
  let offset = 0
  const cat = CATEGORIES.find((c) => c.id === selected)
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/5 dark:text-white/10" />
        {CATEGORIES.map((c) => {
          const len = (c.amount / TOTAL) * circ
          const dash = Math.max(len - gap, 1)
          const el = (
            <circle
              key={c.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={C[c.id]}
              strokeWidth={selected && selected !== c.id ? stroke - 8 : stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ opacity: selected && selected !== c.id ? 0.3 : 1, transition: 'all 300ms ease', cursor: 'pointer' }}
              onClick={() => onSelect(selected === c.id ? null : c.id)}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {cat ? (
          <>
            <span className="text-3xl">{cat.emoji}</span>
            <span className="text-title2 mt-1" style={{ color: C[cat.id] }}>{eur(cat.amount)}</span>
            <span className="text-footnote text-black/55 dark:text-white/55">{cat.name} · {Math.round((cat.amount / TOTAL) * 100)}%</span>
          </>
        ) : (
          <>
            <span className="text-footnote text-black/55 dark:text-white/55">Spent in September</span>
            <span className="text-title1 mt-0.5"><CountUp to={TOTAL} format={eur} /></span>
            <span className="text-caption1 text-black/55 dark:text-white/55">5 categories</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [period, setPeriod] = useState('month')
  const [selected, setSelected] = useState(null)
  const delta = ((TOTAL - LAST) / LAST) * 100

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Insights" subtitle="September 2026" />

      <Block className="!my-3">
        <Segmented strong rounded>
          {[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([id, label]) => (
            <SegmentedButton key={id} rounded active={period === id} onClick={() => setPeriod(id)}>{label}</SegmentedButton>
          ))}
        </Segmented>
      </Block>

      <div className="mx-4 bg-card rounded-card p-5 vs-rise">
        <Donut selected={selected} onSelect={setSelected} />
        <div className="mt-5 grid grid-cols-1 gap-1">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setSelected(selected === c.id ? null : c.id)}
              className="flex items-center gap-3 min-h-[44px] px-2 rounded-2xl text-left vs-rise"
              style={{ animationDelay: `${i * 60}ms`, background: selected === c.id ? tint(C[c.id], 14) : 'transparent' }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: C[c.id] }} />
              <span className="text-body flex-1 truncate">{c.emoji}  {c.name}</span>
              <span className="text-footnote text-black/55 dark:text-white/55 w-10 text-right">{Math.round((c.amount / TOTAL) * 100)}%</span>
              <span className="text-body font-semibold w-24 text-right">{eur(c.amount)}</span>
            </button>
          ))}
        </div>
      </div>

      <BlockTitle className="!mb-2">Compared to August</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-5 vs-rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-footnote text-black/55 dark:text-white/55">September</div>
            <div className="text-title2">{eur(TOTAL)}</div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-subhead font-semibold" style={{ background: tint(C.workspace, 14), color: C.workspace }}>
            <TrendingUp className="w-4 h-4" /> +{delta.toFixed(1)}%
          </div>
        </div>
        <div className="mt-4">
          <Bars values={[LAST, TOTAL]} labels={['Aug', 'Sep']} height={120} />
        </div>
        <div className="mt-3 flex items-center justify-between text-footnote">
          <span className="text-black/55 dark:text-white/55">August</span>
          <span className="font-semibold">{eur(LAST)}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-line flex items-start gap-2 text-footnote text-black/55 dark:text-white/55">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          You spent {eur(TOTAL - LAST)} more, mostly on workspace and travel.
        </div>
      </div>

      <BlockTitle>Top merchants</BlockTitle>
      <List strong inset dividers>
        {MERCHANTS.map((m) => (
          <ListItem
            key={m.id}
            link
            linkProps={{ onClick: () => nav.push('transaction-detail', { merchant: m.id }) }}
            title={<span className="truncate">{m.name}</span>}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{m.count} {m.count === 1 ? 'payment' : 'payments'}</span>}
            media={<Tile tinted color={C[m.cat]} size={40}><span className="text-xl">{m.emoji}</span></Tile>}
            after={<span className="text-body font-semibold text-black dark:text-white">−{eur(m.total)}</span>}
          />
        ))}
      </List>

      <AppTabbar active="insights" />
    </Page>
  )
}
