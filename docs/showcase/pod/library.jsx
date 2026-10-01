import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Toggle } from 'konsta/react'
import { ChevronUp, ChevronDown, Download, HardDrive, ListMusic, Play, Clock, Wifi } from 'lucide-react'
import { useNav, AppTabbar, Photo, Meter, Tile, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const SHOWS = [
  { id: 'signal-noise', name: 'Signal & Noise', cat: 'tech', photo: 'neon circuit board', fresh: 0 },
  { id: 'byte-sized', name: 'Byte Sized', cat: 'tech', photo: 'laptop glowing dark desk', fresh: 1 },
  { id: 'founders', name: 'Founders After Dark', cat: 'business', photo: 'city skyline at night', fresh: 1 },
  { id: 'cold-ledger', name: 'Cold Ledger', cat: 'trueCrime', photo: 'foggy forest road night', fresh: 0 },
  { id: 'missing-hour', name: 'The Missing Hour', cat: 'trueCrime', photo: 'old clock dark room', fresh: 1 },
  { id: 'deep-field', name: 'Deep Field', cat: 'science', photo: 'galaxy night sky', fresh: 1 },
  { id: 'half-joking', name: 'Half Joking', cat: 'comedy', photo: 'microphone neon stage', fresh: 0 },
  { id: 'morning-brief', name: 'Morning Brief', cat: 'news', photo: 'newspaper coffee morning', fresh: 1 },
]
const SHOW = Object.fromEntries(SHOWS.map((s) => [s.id, s]))

const DOWNLOADS = [
  { id: 'sn214', show: 'signal-noise', title: 'Ep. 214 · The Chip War, Explained', size: '54 MB', meta: 'Sep 30 · 58 m' },
  { id: 'cl306', show: 'cold-ledger', title: 'S3E6 · The Second Witness', size: '61 MB', meta: '31 m left' },
  { id: 'mh41', show: 'missing-hour', title: 'Ep. 41 · The Lighthouse Keeper', size: '50 MB', meta: 'Sep 30 · 54 m' },
]

const QUEUE = [
  { id: 'sn214', show: 'signal-noise', title: 'The Chip War, Explained', time: '26 m left', progress: 0.55 },
  { id: 'mh41', show: 'missing-hour', title: 'The Lighthouse Keeper', time: '54 m', progress: 0 },
  { id: 'fad-downturn', show: 'founders', title: 'Building in a Downturn', time: '47 m', progress: 0 },
  { id: 'df-europa', show: 'deep-field', title: 'Life on Europa?', time: '9 m left', progress: 0.8 },
  { id: 'sn213', show: 'signal-noise', title: 'Open Models vs Closed', time: '1 h 4 m', progress: 0 },
  { id: 'mb-oct1', show: 'morning-brief', title: 'Thursday, Oct 1', time: '18 m', progress: 0 },
]

const TABS = ['Shows', 'Downloads', 'Queue']

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('Shows')
  const [queue, setQueue] = useState(QUEUE)
  const [autoDl, setAutoDl] = useState(true)
  const [wifiOnly, setWifiOnly] = useState(true)
  const newCount = SHOWS.reduce((n, s) => n + s.fresh, 0)

  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= queue.length) return
    const next = [...queue]
    ;[next[i], next[j]] = [next[j], next[i]]
    setQueue(next)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Library" subtitle={`${SHOWS.length} shows · ${newCount} new episodes`} />

      <Block className="!my-3">
        <Segmented strong rounded>
          {TABS.map((t) => (
            <SegmentedButton key={t} rounded active={tab === t} onClick={() => setTab(t)}>{t}</SegmentedButton>
          ))}
        </Segmented>
      </Block>

      {tab === 'Shows' && (
        <>
          <BlockTitle className="!mb-2">Following</BlockTitle>
          <div className="grid grid-cols-3 gap-3 px-4">
            {SHOWS.map((s, i) => (
              <button key={s.id} className="vs-rise text-left min-w-0" style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => nav.push('show-page', { id: s.id })}>
                <Photo q={s.photo} className="relative w-full aspect-square rounded-2xl overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: C[s.cat] }} />
                  {s.fresh > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-white text-caption1 font-bold flex items-center justify-center shadow-lg">
                      {s.fresh}
                    </span>
                  )}
                </Photo>
                <div className="mt-1.5 text-footnote font-semibold truncate">{s.name}</div>
              </button>
            ))}
          </div>
          <div className="mx-4 mt-6 bg-card rounded-card p-4 flex items-center gap-3">
            <Tile color={C.tech} tinted size={40}><span className="text-xl">💡</span></Tile>
            <div className="flex-1 min-w-0">
              <div className="text-headline truncate">Signal & Noise is your top show</div>
              <div className="text-footnote text-black/55 dark:text-white/55">31 h this year · Tech is 38% of your listening</div>
            </div>
          </div>
        </>
      )}

      {tab === 'Downloads' && (
        <>
          <div className="mx-4 mt-2 bg-card rounded-card p-4 vs-rise">
            <div className="flex items-center gap-2 text-subhead text-black/55 dark:text-white/55">
              <HardDrive className="w-4 h-4" /> Storage
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-title1">1.8 GB</span>
              <span className="text-subhead text-black/55 dark:text-white/55">of 64 GB used</span>
            </div>
            <div className="mt-3"><Meter value={1.8 / 64} height={8} /></div>
            <div className="mt-2 text-caption1 text-black/55 dark:text-white/55">3 episodes · 165 MB</div>
          </div>

          <BlockTitle>Downloaded</BlockTitle>
          <List strong inset dividers>
            {DOWNLOADS.map((d) => {
              const s = SHOW[d.show]
              return (
                <ListItem key={d.id} link onClick={() => nav.push('episode-detail', { id: d.id })}
                  media={<Photo q={s.photo} className="w-14 h-14 rounded-2xl" />}
                  header={<span className="text-caption1 font-semibold" style={{ color: C[s.cat] }}>{s.name}</span>}
                  title={<span className="block truncate">{d.title}</span>}
                  subtitle={<span className="text-footnote opacity-60">{d.meta}</span>}
                  after={<span className="flex items-center gap-1 text-subhead opacity-70"><Download className="w-4 h-4" />{d.size}</span>} />
              )
            })}
          </List>

          <BlockTitle>Settings</BlockTitle>
          <List strong inset dividers>
            <ListItem title="Auto-download new episodes"
              media={<Tile color={C.science}><Download className="w-4 h-4 text-white" /></Tile>}
              after={<Toggle checked={autoDl} onChange={() => setAutoDl(!autoDl)} />} />
            <ListItem title="Wi-Fi only"
              media={<Tile color={C.business}><Wifi className="w-4 h-4 text-white" /></Tile>}
              after={<Toggle checked={wifiOnly} onChange={() => setWifiOnly(!wifiOnly)} />} />
          </List>
        </>
      )}

      {tab === 'Queue' && (
        <>
          <div className="mx-4 mt-2 bg-card rounded-card p-4 flex items-center gap-4 vs-rise">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <ListMusic className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-subhead text-black/55 dark:text-white/55">Up Next</div>
              <div className="text-title2">3 h 41 m</div>
            </div>
            <div className="text-right">
              <div className="text-title3">{queue.length}</div>
              <div className="text-caption1 text-black/55 dark:text-white/55">episodes</div>
            </div>
          </div>

          <BlockTitle>Up Next</BlockTitle>
          <List strong inset dividers>
            {queue.map((q, i) => {
              const s = SHOW[q.show]
              return (
                <ListItem key={q.id}
                  onClick={() => nav.push('episode-detail', { id: q.id })}
                  media={
                    <div className="relative">
                      <Photo q={s.photo} className="w-14 h-14 rounded-2xl" />
                      {i === 0 && (
                        <span className="absolute inset-0 rounded-2xl bg-black/45 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </span>
                      )}
                    </div>
                  }
                  header={<span className="text-caption1 font-semibold" style={{ color: C[s.cat] }}>{s.name}</span>}
                  title={<span className="block truncate">{q.title}</span>}
                  subtitle={
                    <div className="mt-1">
                      <span className="flex items-center gap-1 text-footnote opacity-60"><Clock className="w-3 h-3" />{q.time}</span>
                      {q.progress > 0 && <div className="mt-1.5 w-24"><Meter value={q.progress} color={C[s.cat]} height={4} /></div>}
                    </div>
                  }
                  after={
                    <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}
                        className="w-11 h-6 flex items-center justify-center disabled:opacity-20 opacity-70">
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <button aria-label="Move down" disabled={i === queue.length - 1} onClick={() => move(i, 1)}
                        className="w-11 h-6 flex items-center justify-center disabled:opacity-20 opacity-70">
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                  } />
              )
            })}
          </List>
          <Block className="text-footnote text-black/55 dark:text-white/55 !mt-2">
            Use the arrows to reorder. Played episodes leave the queue automatically.
          </Block>
        </>
      )}

      <AppTabbar active="library" />
    </Page>
  )
}
