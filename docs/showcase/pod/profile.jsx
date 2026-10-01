import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Toggle, Actions, ActionsGroup, ActionsLabel, ActionsButton } from 'konsta/react'
import { Flame, Settings, Gauge, Download, Bell, Moon, Headphones } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Hero, Bars, Photo, Tile, CountUp, Glow, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const WEEK = [48, 62, 35, 71, 0, 0, 0]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const CATEGORIES = [
  { name: 'Tech', emoji: '💻', pct: 38, color: C.tech },
  { name: 'True Crime', emoji: '🔍', pct: 27, color: C.trueCrime },
  { name: 'Science', emoji: '🔬', pct: 15, color: C.science },
  { name: 'Comedy', emoji: '😂', pct: 12, color: C.comedy },
  { name: 'News', emoji: '📰', pct: 8, color: C.news },
]
const TOP_SHOWS = [
  { id: 'signal-noise', rank: 1, name: 'Signal & Noise', host: 'Priya Raman', hours: 31, color: C.tech, photo: 'neon circuit board' },
  { id: 'cold-ledger', rank: 2, name: 'Cold Ledger', host: 'Nora Quinn', hours: 22, color: C.trueCrime, photo: 'foggy forest road night' },
  { id: 'deep-field', rank: 3, name: 'Deep Field', host: 'Dr. Amara Bello', hours: 17, color: C.science, photo: 'galaxy night sky' },
  { id: 'half-joking', rank: 4, name: 'Half Joking', host: 'Sam Ortiz & Kat Lee', hours: 12, color: C.comedy, photo: 'microphone neon stage' },
]
const SPEEDS = ['1×', '1.25×', '1.5×', '1.75×', '2×']

export default function Screen() {
  const nav = useNav()
  const [speed, setSpeed] = useState('1.5×')
  const [speedOpen, setSpeedOpen] = useState(false)
  const [newEps, setNewEps] = useState(true)
  const [streakNudge, setStreakNudge] = useState(true)
  const [wifiOnly, setWifiOnly] = useState(true)

  const weekTotal = WEEK.reduce((a, b) => a + b, 0)
  const weekLabel = `${Math.floor(weekTotal / 60)} h ${weekTotal % 60} m`

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile"
        right={<Link iconOnly onClick={() => setSpeedOpen(true)}><Settings className="w-6 h-6" /></Link>} />

      <div className="px-4 pt-2 pb-4 flex items-center gap-4 vs-rise">
        <div className="relative">
          <Glow color={C.tech} size={110} opacity={0.35} />
          <div className="relative"><Avatar name="Maya Okafor" color={C.business} size={64} /></div>
        </div>
        <div className="min-w-0">
          <div className="text-title2 truncate">Maya Okafor</div>
          <div className="text-subhead text-black/55 dark:text-white/55">Listening since 2024 · 9 shows</div>
        </div>
      </div>

      <div className="px-4 vs-rise" style={{ animationDelay: '60ms' }}>
        <Hero color={C.business} to={C.tech} className="rounded-[28px] p-5">
          <div className="flex items-center gap-2 text-subhead opacity-80">
            <Headphones className="w-4 h-4" /> Listened in 2026
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-figure"><CountUp to={142} /></span>
            <span className="text-title3 opacity-80">hours</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5">
              <Flame className="w-4 h-4" />
              <span className="text-subhead font-semibold">12-day streak</span>
            </div>
            <span className="text-footnote opacity-80">Top: Tech 38%</span>
          </div>
        </Hero>
      </div>

      <BlockTitle className="!mb-2">This week</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-title1">{weekLabel}</div>
            <div className="text-footnote text-black/55 dark:text-white/55">Sep 28 – Oct 4 · mostly Tech</div>
          </div>
          <div className="text-right">
            <div className="text-headline" style={{ color: C.tech }}>71 m</div>
            <div className="text-caption1 text-black/55 dark:text-white/55">today</div>
          </div>
        </div>
        <Bars values={WEEK} labels={DAYS} color={C.tech} highlight={3} height={120} />
      </div>

      <BlockTitle className="!mb-2">Top categories</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '180ms' }}>
        <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
          {CATEGORIES.map((c) => (
            <div key={c.name} style={{ width: `${c.pct}%`, background: c.color }} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {CATEGORIES.map((c) => (
            <div key={c.name} className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="text-subhead truncate">{c.emoji} {c.name}</span>
              <span className="ml-auto text-subhead font-semibold" style={{ color: c.color }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <BlockTitle>Top shows this year</BlockTitle>
      <List strong inset dividers>
        {TOP_SHOWS.map((s) => (
          <ListItem key={s.id} link
            linkProps={{ onClick: () => nav.push('show-page', { id: s.id }) }}
            media={
              <div className="flex items-center gap-3">
                <span className="w-4 text-headline text-black/55 dark:text-white/55">{s.rank}</span>
                <Photo q={s.photo} className="w-14 h-14 rounded-2xl" />
              </div>
            }
            title={<span className="text-headline truncate">{s.name}</span>}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{s.host}</span>}
            after={<span className="text-headline" style={{ color: s.color }}>{s.hours} h</span>} />
        ))}
      </List>

      <BlockTitle>Playback</BlockTitle>
      <List strong inset dividers>
        <ListItem link onClick={() => setSpeedOpen(true)} title="Default speed"
          media={<Tile color={C.business}><Gauge className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-body text-black/55 dark:text-white/55">{speed}</span>} />
        <ListItem title="Sleep timer"
          media={<Tile color="#5e5ce6"><Moon className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-body text-black/55 dark:text-white/55">End of episode</span>} />
      </List>

      <BlockTitle>Downloads</BlockTitle>
      <List strong inset dividers>
        <ListItem link onClick={() => nav.reset('library')} title="Manage downloads"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">1.8 GB of 64 GB used</span>}
          media={<Tile color={C.science}><Download className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-body text-black/55 dark:text-white/55">3</span>} />
        <ListItem title="Download on Wi‑Fi only"
          media={<Tile color={C.tech}><Download className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={wifiOnly} onChange={() => setWifiOnly(!wifiOnly)} />} />
      </List>

      <BlockTitle>Notifications</BlockTitle>
      <List strong inset dividers>
        <ListItem title="New episodes"
          media={<Tile color={C.news}><Bell className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={newEps} onChange={() => setNewEps(!newEps)} />} />
        <ListItem title="Streak reminders"
          media={<Tile color={C.trueCrime}><Flame className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={streakNudge} onChange={() => setStreakNudge(!streakNudge)} />} />
      </List>

      <Block className="text-center text-footnote text-black/55 dark:text-white/55">
        Following 9 shows · Lowtide
      </Block>

      <Actions opened={speedOpen} onBackdropClick={() => setSpeedOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Default playback speed</ActionsLabel>
          {SPEEDS.map((s) => (
            <ActionsButton key={s} bold={s === speed} onClick={() => { setSpeed(s); setSpeedOpen(false) }}>
              {s}
            </ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setSpeedOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <AppTabbar active="profile" />
    </Page>
  )
}
