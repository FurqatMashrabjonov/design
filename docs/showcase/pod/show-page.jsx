import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link, Button, Chip, Segmented, SegmentedButton, Actions, ActionsGroup, ActionsButton, ActionsLabel, Toast } from 'konsta/react'
import { Bell, BellRing, Star, Play, Download, CircleCheck, MoreHorizontal, Share2, Check, Plus, Mic } from 'lucide-react'
import { useNav, Photo, Glow, Meter, Tile, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const SHOW = {
  title: 'Signal & Noise',
  host: 'Priya Raman',
  category: 'Tech',
  emoji: '💡',
  rating: 4.8,
  episodes: 214,
  photo: 'neon circuit board',
  desc: 'Weekly deep dives on chips, AI and the people building them. Each episode, Priya sits down with engineers, analysts and founders to unpack the technology shaping the decade — and the politics, money and people behind it.',
}

const EPISODES = [
  { n: 214, title: 'The Chip War, Explained', date: 'Sep 30', dur: '58 m', summary: 'Priya talks with semiconductor analyst Dr. Kenji Watanabe about how a few factories became the world\u2019s most strategic assets.', played: 0.55, left: '26 m left', downloaded: true, size: '54 MB' },
  { n: 213, title: 'Open Models vs Closed', date: 'Sep 23', dur: '1 h 4 m', summary: 'Who wins when AI models are free to download? The trade-offs between open weights and closed labs.' },
  { n: 212, title: 'Inside a Robot Kitchen', date: 'Sep 16', dur: '49 m', summary: 'A visit to a kitchen where robots flip, plate and clean — and what it means for the people who cook.' },
  { n: 211, title: 'The Battery Breakthrough', date: 'Sep 9', dur: '55 m', summary: 'Solid-state cells promise longer range and faster charging. How close are they to your pocket?' },
  { n: 210, title: 'Who Owns Your Voice?', date: 'Sep 2', dur: '1 h 1 m', summary: 'Voice cloning is cheap and convincing. Rights, consent and the people fighting to protect their sound.' },
]

export default function Screen() {
  const nav = useNav()
  const [following, setFollowing] = useState(true)
  const [notify, setNotify] = useState(true)
  const [toast, setToast] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState('Newest')
  const [menu, setMenu] = useState(false)
  const [saved, setSaved] = useState(() => Object.fromEntries(EPISODES.map((e) => [e.n, !!e.downloaded])))

  const list = sort === 'Newest' ? EPISODES : [...EPISODES].reverse()

  const toggleBell = () => {
    setNotify(!notify)
    setToast(true)
    setTimeout(() => setToast(false), 1800)
  }

  return (
    <Page className="pb-10">
      <Navbar
        transparent
        title={SHOW.title}
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly onClick={() => setMenu(true)}><MoreHorizontal className="w-6 h-6" /></Link>}
      />

      <div
        className="relative flex flex-col items-center px-4 pt-4 pb-6 overflow-hidden"
        style={{ background: `linear-gradient(to bottom, ${tint(C.tech, 38)}, ${tint(C.tech, 8)} 60%, transparent)` }}
      >
        <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
          <Glow color={C.tech} size={300} opacity={0.45} />
        </div>
        <Photo q={SHOW.photo} className="relative w-52 h-52 rounded-[28px] shadow-2xl vs-rise">
          <div className="absolute bottom-3 left-3 w-10 h-10 rounded-2xl bg-black/50 flex items-center justify-center text-xl">{SHOW.emoji}</div>
        </Photo>
        <h1 className="relative text-title1 mt-5 text-center truncate max-w-full vs-rise" style={{ animationDelay: '60ms' }}>{SHOW.title}</h1>
        <div className="relative flex items-center gap-1.5 text-subhead text-black/55 dark:text-white/60 mt-1">
          <Mic className="w-4 h-4" /> {SHOW.host}
        </div>
        <div className="relative flex items-center gap-3 mt-3">
          <Chip className="!m-0" style={{ background: tint(C.tech, 22), color: C.tech }}>{SHOW.category}</Chip>
          <span className="flex items-center gap-1 text-subhead font-semibold">
            <Star className="w-4 h-4" style={{ color: C.comedy, fill: C.comedy }} /> {SHOW.rating}
          </span>
          <span className="text-subhead text-black/55 dark:text-white/55">{SHOW.episodes} episodes</span>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4">
        <Button
          large
          rounded
          className="flex-1"
          style={following ? { background: 'rgba(120,120,128,.28)' } : undefined}
          onClick={() => setFollowing(!following)}
        >
          <span className="flex items-center gap-2">
            {following ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {following ? 'Following' : 'Follow'}
          </span>
        </Button>
        <button
          onClick={toggleBell}
          aria-label="Notifications"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-card shrink-0"
          style={notify ? { background: tint(C.tech, 22), color: C.tech } : undefined}
        >
          {notify ? <BellRing className={`w-5 h-5 ${notify ? 'vs-bounce' : ''}`} /> : <Bell className="w-5 h-5" />}
        </button>
      </div>

      <div className="px-4 mt-5">
        <div className="bg-card rounded-card p-4">
          <p className={`text-callout text-black/70 dark:text-white/70 ${expanded ? '' : 'line-clamp-2'}`}>{SHOW.desc}</p>
          <button className="text-subhead font-semibold text-primary mt-1" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      <Photo q={SHOW.photo} className="relative mx-4 mt-4 h-36 rounded-card overflow-hidden">
        <button
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 text-left"
          onClick={() => nav.push('now-playing')}
        >
          <span className="text-caption1 font-semibold uppercase tracking-wide text-white/70">Continue · {EPISODES[0].left}</span>
          <span className="text-headline text-white truncate">Ep. {EPISODES[0].n} · {EPISODES[0].title}</span>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1"><Meter value={EPISODES[0].played} color={C.tech} height={5} /></div>
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.tech }}>
              <Play className="w-4 h-4 text-black" fill="black" />
            </span>
          </div>
        </button>
      </Photo>

      <div className="flex items-center justify-between px-4 mt-7 mb-2">
        <h2 className="text-title3">Episodes</h2>
        <Segmented strong rounded className="!w-44">
          {['Newest', 'Oldest'].map((s) => (
            <SegmentedButton
              key={s}
              rounded
              small
              active={sort === s}
              className={sort === s ? '!text-black dark:!text-white font-semibold' : '!text-black/60 dark:!text-white/65'}
              onClick={() => setSort(s)}
            >
              {s}
            </SegmentedButton>
          ))}
        </Segmented>
      </div>

      <List strong inset dividers className="!mt-2">
        {list.map((e, i) => (
          <ListItem
            key={e.n}
            link
            className="vs-rise"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => nav.push('episode-detail', { episode: e.n })}
            header={<span className="text-caption1 text-black/55 dark:text-white/55">{e.date} · Ep. {e.n}</span>}
            title={<span className="text-headline text-black dark:text-white">{e.title}</span>}
            text={<span className="line-clamp-2 text-footnote text-black/60 dark:text-white/60">{e.summary}</span>}
            footer={
              <div className="flex items-center gap-3 mt-2">
                <button
                  aria-label={`Play ${e.title}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: e.played ? C.tech : tint(C.tech, 22) }}
                  onClick={(ev) => { ev.stopPropagation(); nav.push('now-playing') }}
                >
                  <Play className="w-4 h-4" style={{ color: e.played ? '#000' : C.tech, fill: e.played ? '#000' : C.tech }} />
                </button>
                {e.played ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-16"><Meter value={e.played} color={C.tech} height={4} /></div>
                    <span className="text-footnote font-semibold" style={{ color: C.tech }}>{e.left}</span>
                  </div>
                ) : (
                  <span className="text-footnote text-black/60 dark:text-white/60 flex-1">{e.dur}</span>
                )}
                <button
                  aria-label={saved[e.n] ? 'Downloaded' : 'Download'}
                  className="w-11 h-11 -mr-2 flex items-center justify-center"
                  onClick={(ev) => { ev.stopPropagation(); setSaved({ ...saved, [e.n]: !saved[e.n] }) }}
                >
                  {saved[e.n]
                    ? <CircleCheck className="w-5 h-5 vs-bounce" style={{ color: C.tech }} />
                    : <Download className="w-5 h-5 text-black/55 dark:text-white/55" />}
                </button>
              </div>
            }
          />
        ))}
      </List>

      <BlockTitle>Hosted by</BlockTitle>
      <List strong inset>
        <ListItem
          title={<span className="text-headline text-black dark:text-white">{SHOW.host}</span>}
          subtitle={<span className="text-subhead text-black/60 dark:text-white/65">{`${SHOW.category} · ${SHOW.episodes} episodes`}</span>}
          media={<Tile color={C.tech} tinted size={40}><span className="text-xl">{SHOW.emoji}</span></Tile>}
          after={<span className="flex items-center gap-1 font-semibold" style={{ color: C.comedy }}><Star className="w-4 h-4" style={{ fill: C.comedy }} />{SHOW.rating}</span>}
        />
      </List>

      <Toast opened={toast} position="center">
        {notify ? 'You\u2019ll be notified of new episodes' : 'Notifications off for this show'}
      </Toast>

      <Actions opened={menu} onBackdropClick={() => setMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>{SHOW.title}</ActionsLabel>
          <ActionsButton onClick={() => setMenu(false)}>
            <span className="flex items-center gap-2 justify-center"><Share2 className="w-4 h-4" /> Share show</span>
          </ActionsButton>
          <ActionsButton onClick={() => { setMenu(false); setFollowing(!following) }} className={following ? '!text-red-500' : ''}>
            {following ? 'Unfollow' : 'Follow'}
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setMenu(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>
    </Page>
  )
}
