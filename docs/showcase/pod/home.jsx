import { useState } from 'react'
import { Page, Navbar, List, ListItem, Link } from 'konsta/react'
import { Play, Pause, Flame } from 'lucide-react'
import { useNav, AppTabbar, Photo, Meter, Avatar, Hero, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const CONTINUE = [
  { id: 'sn214', show: 'Signal & Noise', title: 'Ep. 214 · The Chip War, Explained', photo: 'neon circuit board', color: C.tech, value: 0.55, left: '26 m left' },
  { id: 'cl306', show: 'Cold Ledger', title: 'S3E6 · The Second Witness', photo: 'foggy forest road night', color: C.trueCrime, value: 0.3, left: '31 m left' },
  { id: 'df', show: 'Deep Field', title: 'Life on Europa?', photo: 'galaxy night sky', color: C.science, value: 0.8, left: '9 m left' },
  { id: 'hj88', show: 'Half Joking', title: '#88 · We Tried Silent Retreats', photo: 'microphone neon stage', color: C.comedy, value: 0.15, left: '52 m left' },
]

const NEW_EPISODES = [
  { id: 'mb', show: 'Morning Brief', title: 'Thursday, Oct 1', photo: 'newspaper coffee morning', color: C.news, date: 'Today', dur: '18 m' },
  { id: 'fad', show: 'Founders After Dark', title: 'Building in a Downturn', photo: 'city skyline at night', color: C.business, date: 'Today', dur: '47 m' },
  { id: 'mh41', show: 'The Missing Hour', title: 'Ep. 41 · The Lighthouse Keeper', photo: 'old clock dark room', color: C.trueCrime, date: 'Yesterday', dur: '54 m' },
  { id: 'bs', show: 'Byte Sized', title: 'Is Your Phone Listening?', photo: 'laptop glowing dark desk', color: C.tech, date: 'Tue', dur: '22 m' },
  { id: 'dfe', show: 'Deep Field', title: 'Life on Europa?', photo: 'galaxy night sky', color: C.science, date: 'Mon', dur: '44 m' },
]

const TRENDING_TECH = [
  { id: 'stack', name: 'The Stack', host: 'Lena Brooks & Omar Haddad', photo: 'server room blue lights', rating: '4.7' },
  { id: 'byte', name: 'Byte Sized', host: 'Dev Malik', photo: 'laptop glowing dark desk', rating: '4.6' },
  { id: 'sn', name: 'Signal & Noise', host: 'Priya Raman', photo: 'neon circuit board', rating: '4.8' },
]

const TRUE_CRIME = [
  { id: 'viv', name: 'Vanished in Vermont', host: 'Eli Carter', photo: 'abandoned farmhouse snow', rating: '4.7' },
  { id: 'cl', name: 'Cold Ledger', host: 'Nora Quinn', photo: 'foggy forest road night', rating: '4.9' },
  { id: 'mh', name: 'The Missing Hour', host: 'Rosa Delgado', photo: 'old clock dark room', rating: '4.6' },
]

function ShelfTitle({ color, label, onAll }) {
  return (
    <div className="relative z-10 px-4 mt-8 mb-3 flex items-center justify-between min-h-[28px]">
      <span className="flex items-center gap-2 text-title3">
        <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
        {label}
      </span>
      {onAll && <Link onClick={onAll} className="text-subhead">See all</Link>}
    </div>
  )
}

function Shelf({ shows, color, onOpen }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x">
      {shows.map((s, i) => (
        <button key={s.id} onClick={onOpen} className="shrink-0 w-40 text-left snap-start active:scale-[.97] transition vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
          <Photo q={s.photo} className="w-40 h-40 rounded-card relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-caption1 font-semibold text-white">★ {s.rating}</div>
            <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: color }} />
          </Photo>
          <div className="text-subhead font-semibold mt-2 truncate">{s.name}</div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">{s.host}</div>
        </button>
      ))}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [playing, setPlaying] = useState(true)

  return (
    <Page className="pb-48">
      <Navbar large transparent title="Home"
        right={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Maya Okafor" color={C.tech} size={32} /></Link>} />

      <div className="px-4 mt-1">
        <Hero color="#0e3a4a" to="#120f2b" className="!rounded-[28px] !p-5 vs-rise">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-subhead opacity-70">Thursday, Oct 1</div>
              <div className="text-title1 leading-tight mt-1">Good evening,<br />Maya</div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/30 text-subhead font-semibold">
              <Flame className="w-4 h-4" style={{ color: C.trueCrime }} />12 days
            </div>
          </div>
          <div className="text-subhead opacity-80 mt-4">5 new episodes from shows you follow · 3 h 41 m in Up Next</div>
        </Hero>
      </div>

      <ShelfTitle color={C.tech} label="Continue listening" onAll={() => nav.reset('library')} />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x">
        {CONTINUE.map((e, i) => (
          <button key={e.id} onClick={() => nav.push('now-playing')}
            className="shrink-0 w-72 bg-card rounded-card p-3 flex gap-3 text-left snap-start active:scale-[.98] transition vs-rise"
            style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={e.photo} className="w-20 h-20 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="text-caption1 font-semibold uppercase tracking-wide truncate" style={{ color: e.color }}>{e.show}</div>
              <div className="text-subhead font-semibold leading-snug line-clamp-2 mt-0.5">{e.title}</div>
              <div className="mt-auto">
                <div className="flex items-center justify-between text-caption1 text-black/55 dark:text-white/55 mb-1">
                  <span>{e.left}</span><span>{Math.round(e.value * 100)}%</span>
                </div>
                <Meter value={e.value} color={e.color} height={4} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <ShelfTitle color={C.news} label="New episodes" />
      <List strong inset dividers className="!mt-0">
        {NEW_EPISODES.map((e) => (
          <ListItem key={e.id} link
            linkProps={{ onClick: () => nav.push('episode-detail') }}
            media={<Photo q={e.photo} className="w-14 h-14 rounded-2xl" />}
            header={<span className="text-caption1 font-semibold" style={{ color: e.color }}>{e.show}</span>}
            title={<span className="truncate block">{e.title}</span>}
            footer={<span className="text-footnote">{e.date} · {e.dur}</span>}
          />
        ))}
      </List>

      <ShelfTitle color={C.tech} label="Trending in Tech" onAll={() => nav.reset('search')} />
      <Shelf shows={TRENDING_TECH} color={C.tech} onOpen={() => nav.push('show-page')} />

      <ShelfTitle color={C.trueCrime} label="True crime" onAll={() => nav.reset('search')} />
      <Shelf shows={TRUE_CRIME} color={C.trueCrime} onOpen={() => nav.push('show-page')} />

      <div className="fixed left-3 right-3 bottom-24 z-40 vs-rise">
        <div className="bg-card-2 rounded-card shadow-2xl overflow-hidden border border-line">
          <div className="flex items-center gap-3 p-2 pr-3">
            <button onClick={() => nav.push('now-playing')} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <Photo q="neon circuit board" className="w-11 h-11 rounded-xl shrink-0" />
              <div className="min-w-0">
                <div className="text-subhead font-semibold truncate">The Chip War, Explained</div>
                <div className="text-caption1 text-black/55 dark:text-white/55 truncate">Signal & Noise · Ep. 214 · 1.5×</div>
              </div>
            </button>
            <button onClick={() => setPlaying(!playing)}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
              style={{ background: tint(C.tech, 22), color: C.tech }}>
              {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>
          </div>
          <div className="h-[3px] w-full bg-black/10 dark:bg-white/10">
            <div className="h-full" style={{ width: '55%', background: C.tech, boxShadow: `0 0 8px ${C.tech}` }} />
          </div>
        </div>
      </div>

      <AppTabbar active="home" />
    </Page>
  )
}
