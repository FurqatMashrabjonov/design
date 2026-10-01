import { Page, Navbar, Block, BlockTitle, List, ListItem } from 'konsta/react'
import { Flame, Zap, Trophy, Crown, Gem, Heart, BookOpen } from 'lucide-react'
import { useNav, AppTabbar, Hero, Bars, Meter, Medal, Tile, CountUp, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}

const LEARNER = { name: 'Aziz Karimov', joined: 'Joined March 2026', flag: '🇪🇸', lang: 'Spanish', avatar: '🧑🏻' }

const STATS = [
  { id: 'streak', icon: Flame, value: '21', unit: 'day streak', color: C.streak },
  { id: 'xp', icon: Zap, value: 1840, unit: 'total XP', color: C.xp, count: true },
  { id: 'league', icon: Trophy, value: 'Gold', unit: 'league · #4', color: C.gems, opens: 'leaderboard' },
  { id: 'crowns', icon: Crown, value: '14', unit: 'crowns', color: C.crowns },
]

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEK_XP = [60, 85, 60, 0, 72, 45, 90]

const ACHIEVEMENTS = [
  { id: 'wildfire', name: 'Wildfire', emoji: '🔥', color: C.streak, level: 4, now: 21, goal: 30, unit: 'days' },
  { id: 'sage', name: 'Sage', emoji: '⚡', color: C.xp, level: 5, now: 1840, goal: 2000, unit: 'XP' },
  { id: 'scholar', name: 'Scholar', emoji: '📚', color: C.words, level: 3, now: 248, goal: 300, unit: 'words' },
  { id: 'champion', name: 'Champion', emoji: '🏆', color: C.gems, level: null, now: 3, goal: 5, unit: 'leagues', note: 'Reach Diamond League' },
]

const fmt = (n) => n.toLocaleString('en-US')

export default function Screen() {
  const nav = useNav()
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      <div className="flex flex-col items-center px-4 pt-2 pb-4 vs-rise">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg"
          style={{ background: C.streak }}
        >
          {LEARNER.avatar}
        </div>
        <div className="text-title2 mt-3 truncate max-w-full">{LEARNER.name}</div>
        <div className="flex items-center gap-2 text-subhead text-black/55 dark:text-white/55">
          <span className="text-xl leading-none">{LEARNER.flag}</span>
          <span>{LEARNER.joined} · Learning {LEARNER.lang}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-footnote font-semibold" style={{ background: tint(C.gems) }}>
            <Gem className="w-4 h-4" style={{ color: C.gems }} /> 1,260
          </span>
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-footnote font-semibold" style={{ background: tint(C.hearts) }}>
            <Heart className="w-4 h-4" style={{ color: C.hearts }} /> 4 of 5
          </span>
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-footnote font-semibold" style={{ background: tint(C.words) }}>
            <BookOpen className="w-4 h-4" style={{ color: C.words }} /> 248 words
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {STATS.map((s, i) => {
          const Icon = s.icon
          return (
            <Hero
              key={s.id}
              color={s.color}
              as={s.opens ? 'button' : undefined}
              onClick={s.opens ? () => nav.push(s.opens) : undefined}
              className="vs-rise text-left"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon className="w-6 h-6" />
              <div className="text-title1 mt-2">
                {s.count ? <CountUp to={s.value} format={fmt} /> : s.value}
              </div>
              <div className="text-subhead opacity-80">{s.unit}</div>
            </Hero>
          )
        })}
      </div>

      <BlockTitle>XP this week</BlockTitle>
      <Block strong inset className="vs-rise">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-title1" style={{ color: C.xp }}>412 XP</div>
            <div className="text-footnote text-black/55 dark:text-white/55">Mon – Sun · today 0 XP so far</div>
          </div>
          <Tile color={C.xp} tinted size={40}><Zap className="w-5 h-5" style={{ color: C.xp }} /></Tile>
        </div>
        <Bars values={WEEK_XP} labels={WEEK_LABELS} color={C.xp} highlight={3} height={120} />
      </Block>

      <BlockTitle>Achievements</BlockTitle>
      <List strong inset dividers>
        {ACHIEVEMENTS.map((a) => (
          <ListItem
            key={a.id}
            media={<Medal emoji={a.emoji} color={a.color} size={48} />}
            title={<span className="text-headline">{a.name}</span>}
            after={a.level ? <span className="text-footnote font-semibold" style={{ color: a.color }}>Level {a.level}</span> : null}
            subtitle={
              <div className="pt-1">
                <div className="text-footnote text-black/55 dark:text-white/55 mb-1.5">
                  {a.note ? `${a.note} · ` : ''}{fmt(a.now)} of {fmt(a.goal)} {a.unit}
                </div>
                <Meter value={a.now / a.goal} color={a.color} />
              </div>
            }
          />
        ))}
      </List>

      <List strong inset>
        <ListItem
          link
          onClick={() => nav.push('leaderboard')}
          media={<Tile color={C.gems}><Trophy className="w-4 h-4 text-white" /></Tile>}
          title="View league"
          after={<span className="text-subhead font-semibold" style={{ color: C.gems }}>Gold · #4</span>}
        />
      </List>

      <AppTabbar active="profile" />
    </Page>
  )
}
