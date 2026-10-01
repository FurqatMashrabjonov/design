import { useState, Fragment } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Button, Segmented, SegmentedButton } from 'konsta/react'
import { Shield, Crown, Clock, ChevronsUp, ChevronsDown, Zap } from 'lucide-react'
import { useNav, AppTabbar, Hero, Glow, Tile, Meter, CountUp, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}
const RED = '#ff3b30'

const PLAYERS = [
  { rank: 1, name: 'Sofia M.', emoji: '👩🏽', xp: 655, color: C.gems },
  { rank: 2, name: 'Lucas R.', emoji: '👨🏼', xp: 590, color: C.crowns },
  { rank: 3, name: 'Mei Lin', emoji: '👩🏻', xp: 448, color: C.hearts },
  { rank: 4, name: 'Aziz', emoji: '🧑🏻', xp: 412, color: C.streak, you: true },
  { rank: 5, name: 'Omar K.', emoji: '👨🏾', xp: 398, color: C.words },
  { rank: 6, name: 'Hannah B.', emoji: '👱🏻‍♀️', xp: 361, color: C.xp },
  { rank: 7, name: 'Diego P.', emoji: '🧔🏽', xp: 340, color: C.gems },
  { rank: 8, name: 'Aiko T.', emoji: '👩🏻‍🦰', xp: 302, color: C.crowns },
  { rank: 9, name: 'Noah W.', emoji: '👦🏼', xp: 275, color: C.hearts },
  { rank: 10, name: 'Priya S.', emoji: '👩🏾', xp: 240, color: C.words },
  { rank: 11, name: 'Jonas F.', emoji: '🧑🏼', xp: 198, color: C.xp },
  { rank: 12, name: 'Elena V.', emoji: '👵🏻', xp: 154, color: C.gems },
  { rank: 13, name: 'Tom H.', emoji: '👨🏻', xp: 96, color: C.crowns },
]
const PODIUM = ['#e6a700', '#9aa3ad', '#c87533']

export default function Screen() {
  const nav = useNav()
  const [view, setView] = useState('all')
  const me = PLAYERS.find((p) => p.you)
  const ahead = PLAYERS.find((p) => p.rank === me.rank - 1)
  const gap = ahead.xp - me.xp

  const sections = view === 'near'
    ? [{ key: 'near', title: 'Around you', items: PLAYERS.filter((p) => Math.abs(p.rank - me.rank) <= 2), offset: 0 }]
    : [
        { key: 'promo', title: <><ChevronsUp className="w-5 h-5" /> Promotion zone</>, color: C.words, items: PLAYERS.filter((p) => p.rank <= 5), offset: 0 },
        { key: 'safe', title: 'Safe zone', items: PLAYERS.filter((p) => p.rank > 5 && p.rank <= 10), offset: 5 },
        { key: 'demo', title: <><ChevronsDown className="w-5 h-5" /> Demotion zone</>, color: RED, items: PLAYERS.filter((p) => p.rank > 10), offset: 10 },
      ]

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Gold League" subtitle="Week of Oct 1" />

      <div className="px-4 pt-2">
        <Hero color={C.xp} to="#ff9500" className="rounded-card p-5 relative overflow-hidden text-center">
          <div className="relative flex justify-center">
            <Glow color="#fff3b0" size={200} opacity={0.6} />
            <div className="relative vs-float w-28 h-28 flex items-center justify-center">
              <Shield className="absolute inset-0 w-28 h-28" strokeWidth={1.5} style={{ fill: '#ffe066', stroke: '#a86a00' }} />
              <Crown className="relative w-10 h-10" strokeWidth={2} style={{ color: '#a86a00', fill: '#fff6cc' }} />
            </div>
          </div>
          <div className="relative text-title1 mt-2">Gold League</div>
          <div className="relative flex items-center justify-center gap-1.5 text-subhead opacity-80 mt-1">
            <Clock className="w-4 h-4" /> Ends in 3 days
          </div>
          <div className="relative flex justify-center gap-2 mt-3 text-caption1 font-semibold">
            <span className="px-3 py-1 rounded-full bg-black/10">Top 5 promote</span>
            <span className="px-3 py-1 rounded-full bg-black/10">Bottom 3 demote</span>
          </div>
        </Hero>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card rounded-card p-4 vs-rise">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-footnote text-black/55 dark:text-white/55">Your rank</div>
              <div className="text-figure" style={{ color: C.crowns }}>#<CountUp to={me.rank} /></div>
            </div>
            <div className="text-right">
              <div className="text-footnote text-black/55 dark:text-white/55">This week</div>
              <div className="text-title2 flex items-center gap-1 justify-end">
                <Zap className="w-5 h-5" style={{ color: C.xp, fill: C.xp }} />
                <CountUp to={me.xp} /> XP
              </div>
            </div>
          </div>
          <div className="mt-3"><Meter value={me.xp / ahead.xp} color={C.xp} height={10} /></div>
          <div className="text-subhead mt-2 text-black/60 dark:text-white/60">
            {gap} XP behind {ahead.name} — one lesson moves you to #3
          </div>
          <Button large rounded className="mt-4" onClick={() => nav.push('lesson')}>Earn XP now</Button>
        </div>
      </div>

      <Block className="!mt-5 !mb-1">
        <Segmented strong rounded>
          <SegmentedButton rounded active={view === 'all'} onClick={() => setView('all')}>Everyone</SegmentedButton>
          <SegmentedButton rounded active={view === 'near'} onClick={() => setView('near')}>Near me</SegmentedButton>
        </Segmented>
      </Block>

      {sections.map((s) => (
        <Fragment key={s.key}>
          <BlockTitle className="flex items-center gap-1.5" style={s.color ? { color: s.color } : undefined}>
            {s.title}
          </BlockTitle>
          <List strong inset dividers>
            {s.items.map((p, i) => (
              <ListItem
                key={p.rank}
                link={!!p.you}
                onClick={p.you ? () => nav.reset('profile') : undefined}
                className={`vs-rise ${p.you ? 'font-semibold' : ''}`}
                style={{ animationDelay: `${(i + s.offset) * 40}ms`, ...(p.you ? { background: tint(C.streak, 20) } : {}) }}
                media={
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 text-center text-headline"
                      style={{ color: p.rank <= 3 ? PODIUM[p.rank - 1] : undefined }}
                    >
                      {p.rank}
                    </span>
                    <Tile color={p.color} tinted size={40}><span className="text-xl">{p.emoji}</span></Tile>
                  </div>
                }
                title={<span className="text-headline truncate">{p.you ? 'Aziz (you)' : p.name}</span>}
                after={<span className="text-subhead font-semibold text-black/70 dark:text-white/70">{p.xp.toLocaleString()} XP</span>}
              />
            ))}
          </List>
        </Fragment>
      ))}

      <Block className="text-footnote text-center text-black/55 dark:text-white/55">
        Charlo 🦜 resets the league every Thursday. Keep your streak alive to stay on top!
      </Block>

      <AppTabbar active="league" />
    </Page>
  )
}
